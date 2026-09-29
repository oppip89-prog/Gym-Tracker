/* Gym Tracker v9.0 - Adaptive Coach, Smart Load 6, Recovery, Warm-up, Time Planner */

// ---- stato / migrazione ---------------------------------------------------
const V9_ENGINE='smart-load-v6-adaptive-coach';
Object.assign(defaultState.settings,{
  autoWarmup:true,
  adaptiveReadiness:true,
  adaptiveTime:true,
  muscleRecovery:true,
  effortFeedback:true
});
Object.assign(defaultState.ui,{sessionMinutes:0});
defaultState.readiness={date:'',sleep:'',energy:'',soreness:''};

function ensureV9State(){
  state.settings={...defaultState.settings,...(state.settings||{})};
  state.ui={...defaultState.ui,...(state.ui||{})};
  state.readiness={...defaultState.readiness,...(state.readiness||{})};
  if(![0,30,45,60,75,90].includes(Number(state.ui.sessionMinutes)))state.ui.sessionMinutes=0;
  state.featureVersion=9;
  state.smartLoadEngine=V9_ENGINE;
}
function todayKey(){return dayKey(new Date());}
function readinessScore(){
  ensureV9State();const r=state.readiness||{};
  if(r.date!==todayKey())return null;
  const sleep=Number(r.sleep),energy=Number(r.energy),soreness=Number(r.soreness);
  if(![sleep,energy,soreness].every(v=>v>=1&&v<=5))return null;
  return Math.round(((sleep+energy+(6-soreness))/15)*100);
}
function readinessLabel(score){return score===null?'non compilato':score>=80?'ottimo':score>=65?'buono':score>=50?'medio':'basso';}
function readinessPolicy(){
  if(state.settings.adaptiveReadiness===false)return{factor:1,setReduction:0,reason:''};
  const score=readinessScore();if(score===null)return{factor:1,setReduction:0,reason:''};
  if(score<45)return{factor:.95,setReduction:1,reason:`readiness ${score}/100: -5% accessori`};
  if(score<60)return{factor:.975,setReduction:1,reason:`readiness ${score}/100: volume ridotto`};
  return{factor:1,setReduction:0,reason:''};
}
function updateReadiness(field,value){
  ensureV9State();if(!['sleep','energy','soreness'].includes(field))return;
  state.readiness.date=todayKey();state.readiness[field]=value===''?'':clamp(Number(value)||1,1,5);saveState();render();
}
function clearReadiness(){state.readiness=clone(defaultState.readiness);saveState();render();}

// ---- gruppi muscolari, volume e recupero ---------------------------------
const MUSCLE_ORDER=['Petto','Dorso','Spalle','Tricipiti','Bicipiti','Quadricipiti','Femorali','Glutei','Polpacci'];
const MOVEMENT_MUSCLES={
  'bench-press':[['Petto',1],['Tricipiti',.5],['Spalle',.35]],
  'chest-fly':[['Petto',1],['Spalle',.15]],
  'overhead-press':[['Spalle',1],['Tricipiti',.5]],
  'lateral-raise':[['Spalle',1]],'rear-delt':[['Spalle',1],['Dorso',.25]],
  'vertical-pull':[['Dorso',1],['Bicipiti',.45]],'horizontal-pull':[['Dorso',1],['Bicipiti',.4]],
  'biceps-curl':[['Bicipiti',1]],'triceps-extension':[['Tricipiti',1]],
  'knee-dominant':[['Quadricipiti',1],['Glutei',.55],['Femorali',.15]],
  'knee-extension':[['Quadricipiti',1]],'knee-flexion':[['Femorali',1]],
  'hip-thrust':[['Glutei',1],['Femorali',.3]],'hip-hinge':[['Femorali',1],['Glutei',.65],['Dorso',.15]],
  'calf-raise':[['Polpacci',1]],'abductor':[['Glutei',.65]]
};
function muscleMapForExercise(ex){
  const move=effectiveMovementId(ex);if(MOVEMENT_MUSCLES[move])return MOVEMENT_MUSCLES[move];
  const n=cleanKey(`${ex?.name||''} ${ex?.equipment||''}`);
  if(/petto|chest/.test(n))return[['Petto',1]];if(/dorso|row|lat/.test(n))return[['Dorso',1]];
  if(/spall|shoulder|laterali/.test(n))return[['Spalle',1]];if(/bicip|curl/.test(n))return[['Bicipiti',1]];
  if(/tricip|pushdown/.test(n))return[['Tricipiti',1]];if(/quad|leg extension/.test(n))return[['Quadricipiti',1]];
  if(/femoral|leg curl/.test(n))return[['Femorali',1]];return[];
}
function completedWorkSets(ex){return (ex?.sets||[]).filter(s=>s.done&&!s.warmup&&Number(s.reps)>0);}
function muscleVolumeWindow(days=7,offsetDays=0){
  const out=Object.fromEntries(MUSCLE_ORDER.map(m=>[m,{sets:0,volume:0}]));
  const end=startOfDay();end.setDate(end.getDate()-offsetDays+1);const start=new Date(end);start.setDate(start.getDate()-days);
  for(const sess of state.history||[]){const t=new Date(sess.startedAt);if(t<start||t>=end)continue;for(const ex of sess.exercises||[]){const sets=completedWorkSets(ex);if(!sets.length)continue;for(const [muscle,w] of muscleMapForExercise(ex)){if(!out[muscle])out[muscle]={sets:0,volume:0};out[muscle].sets+=sets.length*w;out[muscle].volume+=sets.reduce((a,s)=>a+(Number(s.kg)||0)*(Number(s.reps)||0),0)*w;}}}
  return out;
}
function muscleRecovery(){
  const fatigue=Object.fromEntries(MUSCLE_ORDER.map(m=>[m,0])),now=Date.now();
  for(const sess of state.history||[]){const ageH=(now-new Date(sess.finishedAt||sess.startedAt).getTime())/36e5;if(ageH<0||ageH>168)continue;const decay=Math.pow(.5,ageH/42);
    for(const ex of sess.exercises||[]){for(const st of completedWorkSets(ex)){const rir=rirEquivalent(st),effort=1+(rir===null?0:clamp(2-rir,0,2)*.22);for(const [muscle,w] of muscleMapForExercise(ex)){fatigue[muscle]=(fatigue[muscle]||0)+(8.5*effort*w*decay);}}}
  }
  return MUSCLE_ORDER.map(m=>({muscle:m,recovery:Math.round(clamp(100-(fatigue[m]||0),0,100)),fatigue:fatigue[m]||0}));
}
function recoveryClass(v){return v>=80?'recovery-high':v>=55?'recovery-mid':'recovery-low';}

