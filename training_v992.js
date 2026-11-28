/* GymTracker 9.9.2 - work-only planning, transparent clock and focused Today UI. */
const TE992=window.GymTrainingEngine;
let timingCache992={key:'',value:null};
function calibration992(){
  const h=state.history||[],key=[state.activeGymId,h.length,h[0]?.id,h[0]?.finishedAt].join('|');
  if(timingCache992.key!==key){timingCache992={key,value:TE992.calibration(h,state.activeGymId)};}
  return timingCache992.value||{extras:{}};
}
function planRows992(w,week=state.currentWeek){
  return {workout:w.name,gymId:state.activeGymId,exercises:(w.exercises||[]).map(ex=>{
    const e=clone(ex);
    if(ex.special)e.sets=clone(getBenchSets(ex.special,week));
    else if(Array.isArray(ex.plannedSets))e.sets=clone(plannedSetsFor(ex));
    else if(!Array.isArray(ex.sets))e.sets=Array.from({length:Math.max(0,Number(ex.sets)||0)},(_,i)=>({label:String(i+1),reps:repRangeForSet(ex,i).min,targetRange:repRangeForSet(ex,i).label,restSec:ex.restSec,done:false}));
    return e;
  })};
}
// Only programs explicitly opting in use an all-sets double-progression gate.
function progressionRecords992(ex){
  if(!ex.progressionKey)return [];
  return exerciseHistory(ex,100).filter(r=>r.exercise.progressionKey===ex.progressionKey);
}
function firstExposure992(ex){return !!ex.progressionKey&&progressionRecords992(ex).length===0;}
const suggestionOriginal992=suggestedLoadForSet;
suggestedLoadForSet=function(ex,index=0){
  const original=suggestionOriginal992(ex,index);
  if(ex.autoLoad===false||state.settings.smartLoad===false||!ex.progression?.increaseOnlyWhenAllSetsAtTop)return original;
  const records=progressionRecords992(ex),first=!records.length;
  if(first&&Number(ex.entryLoadKg)>0&&(!ex.entryLoadGymId||ex.entryLoadGymId===state.activeGymId)){
    const value=Number(ex.entryLoadKg);
    return {...(original||{}),load:value,next:value,increased:false,delta:0,source:'prima esposizione',mode:'initial',confidence:'proposta da confermare',reason:'Nuovo schema: proposta prudente da verificare su questa macchina e al RIR previsto. Nessun aumento obbligatorio.',historyCount:records.length};
  }
  if(!original||first||original.mode!=='increase')return original;
  const record=records[0],required=Array.isArray(ex.sets)?ex.sets.length:Number(ex.sets)||record.sets.length;
  const allTop=record.sets.length>=required&&record.sets.slice(0,required).every((s,i)=>{
    const target=repRangeForSet(ex,i),rir=rirEquivalent(s);
    return target.max>0&&Number(s.reps)>=target.max&&s.metricValue!==''&&s.metricValue!=null&&rir!==null&&rir>=defaultRir(ex.rir);
  });
  if(allTop)return original;
  const previous=record.sets[index]||record.sets[0],value=Number(previous?.kg);
  return value>0?{...original,load:value,next:value,delta:0,increased:false,mode:'maintain',reason:'Doppia progressione: prima raggiungi il limite alto in tutte le serie con il RIR previsto.'}:original;
};
const warmupOriginal992=generateWarmupSets;
function firstWorking992(ss){return (ss.exercises||[]).find(e=>TE992.rows(e).length&&!TE992.warmExercise(e));}
generateWarmupSets=function(ex,budget=0){
  const first=firstWorking992(state.currentSession||{});
  return first&&first!==ex?[]:warmupOriginal992(ex,0);
};
function assignWarmups992(ss,preview=false){
  const first=firstWorking992(ss);
  for(const ex of ss.exercises||[]){
    if(ex!==first){if(!(ex.warmupSets||[]).some(s=>s.done))ex.warmupSets=[];continue;}
    if(state.settings.autoWarmup===false){ex.warmupSets=[];continue;}
    if(preview&&!(ex.sets||[]).some(s=>Number(s.kg)>0)){
      const sug=suggestedLoad(ex);if(sug&&ex.sets?.length)ex.sets[0].kg=sug.next;
    }
    if(!(ex.warmupSets||[]).some(s=>s.done))ex.warmupSets=warmupOriginal992(ex,0);
  }
}
function makePlan992(name,budget=state.ui.sessionMinutes){
  const ss=planRows992(getAdjustedWorkout(name,state.currentWeek));assignWarmups992(ss,true);
  if(state.settings.adaptiveTime!==false)TE992.adapt(ss,Number(budget)||0,calibration992());
  else{ss.timeBudgetMin=Number(budget)||0;ss.estimatedMin=TE992.estimate(ss,calibration992()).workMin;}
  return ss;
}
estimateExerciseMinutes=function(ex){return TE992.exerciseSeconds(ex,0,calibration992())/60;};
estimateSessionMinutes=function(ss){return TE992.estimate(ss,calibration992()).workMin;};
estimateWorkout=function(w,week){return TE992.estimate(planRows992(w,week),calibration992()).workMin;};
adaptSessionToTime=function(ss,budget){
  if(!ss)return;ss.timePlan992=clone(ss.exercises);assignWarmups992(ss);
  if(state.settings.adaptiveTime===false){ss.estimatedMin=estimateSessionMinutes(ss);ss.timeBudgetMin=Number(budget)||0;return;}
  TE992.adapt(ss,Number(budget)||0,calibration992());
};
setSessionMinutes=function(minutes){
  ensureV9State();state.ui.sessionMinutes=Math.max(0,Number(minutes)||0);saveState();render();
  if(state.currentSession)toast('Durata per la prossima seduta. La sessione in corso non viene modificata.');
};
sessionProgress=function(){return TE992.progress(state.currentSession);};
function belongsToActiveProgram992(ss){
  const p=activeProgram();return ss.programId992?ss.programId992===p.libraryId:ss.programTitle===p.title;
}
nextWorkoutName=function(){
  const split=programSplit();if(!split.length)return '';
  const from=Date.parse(state.weekStartedAt)||0;
  const last=(state.history||[]).find(s=>belongsToActiveProgram992(s)&&Date.parse(s.startedAt)>=from);
  if(!last)return split[0];const i=split.indexOf(last.workout);return split[(i+1+split.length)%split.length]||split[0];
};
const weekSessionsOriginal992=weekSessions;
weekSessions=function(week=state.currentWeek){return weekSessionsOriginal992(week).filter(belongsToActiveProgram992);};
const startOriginal992=startWorkout;
startWorkout=function(name){
  const before=state.currentSession;startOriginal992(name);if(before||!state.currentSession)return;
  const ss=state.currentSession;for(const ex of ss.exercises||[])if(ex.progressionKey)for(const [i,st] of (ex.sets||[]).entries()){const range=repRangeForSet(ex,i);if(!range.maxTechnical)st.reps=firstExposure992(ex)?range.min:Math.max(range.min,Math.min(range.max,Number(st.reps)||range.min));}assignWarmups992(ss);ss.programId992=activeProgram().libraryId;ss.timeModelVersion='9.9.2';ss.workStartedAt=null;ss.workPauses=[];ss.coachVersion='9.9.2';
  ss.estimatedMin=estimateSessionMinutes(ss);ss.warmupEstimatedMin=TE992.estimate(ss,calibration992()).warmupMin;
  if(ss.timePlan992)delete ss.timePlan992; // Plan preview is rebuilt; no duplicate private state.
  saveState();window.GymWatchBridge?.publish();render();
};
refreshExerciseWarmup=function(exi){
  const ss=state.currentSession,ex=ss?.exercises?.[exi];if(!ex)return;
  if((ex.warmupSets||[]).some(s=>s.done)){toast('Avvicinamenti gia registrati: non li sovrascrivo');return;}
  ex.warmupSets=warmupOriginal992(ex,0);ex.manualWarmup992=true;
  if(!ex.warmupSets.length)toast('Inserisci prima il carico di lavoro. Per assistenza/corpo libero usa avvicinamenti manuali appropriati.');
  saveState();render();
};
function clearWarmups992(exi){const ex=state.currentSession?.exercises?.[exi];if(!ex)return;if((ex.warmupSets||[]).some(s=>s.done)){toast('Le serie gia registrate restano conservate');return;}ex.warmupSets=[];saveState();render();}
const warmupRender992=renderWarmupTable;
renderWarmupTable=function(ex,i){
  if(!ex.warmupSets?.length)return `<button class="warmup-generate" onclick="refreshExerciseWarmup(${i})">+ Avvicinamento facoltativo</button>`;
  return warmupRender992(ex,i).replace('Warm-up automatico','Riscaldamento - escluso dal lavoro').replace('</b><button','</b><button').replace('</div><div class="warmup-set-list">',`</div><button class="chip-btn" onclick="clearWarmups992(${i})">Sono gia caldo: rimuovi non eseguiti</button><div class="warmup-set-list">`);
};
function beginWork992(at=null){
  const ss=state.currentSession;if(!ss)return;
  const t=Date.parse(at);const now=Number.isFinite(t)&&t>=Date.parse(ss.startedAt)&&t<=Date.now()+60000?t:Date.now();
  if(!ss.workStartedAt){ss.workStartedAt=new Date(now).toISOString();ss.workClockSource='explicit';ss.warmupActualMin=Math.max(0,(now-Date.parse(ss.startedAt))/60000);}
  if(ss.workPauses?.some(p=>p.end==null)){for(const p of ss.workPauses)if(p.end==null)p.end=now;}
  saveState();render();
}
function pauseWork992(){
  const ss=state.currentSession;if(!ss?.workStartedAt)return;
  ss.workPauses=ss.workPauses||[];
  if(ss.workPauses.some(p=>p.end==null)){beginWork992();return;}
  ss.workPauses.push({start:Date.now(),end:null,reason:'manual'});saveState();render();
}
function noteWorkCompletion992(ss,ex,set,at){
  const t=Date.parse(at);if(!Number.isFinite(t))return;
  const inferred=Math.max(Date.parse(ss.startedAt)||0,t-TE992.executionSeconds(ex,set)*1000);
  if(!ss.workStartedAt||ss.workClockSource==='inferred-first-set'&&inferred<Date.parse(ss.workStartedAt)){
    ss.workStartedAt=new Date(inferred).toISOString();ss.workClockSource='inferred-first-set';ss.warmupActualMin=Math.max(0,(inferred-Date.parse(ss.startedAt))/60000);
  }
  for(const p of ss.workPauses||[])if(p.end==null)p.end=t;
}
const completeOriginal992=completeSet;
completeSet=function(exi,si){
  const ss=state.currentSession,ex=ss?.exercises?.[exi],st=ex?.sets?.[si],was=!!st?.done;
  completeOriginal992(exi,si);
  if(st?.done&&!was){noteWorkCompletion992(ss,ex,st,st.completedAt);saveState();render();}
};
function sealTrainingTiming992(ss){
  const c=TE992.clock(ss,Date.parse(ss.finishedAt)||Date.now());ss.trainingDurationMin=Math.round(c.seconds/6)/10;ss.trainingDurationSource=c.inferred?'estimated-from-first-set':'explicit-work-clock';ss.elapsedTotalMin=ss.durationMin;
  ss.workingSetCount=TE992.progress(ss).done;ss.warmupActualMin=Number(ss.warmupActualMin)||0;
}
const finishOriginal992=finishWorkout;
finishWorkout=function(confirmedOnWatch=false,watchEndedAt=null){
  const ss=state.currentSession;if(!ss)return;
  if(!confirmedOnWatch){
    const p=sessionProgress();if(p.pct<100&&!confirm(`Hai completato ${p.done}/${p.total} serie allenanti. Salvare la seduta incompleta?`))return;
    const times=(ss.exercises||[]).flatMap(e=>(e.sets||[]).filter(s=>s.done).map(s=>Date.parse(s.completedAt))).filter(Number.isFinite);
    const last=times.length?Math.max(...times):null;
    if(last&&Date.now()-last>15*60000&&confirm('Ultima serie registrata oltre 15 minuti fa. Chiudere la seduta all\'ora dell\'ultima serie, escludendo la dimenticanza finale?'))watchEndedAt=new Date(last).toISOString();
    confirmedOnWatch=true;
  }
  return finishOriginal992(confirmedOnWatch,watchEndedAt);
};
updateElapsed=function(){const el=$('#elapsedTime');if(!el||!state.currentSession)return;const c=TE992.clock(state.currentSession);el.textContent=c.started?fmtTime(c.seconds):'00:00';};
function workControls992(){
  const ss=state.currentSession;if(!ss)return'';const c=TE992.clock(ss),e=TE992.estimate(ss,calibration992()),p=sessionProgress();
  return `<section class="card time-panel992"><div class="row between"><b>${c.started?(c.paused?'Lavoro in pausa':'Tempo allenante'):'Prima il riscaldamento'}</b><span class="badge green">${p.done}/${p.total} SERIE</span></div><p class="subtle">${c.started?(c.inferred?'Avvio stimato dalla prima serie registrata. ':'')+'Recuperi inclusi; warm-up iniziale e pause manuali esclusi.':'Completa gli avvicinamenti, poi avvia il tempo di lavoro. I sensori continuano a registrare anche il riscaldamento.'}</p>${!c.started?'<button class="primary-btn" onclick="beginWork992()">Inizia serie allenanti</button>':`<button class="secondary-btn" onclick="pauseWork992()">${c.paused?'Riprendi lavoro':'Pausa lavoro'}</button>`}<div class="time-summary992"><span><b>~${Math.round(e.workMin)} min</b> lavoro previsto</span><span><b>+ ~${Math.round(e.warmupMin)} min</b> riscaldamento separato</span></div>${ss.timeUnmet?'<p class="warn">Il blocco minimo supera il tempo scelto. Non sono stati ridotti i recuperi: considera una seduta piu breve o termina prima gli accessori.</p>':''}${p.total&&p.done===p.total?'<button class="primary-btn" onclick="finishWorkout()">Tutte le serie completate: salva</button>':''}</section>`;
}
const renderSessionOriginal992=renderSession;
renderSession=function(){if(state.currentSession)state.currentSession.estimatedMin=estimateSessionMinutes(state.currentSession);return renderSessionOriginal992().replace('<main class="content">','<main class="content">'+workControls992()).replace(/<span>blocchi<\/span>/g,'<span>serie allenanti</span>').replace('<span>tempo</span>','<span>tempo allenante</span>');};
function planReport992(ss){
  const changed=(ss.timeRemoved||[]).map(x=>`${esc(x.name)}: -${x.sets} serie`).concat((ss.timeOmitted||[]).map(x=>`${esc(x.name)}: omesso`));
  return changed.length?`<details class="changes992"><summary>Come cambia la seduta (${changed.length})</summary><p>${changed.join('<br>')}</p><small>Recuperi originali mantenuti. Nessuna serie gia eseguita viene cancellata.</small></details>`:'<p class="subtle">La seduta completa rientra nella stima disponibile.</p>';
}
renderHome=function(){
  const split=programSplit();if(!split.length)return shell(`<section class="card hero"><div class="personal-heading">${personalIcon('program')}<h1>Pronto a iniziare?</h1></div><p>Crea una scheda o importa il tuo programma.</p><button class="primary-btn" onclick="triggerProgramImport()">Importa scheda</button><button class="secondary-btn" onclick="setView('program')">Libreria e creazione schede</button><button class="secondary-btn" onclick="setView('settings')">Ripristina backup completo</button></section>`,'Oggi','Il tuo allenamento');
  const next=nextWorkoutName(),minutes=Number(state.ui.sessionMinutes)||0,gym=activeGym(),plan=makePlan992(next,minutes),e=TE992.estimate(plan,calibration992());
  const badge=state.settings.adaptiveTime===false?'ADATTAMENTO DISATTIVATO':minutes?`${minutes} MIN DI LAVORO`:'SEDUTA COMPLETA';
  let content=`<section class="card hero today992"><div class="personal-heading">${personalIcon('gyms')}<div><span class="eyebrow992">OGGI - SETTIMANA ${state.currentWeek}/${programWeekCount()}</span><h1>${esc(next)}</h1><p>${esc(gym?.name||'Seleziona palestra')}</p></div></div><div class="row between"><span class="badge">${esc(programTitle())}</span><button class="chip-btn" onclick="setView('gyms')">Cambia palestra</button></div></section>`;
  if(state.currentSession){const p=sessionProgress();content+=`<section class="card"><span class="badge green">SESSIONE IN CORSO</span><h2>${esc(state.currentSession.workout)}</h2><p>${p.done}/${p.total} serie allenanti</p><button class="primary-btn" onclick="resumeWorkout()">Riprendi allenamento</button></section>`;}
  content+=`<section class="card time-panel992"><div class="row between"><h2>Quanto tempo hai?</h2><span class="badge green">${badge}</span></div><p class="subtle">Il budget comprende serie, recuperi e cambi macchina. Riscaldamento separato.</p><div class="time-choice">${[[45,'45 min'],[60,'60 min'],[0,'Completo']].map(([m,l])=>`<button class="${minutes===m?'active':''}" onclick="setSessionMinutes(${m})">${l}</button>`).join('')}</div>${state.settings.adaptiveTime===false?'<button class="secondary-btn" onclick="state.settings.adaptiveTime=true;saveState();render()">Attiva adattamento al tempo</button>':''}<div class="today-stats992"><div><b>${TE992.progress(plan).total}</b><small>serie allenanti</small></div><div><b>~${Math.round(e.workMin)}</b><small>min di lavoro</small></div><div><b>+${Math.round(e.warmupMin)}</b><small>min warm-up</small></div></div><p class="subtle">Stima con ${Math.round(e.reserveMin)} min di margine per preparazione/attese; non una garanzia se le macchine sono occupate.</p>${planReport992(plan)}${plan.timeUnmet?'<p class="warn">Il minimo utile supera questo budget. I recuperi non sono stati compressi.</p>':''}${!state.currentSession?`<button class="primary-btn" onclick="startWorkout(decodeURIComponent('${encodedArg(next)}'))">Avvia ${esc(next)}</button>`:''}</section>`;
  content+=`<div class="section-title"><h2>Le tue sedute</h2><button class="chip-btn" onclick="setView('program')">Scheda</button></div><div class="workout-list">${split.map(name=>{const p=makePlan992(name,minutes);return `<div class="workout-card"><div><h3>${esc(name)}</h3><p>${TE992.progress(p).total} serie - ~${Math.round(p.estimatedMin)} min allenanti</p></div><button class="start" onclick="startWorkout(decodeURIComponent('${encodedArg(name)}'))">Avvia</button></div>`;}).join('')}</div>`;
  const stats=rangeStats(7);content+=`<section class="card"><div class="personal-heading">${personalIcon('progress')}<h2>Ultimi 7 giorni</h2></div><div class="today-stats992"><div><b>${stats.sessions}</b><small>sedute</small></div><div><b>${stats.sets}</b><small>serie completate</small></div><div><b>${stats.volume?Math.round(stats.volume/100)/10:0} t</b><small>volume registrato</small></div></div><button class="secondary-btn" onclick="setView('history')">Storico e sincronizzazione Salute</button></section>`;
  return shell(content,'Oggi','Allenati. Registra. Progredisci.');
};
const settingsOriginal992=renderSettings;
renderSettings=function(){return settingsOriginal992().replace('</main>',`<section class="card"><h2>Tempi e riscaldamento</h2><p class="subtle">Warm-up automatico solo sul primo esercizio allenante. Gli avvicinamenti successivi sono facoltativi. Serie e cronometro di lavoro non comprendono il riscaldamento iniziale; Salute conserva la sessione totale.</p><p class="subtle">Il modello usa esecuzione, lavoro unilaterale, recuperi per serie, preparazione e margine. ${calibration992().accepted||0} sedute con timestamp utilizzabili per la calibrazione; ${calibration992().rejected||0} escluse. Lo storico originale non viene riscritto.</p></section></main>`);};
if(state.ui.sessionMinutes==null)state.ui.sessionMinutes=60;
render();
