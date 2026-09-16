/* Gym Tracker v7.2 - Exercise Memory, Load Transformer, Smart Load 4, local-first */
/* APP_VERSION arriva da version.js, caricato prima di questo file */
const STORAGE_KEY = 'gym_tracker_ppl_upper_lower_v1';
const $ = (sel) => document.querySelector(sel);
const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

const defaultState = {
  version: APP_VERSION,
  currentWeek: 1,
  preCycleStep: 0,
  activeProgram: null,
  programLibrary: [],
  history: [],
  currentSession: null,
  timer: null,
  ui: { view:'home', openExercise:0, progressExercise:'Panca piana – Protocollo A', progressMetric:'e1rm', historyWorkout:'ALL', historyQuery:'', catalogQuery:'', transformer:{exerciseId:'',kg:'',reps:5,rir:0,targetReps:8,targetRir:2,step:''} },
  settings: { autoTimer:true, vibrate:true, wakeLock:false, showRir:true, smartLoad:true },
  exerciseSettings: {},
  exerciseCatalog: {},
  weekStartedAt: null,
  pendingWeekAdvance: null,
  cycleCompletedAt: null
};

let state = loadState();
let deferredInstallPrompt = null;
let wakeLock = null;
let timerFinishedHandled = false;

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      const fresh=clone(defaultState);
      fresh.history=typeof INITIAL_HISTORY!=='undefined' && Array.isArray(INITIAL_HISTORY)?clone(INITIAL_HISTORY):[];
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const oldVersion=Number(parsed.version)||0;
    if(!parsed.version || parsed.version < 2){ parsed.currentWeek = 3; }
    if(parsed.program && !parsed.activeProgram){
      if(oldVersion<7&&parsed.program?.workouts){const legacy={id:String(parsed.program.libraryId||`legacy-${oldVersion||'v4'}`),title:`Scheda precedente v${oldVersion||4}`,savedAt:new Date().toISOString(),program:clone(parsed.program)};parsed.programLibrary=Array.isArray(parsed.programLibrary)?parsed.programLibrary:[];if(!parsed.programLibrary.some(x=>x?.id===legacy.id))parsed.programLibrary.unshift(legacy);parsed.activeProgram=null;}
      else parsed.activeProgram=parsed.program;
    }
    if(oldVersion < 7 && !parsed.activeProgram){ parsed.currentWeek=1; parsed.preCycleStep=0; }
    parsed.version=APP_VERSION;
    const history=Array.isArray(parsed.history)?parsed.history:[];
    history.sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0));
    return {
      ...clone(defaultState), ...parsed,
      version:APP_VERSION,
      ui:{...defaultState.ui,...(parsed.ui||{})},
      settings:{...defaultState.settings,...(parsed.settings||{})},
      exerciseSettings:{...(parsed.exerciseSettings||{})},
      exerciseCatalog:{...(parsed.exerciseCatalog||{})},
      pendingWeekAdvance:parsed.pendingWeekAdvance||null,
      weekStartedAt:parsed.weekStartedAt||(oldVersion<7.1?new Date().toISOString():null),
      cycleCompletedAt:parsed.cycleCompletedAt||null,
      activeProgram: parsed.activeProgram && parsed.activeProgram.workouts ? parsed.activeProgram : null,
      programLibrary:Array.isArray(parsed.programLibrary)?parsed.programLibrary.filter(x=>x&&x.program?.workouts):[],
      history
    };
  }catch(e){
    const fresh=clone(defaultState);
    fresh.history=typeof INITIAL_HISTORY!=='undefined' && Array.isArray(INITIAL_HISTORY)?clone(INITIAL_HISTORY):[];
    return fresh;
  }
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn(e); }
}
function setView(view){ state.ui.view=view; saveState(); render(); window.scrollTo({top:0,behavior:'instant'}); }
function toast(msg){
  const el=$('#toast'); if(!el) return; el.textContent=msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove('show'),2200);
}
function fmtTime(sec){ sec=Math.max(0,Math.round(sec)); return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function fmtDate(iso){
  try{return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}
  catch{return iso;}
}
function fmtDateShort(iso){
  try{return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit'}).format(new Date(iso));}catch{return '';}
}
function fmtKg(v){ const n=Number(v); return Number.isFinite(n)?new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(n):'—'; }
function dayKey(value){ const d=value instanceof Date?value:new Date(value); if(Number.isNaN(d.getTime()))return''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function startOfDay(value=new Date()){ const d=new Date(value); d.setHours(0,0,0,0); return d; }
function weekStart(value=new Date()){ const d=startOfDay(value), day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d; }
function rangeStats(days=7){
  const from=startOfDay(); from.setDate(from.getDate()-(days-1));
  const sessions=state.history.filter(s=>new Date(s.startedAt)>=from); let sets=0,volume=0,duration=0;
  sessions.forEach(sess=>{duration+=Number(sess.durationMin)||0;volume+=Number(sess.volume)||totalSessionVolume(sess);(sess.exercises||[]).forEach(ex=>sets+=(ex.sets||[]).filter(x=>x.done).length);});
  return {sessions:sessions.length,sets,volume:Math.round(volume),duration};
}
function trainingWeekStreak(){
  if(!state.history.length)return 0;const weeks=new Set(state.history.map(s=>dayKey(weekStart(new Date(s.startedAt)))));const newest=[...weeks].sort().pop();if(!newest)return 0;
  let cursor=new Date(`${newest}T12:00:00`),streak=0;while(weeks.has(dayKey(cursor))){streak++;cursor.setDate(cursor.getDate()-7);}return streak;
}
function recentCalendar(days=28){
  const counts={};state.history.forEach(s=>{const k=dayKey(s.startedAt);counts[k]=(counts[k]||0)+1;});const out=[],today=startOfDay();for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);out.push({key:dayKey(d),date:d,count:counts[dayKey(d)]||0});}return out;
}
function lastWorkoutSession(name){ return state.history.find(s=>s.workout===name)||null; }
function latestCompletedSet(){
  const ss=state.currentSession;if(!ss)return null;let hit=null;(ss.exercises||[]).forEach((ex,exi)=>(ex.sets||[]).forEach((set,si)=>{if(!set.done||!set.completedAt)return;if(!hit||new Date(set.completedAt)>new Date(hit.set.completedAt))hit={ex,exi,set,si};}));return hit;
}
function parseMinRep(range){ const m=String(range).match(/\d+/); return m?Number(m[0]):0; }
function parseMaxRep(range){ const a=String(range).match(/\d+/g); return a?a.map(Number).pop():0; }
function defaultRir(rir){ const m=String(rir).match(/\d+(?:[.,]\d+)?/); return m?Number(m[0].replace(',','.')):2; }
function rpeOptions(target=''){ const vals=[6,6.5,7,7.5,8,8.5,9,9.5,10], n=Number(String(target).replace(',','.')); return vals.map(v=>`<option ${Number.isFinite(n)&&Math.abs(n-v)<.01?'selected':''}>${v}</option>`).join(''); }
function rirOptions(target=2){ return [0,0.5,1,1.5,2,2.5,3,4,5].map(v=>`<option ${Number(target)===v?'selected':''}>${v}</option>`).join(''); }
function benchSpeedOptions(target=''){ const vals=[['','—'],['fast','Veloce'],['smooth','Fluida'],['slow','Lenta'],['grinder','Grinder']]; return vals.map(([v,l])=>`<option value="${v}" ${String(target)===v?'selected':''}>${l}</option>`).join(''); }
function benchSpeedLabel(v){ return ({fast:'Veloce',smooth:'Fluida',slow:'Lenta',grinder:'Grinder'})[v]||'—'; }
function benchSpeedScore(v){ return ({fast:4,smooth:3,slow:2,grinder:1})[v]||0; }
function encodedArg(v){ return encodeURIComponent(String(v??'')); }
function cleanKey(v=''){ return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function slugId(v=''){ return cleanKey(v).replace(/\s+/g,'-')||'exercise'; }
function inferMovementId(name=''){
  const n=cleanKey(name);
  if(/panca|bench/.test(n))return'bench-press';
  if(/trazioni|lat machine|pulldown/.test(n))return'vertical-pull';
  if(/row|pulley|t bar/.test(n))return'horizontal-pull';
  if(/pec fly|croci/.test(n))return'chest-fly';
  if(/shoulder press|distensioni.*testa/.test(n))return'overhead-press';
  if(/alzate laterali/.test(n))return'lateral-raise';
  if(/reverse pec|croci inverse/.test(n))return'rear-delt';
  if(/curl/.test(n))return'biceps-curl';
  if(/pushdown|tricipiti|estensione.*overhead/.test(n))return'triceps-extension';
  if(/squat|pressa|belt/.test(n))return'knee-dominant';
  if(/leg extension/.test(n))return'knee-extension';
  if(/leg curl/.test(n))return'knee-flexion';
  if(/hip thrust/.test(n))return'hip-thrust';
  if(/romanian|stacco/.test(n))return'hip-hinge';
  if(/calf/.test(n))return'calf-raise';
  return slugId(name);
}
function effectiveExerciseId(ex){ if(typeof ex==='string')return slugId(ex); return String(ex?.exerciseId||slugId(ex?.name||ex?.historyKey||'exercise')); }
function effectiveMovementId(ex){ if(typeof ex==='string')return inferMovementId(ex); return String(ex?.movementId||inferMovementId(ex?.name||ex?.historyKey||'')); }
function inferLoadDirection(ex){ const n=cleanKey(typeof ex==='string'?ex:`${ex?.name||''}`); return /assist/.test(n)?'lower-is-harder':'higher-is-harder'; }
function ensureExerciseIdentity(ex){ if(!ex||typeof ex!=='object')return ex; ex.exerciseId=effectiveExerciseId(ex); ex.movementId=effectiveMovementId(ex); if(!ex.loadDirection)ex.loadDirection=inferLoadDirection(ex); return ex; }
function inferLoadMode(ex){
  const n=cleanKey(`${ex?.name||''} ${ex?.equipment||''}`);
  if(isLowerHarder(ex))return'assistance';
  if(/manubr|dumbbell/.test(n))return'per-hand';
  return'total';
}
function loadModeLabel(mode){return mode==='per-hand'?'per manubrio':mode==='assistance'?'assistenza':'totale';}
function loadUnitLabel(ex){const mode=ex?.loadMode||state.exerciseCatalog?.[effectiveExerciseId(ex)]?.loadMode||inferLoadMode(ex);return mode==='per-hand'?'kg/manubrio':mode==='assistance'?'kg assist.':'kg';}
function referenceRir(ref){
  if(!ref)return 0; const raw=ref.rir;
  if(raw!==''&&raw!==undefined&&raw!==null&&Number.isFinite(Number(raw)))return Math.max(0,Number(raw));
  if(ref.rpe!==''&&ref.rpe!==undefined&&ref.rpe!==null&&Number.isFinite(Number(ref.rpe)))return Math.max(0,10-Number(ref.rpe));
  return 0;
}
function estimateE1RM(kg,reps,rir=0){
  kg=Number(kg);reps=Number(reps);rir=Number(rir)||0;
  if(!(kg>0&&reps>0))return 0;const effective=reps+Math.max(0,rir);if(effective>15)return 0;
  return kg*(1+effective/30);
}
function targetLoadFromE1RM(e1rm,targetReps,targetRir=2,step=2.5){
  e1rm=Number(e1rm);targetReps=Number(targetReps);targetRir=Number(targetRir)||0;step=Number(step)||2.5;
  if(!(e1rm>0&&targetReps>0))return 0;const raw=e1rm/(1+(targetReps+Math.max(0,targetRir))/30);
  return Math.max(0,Math.round((Math.round(raw/step)*step)*100)/100);
}
function makeCatalogId(name,gym='',equipment=''){
  const base=slugId(name),suffix=slugId([gym,equipment].filter(Boolean).join(' '));
  return suffix&&suffix!==base?`${base}-${suffix}`:base;
}
function isTrackableExercise(ex){return !!ex&&!ex.special&&(Number(ex.sets)>0||(ex.sets||[]).some?.(s=>Number(s.kg)>0));}
function upsertCatalogExercise(ex,source='auto'){
  if(!ex||ex.special)return null;ensureExerciseIdentity(ex);state.exerciseCatalog=state.exerciseCatalog||{};
  const id=effectiveExerciseId(ex),old=state.exerciseCatalog[id]||{},manual=!!old.userEdited,entry={...old,id,name:String(manual?old.name:(ex.name||old.name||id)),movementId:manual?(old.movementId||effectiveMovementId(ex)):effectiveMovementId(ex),equipment:String(manual?old.equipment:(ex.equipment??old.equipment??'')),gym:String(manual?old.gym:(ex.gym??old.gym??'')),loadDirection:manual?(old.loadDirection||inferLoadDirection(ex)):(ex.loadDirection||old.loadDirection||inferLoadDirection(ex)),loadMode:manual?(old.loadMode||inferLoadMode(ex)):(ex.loadMode||old.loadMode||inferLoadMode(ex)),notes:String(old.notes||''),source:old.source||source,createdAt:old.createdAt||new Date().toISOString(),updatedAt:old.updatedAt||new Date().toISOString()};
  if(Number(ex.loadStepKg)>0&&!Number(old.loadStepKg))entry.loadStepKg=Number(ex.loadStepKg);
  state.exerciseCatalog[id]=entry;return entry;
}
function syncExerciseCatalogFromKnownData(){
  state.exerciseCatalog=state.exerciseCatalog||{};const visitProgram=p=>{for(const w of Object.values(p?.workouts||{}))for(const raw of w.exercises||[]){const ex=ensureExerciseIdentity(raw);if(isTrackableExercise(ex))upsertCatalogExercise(ex,'program');}};
  visitProgram(DEFAULT_PROGRAM);visitProgram(state.activeProgram);for(const item of state.programLibrary||[])visitProgram(item?.program);
  for(const sess of state.history||[])for(const ex of sess.exercises||[])if((ex.sets||[]).some(st=>st.done&&Number(st.kg)>0))upsertCatalogExercise(ex,'history');
  if(state.currentSession)for(const ex of state.currentSession.exercises||[])if(!ex.special)upsertCatalogExercise(ex,'session');
}
function seedPersonalReferences(){
  if(state.seedHistoryDisabled)return;
  const id='belt-squat';const entry=state.exerciseCatalog?.[id];if(entry&&!entry.reference){entry.reference={kg:200,reps:6,rir:'',metric:'RIR',source:'manual-seed',updatedAt:new Date().toISOString(),note:'RIR non indicato: e1RM prudente'};entry.updatedAt=new Date().toISOString();}
}
function catalogEntry(id){return state.exerciseCatalog?.[String(id)]||null;}
function catalogEntries(){syncExerciseCatalogFromKnownData();return Object.values(state.exerciseCatalog||{}).filter(x=>x&&x.name).sort((a,b)=>`${a.name} ${a.gym||''}`.localeCompare(`${b.name} ${b.gym||''}`,'it'));}
function exactHistorySets(target){
  const out=[];for(const sess of state.history||[])for(const ex of sess.exercises||[]){if(!historyExerciseMatches(ex,target))continue;for(const st of ex.sets||[])if(st.done&&Number(st.kg)>0&&Number(st.reps)>0)out.push({set:st,exercise:ex,session:sess});}return out;
}
function exerciseReferenceStats(target){
  const ex=typeof target==='string'?(catalogEntry(target)||findProgramExercise(target)||{name:target,exerciseId:target}):target;if(!ex)return{best:null,latest:null,manual:null,bestE1rm:0};
  const entry=catalogEntry(effectiveExerciseId(ex)),manual=entry?.reference&&Number(entry.reference.kg)>0&&Number(entry.reference.reps)>0?{...entry.reference,rawRir:entry.reference.rir,rir:referenceRir(entry.reference),manual:true,date:entry.reference.updatedAt||entry.updatedAt}:null;
  const rows=exactHistorySets(ex).map(x=>({kg:Number(x.set.kg),reps:Number(x.set.reps),rir:rirEquivalent(x.set)??0,date:x.session.startedAt,manual:false,set:x.set}));
  const latest=[...rows,...(manual?[manual]:[])].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0]||null;if(isLowerHarder(ex))return{best:latest,latest,manual,bestE1rm:0};
  const candidates=[...rows,...(manual?[manual]:[])].map(r=>({...r,e1rm:estimateE1RM(r.kg,r.reps,r.rir)})).filter(r=>r.e1rm>0);const best=candidates.sort((a,b)=>b.e1rm-a.e1rm)[0]||latest;
  return{best,latest,manual,bestE1rm:Number(best?.e1rm)||0};
}
function manualReferenceFor(ex){return catalogEntry(effectiveExerciseId(ex))?.reference||null;}
function profileDisplayName(entry){return `${entry?.name||'Esercizio'}${entry?.gym?` · ${entry.gym}`:''}`;}
function isLowerHarder(ex){ return (ex?.loadDirection||inferLoadDirection(ex))==='lower-is-harder'; }
function isMaxTechnical(ex){ return /max\s*tecnico/i.test(String(ex?.reps||'')); }
function repRangeForSet(ex,index=0){
  const configured=ex?.progression?.sets;
  if(Array.isArray(configured)&&configured.length){ const c=configured[Math.min(index,configured.length-1)]||{}; const min=Number(c.minReps??c.min),max=Number(c.maxReps??c.max); if(min>0||max>0)return{min:min||max,max:max||min,label:`${min||max}-${max||min}`}; }
  const raw=String(ex?.reps||'');
  if(isMaxTechnical(ex))return{min:0,max:0,label:'MAX tecnico',maxTechnical:true};
  const parts=raw.split('/').map(x=>x.trim()).filter(Boolean), splitTargets=parts.length>1&&parts.every(x=>/\d/.test(x)), part=splitTargets?parts[Math.min(index,parts.length-1)]:raw;
  const nums=part.match(/\d+(?:[.,]\d+)?/g)?.map(x=>Number(x.replace(',','.')))||[];
  if(!nums.length)return{min:0,max:0,label:raw||'—'};
  const min=nums[0],max=nums.length>1?nums[nums.length-1]:nums[0];
  return{min,max,label:min===max?String(min):`${min}-${max}`};
}
function activeProgram(){ return state.activeProgram?.workouts ? state.activeProgram : DEFAULT_PROGRAM; }
function programWeekCount(){ const p=activeProgram(); const n=Number(p.weeks)||p.benchPlan?.length||1; return clamp(Math.round(n)||1,1,52); }
function programSplit(){ const p=activeProgram(); const keys=Object.keys(p.workouts||{}); const order=Array.isArray(p.splitOrder)?p.splitOrder.filter(x=>p.workouts?.[x]):[]; return order.length?order:keys; }
function programTitle(){ const p=activeProgram(); return p.title||p.name||(!state.activeProgram?'Panca forza + PPL 2 set':'Gym Tracker'); }
function programSubtitle(){ const p=activeProgram(); return p.subtitle||p.description||(!state.activeProgram?'PPL + Upper / Lower con panca forza':'programma attuale'); }
function currentBenchPlan(){ const p=activeProgram(); return Array.isArray(p.benchPlan)?p.benchPlan[state.currentWeek-1]:null; }
function currentAdaptation(){ const p=activeProgram(); return Array.isArray(p.adaptations)?p.adaptations[state.currentWeek-1]:null; }
function currentPreCycleStep(){
  const p=activeProgram(), steps=Array.isArray(p.preCycle)?p.preCycle:[];
  const i=clamp(Number(state.preCycleStep)||0,0,steps.length);
  return i<steps.length?steps[i]:null;
}
function preCycleCount(){ const steps=activeProgram().preCycle; return Array.isArray(steps)?steps.length:0; }
function benchProtocolInfo(week=state.currentWeek){ return currentPreCycleStep()||activeProgram().benchPlan?.[week-1]||null; }
function usesLegacyWeekAdaptations(){ return activeProgram().legacyWeekAdaptations===true; }

function normalizeExercise(raw,index=0){
  if(!raw || typeof raw!=='object') throw new Error('Esercizio non valido');
  const name=String(raw.name||'').trim(); if(!name) throw new Error(`Esercizio ${index+1}: nome mancante`);
  let plannedSets=Array.isArray(raw.plannedSets)?raw.plannedSets:null;
  let setCount=raw.sets;
  if(Array.isArray(setCount)){ plannedSets=setCount; setCount=setCount.length; }
  setCount=Number(setCount); if(!Number.isFinite(setCount)||setCount<0) setCount=0;
  const ex={
    ...clone(raw), name,
    historyKey:String(raw.historyKey||raw.baseName||name).trim(),
    exerciseId:String(raw.exerciseId||slugId(name)), movementId:String(raw.movementId||inferMovementId(name)),
    aliases:Array.isArray(raw.aliases)?raw.aliases.map(String).filter(Boolean):[],
    equipment:String(raw.equipment||''), sets:Math.round(setCount), reps:String(raw.reps??''), rir:String(raw.rir??'1'),
    restSec:Math.max(0,Number(raw.restSec)||0), alternative:String(raw.alternative??''), note:String(raw.note??''),
    fixedMin:Math.max(0,Number(raw.fixedMin)||0), estimatedMin:Math.max(0,Number(raw.estimatedMin)||0),
    special:raw.special||null, autoLoad:raw.autoLoad!==false,
    loadDirection:raw.loadDirection||inferLoadDirection(name),
    progression:raw.progression&&typeof raw.progression==='object'?clone(raw.progression):{}
  };
  if(raw.initialKg!==undefined && raw.initialKg!==null && raw.initialKg!=='') ex.initialKg=Number(raw.initialKg);
  if(raw.loadStepKg!==undefined && Number(raw.loadStepKg)>0) ex.loadStepKg=Number(raw.loadStepKg);
  if(plannedSets){
    ex.plannedSets=plannedSets.map((x,i)=>Array.isArray(x)?{label:String(x[0]??i+1),kg:Number(x[1])||0,reps:Number(x[2])||0}:{...x,label:String(x.label??i+1)});
    ex.sets=ex.plannedSets.length;
  }
  return ex;
}
function normalizeProgram(raw){
  const src=raw?.program||raw?.activeProgram||raw;
  if(!src || typeof src!=='object' || !src.workouts || typeof src.workouts!=='object') throw new Error('Scheda senza workouts');
  const workouts={};
  for(const [key,val] of Object.entries(src.workouts)){
    if(!val || !Array.isArray(val.exercises)) continue;
    const name=String(val.name||key).trim()||String(key);
    workouts[String(key)]={...clone(val),name,exercises:val.exercises.map(normalizeExercise)};
  }
  if(!Object.keys(workouts).length) throw new Error('Nessun workout valido');
  const prior=activeProgram();
  const split=Array.isArray(src.splitOrder)?src.splitOrder.map(String).filter(k=>workouts[k]):Object.keys(workouts);
  const out={...clone(src),schemaVersion:1,libraryId:String(src.libraryId||src.id||uid()),title:String(src.title||src.name||'Scheda importata'),subtitle:String(src.subtitle||src.description||''),weeks:clamp(Number(src.weeks)||src.benchPlan?.length||1,1,52),workouts,splitOrder:split.length?split:Object.keys(workouts)};
  if(!Array.isArray(out.equipment)) out.equipment=clone(prior.equipment||DEFAULT_PROGRAM.equipment||[]);
  out.importedAt=new Date().toISOString();
  return out;
}
function exerciseKeys(ex){
  if(typeof ex==='string') return [cleanKey(ex)].filter(Boolean);
  const vals=[ex?.historyKey,ex?.baseName,ex?.name,...(Array.isArray(ex?.aliases)?ex.aliases:[])];
  return [...new Set(vals.map(cleanKey).filter(Boolean))];
}
function historyExerciseMatches(histEx,target){
  if(!histEx||!target)return false;
  const ha=histEx?.exerciseId?String(histEx.exerciseId):'', ta=typeof target==='object'&&target?.exerciseId?String(target.exerciseId):'';
  if(ha&&ta)return ha===ta;
  const a=new Set(exerciseKeys(target)); if(!a.size) return false;
  return exerciseKeys(histEx).some(k=>a.has(k));
}
function movementExerciseMatches(histEx,target){ return effectiveMovementId(histEx)===effectiveMovementId(target); }
function findProgramExercise(name){
  for(const w of Object.values(activeProgram().workouts||{})) for(const raw of w.exercises||[]){ const ex=ensureExerciseIdentity(raw); if(ex.name===name || ex.historyKey===name || ex.exerciseId===name) return ex; }
  return null;
}

function getAdjustedWorkout(name, week=state.currentWeek){
  const src=activeProgram().workouts?.[name];
  if(!src) return {name,exercises:[],estimatedMin:0};
  const base=clone(src);
  base.exercises.forEach(ex=>{
    ensureExerciseIdentity(ex);
    ex.baseName=ex.historyKey||ex.baseName||ex.name;
    if(usesLegacyWeekAdaptations() && !ex.special && ex.sets>0){
      if(week===4){
        if(['PUSH','UPPER'].includes(name) && /Incline chest press|Shoulder press|Pushdown tricipiti|Estensione tricipiti overhead/.test(ex.name)) ex.sets=1;
        ex.rir=['PUSH','UPPER'].includes(name)?'3':'2–3';
      }
      if(week===7 && ['PUSH','UPPER'].includes(name)){
        if(/Incline chest press|Shoulder press|Pushdown tricipiti|Estensione tricipiti overhead/.test(ex.name)) ex.sets=1;
        ex.rir='2';
      }
      if(week===8){
        if(['PUSH','UPPER'].includes(name) && /Incline chest press|Shoulder press|Pushdown tricipiti|Estensione tricipiti overhead/.test(ex.name)) ex.sets=1;
        ex.rir=['PUSH','UPPER'].includes(name)?'3':'2–3';
      }
      if(week===9 && ['PUSH','UPPER'].includes(name)){
        if(name==='PUSH') ex.sets=Math.min(ex.sets,1);
        ex.rir=name==='PUSH'?'3–4':'2–3';
      }
    }
  });
  base.exercises=base.exercises.filter(ex=>!ex.special||getBenchSets(ex.special,week).length>0);
  base.estimatedMin = estimateWorkout(base,week);
  return base;
}
function estimateWorkout(workout,week){
  let total=0;
  workout.exercises.forEach(ex=>{
    if(ex.special){
      const sets=getBenchSets(ex.special,week);
      if(!sets.length)return;
      const rest=Number(sets[0]?.restSec)||240;
      total += 4 + sets.length*.75 + Math.max(0,sets.length-1)*rest/60;
    }else if(ex.fixedMin) total+=Number(ex.fixedMin);
    else total += ((ex.sets||0)*40 + Math.max(0,(ex.sets||0)-1)*(ex.restSec||0) + 60)/60;
  });
  return Math.round(total*10)/10;
}

function getBenchSets(type,week){
  const p=activeProgram(), pre=currentPreCycleStep();
  let arr=[],rest=0;
  if(pre){ arr=pre.sets||[]; rest=Number(pre.restSec)||240; }
  else{
    const b=p.benchStructured?.[String(week)]||p.benchStructured?.[week];
    if(!b) return [];
    arr=type==='bench_push'?b.push:b.upper; rest=type==='bench_push'?b.pushRest:b.upperRest;
  }
  return (arr||[]).map((item,i)=>{
    const label=Array.isArray(item)?item[0]:item.label, kg=Array.isArray(item)?item[1]:item.kg, reps=Array.isArray(item)?item[2]:item.reps;
    const targetRpe=Number(Array.isArray(item)?item[3]:item.targetRpe)||benchRpeDefault(week);
    return {label:String(label??i+1),kg,recommendedKg:kg,reps,metric:'RPE',metricValue:targetRpe,targetRpe,done:false,restSec:rest,target:true};
  });
}
function benchRpeDefault(week){ const p=benchProtocolInfo(week); const nums=String(p?.rpe||'8').match(/\d+(?:[.,]\d+)?/g); return nums?Number(nums[0].replace(',','.')):8; }
function maybeAutoregulateBench(ex,si){
  if(!ex?.special||!ex.sets?.[si]?.done)return;
  const set=ex.sets[si], label=String(set.label||'');
  if(!/top|singola/i.test(label))return;
  const actual=Number(set.metricValue), target=Number(set.targetRpe);
  if(!Number.isFinite(actual)||!Number.isFinite(target))return;
  const backoffs=ex.sets.slice(si+1).filter(x=>!x.done&&/back-off/i.test(String(x.label||'')));
  if(!backoffs.length){
    if(actual<=target-1)toast('Singola molto facile: mantieni il piano e usa il dato per la prossima settimana');
    return;
  }
  let drop=0;
  if(actual>=9.5||actual>=target+1.5)drop=5;
  else if(actual>=target+0.5)drop=2.5;
  if(drop){
    backoffs.forEach(x=>{x.autoregulatedFromKg=x.kg;x.kg=Math.max(0,Math.round((Number(x.kg)-drop)*10)/10);x.autoregulationReason=`Top set RPE ${actual} vs target ${target}`;});
    toast(`RPE alto: back-off ridotti di ${String(drop).replace('.',',')} kg`);
  }else if(actual<=target-1){
    toast('Singola molto facile: mantieni i back-off, non serve forzare oggi');
  }
}
function plannedSetsFor(ex){
  if(!Array.isArray(ex.plannedSets)) return [];
  return ex.plannedSets.map((s,i)=>({label:String(s.label??i+1),kg:s.kg??'',reps:(s.reps??parseMinRep(ex.reps))||'',metric:String(s.metric||'RIR').toUpperCase()==='RPE'?'RPE':'RIR',metricValue:s.metricValue??defaultRir(ex.rir),done:false,restSec:Number(s.restSec??ex.restSec)||0,target:true}));
}
function lastCompletedSession(){ return state.history[0]||null; }
function nextWorkoutName(){
  const split=programSplit(); if(!split.length) return '';
  const last=lastCompletedSession(); if(!last) return split[0];
  const idx=split.indexOf(last.workout); return split[(idx+1+split.length)%split.length]||split[0];
}
function lastExerciseData(target){
  for(const sess of state.history){
    const ex=sess.exercises?.find(e=>historyExerciseMatches(e,target));
    if(ex) return ex;
  }
  return null;
}
function exerciseHistory(target,limit=8){
  const out=[];
  for(const sess of state.history){
    const ex=(sess.exercises||[]).find(e=>historyExerciseMatches(e,target));
    if(!ex) continue;
    const sets=(ex.sets||[]).filter(x=>x.done && Number(x.kg)>0 && Number(x.reps)>0);
    if(sets.length) out.push({session:sess,exercise:ex,sets});
    if(out.length>=limit) break;
  }
  return out;
}
function rirEquivalent(set){
  const v=Number(set?.metricValue);
  if(!Number.isFinite(v)) return null;
  return String(set?.metric||'RIR').toUpperCase()==='RPE'?Math.max(0,10-v):v;
}
function performanceLabel(sets){
  return (sets||[]).map(s=>`${fmtKg(s.kg)}×${s.reps}${rirEquivalent(s)!==null?` @${String(s.metric||'RIR').toUpperCase()} ${s.metricValue}`:''}`).join(' · ');
}
function loadDeltaFor(ex,step,progress=true){
  const lower=ex?.loadDirection==='lower-is-harder'||(!ex?.loadDirection&&/assist/i.test(`${ex?.name||''} ${ex?.equipment||''}`));
  return (progress ? (lower?-step:step) : (lower?step:-step));
}
function singleSetAssessment(set,ex,index=0){
  const profile=repRangeForSet(ex,index), target=defaultRir(ex.rir), reps=Number(set?.reps)||0, rir=rirEquivalent(set);
  if(profile.maxTechnical)return{top:false,hard:false,solid:reps>0,avgRir:rir,avgReps:reps,min:0,max:0,target,maxTechnical:true};
  const top=profile.max>0&&reps>=profile.max&&(rir===null||rir>=target-.25);
  const hard=profile.min>0&&reps<profile.min&&(rir!==null?rir<target-.75:reps<profile.min*.9);
  const solid=profile.min>0&&reps>=profile.min&&(rir===null||rir>=target-.5);
  return{top,hard,solid,avgRir:rir,avgReps:reps,min:profile.min,max:profile.max,target,maxTechnical:false};
}
function performanceAssessment(record,ex){
  const sets=record?.sets||[], required=Math.max(1,Number(ex.sets)||sets.length||1), work=sets.slice(0,required), assessments=work.map((set,i)=>singleSetAssessment(set,ex,i));
  const rirs=assessments.map(a=>a.avgRir).filter(v=>v!==null),avgRir=rirs.length?rirs.reduce((a,b)=>a+b,0)/rirs.length:null,avgReps=work.length?work.reduce((a,s)=>a+(Number(s.reps)||0),0)/work.length:0;
  return{top:assessments.length>=required&&assessments.every(a=>a.top),hard:assessments.length>0&&assessments.filter(a=>a.hard).length>work.length/2,solid:assessments.length>0&&assessments.every(a=>a.solid||a.maxTechnical),avgRir,avgReps,min:assessments[0]?.min||0,max:assessments[0]?.max||0,target:defaultRir(ex.rir),assessments};
}
function priorBest(target){
  let bestKg=isLowerHarder(target)?Infinity:0,bestE1rm=0;
  for(const sess of state.history){
    for(const ex of sess.exercises||[]){
      if(!historyExerciseMatches(ex,target)) continue;
      for(const st of ex.sets||[]){ if(!st.done) continue; const kg=Number(st.kg)||0,reps=Number(st.reps)||0; if(kg>0)bestKg=isLowerHarder(target)?Math.min(bestKg,kg):Math.max(bestKg,kg); if(!isLowerHarder(target)&&reps>0&&reps<=12)bestE1rm=Math.max(bestE1rm,kg*(1+reps/30)); }
    }
  }
  return {bestKg:Number.isFinite(bestKg)?bestKg:0,bestE1rm};
}
function inferredLoadStepFor(ex){
  if(Number(ex.loadStepKg)>0) return Number(ex.loadStepKg);
  const n=`${ex.name||''} ${ex.equipment||''}`.toLowerCase();
  let fallback=2.5;if(/manubr/.test(n))fallback=2;else if(/dischi|plate-loaded|plate loaded|pendulum|squat|pressa|hip thrust|romanian|stacco/.test(n))fallback=5;else if(/cavo|matrix|selectorized|pacco pesi|machine|pec fly|leg curl|leg extension|curl|pushdown|alzate|pulldown|assist/.test(n))fallback=2.5;
  const sessionLoads=[];for(const sess of state.history){const hx=(sess.exercises||[]).find(x=>historyExerciseMatches(x,ex));if(!hx)continue;const first=(hx.sets||[]).find(st=>st.done&&Number(st.kg)>0);if(first)sessionLoads.push(Number(first.kg));}
  const uniq=[...new Set(sessionLoads)].sort((a,b)=>a-b), diffs=[];for(let i=1;i<uniq.length;i++){const d=Math.round((uniq[i]-uniq[i-1])*100)/100;if(d>=.5)diffs.push(d);}if(diffs.length){const observed=Math.min(...diffs);if(observed<=fallback*2)return observed;}
  return fallback;
}
function loadStepFor(ex){ const id=effectiveExerciseId(ex),custom=Number(state.exerciseSettings?.[id]?.loadStepKg),catalog=Number(state.exerciseCatalog?.[id]?.loadStepKg); return custom>0?custom:catalog>0?catalog:inferredLoadStepFor(ex); }
function roundLoad(v,step,anchor=0){ if(!Number.isFinite(v)||!step) return v; return Math.round((anchor+Math.round((v-anchor)/step)*step)*100)/100; }
function suggestedLoadForSet(ex,index=0){
  ensureExerciseIdentity(ex);
  if(ex.autoLoad===false){ const fixed=Number(ex.initialKg); return fixed>0?{load:fixed,next:fixed,increased:false,inc:0,source:'scheda',reason:'carico fisso della scheda',mode:'fixed',confidence:'scheda',historyCount:0}:null; }
  const records=exerciseHistory(ex,6), lastRecord=records[0], initial=Number(ex.initialKg), inc=loadStepFor(ex), profile=repRangeForSet(ex,index), targetRir=defaultRir(ex.rir);
  const getSet=rec=>{const done=(rec?.sets||[]).filter(st=>st.done&&Number(st.kg)>0);return done[index]||done[0]||null;};
  const lastSet=getSet(lastRecord), priorSet=getSet(records[1]), manualRef=manualReferenceFor(ex);
  const manualDate=manualRef?.updatedAt?new Date(manualRef.updatedAt).getTime():0,lastHistoryDate=lastRecord?.session?.startedAt?new Date(lastRecord.session.startedAt).getTime():0;
  if(state.settings.smartLoad!==false&&manualRef&&Number(manualRef.kg)>0&&Number(manualRef.reps)>0&&manualDate>lastHistoryDate){const refKg=Number(manualRef.kg),refReps=Number(manualRef.reps),refRir=referenceRir(manualRef);let next=refKg,reason=`Riferimento personale aggiornato: ${fmtKg(refKg)} kg × ${refReps}`;if(!isLowerHarder(ex)&&!profile.maxTechnical&&profile.min>0){const e1=estimateE1RM(refKg,refReps,refRir),targetReps=Math.round((profile.min+(profile.max||profile.min))/2);if(e1>0){next=targetLoadFromE1RM(e1,targetReps,targetRir,inc);reason=`Riferimento DB più recente: ${fmtKg(refKg)}×${refReps}${manualRef.rir!==''&&manualRef.rir!==undefined?` @RIR ${refRir}`:''} → target ${profile.label} @RIR ${targetRir}`;}}return{load:refKg,next,increased:false,inc,delta:next-refKg,source:'database esercizi',reason,mode:'recalc',confidence:'riferimento',historyCount:records.length,lastSummary:`${fmtKg(refKg)}×${refReps}`,lastDate:manualRef.updatedAt,targetRange:profile.label};}
  if(state.settings.smartLoad===false){ const prior=Number(lastSet?.kg); if(prior>0)return{load:prior,next:prior,increased:false,inc,delta:0,source:'storico',reason:'progressione automatica disattivata: mantengo l’ultimo carico',mode:'maintain',confidence:'manuale',historyCount:records.length,lastSummary:lastRecord?performanceLabel(lastRecord.sets):''}; return initial>0?{load:initial,next:initial,increased:false,inc:0,source:'scheda',reason:'progressione automatica disattivata',mode:'initial',confidence:'manuale',historyCount:0}:null; }
  if(!lastSet){
    const ref=manualReferenceFor(ex);
    if(ref&&Number(ref.kg)>0&&Number(ref.reps)>0){
      const refKg=Number(ref.kg),refReps=Number(ref.reps),refRir=referenceRir(ref);let next=refKg,reason=`Riferimento personale: ${fmtKg(refKg)} kg × ${refReps}`;
      if(!isLowerHarder(ex)&&!profile.maxTechnical&&profile.min>0){const e1=estimateE1RM(refKg,refReps,refRir),targetReps=Math.round((profile.min+(profile.max||profile.min))/2);if(e1>0){next=targetLoadFromE1RM(e1,targetReps,targetRir,inc);reason=`Dal database: ${fmtKg(refKg)}×${refReps}${ref.rir!==''&&ref.rir!==undefined?` @RIR ${refRir}`:''} → target ${profile.label} @RIR ${targetRir}`;}}
      return{load:refKg,next,increased:false,inc,delta:next-refKg,source:'database esercizi',reason,mode:'recalc',confidence:'riferimento',historyCount:0,lastSummary:`${fmtKg(refKg)}×${refReps}`,lastDate:ref.updatedAt||null,targetRange:profile.label};
    }
    return initial>0?{load:initial,next:initial,increased:false,inc:0,source:'scheda',reason:'nessuno storico: uso il carico iniziale',mode:'initial',confidence:'bassa',historyCount:0}:null;
  }
  const load=Number(lastSet.kg)||0;if(!load)return null;
  let next=load,reason='mantieni il carico e prova ad aggiungere ripetizioni',mode='maintain',delta=0;
  if(profile.maxTechnical){
    const reps=Number(lastSet.reps)||0, prevReps=Number(priorSet?.reps)||0, rir=rirEquivalent(lastSet), prevRir=rirEquivalent(priorSet);
    const ready=!!priorSet&&reps>0&&((reps>=prevReps+2&&(rir===null||rir>=targetRir-.25))||(reps>=prevReps+1&&rir!==null&&rir>=targetRir+.5));
    const struggling=!!priorSet&&reps>0&&prevReps>0&&reps<=prevReps*.85&&rir!==null&&prevRir!==null&&rir<Math.max(0,targetRir-.5)&&prevRir<Math.max(0,targetRir-.5);
    if(ready){delta=loadDeltaFor(ex,inc,true);next=load+delta;mode='increase';reason=isLowerHarder(ex)?`MAX tecnico in crescita: riduci l’assistenza di ${fmtKg(inc)} kg`:`MAX tecnico in crescita: +${fmtKg(inc)} kg`;}
    else if(struggling){delta=loadDeltaFor(ex,inc,false);next=load+delta;mode='decrease';reason=isLowerHarder(ex)?`MAX tecnico in calo per due sedute: aumenta l’assistenza di ${fmtKg(inc)} kg`:`MAX tecnico in calo per due sedute: riduci ${fmtKg(inc)} kg`;}
    else reason=priorSet?`MAX tecnico: mantieni e prova a superare ${prevReps||reps} reps con tecnica pulita`:'MAX tecnico: crea una seconda prestazione comparabile prima di cambiare carico';
  }else{
    const assess=singleSetAssessment(lastSet,ex,index), priorAssess=priorSet?singleSetAssessment(priorSet,ex,index):null;
    const oldTarget=String(lastSet?.targetRange||'').trim(), rangeChanged=oldTarget&&oldTarget!==profile.label;
    if(assess.top){delta=loadDeltaFor(ex,inc,true);next=load+delta;mode='increase';reason=isLowerHarder(ex)?`set ${index+1}: target completato, riduci assistenza di ${fmtKg(inc)} kg`:`set ${index+1}: target alto completato, +${fmtKg(inc)} kg`;}
    else if(assess.hard&&priorAssess?.hard){delta=loadDeltaFor(ex,inc,false);next=load+delta;mode='decrease';reason=isLowerHarder(ex)?`set ${index+1}: due sedute difficili, aumenta assistenza di ${fmtKg(inc)} kg`:`set ${index+1}: due sedute sotto target, −${fmtKg(inc)} kg`;}
    else if(rangeChanged&&!isLowerHarder(ex)&&profile.min>0&&profile.max>0){const reps=Number(lastSet.reps)||0,rir=rirEquivalent(lastSet)||0,e1=reps>0&&reps<=15?load*(1+(reps+rir)/30):0;if(e1){const aim=(profile.min+profile.max)/2+targetRir,raw=e1/(1+aim/30);next=roundLoad(clamp(raw,load*.8,load*1.2),inc,load);mode='recalc';reason=`set ${index+1}: carico ricalcolato per il nuovo range ${profile.label}`;}}
    else if(assess.solid)reason=`set ${index+1}: range centrato, consolida prima di salire`;
    else if(profile.min>0)reason=`set ${index+1}: punta a ${profile.label} reps mantenendo il carico`;
  }
  next=Math.max(0,Math.round(next*100)/100);const confidence=records.length>=4?'alta':records.length>=2?'media':'bassa';
  return{load,next,increased:mode==='increase',inc,delta,source:'storico',reason,mode,last:lastRecord?.exercise,confidence,historyCount:records.length,lastSummary:lastRecord?performanceLabel(lastRecord.sets):'',lastDate:lastRecord?.session?.startedAt,targetRange:profile.label};
}
function suggestedLoad(ex){ return suggestedLoadForSet(ex,0); }
function suggestedSetLoad(ex,index,sugg,last){ const own=suggestedLoadForSet(ex,index); return own?.next??sugg?.next??''; }

function startWorkout(name){
  if(state.currentSession){ toast('Hai già una sessione attiva'); state.ui.view='session'; saveState(); render(); return; }
  const workout=getAdjustedWorkout(name,state.currentWeek); if(!workout.exercises.length){toast('Workout non trovato');return;}
  const exercises=workout.exercises.map(ex=>{
    ensureExerciseIdentity(ex);
    const last=lastExerciseData(ex), sugg=suggestedLoad(ex);
    let sets=[];
    if(Array.isArray(ex.plannedSets)){ sets=plannedSetsFor(ex); }
    else if(ex.special){ sets=getBenchSets(ex.special,state.currentWeek); }
    else if(ex.sets>0){
      for(let i=0;i<ex.sets;i++){
        const old=(last?.sets||[]).filter(s=>s.done)[i];
        const recommended=suggestedSetLoad(ex,i,sugg,last), profile=repRangeForSet(ex,i);
        sets.push({label:String(i+1),kg:recommended,recommendedKg:recommended,reps:(old?.reps??(profile.maxTechnical?'':profile.min))||'',targetRange:profile.label,metric:'RIR',metricValue:defaultRir(ex.rir),done:false,restSec:ex.restSec||0});
      }
    }
    return {...ex,targetReps:ex.reps,targetRir:ex.rir,sets,done:false,notes:'',replacement:null,loadSuggestion:sugg?{recommendedKg:sugg.next,previousKg:sugg.load,reason:sugg.reason,source:sugg.source,mode:sugg.mode,confidence:sugg.confidence,historyCount:sugg.historyCount,lastSummary:sugg.lastSummary||'',generatedAt:new Date().toISOString()}:null};
  });
  const pre=currentPreCycleStep();
  state.currentSession={id:uid(),workout:name,week:state.currentWeek,programTitle:programTitle(),programPhase:pre?.phase||currentBenchPlan()?.phase||'',preCycleStepAtStart:pre?Number(state.preCycleStep):null,startedAt:new Date().toISOString(),exercises,estimatedMin:workout.estimatedMin,sessionRpe:'',bodyweightKg:'',notes:''};
  state.ui.view='session'; state.ui.openExercise=0; saveState(); requestWakeLock(); render();
}
function resumeWorkout(){ if(state.currentSession){state.ui.view='session';saveState();render();requestWakeLock();} }
function sessionProgress(){
  const s=state.currentSession; if(!s) return {done:0,total:0,pct:0};
  let done=0,total=0;
  s.exercises.forEach(ex=>{ if(ex.sets?.length){total+=ex.sets.length;done+=ex.sets.filter(x=>x.done).length;} else {total++;if(ex.done)done++;} });
  return {done,total,pct:total?Math.round(done/total*100):0};
}
function openExercise(i){ state.ui.openExercise=i; saveState(); render(); }
function updateSetField(exi,si,field,value){
  const s=state.currentSession?.exercises?.[exi]?.sets?.[si]; if(!s) return;
  if(['kg','reps','metricValue'].includes(field) && value!=='') value=Number(String(value).replace(',','.'));
  s[field]=value; saveState();
}
function adjustActive(exi,field,delta){
  const ex=state.currentSession?.exercises?.[exi]; if(!ex) return;
  let si=ex.sets.findIndex(s=>!s.done); if(si<0) si=ex.sets.length-1;
  const s=ex.sets[si]; if(!s) return;
  const cur=Number(s[field])||0; s[field]=Math.max(0,Math.round((cur+delta)*10)/10); saveState(); render();
}
function completeWarmup(exi){
  const ex=state.currentSession?.exercises?.[exi]; if(!ex) return; ex.done=!ex.done; saveState(); advanceOpenExercise(); render();
}
function completeSet(exi,si){
  const ex=state.currentSession?.exercises?.[exi], s=ex?.sets?.[si]; if(!s) return;
  if(s.done){ s.done=false; s.completedAt=null; saveState(); render(); return; }
  if(s.reps===''||Number(s.reps)<=0){ toast('Inserisci le ripetizioni'); return; }
  s.done=true; s.completedAt=new Date().toISOString();
  const best=priorBest(ex); const kg=Number(s.kg)||0,reps=Number(s.reps)||0; const e1=!isLowerHarder(ex)&&kg&&reps<=12?kg*(1+reps/30):0;
  if(isLowerHarder(ex)&&kg>0&&best.bestKg>0&&kg<best.bestKg) toast(`PR assistenza: ${fmtKg(kg)} kg`); else if(!isLowerHarder(ex)&&kg>best.bestKg && best.bestKg>0) toast(`PR carico: ${fmtKg(kg)} kg`); else if(e1>best.bestE1rm && best.bestE1rm>0) toast(`PR e1RM stimato: ${e1.toFixed(1)} kg`);
  if(ex.special&&!s.extra&&s.target!==false) maybeAutoregulateBench(ex,si);
  if(state.settings.autoTimer && Number(s.restSec||ex.restSec)>0) startTimer(Number(s.restSec||ex.restSec), ex.name);
  saveState(); advanceOpenExercise(); render();
}
function advanceOpenExercise(){
  const ss=state.currentSession; if(!ss) return; const i=state.ui.openExercise; const ex=ss.exercises[i];
  const done=ex?.sets?.length?ex.sets.every(s=>s.done):!!ex?.done;
  if(done && i<ss.exercises.length-1) state.ui.openExercise=i+1;
}
function setExerciseNote(exi,val){ const ex=state.currentSession?.exercises?.[exi]; if(ex){ex.notes=val;saveState();} }
function updateSessionMeta(field,value){ const ss=state.currentSession;if(!ss)return;if(field==='sessionRpe'||field==='bodyweightKg')value=value===''?'':Number(String(value).replace(',','.'));ss[field]=value;saveState(); }
function copyLastPerformance(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex?.sets?.length)return;if(ex.special||Array.isArray(ex.plannedSets)){toast('Serie programmate: mantieni la prescrizione');return;}const last=lastExerciseData(ex),prev=(last?.sets||[]).filter(x=>x.done);if(!prev.length){toast('Nessuna performance precedente');return;}
  ex.sets.forEach((set,i)=>{const old=prev[i]||prev[prev.length-1];if(!old)return;set.kg=old.kg??set.kg;set.reps=old.reps??set.reps;});saveState();render();toast('Ultima performance copiata');
}
function addAccessorySet(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex||ex.special||Array.isArray(ex.plannedSets)){toast('Serie prescritte: modifica non disponibile');return;}const prev=ex.sets?.[ex.sets.length-1]||{};
  ex.sets.push({label:String((ex.sets?.length||0)+1),kg:prev.kg??'',recommendedKg:prev.recommendedKg??prev.kg??'',reps:prev.reps??parseMinRep(ex.reps),metric:prev.metric||'RIR',metricValue:prev.metricValue??defaultRir(ex.rir),done:false,restSec:ex.restSec||0});saveState();render();
}
function removeAccessorySet(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex||ex.special||Array.isArray(ex.plannedSets)||!ex.sets?.length)return;const last=ex.sets[ex.sets.length-1];if(last.done){toast('Annulla prima l’ultima serie completata');return;}if(ex.sets.length<=1){toast('Mantieni almeno una serie');return;}ex.sets.pop();saveState();render();
}
function addSessionSet(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex)return;
  if(!ex.special&&!Array.isArray(ex.plannedSets)){addAccessorySet(exi);return;}
  const prev=ex.sets?.[ex.sets.length-1]||{},n=(ex.sets||[]).filter(x=>x.extra).length+1;
  ex.sets=ex.sets||[];ex.sets.push({label:`Extra ${n}`,kg:prev.kg??'',recommendedKg:prev.kg??'',reps:prev.reps??'',metric:prev.metric||'RIR',metricValue:prev.metricValue??2,done:false,restSec:prev.restSec||ex.restSec||120,target:false,extra:true,targetRange:'extra'});saveState();render();toast('Serie extra aggiunta');
}
function removeSessionSet(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex?.sets?.length)return;const last=ex.sets[ex.sets.length-1];
  if(last.done){toast('Annulla prima l’ultima serie completata');return;}
  if((ex.special||Array.isArray(ex.plannedSets))&&!last.extra){toast('Le serie prescritte non si eliminano');return;}
  if(!ex.special&&!Array.isArray(ex.plannedSets)&&ex.sets.length<=1){toast('Mantieni almeno una serie');return;}
  ex.sets.pop();saveState();render();
}
function undoLastCompletedSet(){ const hit=latestCompletedSet();if(!hit){toast('Nessuna serie da annullare');return;}hit.set.done=false;hit.set.completedAt=null;state.timer=null;timerFinishedHandled=false;state.ui.openExercise=hit.exi;saveState();render();toast(`Serie annullata · ${hit.ex.name}`); }
function showSubstitutions(exi){
  const ex=state.currentSession?.exercises?.[exi];if(!ex)return;syncExerciseCatalogFromKnownData();const movement=effectiveMovementId(ex),same=catalogEntries().filter(p=>p.id!==effectiveExerciseId(ex)&&p.movementId===movement);
  const fallback=[];if(ex.baseName||ex.name)fallback.push(ex.baseName||ex.name);if(ex.alternative&&ex.alternative!=='—'&&ex.alternative!=='Nessuna')fallback.push(...String(ex.alternative).split(/\s*\/\s*|,\s*/));substitutionMap(ex.baseName||ex.name).forEach(x=>fallback.push(x));
  const knownNames=new Set(same.map(x=>cleanKey(x.name))),generic=[...new Set(fallback.filter(Boolean))].filter(n=>!knownNames.has(cleanKey(n)));
  showModal(`<h2>Sostituisci esercizio</h2><p class="subtle">Ogni macchina/variante conserva il proprio carico. Le alternative dello stesso movimento usano il loro storico o il riferimento salvato.</p><div class="modal-list">${same.map(p=>{const st=exerciseReferenceStats(p),ref=st.latest;return `<button class="modal-option" onclick="replaceExerciseWithCatalog(${exi},decodeURIComponent('${encodedArg(p.id)}'))"><b>${esc(profileDisplayName(p))}</b><small>${esc(p.equipment||'Attrezzatura non specificata')}${ref?` · rif. ${fmtKg(ref.kg)}×${ref.reps}`:''}</small></button>`}).join('')}${generic.map(c=>`<button class="modal-option" onclick="replaceExercise(${exi},decodeURIComponent('${encodedArg(c)}'))">${esc(c)}<small>Nuova variante: creerà uno storico separato</small></button>`).join('')}</div><button class="secondary-btn" style="margin-top:10px" onclick="showCatalogForReplacement(${exi})">Cerca tutto il database</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function substitutionMap(name){
  const n=name.toLowerCase();
  if(n.includes('incline chest')) return ['Chest press pacco pesi','Distensioni manubri inclinata','Multipower inclinato'];
  if(n.includes('shoulder press')) return ['Shoulder press carico dischi','Shoulder press pacco pesi','Distensioni manubri sopra la testa'];
  if(n.includes('pec fly')) return ['Croci ai cavi'];
  if(n.includes('trazioni')) return ['Lat machine presa media','Lat machine presa larga'];
  if(n.includes('t-bar')) return ['High row carico dischi','Pulley presa media'];
  if(n==='pulley') return ['High row carico dischi','T-bar row carico dischi'];
  if(n.includes('reverse pec')) return ['Croci inverse ai cavi'];
  if(n.includes('perfect squat')) return ['Belt squat','Pressa 45°'];
  if(n.includes('pressa 45')) return ['Pressa orizzontale','Belt squat'];
  if(n.includes('leg extension')) return ['Leg extension pacco pesi','Leg extension carico dischi'];
  if(n.includes('standing leg curl')||n.includes('leg curl')) return ['Leg curl pacco pesi','Standing leg curl','Leg curl carico dischi'];
  if(n.includes('hip thrust')) return ['Hip thrust al multipower'];
  if(n.includes('romanian')) return ['Romanian deadlift con manubri'];
  if(n.includes('belt squat')) return ['Perfect squat','Pressa 45°'];
  if(n.includes('lat machine')) return ['Trazioni assistite'];
  if(n.includes('high row')) return ['T-bar row carico dischi','Pulley'];
  if(n.includes('curl')) return ['Curl al cavo con barra EZ','Curl manubri','Hammer curl'];
  if(n.includes('pushdown')||n.includes('tricipiti')) return ['Pushdown corda','Pushdown barra EZ','Estensione unilaterale al cavo'];
  return [];
}
function applyReplacementProfile(exi,profile){
  const ex=state.currentSession?.exercises?.[exi];if(!ex||!profile)return;const originalName=ex.baseName||ex.name,returning=profile.name===originalName&&(!profile.gym);
  ex.name=profile.name;ex.replacement=returning?null:profile.name;ex.exerciseId=profile.id||slugId(profile.name);ex.movementId=profile.movementId||inferMovementId(profile.name);ex.historyKey=profile.name;ex.aliases=[profile.name];ex.loadDirection=profile.loadDirection||inferLoadDirection(profile);ex.loadMode=profile.loadMode||inferLoadMode(profile);ex.equipment=profile.equipment||ex.equipment||'';ex.gym=profile.gym||'';if(Number(profile.loadStepKg)>0)ex.loadStepKg=Number(profile.loadStepKg);
  const previous=lastExerciseData(ex),sugg=suggestedLoad(ex);if(ex.sets?.length&&!ex.special&&!Array.isArray(ex.plannedSets))ex.sets.forEach((set,i)=>{const rp=repRangeForSet(ex,i),rec=suggestedSetLoad(ex,i,sugg,previous);set.kg=rec??'';set.recommendedKg=rec??'';set.reps=((previous?.sets||[]).filter(x=>x.done)[i]?.reps??(rp.maxTechnical?'':rp.min))||'';set.targetRange=rp.label;set.done=false;set.completedAt=null;});
  ex.loadSuggestion=sugg?{recommendedKg:sugg.next,previousKg:sugg.load,reason:sugg.reason,source:sugg.source,mode:sugg.mode,confidence:sugg.confidence,historyCount:sugg.historyCount,lastSummary:sugg.lastSummary||'',generatedAt:new Date().toISOString()}:null;upsertCatalogExercise(ex,'replacement');saveState();closeModal();render();toast('Variante attivata · carico specifico recuperato');
}
function replaceExerciseWithCatalog(exi,id){const p=catalogEntry(id);if(p)applyReplacementProfile(exi,p);}
function replaceExercise(exi,name){
  let profile=catalogEntries().find(p=>cleanKey(p.name)===cleanKey(name)&&!p.gym);if(!profile){const id=slugId(name);profile={id,name,movementId:inferMovementId(name),equipment:'',gym:'',loadDirection:inferLoadDirection({name}),loadMode:inferLoadMode({name}),source:'replacement'};state.exerciseCatalog[id]=profile;}applyReplacementProfile(exi,profile);
}
function filterModalExerciseOptions(value){const q=cleanKey(value);document.querySelectorAll('.exercise-pick[data-search]').forEach(el=>el.style.display=!q||String(el.dataset.search||'').includes(q)?'block':'none');}
function showCatalogForReplacement(exi){
  closeModal();const entries=catalogEntries();showModal(`<h2>Database esercizi</h2><input class="text-input" style="text-align:left;margin-bottom:10px" placeholder="Cerca esercizio, palestra, macchina…" oninput="filterModalExerciseOptions(this.value)"><div class="modal-list exercise-picker">${entries.map(p=>{const st=exerciseReferenceStats(p);return `<button class="modal-option exercise-pick" data-search="${esc(cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''}`))}" onclick="replaceExerciseWithCatalog(${exi},decodeURIComponent('${encodedArg(p.id)}'))"><b>${esc(profileDisplayName(p))}</b><small>${esc(p.equipment||'')}${st.latest?` · ${fmtKg(st.latest.kg)}×${st.latest.reps}`:''}</small></button>`}).join('')}</div><button class="secondary-btn" style="margin-top:10px" onclick="closeModal()">Chiudi</button>`);
}

function showAddExerciseToSession(){
  if(!state.currentSession)return;const entries=catalogEntries();showModal(`<h2>Aggiungi esercizio</h2><p class="subtle">Puoi usare un esercizio già conosciuto: l'app recupererà automaticamente carichi e riferimento personale.</p><input class="text-input" style="text-align:left;margin-bottom:10px" placeholder="Cerca esercizio, palestra, macchina…" oninput="filterModalExerciseOptions(this.value)"><div class="modal-list exercise-picker">${entries.map(p=>{const st=exerciseReferenceStats(p),ref=st.latest;return `<button class="modal-option exercise-pick" data-search="${esc(cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''}`))}" onclick="configureSessionExercise(decodeURIComponent('${encodedArg(p.id)}'))"><b>${esc(profileDisplayName(p))}</b><small>${esc(p.equipment||'')}${ref?` · rif. ${fmtKg(ref.kg)}×${ref.reps}`:''}${st.bestE1rm?` · e1RM ${fmtKg(st.bestE1rm)}`:''}</small></button>`}).join('')}</div><button class="primary-btn" style="margin-top:10px" onclick="showCatalogEditor('', 'session')">+ Nuovo esercizio</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function configureSessionExercise(id){
  const p=catalogEntry(id);if(!p)return;const stats=exerciseReferenceStats(p),ref=stats.best||stats.latest,defaultReps=Number(p.defaultReps)||8,defaultRir=Number.isFinite(Number(p.defaultRir))?Number(p.defaultRir):2,step=loadStepFor(p),e1=stats.bestE1rm,target=e1?targetLoadFromE1RM(e1,defaultReps,defaultRir,step):Number(ref?.kg)||0;closeModal();
  showModal(`<h2>${esc(profileDisplayName(p))}</h2><p class="subtle">Aggiungi l'esercizio solo a questa sessione. Verrà comunque storicizzato nel database.</p>${ref?`<div class="load-preview"><div class="load-preview-title">Riferimento</div><div class="load-preview-row"><div><b>${fmtKg(ref.kg)} ${esc(loadUnitLabel(p))} × ${ref.reps}</b><small>${stats.bestE1rm?`e1RM ${fmtKg(stats.bestE1rm)} ${esc(loadUnitLabel(p))}`:'carico storico'}</small></div><span class="load-value">${target?`${fmtKg(target)} ${esc(loadUnitLabel(p))}`:'—'}</span></div></div>`:''}<div class="form-grid"><label>Serie<input id="addExSets" class="num-input" type="number" min="1" max="10" value="2"></label><label>Reps target<input id="addExReps" class="num-input" type="number" min="1" max="30" value="${defaultReps}"></label><label>RIR target<input id="addExRir" class="num-input" type="number" min="0" max="5" step="0.5" value="${defaultRir}"></label><label>Recupero sec<input id="addExRest" class="num-input" type="number" min="0" step="15" value="${Number(p.defaultRestSec)||120}"></label></div><button class="primary-btn" style="margin-top:12px" onclick="addConfiguredExerciseToSession(decodeURIComponent('${encodedArg(id)}'))">Aggiungi alla sessione</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function addConfiguredExerciseToSession(id){
  const ss=state.currentSession,p=catalogEntry(id);if(!ss||!p)return;const count=clamp(Number($('#addExSets')?.value)||2,1,10),reps=clamp(Number($('#addExReps')?.value)||8,1,30),rir=clamp(Number($('#addExRir')?.value)||2,0,5),rest=Math.max(0,Number($('#addExRest')?.value)||120);
  const ex=ensureExerciseIdentity({name:p.name,historyKey:p.name,baseName:p.name,exerciseId:p.id,movementId:p.movementId||inferMovementId(p.name),equipment:p.equipment||'',gym:p.gym||'',loadDirection:p.loadDirection||inferLoadDirection(p),loadMode:p.loadMode||inferLoadMode(p),sets:count,reps:String(reps),rir:String(rir),restSec:rest,alternative:'',note:'Aggiunto liberamente durante la sessione',autoLoad:true,unplanned:true,addedDuringSession:true});if(Number(p.loadStepKg)>0)ex.loadStepKg=Number(p.loadStepKg);
  const last=lastExerciseData(ex),sugg=suggestedLoad(ex);ex.sets=[];for(let i=0;i<count;i++){const rec=suggestedSetLoad(ex,i,sugg,last);ex.sets.push({label:String(i+1),kg:rec??'',recommendedKg:rec??'',reps:reps,targetRange:String(reps),metric:'RIR',metricValue:rir,done:false,restSec:rest});}ex.targetReps=String(reps);ex.targetRir=String(rir);ex.notes='';ex.replacement=null;ex.loadSuggestion=sugg?{recommendedKg:sugg.next,previousKg:sugg.load,reason:sugg.reason,source:sugg.source,mode:sugg.mode,confidence:sugg.confidence,historyCount:sugg.historyCount,lastSummary:sugg.lastSummary||'',generatedAt:new Date().toISOString()}:null;ss.exercises.push(ex);state.ui.openExercise=ss.exercises.length-1;upsertCatalogExercise(ex,'session');saveState();closeModal();render();toast(`${p.name} aggiunto alla sessione`);
}
function removeSessionExercise(exi){const ss=state.currentSession,ex=ss?.exercises?.[exi];if(!ss||!ex?.unplanned)return;if((ex.sets||[]).some(s=>s.done)){toast('Annulla le serie completate prima di rimuovere l’esercizio');return;}if(!confirm(`Rimuovere ${ex.name} dalla sessione?`))return;ss.exercises.splice(exi,1);state.ui.openExercise=Math.max(0,Math.min(state.ui.openExercise,ss.exercises.length-1));saveState();render();}

function showCatalogEditor(id='',purpose='catalog'){
  const old=id?catalogEntry(id):null,ref=old?.reference||{},loadMode=old?.loadMode||inferLoadMode(old||{});closeModal();showModal(`<h2>${old?'Modifica esercizio':'Nuovo esercizio'}</h2><input id="catalogEditId" type="hidden" value="${esc(old?.id||'')}"><input id="catalogPurpose" type="hidden" value="${esc(purpose)}"><div class="form-grid single"><label>Nome esercizio<input id="catalogName" class="text-input" value="${esc(old?.name||'')}" placeholder="es. Belt squat"></label><label>Palestra / variante<input id="catalogGym" class="text-input" value="${esc(old?.gym||'')}" placeholder="es. Palestra Torino / Matrix nuova"></label><label>Attrezzatura<input id="catalogEquipment" class="text-input" value="${esc(old?.equipment||'')}" placeholder="es. Matrix belt squat"></label><label>Movimento<input id="catalogMovement" class="text-input" value="${esc(old?.movementId||'')}" placeholder="auto dal nome"></label><label>Modalità carico<select id="catalogLoadMode" class="select-input"><option value="total" ${loadMode==='total'?'selected':''}>Kg totali / macchina</option><option value="per-hand" ${loadMode==='per-hand'?'selected':''}>Kg per manubrio</option><option value="assistance" ${loadMode==='assistance'?'selected':''}>Kg assistenza (meno = più difficile)</option></select></label><label>Step carico<input id="catalogStep" class="num-input" type="number" min="0.5" step="0.5" value="${esc(old?.loadStepKg??state.exerciseSettings?.[old?.id]?.loadStepKg??'')}" placeholder="auto"></label></div><hr class="sep"><h3 style="margin:0 0 8px">Riferimento personale</h3><p class="subtle">Inserisci una prestazione che conosci. Il RIR può restare vuoto: in quel caso la stima 1RM è prudente.</p><div class="form-grid"><label>Kg<input id="catalogRefKg" class="num-input" type="number" step="any" min="0" value="${esc(ref.kg??'')}"></label><label>Reps<input id="catalogRefReps" class="num-input" type="number" min="1" max="30" value="${esc(ref.reps??'')}"></label><label>RIR<input id="catalogRefRir" class="num-input" type="number" min="0" max="5" step="0.5" value="${esc(ref.rir??'')}" placeholder="opz."></label><label>Reps default<input id="catalogDefaultReps" class="num-input" type="number" min="1" max="30" value="${esc(old?.defaultReps??8)}"></label></div><label class="field-block">Note<input id="catalogNotes" class="text-input" value="${esc(old?.notes||'')}" placeholder="es. sedile 4, cintura lunga"></label><button class="primary-btn" style="margin-top:12px" onclick="saveCatalogExerciseModal()">Salva</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function saveCatalogExerciseModal(){
  const oldId=$('#catalogEditId')?.value||'',purpose=$('#catalogPurpose')?.value||'catalog',name=String($('#catalogName')?.value||'').trim();if(!name){toast('Inserisci il nome dell’esercizio');return;}const gym=String($('#catalogGym')?.value||'').trim(),equipment=String($('#catalogEquipment')?.value||'').trim(),movement=String($('#catalogMovement')?.value||'').trim()||inferMovementId(name),mode=$('#catalogLoadMode')?.value||'total',step=Number($('#catalogStep')?.value)||0;
  let id=oldId||makeCatalogId(name,gym,equipment);if(!oldId){let base=id,n=2;while(state.exerciseCatalog?.[id])id=`${base}-${n++}`;}const old=state.exerciseCatalog?.[id]||{},entry={...old,id,name,gym,equipment,movementId:movement,loadMode:mode,loadDirection:mode==='assistance'?'lower-is-harder':'higher-is-harder',loadStepKg:step||old.loadStepKg||undefined,defaultReps:clamp(Number($('#catalogDefaultReps')?.value)||8,1,30),defaultRir:Number.isFinite(Number(old.defaultRir))?old.defaultRir:2,notes:String($('#catalogNotes')?.value||''),source:'manual',userEdited:true,createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};const kg=Number($('#catalogRefKg')?.value),reps=Number($('#catalogRefReps')?.value),rirRaw=$('#catalogRefRir')?.value;if(kg>0&&reps>0)entry.reference={kg,reps,rir:rirRaw===''?'':clamp(Number(rirRaw)||0,0,5),metric:'RIR',source:'manual',updatedAt:new Date().toISOString()};else if(old.reference)entry.reference=old.reference;state.exerciseCatalog=state.exerciseCatalog||{};state.exerciseCatalog[id]=entry;if(step>0)state.exerciseSettings[id]={...(state.exerciseSettings[id]||{}),loadStepKg:step};saveState();closeModal();if(purpose==='session'){configureSessionExercise(id);return;}render();toast('Esercizio salvato nel database');
}
function showExerciseProfile(id){
  const p=catalogEntry(id);if(!p)return;const st=exerciseReferenceStats(p),best=st.best,latest=st.latest;showModal(`<h2>${esc(profileDisplayName(p))}</h2><p class="subtle">${esc(p.equipment||'Attrezzatura non specificata')} · ${esc(loadModeLabel(p.loadMode||inferLoadMode(p)))}</p><div class="bench-dashboard"><div><span>Ultimo riferimento</span><strong>${latest?`${fmtKg(latest.kg)} × ${latest.reps}`:'—'}</strong></div><div><span>Miglior e1RM</span><strong>${st.bestE1rm?`${fmtKg(st.bestE1rm)} ${esc(loadUnitLabel(p))}`:isLowerHarder(p)?'n/a':'—'}</strong></div><div><span>Step</span><strong>${fmtKg(loadStepFor(p))} ${esc(loadUnitLabel(p))}</strong></div><div><span>Movimento</span><strong>${esc(p.movementId||'—')}</strong></div></div>${st.manual?`<div class="history-suggestion">Riferimento manuale: <b>${fmtKg(st.manual.kg)} × ${st.manual.reps}</b>${st.manual.rawRir!==undefined&&st.manual.rawRir!==''?` @RIR ${st.manual.rir}`:' · RIR non indicato'}</div>`:''}<div class="action-stack"><button class="primary-btn" onclick="showTransformerForExercise(decodeURIComponent('${encodedArg(id)}'))">Apri trasformatore</button><button class="secondary-btn" onclick="showCatalogEditor(decodeURIComponent('${encodedArg(id)}'))">Modifica / registra carico</button></div><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Chiudi</button>`);
}
function filterCatalogRows(value){state.ui.catalogQuery=String(value||'');saveState();const q=cleanKey(value);document.querySelectorAll('.catalog-row[data-search]').forEach(el=>el.style.display=!q||String(el.dataset.search||'').includes(q)?'grid':'none');}
function transformerState(){state.ui.transformer={...defaultState.ui.transformer,...(state.ui.transformer||{})};return state.ui.transformer;}
function showTransformerForExercise(id){
  const t=transformerState(),p=catalogEntry(id),st=p?exerciseReferenceStats(p):null,ref=st?.best||st?.latest||p?.reference;t.exerciseId=id;if(ref){t.kg=ref.kg;t.reps=ref.reps;t.rir=ref.rir??0;}t.step=loadStepFor(p||{});saveState();closeModal();render();setTimeout(()=>$('#transformerCard')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}
function selectTransformerExercise(id){const t=transformerState();t.exerciseId=id;if(id){const p=catalogEntry(id),st=exerciseReferenceStats(p),ref=st.best||st.latest||p?.reference;if(ref){t.kg=ref.kg;t.reps=ref.reps;t.rir=ref.rir??0;}t.step=loadStepFor(p);}saveState();render();}
function updateTransformerField(field,value){const t=transformerState();t[field]=value;saveState();refreshTransformerOutput();}
function transformerResult(){const t=transformerState(),kg=Number(t.kg),reps=Number(t.reps),rir=Number(t.rir)||0,targetReps=Number(t.targetReps),targetRir=Number(t.targetRir)||0,p=t.exerciseId?catalogEntry(t.exerciseId):null,step=Number(t.step)||loadStepFor(p||{name:'carico generico'}),assisted=!!p&&isLowerHarder(p),e1=assisted?0:estimateE1RM(kg,reps,rir),target=e1?targetLoadFromE1RM(e1,targetReps,targetRir,step):0;return{e1,target,step,p,assisted,unit:p?loadUnitLabel(p):'kg'};}
function refreshTransformerOutput(){const r=transformerResult(),a=$('#transformerE1rm'),b=$('#transformerTarget'),c=$('#transformerRawNote');if(a)a.textContent=r.e1?`${fmtKg(r.e1)} ${r.unit}`:'—';if(b)b.textContent=r.target?`${fmtKg(r.target)} ${r.unit}`:'—';if(c)c.textContent=r.assisted?'e1RM non applicabile ai kg di assistenza. Usa lo storico assistenza/reps.':r.e1?`Epley RIR-adjusted · arrotondato allo step ${fmtKg(r.step)} ${r.unit}`:'Inserisci kg e reps per calcolare.';}
function renderTransformerCard(){
  const t=transformerState(),r=transformerResult(),entries=catalogEntries();return `<section class="card" id="transformerCard"><div class="row between"><div><h2 style="margin:0">Trasformatore carichi</h2><div class="subtle">Da una prestazione nota calcola e1RM e carico per le reps target.</div></div><span class="badge green">1RM</span></div><label class="field-block">Esercizio (opzionale)<select class="select-input" onchange="selectTransformerExercise(this.value)"><option value="">Generico</option>${entries.map(p=>`<option value="${esc(p.id)}" ${t.exerciseId===p.id?'selected':''}>${esc(profileDisplayName(p))}</option>`).join('')}</select></label><div class="form-grid"><label>Kg noti<input class="num-input" type="number" step="any" value="${esc(t.kg??'')}" oninput="updateTransformerField('kg',this.value)"></label><label>Reps fatte<input class="num-input" type="number" min="1" max="30" value="${esc(t.reps??5)}" oninput="updateTransformerField('reps',this.value)"></label><label>RIR del set<input class="num-input" type="number" min="0" max="5" step="0.5" value="${esc(t.rir??0)}" oninput="updateTransformerField('rir',this.value)"></label><label>Step carico<input class="num-input" type="number" min="0.5" step="0.5" value="${esc(t.step??'')}" placeholder="auto" oninput="updateTransformerField('step',this.value)"></label><label>Reps target<input class="num-input" type="number" min="1" max="30" value="${esc(t.targetReps??8)}" oninput="updateTransformerField('targetReps',this.value)"></label><label>RIR target<input class="num-input" type="number" min="0" max="5" step="0.5" value="${esc(t.targetRir??2)}" oninput="updateTransformerField('targetRir',this.value)"></label></div><div class="transform-results"><div><span>e1RM stimato</span><strong id="transformerE1rm">${r.e1?`${fmtKg(r.e1)} ${esc(r.unit)}`:'—'}</strong></div><div><span>Carico target</span><strong id="transformerTarget">${r.target?`${fmtKg(r.target)} ${esc(r.unit)}`:'—'}</strong></div></div><p class="subtle" id="transformerRawNote">${r.assisted?'e1RM non applicabile ai kg di assistenza. Usa lo storico assistenza/reps.':r.e1?`Epley RIR-adjusted · arrotondato allo step ${fmtKg(r.step)} ${esc(r.unit)}`:'Inserisci kg e reps per calcolare.'}</p></section>`;
}
function renderExerciseCatalogCard(){
  const entries=catalogEntries(),query=state.ui.catalogQuery||'';return `<section class="card"><div class="row between"><div><h2 style="margin:0">Database esercizi & carichi</h2><div class="subtle">${entries.length} profili · storico separato per macchina/palestra</div></div><button class="chip-btn" onclick="showCatalogEditor()">+ Nuovo</button></div><input class="text-input" style="text-align:left;margin-top:12px" value="${esc(query)}" oninput="filterCatalogRows(this.value)" placeholder="Cerca esercizio, palestra, attrezzatura…"><div class="catalog-list">${entries.map(p=>{const st=exerciseReferenceStats(p),ref=st.latest;return `<button class="catalog-row" data-search="${esc(cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''}`))}" style="${query&&!cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''}`).includes(cleanKey(query))?'display:none':''}" onclick="showExerciseProfile(decodeURIComponent('${encodedArg(p.id)}'))"><div><b>${esc(profileDisplayName(p))}</b><small>${esc(p.equipment||'Attrezzatura non specificata')}</small></div><div class="catalog-kpi"><strong>${ref?`${fmtKg(ref.kg)}×${ref.reps}`:'—'}</strong><small>${st.bestE1rm?`e1RM ${fmtKg(st.bestE1rm)}`:isLowerHarder(p)?'assistenza':'nessun dato'}</small></div></button>`}).join('')}</div></section>`;
}
function totalSessionVolume(sess){
  let v=0; for(const ex of sess.exercises||[]) for(const s of ex.sets||[]) if(s.done) v+=(Number(s.kg)||0)*(Number(s.reps)||0); return Math.round(v);
}
function finishWorkout(){
  const s=state.currentSession; if(!s) return;
  const p=sessionProgress();
  if(p.pct<100 && !confirm(`Hai completato ${p.pct}% della sessione. Vuoi chiuderla comunque?`)) return;
  s.finishedAt=new Date().toISOString(); s.durationMin=Math.max(1,Math.round((new Date(s.finishedAt)-new Date(s.startedAt))/60000)); s.volume=totalSessionVolume(s); s.progress=p.pct;
  const bridgeDone=s.preCycleStepAtStart!==null&&s.preCycleStepAtStart!==undefined&&(s.exercises||[]).some(ex=>ex.special&&ex.sets?.length&&ex.sets.filter(x=>x.target!==false&&!x.extra).every(x=>x.done));
  if(bridgeDone&&Number(s.preCycleStepAtStart)===Number(state.preCycleStep)){ state.preCycleStep=Math.min(preCycleCount(),Number(state.preCycleStep)+1); if(state.preCycleStep>=preCycleCount()){state.currentWeek=1;state.weekStartedAt=s.finishedAt;state.pendingWeekAdvance=null;} }
  (s.exercises||[]).forEach(ex=>{if(!ex.special&&(ex.sets||[]).some(st=>st.done&&Number(st.kg)>0))upsertCatalogExercise(ex,'history');});
  state.history.unshift(s); state.currentSession=null; state.timer=null; state.ui.view='history'; saveState(); const queued=!bridgeDone?maybeQueueWeekAdvance():null; releaseWakeLock(); render(); toast(bridgeDone&&state.preCycleStep>=preCycleCount()?'Ponte completato: parte la settimana 1':queued?(queued.to?`W${queued.from} completata: W${queued.to} pronta`:'Blocco completato'):'Allenamento salvato');
}
function discardWorkout(){ if(!state.currentSession) return; if(!confirm('Eliminare la sessione in corso?')) return; state.currentSession=null;state.timer=null;state.ui.view='home';saveState();releaseWakeLock();render(); }

function startTimer(sec,label){ state.timer={end:Date.now()+sec*1000,total:sec,label}; timerFinishedHandled=false; saveState(); renderTimer(); }
function addTimer(sec){ if(!state.timer) return; state.timer.end+=sec*1000; state.timer.total+=sec; saveState(); renderTimer(); }
function skipTimer(){ state.timer=null;timerFinishedHandled=false;saveState();renderTimer(); }
function renderTimer(){
  const el=$('#timerDock'); if(!el) return;
  if(!state.timer){el.classList.add('hidden');return;}
  const left=Math.ceil((state.timer.end-Date.now())/1000);
  if(left<=0){
    if(!timerFinishedHandled){ timerFinishedHandled=true; if(state.settings.vibrate && navigator.vibrate) navigator.vibrate([180,80,180]); beep(); toast('Recupero terminato'); }
    state.timer=null; saveState(); el.classList.add('hidden'); return;
  }
  el.classList.remove('hidden'); el.innerHTML=`<div><div class="timer-label">Recupero · ${esc(state.timer.label||'')}</div><div class="timer-time codeish">${fmtTime(left)}</div></div><div class="timer-actions"><button onclick="addTimer(30)">+30s</button><button onclick="skipTimer()">Salta</button></div>`;
}
function beep(){
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const ctx=new C();const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.35);}catch(e){}
}
async function requestWakeLock(){
  if(!state.settings.wakeLock||!('wakeLock' in navigator)) return;
  try{wakeLock=await navigator.wakeLock.request('screen');}catch(e){}
}
async function releaseWakeLock(){ try{await wakeLock?.release();wakeLock=null;}catch(e){} }

function setWeek(w){ state.currentWeek=clamp(Number(w),1,programWeekCount()); state.weekStartedAt=new Date().toISOString();state.pendingWeekAdvance=null; saveState(); render(); }
function setPreCycleStep(n){ state.preCycleStep=clamp(Number(n)||0,0,preCycleCount()); if(state.preCycleStep>=preCycleCount()){state.currentWeek=1;state.weekStartedAt=new Date().toISOString();} state.pendingWeekAdvance=null; saveState(); render(); }
function weekSessions(week=state.currentWeek){ const from=state.weekStartedAt?new Date(state.weekStartedAt).getTime():0; return state.history.filter(s=>s.preCycleStepAtStart===null||s.preCycleStepAtStart===undefined).filter(s=>Number(s.week)===Number(week)&&(!from||new Date(s.startedAt).getTime()>=from)); }
function maybeQueueWeekAdvance(){ if(currentPreCycleStep()||state.currentSession)return null;const split=programSplit();if(!split.length)return null;const sessions=weekSessions(), done=new Set(sessions.filter(s=>(Number(s.progress)||0)>=100).map(s=>s.workout));if(!split.every(w=>done.has(w)))return null;const max=programWeekCount();state.pendingWeekAdvance={from:state.currentWeek,to:state.currentWeek<max?state.currentWeek+1:null,completedAt:new Date().toISOString(),workouts:[...done]};saveState();return state.pendingWeekAdvance; }
function confirmWeekAdvance(){const p=state.pendingWeekAdvance;if(!p)return;if(p.to){state.currentWeek=p.to;state.weekStartedAt=new Date().toISOString();state.pendingWeekAdvance=null;saveState();render();toast(`Settimana ${state.currentWeek} attivata`);}else{state.cycleCompletedAt=new Date().toISOString();state.pendingWeekAdvance=null;saveState();render();toast('Ciclo di 8 settimane completato');}}
function keepCurrentWeek(){if(!state.pendingWeekAdvance)return;state.weekStartedAt=new Date().toISOString();state.pendingWeekAdvance=null;saveState();render();toast(`Rimani in settimana ${state.currentWeek}`);}
function pendingWeekAdvanceCard(){const p=state.pendingWeekAdvance;if(!p)return'';return p.to?`<section class="card week-advance-card"><div class="row between"><span class="badge green">SETTIMANA COMPLETATA</span><span class="badge">W${p.from} → W${p.to}</span></div><h3>Hai completato l’intero giro ${programSplit().map(esc).join(' · ')}</h3><p class="subtle">La prossima settimana è pronta. Puoi avanzare ora oppure restare su W${p.from}.</p><div class="week-advance-actions"><button class="primary-btn" onclick="confirmWeekAdvance()">Passa a W${p.to}</button><button class="secondary-btn" onclick="keepCurrentWeek()">Resta in W${p.from}</button></div></section>`:`<section class="card week-advance-card"><span class="badge green">CICLO COMPLETATO</span><h3>Hai completato la settimana ${p.from} e l’intero blocco.</h3><p class="subtle">Lo storico rimane disponibile per confrontare il risultato del test con l’inizio del ciclo.</p><div class="week-advance-actions"><button class="primary-btn" onclick="confirmWeekAdvance()">Segna ciclo completato</button><button class="secondary-btn" onclick="keepCurrentWeek()">Resta in W${p.from}</button></div></section>`;}
function setExerciseLoadStep(id,value){const n=Number(String(value).replace(',','.'));state.exerciseSettings=state.exerciseSettings||{};if(n>0)state.exerciseSettings[id]={...(state.exerciseSettings[id]||{}),loadStepKg:n};else delete state.exerciseSettings[id];saveState();render();}
function resetExerciseLoadStep(id){if(state.exerciseSettings?.[id])delete state.exerciseSettings[id];saveState();render();}

function toggleSetting(k){ state.settings[k]=!state.settings[k]; saveState(); if(k==='wakeLock'&&state.settings[k]&&state.currentSession)requestWakeLock(); if(k==='wakeLock'&&!state.settings[k])releaseWakeLock(); render(); }

function exportBackup(){
  const payload={type:'gym-tracker-backup',schemaVersion:2,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),state};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`gym-tracker-backup-${new Date().toISOString().slice(0,10)}.json`);
}
function exportCSV(){
  const rows=[['Sessione','Data','Workout','Settimana','Durata_min','Peso_kg','RPE_sessione','Note_sessione','Programma','Esercizio','ExerciseId','MovementId','HistoryKey','Palestra','Attrezzatura','LoadMode','Serie','Kg','Carico_consigliato','Reps','RIR_RPE','Tipo','Velocita','Motivo_consiglio','Note_esercizio']];
  for(const sess of [...state.history].reverse()){
    for(const ex of sess.exercises||[]){
      for(let i=0;i<(ex.sets||[]).length;i++){
        const set=ex.sets[i];if(!set.done)continue;
        rows.push([sess.id,sess.startedAt,sess.workout,sess.week,sess.durationMin||'',sess.bodyweightKg??'',sess.sessionRpe??'',sess.notes||'',sess.programTitle||'',ex.name,effectiveExerciseId(ex),effectiveMovementId(ex),ex.historyKey||ex.baseName||ex.name,ex.gym||'',ex.equipment||'',ex.loadMode||inferLoadMode(ex),set.label||i+1,set.kg??'',set.recommendedKg??ex.loadSuggestion?.recommendedKg??'',set.reps??'',set.metricValue??'',set.metric||'RIR',set.barSpeed||'',ex.loadSuggestion?.reason||'',ex.notes||'']);
      }
    }
  }
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`gym-tracker-storico-${new Date().toISOString().slice(0,10)}.csv`);
}
function parseDelimited(text,delimiter=';'){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(ch===delimiter&&!quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];
    }else cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell);if(row.some(v=>v!==''))rows.push(row);}
  return rows;
}
function detectDelimiter(text){
  const line=String(text||'').replace(/^\ufeff/,'').split(/\r?\n/).find(Boolean)||'';
  const counts={';':0,',':0,'\t':0};let quoted=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted&&Object.prototype.hasOwnProperty.call(counts,ch))counts[ch]++;}
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
}
function csvNum(v){ if(v===undefined||v===null||String(v).trim()==='')return'';const n=Number(String(v).trim().replace(',','.'));return Number.isFinite(n)?n:''; }
function csvRowsAsObjects(text){
  const clean=String(text||'').replace(/^\ufeff/,''), delimiter=detectDelimiter(clean), table=parseDelimited(clean,delimiter);if(table.length<2)throw new Error('CSV senza dati');
  const headers=table[0].map(h=>String(h||'').trim());
  return table.slice(1).map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??''])));
}
function rowGet(row,...names){
  const index={};Object.entries(row||{}).forEach(([k,v])=>index[cleanKey(k)]=v);
  for(const name of names){const v=index[cleanKey(name)];if(v!==undefined)return v;}return'';
}
function addMinutesIso(start,min){const d=new Date(start);if(Number.isNaN(d.getTime()))return start;d.setMinutes(d.getMinutes()+(Number(min)||0));return d.toISOString();}
function historyFromCSV(text){
  const rows=csvRowsAsObjects(text), map=new Map();
  for(const row of rows){
    const startedAt=rowGet(row,'Data','Date','StartedAt');if(!startedAt)continue;
    const workout=rowGet(row,'Workout','Allenamento')||'IMPORT';const id=rowGet(row,'Sessione','Session','SessionId')||`csv-${cleanKey(startedAt)}-${cleanKey(workout)}`;
    let sess=map.get(id);
    if(!sess){
      const duration=csvNum(rowGet(row,'Durata_min','Durata','Duration_min'));
      sess={id,workout,week:csvNum(rowGet(row,'Settimana','Week'))||1,programTitle:rowGet(row,'Programma','Program')||'Storico importato CSV',startedAt,finishedAt:addMinutesIso(startedAt,duration),durationMin:duration,bodyweightKg:csvNum(rowGet(row,'Peso_kg','Peso','Bodyweight_kg')),sessionRpe:csvNum(rowGet(row,'RPE_sessione','Session_RPE')),notes:rowGet(row,'Note_sessione','Session_notes'),exercises:[],progress:100,importedFrom:'csv',importedAt:new Date().toISOString()};map.set(id,sess);
    }
    const name=rowGet(row,'Esercizio','Exercise');if(!name)continue;const historyKey=rowGet(row,'HistoryKey','Chiave_storico')||name,exerciseId=rowGet(row,'ExerciseId')||slugId(name);
    let ex=sess.exercises.find(e=>effectiveExerciseId(e)===exerciseId);
    if(!ex){ex={name,historyKey,baseName:historyKey,exerciseId,movementId:rowGet(row,'MovementId')||inferMovementId(name),gym:rowGet(row,'Palestra','Gym'),equipment:rowGet(row,'Attrezzatura','Equipment'),loadMode:rowGet(row,'LoadMode')||undefined,loadDirection:rowGet(row,'LoadMode')==='assistance'?'lower-is-harder':inferLoadDirection(name),notes:rowGet(row,'Note_esercizio','Note','Exercise_notes'),sets:[]};sess.exercises.push(ex);}
    const recommended=csvNum(rowGet(row,'Carico_consigliato','RecommendedKg','Kg_consigliati'));
    const reason=rowGet(row,'Motivo_consiglio','Recommendation_reason');
    if(recommended!==''||reason)ex.loadSuggestion={recommendedKg:recommended,reason,source:'csv',mode:'snapshot',confidence:'storico'};
    ex.sets.push({label:String(rowGet(row,'Serie','Set')||ex.sets.length+1),kg:csvNum(rowGet(row,'Kg','Weight')),recommendedKg:recommended,reps:csvNum(rowGet(row,'Reps','Ripetizioni')),metricValue:csvNum(rowGet(row,'RIR_RPE','RIR','RPE')),metric:String(rowGet(row,'Tipo','Type')||'RIR').toUpperCase(),barSpeed:rowGet(row,'Velocita','Velocity','BarSpeed'),done:true,completedAt:sess.finishedAt||sess.startedAt});
  }
  const out=[...map.values()];out.forEach(sess=>sess.volume=totalSessionVolume(sess));out.sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  if(!out.length)throw new Error('Nessuna sessione riconosciuta');return out;
}
function historyFingerprint(s){return `${s?.id||''}|${String(s?.startedAt||'').slice(0,19)}|${cleanKey(s?.workout||'')}`;}
function isBlank(v){return v===undefined||v===null||v==='';}
function enrichSession(existing,incoming){
  let changed=false;for(const key of ['finishedAt','durationMin','bodyweightKg','sessionRpe','notes','programTitle','volume','progress']){if(isBlank(existing[key])&&!isBlank(incoming?.[key])){existing[key]=clone(incoming[key]);changed=true;}}
  existing.exercises=Array.isArray(existing.exercises)?existing.exercises:[];
  for(const ix of incoming?.exercises||[]){
    let ex=existing.exercises.find(e=>historyExerciseMatches(e,ix));if(!ex){existing.exercises.push(clone(ix));changed=true;continue;}
    for(const key of ['historyKey','baseName','exerciseId','movementId','loadDirection','targetReps','targetRir','notes']){if(isBlank(ex[key])&&!isBlank(ix[key])){ex[key]=clone(ix[key]);changed=true;}}
    if(!ex.loadSuggestion&&ix.loadSuggestion){ex.loadSuggestion=clone(ix.loadSuggestion);changed=true;}
    ex.sets=Array.isArray(ex.sets)?ex.sets:[];
    for(const ist of ix.sets||[]){let st=ex.sets.find(x=>String(x.label??'')===String(ist.label??''));if(!st){ex.sets.push(clone(ist));changed=true;continue;}for(const key of ['recommendedKg','completedAt','metric','metricValue','kg','reps','barSpeed']){if(isBlank(st[key])&&!isBlank(ist[key])){st[key]=clone(ist[key]);changed=true;}}}
  }
  return changed;
}
function mergeHistory(incoming){
  let added=0,skipped=0,updated=0;
  for(const sess of incoming||[]){
    const key=historyFingerprint(sess);const existing=state.history.find(x=>(sess.id&&x.id===sess.id)||historyFingerprint(x)===key);
    if(existing){if(enrichSession(existing,sess))updated++;else skipped++;continue;}
    state.history.push(clone(sess));added++;
  }
  state.history.sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0));return{added,skipped,updated};
}
function downloadBlob(blob,name){ const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500); }
function triggerImport(){ $('#importInput')?.click(); }
function triggerCSVImport(){ $('#csvInput')?.click(); }
function triggerProgramImport(){ if(state.currentSession){toast('Termina o scarta la sessione prima di cambiare scheda');return;} $('#programInput')?.click(); }
function exportProgram(){
  const program=clone(activeProgram());
  const blob=new Blob([JSON.stringify({type:'gym-tracker-program',schemaVersion:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),program},null,2)],{type:'application/json'});
  downloadBlob(blob,`gym-tracker-scheda-${new Date().toISOString().slice(0,10)}.json`);
}
function exportPortableProgram(){
  const payload={type:'gym-tracker-program-package',schemaVersion:4,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),currentWeek:state.currentWeek,preCycleStep:state.preCycleStep,program:clone(activeProgram()),history:clone(state.history),progression:{engine:'smart-load-v4-exercise-memory',benchAutoregulation:'rpe-guard-v1',historyDriven:true,exerciseIdentity:'movement-plus-exercise-plus-gym'},exerciseSettings:clone(state.exerciseSettings||{}),exerciseCatalog:clone(state.exerciseCatalog||{}),weekStartedAt:state.weekStartedAt,settings:{smartLoad:state.settings.smartLoad,showRir:state.settings.showRir}};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`gym-tracker-pacchetto-portabile-${new Date().toISOString().slice(0,10)}.json`);
}
function saveProgramToLibrary(program){
  if(!program?.workouts)return null;const copy=clone(program);copy.libraryId=String(copy.libraryId||uid());
  const item={id:copy.libraryId,title:copy.title||copy.name||'Scheda',savedAt:new Date().toISOString(),program:copy};
  const idx=state.programLibrary.findIndex(x=>x.id===item.id);if(idx>=0)state.programLibrary[idx]=item;else state.programLibrary.unshift(item);return copy;
}
function saveActiveProgramToLibrary(){if(!state.activeProgram){toast('La scheda base è già sempre disponibile');return;}state.activeProgram=saveProgramToLibrary(state.activeProgram);saveState();render();toast('Scheda salvata in libreria');}
function activateLibraryProgram(id){if(state.currentSession){toast('Termina prima la sessione attiva');return;}const item=state.programLibrary.find(x=>x.id===id);if(!item)return;state.activeProgram=clone(item.program);state.currentWeek=clamp(Number(state.activeProgram.startWeek)||state.currentWeek||1,1,programWeekCount());state.weekStartedAt=new Date().toISOString();state.pendingWeekAdvance=null;state.ui.view='program';saveState();render();toast('Scheda attivata');}
function removeLibraryProgram(id){const item=state.programLibrary.find(x=>x.id===id);if(!item)return;if(!confirm(`Rimuovere “${item.title}” dalla libreria? Lo storico resta intatto.`))return;state.programLibrary=state.programLibrary.filter(x=>x.id!==id);saveState();render();toast('Scheda rimossa dalla libreria');}
function restoreDefaultProgram(){ if(state.currentSession){toast('Termina o scarta la sessione prima');return;} if(!state.activeProgram){toast('Stai già usando la scheda originale');return;} if(!confirm('Ripristinare la scheda originale? Lo storico resterà intatto.'))return; state.activeProgram=null;state.currentWeek=1;state.preCycleStep=0;state.weekStartedAt=null;state.pendingWeekAdvance=null;saveState();render();toast('Scheda originale ripristinata'); }
function resetAll(){ if(!confirm('Cancellare storico, sessione attiva, libreria schede e impostazioni? Questa azione non si può annullare.'))return;state=clone(defaultState);state.history=[];state.seedHistoryDisabled=true;state.version=APP_VERSION;saveState();render();toast('Dati azzerati definitivamente'); }

function showModal(html){ let b=document.createElement('div');b.className='modal-backdrop';b.id='modalBackdrop';b.innerHTML=`<div class="modal">${html}</div>`;b.addEventListener('click',e=>{if(e.target===b)closeModal();});document.body.appendChild(b); }
function closeModal(){ $('#modalBackdrop')?.remove(); }
function showHistoryDetail(id){
  const s=state.history.find(x=>x.id===id);if(!s)return;
  const exhtml=(s.exercises||[]).map(ex=>{const done=(ex.sets||[]).filter(x=>x.done);if(!done.length&&!ex.done)return'';const sg=ex.loadSuggestion;return `<div class="card flat"><b>${esc(ex.name)}</b><div class="subtle" style="margin-top:6px">${done.map(x=>`${x.kg!==''?`${x.kg} kg × `:''}${x.reps||'—'} · ${esc(x.metric||'RIR')} ${x.metricValue??'—'}${x.recommendedKg!==undefined&&x.recommendedKg!==''?` · cons. ${fmtKg(x.recommendedKg)} kg`:''}${x.barSpeed?` · velocità ${esc(benchSpeedLabel(x.barSpeed))}`:''}`).join('<br>')}</div>${sg?.recommendedKg!==undefined&&sg?.recommendedKg!==''?`<div class="history-suggestion">Consiglio registrato: <b>${fmtKg(sg.recommendedKg)} kg</b>${sg.reason?` · ${esc(sg.reason)}`:''}</div>`:''}${ex.notes?`<div class="subtle" style="margin-top:6px">${esc(ex.notes)}</div>`:''}</div>`}).join('');
  const meta=[fmtDate(s.startedAt),`${s.durationMin||'—'} min`,`${s.volume||0} kg volume`,s.sessionRpe?`RPE sessione ${s.sessionRpe}`:'',s.bodyweightKg?`${fmtKg(s.bodyweightKg)} kg peso`:''].filter(Boolean).join(' · ');
  showModal(`<h2>${esc(s.workout)} · ${s.preCycleStepAtStart!==null&&s.preCycleStepAtStart!==undefined?`ponte ${Number(s.preCycleStepAtStart)+1}`:`settimana ${s.week}`}</h2><p class="subtle">${meta}</p>${s.notes?`<div class="session-note">${esc(s.notes)}</div>`:''}<div class="modal-list">${exhtml||'<div class="empty">Nessuna serie registrata.</div>'}</div><button class="danger-btn" style="margin-top:12px" onclick="deleteHistory(decodeURIComponent('${encodedArg(s.id)}'))">Elimina sessione</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Chiudi</button>`);
}
function deleteHistory(id){ if(!confirm('Eliminare questa sessione dallo storico?'))return;state.history=state.history.filter(x=>x.id!==id);saveState();closeModal();render(); }

function installApp(){
  if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null;render();}); return; }
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  showModal(`<h2>Installa Gym Tracker</h2>${ios?'<p>Su iPhone: apri questa pagina in <b>Safari</b> → pulsante <b>Condividi</b> → <b>Aggiungi alla schermata Home</b> → attiva “Apri come app”.</p>':'<p>Apri il menu del browser e scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.</p>'}<p class="subtle">Per essere installabile come PWA la cartella deve essere pubblicata tramite HTTPS. Il file standalone incluso nel pacchetto può invece essere usato come visualizzatore senza installazione.</p><button class="primary-btn" onclick="closeModal()">Ho capito</button>`);
}

function filterHistoryCards(value){ state.ui.historyQuery=String(value||'');saveState();const q=cleanKey(value);let visible=0;document.querySelectorAll('.history-card[data-search]').forEach(card=>{const show=!q||String(card.dataset.search||'').includes(q);card.classList.toggle('hidden-filter',!show);if(show)visible++;});const count=$('#historyVisibleCount');if(count)count.textContent=visible; }
function setHistoryWorkout(value){ state.ui.historyWorkout=value||'ALL';saveState();render(); }
const BENCH_GLOBAL_NAME='Panca piana — globale';
function setProgressMetric(metric){ state.ui.progressMetric=['e1rm','kg','volume','rpe'].includes(metric)?metric:'e1rm';saveState();render(); }
function progressMetricLabel(metric,assisted=false){ return metric==='kg'?(assisted?'assistenza':'miglior carico'):metric==='volume'?'volume sessione':metric==='rpe'?'RPE singola':'e1RM stimato'; }
function progressMetricValue(point,metric=state.ui.progressMetric){ return Number(point?.[metric])||0; }
function isBenchExercise(ex){return effectiveMovementId(ex)==='bench-press'||!!ex?.special;}
function benchGlobalData(){const pts=[];for(const sess of [...state.history].reverse()){for(const ex of sess.exercises||[]){if(!isBenchExercise(ex))continue;const done=(ex.sets||[]).filter(st=>st.done&&Number(st.kg)>0&&Number(st.reps)>0);if(!done.length)continue;let bestKg=0,bestE=0,volume=0,top=null;for(const st of done){const kg=Number(st.kg)||0,reps=Number(st.reps)||0,rir=rirEquivalent(st)||0;bestKg=Math.max(bestKg,kg);volume+=kg*reps;if(reps<=12)bestE=Math.max(bestE,kg*(1+(reps+rir)/30));if(reps===1&&(!top||kg>Number(top.kg)))top=st;}pts.push({date:sess.startedAt,kg:bestKg,e1rm:bestE,volume:Math.round(volume),rpe:top&&String(top.metric||'').toUpperCase()==='RPE'?Number(top.metricValue)||0:0,speed:top?.barSpeed||'',speedScore:benchSpeedScore(top?.barSpeed),workout:sess.workout,variant:ex.special==='bench_upper'?'B · fermo':ex.special==='bench_push'?'A · principale':ex.name});}}return pts;}
function benchSummary(data){const singles=data.filter(x=>x.rpe>0),last=singles[singles.length-1],bestE=data.length?Math.max(...data.map(x=>x.e1rm||0)):0;let sameLoad='';if(last){const prior=[...singles].reverse().find((x,i)=>i>0&&Math.abs((x.kg||0)-(last.kg||0))<.01);if(prior)sameLoad=`${fmtKg(last.kg)} kg: RPE ${prior.rpe} → ${last.rpe}`;}return{last,bestE,sameLoad,exposures:data.length,lastSpeed:last?.speed||''};}


function nav(){
  const v=state.ui.view==='session'?'home':state.ui.view;
  const items=[['home','⌂','Oggi'],['program','▤','Scheda'],['history','◷','Storico'],['progress','↗','Progressi'],['settings','⚙','Altro']];
  return `<nav class="bottom-nav"><div class="bottom-nav-inner">${items.map(([id,ic,l])=>`<button class="nav-btn ${v===id?'active':''}" onclick="setView('${id}')"><b>${ic}</b>${l}</button>`).join('')}</div></nav>`;
}
function shell(content,title='Gym Tracker',sub='PPL + Upper / Lower'){
  return `<div class="app-shell"><header class="topbar"><div class="topbar-row"><div class="brand">${esc(title)}<small>${esc(sub)}</small></div>${state.currentSession&&state.ui.view!=='session'?'<button class="chip-btn" onclick="resumeWorkout()">Riprendi</button>':''}</div></header><main class="content">${state.ui.view==='session'?'':pendingWeekAdvanceCard()}${content}</main>${nav()}</div>`;
}
function weekSelector(){ const count=programWeekCount(); if(count<=1)return''; return `<div class="week-grid">${Array.from({length:count},(_,i)=>i+1).map(w=>`<button class="week-btn ${state.currentWeek===w?'active':''}" onclick="setWeek(${w})">${w}</button>`).join('')}</div>`; }
function preCycleCard(compact=false){
  const pre=currentPreCycleStep(), total=preCycleCount(); if(!pre)return'';
  const done=Number(state.preCycleStep)||0, title=`PONTE ${done+1}/${total}`;
  return `<section class="card ${compact?'flat':''} bridge-card"><div class="row between"><span class="badge warn">${title}</span><span class="badge">${esc(pre.phase||'Preparazione')}</span></div><h3 style="margin:10px 0 6px">${esc(pre.target||'')}</h3><p class="subtle">RPE ${esc(pre.rpe||'--')} · recupero ${esc(pre.rest||'--')} · ${esc(pre.note||'')}</p><div class="row bridge-actions"><button class="chip-btn" onclick="setPreCycleStep(${done+1})">Segna completato</button><button class="chip-btn" onclick="setPreCycleStep(${total})">Salta ponte</button></div></section>`;
}

function suggestionModeLabel(mode){ return mode==='increase'?'PROGRESSIONE':mode==='decrease'?'RIDUCI FATICA':mode==='recalc'?'RICALCOLO':mode==='initial'?'PARTENZA':'MANTIENI'; }
function suggestionModeClass(mode){ return mode==='increase'?'up':mode==='decrease'?'down':mode==='recalc'?'recalc':'hold'; }
function workoutLoadTips(workout,limit=4){
  return (workout?.exercises||[]).filter(ex=>!ex.special&&!Array.isArray(ex.plannedSets)&&Number(ex.sets)>0).map(ex=>({ex,s:suggestedLoad(ex)})).filter(x=>x.s).sort((a,b)=>{const rank={increase:0,decrease:1,recalc:2,maintain:3,initial:4};return (rank[a.s.mode]??9)-(rank[b.s.mode]??9);}).slice(0,limit);
}
function renderHome(){
  const next=nextWorkoutName(), wk=currentBenchPlan(), ad=currentAdaptation(), wo=getAdjustedWorkout(next), weeks=programWeekCount();
  const last=state.history[0], imported=!!state.activeProgram, stats=rangeStats(7), streak=trainingWeekStreak(), cal=recentCalendar(28);
  let content='';
  if(state.currentSession){const p=sessionProgress();content+=`<section class="card install-banner"><div class="row between"><div><span class="badge green">SESSIONE ATTIVA</span><div class="next-name" style="margin-top:7px">${esc(state.currentSession.workout)}</div><div class="subtle">${p.done}/${p.total} blocchi · ${p.pct}% completato</div></div><button class="start" style="border:0;background:var(--accent);border-radius:14px;min-height:52px;padding:0 16px;font-weight:900" onclick="resumeWorkout()">Riprendi</button></div></section>`;}
  if(wk){
    const pre=currentPreCycleStep();
    if(pre) content+=`<section class="card hero"><div class="row between"><span class="badge warn">PONTE ${Number(state.preCycleStep)+1}/${preCycleCount()}</span><span class="badge">${esc(pre.phase||'Preparazione')}</span></div><h1 style="margin-top:12px">${esc(programTitle())}</h1><p>${esc(pre.note||'Completa le due esposizioni ponte prima della W1.')}</p><div class="kpi-grid"><div class="kpi"><strong>${esc(pre.target||'—')}</strong><span>prossima panca</span></div><div class="kpi"><strong>${esc(pre.rest||'—')}</strong><span>recupero</span></div><div class="kpi"><strong>RPE ${esc(pre.rpe||'—')}</strong><span>target</span></div></div></section>`;
    else content+=`<section class="card hero"><div class="row between"><span class="badge">SETTIMANA ${state.currentWeek}/${weeks}</span><span class="badge ${state.currentWeek>=Math.max(weeks-1,1)?'warn':'green'}">${esc(wk?.phase||'')}</span></div><h1 style="margin-top:12px">${esc(programTitle())}</h1><p>${esc(ad?.goal||programSubtitle()||'Progressione controllata')} ${ad?.note?`· ${esc(ad.note)}`:''}</p>${weekSelector()}<div class="kpi-grid"><div class="kpi"><strong>${esc(wk?.pushTop||'—')}</strong><span>Push · top set</span></div><div class="kpi"><strong>${esc(wk?.upperWork||'—')}</strong><span>Upper · fermo</span></div><div class="kpi"><strong>RPE ${esc(wk?.rpe||'—')}</strong><span>target panca</span></div></div></section>`;
  }else{
    content+=`<section class="card hero"><div class="row between"><span class="badge">${weeks>1?`SETTIMANA ${state.currentWeek}/${weeks}`:'SCHEDA ATTIVA'}</span><span class="badge green">${imported?'IMPORTATA':'PRONTA'}</span></div><h1 style="margin-top:12px">${esc(programTitle())}</h1><p>${esc(programSubtitle()||'Carichi precompilati automaticamente dallo storico quando disponibili.')}</p>${weekSelector()}<div class="kpi-grid"><div class="kpi"><strong>${programSplit().length}</strong><span>sedute nello split</span></div><div class="kpi"><strong>${state.history.length}</strong><span>sessioni nello storico</span></div><div class="kpi"><strong>AUTO</strong><span>carichi da storico</span></div></div></section>`;
  }
  const loadTips=workoutLoadTips(wo,4);
  content+=`<div class="section-title"><h2>Prossima seduta</h2><span>${last?`dopo ${esc(last.workout)}`:'inizio split'}</span></div><section class="card next-card"><div class="row between"><div><div class="next-name">${esc(next)}</div><div class="subtle">${wo.exercises.length} esercizi · circa ${wo.estimatedMin} min</div></div><span class="badge green">PRONTA</span></div>${loadTips.length?`<div class="load-preview"><div class="load-preview-title">Carichi suggeriti dallo storico</div>${loadTips.map(({ex,s})=>`<div class="load-preview-row"><div><b>${esc(ex.name)}</b><small>${esc(s.reason)}</small></div><span class="load-value">${fmtKg(s.next)} kg</span></div>`).join('')}</div>`:''}<button class="primary-btn" onclick="startWorkout(decodeURIComponent('${encodedArg(next)}'))">Avvia ${esc(next)}</button></section>`;
  content+=`<div class="section-title"><h2>Ultimi 7 giorni</h2><span>${streak?`${streak} sett. consecutive`:'inizia a registrare'}</span></div><section class="card"><div class="stat-grid three"><div class="stat-card"><strong>${stats.sessions}</strong><span>sedute</span></div><div class="stat-card"><strong>${stats.sets}</strong><span>serie completate</span></div><div class="stat-card"><strong>${stats.volume?`${Math.round(stats.volume/100)/10} t`:'—'}</strong><span>volume registrato</span></div></div><div class="calendar-strip" aria-label="Attività ultimi 28 giorni">${cal.map(d=>`<span class="calendar-day level-${Math.min(3,d.count)}" title="${fmtDateShort(d.date.toISOString())}: ${d.count} sedute"></span>`).join('')}</div><div class="subtle">Ogni quadratino rappresenta un giorno; l’intensità indica quante sessioni hai registrato.</div></section>`;
  content+=`<div class="section-title"><h2>Tutte le sedute</h2><span>avvio rapido</span></div><div class="workout-list">${programSplit().map(name=>{const w=getAdjustedWorkout(name),prev=lastWorkoutSession(name);return `<div class="workout-card"><div><h3>${esc(name)}</h3><p>${w.exercises.length} esercizi · ~${w.estimatedMin} min${prev?` · ultima ${fmtDateShort(prev.startedAt)}`:''}</p></div><button class="start" onclick="startWorkout(decodeURIComponent('${encodedArg(name)}'))">Avvia</button></div>`}).join('')}</div>`;
  if(!isStandalone()) content+=`<section class="card install-banner install-only-browser"><b>Usala come un'app</b><p class="subtle">Installala sulla schermata Home per apertura a schermo intero e accesso rapido.</p><button class="secondary-btn" onclick="installApp()">Come installarla</button></section>`;
  return shell(content);
}
function renderProgram(){
  const ad=currentAdaptation(), wk=currentBenchPlan(), imported=!!state.activeProgram;
  let c=`<section class="card"><div class="row between"><div><span class="badge">${programWeekCount()>1?`SETTIMANA ${state.currentWeek}`:'PROGRAMMA'}</span><h2 style="margin:8px 0 4px">${esc(programTitle())}</h2><div class="subtle">${esc(wk?.phase||programSubtitle()||'Carichi automatici collegati allo storico')}</div></div><span class="badge ${imported?'green':''}">${imported?'IMPORTATA':'ORIGINALE'}</span></div>${weekSelector()}</section>`;
  c+=preCycleCard();
  for(const name of programSplit()){const w=getAdjustedWorkout(name),prev=lastWorkoutSession(name);c+=`<div class="section-title"><h2>${esc(name)}</h2><span>${prev?`ultima ${fmtDateShort(prev.startedAt)} · `:''}~${w.estimatedMin} min</span></div><section class="card flat">${w.exercises.map(ex=>{const pre=currentPreCycleStep();let target=ex.special?(pre?pre.target:(wk?(ex.special==='bench_push'?wk?.pushTop+' + '+wk?.pushBackoff:wk?.upperWork):'')):`${ex.sets?`${ex.sets} × `:''}${ex.reps}`;const sg=!ex.special&&!Array.isArray(ex.plannedSets)?suggestedLoad(ex):null;return `<div class="setting-row"><div><h4>${esc(ex.name)}</h4><p>${esc(ex.equipment)} · ${esc(target||'')}${sg?` · <span class="green">${fmtKg(sg.next)} kg · ${suggestionModeLabel(sg.mode).toLowerCase()}</span>`:''}</p></div><span class="badge ${ex.special?'green':''}">${ex.special?'PANCA':ex.restSec?fmtTime(ex.restSec):'—'}</span></div>`}).join('')}<button class="secondary-btn workout-inline-start" onclick="startWorkout(decodeURIComponent('${encodedArg(name)}'))">Avvia ${esc(name)}</button></section>`;}
  if(ad)c+=`<section class="card"><b>Adattamento settimana</b><p class="subtle">Push/Upper: ${esc(ad?.pushUpper||'—')}</p><p class="subtle">Pull/Legs/Lower: ${esc(ad?.other||'—')}</p></section>`;
  return shell(c,'Scheda','programma attuale');
}
function renderSession(){
  const ss=state.currentSession; if(!ss){state.ui.view='home';saveState();return renderHome();}
  const p=sessionProgress(), lastDone=latestCompletedSet();
  const started=fmtDate(ss.startedAt); let c=`<section class="card"><div class="row between"><div><span class="badge green">${esc(ss.workout)} · ${ss.preCycleStepAtStart!==null&&ss.preCycleStepAtStart!==undefined?`PONTE ${Number(ss.preCycleStepAtStart)+1}`:`W${ss.week}`}</span><h1 style="margin:8px 0 2px;font-size:26px">Allenamento</h1><div class="subtle">iniziato ${started}</div></div><button class="icon-btn" onclick="setView('home')" aria-label="Torna alla home">×</button></div><div class="session-kpis" style="margin-top:14px"><div class="kpi"><strong id="elapsedTime">00:00</strong><span>tempo</span></div><div class="kpi"><strong>${p.done}/${p.total}</strong><span>blocchi</span></div><div class="kpi"><strong>${p.pct}%</strong><span>completato</span></div></div><div class="progress-shell" style="margin-top:12px"><div class="progress-bar" style="width:${p.pct}%"></div></div>${lastDone?`<button class="undo-btn" onclick="undoLastCompletedSet()">↶ Annulla ultima serie · ${esc(lastDone.ex.name)}</button>`:''}</section>`;
  ss.exercises.forEach((ex,i)=>{const open=state.ui.openExercise===i;const exDone=ex.sets?.length?ex.sets.every(s=>s.done):ex.done;const sugg=ex.loadSuggestion||null;const prev=lastExerciseData(ex);const prevSets=(prev?.sets||[]).filter(s=>s.done);const showMetric=state.settings.showRir||!!ex.special;const step=loadStepFor(ex);
    c+=`<section class="card exercise-card ${exDone?'done':''} ${open?'current':''}"><div class="exercise-head" onclick="openExercise(${i})"><div><h3>${exDone?'✓ ':''}${esc(ex.name)}</h3><p>${esc(ex.equipment||'')} ${ex.replacement?`· sostituzione`:''}</p></div><span class="badge ${exDone?'green':''}">${ex.special?'PANCA':ex.sets?.length?`${ex.sets.filter(s=>s.done).length}/${ex.sets.length}`:'WARM'}</span></div>`;
    if(open){c+=`<div class="exercise-body"><div class="exercise-meta"><span class="meta-pill">Target ${esc(ex.special?benchTargetText(ex.special,ss.week):`${ex.sets||''} × ${ex.reps}`)}</span>${ex.restSec?`<span class="meta-pill">Rec ${fmtTime(ex.restSec)}</span>`:''}${showMetric&&ex.rir&&ex.rir!=='—'?`<span class="meta-pill">RIR ${esc(ex.rir)}</span>`:''}</div>`;
      if(ex.special){const benchWeek=ss.preCycleStepAtStart!==null&&ss.preCycleStepAtStart!==undefined?(activeProgram().preCycle?.[ss.preCycleStepAtStart]||null):(activeProgram().benchPlan?.[ss.week-1]||null);c+=`<div class="card flat protocol-card"><b>${esc(benchWeek?.phase||'Panca')}</b><div class="subtle">${esc(benchWeek?.note||'')}</div></div>`;}
      if(sugg){c+=`<div class="suggestion-box ${suggestionModeClass(sugg.mode)}"><div class="suggestion-top"><span class="badge">${suggestionModeLabel(sugg.mode)}</span><b>${fmtKg(sugg.recommendedKg)} kg consigliati</b></div><div>${esc(sugg.reason||'Carico derivato dallo storico.')}</div>${sugg.lastSummary?`<small>Ultima prestazione: ${esc(sugg.lastSummary)} · confidenza ${esc(sugg.confidence||'bassa')}</small>`:''}</div>`;}
      if(prevSets.length)c+=`<div class="previous-box"><div><b>Ultima volta</b><div class="subtle">${prevSets.map(x=>`${x.kg||'—'}×${x.reps||'—'} ${esc(x.metric||'RIR')} ${x.metricValue??'—'}`).join(' · ')}</div></div>${!ex.special&&!Array.isArray(ex.plannedSets)?`<button onclick="copyLastPerformance(${i})">Copia</button>`:''}</div>`;
      if(!ex.sets?.length){c+=`<div class="warmup-box"><div><b>${esc(ex.reps)}</b><div class="subtle">${esc(ex.note||'Preparazione')}</div></div><button onclick="completeWarmup(${i})">${ex.done?'Annulla':'Fatto'}</button></div>`;}
      else{
        c+=`<div class="set-table"><div class="set-row header ${showMetric?'':'no-metric'}"><span>Set</span><span>Kg</span><span>Reps</span>${showMetric?`<span>${ex.sets[0]?.metric==='RPE'?'RPE':'RIR'}</span>`:''}<span>OK</span></div>${ex.sets.map((s,si)=>`<div class="set-row ${showMetric?'':'no-metric'}"><span class="set-label">${esc(s.label)}${s.targetRpe?`<small style="display:block">@${s.targetRpe}</small>`:s.targetRange?`<small style="display:block">${esc(s.targetRange)} rep</small>`:''}</span><input class="num-input" inputmode="decimal" type="number" step="any" value="${esc(s.kg)}" oninput="updateSetField(${i},${si},'kg',this.value)" aria-label="Kg set ${si+1}"><input class="num-input" inputmode="numeric" type="number" step="1" value="${esc(s.reps)}" oninput="updateSetField(${i},${si},'reps',this.value)" aria-label="Ripetizioni set ${si+1}">${showMetric?`<select class="metric-select" onchange="updateSetField(${i},${si},'metricValue',this.value)" aria-label="${s.metric||'RIR'} set ${si+1}">${s.metric==='RPE'?rpeOptions(s.metricValue):rirOptions(s.metricValue)}</select>`:''}<button class="set-btn ${s.done?'done':''}" onclick="completeSet(${i},${si})" aria-label="${s.done?'Annulla':'Completa'} set ${si+1}">✓</button></div>`).join('')}</div><div class="quick-weight"><button class="step-btn" onclick="adjustActive(${i},'kg',-${step})">−${String(step).replace('.',',')} kg</button><button class="step-btn" onclick="adjustActive(${i},'kg',${step})">+${String(step).replace('.',',')} kg</button><button class="step-btn" onclick="adjustActive(${i},'reps',-1)">−1 rep</button><button class="step-btn" onclick="adjustActive(${i},'reps',1)">+1 rep</button></div>${ex.special?`<div class="bench-speed-list"><b>Velocità percepita</b>${ex.sets.map((bs,bsi)=>`<label><span>${esc(bs.label)}</span><select class="select-input" onchange="updateSetField(${i},${bsi},'barSpeed',this.value)">${benchSpeedOptions(bs.barSpeed||'')}</select></label>`).join('')}</div>`:''}${ex.sets?.length?`<div class="series-actions"><button onclick="addSessionSet(${i})">+ ${ex.special||Array.isArray(ex.plannedSets)?'Serie extra':'Serie'}</button><button onclick="removeSessionSet(${i})">− Serie</button></div>`:''}`;
      }
      if(ex.note)c+=`<p class="subtle" style="margin:10px 0 0">${esc(ex.note)}</p>`;
      c+=`<textarea class="notes-input" placeholder="Note rapide…" oninput="setExerciseNote(${i},this.value)">${esc(ex.notes||'')}</textarea><div class="mini-actions ${ex.unplanned?'three':''}"><button onclick="showSubstitutions(${i})">↔ Sostituisci</button><button onclick="startTimer(${ex.restSec||90},decodeURIComponent('${encodedArg(ex.name)}'))">⏱ Timer</button>${ex.unplanned?`<button class="danger-mini" onclick="removeSessionExercise(${i})">Rimuovi</button>`:''}</div></div>`;
    }
    c+='</section>';
  });
  c+=`<section class="card add-exercise-card"><button class="primary-btn" onclick="showAddExerciseToSession()">+ Aggiungi esercizio alla sessione</button><p class="subtle" style="margin:8px 0 0">Puoi aggiungere liberamente un esercizio fuori scheda: carichi e storico verranno mantenuti nel database.</p></section>`;
  c+=`<section class="card"><div class="section-title summary-title"><h2>Riepilogo sessione</h2><span>opzionale</span></div><div class="session-summary-grid"><label><span>Peso corporeo</span><div class="input-suffix"><input class="text-input" inputmode="decimal" type="number" step="0.1" value="${esc(ss.bodyweightKg??'')}" oninput="updateSessionMeta('bodyweightKg',this.value)" placeholder="—"><i>kg</i></div></label><label><span>RPE sessione</span><select class="select-input" onchange="updateSessionMeta('sessionRpe',this.value)"><option value="">—</option>${[1,2,3,4,5,6,7,8,9,10].map(v=>`<option value="${v}" ${Number(ss.sessionRpe)===v?'selected':''}>${v}</option>`).join('')}</select></label></div><textarea class="notes-input" placeholder="Note generali: energie, sonno, fastidi, tecnica…" oninput="updateSessionMeta('notes',this.value)">${esc(ss.notes||'')}</textarea></section>`;
  c+=`<section class="card"><button class="primary-btn" onclick="finishWorkout()">Termina e salva allenamento</button><button class="danger-btn" style="margin-top:8px" onclick="discardWorkout()">Scarta sessione</button></section>`;
  return shell(c,ss.workout,`settimana ${ss.week} · sessione attiva`);
}
function benchTargetText(type,w){const pre=currentPreCycleStep();if(pre)return pre.target||'';const p=activeProgram().benchPlan?.[w-1];return type==='bench_push'?`${p?.pushTop||''} + ${p?.pushBackoff||''}`:`${p?.upperWork||''}`;}