// ---- Smart Load 6: storico recente + feedback ----------------------------
function smartLoadSignal(ex,index=0){
  const records=exerciseHistory(ex,5),sets=[];
  for(const rec of records){const done=(rec.sets||[]).filter(s=>s.done&&Number(s.kg)>0&&Number(s.reps)>0);const st=done[index]||done[0];if(!st)continue;const kg=Number(st.kg)||0,reps=Number(st.reps)||0,rir=rirEquivalent(st)||0;sets.push({kg,reps,rir,feedback:rec.exercise?.effortFeedback||'',score:isLowerHarder(ex)?reps-Math.max(0,kg)*.02:estimateE1RM(kg,reps,rir)});}
  const recent=sets[0],prior=sets.slice(1,4),priorMean=prior.length?prior.reduce((a,x)=>a+x.score,0)/prior.length:0,trend=recent&&priorMean?((recent.score-priorMean)/Math.abs(priorMean))*100:0;
  const feedbacks=records.slice(0,2).map(r=>r.exercise?.effortFeedback||'');
  const hardCount=feedbacks.filter(x=>x==='hard').length,easy=feedbacks[0]==='easy',right=feedbacks[0]==='right';
  const plateau=sets.length>=3&&sets.slice(0,3).every((x,i,a)=>i===0||Math.abs(x.score-a[0].score)<=Math.max(1,Math.abs(a[0].score)*.015));
  return{records,sets,recent,trend,hardCount,easy,right,plateau};
}
function refineSmartLoad6(ex,index,suggestion){
  if(!suggestion||state.settings.smartLoad===false||ex?.special||suggestion.mode==='fixed')return suggestion;
  const sig=smartLoadSignal(ex,index),step=loadStepFor(ex)||2.5,load=Number(suggestion.load)||Number(sig.recent?.kg)||0;let s={...suggestion,v6:true,trendPct:Math.round(sig.trend*10)/10};
  if(sig.hardCount>=2&&load>0){const next=Math.max(0,load+loadDeltaFor(ex,step,false));s={...s,next,mode:'decrease',reason:`${suggestion.reason} · feedback: due sedute troppo pesanti`,delta:next-load};}
  else if(sig.hardCount>=1&&s.mode==='increase'&&load>0){s={...s,next:load,mode:'maintain',reason:`${suggestion.reason} · feedback pesante: aumento rinviato`,delta:0};}
  else if(sig.easy&&['maintain','initial'].includes(s.mode)&&load>0){const next=Math.max(0,load+loadDeltaFor(ex,step,true));s={...s,next,mode:'increase',reason:`${suggestion.reason} · feedback facile: step successivo`,delta:next-load};}
  else if(sig.trend<-5&&s.mode==='increase'&&load>0){s={...s,next:load,mode:'maintain',reason:`${suggestion.reason} · trend recente in calo: consolida`,delta:0};}
  else if(sig.plateau&&s.mode==='maintain'){s.reason=`${s.reason} · prestazioni stabili nelle ultime 3 sedute`;}
  if(sig.records.length>=4)s.confidence='alta';else if(sig.records.length>=2)s.confidence='media';
  return s;
}
function applyReadinessToSuggestion(ex,suggestion){
  if(!suggestion||ex?.special||suggestion.mode==='fixed'||suggestion.readinessAdjusted)return suggestion;const p=readinessPolicy();if(Math.abs(p.factor-1)<.001)return suggestion;const raw=Number(suggestion.next);if(!(raw>0))return suggestion;const step=loadStepFor(ex)||2.5;let next=isLowerHarder(ex)?roundLoad(raw/p.factor,step,raw):roundLoad(raw*p.factor,step,raw);next=Math.max(0,Math.round(next*100)/100);return{...suggestion,next,mode:suggestion.mode==='deload'?'deload':'readiness',reason:[suggestion.reason,p.reason].filter(Boolean).join(' · '),readinessBaseKg:raw,readinessFactor:p.factor,readinessAdjusted:true};
}
const v8SuggestedLoadForSet=suggestedLoadForSet;
suggestedLoadForSet=function(ex,index=0){
  // riparte dal motore base per applicare feedback prima di scarico/readiness
  let s=baseSuggestedLoadForSet(ex,index);s=refineSmartLoad6(ex,index,s);s=applyPhaseLoadToSuggestion(ex,s);s=applyReadinessToSuggestion(ex,s);return s;
};
function feedbackLabel(v){return v==='easy'?'Facile':v==='right'?'Giusto':v==='hard'?'Pesante':'—';}
function setExerciseFeedback(exi,value){const ex=state.currentSession?.exercises?.[exi];if(!ex)return;ex.effortFeedback=value;saveState();render();}

