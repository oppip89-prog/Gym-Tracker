/* GymTracker 9.9 Personal Edition. Local profiles, selective sharing and recovery. */
const PERSONAL_KEYS={daily:STORAGE_KEY+'::daily',previous:STORAGE_KEY+'::pre-upgrade',change:STORAGE_KEY+'::pre-change'};
function personalIcon(name){
  const icons={home:'<path d="M3 11 12 3l9 8v10h-6v-7H9v7H3z"/>',program:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',gyms:'<path d="M2 9v6m4-8v10m12-10v10m4-8v6M6 12h12"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',progress:'<path d="M3 20V4m0 16h18M6 15l5-5 4 3 6-8m-5 0h5v5"/>',settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="12" r="2.5"/><circle cx="10" cy="18" r="2.5"/>',backup:'<path d="M5 8V4h14v4M3 9h18v11H3zM9 13h6"/>',watch:'<rect x="6" y="6" width="12" height="12" rx="4"/><path d="M9 6V2h6v4M9 18v4h6v-4M9 12h6"/>',heart:'<path d="M12 21 4 13C-2 5 8 1 12 8c4-7 14-3 8 5z"/>',share:'<circle cx="6" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4m-7 7 7 4"/>',plus:'<path d="M12 4v16M4 12h16"/>'};
  return `<span class="orb orb-${name}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.plus}</svg></span>`;
}
function backupEnvelope990(s=state){return{type:'gym-tracker-backup',schemaVersion:3,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),state:s};}
function localRead990(key){try{return localStorage.getItem(key);}catch(e){return null;}}
function checkpoint990(kind='daily',raw=null){
  const key=kind==='pre-change'?PERSONAL_KEYS.change:kind==='pre-upgrade'?PERSONAL_KEYS.previous:PERSONAL_KEYS.daily;
  if(state.storageRecoveryRequired&&raw===null)return true; // Keep corrupted original, not a blank replacement.
  try{const value=JSON.stringify({createdAt:new Date().toISOString(),state:raw===null?state:JSON.parse(raw)});const slot=kind==='pre-change'?'change':kind==='pre-upgrade'?'previous':'daily';if(window.AndroidBridge?.writeCheckpoint)return window.AndroidBridge.writeCheckpoint(slot,value);localStorage.setItem(key,value);return true;}catch(e){console.warn('Checkpoint non salvato',e);return false;}
}
function dateStamp990(){return new Date().toISOString().slice(0,10);}
function downloadJson990(payload,name){downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`GymTracker-${name}-${dateStamp990()}.json`);}
function checkpointRecord990(kind){const key=PERSONAL_KEYS[kind];if(!key)return null;let raw;try{raw=window.AndroidBridge?.readCheckpoint?.(kind)||localRead990(key);}catch(e){raw=localRead990(key);}if(!raw)return null;try{const p=JSON.parse(raw);return p.state? p:{state:p,createdAt:''};}catch(e){return null;}}
function readCheckpoint990(kind){return checkpointRecord990(kind)?.state||null;}
function backupAge990(kind){const record=checkpointRecord990(kind),s=record?.state;return s?`${s.history?.length||0} sedute · v${s.version||'?'}${record.createdAt?' · '+fmtDate(record.createdAt):''}`:'Non disponibile';}
function exportCheckpoint990(kind){const s=readCheckpoint990(kind);if(!s){toast('Nessuna copia locale disponibile');return;}downloadJson990(backupEnvelope990(s),'recupero-'+kind);}
function exportBackup(){downloadJson990(backupEnvelope990(),'backup-completo-PRIVATO');}
// Validate the structural minimum, preserve every legacy field (including specialized plans and health samples).
function validateFull990(payload){
  if(payload?.type&&payload.type!=='gym-tracker-backup')throw Error('Seleziona un backup completo GymTracker, non una scheda o uno storico parziale');
  const s=payload?.state||payload;
  if(!s||typeof s!=='object'||Array.isArray(s)||!Array.isArray(s.history))throw Error('Backup non valido: manca lo storico');
  if(s.activeProgram!=null&&(!s.activeProgram.workouts||typeof s.activeProgram.workouts!=='object'))throw Error('Backup non valido: scheda');
  for(const k of ['programLibrary','gymProfiles'])if(s[k]!=null&&!Array.isArray(s[k]))throw Error('Backup non valido: '+k);
  for(const k of ['exerciseCatalog','exerciseSettings','settings','ui'])if(s[k]!=null&&(typeof s[k]!=='object'||Array.isArray(s[k])))throw Error('Backup non valido: '+k);
  for(const h of [...s.history,...(s.currentSession?[s.currentSession]:[])])if(!h||typeof h!=='object'||!Array.isArray(h.exercises)||!h.id||!Number.isFinite(Date.parse(h.startedAt)))throw Error('Backup non valido: sessione incompleta');
  return clone(s);
}
function prepareRestore990(payload){
  const incoming=validateFull990(payload),legacy=incoming.version!==APP_VERSION;
  const defaults=legacy?{...defaultState.settings,autoOpenWatch:true,autoWatchHealth:true,autoHealthExport:true}:defaultState.settings;
  const candidate={...clone(defaultState),...incoming,version:APP_VERSION,onboardingComplete:true,seedHistoryDisabled:true,storageRecoveryRequired:false,
    activeProgram:incoming.activeProgram?.workouts?incoming.activeProgram:incoming.program?.workouts?incoming.program:null,
    programLibrary:incoming.programLibrary||[],gymProfiles:incoming.gymProfiles||[],history:incoming.history,
    settings:{...defaults,...(incoming.settings||{})},ui:{...defaultState.ui,...(incoming.ui||{}),view:incoming.currentSession?'session':'home'},
    exerciseCatalog:incoming.exerciseCatalog||{},exerciseSettings:incoming.exerciseSettings||{}};
  candidate.history.sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt));
  if(!candidate.activeGymId)candidate.activeGymId=String(incoming.activeGym?.id||incoming.activeGym||'');
  candidate.currentWeek=Math.max(1,Math.min(Number(candidate.activeProgram?.weeks)||candidate.activeProgram?.benchPlan?.length||1,Number(candidate.currentWeek)||1));
  return candidate;
}
async function restoreFull990(payload){
  if(state.currentSession)throw Error('Termina o scarta la sessione attiva prima del ripristino');
  const candidate=prepareRestore990(payload);
  if(!confirm(`Ripristinare ${candidate.history.length} allenamenti, ${candidate.programLibrary.length} schede in libreria e ${candidate.gymProfiles.length} palestre? I dati locali verranno sostituiti. Usa solo backup di fiducia.`))return false;
  if(!checkpoint990('pre-change'))throw Error('Spazio insufficiente per una copia di sicurezza. Esporta il backup attuale e libera spazio.');
  // Commit to storage before switching the live state. On failure leave prior data untouched.
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(candidate));}catch(e){throw Error('Memoria insufficiente: ripristino non applicato');}
  window.AndroidBridge?.setHealthAutoExport?.(false);
  state=candidate;syncExerciseCatalogFromKnownData();ensureGymState();
  window.AndroidBridge?.setHealthAutoExport?.(state.settings.autoHealthExport!==false);
  saveState();window.GymWatchBridge?.publish();render();toast('Backup completo ripristinato');return true;
}
function restoreCheckpoint990(kind){const s=readCheckpoint990(kind);if(!s){toast('Nessuna copia disponibile');return;}restoreFull990(backupEnvelope990(s)).catch(e=>toast(e.message));}
// Build a new, portable program with an explicit allowlist. No IDs from personal machine profiles,
// notes, gym maps, historic references, readiness or health data. For bench plans, convert the
// selected week to normal sets. Full-fidelity specialized plans remain in the PRIVATE full backup.
function sharedProgram990(program,week,withLoads=false,suggest=()=>null){
  if(!program?.workouts||!Object.keys(program.workouts).length)throw Error('Nessuna scheda attiva');
  const workouts=Object.create(null),splitOrder=[];
  const text=(v,n=100)=>String(v??'').slice(0,n);
  const count=(v,max=100)=>Math.min(max,Math.max(0,Math.round(Number(v)||0)));
  for(const [key,w] of Object.entries(program.workouts)){
    if(['__proto__','constructor','prototype'].includes(key)||!Array.isArray(w?.exercises))continue;
    splitOrder.push(key);
    workouts[key]={name:text(w.name||key),exercises:w.exercises.map(ex=>{
      const special=ex.special,bench=program.benchStructured?.[String(week)],arr=special==='bench_push'?bench?.push:special==='bench_upper'?bench?.upper:null;
      const sets=Array.isArray(arr)?arr:Array.isArray(ex.plannedSets)?ex.plannedSets:Array.isArray(ex.sets)?ex.sets:null;
      const reps=sets?.length?(Array.isArray(sets[0])?sets[0][2]:sets[0]?.reps):ex.reps;
      const rest=arr?(special==='bench_push'?bench?.pushRest:bench?.upperRest):ex.restSec;
      const name=text(ex.name).replace(/\s*[-–—]\s*Protocollo [AB]\b/i,'');
      const out={name,equipment:text(ex.equipment),sets:sets?sets.length:count(ex.sets,24),reps:text(reps??ex.reps,50),rir:text(special?'2':ex.rir??'2',20),restSec:count(rest,1800),fixedMin:count(ex.fixedMin,60),loadMode:['total','per-hand','assistance'].includes(ex.loadMode)?ex.loadMode:'total',autoLoad:true};
      if(ex.technique&&['standard','pause','dropset','restpause','tempo'].includes(ex.technique.mode))out.technique={mode:ex.technique.mode,pauseSeconds:count(ex.technique.pauseSeconds,5),eccentricSeconds:count(ex.technique.eccentricSeconds,10)};
      if(sets?.length){
        // Preserve set-by-set rep targets (not the personal weights) through progression for generic sessions.
        out.progression={sets:sets.map(st=>{const r=Array.isArray(st)?st[2]:st.reps;const nums=String(r??'').match(/\d+/g)||[];return{minReps:count(nums[0],100)||1,maxReps:count(nums[1]||nums[0],100)||1};})};
      }
      if(withLoads){const first=sets?.[0],raw=Array.isArray(first)?first[1]:first?.kg;const kg=Number(raw??ex.initialKg??suggest(ex));if(Number.isFinite(kg)&&kg>0)out.initialKg=kg;}
      return out;
    })};
  }
  const order=(program.splitOrder||[]).filter(k=>Object.hasOwn(workouts,k));
  // One-week snapshot, not an inaccurate transfer of a periodized personal program.
  return {title:text(program.title||'Scheda condivisa',150).replace(/\bTM\s*\d+(?:[.,]\d+)?\b/gi,'').replace(/\s*·\s*·/g,' ·').trim(),subtitle:'Scheda condivisa · struttura della settimana selezionata',weeks:1,startWeek:1,splitOrder:[...new Set([...order,...splitOrder])],workouts};
}
function exportSharedProgram990(withLoads=false){
  if(withLoads&&!confirm('Condividere anche i carichi di partenza della settimana selezionata? Non vengono inclusi storico, dati salute o palestre.'))return;
  try{const p=sharedProgram990(activeProgram(),state.currentWeek,withLoads,ex=>suggestedLoad(ex)?.next);downloadJson990({type:'gym-tracker-program',schemaVersion:1,appVersion:APP_VERSION,program:p},withLoads?'scheda-con-carichi':'scheda-senza-carichi');}catch(e){toast(e.message);}
}
// Replace old "only program" action with safe sharing.
exportProgram=function(){exportSharedProgram990(false);};
function exportHistory990(){if(!confirm('Lo storico JSON contiene dati personali e può includere dati cardiaci. Esportarlo?'))return;downloadJson990({type:'gym-tracker-history',schemaVersion:1,history:clone(state.history)},'storico-PRIVATO');}
const PREF_KEYS990=['autoTimer','vibrate','wakeLock','showRir','smartLoad','accessoryDeloadEnabled','accessoryDeloadFactor','autoWarmup','adaptiveReadiness','adaptiveTime','muscleRecovery','effortFeedback','autoOpenWatch','autoWatchHealth','autoHealthExport','autoBackup','healthAdaptive','maxHeartRate'];
function selectedPrefs990(source){const out={};for(const k of PREF_KEYS990){const v=source?.[k];if(typeof v==='boolean')out[k]=v;else if(k==='accessoryDeloadFactor'&&typeof v==='number'&&v>=.5&&v<=1)out[k]=v;else if(k==='maxHeartRate'&&Number.isInteger(v)&&(v===0||v>=100&&v<=240))out[k]=v;}return out;}
function exportPrefs990(){downloadJson990({type:'gym-tracker-settings',schemaVersion:1,settings:selectedPrefs990(state.settings)},'preferenze-PRIVATE');}
function triggerPartial990(){document.getElementById('personalImportInput')?.click();}
async function importPartial990(payload){
  if(state.currentSession)throw Error('Termina prima la sessione attiva');
  if(payload?.type==='gym-tracker-history'){
    const history=validateFull990({history:payload.history}).history;
    if(!confirm(`Unire ${history.length} allenamenti allo storico locale?`))return;
    if(!checkpoint990('pre-change'))throw Error('Copia di sicurezza non disponibile');
    const result=mergeHistory(history);syncExerciseCatalogFromKnownData();saveState();render();toast(`${result.added} nuovi · ${result.updated} aggiornati · ${result.skipped} già presenti`);
  }else if(payload?.type==='gym-tracker-settings'){
    const prefs=selectedPrefs990(payload.settings);if(!Object.keys(prefs).length)throw Error('Nessuna preferenza valida');
    if(!confirm('Importare le preferenze? I dati di allenamento restano invariati.'))return;
    if(!checkpoint990('pre-change'))throw Error('Copia di sicurezza non disponibile');
    state.settings={...state.settings,...prefs};window.AndroidBridge?.setHealthAutoExport?.(state.settings.autoHealthExport!==false);saveState();render();toast('Preferenze importate');
  }else throw Error('Scegli un JSON di storico o preferenze');
}
$('#personalImportInput')?.addEventListener('change',async e=>{try{const f=e.target.files?.[0];if(f)await importPartial990(JSON.parse(await f.text()));}catch(err){toast(err.message||'File non valido');}finally{e.target.value='';}});
// Selective personal data transfer. Never imports workout history or a training plan.
const PROFILE_TYPES991={loads:'gym-tracker-loads',gyms:'gym-tracker-gyms',both:'gym-tracker-loads-gyms'};
const PROFILE_LABELS991={loads:'Solo carichi',gyms:'Solo palestre',both:'Carichi e palestre'};
function record991(x){return !!x&&typeof x==='object'&&!Array.isArray(x);}
function id991(x){return typeof x==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);}
function text991(x,n=250){return typeof x==='string'?x.trim().slice(0,n):'';}
function number991(x,min,max){if(x===''||x===null||x===undefined||typeof x==='boolean'||typeof x==='object')return null;const n=Number(x);return Number.isFinite(n)&&n>=min&&n<=max?n:null;}
function date991(x){return typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():'';}
function timestamp991(x){return Date.parse(x||'')||0;}
function ref991(r){
  if(!record991(r))return null;const kg=number991(r.kg,.01,2000),reps=number991(r.reps,1,300);if(kg===null||reps===null||!Number.isInteger(reps))return null;
  const rir=number991(r.rir,0,10),rpe=number991(r.rpe,0,10);
  return {kg,reps,rir:rir??(rpe===null?'':10-rpe),metric:'RIR',source:'importazione-carichi',updatedAt:date991(r.updatedAt)};
}
function profileIdentity991(id,e){
  if(!id991(id)||!record991(e)||!text991(e.name))return null;
  const p={id,name:text991(e.name),equipment:text991(e.equipment),gym:text991(e.gym),movementId:text991(e.movementId)||inferMovementId(e.name),loadMode:['total','per-hand','assistance'].includes(e.loadMode)?e.loadMode:inferLoadMode(e),loadDirection:['higher-is-harder','lower-is-harder'].includes(e.loadDirection)?e.loadDirection:inferLoadDirection(e)};
  if(['shared','per-gym'].includes(e.gymScope))p.gymScope=e.gymScope;
  if(id991(e.sharedMachineKey))p.sharedMachineKey=e.sharedMachineKey;
  if(Array.isArray(e.availableGymIds))p.availableGymIds=[...new Set(e.availableGymIds.filter(id991))];
  for(const k of ['category','goal','safetyCue','defaultReps','defaultRir']){const v=e[k];if(typeof v==='string')p[k]=text991(v,500);else if(typeof v==='number'&&Number.isFinite(v))p[k]=v;}
  for(const k of ['defaultSets','defaultRestSec']){const v=number991(e[k],0,3600);if(v!==null)p[k]=v;}
  return p;
}
function gymIdentity991(g){return record991(g)&&id991(g.id)&&text991(g.name)?{id:g.id,name:text991(g.name)}:null;}
function gymProfile991(g){
  const identity=gymIdentity991(g);if(!identity)throw Error('Profilo palestra non valido');
  if(g.mappings!=null&&!record991(g.mappings))throw Error('Associazioni palestra non valide');
  if(g.equipmentInventory!=null&&!Array.isArray(g.equipmentInventory))throw Error('Inventario palestra non valido');
  const mappings={};for(const [slot,id] of Object.entries(g.mappings||{})){if(!id991(slot)||!id991(id))throw Error('Associazione palestra non valida');mappings[slot]=id;}
  const inventory=[];const seen=new Set();for(const e of g.equipmentInventory||[]){if(!record991(e)||!id991(e.id)||!text991(e.name)||seen.has(e.id))throw Error('Macchinario non valido o duplicato');seen.add(e.id);const item={id:e.id,name:text991(e.name)};for(const k of ['brand','category','sharedKey','note','confirmation','source'])item[k]=text991(e[k],1000);inventory.push(item);}
  return {...identity,mappings,equipmentInventory:inventory,notes:text991(g.notes,2000),createdAt:date991(g.createdAt),updatedAt:date991(g.updatedAt)};
}
function gymIdentities991(list){if(!Array.isArray(list))throw Error('Elenco palestre non valido');const out=[],seen=new Set();for(const g of list){const v=gymIdentity991(g);if(!v||seen.has(v.id))throw Error('Identificativo palestra non valido o duplicato');seen.add(v.id);out.push(v);}return out;}
function extractProfile991(payload,mode){
  if(!Object.hasOwn(PROFILE_TYPES991,mode))throw Error('Seleziona cosa importare');
  const loads=mode!=='gyms',gyms=mode!=='loads',partial=Object.values(PROFILE_TYPES991).includes(payload?.type);
  if(partial&&((loads&&payload.type===PROFILE_TYPES991.gyms)||(gyms&&payload.type===PROFILE_TYPES991.loads)))throw Error('Il file non contiene tutti i dati selezionati');
  if(!partial&&payload?.type&&payload.type!=='gym-tracker-backup')throw Error('Seleziona un backup completo o un JSON di carichi/palestre');
  const s=partial?payload:payload?.state||payload;
  if(!record991(s)||(!partial&&!Array.isArray(s.history)))throw Error('Backup GymTracker non valido');
  if(s.exerciseCatalog!=null&&!record991(s.exerciseCatalog))throw Error('Catalogo non valido');
  if(s.exerciseSettings!=null&&!record991(s.exerciseSettings))throw Error('Impostazioni carichi non valide');
  const identities=gymIdentities991(s.gymIdentities||s.gymProfiles||[]),gymIds=new Set(identities.map(g=>g.id));
  if(gyms&&s.gymProfiles!=null&&!Array.isArray(s.gymProfiles))throw Error('Elenco palestre non valido');
  const profiles=gyms?(s.gymProfiles||[]).map(gymProfile991):[];
  if(new Set(profiles.map(g=>g.id)).size!==profiles.length||profiles.some(g=>!identities.some(i=>i.id===g.id&&cleanKey(i.name)===cleanKey(g.name))))throw Error('Profili palestra incoerenti');
  const mapped=new Set(profiles.flatMap(g=>Object.values(g.mappings)));
  const srcCatalog=s.exerciseCatalog||{}, catalog={},settings={};let unscoped=0;
  function profile(id,e){return profileIdentity991(id,srcCatalog[id]||e);}
  function get(id,e){if(!id991(id))return null;if(Object.hasOwn(catalog,id))return catalog[id];const p=profile(id,e);if(p)catalog[id]=p;return p;}
  function addRef(id,e,ref,gymId=''){
    const r=ref991(ref);if(!r)return;if(gymId&&!gymIds.has(gymId)){unscoped++;return;}
    const p=get(id,e);if(!p)return;
    const old=gymId?p.referenceByGym?.[gymId]:p.reference;
    if(old&&timestamp991(old.updatedAt)>=timestamp991(r.updatedAt))return;
    if(gymId){p.referenceByGym=p.referenceByGym||{};p.referenceByGym[gymId]=r;}else p.reference=r;
  }
  for(const [id,e] of Object.entries(srcCatalog)){
    if(!id991(id)||!record991(e))continue;
    // Gym-only imports carry machine identities, not weights. Include mapped profiles and explicit gym metadata.
    if(gyms&&(mapped.has(id)||e.gym||e.sharedMachineKey||(Array.isArray(e.availableGymIds)&&e.availableGymIds.length)))get(id,e);
    if(!loads)continue;
    if(e.reference)addRef(id,e,e.reference);
    if(record991(e.referenceByGym))for(const [gymId,r] of Object.entries(e.referenceByGym))if(id991(gymId))addRef(id,e,r,gymId);
    const step=number991(s.exerciseSettings?.[id]?.loadStepKg??e.loadStepKg,.01,500);if(step!==null&&get(id,e))settings[id]={loadStepKg:step};
  }
  if(loads){
    // Use the first valid completed working set of the latest session, never warmups or the special periodized bench plan.
    // Unidentified gym-specific machines are not treated as a transferable generic reference.
    function findGym(session,ex,p){const explicit=ex.selectedGymId||session.gymId;if(explicit)return gymIds.has(explicit)?explicit:'';const names=[ex.selectedGymName,session.gymName,ex.gym,p.gym].filter(Boolean).map(cleanKey);const matches=identities.filter(g=>names.includes(cleanKey(g.name)));return matches.length===1?matches[0].id:'';}
    for(const sess of (Array.isArray(s.history)?s.history:[]))for(const ex of (Array.isArray(sess?.exercises)?sess.exercises:[])){
      if(!record991(ex)||ex.special||!Array.isArray(ex.sets))continue;
      const set=ex.sets.find(st=>st?.done===true&&!st.warmup&&!st.isWarmup&&!st.extra&&number991(st.kg,.01,2000)!==null&&Number.isInteger(number991(st.reps,1,300)));if(!set)continue;
      const id=effectiveExerciseId(ex),p=profile(id,ex);if(!p)continue;
      if((ex.loadMode&&ex.loadMode!==p.loadMode)||(ex.loadDirection&&ex.loadDirection!==p.loadDirection)){unscoped++;continue;}
      const scoped=machineNeedsGymSpecificHistory(p),gymId=scoped?findGym(sess,ex,p):'';
      if(scoped&&!gymId){unscoped++;continue;}
      const stamp=date991(set.completedAt)||date991(sess.startedAt);if(!stamp)continue;
      const rir=number991(set.metricValue,0,10);addRef(id,ex,{kg:set.kg,reps:set.reps,rir:rir===null?'':String(set.metric).toUpperCase()==='RPE'?10-rir:rir,updatedAt:stamp},gymId);
    }
    // An explicit starting weight in the plan is only a fallback reference, never a change to the active plan.
    for(const w of Object.values(s.activeProgram?.workouts||s.program?.workouts||{}))for(const ex of (Array.isArray(w?.exercises)?w.exercises:[])){
      if(!record991(ex)||ex.special)continue;const id=effectiveExerciseId(ex),p=profile(id,ex);if(!p||machineNeedsGymSpecificHistory(p))continue;
      if(catalog[id]?.reference)continue;const reps=parseMinRep(ex.reps);addRef(id,ex,{kg:ex.initialKg,reps,rir:'',updatedAt:''});
    }
  }
  return {type:PROFILE_TYPES991[mode],schemaVersion:1,exerciseCatalog:catalog,exerciseSettings:settings,gymIdentities:identities,gymProfiles:profiles,activeGymId:gyms&&gymIds.has(s.activeGymId)?s.activeGymId:'',unscoped};
}
function mergeProfile991(current,data,mode){
  const loads=mode!=='gyms',gyms=mode!=='loads',candidate=clone(current),counts={gyms:0,mappings:0,machines:0,profiles:0,loads:0,steps:0,skipped:0,unscoped:data.unscoped||0};
  const catalog=candidate.exerciseCatalog||(candidate.exerciseCatalog={}),settings=candidate.exerciseSettings||(candidate.exerciseSettings={}),destGyms=candidate.gymProfiles||(candidate.gymProfiles=[]),gymMap=new Map();
  for(const g of data.gymIdentities){const exact=destGyms.find(x=>x.id===g.id),same=destGyms.filter(x=>cleanKey(x.name)===cleanKey(g.name));if(exact&&cleanKey(exact.name)!==cleanKey(g.name))throw Error('Conflitto identificativo palestra: '+g.name);if(!exact&&same.length>1)throw Error('Palestre omonime: '+g.name);if(exact||same.length===1)gymMap.set(g.id,(exact||same[0]).id);else if(gyms&&data.gymProfiles.some(p=>p.id===g.id))gymMap.set(g.id,g.id);}
  const profileConflicts=new Set();
  for(const [id,incoming] of Object.entries(data.exerciseCatalog)){
    const old=catalog[id],p=profileIdentity991(id,incoming);if(!p)continue;
    // No fuzzy movement/name matching: keep existing incompatible IDs and never attach weights/mappings to them.
    if(old&&(cleanKey(old.name)!==cleanKey(p.name)|| (old.loadMode&&old.loadMode!==p.loadMode)||(old.loadDirection&&old.loadDirection!==p.loadDirection)||(old.movementId&&old.movementId!==p.movementId)||((old.gym||p.gym)&&cleanKey(old.gym||'')!==cleanKey(p.gym||''))||(old.gymScope&&p.gymScope&&old.gymScope!==p.gymScope))){profileConflicts.add(id);counts.skipped++;continue;}
    if(p.availableGymIds)p.availableGymIds=p.availableGymIds.map(x=>gymMap.get(x)).filter(Boolean);
    const hasRefs=loads&&(incoming.reference||Object.values(incoming.referenceByGym||{}).length||data.exerciseSettings[id]);
    if(!old){catalog[id]={...p,source:'importazione-selettiva',userEdited:true};counts.profiles++;}
    else if(gyms){for(const k of ['gymScope','sharedMachineKey'])if(!old[k]&&p[k])old[k]=p[k];if(p.availableGymIds?.length)old.availableGymIds=[...new Set([...(old.availableGymIds||[]),...p.availableGymIds])];}
    if(!hasRefs)continue;
    const entry=catalog[id];
    function takeRef(r,gymId=''){const ref=ref991(r);if(!ref)return;const existing=gymId?entry.referenceByGym?.[gymId]:entry.reference;if(existing&&(!ref.updatedAt||timestamp991(existing.updatedAt)>=timestamp991(ref.updatedAt))){counts.skipped++;return;}if(gymId){entry.referenceByGym=entry.referenceByGym||{};entry.referenceByGym[gymId]=ref;}else entry.reference=ref;counts.loads++;}
    if(incoming.reference)takeRef(incoming.reference);
    for(const [sourceId,r] of Object.entries(incoming.referenceByGym||{})){const destId=gymMap.get(sourceId);if(destId)takeRef(r,destId);else counts.skipped++;}
    const step=data.exerciseSettings[id]?.loadStepKg;if(step!=null){if(number991(settings[id]?.loadStepKg??entry.loadStepKg,.01,500)===null){settings[id]={...settings[id],loadStepKg:step};counts.steps++;}else if(Number(settings[id]?.loadStepKg??entry.loadStepKg)!==step)counts.skipped++;}
  }
  if(gyms){
    for(const g of data.gymProfiles){const targetId=gymMap.get(g.id);if(!targetId)throw Error('Palestra senza identificativo');let target=destGyms.find(x=>x.id===targetId);if(!target){target={...g,id:targetId,mappings:{},equipmentInventory:[]};destGyms.push(target);counts.gyms++;}
      target.mappings=target.mappings||{};target.equipmentInventory=target.equipmentInventory||[];
      for(const [slot,id] of Object.entries(g.mappings)){if(profileConflicts.has(id)||!Object.hasOwn(catalog,id)){counts.skipped++;continue;}if(!Object.hasOwn(target.mappings,slot)){target.mappings[slot]=id;counts.mappings++;}else if(target.mappings[slot]!==id)counts.skipped++;}
      for(const item of g.equipmentInventory){const existing=target.equipmentInventory.find(x=>x.id===item.id);if(!existing){target.equipmentInventory.push(item);counts.machines++;}else if(cleanKey(existing.name)!==cleanKey(item.name))counts.skipped++;}
    }
    if(!candidate.activeGymId&&gymMap.has(data.activeGymId))candidate.activeGymId=gymMap.get(data.activeGymId);
  }
  return {candidate,counts};
}
function exportProfile991(mode){try{const data=extractProfile991(state,mode);downloadJson990({...data,appVersion:APP_VERSION,exportedAt:new Date().toISOString()},mode==='loads'?'carichi-PRIVATO':mode==='gyms'?'palestre-PRIVATE':'carichi-palestre-PRIVATO');}catch(e){toast(e.message);}}
let profileImportMode991='both';
function triggerProfile991(mode){profileImportMode991=mode;document.getElementById('profileImportInput')?.click();}
function importProfile991(payload,mode){
  if(state.currentSession||state.storageRecoveryRequired)throw Error('Termina la sessione o ripristina i dati locali prima di importare');
  const {candidate,counts:c}=mergeProfile991(state,extractProfile991(payload,mode),mode);
  const report=`${c.loads} riferimenti carico · ${c.steps} incrementi · ${c.gyms} nuove palestre · ${c.machines} macchinari · ${c.mappings} associazioni · ${c.profiles} profili esercizio.`;
  if(!confirm(`${PROFILE_LABELS991[mode]}\n${report}\n${c.skipped} elementi non applicati (conflitti, sedi mancanti o dati locali più recenti). ${c.unscoped} rilevazioni senza sede certa escluse.\nScheda, storico e dati salute non verranno sostituiti. Continuare?`))return false;
  if(!checkpoint990('pre-change'))throw Error('Copia di sicurezza non disponibile: esporta il backup prima di riprovare');
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(candidate));}catch(e){throw Error('Memoria insufficiente: importazione non applicata');}
  state=candidate;window.GymWatchBridge?.publish();render();toast('Importazione completata · '+report);return true;
}
$('#profileImportInput')?.addEventListener('change',async e=>{const mode=profileImportMode991;try{const f=e.target.files?.[0];if(f)importProfile991(JSON.parse(await f.text()),mode);}catch(err){toast(err.message||'File non valido');}finally{e.target.value='';}});
function profilePanel991(){return `<div class="section-title"><h3>Carichi e palestre</h3></div><p class="subtle">Esporta o importa solo questi dati, anche da un backup completo precedente. Scheda, storico e salute restano invariati. I riferimenti sono personali, non condividere il file se non lo desideri.</p><div class="share-grid">${Object.keys(PROFILE_TYPES991).map(k=>`<button onclick="exportProfile991('${k}')">${personalIcon(k==='loads'?'progress':k==='gyms'?'gyms':'backup')}Esporta ${PROFILE_LABELS991[k].toLowerCase()}</button><button onclick="triggerProfile991('${k}')">${personalIcon(k==='loads'?'progress':k==='gyms'?'gyms':'backup')}Importa ${PROFILE_LABELS991[k].toLowerCase()}</button>`).join('')}</div><p class="subtle">Le prestazioni recenti diventano riferimenti Smart Load, non sedute storiche. Le macchine senza palestra identificata non vengono associate a una sede per ipotesi. I conflitti conservano i dati locali; le prescrizioni fisse della scheda non cambiano.</p>`;}

