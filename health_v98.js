/* GymTracker 9.8: local health dashboard, explicit Health Connect access,
 * replay-safe Watch metrics and optional conservative Smart Load guard. */
(function () {
  'use strict';
  const bridge = () => window.AndroidBridge;
  const native = () => typeof bridge()?.healthAction === 'function';
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const hstate = () => state.healthProfile || {};
  const find = id => state.currentSession?.id === id ? state.currentSession : (state.history || []).find(s => s.id === id);
  const enc = id => encodeURIComponent(String(id)).replace(/'/g, '%27');
  const fmt = (x, digits=0) => finite(x) ? x.toLocaleString('it-IT', { maximumFractionDigits: digits }) : '—';
  const labelSource = s => s === 'com.sec.android.app.shealth' ? 'Samsung Health' : (s || 'Health Connect');
  let status = null, message = '', requestId = null, inFlight = null, lastStatusCheck = 0, checking = null;
  const enabled = () => state.settings?.autoHealthExport !== false;
  const exportPermissions = ['android.permission.health.READ_EXERCISE','android.permission.health.WRITE_EXERCISE'];
  const call = (action, payload={}) => { if (!native()) { toast('Richiede APK Android'); return; } bridge().healthAction(action, JSON.stringify(payload)); };
  function validSamples(values, start, end, cap=2400) {
    const map = new Map();
    for (const a of (Array.isArray(values) ? values : [])) {
      if (!Array.isArray(a) || !finite(a[0]) || !Number.isInteger(a[1]) || a[1]<30 || a[1]>240 || a[0]<start || a[0]>end) continue;
      const bucket=Math.floor(a[0]/15000), previous=map.get(bucket); if(!previous||a[0]>=previous[0]) map.set(bucket,[a[0],a[1]]);
    }
    return [...map.values()].sort((a,b)=>a[0]-b[0]).slice(-cap);
  }
  function interval(s) { return [Date.parse(s.startedAt), Date.parse(s.finishedAt) || Date.now()]; }
  function health(s) { return s.healthV98 || (s.healthV98 = {watchSamples:[], importedSamples:[], segments:{}}); }
  function applyWatchBatch(c) {
    const s = find(c.sessionId);
    if (!s) throw Error('Sessione non trovata o scartata');
    const [start,end] = interval(s);
    if (!finite(start) || !finite(end) || !/^[a-zA-Z0-9-]{8,100}$/.test(c.segment || '') || !finite(c.segmentStart) || c.segmentStart < start-60000 || c.segmentStart > end+15000 || !finite(c.recordedUntil) || c.recordedUntil < c.segmentStart || c.recordedUntil > Date.now()+60000 || !Array.isArray(c.samples) || c.samples.length > 80) throw Error('Intervallo o segmento non valido');
    const h = health(s), segments = h.segments || (h.segments={});
    const before = s.finishedAt && h.autoExport ? JSON.stringify([h.watchSamples,segments]) : null;
    if (!segments[c.segment] && Object.keys(segments).length>=24) throw Error('Troppi segmenti');
    const segment = segments[c.segment] || (segments[c.segment]={start:c.segmentStart,until:c.segmentStart});
    if (segment.start !== c.segmentStart) throw Error('Segmento incoerente');
    segment.until = Math.max(segment.until, Math.min(c.recordedUntil,end));
    // Don't attribute calories recorded after the phone ended the session. Watch may receive closing snapshot late.
    const metricTime = t => finite(t)&&t>=c.segmentStart&&t<=Math.min(end,c.recordedUntil+15000);
    const calEnd=finite(c.caloriesUntil)?c.caloriesUntil:c.recordedUntil;
    if ((!segment.kcalNative||finite(c.caloriesUntil)) && finite(c.totalKcal) && c.totalKcal>=0 && c.totalKcal<10000 && (finite(c.caloriesUntil)?metricTime(calEnd):calEnd<=end+15000) && calEnd >= (segment.kcalUntil||0)) {
      segment.kcal = Math.max(segment.kcal ?? 0,c.totalKcal);segment.kcalUntil=calEnd;
      if(finite(c.caloriesUntil)&&finite(c.caloriesFrom)&&c.caloriesFrom>=c.segmentStart-1000&&c.caloriesFrom>=start&&c.caloriesFrom<calEnd){segment.kcalNative=true;segment.kcalFrom=c.caloriesFrom;}
    }
    const hstats=c.heartStats;
    if(hstats&&metricTime(hstats.until)&&hstats.until>=(segment.heartStats?.until||0)&&[hstats.min,hstats.avg,hstats.max].every(x=>Number.isInteger(x)&&x>=30&&x<=240)&&hstats.min<=hstats.avg&&hstats.avg<=hstats.max){segment.heartStats={until:hstats.until,min:hstats.min,avg:hstats.avg,max:hstats.max};}
    if(metricTime(c.stepsUntil)&&Number.isInteger(c.steps)&&c.steps>=0&&c.steps<=100000&&c.stepsUntil>=(segment.stepsUntil||0)){segment.steps=c.steps;segment.stepsUntil=c.stepsUntil;}
    if(metricTime(c.durationUntil)&&finite(c.activeMs)&&c.activeMs>=0&&c.activeMs<=c.durationUntil-c.segmentStart+15000&&c.durationUntil>=(segment.durationUntil||0)){segment.activeMs=c.activeMs;segment.durationUntil=c.durationUntil;}
    if(['Allenamento forza','Allenamento generico'].includes(c.exerciseLabel))segment.exerciseLabel=c.exerciseLabel;
    segment.final = !!segment.final || !!c.final;
    h.watchSamples = validSamples([...(h.watchSamples||[]),...validSamples(c.samples,start,Math.min(end,c.recordedUntil+15000))],start,end);
    if(before!==null && before!==JSON.stringify([h.watchSamples,segments]) && enabled() && h.autoExport.status!=='overlap') {
      h.autoExport.revision=(h.autoExport.revision||0)+1; h.autoExport.versionTime=Math.max(Date.now(),Number(h.autoExport.versionTime||0)+1); h.autoExport.status='pending'; h.autoExport.nextAt=Date.now()+6000;delete h.autoExport.nativeFallback;
    }
  }
  function stats(s) {
    const h = s.healthV98 || {}, [start,end] = interval(s);
    const w = validSamples(h.watchSamples,start,end), imported = validSamples(h.importedSamples,start,end);
    const samples = w.length ? w : imported;
    const values = samples.map(a=>a[1]);
    const segments = Object.values(h.segments || {}).filter(x=>finite(x.start)&&finite(x.until)).sort((a,b)=>a.start-b.start);
    // Exclude overlapping recording segments rather than count them twice.
    const accepted = []; let until = -Infinity;
    for (const x of segments) { if(x.start>=until) { accepted.push(x); until=x.until; } }
    const kcals=accepted.filter(x=>finite(x.kcal));
    const nativeStats=accepted.map(x=>x.heartStats).filter(x=>x&&finite(x.avg)&&finite(x.min)&&finite(x.max));
    const maxNative=nativeStats.length?Math.max(...nativeStats.map(x=>x.max)):null;
    const minNative=nativeStats.length?Math.min(...nativeStats.map(x=>x.min)):null;
    const nativeAvg=accepted.length===1&&nativeStats.length===1?nativeStats[0].avg:null;
    const steps=accepted.filter(x=>finite(x.steps));const durations=accepted.filter(x=>finite(x.activeMs));
    const recovery=[];
    for(const ex of (s.exercises||[])) for(const set of (ex.sets||[])) {
      if(!set.done)continue;
      const t=Date.parse(set.completedAt);if(!finite(t))continue;
      const early=samples.filter(x=>x[0]>=t-15000&&x[0]<=t+15000);
      const late=samples.filter(x=>x[0]>=t+45000&&x[0]<=t+75000);
      if(early.length&&late.length&&Number(set.restSec||ex.restSec)>=75) recovery.push(Math.max(...early.map(x=>x[1]))-late.reduce((n,x)=>n+x[1],0)/late.length);
    }
    return {samples, avg:nativeAvg??(values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : null), max:maxNative===null?(values.length?Math.max(...values):null):Math.max(maxNative,...values), min:minNative===null?(values.length?Math.min(...values):null):Math.min(minNative,...values), steps:steps.length?steps.reduce((a,x)=>a+x.steps,0):null, nativeDurationMs:durations.length?durations.reduce((a,x)=>a+x.activeMs,0):null, source:w.length||nativeStats.length?'Galaxy Watch':(imported.length?labelSource(h.heartSource):''), totalKcal:kcals.length?kcals.reduce((sum,x)=>sum+x.kcal,0):null, activeKcal:finite(h.activeKcal)?h.activeKcal:null, recovery:recovery.length?Math.round(recovery.reduce((a,b)=>a+b,0)/recovery.length):null,recoveryCount:recovery.length};
  }
  function readiness(now=Date.now()) {
    const p=hstate(), fresh=(r,h)=>r&&finite(r.value)&&finite(r.at)&&r.at<=now&&now-r.at<=h*3600000;
    const reasons=[];
    if(fresh(p.sleepMinutes,24)&&p.sleepMinutes.value<360) reasons.push('ultimo intervallo di sonno inferiore a 6 h');
    if(fresh(p.restingHr,36)&&fresh(p.restingBaseline,36)&&p.restingHr.value-p.restingBaseline.value>=8) reasons.push('battito a riposo superiore di almeno 8 bpm alla media personale');
    return reasons;
  }
  function guard(ex,suggestion) {
    if(!state.settings?.healthAdaptive || state.settings.smartLoad===false || ex?.special || !suggestion || suggestion.mode!=='increase' || !finite(suggestion.load) || suggestion.load<=0) return suggestion;
    const reasons=readiness(); if(!reasons.length)return suggestion;
    return {...suggestion,next:suggestion.load,mode:'maintain',increased:false,delta:0,reason:[suggestion.reason,'Health Coach: aumento rinviato ('+reasons.join('; ')+')'].filter(Boolean).join(' · ')};
  }
  function recoveryAdvice(s) {
    if (!state.settings?.healthAdaptive) return '';
    const current=stats(s);
    const previous=(state.history||[]).filter(x=>x.id!==s.id&&x.workout===s.workout&&x.gymId===s.gymId&&Date.parse(x.startedAt)<Date.parse(s.startedAt)).slice(0,8).map(stats).filter(a=>a.recoveryCount>=3&&a.recovery!=null);
    if(current.recoveryCount>=3&&previous.length>=3){
      const median=previous.map(x=>x.recovery).sort((a,b)=>a-b)[Math.floor(previous.length/2)];
      if(current.recovery<=median-8)return 'Recupero cardiaco indicativo più lento rispetto alle sedute comparabili. Valuta 30 s in più se ne senti la necessità; il timer non viene modificato automaticamente.';
    }
    if(readiness().length)return 'Se ti senti affaticato, valuta recuperi leggermente più lunghi; nessuna modifica automatica al timer.';
    return '';
  }
  function chart(s, data) {
    if(data.length<2)return '<p class="subtle">Grafico disponibile dopo almeno due campioni validi.</p>';
    const [start,end]=interval(s), range=Math.max(1,end-start), low=Math.max(20,Math.min(...data.map(a=>a[1]))-10), high=Math.max(low+20,Math.max(...data.map(a=>a[1]))+10);
    const x=t=>34+Math.max(0,Math.min(1,(t-start)/range))*280, y=v=>110-(v-low)/(high-low)*95;
    let d='';for(let i=0;i<data.length;i++)d+=(i===0||data[i][0]-data[i-1][0]>90000?'M':'L')+x(data[i][0]).toFixed(1)+' '+y(data[i][1]).toFixed(1)+' ';
    return `<svg role="img" aria-label="Andamento frequenza cardiaca in bpm" viewBox="0 0 326 138" style="width:100%;max-height:190px"><g fill="currentColor" font-size="10"><text x="2" y="16">${high}</text><text x="2" y="110">${low}</text><text x="34" y="132">0 min</text><text x="314" y="132" text-anchor="end">${Math.round(range/60000)} min</text></g><path d="M34 15 H314 M34 110 H314" stroke="currentColor" opacity=".2"/><path d="${d}" fill="none" stroke="#ff716f" stroke-width="2"/></svg>`;
  }
  function sessionCard(s, detail=false) {
    const a=stats(s), h=s.healthV98||{}, sets=(s.exercises||[]).flatMap(ex=>ex.sets||[]), real=sets.filter(x=>x.done).length;
    const metrics=[['Durata',s.finishedAt ? fmt((Date.parse(s.finishedAt)-Date.parse(s.startedAt))/60000)+' min' : 'in corso'],['Serie',real+'/'+sets.length],['Battito medio',a.avg==null?'—':a.avg+' bpm'],['Battito massimo',a.max==null?'—':a.max+' bpm'],['Battito minimo',a.min==null?'—':a.min+' bpm'],['Passi seduta',a.steps==null?'—':fmt(a.steps)],['Durata registrata Watch',a.nativeDurationMs==null?'—':fmt(a.nativeDurationMs/60000,1)+' min'],['Calorie totali Watch',a.totalKcal==null?'—':fmt(a.totalKcal)+' kcal'],['Calorie attive HC',a.activeKcal==null?'—':fmt(a.activeKcal)+' kcal'],['Recupero FC ~60 s',a.recovery==null?'—':`${fmt(a.recovery)} bpm (${a.recoveryCount} serie)`],['Volume',fmt(totalSessionVolume(s))+' kg']];
    const cards=metrics.map(([k,v])=>`<div class="health-metric"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    const arg=enc(s.id);
    return `<section class="card health-card" data-health-id="${esc(s.id)}"><h2>Salute · ${detail?'Riepilogo seduta':'Allenamento'}</h2><div class="health-grid">${cards}</div>${chart(s,a.samples)}${!detail&&recoveryAdvice(s)?`<p class="subtle">${esc(recoveryAdvice(s))}</p>`:""}<p class="subtle">${a.samples.length?esc(a.source)+' · '+a.samples.length+' campioni a intervalli di 15 s. ':''}Recupero indicativo, non clinico. Le calorie totali includono il metabolismo basale; non sommarle a quelle attive. Possono coprire solo parte della seduta.</p>${detail&&native()?`<button class="secondary-btn" onclick="GymHealth.importSession(decodeURIComponent('${arg}'))">Importa battito e calorie da Connessione Salute</button><button class="secondary-btn" style="margin-top:8px" onclick="GymHealth.exportSession(decodeURIComponent('${arg}'))">${h.exportedAt?'Ripeti esportazione (senza duplicati)':'Esporta allenamento in Connessione Salute'}</button><button class="secondary-btn" style="margin-top:8px" onclick="GymHealth.verifySession(decodeURIComponent('${arg}'))">Controlla presenza in Connessione Salute</button>${exportBadge(s)}`:''}</section>`;
  }
  function profileCard(full=false) {
    const p=hstate(), options=[['weight','Peso','kg',1],['weightDelta','Variazione peso (ultimi rilievi)','kg',1],['bodyFat','Massa grassa','%',1],['leanMass','Massa magra','kg',1],['sleepMinutes','Ultimo intervallo sonno','min',0],['restingHr','FC a riposo','bpm',0],['restingBaseline','Media FC a riposo','bpm',0],['steps','Passi (giorno importato)','',0]];
    const cards=options.map(([key,name,unit,dec])=>{const d=p[key];return `<div class="health-metric"><span>${esc(name)}</span><b>${d&&finite(d.value)?fmt(d.value,dec)+' '+unit:'—'}</b>${d&&finite(d.at)?`<small>${esc(labelSource(d.source))} · ${esc(fmtDate(new Date(d.at).toISOString()))}</small>`:''}</div>`;}).join('');
    const reasons=readiness();
    return `<section class="card health-card"><h2>Samsung Health / Connessione Salute</h2><p class="subtle">${esc(message || (status?.available ? `${status.granted?.length||0}/${status.requested||0} permessi concessi` : 'Importazione su richiesta · esportazione automatica configurabile'))}</p>${full?`<button class="secondary-btn" onclick="GymHealth.authorize()">Concedi / aggiorna permessi</button><div class="setting-row"><div><b>Esportazione automatica allenamenti</b><p>Nuove sedute; richiede permessi di lettura e scrittura.</p></div><button class="toggle ${enabled()?'on':''}" onclick="GymHealth.toggleAutoExport()"><i></i></button></div><div class="setting-row"><div><b>Frequenza cardiaca massima (bpm)</b><p>Imposta la tua FC max di riferimento, per le zone indicative sul Watch. 0 = non configurata.</p></div><input type="number" min="0" max="240" step="1" value="${Number(state.settings.maxHeartRate)||0}" style="width:76px" class="text-input" onchange="GymHealth.setMaxHr(this.value)"></div><p class="subtle">${pendingCount()} esportazioni da completare · ${esc(exportSummary())}</p>`:''}<button class="secondary-btn" style="margin-top:8px" onclick="GymHealth.refresh()">Aggiorna dati salute</button><div class="health-grid">${cards}</div><p class="subtle">${p.fetchedAt?'Ultima lettura: '+esc(fmtDate(new Date(p.fetchedAt).toISOString())):'Nessun dato ancora importato'}. Sonno: durata dell’ultima sessione disponibile, non punteggio Samsung.</p><div class="setting-row"><div><b>Health Coach</b><p>${state.settings.healthAdaptive?(reasons.length?esc(reasons.join(' · ')):'Nessun segnale recente per rinviare gli aumenti; non è un indice clinico.'):'Disattivato: Smart Load originale.'}</p></div><button class="toggle ${state.settings.healthAdaptive?'on':''}" onclick="GymHealth.toggleAdaptive()" aria-label="Attiva Health Coach"><i></i></button></div>${full?'<p class="subtle">Se attivo, Health Coach può rinviare un aumento accessorio, mai aumentare o modificare la panca programmata. I dati mancanti non sono stimati.</p><button class="danger-btn" onclick="GymHealth.clear()">Cancella dati salute locali</button>':''}</section>`;
  }
  function getPayload(id) {
    const s=find(id); if(!s?.finishedAt)throw Error('Termina prima la seduta');const [start,end]=interval(s);
    const a=stats(s), watchSamples=validSamples(s.healthV98?.watchSamples,start,end);
    const watchStats=a.source==='Galaxy Watch'&&a.avg!=null?` FC Watch media ${a.avg} bpm, max ${a.max} bpm, min ${a.min} bpm.`:'';
    const cal=a.totalKcal===null?'':` Calorie totali stimate dal Watch: ${Math.round(a.totalKcal)} kcal (incl. metabolismo basale; intervallo registrato).`;
    const calorieSegments=[];let until=start;
    for(const [key,x] of Object.entries(s.healthV98?.segments||{}).sort((a,b)=>a[1].start-b[1].start)) {
      if(!x.final||!x.kcalNative||!finite(x.kcal)||x.kcal<=0||!finite(x.kcalUntil)||!finite(x.kcalFrom)||x.kcalFrom<until||x.kcalUntil>end||x.kcalUntil<=x.kcalFrom)continue;
      calorieSegments.push({id:key,start:x.kcalFrom,end:x.kcalUntil,kcal:x.kcal});until=x.kcalUntil;
    }
    const extra=(a.steps==null?'':` Passi seduta: ${a.steps}.`)+(a.nativeDurationMs==null?'':` Durata registrata Watch: ${Math.round(a.nativeDurationMs/1000)} s.`);
    return {id,start,end,version:Math.max(1,Number(s.healthV98?.autoExport?.versionTime)||Date.now()),workout:s.workout,notes:`GymTracker: ${totalSessionVolume(s)} kg volume; ${(s.exercises||[]).flatMap(ex=>ex.sets||[]).filter(x=>x.done).length} serie registrate.${watchStats}${cal}${extra} Dettaglio nell’app.`,watchSamples,calorieSegments};
  }
  function queueFinished(s) {
    if (!native() || !enabled() || !s?.finishedAt) return;
    const h=health(s);
    if(!h.autoExport) h.autoExport={status:'pending',nextAt:Date.now()+8000,attempts:0,revision:0,versionTime:Date.now()};
    // Caller saves the session and this marker together, before async work begins.
  }
  function scheduleNative(id) {
    const s=find(id),q=s?.healthV98?.autoExport;
    if(!enabled()||!s?.finishedAt||q?.status!=='pending'||typeof bridge()?.queueHealthExport!=='function')return false;
    try { return bridge().queueHealthExport(JSON.stringify(getPayload(id)),q.revision||0); } catch {return false;}
  }
  function collectNativeResults(candidates) {
    if(typeof bridge()?.getHealthExportResult!=='function')return;
    for(const s of candidates){
      const q=s.healthV98.autoExport;
      let n;try{n=JSON.parse(bridge().getHealthExportResult(s.id)||'{}');}catch{continue;}
      if(n.revision!==(q.revision||0)||n.state!=='done')continue;
      if(n.result?.status==='exported'||n.result?.status==='overlap'){
        inFlight={id:s.id,automatic:true,at:Date.now(),revision:q.revision||0};receive(n.result);
      }else{
        q.nativeFallback=true;q.nextAt=Date.now();q.message=n.result?.error||'Sincronizzazione in attesa';
        q.status=n.result?.status==='permission'?'permission':'pending';saveState();
      }
      bridge().forgetHealthExport?.(s.id,n.revision);
    }
  }
  function pendingCount() {return (state.history||[]).filter(s=>['pending','permission','retry'].includes(s.healthV98?.autoExport?.status)).length;}
  function exportSummary() {const h=(state.history||[]).find(s=>s.healthV98?.autoExport||s.healthV98?.exportedAt)?.healthV98;return h?.autoExport?.message || (h?.exportedAt?'Ultima seduta presente in Connessione Salute':'Nessun esito registrato');}
  function exportBadge(s) {
    const h=s.healthV98||{}, q=h.autoExport||{};
    let message=h.exportedAt?'Ultima esportazione confermata in Connessione Salute.':q.status==='overlap'?'Esportazione sospesa: allenamento sovrapposto.':q.status==='permission'?'Esportazione in attesa: concedi i permessi.':q.status==='retry'?'Esportazione non ancora riuscita: nuovo tentativo automatico.':q.status==='pending'?'Esportazione automatica in attesa.':'Non ancora esportato.';
    if(h.exportedAt&&q.status==='pending')message+=' Aggiornamento dati Watch in attesa.';
    if(q.message&&q.status!=='exported')message+=' '+q.message;
    if(h.heartExportStatus==='written')message+=' Campioni cardiaci del Watch inviati.';
    if(h.heartExportStatus==='permission')message+=' Per esportare anche il battito, concedi il permesso di scrittura frequenza cardiaca.';
    if(h.heartExportStatus==='error')message+=' Battito non esportato; verifica lo stato o riprova.';
    if(h.calorieExportStatus==='written')message+=' Calorie totali registrate in Connessione Salute.';
    if(h.calorieExportStatus==='permission')message+=' Per registrare le calorie totali, autorizza lettura e scrittura calorie totali.';
    if(h.calorieExportStatus==='overlap')message+=' Calorie in note: esiste già una rilevazione sovrapposta.';
    if(h.calorieExportStatus==='error')message+=' Calorie non esportate; usa Verifica esportazione per riprovare.';
    const v=h.exportCheck;
    const verified=v?.status==='present'?`Presente in Connessione Salute: ${v.title||'GymTracker'} · ${new Date(v.start).toLocaleString('it-IT')} · ${Math.round((v.end-v.start)/60000)} min. Origine: ${v.source}. ID: ${v.recordId}.`:v?.status==='missing'?'Seduta non trovata in Connessione Salute: controlla i permessi o ripeti l’esportazione.':v?.error||'';
    return `<p class="subtle">${esc(message)}</p>${v?`<p class="subtle">Ultimo controllo: ${esc(verified)} (${esc(new Date(v.at).toLocaleString('it-IT'))})</p>`:''}<p class="subtle">Samsung Health: importazione e visualizzazione non verificabili da GymTracker. Se tutti i permessi sono già attivi, usa Controlla presenza in Connessione Salute: se il record è presente, la scrittura di GymTracker è confermata e resta da verificare l’importazione in Samsung Health. Non esportare ripetutamente la stessa seduta.</p>`;
  }
  function sendExport(id, automatic) {
    if(inFlight || checking&&Date.now()-checking.at<30000 || !native())return false;
    const s=find(id); if(!s?.finishedAt)return false;
    const q=s.healthV98?.autoExport;
    try { const payload=getPayload(id); inFlight={id,automatic,at:Date.now(),revision:q?.revision||0}; call('export',payload);return true; }
    catch(e){inFlight=null;if(!automatic)toast(e.message);return false;}
  }
  function processQueue() {
    if(!native()||!enabled())return;
    let now=Date.now();
    if(checking){if(now-checking.at<30000)return;checking=null;}
    if(inFlight){if(now-inFlight.at<90000)return;inFlight=null;}
    const candidates=(state.history||[]).filter(s=>s.finishedAt && ['pending','permission','retry'].includes(s.healthV98?.autoExport?.status));
    if(!candidates.length)return;
    collectNativeResults(candidates);
    // Native bridge calls can take time and set nextAt to a newer timestamp.
    // Refresh the clock before checking whether a fallback export is due.
    now=Date.now();
    if(!status || !status.available || !exportPermissions.every(x=>status.granted?.includes(x))) {
      // Status read is safe and does not trigger the permission dialog.
      if(now-lastStatusCheck>=30000){lastStatusCheck=now;call('status');}
      return;
    }
    const next=candidates.find(s=>{
      const q=s.healthV98.autoExport;
      if(!['pending','permission','retry'].includes(q.status)||Number(q.nextAt||0)>now)return false;
      if(q.nativeFallback||typeof bridge()?.getHealthExportResult!=='function')return true;
      try{const n=JSON.parse(bridge().getHealthExportResult(s.id)||'{}');if(n.state==='scheduled'&&n.revision===(q.revision||0)&&now-Number(q.nextAt||0)<120000)return false;}catch{}
      return true;
    });
    if(next)sendExport(next.id,true);
  }
  function receive(raw) {
    let r;try{r=typeof raw==='string'?JSON.parse(raw):raw;}catch{return;}
    if(r.action==='verify') {
      checking=null;const s=find(r.id);if(s?.finishedAt){const h=health(s);h.exportCheck={...r,at:Date.now()};saveState();const card=document.querySelector('#modalBackdrop .health-card');if(card?.getAttribute('data-health-id')===s.id)card.outerHTML=sessionCard(s,true);toast(r.status==='present'?'Seduta presente in Connessione Salute':r.status==='missing'?'Seduta non trovata in Connessione Salute':r.error||'Controllo non riuscito');}return;
    }
    if(r.action==='export') {
      const job=inFlight && (!r.id || inFlight.id===r.id)?inFlight:null;
      if(job)inFlight=null;
      const id=r.id||job?.id||requestId, s=find(id);requestId=null;
      if(s) {
        const h=health(s), q=h.autoExport;
        if(!r.error&&r.status==='exported') {
          h.exportedAt=new Date().toISOString(); h.healthConnectRecordId=r.recordId||'';h.heartExportStatus=r.heartStatus||'';h.calorieExportStatus=r.calorieStatus||'';
          if(q){q.attempts=0;q.message='Seduta verificata in Connessione Salute';if((q.revision||0)===(job?.revision||0)){
            if((r.heartStatus==='error'||r.calorieStatus==='error')&&enabled()&&(q.metricAttempts||0)<3){q.metricAttempts=(q.metricAttempts||0)+1;q.status='retry';q.nextAt=Date.now()+30000*q.metricAttempts;q.nativeFallback=true;}
            else {q.status='exported';if(r.heartStatus!=='error'&&r.calorieStatus!=='error')q.metricAttempts=0;}
          }else{q.status='pending';q.nextAt=Date.now()+3000;}}
          toast('Allenamento salvato in Connessione Salute');
        } else {
          if(q){q.attempts=(q.attempts||0)+1;q.status=r.status==='overlap'?'overlap':r.status==='permission'?'permission':'retry';if(q.status==='permission')status=null;q.message=r.error||'Verifica non riuscita';q.nextAt=Date.now()+Math.min(600000,30000*2**Math.min(5,q.attempts-1));}
          if(!job?.automatic)toast(r.error||'Esportazione non riuscita');
        }
        saveState();
        const openCard=document.querySelector('#modalBackdrop .health-card');
        if(openCard?.getAttribute('data-health-id')===id)openCard.outerHTML=sessionCard(s,true);
        else if(['history','settings','home'].includes(state.ui.view)&&!document.querySelector('#modalBackdrop'))render();
      }
      return;
    }
    if(r.error){message=r.error;if(r.action!=='status')toast(r.error);}
    if(r.action==='status'){
      if(!r.error){status=r;message='';
        const allowed=exportPermissions.every(x=>r.granted?.includes(x));let changed=false;
        for(const s of state.history||[]){const h=s.healthV98,q=h?.autoExport;if(!q)continue;
          const calGranted=['android.permission.health.READ_TOTAL_CALORIES_BURNED','android.permission.health.WRITE_TOTAL_CALORIES_BURNED'].every(x=>r.granted?.includes(x));
          const hrGranted=r.granted?.includes('android.permission.health.WRITE_HEART_RATE');
          if(allowed&&enabled()&&q.status==='exported'&&((h.calorieExportStatus==='permission'&&calGranted)||(h.heartExportStatus==='permission'&&hrGranted))){q.status='pending';q.nextAt=Date.now();q.revision=(q.revision||0)+1;q.versionTime=Math.max(Date.now(),Number(q.versionTime||0)+1);q.metricAttempts=0;delete q.nativeFallback;changed=true;}

          if(allowed&&q.status==='permission'){q.status='pending';q.nextAt=Date.now();changed=true;}
          else if(!allowed&&['pending','retry'].includes(q.status)){q.status='permission';q.message='Concedi lettura e scrittura allenamenti in Connessione Salute';changed=true;}}
        if(changed)saveState();
      }else if(!status||r.available===false)status=r;
    }
    if(r.action==='profile'&&!r.error){delete r.action;state.healthProfile=r;message=r.errors?.length?'Aggiornamento parziale: '+r.errors.join(', '):'Dati aggiornati';saveState();toast(message);}
    if(r.action==='session'&&!r.error){const s=find(r.id);if(s){const h=health(s);const [start,end]=interval(s);if(Array.isArray(r.samples)&&r.samples.length){h.importedSamples=validSamples(r.samples,start,end);h.heartSource=r.heartSource||'';}if(finite(r.activeKcal)&&r.activeKcal>=0)h.activeKcal=r.activeKcal;toast(r.errors?.length?'Importazione parziale: '+r.errors.join(', '):r.samples?.length||finite(r.activeKcal)?'Parametri importati':'Nessun parametro disponibile per questa seduta');saveState();}}
    if(r.action==='session'){const id=r.id||requestId;requestId=null;if(id&&find(id)&&document.querySelector('#modalBackdrop'))showHistoryDetail(id);}else if(['home','settings'].includes(state.ui.view)&&!document.querySelector('#modalBackdrop'))render();
  }
  function onForeground(){ if(!native())return;lastStatusCheck=Date.now();call('status'); if(enabled())setTimeout(processQueue,1200); }
  window.GymHealth={applyWatchBatch,stats,readiness,guard,sessionCard,receive,queueFinished,processQueue,onForeground,scheduleNative,
    authorize:()=>call('authorize'),refresh:()=>call('profile'),toggleAdaptive:()=>{state.settings.healthAdaptive=!state.settings.healthAdaptive;saveState();render();},
    toggleAutoExport:()=>{state.settings.autoHealthExport=!enabled();bridge()?.setHealthAutoExport?.(enabled());saveState();render();if(enabled())onForeground();},
    setMaxHr:v=>{const n=Number(v);if(!Number.isInteger(n)||(n!==0&&(n<100||n>240))){toast('Inserisci 0 oppure una FC max tra 100 e 240 bpm');render();return;}state.settings.maxHeartRate=n;saveState();window.GymWatchBridge?.publish();render();},
    importSession:id=>{try{if(inFlight){toast('Esportazione in corso');return;}requestId=id;call('session',getPayload(id));}catch(e){toast(e.message);}},
    verifySession:id=>{if(inFlight||checking&&Date.now()-checking.at<30000){toast('Operazione in corso');return;}try{const p=getPayload(id);checking={id,at:Date.now()};call('verify',{id:p.id,start:p.start,end:p.end});}catch(e){checking=null;toast(e.message);}},
    exportSession:id=>{if(!confirm('Esportare o verificare la seduta in Connessione Salute? I dettagli restano in GymTracker.'))return;if(!sendExport(id,false))toast('Operazione in corso o seduta non disponibile');},
    clear:()=>{if(!confirm('Eliminare tutti i dati salute copiati in GymTracker? I dati originari ed esportati in Connessione Salute non saranno cancellati. Ferma prima la rilevazione sul Watch.'))return;bridge()?.setHealthAutoExport?.(false);bridge()?.setHealthAutoExport?.(enabled());delete state.healthProfile;for(const s of [...(state.history||[]),state.currentSession].filter(Boolean))delete s.healthV98;state.settings.healthAdaptive=false;saveState();render();}};
  const oldSettings=renderSettings;renderSettings=function(){const html=oldSettings.apply(this,arguments);return native()?html.replace('</main>',profileCard(true)+'</main>'):html;};
  const oldHome=renderHome;renderHome=function(){const html=oldHome.apply(this,arguments);return native()?html.replace('</main>',profileCard(false)+'</main>'):html;};
  const oldSession=renderSession;renderSession=function(){const html=oldSession.apply(this,arguments);return state.currentSession&&native()?html.replace('</main>',`<div id="gymHealthLive">${sessionCard(state.currentSession)}</div></main>`):html;};
  const oldSuggested=suggestedLoadForSet;suggestedLoadForSet=function(ex,index=0){return guard(ex,oldSuggested.apply(this,arguments));};
  // Refresh only the health panel, not in-progress input fields.
  setInterval(()=>{const node=document.querySelector('#gymHealthLive');if(node&&state.currentSession)node.innerHTML=sessionCard(state.currentSession);},10000);
  if(native()){bridge()?.setHealthAutoExport?.(enabled());setTimeout(onForeground,500);setInterval(processQueue,3000);}
})();