// ---- warm-up automatico ----------------------------------------------------
function warmupEligible(ex){if(!ex||isLowerHarder(ex)||ex.autoWarmup===false)return false;const move=effectiveMovementId(ex);return ['bench-press','knee-dominant','hip-hinge','overhead-press','horizontal-pull','vertical-pull','hip-thrust'].includes(move);}
function generateWarmupSets(ex,budget=0){
  const work=(ex.sets||[]).find(s=>Number(s.kg)>0),kg=Number(work?.kg)||Number(ex.loadSuggestion?.recommendedKg)||0;if(!warmupEligible(ex)||kg<20)return[];const step=Math.max(.5,loadStepFor(ex)||2.5),short=Number(budget)>0&&Number(budget)<=35;
  const plan=short?[[.5,6,45],[.75,3,60]]:(kg>=100?[[.35,8,45],[.55,5,60],[.72,3,75],[.86,1,90]]:[[.45,8,45],[.65,5,60],[.82,2,75]]);
  const seen=new Set(),out=[];for(const [pct,reps,restSec] of plan){let w=Math.max(step,Math.round((kg*pct)/step)*step);w=Math.round(w*100)/100;if(w>=kg*.95||seen.has(w))continue;seen.add(w);out.push({label:`W${out.length+1}`,kg:w,reps,done:false,restSec,warmup:true,target:false});}return out;
}
function refreshExerciseWarmup(exi){const ex=state.currentSession?.exercises?.[exi];if(!ex)return;ex.warmupSets=generateWarmupSets(ex,state.currentSession?.timeBudgetMin||0);saveState();render();}
function completeWarmupSet(exi,wi){const ex=state.currentSession?.exercises?.[exi],s=ex?.warmupSets?.[wi];if(!s)return;if(s.done){s.done=false;s.completedAt=null;}else{s.done=true;s.completedAt=new Date().toISOString();if(state.settings.autoTimer&&s.restSec>0)startTimer(s.restSec,`${ex.name} · warm-up`);}saveState();render();}
function updateWarmupField(exi,wi,field,value){const s=state.currentSession?.exercises?.[exi]?.warmupSets?.[wi];if(!s)return;if(['kg','reps'].includes(field)&&value!=='')value=Number(String(value).replace(',','.'));s[field]=value;saveState();}

// ---- adattamento durata / readiness volume --------------------------------
function estimateExerciseMinutes(ex){if(ex.fixedMin)return Number(ex.fixedMin)||0;if(ex.special)return 4+(ex.sets?.length||0)*.75+Math.max(0,(ex.sets?.length||0)-1)*(Number(ex.sets?.[0]?.restSec)||240)/60;const n=ex.sets?.length||0;return n?((n*40+Math.max(0,n-1)*(Number(ex.restSec)||0)+60)/60):0;}
function estimateSessionMinutes(ss){return Math.round((ss.exercises||[]).reduce((a,e)=>a+estimateExerciseMinutes(e),0)*10)/10;}
function setSessionMinutes(minutes){ensureV9State();state.ui.sessionMinutes=Number(minutes)||0;saveState();render();}
function removeLastAccessorySet(ss,reason){for(let i=ss.exercises.length-1;i>=0;i--){const ex=ss.exercises[i];if(ex.special||!ex.sets||ex.sets.length<=1)continue;const removed=ex.sets.pop();ex.timeRemovedSets=Number(ex.timeRemovedSets||0)+1;ex.timeAdaptReason=reason;return removed?true:false;}return false;}
function removeLastAccessoryExercise(ss,reason){for(let i=ss.exercises.length-1;i>=2;i--){const ex=ss.exercises[i];if(ex.special)continue;ss.timeOmitted=ss.timeOmitted||[];ss.timeOmitted.unshift({name:ex.name,reason});ss.exercises.splice(i,1);return true;}return false;}
function adaptSessionToTime(ss,budget){
  budget=Number(budget)||0;if(!ss||!budget||state.settings.adaptiveTime===false)return;ss.timeBudgetMin=budget;ss.originalEstimatedMin=estimateSessionMinutes(ss);let guard=50;
  while(estimateSessionMinutes(ss)>budget&&guard--){if(removeLastAccessorySet(ss,'durata disponibile'))continue;if(removeLastAccessoryExercise(ss,'durata disponibile'))continue;break;}
  ss.estimatedMin=estimateSessionMinutes(ss);ss.timeAdapted=ss.estimatedMin<ss.originalEstimatedMin-.2;
}
function adaptSessionToReadiness(ss){const p=readinessPolicy();if(!ss||p.setReduction<1)return;for(let n=0;n<p.setReduction;n++)removeLastAccessorySet(ss,'readiness del giorno');ss.readinessAdapted=true;ss.estimatedMin=estimateSessionMinutes(ss);}

const v8StartWorkout=startWorkout;
startWorkout=function(name){
  const before=state.currentSession;v8StartWorkout(name);if(before||!state.currentSession)return;
  const ss=state.currentSession;ensureV9State();ss.readinessSnapshot={...clone(state.readiness||{}),score:readinessScore()};adaptSessionToTime(ss,state.ui.sessionMinutes);adaptSessionToReadiness(ss);
  if(state.settings.autoWarmup!==false)for(const ex of ss.exercises||[])if(ex.sets?.length)ex.warmupSets=generateWarmupSets(ex,ss.timeBudgetMin||0);
  ss.coachVersion='v9';saveState();render();
};