function configureWatch990(value){state.settings.autoOpenWatch=!!value;state.settings.autoWatchHealth=!!value;saveState();window.GymWatchBridge?.publish();render();}
function beginPersonal990(view='program'){if(state.storageRecoveryRequired){toast('Ripristina o esporta prima i dati locali danneggiati');return;}state.onboardingComplete=true;state.ui.view=view;saveState();render();}
function renderWelcome990(){
  const corrupt=state.storageRecoveryRequired;
  return `<main class="welcome990"><div class="welcome-brand">${personalIcon('gyms')}<span>GYMTRACKER <small>PERSONAL EDITION · 9.9</small></span></div><h1>${corrupt?'Recupero dei dati':'Il tuo percorso.<br>Le tue regole.'}</h1><p>${corrupt?'I dati locali non sono leggibili. Non sono stati sovrascritti. Ripristina un backup affidabile.':'Allenati, registra i tuoi progressi e porta tutto con te. Nessun dato di altri utenti è incluso.'}</p><div class="welcome-actions">${corrupt?'':`<button class="welcome-option" onclick="beginPersonal990('program')">${personalIcon('plus')}<span><strong>Inizia da zero</strong><small>Crea una scheda o parti da un modello.</small></span><span class="arrow990">›</span></button>`}<button class="welcome-option" onclick="triggerImport()">${personalIcon('backup')}<span><strong>Ripristina tutti i miei dati</strong><small>Importa il backup completo JSON.</small></span><span class="arrow990">›</span></button>${corrupt?`<button class="welcome-option" onclick="exportRawRecovery990()">${personalIcon('backup')}<span><strong>Salva i dati grezzi</strong><small>Conserva il file per un recupero manuale.</small></span></button><button class="secondary-btn" onclick="restoreCheckpoint990('previous')">Prova copia pre-aggiornamento</button><button class="secondary-btn" onclick="restoreCheckpoint990('daily')">Prova copia automatica</button>`:`<button class="welcome-option" onclick="beginPersonal990('program');triggerProgramImport()">${personalIcon('program')}<span><strong>Importa una scheda</strong><small>Un programma senza storico personale.</small></span><span class="arrow990">›</span></button>`}</div>${corrupt?'':`<div class="setup-device"><div>${personalIcon('watch')}<span><b>Hai uno smartwatch Wear OS?</b><small>Puoi cambiare scelta in Altro.</small></span></div><div class="device-options"><button class="${state.settings.autoOpenWatch?'':'chosen'}" onclick="configureWatch990(false)">Solo telefono</button><button class="${state.settings.autoOpenWatch?'chosen':''}" onclick="configureWatch990(true)">Wear OS</button></div></div>`}<footer>Dati locali · Nessun account obbligatorio<br>GymTracker ${APP_VERSION}</footer></main>`;
}
function exportRawRecovery990(){const raw=localRead990(STORAGE_KEY);if(raw===null){toast('Nessun dato locale');return;}downloadBlob(new Blob([raw],{type:'application/json'}),`GymTracker-recupero-grezzo-${dateStamp990()}.json`);}
function resetAll(){
  if(state.currentSession){toast('Termina o scarta la sessione attiva');return;}
  if(!confirm('Cancellare TUTTI i dati personali e le copie di recupero locali? Esporta prima un backup completo. I dati già in Samsung Health non verranno cancellati.'))return;
  if(!confirm('Confermi la cancellazione definitiva su questo dispositivo?'))return;
  window.AndroidBridge?.setHealthAutoExport?.(false);state=clone(defaultState);state.onboardingComplete=false;
  for(const [kind,key] of Object.entries(PERSONAL_KEYS))try{window.AndroidBridge?.deleteCheckpoint?.(kind);localStorage.removeItem(key);}catch(e){}
  lastCheckpointSignature990='';
  syncExerciseCatalogFromKnownData();ensureGymState();saveState();window.GymWatchBridge?.publish();render();toast('Profilo locale azzerato');
}
function backupPanel990(){return `<section class="card personal-panel"><div class="personal-heading">${personalIcon('backup')}<div><h2>Centro backup</h2><p class="subtle">I tuoi dati, sotto il tuo controllo</p></div></div><button class="primary-btn" onclick="exportBackup()">Esporta backup completo JSON</button><button class="secondary-btn" onclick="triggerImport()">Ripristina backup completo</button><div class="setting-row"><div><h4>Copia automatica locale</h4><p>Ogni giorno e a fine allenamento. Non sopravvive alla disinstallazione.</p></div><button class="toggle ${state.settings.autoBackup!==false?'on':''}" onclick="state.settings.autoBackup=state.settings.autoBackup===false;saveState();render()" aria-label="Backup automatico"><i></i></button></div>${[['daily','Ultima copia automatica'],['previous','Prima dell’aggiornamento'],['change','Prima del ripristino']].map(([k,l])=>`<div class="checkpoint-row"><div><b>${l}</b><small>${esc(backupAge990(k))}</small></div>${readCheckpoint990(k)?`<button class="chip-btn" onclick="exportCheckpoint990('${k}')">Salva</button><button class="chip-btn" onclick="restoreCheckpoint990('${k}')">Ripristina</button>`:''}</div>`).join('')}<button class="secondary-btn" onclick="checkpoint990('daily')?toast('Copia locale creata'):toast('Memoria insufficiente');render()">Crea copia locale ora</button>${state.localBackupWarning?'<p class="warn">Copia automatica non riuscita: esporta un JSON esterno e verifica lo spazio disponibile.</p>':''}<p class="subtle">Prima di cambiare telefono, disinstallare o aggiornare con firma diversa, salva il JSON in Download o su PC.</p><div class="section-title"><h3>Esportazioni selettive</h3></div><div class="share-grid"><button onclick="exportSharedProgram990(false)">${personalIcon('share')}Scheda senza carichi</button><button onclick="exportSharedProgram990(true)">${personalIcon('program')}Scheda con carichi</button><button onclick="exportHistory990()">${personalIcon('history')}Storico JSON</button><button onclick="exportPrefs990()">${personalIcon('settings')}Preferenze JSON</button></div><button class="secondary-btn" onclick="triggerPartial990()">Importa storico o preferenze JSON</button>${profilePanel991()}<p class="subtle">Le schede condivise sono una fotografia della settimana selezionata. Il backup completo conserva il piano originale, le progressioni e i dati salute.</p></section>`;}
const exportPrivatePackage990=exportPortableProgram;
exportPortableProgram=function(){if(confirm('Questo pacchetto contiene storico, carichi, palestre e impostazioni personali. Non condividerlo con altre persone. Continuare?'))exportPrivatePackage990();};
const renderSettings990=renderSettings;
renderSettings=function(){return renderSettings990().replace('<main class="content">','<main class="content">'+backupPanel990());};
const renderBase990=render;
render=function(){if(!state.onboardingComplete||state.storageRecoveryRequired){const app=$('#app');if(app)app.innerHTML=renderWelcome990();return;}return renderBase990();};
const saveBase990=saveState;
let lastCheckpointSignature990='';
function autoCheckpoint990(){
  if(!state.onboardingComplete||state.storageRecoveryRequired||state.settings.autoBackup===false)return;
  const signature=dateStamp990()+'|'+state.history.length+'|'+(state.history[0]?.id||'');
  if(signature!==lastCheckpointSignature990){if(checkpoint990('daily')){lastCheckpointSignature990=signature;delete state.localBackupWarning;}else state.localBackupWarning=true;} 
}
saveState=function(){const result=saveBase990.apply(this,arguments);if(result)autoCheckpoint990();return result;};
// Restore previous daily signature on restart so opening the app does not destroy the last checkpoint.
const oldDailyRecord990=checkpointRecord990('daily'),oldDaily990=oldDailyRecord990?.state;if(oldDaily990&&oldDaily990.version===APP_VERSION&&oldDailyRecord990.createdAt)lastCheckpointSignature990=oldDailyRecord990.createdAt.slice(0,10)+'|'+(oldDaily990.history?.length||0)+'|'+(oldDaily990.history?.[0]?.id||'');
autoCheckpoint990();render();
