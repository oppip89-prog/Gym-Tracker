/* Gym Tracker v9.4.0
 * Attrezzature confermate dall'utilizzatore il 20/11/2026.
 * Macchine diverse non condividono mai carichi. Solo le equivalenze
 * dichiarate identiche possono consultare lo stesso storico.
 */
const FITACTIVE_V94_EQUIPMENT = {
  borgaro: [
    ['shoulder-plate','Shoulder press carico dischi','Matrix','press-spalle','shoulder-plate-matrix'],
    ['chest-incline','Incline chest press carico dischi','Matrix','press-petto','chest-incline-matrix'],
    ['pec-fly','Pec fly','Matrix','isolamento-petto','pec-fly-matrix'],
    ['lat-machine','Lat machine','Matrix','trazione-verticale','lat-machine-matrix'],
    ['prone-leg-curl','Prone leg curl','Matrix','femorali',''],
    ['shoulder-stack','Shoulder press pacco pesi','Matrix','press-spalle','']
  ],
  pinerolo: [
    ['incline-technogym','Incline chest press','Technogym','press-petto',''],
    ['shoulder-technogym','Shoulder press','Technogym','press-spalle',''],
    ['pec-toorx','Pec fly','Toorx','isolamento-petto',''],
    ['shoulder-trainer-diamond','Shoulder trainer','Diamond','spalle',''],
    ['high-row-panatta','High row','Panatta','rematore',''],
    ['latzug-technogym','Latzug','Technogym','trazione-verticale','']
  ],
  beinasco: [
    ['pec-fly','Pec fly','Matrix','isolamento-petto','pec-fly-matrix'],
    ['shoulder-toorx','Shoulder press carico dischi','Toorx','press-spalle',''],
    ['decline-chest-toorx','Decline chest press','Toorx','press-petto',''],
    ['hack-squat-toorx','Hack squat','Toorx','quadricipiti',''],
    ['multipower-incline','Multipower inclinato','Non specificata','press-petto','']
  ],
  botticelli: [
    ['shoulder-plate','Shoulder press carico dischi','Matrix','press-spalle','shoulder-plate-matrix'],
    ['chest-vertical','Chest press verticale (non inclinata)','Matrix','press-petto',''],
    ['pec-fly','Pec fly','Matrix','isolamento-petto','pec-fly-matrix'],
    ['lat-machine','Lat machine','Matrix','trazione-verticale','lat-machine-matrix'],
    ['lat-pulldown-toorx','Lat pulldown (macchina distinta dalla lat machine Matrix)','Toorx','trazione-verticale',''],
    ['cable-tower-toorx','Castello cavi piccolo/compatto','Toorx','cavi','']
  ],
  grugliasco: [
    ['shoulder-plate','Shoulder press carico dischi','Matrix','press-spalle','shoulder-plate-matrix'],
    ['chest-incline','Incline chest press carico dischi','Matrix','press-petto','chest-incline-matrix'],
    ['pec-fly','Pec fly','Matrix','isolamento-petto','pec-fly-matrix'],
    ['lat-machine','Lat machine','Matrix','trazione-verticale','lat-machine-matrix']
  ]
};
const FITACTIVE_V94_CLUBS = [
  {id:'borgaro',name:'Borgaro'},
  {id:'pinerolo',name:'Pinerolo'},
  {id:'beinasco',name:'Beinasco'},
  {id:'botticelli',name:'FitActive Botticelli'},
  {id:'grugliasco',name:'FitActive Grugliasco'}
];
const FITACTIVE_V94_PROFILE_GROUPS = {
  'shoulder-press-carico-dischi':'shoulder-plate-matrix',
  'incline-chest-press':'chest-incline-matrix',
  'pec-fly':'pec-fly-matrix',
  'lat-machine-top-back-off':'lat-machine-matrix'
};
const baseNormalizeGymProfileV94 = normalizeGymProfile;
normalizeGymProfile = function(g){
  const clean = baseNormalizeGymProfileV94(g);
  return {...g,...clean,equipmentInventory:Array.isArray(g?.equipmentInventory)?g.equipmentInventory.map(e=>({...e})):[]};
};
function v94SeedInventory(){
  state.gymProfiles=Array.isArray(state.gymProfiles)?state.gymProfiles:[];
  for(const c of FITACTIVE_V94_CLUBS){
    if(!state.gymProfiles.some(g=>g.id===c.id))state.gymProfiles.push(normalizeGymProfile({...c,mappings:{}}));
  }
  if(Number(state.fitactiveInventoryVersion)>=1)return;
  for(const gym of state.gymProfiles){
    const specs=FITACTIVE_V94_EQUIPMENT[gym.id]||[];
    gym.equipmentInventory=Array.isArray(gym.equipmentInventory)?gym.equipmentInventory:[];
    for(const [id,name,brand,category,sharedKey] of specs){
      if(gym.equipmentInventory.some(m=>m.id===id))continue;
      const confirmed= gym.id==='botticelli'||gym.id==='grugliasco'||
        (gym.id==='borgaro'&&['shoulder-plate','chest-incline','pec-fly','lat-machine'].includes(id))||
        (gym.id==='beinasco'&&id==='pec-fly');
      gym.equipmentInventory.push({id,name,brand,category,sharedKey,
        confirmation:confirmed?'Confermato dall\'utente':'Gia configurato nel backup',
        source:confirmed?'Conferma 20/11/2026':'Backup 20/11/2026'});
    }
    if(gym.id==='botticelli'){
      gym.mappings=gym.mappings||{};
      if(!gym.mappings['incline-chest-press'])gym.mappings['incline-chest-press']='chest-press-verticale-matrix-botticelli';
      if(/da confermare/i.test(gym.notes||''))gym.notes='Attrezzatura Matrix; Lat pulldown e castello cavi compatto Toorx. Modello preciso non verificato.';
    }
    if(gym.id==='grugliasco'&&/da confermare/i.test(gym.notes||''))gym.notes='Macchine confermate come equivalenti a Borgaro/Botticelli dove indicato.';
  }
  state.fitactiveInventoryVersion=1;
}
function v94EnsureConfirmedMappings(){
  if(Number(state.fitactiveMachineMappingsVersion)>=1)return;
  // La scheda UPPER specifica "shoulder press pacco pesi"; a Botticelli e
  // Grugliasco l'utente ha confermato invece la variante Matrix a dischi.
  // Borgaro usa gia' entrambe e conserva il proprio slot a pacco pesi.
  for(const id of ['botticelli','grugliasco']){
    const gym=(state.gymProfiles||[]).find(g=>g.id===id);
    if(!gym)continue;
    gym.mappings=gym.mappings||{};
    if(!gym.mappings['shoulder-press-pacco-pesi'])
      gym.mappings['shoulder-press-pacco-pesi']='shoulder-press-carico-dischi';
  }
  state.fitactiveMachineMappingsVersion=1;
}
function v94EnsureMachineCatalog(){
  const catalog=state.exerciseCatalog||(state.exerciseCatalog={});
  for(const [id,key] of Object.entries(FITACTIVE_V94_PROFILE_GROUPS)){
    const p=catalog[id];if(!p)continue;
    p.sharedMachineKey=key;p.gymScope='per-gym';
    p.availableGymIds=key==='shoulder-plate-matrix'?['borgaro','botticelli','grugliasco']:
      key==='chest-incline-matrix'?['borgaro','grugliasco']:
      key==='pec-fly-matrix'?['borgaro','beinasco','botticelli','grugliasco']:
      ['borgaro','botticelli','grugliasco','pinerolo'];
    // L'etichetta del profilo e la macchina sono distinte dall'eventuale
    // variante a pacco pesi o da quella di un'altra marca.
    if(id==='shoulder-press-carico-dischi'){
      p.name='Shoulder press carico dischi';p.equipment='Matrix plate-loaded';p.movementId='overhead-press';
    }
    if(id==='incline-chest-press'){p.equipment='Matrix plate-loaded';p.movementId='incline-chest-press';}
    if(id==='pec-fly'){p.equipment='Matrix pec fly';p.movementId='chest-fly';}
    if(id==='lat-machine-top-back-off'){p.equipment='Matrix lat machine';p.movementId='vertical-pull';}
    p.userEdited=true;p.confirmedEquipmentAt='2026-11-20';
  }
  const newProfiles=[
    {id:'chest-press-verticale-matrix-botticelli',name:'Chest press verticale Matrix',gym:'FitActive Botticelli',
      equipment:'Matrix - pressa petto completamente verticale, non inclinata',movementId:'chest-press',
      gymScope:'per-gym',availableGymIds:['botticelli'],loadDirection:'higher-is-harder',loadMode:'total',
      category:'Petto',defaultSets:2,defaultReps:'8-12',defaultRir:2,defaultRestSec:120,
      safetyCue:'Regola seduta e maniglie; presa e traiettoria confortevoli. Esercizio distinto dalla incline chest press.'},
    {id:'lat-pulldown-toorx-botticelli',name:'Lat pulldown Toorx',gym:'FitActive Botticelli',
      equipment:'Toorx - macchina per trazione verticale (modello esatto non dichiarato)',movementId:'vertical-pull',
      gymScope:'per-gym',availableGymIds:['botticelli'],loadDirection:'higher-is-harder',loadMode:'total',
      category:'Dorso',defaultSets:2,defaultReps:'8-12',defaultRir:2,defaultRestSec:120,
      safetyCue:'Non condividere lo storico con la lat machine Matrix; registra i pesi effettivi sulla Toorx.'}
  ];
  for(const spec of newProfiles){
    if(!catalog[spec.id])catalog[spec.id]={...spec,source:'conferma-utente-2026-11-20',
      notes:'',userEdited:true,createdAt:'2026-11-20T00:00:00Z',updatedAt:'2026-11-20T00:00:00Z'};
    else {catalog[spec.id].availableGymIds=spec.availableGymIds;catalog[spec.id].gymScope='per-gym';}
  }
}
// Mantieni le schede modificate a mano: applica soltanto la correzione richiesta
// alla settimana 3 dello specifico piano 15W, quando c'e' ancora 122,5 kg.
function v94CorrectBenchProgram(p){
  if(!p?.workouts||Number(p.weeks)!==15||!String(p.title||'').includes('PPLUL 15W'))return false;
  const week=p.benchStructured?.['3'];
  if(!week||!Array.isArray(week.push)||week.push.length!==6)return false;
  if(!week.push.every(s=>Array.isArray(s)&&Number(s[1])===122.5&&Number(s[2])===3))return false;
  for(const item of week.push)item[1]=125;
  if(p.benchPlan?.[2])p.benchPlan[2].pushTop='125 kg - 6x3';
  p.benchManualWeeks=p.benchManualWeeks||{};
  p.benchManualWeeks['3']={...(p.benchManualWeeks['3']||{}),bench_push:true};
  p.benchPlanUserRevision='2026-11-20-6x3-125kg';
  return true;
}
function v94MigratePersonalBench(){
  if(Number(state.benchPersonalFixVersion)>=1)return;
  if(state.activeProgram)v94CorrectBenchProgram(state.activeProgram);
  for(const item of state.programLibrary||[])if(item?.program)v94CorrectBenchProgram(item.program);
  state.benchPersonalFixVersion=1;
}
const baseEnsureGymV94=ensureGymState;
ensureGymState=function(){
  baseEnsureGymV94();
  v94SeedInventory();
  v94EnsureConfirmedMappings();
  v94MigratePersonalBench();
};
const baseSyncCatalogV94=syncExerciseCatalogFromKnownData;
syncExerciseCatalogFromKnownData=function(){baseSyncCatalogV94();v94EnsureMachineCatalog();};
function machineGymIds(key){
  return (state.gymProfiles||[]).filter(g=>(g.equipmentInventory||[]).some(m=>m.sharedKey===key)).map(g=>g.id);
}
function gymIdFromHistoricalSession(sess){
  if(sess?.gymId)return String(sess.gymId);
  const name=cleanKey(sess?.gymName||'');
  return (state.gymProfiles||[]).find(g=>cleanKey(g.name)===name||cleanKey(gymDisplayName(g))===name)?.id||'';
}
const baseSessionMatchesExerciseGymV94=sessionMatchesExerciseGym;
sessionMatchesExerciseGym=function(sess,historyEx,target){
  const gymId=target?.selectedGymId,exId=effectiveExerciseId(target);
  const key=FITACTIVE_V94_PROFILE_GROUPS[exId];
  if(key&&gymId&&effectiveExerciseId(historyEx)===exId){
    const confirmed=machineGymIds(key),histGym=gymIdFromHistoricalSession(sess);
    if(confirmed.includes(gymId)&&confirmed.includes(histGym))return true;
  }
  return baseSessionMatchesExerciseGymV94(sess,historyEx,target);
};
const baseMuscleMapV94=muscleMapForExercise;
muscleMapForExercise=function(ex){
  if(effectiveMovementId(ex)==='chest-press')return[['Petto',1],['Tricipiti',.35],['Spalle',.25]];
  return baseMuscleMapV94(ex);
};
const baseManualReferenceV94=manualReferenceFor;
manualReferenceFor=function(ex){
  const own=baseManualReferenceV94(ex);if(own)return own;
  const key=FITACTIVE_V94_PROFILE_GROUPS[effectiveExerciseId(ex)];
  const selected=ex?.selectedGymId||activeGym()?.id;
  const allowed=key?machineGymIds(key):[];
  if(!key||!selected||!allowed.includes(selected))return null;
  const refs=catalogEntry(effectiveExerciseId(ex))?.referenceByGym||{};
  return allowed.filter(id=>id!==selected).map(id=>refs[id]).filter(Boolean)
    .sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0))[0]||null;
};
function v94EquipmentLabel(item){return `${item.name} · ${item.brand||'Marca non indicata'}`;}
function showAddGymEquipment(gymId){
  const gym=state.gymProfiles.find(g=>g.id===gymId);if(!gym)return;
  showModal(`<h2>Nuovo macchinario · ${esc(gymDisplayName(gym))}</h2>
    <label class="field-block">Nome macchina<input class="text-input" id="v94EqName" placeholder="es. Leg extension"></label>
    <label class="field-block">Marca<input class="text-input" id="v94EqBrand" placeholder="es. Matrix"></label>
    <label class="field-block">Note (facoltative)<input class="text-input" id="v94EqNotes" placeholder="modello o dettaglio"></label>
    <p class="subtle">Nuove macchine partono senza carichi; solo le equivalenze confermate condividono lo storico.</p>
    <button class="primary-btn" onclick="saveGymEquipment(decodeURIComponent('${encodedArg(gymId)}'))">Salva</button>
    <button class="secondary-btn" onclick="editGym(decodeURIComponent('${encodedArg(gymId)}'))">Indietro</button>`);
}
function saveGymEquipment(gymId){
  const gym=state.gymProfiles.find(g=>g.id===gymId),name=String($('#v94EqName')?.value||'').trim(),brand=String($('#v94EqBrand')?.value||'').trim();
  if(!gym||!name){toast('Inserisci il nome del macchinario');return;}
  gym.equipmentInventory=gym.equipmentInventory||[];
  const base=slugId(name),used=new Set(gym.equipmentInventory.map(x=>x.id));let id=base,n=2;while(used.has(id))id=`${base}-${n++}`;
  gym.equipmentInventory.push({id,name,brand,category:'altro',sharedKey:'',note:String($('#v94EqNotes')?.value||'').trim(),confirmation:'Inserito manualmente',source:'utente'});
  gym.updatedAt=gymNow();saveState();editGym(gymId);toast('Macchina aggiunta senza carico');
}
function removeGymEquipment(gymId,itemId){
  const gym=state.gymProfiles.find(g=>g.id===gymId),item=gym?.equipmentInventory?.find(x=>x.id===itemId);if(!item)return;
  if(!confirm(`Rimuovere “${item.name}” dall'inventario di ${gymDisplayName(gym)}? Non cancella carichi o allenamenti.`))return;
  gym.equipmentInventory=gym.equipmentInventory.filter(x=>x.id!==itemId);gym.updatedAt=gymNow();saveState();editGym(gymId);
}
const baseEditGymV94=editGym;
editGym=function(gymId){
  baseEditGymV94(gymId);
  const gym=state.gymProfiles.find(g=>g.id===gymId),pane=$('#modalBackdrop .modal');if(!gym||!pane)return;
  const inv=gym.equipmentInventory||[];
  const html=`<div class="v94-inventory"><div class="row between"><h3>Inventario macchine confermate (${inv.length})</h3>
    <button class="chip-btn" onclick="showAddGymEquipment(decodeURIComponent('${encodedArg(gymId)}'))">+ Macchina</button></div>
    <p class="subtle">Le macchine identiche hanno un gruppo condiviso. Le altre mantengono carichi indipendenti. Il modello preciso non documentato rimane da identificare.</p>
    ${inv.map(x=>`<div class="v94-equipment-item"><div><b>${esc(x.name)}</b><small>${esc(x.brand||'Marca da confermare')}${x.sharedKey?' · stessa macchina in altre sedi':''}${x.note?' · '+esc(x.note):''}</small></div>
    <button aria-label="Rimuovi dall'inventario" title="Rimuovi soltanto dall'inventario" onclick="removeGymEquipment(decodeURIComponent('${encodedArg(gymId)}'),decodeURIComponent('${encodedArg(x.id)}'))">×</button></div>`).join('')}
    </div>`;
  pane.querySelector('.modal-list')?.insertAdjacentHTML('beforebegin',html);
};
const baseRenderGymsV94=renderGyms;
renderGyms=function(){
  const html=baseRenderGymsV94();
  const overview=`<section class="card v94-overview"><h2>Inventario confermato FitActive</h2><p class="subtle">Elenco basato sulle tue indicazioni; include soltanto macchine individuate, non tutta la dotazione della sala.</p>
    ${state.gymProfiles.map(g=>`<div class="v94-overview-row"><b>${esc(gymDisplayName(g))}</b><span>${(g.equipmentInventory||[]).length} attrezzi</span><button class="chip-btn" onclick="editGym(decodeURIComponent('${encodedArg(g.id)}'))">Vedi</button></div>`).join('')}</section>`;
  return html.replace('</main>',overview+'</main>');
};
// I profili specifici di Botticelli non devono essere suggeriti a utenti in
// altre sedi. Le alternative condivise mantengono comunque il loro catalogo.
function v94AvailableAtGym(p,g=activeGym()){
  if(!p)return false;
  if(Array.isArray(p.availableGymIds)&&g&&!p.availableGymIds.includes(g.id))return false;
  const n=cleanKey(p.gym||''),gn=cleanKey(g?.name||'');
  return !n||!g||n===gn||n===cleanKey(gymDisplayName(g));
}
const baseShowBuilderExercisePickerV94=showBuilderExercisePicker;
showBuilderExercisePicker=function(key){
  // Vista originaria; i nuovi profili gia' portano la sede corrispondente.
  baseShowBuilderExercisePickerV94(key);
};
function v94IsManualBench(type,week){return !!activeProgram().benchManualWeeks?.[String(week)]?.[type];}
const baseGetBenchSetsV94=getBenchSets;
getBenchSets=function(type,week){
  const sets=baseGetBenchSetsV94(type,week);
  if(!v94IsManualBench(type,week))return sets;
  return sets.map(s=>{const planned=Number(s.plannedKg??s.kg)||0;
    return {...s,kg:planned,recommendedKg:planned,benchAdaptiveOffsetKg:0,
      benchAdaptiveReason:'Carico impostato manualmente nel piano; eventuali riduzioni per RPE elevato restano possibili durante la seduta'};
  });
};
const baseBenchAdaptiveSuggestionV94=benchAdaptiveSuggestion;
benchAdaptiveSuggestion=function(type,week=state.currentWeek){
  if(!v94IsManualBench(type,week))return baseBenchAdaptiveSuggestionV94(type,week);
  const w=activeProgram().benchStructured?.[String(week)],arr=type==='bench_push'?w?.push:w?.upper;
  const kg=Number(arr?.[0]?.[1])||0;
  return {load:kg,next:kg,increased:false,inc:0,delta:0,source:'piano panca manuale',
    reason:'Carico programmato manualmente: nessuna variazione automatica preventiva; monitorare RPE e tecnica',
    mode:'fixed',confidence:'manuale',historyCount:0,lastSummary:'',benchAdaptive:false};
};
function showBenchPlanner(week=state.currentWeek){
  const p=activeProgram();if(!p.benchStructured)return;
  week=clamp(Number(week)||1,1,Number(p.weeks)||15);const w=p.benchStructured[String(week)];if(!w){toast('Settimana priva di piano panca');return;}
  const a=w.push||[],b=w.upper||[];
  const field=(prefix,label,arr,rest)=>{
    const kg=Number(arr?.[0]?.[1])||0,reps=Number(arr?.[0]?.[2])||0,sets=arr.length;
    return `<h3>${esc(label)}</h3><div class="v94-bench-fields">
      <label>Serie<input id="${prefix}Sets" class="num-input" type="number" min="1" max="12" value="${sets}"></label>
      <label>Ripetizioni<input id="${prefix}Reps" class="num-input" type="number" min="1" max="15" value="${reps}"></label>
      <label>Carico (kg)<input id="${prefix}Kg" class="num-input" type="number" min="0" max="400" step="0.5" value="${kg}"></label>
      <label>Recupero (min)<input id="${prefix}Rest" class="num-input" type="number" min="1" max="10" step="0.25" value="${Number(rest||180)/60}"></label>
      </div>`;
  };
  showModal(`<h2>Piano panca personalizzato</h2><p class="subtle">I carichi modificati qui aggiornano sia il riepilogo sia tutte le serie future. Le sedute gia' eseguite e la sessione eventualmente aperta non cambiano.</p>
    <label class="field-block">Settimana<select class="select-input" onchange="showBenchPlanner(this.value)">${Array.from({length:Number(p.weeks)||15},(_,i)=>`<option value="${i+1}" ${i+1===week?'selected':''}>Settimana ${i+1}</option>`).join('')}</select></label>
    ${field('v94Push','Panca A · PUSH',a,w.pushRest)}${field('v94Upper','Panca B · UPPER, fermo 2 s',b,w.upperRest)}
    <div class="coach-note">Modifiche manuali: il motore non correggera' preventivamente i kg del piano. Durante la seduta potra' alleggerire i back-off se l'RPE effettivo risulta eccessivo.</div>
    <button class="primary-btn" onclick="saveBenchPlanner(${week})">Salva settimana ${week}</button><button class="secondary-btn" onclick="closeModal()">Annulla</button>`);
}
function saveBenchPlanner(week){
  const p=state.activeProgram||activeProgram(),w=p?.benchStructured?.[String(week)];if(!w)return;
  const get=(pre,suffix)=>Number($(`#${pre}${suffix}`)?.value),push={sets:get('v94Push','Sets'),reps:get('v94Push','Reps'),kg:get('v94Push','Kg'),rest:get('v94Push','Rest')},upper={sets:get('v94Upper','Sets'),reps:get('v94Upper','Reps'),kg:get('v94Upper','Kg'),rest:get('v94Upper','Rest')};
  for(const row of [push,upper]){
    if(!Number.isInteger(row.sets)||row.sets<1||row.sets>12||!Number.isInteger(row.reps)||row.reps<1||row.reps>15||!Number.isFinite(row.kg)||row.kg<1||row.kg>400||!Number.isFinite(row.rest)||row.rest<1||row.rest>10){toast('Valori non validi: controlla serie, ripetizioni, kg e recupero');return;}
  }
  // Se si sta usando la scheda di default, la rendiamo un programma personale
  // senza mutare la costante globale DEFAULT_PROGRAM.
  if(!state.activeProgram)state.activeProgram=clone(p);
  const actual=state.activeProgram.benchStructured[String(week)],weeks=state.activeProgram.benchPlan;
  const build=(obj,prev,topLabel,backLabel)=>Array.from({length:obj.sets},(_,i)=>[i?`${backLabel} ${i+1}`:topLabel,obj.kg,obj.reps,Number(prev?.[Math.min(i,prev.length-1)]?.[3])||(i===0?7.5:8)]);
  actual.push=build(push,actual.push,'Top set guida','Back-off');actual.upper=build(upper,actual.upper,'Top set fermo','Back-off fermo');
  actual.pushRest=Math.round(push.rest*60);actual.upperRest=Math.round(upper.rest*60);
  if(weeks?.[week-1]){
    weeks[week-1].pushTop=`${fmtKg(push.kg)} kg - ${push.sets}x${push.reps}`;
    weeks[week-1].upperWork=`${fmtKg(upper.kg)} kg - ${upper.sets}x${upper.reps}, fermo 2 s`;
    weeks[week-1].pushRest=fmtTime(actual.pushRest);weeks[week-1].upperRest=fmtTime(actual.upperRest);
  }
  state.activeProgram.benchManualWeeks=state.activeProgram.benchManualWeeks||{};
  state.activeProgram.benchManualWeeks[String(week)]={bench_push:true,bench_upper:true};
  state.activeProgram.benchPlanUserRevision=new Date().toISOString();
  // Evita che la scheda gia' salvata in libreria ripristini prescrizioni vecchie.
  const progId=state.activeProgram.libraryId;
  for(const item of state.programLibrary||[])if(item.id===progId||item.program?.libraryId===progId){item.program=clone(state.activeProgram);item.savedAt=new Date().toISOString();}
  saveState();closeModal();render();toast(`Panca settimana ${week} aggiornata`);
}
const baseRenderProgramV94=renderProgram;
renderProgram=function(){
  const html=baseRenderProgramV94();if(!activeProgram().benchStructured)return html;
  const week=state.currentWeek,p=activeProgram(),plan=p.benchStructured?.[String(week)];
  const first=plan?.push?.[0];
  const info=first?`${plan.push.length}×${first[2]} a ${fmtKg(first[1])} kg`: '—';
  const box=`<section class="card v94-bench-card"><div class="row between"><div><h2>Piano panca modificabile</h2><p class="subtle">PUSH settimana ${week}: <b>${esc(info)}</b>. Modifica serie, ripetizioni, kg e recuperi per qualsiasi settimana.</p></div>
     <button class="chip-btn" onclick="showBenchPlanner(${week})">Modifica</button></div></section>`;
  return html.replace('<main class="content">','<main class="content">'+box);
};
// Applica la migrazione sia sui salvataggi locali sia sugli import JSON.
ensureGymState();syncExerciseCatalogFromKnownData();saveState();render();