// ---- PR più completi -------------------------------------------------------
function priorRepsAtLoad(ex,kg){let best=0;for(const rec of exerciseHistory(ex,50))for(const st of rec.sets||[])if(Math.abs((Number(st.kg)||0)-kg)<.01)best=Math.max(best,Number(st.reps)||0);return best;}
const v8CompleteSet=completeSet;
completeSet=function(exi,si){
  const ex=state.currentSession?.exercises?.[exi],s=ex?.sets?.[si];if(!ex||!s)return;const wasDone=!!s.done,kg=Number(s.kg)||0,reps=Number(s.reps)||0,best=priorBest(ex),repBest=kg>0?priorRepsAtLoad(ex,kg):0;v8CompleteSet(exi,si);if(wasDone){delete s.prFlags;saveState();return;}if(!s.done)return;const flags=[];if(isLowerHarder(ex)&&kg>0&&best.bestKg>0&&kg<best.bestKg)flags.push('assistenza');if(!isLowerHarder(ex)&&kg>0&&best.bestKg>0&&kg>best.bestKg)flags.push('carico');const e1=!isLowerHarder(ex)&&kg>0&&reps>0&&reps<=12?estimateE1RM(kg,reps,rirEquivalent(s)||0):0;if(e1>best.bestE1rm&&best.bestE1rm>0)flags.push('e1RM');if(repBest>0&&reps>repBest)flags.push('reps');if(flags.length)s.prFlags=flags;saveState();
};

// ---- statistiche esercizio ------------------------------------------------
function detailedExerciseStats(target){
  const ex=typeof target==='string'?(catalogEntry(target)||findProgramExercise(target)||{name:target,exerciseId:target}):target,records=exerciseHistory(ex,200),assisted=isLowerHarder(ex);let bestKg=assisted?Infinity:0,bestE=0,bestVol=0,totalSets=0,totalReps=0,prCount=0,last=null;
  for(const rec of records){let vol=0;for(const st of rec.sets||[]){const kg=Number(st.kg)||0,reps=Number(st.reps)||0;if(!(kg>0&&reps>0))continue;totalSets++;totalReps+=reps;vol+=kg*reps;if(assisted)bestKg=Math.min(bestKg,kg);else bestKg=Math.max(bestKg,kg);if(!assisted&&reps<=12)bestE=Math.max(bestE,estimateE1RM(kg,reps,rirEquivalent(st)||0));if(st.prFlags?.length)prCount++;}bestVol=Math.max(bestVol,vol);if(!last)last=rec;}
  const sig=smartLoadSignal(ex,0);return{records:records.length,totalSets,totalReps,bestKg:Number.isFinite(bestKg)?bestKg:0,bestE,bestVol:Math.round(bestVol),prCount,last,trend:sig.trend,plateau:sig.plateau,feedback:last?.exercise?.effortFeedback||'',assisted};
}

