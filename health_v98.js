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
  let status = null, message = '', requestId = null;
  const call = (action, payload={}) => { if (!native()) { toast('Richiede APK Android'); return; } bridge().healthAction(action, JSON.stringify(payload)); };
  function validSamples(values, start, end, cap=2400) {
    const map = new Map();
    for (const a of (Array.isArray(values) ? values : [])) {
      if (!Array.isArray(a) || !finite(a[0]) || !Number.isInteger(a[1]) || a[1]<30 || a[1]>240 || a[0]<start || a[0]>end) continue;
      map.set(Math.floor(a[0]/15000), [a[0],a[1]]);
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
    if (!segments[c.segment] && Object.keys(segments).length>=24) throw Error('Troppi segmenti');
    const segment = segments[c.segment] || (segments[c.segment]={start:c.segmentStart,until:c.segmentStart});
    if (segment.start !== c.segmentStart) throw Error('Segmento incoerente');
    segment.until = Math.max(segment.until, Math.min(c.recordedUntil,end));
    // Don't attribute calories recorded after the phone ended the session. Watch may receive closing snapshot late.
    if (finite(c.totalKcal) && c.totalKcal>=0 && c.totalKcal<10000 && c.recordedUntil<=end+15000) segment.kcal = Math.max(segment.kcal ?? 0, c.totalKcal);
    segment.final = !!segment.final || !!c.final;
    h.watchSamples = validSamples([...(h.watchSamples||[]),...validSamples(c.samples,start,Math.min(end,c.recordedUntil+15000))],start,end);
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
    const recovery=[];
    for(const ex of (s.exercises||[])) for(const set of (ex.sets||[])) {
      if(!set.done)continue;
      const t=Date.parse(set.completedAt);if(!finite(t))continue;
      const early=samples.filter(x=>x[0]>=t-15000&&x[0]<=t+15000);
      const late=samples.filter(x=>x[0]>=t+45000&&x[0]<=t+75000);
      if(early.length&&late.length&&Number(set.restSec||ex.restSec)>=75) recovery.push(Math.max(...early.map(x=>x[1]))-late.reduce((n,x)=>n+x[1],0)/late.length);
    }
    return {samples, avg:values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : null, max:values.length?Math.max(...values):null, source:w.length?'Galaxy Watch':(imported.length?labelSource(h.heartSource):''), totalKcal:kcals.length?kcals.reduce((sum,x)=>sum+x.kcal,0):null, activeKcal:finite(h.activeKcal)?h.activeKcal:null, recovery:recovery.length?Math.round(recovery.reduce((a,b)=>a+b,0)/recovery.length):null,recoveryCount:recovery.length};
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
    const metrics=[['Durata',s.finishedAt ? fmt((Date.parse(s.finishedAt)-Date.parse(s.startedAt))/60000)+' min' : 'in corso'],['Serie',real+'/'+sets.length],['Battito medio',a.avg==null?'—':a.avg+' bpm'],['Battito massimo',a.max==null?'—':a.max+' bpm'],['Calorie totali Watch',a.totalKcal==null?'—':fmt(a.totalKcal)+' kcal'],['Calorie attive HC',a.activeKcal==null?'—':fmt(a.activeKcal)+' kcal'],['Recupero FC ~60 s',a.recovery==null?'—':`${fmt(a.recovery)} bpm (${a.recoveryCount} serie)`],['Volume',fmt(totalSessionVolume(s))+' kg']];
    const cards=metrics.map(([k,v])=>`<div class="health-metric"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    const arg=enc(s.id);
    return `<section class="card health-card"><h2>Salute · ${detail?'Riepilogo seduta':'Allenamento'}</h2><div class="health-grid">${cards}</div>${chart(s,a.samples)}${!detail&&recoveryAdvice(s)?`<p class="subtle">${esc(recoveryAdvice(s))}</p>`:""}<p class="subtle">${a.samples.length?esc(a.source)+' · '+a.samples.length+' campioni a intervalli di 15 s. ':''}Recupero indicativo, non clinico. Le calorie totali includono il metabolismo basale; non sommarle a quelle attive. Possono coprire solo parte della seduta.</p>${detail&&native()?`<button class="secondary-btn" onclick="GymHealth.importSession(decodeURIComponent('${arg}'))">Importa battito e calorie da Connessione Salute</button><button class="secondary-btn" style="margin-top:8px" onclick="GymHealth.exportSession(decodeURIComponent('${arg}'))">${h.exportedAt?'Verifica esportazione in Connessione Salute':'Esporta allenamento in Connessione Salute'}</button>${h.exportedAt?'<p class="subtle">Seduta registrata in Connessione Salute. Visibilità in Samsung Health da verificare.</p>':''}`:''}</section>`;
  }
  function profileCard(full=false) {
    const p=hstate(), options=[['weight','Peso','kg',1],['weightDelta','Variazione peso (ultimi rilievi)','kg',1],['bodyFat','Massa grassa','%',1],['leanMass','Massa magra','kg',1],['sleepMinutes','Ultimo intervallo sonno','min',0],['restingHr','FC a riposo','bpm',0],['restingBaseline','Media FC a riposo','bpm',0],['steps','Passi (giorno importato)','',0]];
    const cards=options.map(([key,name,unit,dec])=>{const d=p[key];return `<div class="health-metric"><span>${esc(name)}</span><b>${d&&finite(d.value)?fmt(d.value,dec)+' '+unit:'—'}</b>${d&&finite(d.at)?`<small>${esc(labelSource(d.source))} · ${esc(fmtDate(new Date(d.at).toISOString()))}</small>`:''}</div>`;}).join('');
    const reasons=readiness();
    return `<section class="card health-card"><h2>Samsung Health / Connessione Salute</h2><p class="subtle">${esc(message || (status?.available ? `${status.granted?.length||0}/${status.requested||0} permessi concessi` : 'Importazione su richiesta · nessun server GymTracker'))}</p>${full?'<button class="secondary-btn" onclick="GymHealth.authorize()">Concedi / aggiorna permessi</button>':''}<button class="secondary-btn" style="margin-top:8px" onclick="GymHealth.refresh()">Aggiorna dati salute</button><div class="health-grid">${cards}</div><p class="subtle">${p.fetchedAt?'Ultima lettura: '+esc(fmtDate(new Date(p.fetchedAt).toISOString())):'Nessun dato ancora importato'}. Sonno: durata dell’ultima sessione disponibile, non punteggio Samsung.</p><div class="setting-row"><div><b>Health Coach</b><p>${state.settings.healthAdaptive?(reasons.length?esc(reasons.join(' · ')):'Nessun segnale recente per rinviare gli aumenti; non è un indice clinico.'):'Disattivato: Smart Load originale.'}</p></div><button class="toggle ${state.settings.healthAdaptive?'on':''}" onclick="GymHealth.toggleAdaptive()" aria-label="Attiva Health Coach"><i></i></button></div>${full?'<p class="subtle">Se attivo, Health Coach può rinviare un aumento accessorio, mai aumentare o modificare la panca programmata. I dati mancanti non sono stimati.</p><button class="danger-btn" onclick="GymHealth.clear()">Cancella dati salute locali</button>':''}</section>`;
  }
  function getPayload(id) {
    const s=find(id); if(!s?.finishedAt)throw Error('Termina prima la seduta');const [start,end]=interval(s);
    return {id,start,end,workout:s.workout,notes:`GymTracker: ${totalSessionVolume(s)} kg volume; ${(s.exercises||[]).flatMap(ex=>ex.sets||[]).filter(x=>x.done).length} serie registrate. Dettaglio nell’app.`};
  }
  function receive(raw) {
    let r;try{r=typeof raw==='string'?JSON.parse(raw):raw;}catch{return;}
    if(r.error){message=r.error;toast(r.error);}
    if(r.action==='status'){status=r;if(!r.error)message='';}
    if(r.action==='profile'&&!r.error){delete r.action;state.healthProfile=r;message=r.errors?.length?'Aggiornamento parziale: '+r.errors.join(', '):'Dati aggiornati';saveState();toast(message);}
    if((r.action==='session'||r.action==='export')&&!r.error){const s=find(r.id);if(s){const h=health(s);if(r.action==='session'){const [start,end]=interval(s);if(Array.isArray(r.samples)&&r.samples.length){h.importedSamples=validSamples(r.samples,start,end);h.heartSource=r.heartSource||'';}if(finite(r.activeKcal)&&r.activeKcal>=0)h.activeKcal=r.activeKcal;toast(r.errors?.length?'Importazione parziale: '+r.errors.join(', '):r.samples?.length||finite(r.activeKcal)?'Parametri importati':'Nessun parametro disponibile per questa seduta');}else if(r.status==='exported'){h.exportedAt=new Date().toISOString();toast('Seduta presente in Connessione Salute');}saveState();}}
    if(r.action==='session'||r.action==='export'){const id=r.id||requestId;requestId=null;if(id&&find(id)&&document.querySelector('#modalBackdrop'))showHistoryDetail(id);}else if(['home','settings'].includes(state.ui.view))render();
  }
  window.GymHealth={applyWatchBatch,stats,readiness,guard,sessionCard,receive,authorize:()=>call('authorize'),refresh:()=>call('profile'),toggleAdaptive:()=>{state.settings.healthAdaptive=!state.settings.healthAdaptive;saveState();render();},importSession:id=>{try{requestId=id;call('session',getPayload(id));}catch(e){toast(e.message);}},exportSession:id=>{if(!confirm('Esportare durata e riepilogo allenamento in Connessione Salute? I dati dettagliati restano in GymTracker.'))return;try{requestId=id;call('export',getPayload(id));}catch(e){toast(e.message);}},clear:()=>{if(!confirm('Eliminare tutti i dati salute copiati in GymTracker? I dati originari ed esportati in Connessione Salute non saranno cancellati. Ferma prima la rilevazione sul Watch.'))return;delete state.healthProfile;for(const s of [...(state.history||[]),state.currentSession].filter(Boolean))delete s.healthV98;state.settings.healthAdaptive=false;saveState();render();}};
  const oldSettings=renderSettings;renderSettings=function(){const html=oldSettings.apply(this,arguments);return native()?html.replace('</main>',profileCard(true)+'</main>'):html;};
  const oldHome=renderHome;renderHome=function(){const html=oldHome.apply(this,arguments);return native()?html.replace('</main>',profileCard(false)+'</main>'):html;};
  const oldSession=renderSession;renderSession=function(){const html=oldSession.apply(this,arguments);return state.currentSession&&native()?html.replace('</main>',`<div id="gymHealthLive">${sessionCard(state.currentSession)}</div></main>`):html;};
  const oldSuggested=suggestedLoadForSet;suggestedLoadForSet=function(ex,index=0){return guard(ex,oldSuggested.apply(this,arguments));};
  // Refresh only the health panel, not in-progress input fields.
  setInterval(()=>{const node=document.querySelector('#gymHealthLive');if(node&&state.currentSession)node.innerHTML=sessionCard(state.currentSession);},10000);
  if(native())setTimeout(()=>call('status'),500);
})();