function renderHistory(){
  const workouts=['ALL',...new Set(state.history.map(s=>s.workout).filter(Boolean))];if(!workouts.includes(state.ui.historyWorkout))state.ui.historyWorkout='ALL';
  const base=state.history.filter(s=>state.ui.historyWorkout==='ALL'||s.workout===state.ui.historyWorkout);
  let c=`<section class="card"><div class="row between"><div><h2 style="margin:0">Storico</h2><div class="subtle"><span id="historyVisibleCount">${base.length}</span> di ${state.history.length} allenamenti</div></div><div class="history-actions"><button class="chip-btn" onclick="triggerCSVImport()">Importa</button><button class="chip-btn" onclick="exportCSV()">CSV</button></div></div><div class="history-filter-grid"><input class="text-input" value="${esc(state.ui.historyQuery||'')}" oninput="filterHistoryCards(this.value)" placeholder="Cerca esercizio, workout, note…" aria-label="Cerca nello storico"><select class="select-input" onchange="setHistoryWorkout(this.value)" aria-label="Filtra workout">${workouts.map(w=>`<option value="${esc(w)}" ${state.ui.historyWorkout===w?'selected':''}>${w==='ALL'?'Tutti i workout':esc(w)}</option>`).join('')}</select></div></section>`;
  if(!state.history.length)c+=`<div class="empty"><b>Nessun allenamento ancora</b>Le sessioni concluse compariranno qui.</div>`;
  else if(!base.length)c+=`<div class="empty"><b>Nessuna sessione nel filtro</b>Scegli un altro workout.</div>`;
  else c+=base.map(s=>{const search=cleanKey([s.workout,s.notes,...(s.exercises||[]).flatMap(e=>[e.name,e.notes])].join(' '));return `<section class="card history-card" data-search="${esc(search)}" onclick="showHistoryDetail(decodeURIComponent('${encodedArg(s.id)}'))"><div class="row between"><h3>${esc(s.workout)} · ${s.preCycleStepAtStart!==null&&s.preCycleStepAtStart!==undefined?`PONTE ${Number(s.preCycleStepAtStart)+1}`:`W${s.week}`}</h3><span class="badge ${s.progress===100?'green':'warn'}">${s.progress||0}%</span></div><div class="history-meta"><span>${fmtDate(s.startedAt)}</span><span>· ${s.durationMin||'—'} min</span><span>· ${s.volume||0} kg volume</span>${s.sessionRpe?`<span>· RPE ${s.sessionRpe}</span>`:''}</div>${s.notes?`<div class="history-note">${esc(s.notes)}</div>`:''}<div class="history-exercises">${(s.exercises||[]).filter(e=>(e.sets||[]).some(x=>x.done)).slice(0,4).map(e=>`<div>${esc(e.name)} <span>· ${(e.sets||[]).filter(x=>x.done).map(x=>`${x.kg||'—'}×${x.reps}`).join(' / ')}</span></div>`).join('')}</div></section>`}).join('');
  setTimeout(()=>filterHistoryCards(state.ui.historyQuery||''),0);return shell(c,'Storico','sessioni e dati');
}
function allExerciseNames(){ const set=new Set(); let hasBench=false; Object.values(activeProgram().workouts||{}).forEach(w=>w.exercises.forEach(raw=>{const e=ensureExerciseIdentity(raw);if(e.sets||e.special)set.add(e.name);if(isBenchExercise(e))hasBench=true;})); state.history.forEach(sess=>(sess.exercises||[]).forEach(e=>{set.add(e.name);if(isBenchExercise(e))hasBench=true;})); const names=[...set].sort((a,b)=>a.localeCompare(b,'it'));if(hasBench)names.unshift(BENCH_GLOBAL_NAME);return names; }
function progressData(name){
  if(name===BENCH_GLOBAL_NAME)return benchGlobalData();
  const target=findProgramExercise(name)||name, assisted=typeof target==='object'&&isLowerHarder(target), pts=[];
  for(const sess of [...state.history].reverse()){const ex=(sess.exercises||[]).find(e=>historyExerciseMatches(e,target));if(!ex)continue;let bestKg=assisted?Infinity:0,bestE=0,volume=0;for(const st of ex.sets||[]){if(!st.done)continue;const kg=Number(st.kg)||0,reps=Number(st.reps)||0;if(kg>0)bestKg=assisted?Math.min(bestKg,kg):Math.max(bestKg,kg);volume+=kg*reps;if(!assisted&&reps>0&&reps<=12)bestE=Math.max(bestE,kg*(1+reps/30));}if(Number.isFinite(bestKg)&&bestKg>0||volume)pts.push({date:sess.startedAt,kg:Number.isFinite(bestKg)?bestKg:0,e1rm:bestE,volume:Math.round(volume)});} return pts;
}
function setProgressExercise(name){ state.ui.progressExercise=name;saveState();render(); }
function renderProgress(){
  const names=allExerciseNames(); if(!names.includes(state.ui.progressExercise))state.ui.progressExercise=names[0]||'';
  const name=state.ui.progressExercise,isBench=name===BENCH_GLOBAL_NAME,target=findProgramExercise(name)||name,targetEx=typeof target==='object'?target:null,assisted=targetEx?isLowerHarder(targetEx):isLowerHarder({name});let metric=state.ui.progressMetric||'e1rm';if(assisted&&(metric==='e1rm'||metric==='rpe'))metric='kg';if(!isBench&&metric==='rpe')metric='e1rm';state.ui.progressMetric=metric;
  const data=progressData(name),kgVals=data.map(x=>x.kg).filter(v=>v>0),bestKg=kgVals.length?(assisted?Math.min(...kgVals):Math.max(...kgVals)):0,bestE=!assisted&&data.length?Math.max(...data.map(x=>x.e1rm||0)):0,bestVol=data.length?Math.max(...data.map(x=>x.volume||0)):0;
  let totalSets=0;if(isBench)state.history.forEach(sess=>(sess.exercises||[]).filter(isBenchExercise).forEach(e=>totalSets+=(e.sets||[]).filter(x=>x.done).length));else state.history.forEach(sess=>(sess.exercises||[]).filter(e=>historyExerciseMatches(e,target)).forEach(e=>totalSets+=(e.sets||[]).filter(x=>x.done).length));
  const vals=data.map(x=>progressMetricValue(x,metric)).filter(v=>v>0),first=vals[0]||0,last=vals[vals.length-1]||0,trend=first&&vals.length>1?((assisted&&metric==='kg')||metric==='rpe'?(first-last)/first*100:(last-first)/first*100):null;
  const suggestion=targetEx&&!targetEx.special?suggestedLoad(targetEx):null, bench=isBench?benchSummary(data):null;
  let c=`<section class="card"><h2 style="margin-top:0">Progressi</h2><select class="select-input" onchange="setProgressExercise(this.value)">${names.map(n=>`<option ${n===name?'selected':''}>${esc(n)}</option>`).join('')}</select>${isBench?`<div class="bench-dashboard"><div><span>Ultima singola</span><strong>${bench?.last?`${fmtKg(bench.last.kg)} kg @RPE ${bench.last.rpe}`:'—'}</strong></div><div><span>e1RM RPE-adjusted</span><strong>${bench?.bestE?`${fmtKg(bench.bestE)} kg`:'—'}</strong></div><div><span>Confronto stesso carico</span><strong>${esc(bench?.sameLoad||'servono due singole comparabili')}</strong></div><div><span>Velocità ultima singola</span><strong>${benchSpeedLabel(bench?.lastSpeed)}</strong></div><div><span>Esposizioni registrate</span><strong>${bench?.exposures||0}</strong></div></div>`:''}<div class="segmented" role="group" aria-label="Metrica grafico">${!assisted?`<button class="${metric==='e1rm'?'active':''}" onclick="setProgressMetric('e1rm')">e1RM</button>`:''}<button class="${metric==='kg'?'active':''}" onclick="setProgressMetric('kg')">${assisted?'Assistenza':'Carico'}</button><button class="${metric==='volume'?'active':''}" onclick="setProgressMetric('volume')">Volume</button>${isBench?`<button class="${metric==='rpe'?'active':''}" onclick="setProgressMetric('rpe')">RPE singola</button>`:''}</div><div class="stat-grid"><div class="stat-card"><strong>${bestKg?fmtKg(bestKg)+' kg':'—'}</strong><span>${assisted?'migliore assistenza (meno = meglio)':'miglior carico'}</span></div><div class="stat-card"><strong>${bestE?fmtKg(bestE)+' kg':'—'}</strong><span>${assisted?'e1RM non applicabile':'miglior e1RM'}</span></div><div class="stat-card"><strong>${bestVol?fmtKg(bestVol)+' kg':'—'}</strong><span>miglior volume seduta</span></div><div class="stat-card"><strong>${trend===null?'—':`${trend>=0?'+':''}${trend.toFixed(1)}%`}</strong><span>trend ${progressMetricLabel(metric,assisted)}</span></div></div>${suggestion?`<div class="suggestion-box ${suggestionModeClass(suggestion.mode)}"><div class="suggestion-top"><span class="badge">PROSSIMA VOLTA</span><b>${fmtKg(suggestion.next)} kg</b></div><div>${esc(suggestion.reason)}</div><small>${suggestion.lastSummary?`Ultima: ${esc(suggestion.lastSummary)} · `:''}${suggestion.historyCount} sedute utili · confidenza ${esc(suggestion.confidence)}</small></div>`:''}<div class="chart-wrap"><canvas id="progressChart"></canvas></div><div class="subtle" style="margin-top:8px">Grafico: ${progressMetricLabel(metric,assisted)} per sessione. ${assisted?'Per gli esercizi assistiti meno kg di assistenza significa progresso; e1RM è disattivato.':isBench?'La vista globale combina Panca A, Panca B, singole, back-off e fermo; e1RM usa reps + RIR/RPE.':'e1RM con formula Epley sui set fino a 12 ripetizioni.'} Serie registrate: ${totalSets}.</div></section>`;
  if(data.length<2)c+=`<div class="empty"><b>Servono almeno 2 sessioni</b>Il trend diventa utile dopo qualche allenamento registrato.</div>`;
  setTimeout(()=>drawProgressChart(data,metric),0); return shell(c,'Progressi','carichi, volume e trend');
}
function drawProgressChart(data,metric=state.ui.progressMetric||'e1rm'){
  const canvas=$('#progressChart');if(!canvas)return;const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=rect.height,pad=34;ctx.clearRect(0,0,w,h);ctx.font='11px -apple-system, sans-serif';ctx.strokeStyle='#263241';ctx.fillStyle='#93a4b8';ctx.lineWidth=1;
  const usable=data.map(d=>({...d,value:progressMetricValue(d,metric)})).filter(d=>d.value>0);if(!usable.length){ctx.fillText('Nessun dato',pad,h/2);return;}const vals=usable.map(x=>x.value);let min=Math.min(...vals),max=Math.max(...vals);if(min===max){const margin=Math.max(1,max*.05);min-=margin;max+=margin;}const y=v=>h-pad-(v-min)/(max-min)*(h-pad*2);const x=i=>usable.length===1?w/2:pad+i*(w-pad*2)/(usable.length-1);
  for(let i=0;i<4;i++){const yy=pad+i*(h-pad*2)/3;ctx.beginPath();ctx.moveTo(pad,yy);ctx.lineTo(w-pad,yy);ctx.stroke();const val=max-i*(max-min)/3;ctx.fillText(metric==='volume'?Math.round(val):val.toFixed(0),4,yy+4);}
  ctx.strokeStyle='#7ee787';ctx.lineWidth=2.5;ctx.beginPath();usable.forEach((d,i)=>{const xx=x(i),yy=y(d.value);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke();ctx.fillStyle='#7ee787';usable.forEach((d,i)=>{ctx.beginPath();ctx.arc(x(i),y(d.value),4,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#93a4b8';const step=Math.max(1,Math.ceil(usable.length/4));usable.forEach((d,i)=>{if(i%step===0||i===usable.length-1)ctx.fillText(fmtDateShort(d.date),Math.max(2,x(i)-14),h-8);});
}

function renderSettings(){
  const p=activeProgram(), imported=!!state.activeProgram, lib=state.programLibrary||[];
  let c=`<section class="card"><h2 style="margin-top:0">Durante l'allenamento</h2>${settingToggle('smartLoad','Carichi consigliati intelligenti','Usa storico, range reps e RIR/RPE per proporre il prossimo carico.')}${settingToggle('autoTimer','Timer automatico','Parte quando confermi una serie.')}${settingToggle('vibrate','Vibrazione','Segnale al termine del recupero.')}${settingToggle('wakeLock','Schermo sempre acceso','Se supportato dal browser, evita lo spegnimento durante la sessione.')}${settingToggle('showRir','Mostra RIR / RPE','Permette di modificare la percezione dello sforzo serie per serie.')}</section>`;
  c+=`<section class="card"><div class="row between"><div><h2 style="margin:0">Scheda allenamento</h2><div class="subtle">${esc(programTitle())} · ${imported?'personalizzata':'originale'}</div></div><span class="badge ${imported?'green':''}">${imported?'CUSTOM':'BASE'}</span></div><p class="subtle">Il pacchetto portabile contiene scheda + storico: reimportandolo su un altro dispositivo ritrovi progressioni e carichi consigliati. Il JSON semplice esporta solo la struttura della scheda.</p><div class="action-stack"><button class="primary-btn" onclick="exportPortableProgram()">Esporta scheda + storico</button><button class="secondary-btn" onclick="exportProgram()">Esporta solo scheda</button><button class="secondary-btn" onclick="triggerProgramImport()">Importa scheda / pacchetto</button>${imported?`<button class="secondary-btn" onclick="saveActiveProgramToLibrary()">Salva scheda in libreria</button><button class="secondary-btn" onclick="restoreDefaultProgram()">Torna alla scheda originale</button>`:''}</div></section>`;
  c+=`<section class="card"><div class="row between"><div><h2 style="margin:0">Libreria schede</h2><div class="subtle">${lib.length} schede salvate · lo storico è unico e resta separato</div></div><span class="badge">LIBRERIA</span></div>${lib.length?`<div class="program-library">${lib.map(item=>`<div class="program-library-row"><div><b>${esc(item.title)}</b><small>salvata ${fmtDateShort(item.savedAt)}</small></div><div><button onclick="activateLibraryProgram(decodeURIComponent('${encodedArg(item.id)}'))">Attiva</button><button class="danger-mini" onclick="removeLibraryProgram(decodeURIComponent('${encodedArg(item.id)}'))">×</button></div></div>`).join('')}</div>`:`<div class="empty compact"><b>Nessuna scheda salvata</b>Importa una scheda o salva quella attiva.</div>`}</section>`;
  c+=`<section class="card"><h2 style="margin-top:0">Storico e backup</h2><div class="data-status"><span><b>${state.history.length}</b><small>sessioni</small></span><span><b>${catalogEntries().length}</b><small>esercizi DB</small></span><span><b>v${APP_VERSION}</b><small>formato dati</small></span></div><div class="action-stack"><button class="secondary-btn" onclick="exportCSV()">Esporta storico CSV</button><button class="secondary-btn" onclick="triggerCSVImport()">Importa / unisci CSV storico</button><button class="secondary-btn" onclick="exportBackup()">Esporta backup completo JSON</button><button class="secondary-btn" onclick="triggerImport()">Ripristina backup completo</button><button class="danger-btn" onclick="resetAll()">Azzera tutti i dati</button></div><p class="subtle" style="margin-bottom:0">L'import CSV è non distruttivo: le sessioni già presenti vengono riconosciute e saltate.</p></section>`;
  c+=renderExerciseCatalogCard();
  c+=renderTransformerCard();
  const stepExercises=[];for(const w of Object.values(p.workouts||{}))for(const raw of w.exercises||[]){const ex=ensureExerciseIdentity(raw);if(!ex.special&&Number(ex.sets)>0&&!stepExercises.some(x=>effectiveExerciseId(x)===effectiveExerciseId(ex)))stepExercises.push(ex);}c+=`<section class="card"><div class="row between"><div><h2 style="margin:0">Step carichi personalizzati</h2><div class="subtle">Imposta lo scatto reale di ogni macchina/manubrio. Se lasci vuoto, l’app usa lo storico e il tipo di attrezzatura.</div></div><span class="badge">SMART LOAD</span></div><div class="load-step-list">${stepExercises.map(ex=>{const id=effectiveExerciseId(ex),custom=state.exerciseSettings?.[id]?.loadStepKg;return `<div class="load-step-row"><div><b>${esc(ex.name)}</b><small>automatico: ${fmtKg(inferredLoadStepFor(ex))} kg</small></div><div class="load-step-control"><input class="num-input" type="number" inputmode="decimal" step="0.5" min="0.5" value="${custom??''}" placeholder="auto" onchange="setExerciseLoadStep(decodeURIComponent('${encodedArg(id)}'),this.value)">${custom?`<button onclick="resetExerciseLoadStep(decodeURIComponent('${encodedArg(id)}'))">×</button>`:''}</div></div>`}).join('')}</div></section>`;
  const eq=Array.isArray(p.equipment)?p.equipment:[];c+=`<section class="card"><div class="row between"><div><h2 style="margin:0">Attrezzatura palestra</h2><div class="subtle">${eq.length} voci disponibili</div></div><span class="badge green">GYM</span></div><div style="margin-top:10px">${eq.map(x=>`<div class="setting-row"><div><h4>${esc(x)}</h4></div><span class="green">✓</span></div>`).join('')}</div></section>`;
  c+=`<section class="card install-banner"><h2 style="margin-top:0">Installazione</h2><p class="subtle">La versione PWA funziona offline dopo il primo caricamento quando viene pubblicata tramite HTTPS.</p><button class="primary-btn" onclick="installApp()">Istruzioni installazione</button></section>`;
  c+=`<div class="app-version">Gym Tracker v${APP_VERSION} · Exercise Memory · Smart Load 4 · local-first</div>`;
  return shell(c,'Altro','schede, storico e backup');
}
function settingToggle(k,title,desc){ return `<div class="setting-row"><div><h4>${title}</h4><p>${desc}</p></div><button class="toggle ${state.settings[k]?'on':''}" onclick="toggleSetting('${k}')" aria-label="${title}"><i></i></button></div>`; }

function render(){
  const app=$('#app'); if(!app)return;
  try{
    let html='';
    switch(state.ui.view){case'program':html=renderProgram();break;case'history':html=renderHistory();break;case'progress':html=renderProgress();break;case'settings':html=renderSettings();break;case'session':html=renderSession();break;default:html=renderHome();}
    app.innerHTML=html; renderTimer(); updateElapsed();
  }catch(e){
    console.error('Errore di rendering', e);
    app.innerHTML=`<section class="card"><h2 style="margin-top:0">Si è verificato un errore</h2><p class="subtle">La schermata non si è potuta visualizzare correttamente. I tuoi dati restano salvati: puoi esportare un backup per sicurezza e poi ricaricare l'app.</p><div class="action-stack"><button class="primary-btn" onclick="exportBackup()">Esporta backup</button><button class="secondary-btn" onclick="location.reload()">Ricarica</button></div></section>`;
  }
}
function updateElapsed(){ const el=$('#elapsedTime');if(!el||!state.currentSession)return;el.textContent=fmtTime((Date.now()-new Date(state.currentSession.startedAt))/1000); }
function isStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true; }

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;render();});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('App installata');render();});
window.addEventListener('resize',()=>{if(state.ui.view==='progress')drawProgressChart(progressData(state.ui.progressExercise),state.ui.progressMetric);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&state.settings.wakeLock&&state.currentSession)requestWakeLock();});
$('#importInput')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const parsed=JSON.parse(await file.text()), incoming=parsed.state||parsed;
    if(!incoming.history||!Array.isArray(incoming.history))throw new Error('history');
    if(!confirm(`Ripristinare il backup con ${incoming.history.length} sessioni? I dati attuali verranno sostituiti.`))return;
    state={...clone(defaultState),...incoming,version:APP_VERSION,activeProgram:incoming.activeProgram?.workouts?incoming.activeProgram:null,programLibrary:Array.isArray(incoming.programLibrary)?incoming.programLibrary.filter(x=>x&&x.program?.workouts):[],history:incoming.history,ui:{...defaultState.ui,...(incoming.ui||{})},settings:{...defaultState.settings,...(incoming.settings||{})},exerciseSettings:{...(incoming.exerciseSettings||{})},exerciseCatalog:{...(incoming.exerciseCatalog||{})}};
    state.history.sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0));state.currentWeek=clamp(Number(state.currentWeek)||1,1,programWeekCount());syncExerciseCatalogFromKnownData();seedPersonalReferences();saveState();render();toast('Backup ripristinato');
  }catch{toast('File backup non valido');}
  e.target.value='';
});
$('#csvInput')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const incoming=historyFromCSV(await file.text()), result=mergeHistory(incoming);syncExerciseCatalogFromKnownData();seedPersonalReferences();saveState();render();toast(result.added||result.updated?`${result.added} nuove · ${result.updated} aggiornate · ${result.skipped} già complete`:`Nessuna nuova sessione · ${result.skipped} già presenti`);}catch(err){console.warn(err);toast('CSV storico non riconosciuto');}
  e.target.value='';
});
$('#programInput')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    if(state.currentSession) throw new Error('sessione');
    const parsed=JSON.parse(await file.text()), isPackage=parsed?.type==='gym-tracker-program-package'||(parsed?.program?.workouts&&Array.isArray(parsed?.history));
    const program=normalizeProgram(parsed?.program||parsed), workouts=program.splitOrder.length, exercises=Object.values(program.workouts).reduce((n,w)=>n+w.exercises.length,0), incomingHistory=isPackage&&Array.isArray(parsed.history)?parsed.history:[];
    const historyText=incomingHistory.length?` Il pacchetto contiene anche ${incomingHistory.length} sessioni, che verranno unite senza duplicati.`:` Lo storico attuale (${state.history.length} sessioni) resterà intatto.`;
    if(!confirm(`Importare la scheda “${program.title}” (${workouts} sedute, ${exercises} esercizi)?${historyText}`))return;
    state.activeProgram=saveProgramToLibrary(program);let merged={added:0,skipped:0,updated:0};if(incomingHistory.length)merged=mergeHistory(incomingHistory);
    if(isPackage&&parsed.settings?.smartLoad!==undefined)state.settings.smartLoad=!!parsed.settings.smartLoad;if(isPackage&&parsed.exerciseSettings&&typeof parsed.exerciseSettings==='object')state.exerciseSettings={...state.exerciseSettings,...parsed.exerciseSettings};if(isPackage&&parsed.exerciseCatalog&&typeof parsed.exerciseCatalog==='object')state.exerciseCatalog={...state.exerciseCatalog,...parsed.exerciseCatalog};
    state.version=APP_VERSION;state.currentWeek=clamp(Number(parsed.currentWeek||program.startWeek)||1,1,programWeekCount());state.preCycleStep=clamp(Number(parsed.preCycleStep)||0,0,preCycleCount());state.weekStartedAt=parsed.weekStartedAt||new Date().toISOString();state.pendingWeekAdvance=null;state.ui.view='program';state.ui.openExercise=0;syncExerciseCatalogFromKnownData();seedPersonalReferences();saveState();render();toast(incomingHistory.length?`Scheda importata · ${merged.added} nuove · ${merged.updated} aggiornate`:'Nuova scheda importata');
  }catch(err){console.warn(err);toast(err?.message==='sessione'?'Termina la sessione prima di cambiare scheda':'File scheda non valido');}
  e.target.value='';
});
if('serviceWorker' in navigator && location.protocol!=='file:') window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(r=>r.update()).catch(()=>{}));
try{const requested=new URLSearchParams(location.search).get('view');if(['home','program','history','progress','settings'].includes(requested))state.ui.view=requested;}catch(e){}
syncExerciseCatalogFromKnownData();seedPersonalReferences();saveState();
setInterval(()=>{renderTimer();updateElapsed();},500);
render();