// ---- swap intelligente -----------------------------------------------------
function replacementScore(p,ex){const gym=activeGym(),sameGym=gym&&cleanKey(p.gym||'')===cleanKey(gym.name),shared=!p.gym,history=exerciseReferenceStats(p).latest?1:0,mapped=gym?.mappings?.[baseGymSlotKey(ex)]===p.id;return(mapped?100:0)+(sameGym?40:0)+(shared?20:0)+(history?10:0);}
showSubstitutions=function(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex)return;syncExerciseCatalogFromKnownData();const movement=effectiveMovementId(ex),gym=activeGym();const same=catalogEntries().filter(p=>p.id!==effectiveExerciseId(ex)&&p.movementId===movement&&(!p.gym||!gym||cleanKey(p.gym)===cleanKey(gym.name))).sort((a,b)=>replacementScore(b,ex)-replacementScore(a,ex));
  const fallback=[];if(ex.baseName||ex.name)fallback.push(ex.baseName||ex.name);if(ex.alternative&&ex.alternative!=='—'&&ex.alternative!=='Nessuna')fallback.push(...String(ex.alternative).split(/\s*\/\s*|,\s*/));substitutionMap(ex.baseName||ex.name).forEach(x=>fallback.push(x));const known=new Set(same.map(x=>cleanKey(x.name))),generic=[...new Set(fallback.filter(Boolean))].filter(n=>!known.has(cleanKey(n)));
  showModal(`<h2>Swap intelligente</h2><p class="subtle">Mostro prima le varianti dello stesso movimento disponibili in ${gym?`<b>${esc(gym.name)}</b>`:'questa palestra'} e con storico. Ogni macchina mantiene i propri kg.</p><div class="modal-list">${same.map(p=>{const st=exerciseReferenceStats(p),ref=st.latest,score=replacementScore(p,ex);return `<button class="modal-option" onclick="replaceExerciseWithCatalog(${exi},decodeURIComponent('${encodedArg(p.id)}'))"><b>${esc(profileDisplayName(p))}</b><small>${esc(p.equipment||'Attrezzatura non specificata')}${ref?` · ultimo ${fmtKg(ref.kg)}×${ref.reps}`:''}${score>=40?' · compatibile palestra':''}</small></button>`}).join('')}${generic.map(c=>`<button class="modal-option" onclick="replaceExercise(${exi},decodeURIComponent('${encodedArg(c)}'))">${esc(c)}<small>Alternativa generica · nuovo storico se necessario</small></button>`).join('')}</div><button class="secondary-btn" style="margin-top:10px" onclick="showCatalogForReplacement(${exi})">Cerca tutto il database</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
};

// ---- UI -------------------------------------------------------------------
function readinessSelect(field,label,invert=false){const v=state.readiness?.[field]??'';return `<label><span>${label}</span><select class="select-input" onchange="updateReadiness('${field}',this.value)"><option value="">—</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(v)===n?'selected':''}>${n}${n===1?(invert?' · minimo':' · scarso'):n===5?(invert?' · alto':' · ottimo'):''}</option>`).join('')}</select></label>`;}
function renderCoachHomeCards(){
  ensureV9State();const score=readinessScore(),rec=muscleRecovery(),cur=muscleVolumeWindow(7,0),prev=muscleVolumeWindow(7,7),minutes=Number(state.ui.sessionMinutes)||0;
  const readiness=`<section class="card coach-card"><div class="row between"><div><h2 style="margin:0">Readiness del giorno</h2><div class="subtle">Check-in facoltativo: adatta solo accessori/volume, non sostituisce RIR/RPE.</div></div><span class="badge ${score!==null&&score<50?'warn':'green'}">${score===null?'—':score+'/100'}</span></div><div class="readiness-grid">${readinessSelect('sleep','Sonno')}${readinessSelect('energy','Energia')}${readinessSelect('soreness','Indolenzimento',true)}</div>${score!==null?`<div class="coach-note">Stato: <b>${readinessLabel(score)}</b>${readinessPolicy().reason?` · ${esc(readinessPolicy().reason)}`:''}</div>`:''}</section>`;
  const time=`<section class="card"><div class="row between"><div><h2 style="margin:0">Tempo disponibile</h2><div class="subtle">La seduta mantiene priorità e panca, poi riduce serie/accessori dal fondo.</div></div><span class="badge">${minutes?minutes+' min':'COMPLETO'}</span></div><div class="time-choice">${[[0,'Completo'],[30,'30'],[45,'45'],[60,'60'],[75,'75'],[90,'90']].map(([m,l])=>`<button class="${minutes===m?'active':''}" onclick="setSessionMinutes(${m})">${l}${m?' min':''}</button>`).join('')}</div></section>`;
  const recovery=`<section class="card"><div class="row between"><div><h2 style="margin:0">Recupero muscolare</h2><div class="subtle">Indicatore euristico da serie, RIR/RPE e tempo trascorso; non è una misura fisiologica.</div></div><span class="badge">7 GIORNI</span></div><div class="recovery-list">${rec.map(r=>`<div class="recovery-row"><span>${r.muscle}</span><div><i class="${recoveryClass(r.recovery)}" style="width:${r.recovery}%"></i></div><b>${r.recovery}%</b></div>`).join('')}</div></section>`;
  const volume=`<section class="card"><div class="row between"><div><h2 style="margin:0">Volume per gruppo</h2><div class="subtle">Serie equivalenti negli ultimi 7 giorni rispetto ai 7 precedenti.</div></div><span class="badge green">VOLUME</span></div><div class="muscle-volume-grid">${MUSCLE_ORDER.map(m=>{const a=cur[m]?.sets||0,b=prev[m]?.sets||0,d=a-b;return `<div><span>${m}</span><b>${a.toFixed(a%1?1:0)}</b><small class="${d>0?'green':d<0?'warn':''}">${d===0?'=':`${d>0?'+':''}${d.toFixed(1)}`}</small></div>`}).join('')}</div></section>`;
  return readiness+time+(state.settings.muscleRecovery===false?'':recovery+volume);
}
const v8RenderHome=renderHome;
renderHome=function(){let html=v8RenderHome();return html.replace('</main>',`${renderCoachHomeCards()}</main>`);};

function renderWarmupTable(ex,i){const sets=ex.warmupSets||[];if(!sets.length)return `<button class="warmup-generate" onclick="refreshExerciseWarmup(${i})">+ Genera warm-up</button>`;return `<div class="auto-warmup"><div class="row between"><b>Warm-up automatico</b><button onclick="refreshExerciseWarmup(${i})">Ricalcola</button></div><div class="warmup-set-list">${sets.map((s,wi)=>`<div class="warmup-set-row"><span>${esc(s.label)}</span><input class="num-input" type="number" step="any" value="${esc(s.kg)}" oninput="updateWarmupField(${i},${wi},'kg',this.value)"><span>kg</span><input class="num-input" type="number" step="1" value="${esc(s.reps)}" oninput="updateWarmupField(${i},${wi},'reps',this.value)"><span>rep</span><button class="set-btn ${s.done?'done':''}" onclick="completeWarmupSet(${i},${wi})">✓</button></div>`).join('')}</div></div>`;}
function renderFeedback(ex,i){if(!state.settings.effortFeedback||!ex.sets?.length||!ex.sets.every(s=>s.done))return'';return `<div class="effort-feedback"><span>Com'è stato il carico?</span><div>${[['easy','Facile'],['right','Giusto'],['hard','Pesante']].map(([v,l])=>`<button class="${ex.effortFeedback===v?'active':''}" onclick="setExerciseFeedback(${i},'${v}')">${l}</button>`).join('')}</div></div>`;}

renderSession=function(){
  const ss=state.currentSession;if(!ss){state.ui.view='home';saveState();return renderHome();}const p=sessionProgress(),lastDone=latestCompletedSet(),started=fmtDate(ss.startedAt),est=estimateSessionMinutes(ss);
  let c=`<section class="card"><div class="row between"><div><span class="badge green">${esc(ss.workout)} · ${ss.preCycleStepAtStart!==null&&ss.preCycleStepAtStart!==undefined?`PONTE ${Number(ss.preCycleStepAtStart)+1}`:`W${ss.week}`}</span><h1 style="margin:8px 0 2px;font-size:26px">Allenamento</h1><div class="subtle">iniziato ${started}${ss.gymName?` · ${esc(ss.gymName)}`:''}${ss.timeBudgetMin?` · target ${ss.timeBudgetMin} min`:''}</div></div><button class="icon-btn" onclick="setView('home')">×</button></div><div class="session-kpis" style="margin-top:14px"><div class="kpi"><strong id="elapsedTime">00:00</strong><span>tempo</span></div><div class="kpi"><strong>${p.done}/${p.total}</strong><span>blocchi</span></div><div class="kpi"><strong>${p.pct}%</strong><span>completato</span></div></div><div class="progress-shell" style="margin-top:12px"><div class="progress-bar" style="width:${p.pct}%"></div></div>${ss.timeAdapted||ss.readinessAdapted?`<div class="coach-note">Coach: ~${est} min${ss.timeOmitted?.length?` · omessi ${ss.timeOmitted.map(x=>esc(x.name)).join(', ')}`:''}${ss.readinessAdapted?' · volume adattato alla readiness':''}</div>`:''}${lastDone?`<button class="undo-btn" onclick="undoLastCompletedSet()">↶ Annulla ultima serie · ${esc(lastDone.ex.name)}</button>`:''}</section>`;
  ss.exercises.forEach((ex,i)=>{const open=state.ui.openExercise===i,exDone=ex.sets?.length?ex.sets.every(s=>s.done):ex.done,sugg=ex.loadSuggestion||null,prev=lastExerciseData(ex),prevSets=(prev?.sets||[]).filter(s=>s.done),showMetric=state.settings.showRir||!!ex.special,step=loadStepFor(ex);
    c+=`<section class="card exercise-card ${exDone?'done':''} ${open?'current':''}"><div class="exercise-head" onclick="openExercise(${i})"><div><h3>${exDone?'✓ ':''}${esc(ex.name)}</h3><p>${esc(ex.equipment||'')}${ex.gym?` · ${esc(ex.gym)}`:''}${ex.replacement?' · sostituzione':''}</p></div><span class="badge ${exDone?'green':''}">${ex.special?'PANCA':ex.sets?.length?`${ex.sets.filter(s=>s.done).length}/${ex.sets.length}`:'WARM'}</span></div>`;
    if(open){c+=`<div class="exercise-body"><div class="exercise-meta"><span class="meta-pill">Target ${esc(ex.special?benchTargetText(ex.special,ss.week):`${ex.sets?.length||''} × ${ex.reps}`)}</span>${ex.restSec?`<span class="meta-pill">Rec ${fmtTime(ex.restSec)}</span>`:''}${showMetric&&ex.rir&&ex.rir!=='—'?`<span class="meta-pill">RIR ${esc(ex.rir)}</span>`:''}${ex.timeRemovedSets?`<span class="meta-pill">-${ex.timeRemovedSets} set coach</span>`:''}</div>`;
      if(ex.special){const bridgeStep=ss.preCycleStepAtStart!==null&&ss.preCycleStepAtStart!==undefined?(activeProgram().preCycle?.[ss.preCycleStepAtStart]||null):null,benchWeek=bridgeStep&&preCycleAppliesTo(bridgeStep,ex.special)?bridgeStep:(activeProgram().benchPlan?.[ss.week-1]||null),protocolLabel=ex.special==='bench_push'?'Protocollo A':'Protocollo B';c+=`<div class="card flat protocol-card"><b>${esc(protocolLabel)} · ${esc(benchWeek?.phase||'Panca')}</b><div class="subtle">${esc(benchWeek?.note||'')}</div></div>`;}
      if(sugg)c+=`<div class="suggestion-box ${suggestionModeClass(sugg.mode)}"><div class="suggestion-top"><span class="badge">${suggestionModeLabel(sugg.mode)}</span><b>${fmtKg(sugg.recommendedKg)} kg consigliati</b></div><div>${esc(sugg.reason||'Carico derivato dallo storico.')}</div>${sugg.lastSummary?`<small>Ultima: ${esc(sugg.lastSummary)} · confidenza ${esc(sugg.confidence||'bassa')}${Number.isFinite(sugg.trendPct)?` · trend ${sugg.trendPct>=0?'+':''}${sugg.trendPct}%`:''}</small>`:''}</div>`;
      if(prevSets.length)c+=`<div class="previous-box"><div><b>Ultima volta</b><div class="subtle">${prevSets.map(x=>`${x.kg||'—'}×${x.reps||'—'} ${esc(x.metric||'RIR')} ${x.metricValue??'—'}`).join(' · ')}${prev?.effortFeedback?` · ${feedbackLabel(prev.effortFeedback)}`:''}</div></div>${!ex.special&&!Array.isArray(ex.plannedSets)?`<button onclick="copyLastPerformance(${i})">Copia</button>`:''}</div>`;
      if(ex.sets?.length&&warmupEligible(ex))c+=renderWarmupTable(ex,i);
      if(!ex.sets?.length)c+=`<div class="warmup-box"><div><b>${esc(ex.reps)}</b><div class="subtle">${esc(ex.note||'Preparazione')}</div></div><button onclick="completeWarmup(${i})">${ex.done?'Annulla':'Fatto'}</button></div>`;
      else{c+=`<div class="set-table"><div class="set-row header ${showMetric?'':'no-metric'}"><span>Set</span><span>Kg</span><span>Reps</span>${showMetric?`<span>${ex.sets[0]?.metric==='RPE'?'RPE':'RIR'}</span>`:''}<span>OK</span></div>${ex.sets.map((s,si)=>`<div class="set-row ${showMetric?'':'no-metric'}"><span class="set-label">${esc(s.label)}${s.targetRpe?`<small style="display:block">@${s.targetRpe}</small>`:s.targetRange?`<small style="display:block">${esc(s.targetRange)} rep</small>`:''}${s.prFlags?.length?'<small class="pr-tag">PR</small>':''}</span><input class="num-input" inputmode="decimal" type="number" step="any" value="${esc(s.kg)}" oninput="updateSetField(${i},${si},'kg',this.value)"><input class="num-input" inputmode="numeric" type="number" step="1" value="${esc(s.reps)}" oninput="updateSetField(${i},${si},'reps',this.value)">${showMetric?`<select class="metric-select" onchange="updateSetField(${i},${si},'metricValue',this.value)">${s.metric==='RPE'?rpeOptions(s.metricValue):rirOptions(s.metricValue)}</select>`:''}<button class="set-btn ${s.done?'done':''}" onclick="completeSet(${i},${si})">✓</button></div>`).join('')}</div><div class="quick-weight"><button class="step-btn" onclick="adjustActive(${i},'kg',-${step})">−${String(step).replace('.',',')} kg</button><button class="step-btn" onclick="adjustActive(${i},'kg',${step})">+${String(step).replace('.',',')} kg</button><button class="step-btn" onclick="adjustActive(${i},'reps',-1)">−1 rep</button><button class="step-btn" onclick="adjustActive(${i},'reps',1)">+1 rep</button></div>${ex.special?`<div class="bench-speed-list"><b>Velocità percepita</b>${ex.sets.map((bs,bsi)=>`<label><span>${esc(bs.label)}</span><select class="select-input" onchange="updateSetField(${i},${bsi},'barSpeed',this.value)">${benchSpeedOptions(bs.barSpeed||'')}</select></label>`).join('')}</div>`:''}${ex.sets?.length?`<div class="series-actions"><button onclick="addSessionSet(${i})">+ ${ex.special||Array.isArray(ex.plannedSets)?'Serie extra':'Serie'}</button><button onclick="removeSessionSet(${i})">− Serie</button></div>`:''}`;}
      c+=renderFeedback(ex,i);if(ex.note)c+=`<p class="subtle" style="margin:10px 0 0">${esc(ex.note)}</p>`;c+=`<textarea class="notes-input" placeholder="Note rapide…" oninput="setExerciseNote(${i},this.value)">${esc(ex.notes||'')}</textarea><div class="mini-actions ${ex.unplanned?'three':''}"><button onclick="showSubstitutions(${i})">↔ Swap smart</button><button onclick="startTimer(${ex.restSec||90},decodeURIComponent('${encodedArg(ex.name)}'))">⏱ Timer</button>${ex.unplanned?`<button class="danger-mini" onclick="removeSessionExercise(${i})">Rimuovi</button>`:''}</div></div>`;}
    c+='</section>';});
  c+=`<section class="card add-exercise-card"><button class="primary-btn" onclick="showAddExerciseToSession()">+ Aggiungi esercizio alla sessione</button><p class="subtle" style="margin:8px 0 0">Gli esercizi aggiunti conservano storico e profilo macchina.</p></section>`;
  c+=`<section class="card"><div class="section-title summary-title"><h2>Riepilogo sessione</h2><span>opzionale</span></div><div class="session-summary-grid"><label><span>Peso corporeo</span><div class="input-suffix"><input class="text-input" inputmode="decimal" type="number" step="0.1" value="${esc(ss.bodyweightKg??'')}" oninput="updateSessionMeta('bodyweightKg',this.value)" placeholder="—"><i>kg</i></div></label><label><span>RPE sessione</span><select class="select-input" onchange="updateSessionMeta('sessionRpe',this.value)"><option value="">—</option>${[1,2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${Number(ss.sessionRpe)===v?'selected':''}>${v}</option>`).join('')}</select></label></div><textarea class="notes-input" placeholder="Note generali: energie, sonno, fastidi, tecnica…" oninput="updateSessionMeta('notes',this.value)">${esc(ss.notes||'')}</textarea></section>`;
  c+=`<section class="card"><button class="primary-btn" onclick="finishWorkout()">Termina e salva allenamento</button><button class="danger-btn" style="margin-top:8px" onclick="discardWorkout()">Scarta sessione</button></section>`;return shell(c,ss.workout,`settimana ${ss.week}${ss.gymName?` · ${ss.gymName}`:''} · Adaptive Coach`);
};

const v8RenderProgress=renderProgress;
renderProgress=function(){let html=v8RenderProgress();const name=state.ui.progressExercise;if(!name||name===BENCH_GLOBAL_NAME)return html;const target=findProgramExercise(name)||catalogEntries().find(p=>p.name===name)||{name,exerciseId:slugId(name)},st=detailedExerciseStats(target),last=st.last?.sets?.[0];const extra=`<section class="card"><div class="row between"><div><h2 style="margin:0">Analisi esercizio</h2><div class="subtle">Smart Load 6 · storico ${st.records} sedute</div></div><span class="badge ${st.plateau?'warn':'green'}">${st.plateau?'STABILE':'TREND'}</span></div><div class="stat-grid"><div class="stat-card"><strong>${st.totalSets}</strong><span>serie totali</span></div><div class="stat-card"><strong>${st.totalReps}</strong><span>reps totali</span></div><div class="stat-card"><strong>${st.prCount}</strong><span>PR marcati</span></div><div class="stat-card"><strong>${st.feedback?feedbackLabel(st.feedback):'—'}</strong><span>ultimo feedback</span></div></div><div class="coach-note">${st.plateau?'Prestazioni molto simili nelle ultime 3 sedute. Smart Load evita aumenti automatici non supportati dai dati.':`Trend recente ${st.trend>=0?'+':''}${st.trend.toFixed(1)}%.`}${last?` Ultimo riferimento: ${fmtKg(last.kg)}×${last.reps}.`:''}</div></section>`;return html.replace('</main>',`${extra}</main>`);};

const v8ShowExerciseProfile=showExerciseProfile;
showExerciseProfile=function(id){const p=catalogEntry(id);if(!p)return;const st=exerciseReferenceStats(p),d=detailedExerciseStats(p),best=st.best,latest=st.latest;showModal(`<h2>${esc(profileDisplayName(p))}</h2><p class="subtle">${esc(p.equipment||'Attrezzatura non specificata')} · ${esc(loadModeLabel(p.loadMode||inferLoadMode(p)))}</p><div class="bench-dashboard"><div><span>Ultimo riferimento</span><strong>${latest?`${fmtKg(latest.kg)} × ${latest.reps}`:'—'}</strong></div><div><span>Miglior e1RM</span><strong>${st.bestE1rm?`${fmtKg(st.bestE1rm)} ${esc(loadUnitLabel(p))}`:isLowerHarder(p)?'n/a':'—'}</strong></div><div><span>Step</span><strong>${fmtKg(loadStepFor(p))} ${esc(loadUnitLabel(p))}</strong></div><div><span>Movimento</span><strong>${esc(p.movementId||'—')}</strong></div><div><span>Serie registrate</span><strong>${d.totalSets}</strong></div><div><span>Trend recente</span><strong>${d.records>1?`${d.trend>=0?'+':''}${d.trend.toFixed(1)}%`:'—'}</strong></div></div>${p.notes?`<div class="coach-note"><b>Setup:</b> ${esc(p.notes)}</div>`:''}${st.manual?`<div class="history-suggestion">Riferimento manuale: <b>${fmtKg(st.manual.kg)} × ${st.manual.reps}</b></div>`:''}<div class="action-stack"><button class="primary-btn" onclick="showTransformerForExercise(decodeURIComponent('${encodedArg(id)}'))">Apri trasformatore</button><button class="secondary-btn" onclick="showCatalogEditor(decodeURIComponent('${encodedArg(id)}'))">Modifica / registra carico</button></div><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Chiudi</button>`);};

const v8RenderSettings=renderSettings;
renderSettings=function(){let html=v8RenderSettings();const card=`<section class="card"><h2 style="margin-top:0">Adaptive Coach v9</h2>${settingToggle('autoWarmup','Warm-up automatico','Genera serie di avvicinamento separate dal volume allenante.')}${settingToggle('adaptiveTime','Adatta alla durata','Riduce prima le serie/accessori meno prioritari.')}${settingToggle('adaptiveReadiness','Usa readiness','Se compili il check-in, modula leggermente accessori e volume.')}${settingToggle('muscleRecovery','Recupero muscolare','Mostra indicatore euristico di recupero e volume per gruppo.')}${settingToggle('effortFeedback','Feedback esercizio','Usa Facile/Giusto/Pesante come segnale aggiuntivo per Smart Load 6.')}</section>`;return html.replace('</main>',`${card}</main>`);};

// estende etichette suggerimenti
const v8SuggestionModeLabel=suggestionModeLabel;suggestionModeLabel=function(mode){if(mode==='readiness')return'READINESS';return v8SuggestionModeLabel(mode);};
const v8SuggestionModeClass=suggestionModeClass;suggestionModeClass=function(mode){if(mode==='readiness')return'recalc';return v8SuggestionModeClass(mode);};

// backup/portable sono già stateful: aggiorna solo identificazione motore nel pacchetto
const v8ExportPortableProgram=exportPortableProgram;
exportPortableProgram=function(){
  ensureV9State();const payload={type:'gym-tracker-program-package',schemaVersion:6,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),currentWeek:state.currentWeek,preCycleStep:state.preCycleStep,program:clone(activeProgram()),history:clone(state.history),progression:{engine:V9_ENGINE,benchAutoregulation:'rpe-guard-v1',historyDriven:true,exerciseIdentity:'program-slot-plus-machine-profile-plus-gym',features:['gym-profiles','feedback','warmup','readiness','time-adaptation','muscle-recovery']},exerciseSettings:clone(state.exerciseSettings||{}),exerciseCatalog:clone(state.exerciseCatalog||{}),gymProfiles:clone(state.gymProfiles||[]),activeGymId:state.activeGymId||'',weekStartedAt:state.weekStartedAt,readiness:clone(state.readiness||{}),settings:clone(state.settings||{})};downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`gym-tracker-v9-pacchetto-${new Date().toISOString().slice(0,10)}.json`);
};

ensureV9State();saveState();render();
