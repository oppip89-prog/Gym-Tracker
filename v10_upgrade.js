/* Gym Tracker v9.4.0 - libreria scientificamente informata, editor schede,
   tecniche strutturate e protezione dello storico per palestra.
   Dati e pesi storici non vengono riscritti o cancellati. */
const EXERCISE_EVIDENCE_2026 = [
  {label:'ACSM 2026 - Position Stand',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/',point:'Progressione, specificità, volume e scelta personalizzata degli esercizi.'},
  {label:'Drop-set - metanalisi 2026',url:'https://pubmed.ncbi.nlm.nih.gov/41920484/',point:'Risultati a lungo termine simili alle serie tradizionali; più fatica percepita.'},
  {label:'Tecniche avanzate - revisione 2026',url:'https://pubmed.ncbi.nlm.nih.gov/41718208/',point:'Nessuna superiorità universale per la crescita muscolare.'},
  {label:'Muscolo in allungamento - revisione 2025',url:'https://pubmed.ncbi.nlm.nih.gov/40570881/',point:'I vantaggi medi sono piccoli o incerti; non inseguire ROM dolorosi.'}
];
const TECHNIQUE_LABELS = {
  standard:'Serie normali', pause:'Fermo controllato', dropset:'Dropset', restpause:'Rest-pause', tempo:'Eccentrica controllata'
};
const LIBRARY_CATEGORY_ORDER=['Petto','Dorso','Spalle','Bicipiti','Tricipiti','Quadricipiti','Femorali e glutei','Polpacci','Core'];

function ensureEvidenceExerciseCatalog(){
  state.exerciseCatalog=state.exerciseCatalog||{};
  for(const spec of EXERCISE_LIBRARY_2026){
    if(state.exerciseCatalog[spec.id]){
      const found=state.exerciseCatalog[spec.id];
      if(!found.category)found.category=spec.category;
      if(!found.safetyCue)found.safetyCue=spec.safetyCue;
      if(!found.goal)found.goal=spec.goal;
      if(!found.gymScope)found.gymScope=spec.gymScope;
      continue;
    }
    state.exerciseCatalog[spec.id]={...clone(spec),gym:'',loadDirection:spec.loadMode==='assistance'?'lower-is-harder':'higher-is-harder',
      notes:'',createdAt:'2026-11-20T00:00:00Z',updatedAt:'2026-11-20T00:00:00Z'};
    // IMPORTANTE: nessun riferimento, carico, storico o 1RM simulato.
  }
}
const baseSyncCatalogV93=syncExerciseCatalogFromKnownData;
syncExerciseCatalogFromKnownData=function(){baseSyncCatalogV93();ensureEvidenceExerciseCatalog();};
// Evita che una futura cancellazione volontaria dei riferimenti venga sovrascritta
// da un vecchio seed 200kg belt squat ad ogni importazione/avvio.
seedPersonalReferences=function(){};

function machineNeedsGymSpecificHistory(ex){
  if(!ex||ex.special)return false;
  if(ex.gymScope==='shared')return false;
  if(ex.gymScope==='per-gym')return true;
  const txt=cleanKey(`${ex.name||''} ${ex.equipment||''}`);
  if(/manubr|bilanciere|panca piana bilanciere|corpo libero|tappetino|sbarra trazioni|panca scott.*manubrio/.test(txt))return false;
  return /matrix|technogym|panatta|toorx|torx|machine|macchina|pacco pesi|selectorized|plate loaded|carico dischi|cavo|cavi|pulley|pec fly|lat machine|pulldown|pressa|belt squat|hack squat|pendulum|leg curl|leg extension|multipower|smith/.test(txt);
}
function sessionMatchesExerciseGym(sess,ex,target){
  const gymId=String(target?.selectedGymId||'');if(!gymId)return true;
  const gym=(state.gymProfiles||[]).find(g=>g.id===gymId);
  if(!gym)return false;
  if(sess.gymId)return sess.gymId===gymId;
  if(sess.gymName)return cleanKey(sess.gymName).replace(/^fitactive /,'')===cleanKey(gym.name).replace(/^fitactive /,'');
  if(ex?.gym)return cleanKey(ex.gym).replace(/^fitactive /,'')===cleanKey(gym.name).replace(/^fitactive /,'');
  // Una vecchia sessione senza palestra resta consultabile, ma non alimenta
  // suggerimenti di kg della macchina selezionata senza un'identificazione certa.
  return false;
}
function bindGymHistoryScope(ex){
  const gym=activeGym();if(!gym||!ex||ex.special)return ex;
  if(!machineNeedsGymSpecificHistory(ex))return ex;
  ex.selectedGymId=gym.id;ex.selectedGymName=gym.name;
  return ex;
}
const baseApplyActiveGymV93=applyActiveGymToWorkout;
applyActiveGymToWorkout=function(workout){
  const out=baseApplyActiveGymV93(workout);
  if(out?.exercises)for(const ex of out.exercises)bindGymHistoryScope(ex);
  return out;
};
const baseExerciseHistoryV93=exerciseHistory;
exerciseHistory=function(target,limit=8){
  if(!target?.selectedGymId)return baseExerciseHistoryV93(target,limit);
  return baseExerciseHistoryV93(target,Number.MAX_SAFE_INTEGER).filter(row=>sessionMatchesExerciseGym(row.session,row.exercise,target)).slice(0,limit);
};
const baseLastExerciseDataV93=lastExerciseData;
lastExerciseData=function(target){
  if(!target?.selectedGymId)return baseLastExerciseDataV93(target);
  for(const sess of state.history||[]){
    const ex=(sess.exercises||[]).find(x=>historyExerciseMatches(x,target)&&sessionMatchesExerciseGym(sess,x,target));
    if(ex)return ex;
  }
  return null;
};
const baseExactHistorySetsV93=exactHistorySets;
exactHistorySets=function(target){
  if(!target?.selectedGymId)return baseExactHistorySetsV93(target);
  return baseExactHistorySetsV93(target).filter(row=>sessionMatchesExerciseGym(row.session,row.exercise,target));
};
const basePriorBestV93=priorBest;
priorBest=function(target){
  if(!target?.selectedGymId)return basePriorBestV93(target);
  let bestKg=isLowerHarder(target)?Infinity:0,bestE1rm=0;
  for(const row of exactHistorySets(target)){
    const kg=Number(row.set.kg)||0,reps=Number(row.set.reps)||0;
    if(kg>0)bestKg=isLowerHarder(target)?Math.min(bestKg,kg):Math.max(bestKg,kg);
    if(!isLowerHarder(target)&&reps>0&&reps<=12)bestE1rm=Math.max(bestE1rm,kg*(1+reps/30));
  }
  return{bestKg:Number.isFinite(bestKg)?bestKg:0,bestE1rm};
};
function forCurrentGym(ex){
  if(!ex||typeof ex==='string'||ex.selectedGymId||!activeGym())return ex;
  return machineNeedsGymSpecificHistory(ex)?{...ex,selectedGymId:activeGym().id,selectedGymName:activeGym().name}:ex;
}
manualReferenceFor=function(ex){
  const p=catalogEntry(effectiveExerciseId(ex));if(!p)return null;
  const scope=ex?.selectedGymId||(machineNeedsGymSpecificHistory(p)?activeGym()?.id:'');
  if(scope)return p.referenceByGym?.[scope]||null;
  return p.reference||null;
};
exerciseReferenceStats=function(target){
  let ex=typeof target==='string'?(catalogEntry(target)||findProgramExercise(target)||{name:target,exerciseId:target}):target;
  if(!ex)return{best:null,latest:null,manual:null,bestE1rm:0};
  ex=forCurrentGym(ex);
  const entry=catalogEntry(effectiveExerciseId(ex)),ref=manualReferenceFor(ex);
  const manual=ref&&Number(ref.kg)>0&&Number(ref.reps)>0?{...ref,rawRir:ref.rir,rir:referenceRir(ref),manual:true,date:ref.updatedAt||entry?.updatedAt}:null;
  const rows=exactHistorySets(ex).map(x=>({kg:Number(x.set.kg),reps:Number(x.set.reps),rir:rirEquivalent(x.set)??0,date:x.session.startedAt,manual:false,set:x.set}));
  const latest=[...rows,...(manual?[manual]:[])].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))[0]||null;
  if(isLowerHarder(ex))return{best:latest,latest,manual,bestE1rm:0};
  const candidates=[...rows,...(manual?[manual]:[])].map(r=>({...r,e1rm:estimateE1RM(r.kg,r.reps,r.rir)})).filter(r=>r.e1rm>0);
  const best=candidates.sort((a,b)=>b.e1rm-a.e1rm)[0]||latest;
  return{best,latest,manual,bestE1rm:Number(best?.e1rm)||0};
};
function editReferenceForGym(id){
  const p=catalogEntry(id),g=activeGym();if(!p||!g)return;
  const ref=p.referenceByGym?.[g.id]||{};
  showModal(`<h2>Riferimento carico per ${esc(gymDisplayName(g))}</h2><p class="subtle">${esc(p.name)}. I kg valgono soltanto per questa palestra. Lascia vuoto se non hai eseguito il movimento qui.</p>
    <div class="form-grid"><label>Kg<input id="gymRefKg" class="num-input" type="number" min="0" step="any" value="${esc(ref.kg??'')}"></label><label>Ripetizioni<input id="gymRefReps" class="num-input" type="number" min="1" max="30" value="${esc(ref.reps??'')}"></label><label>RIR opzionale<input id="gymRefRir" class="num-input" type="number" min="0" max="5" step="0.5" value="${esc(ref.rir??'')}"></label></div>
    <button class="primary-btn" style="margin-top:12px" onclick="saveReferenceForGym(decodeURIComponent('${encodedArg(id)}'))">Salva riferimento sede</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function saveReferenceForGym(id){
  const p=catalogEntry(id),g=activeGym();if(!p||!g)return;
  const kg=Number($('#gymRefKg')?.value),reps=Number($('#gymRefReps')?.value),rir=$('#gymRefRir')?.value??'';
  p.referenceByGym=p.referenceByGym||{};
  if(!(kg>0)||!(reps>0)){delete p.referenceByGym[g.id];}
  else p.referenceByGym[g.id]={kg,reps,rir:rir===''?'':clamp(Number(rir)||0,0,5),metric:'RIR',source:'manual-specifico-palestra',updatedAt:new Date().toISOString()};
  saveState();closeModal();render();toast(kg>0&&reps>0?'Riferimento specifico salvato':'Riferimento sede lasciato vuoto');
}
const baseShowExerciseProfileV93=showExerciseProfile;
showExerciseProfile=function(id){
  baseShowExerciseProfileV93(id);
  const p=catalogEntry(id),g=activeGym(),pane=$('#modalBackdrop .modal .action-stack');
  if(pane&&p?.safetyCue){
    const goal=p.goal==='strength'?'Forza':p.goal==='both'?'Forza e ipertrofia':'Ipertrofia';
    pane.insertAdjacentHTML('beforebegin',`<div class="coach-note evidence-guide"><b>Indicazioni di esecuzione:</b> ${esc(p.safetyCue)}<br><small>${esc(goal)} · indicativamente ${esc(p.defaultSets||2)} serie × ${esc(p.defaultReps||'8-12')} reps · RIR ${esc(p.defaultRir??2)} · riposo ${esc(p.defaultRestSec||90)} s. Adatta al tuo livello.</small></div>`);
  }
  if(pane&&p?.needsReview){pane.insertAdjacentHTML('beforebegin',`<div class="coach-note"><b>DA VERIFICARE:</b> ${esc(p.reviewNote||'Profilo non confermato; non selezionarlo fino a revisione.')}</div>`);}
  if(pane&&g&&machineNeedsGymSpecificHistory(p)){
    pane.insertAdjacentHTML('beforeend',`<button class="secondary-btn" onclick="editReferenceForGym(decodeURIComponent('${encodedArg(id)}'))">Carico di ${esc(gymDisplayName(g))}</button>`);
  }
};

function catalogFilterNow(){
  const q=cleanKey(state.ui.catalogQuery||''),cat=state.ui.catalogCategory||'',goal=state.ui.catalogGoal||'';
  let visible=0;
  document.querySelectorAll('.catalog-row[data-search]').forEach(el=>{
    const show=(!q||String(el.dataset.search||'').includes(q))&&(!cat||el.dataset.category===cat)&&(!goal||el.dataset.goal===goal);
    el.style.display=show?'grid':'none';if(show)visible++;
  });
  const el=$('#catalogVisibleCount');if(el)el.textContent=visible;
}
filterCatalogRows=function(q){state.ui.catalogQuery=String(q||'');saveState();catalogFilterNow();};
function changeCatalogFilter(field,value){if(!['catalogCategory','catalogGoal'].includes(field))return;state.ui[field]=value;saveState();catalogFilterNow();}
renderExerciseCatalogCard=function(){
  const entries=catalogEntries(),cat=state.ui.catalogCategory||'',goal=state.ui.catalogGoal||'',query=state.ui.catalogQuery||'';
  const categories=[...new Set(entries.map(x=>x.category).filter(Boolean))].sort((a,b)=>{
    const ai=LIBRARY_CATEGORY_ORDER.indexOf(a),bi=LIBRARY_CATEGORY_ORDER.indexOf(b);return (ai<0?99:ai)-(bi<0?99:bi);
  });
  const rows=entries.map(p=>{
    const st=exerciseReferenceStats(p),ref=st.latest;
    const str=cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''} ${p.category||''} ${p.goal||''}`);
    const show=(!query||str.includes(cleanKey(query)))&&(!cat||p.category===cat)&&(!goal||p.goal===goal);
    return `<button class="catalog-row" data-search="${esc(str)}" data-category="${esc(p.category||'')}" data-goal="${esc(p.goal||'')}" style="${show?'':'display:none'}" onclick="showExerciseProfile(decodeURIComponent('${encodedArg(p.id)}'))"><div><b>${esc(profileDisplayName(p))}</b><small>${esc(p.category||'Altro')} · ${esc(p.equipment||'Attrezzatura non specificata')}</small></div><div class="catalog-kpi"><strong>${ref?`${fmtKg(ref.kg)}×${ref.reps}`:'—'}</strong><small>${ref?(st.bestE1rm?`e1RM ${fmtKg(st.bestE1rm)}`:'ultimo dato'):'Nessun carico'}</small></div></button>`;
  }).join('');
  const visible=entries.filter(p=>(!query||cleanKey(`${p.name} ${p.gym||''} ${p.equipment||''} ${p.category||''} ${p.goal||''}`).includes(cleanKey(query)))&&(!cat||p.category===cat)&&(!goal||p.goal===goal)).length;
  return `<section class="card"><div class="row between"><div><h2 style="margin:0">Libreria esercizi e carichi</h2><div class="subtle"><b id="catalogVisibleCount">${visible}</b> visibili su ${entries.length} profili · ${EXERCISE_LIBRARY_2026.length} esercizi guida</div></div><button class="chip-btn" onclick="showCatalogEditor()">+ Nuovo</button></div>
    <input class="text-input" style="text-align:left;margin-top:12px" value="${esc(query)}" oninput="filterCatalogRows(this.value)" placeholder="Cerca movimento, variante, marca…">
    <div class="catalog-filter-grid"><select class="select-input" onchange="changeCatalogFilter('catalogCategory',this.value)"><option value="">Tutti i gruppi</option>${categories.map(x=>`<option value="${esc(x)}" ${x===cat?'selected':''}>${esc(x)}</option>`).join('')}</select><select class="select-input" onchange="changeCatalogFilter('catalogGoal',this.value)"><option value="">Tutti gli obiettivi</option><option value="strength" ${goal==='strength'?'selected':''}>Forza</option><option value="hypertrophy" ${goal==='hypertrophy'?'selected':''}>Ipertrofia</option><option value="both" ${goal==='both'?'selected':''}>Entrambi</option></select></div>
    <p class="subtle" style="margin:9px 0">Le varianti nuove partono senza carichi. Per le macchine il riferimento è filtrato per palestra selezionata; per manubri e bilanciere può essere condiviso.</p>
    <div class="catalog-list">${rows}</div></section>`;
};

const TRAINING_TEMPLATES_V93={
  full3:{title:'Full Body A/B/C - 3 giorni',weeks:8,subtitle:'Forza + ipertrofia, esercizi ripetibili, senza carichi preimpostati',workouts:{
    'FULL A':['panca-piana-bilanciere','rematore-chest-supported-macchina','hack-squat-macchina','leg-curl-seduto','calf-raise-in-piedi-macchina'],
    'FULL B':['distensioni-manubri-panca-15','lat-pulldown-presa-neutra','romanian-deadlift-manubri','alzate-laterali-al-cavo-dietro-il-busto','curl-alternato-manubri-panca-60'],
    'FULL C':['chest-press-convergente','pulley-presa-neutra-stretta','pressa-45-piede-medio','leg-extension-unilaterale','estensioni-tricipiti-overhead-corda','crunch-ai-cavi-in-ginocchio']
  }},
  upper4:{title:'Upper / Lower - 4 giorni',weeks:8,subtitle:'Progressione su multiarticolari, accessori a volume sostenibile',workouts:{
    'UPPER A':['panca-piana-bilanciere','rematore-chest-supported-presa-neutra','distensioni-manubri-panca-15','lat-pulldown-presa-neutra','alzate-laterali-manubri-seduto','estensioni-tricipiti-overhead-unilaterale-al-cavo','curl-alternato-manubri-panca-60'],
    'LOWER A':['hack-squat-macchina','leg-curl-seduto','pressa-orizzontale','calf-raise-seduto','crunch-ai-cavi-in-ginocchio'],
    'UPPER B':['chest-press-convergente','high-row-convergente','shoulder-press-macchina-presa-neutra','croci-ai-cavi-in-posizione-allungata','lat-pulldown-unilaterale-al-cavo','curl-scott-alla-macchina','pushdown-corda'],
    'LOWER B':['romanian-deadlift-manubri','belt-squat-con-fermo','hip-thrust-macchina-con-fermo','leg-extension-con-fermo-in-alto','calf-raise-in-piedi-macchina','pallof-press']
  }},
  ppl5:{title:'PPL + Upper / Lower - 5 giorni',weeks:8,subtitle:'Split 5 sedute con macchine stabili, manubri e carichi personalizzabili',workouts:{
    'PUSH':['panca-piana-bilanciere','distensioni-manubri-panca-15','shoulder-press-macchina-presa-neutra','croci-ai-cavi-in-posizione-allungata','alzate-laterali-al-cavo-dietro-il-busto','estensioni-tricipiti-overhead-corda'],
    'PULL':['lat-pulldown-presa-neutra','rematore-chest-supported-macchina','pulley-presa-neutra-stretta','reverse-pec-deck-presa-neutra','curl-alternato-manubri-panca-60','curl-hammer-corda-ai-cavi'],
    'LEGS':['hack-squat-macchina','pressa-45-piede-medio','leg-extension-unilaterale','leg-curl-seduto','calf-raise-in-piedi-macchina'],
    'UPPER':['chest-press-convergente','high-row-convergente','distensioni-manubri-panca-30','lat-pulldown-unilaterale-al-cavo','lateral-raise-machine','pushdown-corda'],
    'LOWER':['romanian-deadlift-manubri','belt-squat-con-fermo','hip-thrust-macchina-con-fermo','leg-curl-sdraiato','calf-raise-seduto','pallof-press']
  }}
};
function safeProgramExercise(entry){
  const isPaused=/con fermo|fermo 1 s/i.test(entry.name||'');
  const ex={name:entry.name,historyKey:entry.name,exerciseId:entry.id,movementId:entry.movementId,
    equipment:entry.equipment||'',gym:entry.gym||'',loadMode:entry.loadMode||'total',
    gymScope:entry.gymScope||'shared',category:entry.category||'',sets:Math.max(1,Number(entry.defaultSets)||2),
    reps:entry.defaultReps||'8-12',rir:String(entry.defaultRir??2),restSec:Number(entry.defaultRestSec)||90,
    loadDirection:entry.loadDirection||(entry.loadMode==='assistance'?'lower-is-harder':'higher-is-harder'),
    note:entry.safetyCue||'',special:null,autoLoad:true,progression:{},
    technique:{mode:isPaused?'pause':'standard',pauseSeconds:isPaused?1:0,position:'controllata'}};
  return ex;
}
function createTrainingTemplate(key){
  ensureEvidenceExerciseCatalog();const t=TRAINING_TEMPLATES_V93[key];if(!t)return null;
  const workouts={};
  for(const [name,ids]of Object.entries(t.workouts)){
    const exercises=ids.map(id=>{
      const p=catalogEntry(id);
      if(!p)throw new Error('Esercizio mancante nel catalogo: '+id);
      return safeProgramExercise(p);
    });
    workouts[name]={name,exercises};
  }
  return {title:t.title,subtitle:t.subtitle,weeks:t.weeks,startWeek:1,splitOrder:Object.keys(workouts),workouts,
    schemaVersion:1,createdFrom:'template-v9.3.0',legacyWeekAdaptations:false};
}
function builderMustBeFree(){if(state.currentSession){toast('Prima termina o scarta la sessione attiva');return false;}return true;}
function startProgramBuilder(kind='clone'){
  if(!builderMustBeFree())return;
  if(state.builderDraft&&!confirm('Cancellare la bozza scheda precedente non salvata?'))return;
  let d=null;
  try{
    if(kind==='clone'&&!programSplit().length)kind='blank';
    if(kind==='clone'){
      d=clone(activeProgram());
      delete d.libraryId;delete d.importedAt;delete d.id;
      d.title=`${d.title||'Scheda attuale'} · copia`;
    }else if(kind==='blank'){
      d={title:'Nuova scheda',subtitle:'Personalizzata',weeks:8,startWeek:1,splitOrder:['ALLENAMENTO A'],
        workouts:{'ALLENAMENTO A':{name:'ALLENAMENTO A',exercises:[]}},legacyWeekAdaptations:false};
    }else d=createTrainingTemplate(kind);
    if(!d)return;
  }catch(err){console.warn(err);toast('Impossibile creare la scheda: '+err.message);return;}
  state.builderDraft=d;state.ui.view='builder';state.ui.builderOpen=d.splitOrder?.[0]||'';
  saveState();render();window.scrollTo(0,0);
}
function builderGet(){return state.builderDraft?.workouts?state.builderDraft:null;}
function builderUpdateMeta(field,value){
  const d=builderGet();if(!d||!['title','subtitle','weeks'].includes(field))return;
  d[field]=field==='weeks'?clamp(Number(value)||8,1,52):String(value||'').slice(0,150);
  saveState();
}
function builderSetOpen(key){state.ui.builderOpen=key;saveState();}
function builderUpdateExercise(key,i,field,value){
  const d=builderGet(),ex=d?.workouts?.[key]?.exercises?.[i];if(!ex||ex.special)return;
  if(field==='sets')ex.sets=clamp(Math.round(Number(value)||1),1,8);
  else if(field==='restSec')ex.restSec=clamp(Math.round(Number(value)||90),20,360);
  else if(field==='reps')ex.reps=String(value||'8-12').slice(0,24);
  else if(field==='rir')ex.rir=String(value||'2').slice(0,8);
  else if(field==='techniqueMode'){
    const mode=TECHNIQUE_LABELS[value]?value:'standard';
    if((mode==='dropset'||mode==='restpause')&&advancedTechniqueCaution(ex) && !confirm('Su bilancieri e manubri in esercizi multiarticolari le tecniche ad alta fatica aumentano la complessità. Preferire macchine ed esercizi di isolamento. Procedere comunque?')){
      render();return;
    }
    ex.technique={...(ex.technique||{}),mode};
    if(mode==='pause'&&!(Number(ex.technique.pauseSeconds)>0))ex.technique.pauseSeconds=1;
  }else if(field==='pauseSeconds'){
    ex.technique=ex.technique||{mode:'pause'};ex.technique.pauseSeconds=clamp(Number(value)||1,1,5);
  }else if(field==='note')ex.note=String(value||'').slice(0,300);
  else return;
  saveState();
}
function advancedTechniqueCaution(ex){
  const m=effectiveMovementId(ex),e=cleanKey(ex.equipment||'');
  return ['bench-press','knee-dominant','hip-hinge','overhead-press'].includes(m)&&/bilanciere|manubr|kettlebell/.test(e);
}
function builderMove(key,i,delta){
  const a=builderGet()?.workouts?.[key]?.exercises,j=i+delta;if(!a||i<0||j<0||i>=a.length||j>=a.length)return;
  [a[i],a[j]]=[a[j],a[i]];state.ui.builderOpen=key;saveState();render();
}
function builderRemove(key,i){
  const a=builderGet()?.workouts?.[key]?.exercises;if(!a?.[i])return;
  if(!confirm(`Rimuovere “${a[i].name}” dalla bozza? Lo storico personale non cambia.`))return;
  a.splice(i,1);state.ui.builderOpen=key;saveState();render();
}
function builderAddExercise(key,id){
  const p=catalogEntry(id),d=builderGet();if(!d?.workouts?.[key]||!p)return;
  const entry=safeProgramExercise(p);
  d.workouts[key].exercises.push(entry);state.ui.builderOpen=key;
  saveState();closeModal();render();toast('Esercizio aggiunto senza carico iniziale');
}
function showBuilderExercisePicker(key){
  if(!builderGet()?.workouts?.[key])return;
  const gym=activeGym(),entries=catalogEntries().filter(p=>!p.needsReview&&(!p.gym||!gym||cleanKey(p.gym)===cleanKey(gym.name))&&(typeof v94AvailableAtGym!=='function'||v94AvailableAtGym(p,gym)));
  showModal(`<h2>Aggiungi a ${esc(key)}</h2><p class="subtle">Scegli dalla libreria. Carico iniziale vuoto se non hai uno storico comparabile nella palestra selezionata.</p>
    <input class="text-input" style="text-align:left;margin-bottom:10px" placeholder="Cerca esercizio o gruppo muscolare" oninput="filterModalExerciseOptions(this.value)">
    <div class="modal-list exercise-picker">${entries.map(p=>`<button class="modal-option exercise-pick" data-search="${esc(cleanKey(`${p.name} ${p.category||''} ${p.equipment||''}`))}" onclick="builderAddExercise(decodeURIComponent('${encodedArg(key)}'),decodeURIComponent('${encodedArg(p.id)}'))"><b>${esc(p.name)}</b><small>${esc(p.category||'Altro')} · ${esc(p.equipment||'')} · ${esc(p.defaultReps||'range personalizzabile')}</small></button>`).join('')}</div>
    <button class="secondary-btn" style="margin-top:9px" onclick="closeModal()">Chiudi</button>`);
}
function showNewBuilderWorkout(){
  if(!builderGet())return;
  showModal(`<h2>Nuovo allenamento</h2><label class="field-block">Nome<input class="text-input" id="builderWorkoutName" value="ALLENAMENTO ${String.fromCharCode(65+Math.min(25,Object.keys(builderGet().workouts).length))}"></label>
    <button class="primary-btn" onclick="addBuilderWorkout()" style="margin-top:12px">Crea allenamento</button><button class="secondary-btn" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);
}
function addBuilderWorkout(){
  const d=builderGet(),key=String($('#builderWorkoutName')?.value||'').trim().slice(0,35);
  if(!d||!key){toast('Inserisci nome');return;}
  if(d.workouts[key]){toast('Questo allenamento esiste già');return;}
  if(Object.keys(d.workouts).length>=10){toast('Massimo 10 allenamenti');return;}
  d.workouts[key]={name:key,exercises:[]};d.splitOrder.push(key);state.ui.builderOpen=key;
  saveState();closeModal();render();
}
function builderRemoveWorkout(key){
  const d=builderGet();if(!d?.workouts?.[key])return;
  if(d.splitOrder.length<=1){toast('Mantieni almeno un allenamento');return;}
  if(!confirm(`Eliminare “${key}” dalla nuova bozza?`))return;
  delete d.workouts[key];d.splitOrder=d.splitOrder.filter(x=>x!==key);
  state.ui.builderOpen=d.splitOrder[0];saveState();render();
}
function builderMoveWorkout(key,delta){
  const d=builderGet();if(!d)return;
  const i=d.splitOrder.indexOf(key),j=i+delta;if(i<0||j<0||j>=d.splitOrder.length)return;
  [d.splitOrder[i],d.splitOrder[j]]=[d.splitOrder[j],d.splitOrder[i]];
  state.ui.builderOpen=key;saveState();render();
}
function saveProgramBuilder(){
  if(!builderMustBeFree())return;
  const d=builderGet();if(!d)return;
  d.title=String($('#builderTitle')?.value||d.title||'Nuova scheda').trim().slice(0,150);
  d.subtitle=String($('#builderSubtitle')?.value||d.subtitle||'').trim().slice(0,150);
  d.weeks=clamp(Number($('#builderWeeks')?.value)||d.weeks||8,1,52);
  if(!d.title){toast('Inserisci un titolo alla scheda');return;}
  if(!d.splitOrder.some(key=>(d.workouts[key]?.exercises||[]).length)){toast('Aggiungi almeno un esercizio');return;}
  try{
    const clean=clone(d);
    delete clean.libraryId;delete clean.id;clean.legacyWeekAdaptations=false;
    const normalized=normalizeProgram(clean);
    // Una copia di una vecchia scheda usa un nuovo identificativo; i carichi
    // restano associati agli esercizi già eseguiti, non alla copia della scheda.
    normalized.libraryId=uid();normalized.startWeek=1;
    state.activeProgram=saveProgramToLibrary(normalized);
    state.currentWeek=1;state.preCycleStep=0;state.weekStartedAt=new Date().toISOString();
    state.pendingWeekAdvance=null;state.cycleCompletedAt=null;state.builderDraft=null;
    state.ui.view='program';state.ui.openExercise=0;
    syncExerciseCatalogFromKnownData();saveState();render();toast('Nuova scheda salvata e attivata');
  }catch(err){console.warn(err);toast(`Scheda non valida: ${err.message}`);}
}
function cancelProgramBuilder(){
  if(!confirm('Scartare la bozza? Nessuna scheda attiva verrà modificata.'))return;
  state.builderDraft=null;state.ui.view='program';saveState();render();
}
function programBuilderToolbar(){
  return `<section class="card builder-promo"><div class="row between"><div><h2 style="margin:0">Crea o cambia scheda</h2><p class="subtle">Esercizi già catalogati, nessun carico inventato. Puoi clonare il programma attuale oppure partire da modelli modificabili.</p></div><span class="badge green">EDITOR</span></div>
    <div class="builder-template-grid"><button onclick="startProgramBuilder('clone')">Copia scheda</button><button onclick="startProgramBuilder('full3')">Full Body 3</button><button onclick="startProgramBuilder('upper4')">Upper/Lower 4</button><button onclick="startProgramBuilder('ppl5')">PPL 5</button><button onclick="startProgramBuilder('blank')">+ Vuota</button></div></section>`;
}
const baseRenderProgramV93=renderProgram;
renderProgram=function(){return baseRenderProgramV93().replace('<main class="content">','<main class="content">'+programBuilderToolbar());};
function renderProgramBuilder(){
  const d=builderGet();if(!d){state.ui.view='program';return renderProgram();}
  const gym=activeGym();
  let c=`<section class="card builder-hero"><div class="row between"><div><span class="badge green">EDITOR SCHEDA</span><h1>Costruisci la tua scheda</h1><p class="subtle">Tutte le modifiche sono una bozza. La scheda attiva e lo storico restano intatti finché non salvi.</p></div><button class="chip-btn" onclick="cancelProgramBuilder()">Esci</button></div><div class="builder-meta"><label>Nome scheda<input id="builderTitle" class="text-input" value="${esc(d.title||'')}" onchange="builderUpdateMeta('title',this.value)"></label><label>Durata, settimane<input id="builderWeeks" class="num-input" type="number" min="1" max="52" value="${Number(d.weeks)||8}" onchange="builderUpdateMeta('weeks',this.value)"></label></div><label class="field-block">Descrizione<input id="builderSubtitle" class="text-input" value="${esc(d.subtitle||'')}" onchange="builderUpdateMeta('subtitle',this.value)"></label><p class="subtle">Palestra: ${gym?esc(gymDisplayName(gym)):'non scelta'} · ${d.splitOrder.length} sedute · storico e massimali salvati separatamente.</p></section>`;
  for(const key of d.splitOrder){
    const w=d.workouts[key],exs=w?.exercises||[];if(!w)continue;
    const open=state.ui.builderOpen===key;
    c+=`<section class="card builder-workout"><div class="row between"><button class="builder-toggle" onclick="builderSetOpen(decodeURIComponent('${encodedArg(key)}'));render()"><b>${esc(key)}</b><small>${exs.length} esercizi ${open?'▾':'▸'}</small></button><div class="builder-top-actions"><button onclick="builderMoveWorkout(decodeURIComponent('${encodedArg(key)}'),-1)" title="Sposta su">↑</button><button onclick="builderMoveWorkout(decodeURIComponent('${encodedArg(key)}'),1)" title="Sposta giù">↓</button><button onclick="builderRemoveWorkout(decodeURIComponent('${encodedArg(key)}'))" title="Elimina seduta">×</button></div></div>`;
    if(open){
      c+=`<div class="builder-exercises">${exs.map((ex,i)=>{
        const technique=ex.technique?.mode||'standard';
        return `<div class="builder-ex"><div class="builder-ex-title"><b>${i+1}. ${esc(ex.name)}</b>${ex.special?'<span class="badge green">PANCA</span>':''}</div><small>${esc(ex.equipment||'')} · ${esc(ex.category||'')}</small>${ex.special?`<p class="subtle">Protocollo panca originale: serie programmate. Clona e personalizza gli accessori, mantenendo il piano A/B.</p>`:`<div class="builder-fields"><label>Serie<input class="num-input" type="number" min="1" max="8" value="${ex.sets}" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'sets',this.value)"></label><label>Ripetizioni<input class="text-input" value="${esc(ex.reps||'8-12')}" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'reps',this.value)"></label><label>RIR<input class="text-input" value="${esc(ex.rir||'2')}" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'rir',this.value)"></label><label>Rec. s<input class="num-input" type="number" min="20" max="360" step="5" value="${Number(ex.restSec)||90}" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'restSec',this.value)"></label></div><label class="builder-tech-label">Tecnica<select class="select-input" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'techniqueMode',this.value)">${Object.entries(TECHNIQUE_LABELS).map(([v,l])=>`<option value="${v}" ${v===technique?'selected':''}>${l}</option>`).join('')}</select></label>${technique==='pause'?`<label class="builder-tech-label">Secondi di fermo<input class="num-input" type="number" min="1" max="5" value="${Number(ex.technique?.pauseSeconds)||1}" onchange="builderUpdateExercise(decodeURIComponent('${encodedArg(key)}'),${i},'pauseSeconds',this.value)"></label>`:''}`}
        <div class="builder-ex-actions"><button onclick="builderMove(decodeURIComponent('${encodedArg(key)}'),${i},-1)">↑</button><button onclick="builderMove(decodeURIComponent('${encodedArg(key)}'),${i},1)">↓</button><button class="danger-mini" onclick="builderRemove(decodeURIComponent('${encodedArg(key)}'),${i})">Rimuovi</button></div></div>`;
      }).join('')}</div><button class="secondary-btn" onclick="showBuilderExercisePicker(decodeURIComponent('${encodedArg(key)}'))">+ Scegli esercizio dal database</button>`;
    }
    c+='</section>';
  }
  c+=`<section class="card"><button class="secondary-btn" onclick="showNewBuilderWorkout()">+ Aggiungi un giorno</button><button class="primary-btn" style="margin-top:10px" onclick="saveProgramBuilder()">Salva e attiva questa scheda</button><button class="secondary-btn" style="margin-top:8px" onclick="cancelProgramBuilder()">Annulla modifiche</button><p class="subtle" style="margin-top:8px">Le serie con fermo e le tecniche di intensità sono modificabili anche durante la seduta. Nessun nuovo esercizio eredita i carichi di un movimento diverso.</p></section>`;
  return shell(c,'Editor schede','forza, ipertrofia e progressioni');
}

// --- Tecniche di intensita: valori e sotto-serie realmente registrati. ---
function configuredTechnique(ex){
  const cfg=ex?.technique||{};
  return {mode:TECHNIQUE_LABELS[cfg.mode]?cfg.mode:'standard',pauseSeconds:clamp(Number(cfg.pauseSeconds)||1,1,5),eccentricSeconds:clamp(Number(cfg.eccentricSeconds)||3,2,6)};
}
function intensityAnchor(ex){return Math.max(0,(ex?.sets||[]).length-1);}
function attachTechniqueToWorkingSet(ex){
  if(!ex?.sets?.length||ex.special)return;
  const cfg=configuredTechnique(ex),s=ex.sets[intensityAnchor(ex)];
  if(!s)return;
  ex.technique={...cfg};
  for(const st of ex.sets){
    if(cfg.mode==='pause')st.pauseSeconds=cfg.pauseSeconds;
    else delete st.pauseSeconds;
    if(cfg.mode==='tempo')st.eccentricSeconds=cfg.eccentricSeconds;
    else delete st.eccentricSeconds;
  }
  if(cfg.mode==='dropset'||cfg.mode==='restpause'){
    if(!Array.isArray(s.intensitySteps)||!s.intensitySteps.length){
      s.intensitySteps=[{kg:'',reps:'',done:false,type:cfg.mode,completedAt:null}];
    }
  }
}
// Integrazione gruppi muscolari senza riscrivere l'identita storica macchina.
const baseMuscleMapV93=muscleMapForExercise;
muscleMapForExercise=function(ex){
  const m=effectiveMovementId(ex),name=cleanKey(ex?.name||'');
  if(m==='incline-chest-technogym'||m==='multipower-inclinato')return[['Petto',1],['Tricipiti',.35],['Spalle',.25]];
  if(m==='shoulder-trainer')return[['Spalle',1]];
  if(m==='latzug')return[['Dorso',1],['Bicipiti',.4]];
  if(/hack squat/.test(name)&&m==='horizontal-pull')return[['Quadricipiti',1],['Glutei',.55]];
  return baseMuscleMapV93(ex);
};
const baseStartWorkoutV93=startWorkout;
startWorkout=function(name){
  const before=state.currentSession;
  baseStartWorkoutV93(name);
  if(before||!state.currentSession)return;
  for(const ex of state.currentSession.exercises||[]){
    if(ex.special)continue;
    attachTechniqueToWorkingSet(ex);
  }
  state.currentSession.coachVersion='v9.3';saveState();render();
};
function techniqueSessionExercise(exi){return state.currentSession?.exercises?.[exi]||null;}
function setSessionTechnique(exi,mode){
  const ex=techniqueSessionExercise(exi);
  if(!ex||ex.special||!TECHNIQUE_LABELS[mode])return;
  if(['dropset','restpause'].includes(mode)&&advancedTechniqueCaution(ex)&&!confirm('Su multiarticolari a carico libero, questa tecnica aumenta fatica e complessita. Preferisci macchine o esercizi di isolamento. Procedere comunque?'))return;
  const recorded=(ex.sets||[]).some(st=>(st.intensitySteps||[]).some(x=>x.done));
  if(recorded&&mode!==configuredTechnique(ex).mode){toast('Sotto-serie gia registrate: prima rimuovile manualmente');return;}
  ex.technique={...configuredTechnique(ex),mode};
  for(const st of ex.sets||[])if(!recorded)delete st.intensitySteps;
  attachTechniqueToWorkingSet(ex);
  saveState();render();
}
function setSessionTempo(exi,key,value){
  const ex=techniqueSessionExercise(exi);if(!ex||!['pauseSeconds','eccentricSeconds'].includes(key))return;
  ex.technique={...configuredTechnique(ex),[key]:clamp(Math.round(Number(value)||1),key==='pauseSeconds'?1:2,key==='pauseSeconds'?5:6)};
  attachTechniqueToWorkingSet(ex);saveState();render();
}
function addIntensityStep(exi){
  const ex=techniqueSessionExercise(exi),cfg=configuredTechnique(ex);
  if(!ex||!['dropset','restpause'].includes(cfg.mode))return;
  const anchor=ex.sets?.[intensityAnchor(ex)];if(!anchor)return;
  anchor.intensitySteps=Array.isArray(anchor.intensitySteps)?anchor.intensitySteps:[];
  if(anchor.intensitySteps.length>=3){toast('Massimo 3 sotto-serie');return;}
  anchor.intensitySteps.push({kg:'',reps:'',done:false,type:cfg.mode,completedAt:null});
  saveState();render();
}
function updateIntensityStep(exi,i,key,value){
  const ex=techniqueSessionExercise(exi),st=ex?.sets?.[intensityAnchor(ex)]?.intensitySteps?.[i];
  if(!st||st.done||!['kg','reps'].includes(key))return;
  if(value===''){st[key]='';saveState();return;}
  const val=Number(String(value).replace(',','.'));
  if(!Number.isFinite(val)||val<0)return;
  st[key]=key==='reps'?Math.min(100,Math.round(val)):Math.round(val*100)/100;
  saveState();
}
function toggleIntensityStep(exi,i){
  const ex=techniqueSessionExercise(exi),parent=ex?.sets?.[intensityAnchor(ex)],st=parent?.intensitySteps?.[i];
  if(!st)return;
  if(st.done){st.done=false;st.completedAt=null;saveState();render();return;}
  if(!parent.done){toast('Completa prima la serie principale');return;}
  if(!(Number(st.reps)>0)||!(Number(st.kg)>0)){toast('Inserisci kg e ripetizioni della sotto-serie');return;}
  if(i>0&&!parent.intensitySteps[i-1].done){toast('Completa prima la sotto-serie precedente');return;}
  st.done=true;st.completedAt=new Date().toISOString();saveState();render();
  if(configuredTechnique(ex).mode==='restpause')toast('Recupero breve 15-25 s, poi riprendi senza forzare la tecnica');
}
function removeIntensityStep(exi,i){
  const ex=techniqueSessionExercise(exi),anchor=ex?.sets?.[intensityAnchor(ex)],steps=anchor?.intensitySteps;
  if(!Array.isArray(steps)||!steps[i])return;
  if(steps[i].done&&!confirm('Eliminare la sotto-serie completata?'))return;
  steps.splice(i,1);saveState();render();
}
function renderIntensityControls(ex,exi){
  if(!ex?.sets?.length||ex.special)return'';
  const cfg=configuredTechnique(ex),mode=cfg.mode,labels=Object.entries(TECHNIQUE_LABELS);
  const warnings={
    pause:'Fermo di 1-3 s nella posizione stabile selezionata. Riduci il carico se necessario; non rilassare le articolazioni.',
    dropset:'Dopo l’ultima serie principale, riduci il carico e prosegui con 1-3 sotto-serie. Evita quando la fatica compromette equilibrio e tecnica.',
    restpause:'Dopo l’ultima serie principale: 15-25 s di recupero, poi mini-serie controllate. Preferisci macchine o isolamento.',
    tempo:'Eccentrica controllata: niente slanci. Il tempo non sostituisce ampiezza e progressione.',
    standard:'Serie convenzionali: il riferimento principale per monitorare forza e progressione.'
  };
  let s=`<section class="intensity-card"><div class="intensity-heading"><b>Metodo di esecuzione</b><span class="badge">OPZIONALE</span></div><select class="select-input" onchange="setSessionTechnique(${exi},this.value)">${labels.map(([v,l])=>`<option value="${v}" ${mode===v?'selected':''}>${esc(l)}</option>`).join('')}</select><div class="subtle intensity-hint">${esc(warnings[mode])}</div>`;
  if(mode==='pause')s+=`<label class="intensity-config">Durata del fermo <input class="num-input" type="number" min="1" max="5" step="1" value="${cfg.pauseSeconds}" onchange="setSessionTempo(${exi},'pauseSeconds',this.value)"> secondi</label>`;
  if(mode==='tempo')s+=`<label class="intensity-config">Eccentrica <input class="num-input" type="number" min="2" max="6" step="1" value="${cfg.eccentricSeconds}" onchange="setSessionTempo(${exi},'eccentricSeconds',this.value)"> secondi</label>`;
  if(['dropset','restpause'].includes(mode)){
    const anchor=ex.sets[intensityAnchor(ex)],steps=anchor?.intensitySteps||[];
    s+=`<div class="intensity-list"><div class="intensity-subheading">Dopo la serie ${esc(anchor.label||ex.sets.length)} · ${mode==='dropset'?'carico ridotto':'mini-serie'}</div>`;
    steps.forEach((step,i)=>{
      s+=`<div class="intensity-row"><b>${mode==='dropset'?'Drop':'RP'} ${i+1}</b><label><input aria-label="kg sotto-serie" type="number" inputmode="decimal" class="num-input" step="any" min="0" placeholder="kg" value="${esc(step.kg??'')}" ${step.done?'disabled':''} oninput="updateIntensityStep(${exi},${i},'kg',this.value)"><small>kg</small></label><label><input aria-label="ripetizioni sotto-serie" type="number" inputmode="numeric" class="num-input" step="1" min="1" placeholder="rep" value="${esc(step.reps??'')}" ${step.done?'disabled':''} oninput="updateIntensityStep(${exi},${i},'reps',this.value)"><small>rep</small></label><button class="set-btn ${step.done?'done':''}" onclick="toggleIntensityStep(${exi},${i})" aria-label="Completa sotto-serie">✓</button><button class="intensity-remove" aria-label="Rimuovi sotto-serie" onclick="removeIntensityStep(${exi},${i})">×</button></div>`;
    });
    s+=`</div><button class="secondary-btn intensity-add" onclick="addIntensityStep(${exi})">+ ${mode==='dropset'?'Aggiungi drop':'Aggiungi mini-serie'}</button>`;
  }
  return s+'</section>';
}
const baseTotalSessionVolumeV93=totalSessionVolume;
totalSessionVolume=function(sess){
  let volume=baseTotalSessionVolumeV93(sess);
  for(const ex of sess?.exercises||[])for(const st of ex.sets||[])for(const sub of st.intensitySteps||[]){
    if(sub.done)volume+=(Number(sub.kg)||0)*(Number(sub.reps)||0);
  }
  return Math.round(volume);
};
const baseShowHistoryDetailV93=showHistoryDetail;
showHistoryDetail=function(id){
  baseShowHistoryDetailV93(id);
  const sess=state.history.find(x=>x.id===id),el=document.querySelector('#modalBackdrop .modal .modal-list');
  if(!sess||!el)return;
  const boxes=el.querySelectorAll('.card.flat');let ci=0;
  for(const ex of sess.exercises||[]){
    const recorded=(ex.sets||[]).filter(x=>x.done);
    if(!recorded.length&&!ex.done)continue;
    const element=boxes[ci++];if(!element)continue;
    const cfg=configuredTechnique(ex),mode=cfg.mode;
    const savedSegments=(ex.sets||[]).flatMap(st=>(st.intensitySteps||[]).filter(x=>x.done).map((sub,i)=>({...sub,index:i+1,parent:st.label||'?'})));
    if(mode==='standard'&&!savedSegments.length)continue;
    let detail=`<div class="history-intensity"><b>${esc(TECHNIQUE_LABELS[mode])}</b>${mode==='pause'?` · ${cfg.pauseSeconds} s di fermo`:''}${mode==='tempo'?` · ${cfg.eccentricSeconds} s eccentrica`:''}`;
    if(savedSegments.length)detail+=`<div>${savedSegments.map(x=>`${esc(x.parent)} · ${x.type==='restpause'?'RP':'Drop'} ${x.index}: ${fmtKg(x.kg)} kg × ${x.reps}`).join(' · ')}</div>`;
    element.insertAdjacentHTML('beforeend',detail+'</div>');
  }
};

// --- CSV compatibile con l'esportazione precedente; le sotto-serie si
//     esportano in righe separate e si riaggregano all'importazione. ---
const INTENSITY_CSV_COLUMNS=['Tecnica','Fermo_sec','Eccentrica_sec','Sotto_serie','Riferimento_serie'];
function sessionCsvBase(sess,ex,st,label){
  return [sess.id,sess.startedAt,sess.workout,sess.week,sess.durationMin||'',sess.bodyweightKg??'',sess.sessionRpe??'',sess.notes||'',sess.programTitle||'',sess.gymName||'',ex.name,effectiveExerciseId(ex),effectiveMovementId(ex),ex.historyKey||ex.baseName||ex.name,ex.gym||'',ex.equipment||'',ex.loadMode||inferLoadMode(ex),label,st.kg??'',st.recommendedKg??ex.loadSuggestion?.recommendedKg??'',st.reps??'',st.metricValue??'',st.metric||'RIR',st.barSpeed||'',ex.loadSuggestion?.reason||'',ex.effortFeedback||'',ex.notes||''];
}
exportCSV=function(){
  const rows=[['Sessione','Data','Workout','Settimana','Durata_min','Peso_kg','RPE_sessione','Note_sessione','Programma','Palestra_sessione','Esercizio','ExerciseId','MovementId','HistoryKey','Palestra','Attrezzatura','LoadMode','Serie','Kg','Carico_consigliato','Reps','RIR_RPE','Tipo','Velocita','Motivo_consiglio','Feedback_esercizio','Note_esercizio',...INTENSITY_CSV_COLUMNS]];
  for(const sess of [...state.history].reverse())for(const ex of sess.exercises||[]){
    const cfg=configuredTechnique(ex);
    for(let i=0;i<(ex.sets||[]).length;i++){
      const st=ex.sets[i];if(!st.done)continue;
      const label=String(st.label||i+1);
      rows.push([...sessionCsvBase(sess,ex,st,label),cfg.mode,st.pauseSeconds||'',st.eccentricSeconds||'','0','']);
      for(let j=0;j<(st.intensitySteps||[]).length;j++){
        const sub=st.intensitySteps[j];if(!sub.done)continue;
        rows.push([...sessionCsvBase(sess,ex,{...sub,recommendedKg:'',metric:'RIR',metricValue:'',barSpeed:''},`INT${i+1}-${j+1}`),sub.type||cfg.mode,'','','1',label]);
      }
    }
  }
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`gym-tracker-v9-3-storico-${new Date().toISOString().slice(0,10)}.csv`);
};
const baseHistoryFromCSVV93=historyFromCSV;
historyFromCSV=function(text){
  const rows=csvRowsAsObjects(text),result=baseHistoryFromCSVV93(text);
  if(!rows.length||!Object.keys(rows[0]||{}).some(x=>INTENSITY_CSV_COLUMNS.includes(x)))return result;
  // Il parser precedente crea anche le righe INT come serie normali.
  // Le rimuoviamo e inseriamo nel campo intensitySteps della serie di origine.
  for(const row of rows){
    const id=rowGet(row,'Sessione','Session','SessionId');
    const exerciseId=rowGet(row,'ExerciseId')||slugId(rowGet(row,'Esercizio','Exercise'));
    const sess=result.find(s=>s.id===id),ex=sess?.exercises?.find(x=>effectiveExerciseId(x)===exerciseId);
    if(!ex)continue;
    const sub=rowGet(row,'Sotto_serie')==='1';
    const label=String(rowGet(row,'Serie','Set'));
    if(sub){
      const idx=ex.sets.findIndex(x=>String(x.label)===label);
      const parsed=idx>=0?ex.sets.splice(idx,1)[0]:null;
      const parent=ex.sets.find(x=>String(x.label)===String(rowGet(row,'Riferimento_serie')));
      if(!parent||!parsed)continue;
      parent.intensitySteps=parent.intensitySteps||[];
      parent.intensitySteps.push({kg:parsed.kg,reps:parsed.reps,done:true,type:rowGet(row,'Tecnica')||'dropset',completedAt:parsed.completedAt});
    }else{
      const mode=rowGet(row,'Tecnica');if(TECHNIQUE_LABELS[mode])ex.technique={...configuredTechnique(ex),mode};
      const st=ex.sets.find(x=>String(x.label)===label);if(!st)continue;
      const pause=csvNum(rowGet(row,'Fermo_sec')),ecc=csvNum(rowGet(row,'Eccentrica_sec'));
      if(pause!=='')st.pauseSeconds=pause;
      if(ecc!=='')st.eccentricSeconds=ecc;
      if(pause!=='')ex.technique={...configuredTechnique(ex),pauseSeconds:pause};
      if(ecc!=='')ex.technique={...configuredTechnique(ex),eccentricSeconds:ecc};
    }
  }
  result.forEach(s=>s.volume=totalSessionVolume(s));return result;
};
const baseEnrichSessionV93=enrichSession;
enrichSession=function(existing,incoming){
  let changed=baseEnrichSessionV93(existing,incoming);
  for(const inc of incoming?.exercises||[]){
    const ex=(existing.exercises||[]).find(e=>historyExerciseMatches(e,inc));if(!ex)continue;
    if(inc.technique&&(!ex.technique||ex.technique.mode==='standard'&&inc.technique.mode!=='standard')){
      ex.technique=clone(inc.technique);changed=true;
    }
    for(const st of inc.sets||[]){
      const target=ex.sets?.find(x=>String(x.label)===String(st.label));if(!target)continue;
      for(const key of ['pauseSeconds','eccentricSeconds'])if(st[key]&&!target[key]){target[key]=st[key];changed=true;}
      if((st.intensitySteps||[]).length&&!(target.intensitySteps||[]).length){target.intensitySteps=clone(st.intensitySteps);changed=true;}
    }
  }
  if(changed)existing.volume=totalSessionVolume(existing);
  return changed;
};

// --- Guida all'allenamento, disponibilita macchine e stato migrazioni. ---
function showTrainingEvidence(){
  showModal(`<h2>Perche questi esercizi?</h2><p class="subtle">Il catalogo e un insieme di opzioni, non una prescrizione individuale. Nessun singolo esercizio garantisce piu ipertrofia per tutti. Tolleranza articolare, tecnica, recupero e progressione vengono prima delle varianti alla moda.</p>
    <div class="evidence-list">${EXERCISE_EVIDENCE_2026.map(x=>`<div class="evidence-item"><b><a href="${esc(x.url)}" rel="noopener noreferrer">${esc(x.label)}</a></b><div class="subtle">${esc(x.point)}</div></div>`).join('')}</div>
    <p class="subtle">Tecniche intense: comincia dalle serie ordinarie; applica le sotto-serie soprattutto a macchine o isolamenti a basso rischio tecnico. Interrompi in caso di dolore, vertigini o perdita di controllo del movimento.</p>
    <button class="secondary-btn" onclick="closeModal()">Chiudi</button>`);
}
function showGymMappingReview(){
  const list=state.gymMappingReview||[];
  showModal(`<h2>Associazioni macchine da verificare</h2><p class="subtle">Queste associazioni incoerenti sono state disattivate, senza cancellare profili, carichi o allenamenti. Restano qui le associazioni precedentemente segnalate da ricontrollare.</p>
    <div class="modal-list">${list.length?list.map(x=>`<div class="card flat"><b>${esc(x.gym)} · ${esc(x.slot)}</b><div class="subtle">${esc(x.reason)}</div><small>${esc(x.status)}</small></div>`).join(''):'<p class="subtle">Nessuna associazione da rivedere.</p>'}</div>
    <button class="secondary-btn" onclick="closeModal()">Chiudi</button>`);
}
const baseRenderSettingsV93=renderSettings;
renderSettings=function(){
  const html=baseRenderSettingsV93();
  const appendix=`<section class="card"><h2 style="margin-top:0">GymTracker · Libreria esercizi</h2><p class="subtle">${EXERCISE_LIBRARY_2026.length} esercizi guida, editor schede, fermi, dropset, rest-pause, eccentrica controllata. I carichi non registrati restano vuoti.</p>
    <button class="secondary-btn" onclick="showTrainingEvidence()">Fonti scientifiche e criteri</button>
    <button class="secondary-btn" style="margin-top:9px" onclick="showGymMappingReview()">Associazioni attrezzi da verificare (${(state.gymMappingReview||[]).length})</button>
    <p class="subtle" style="margin-top:9px">I dati sono locali e separati per dispositivo. Condividi soltanto una scheda, non il backup personale.</p></section>`;
  return html.replace('</main>',appendix+'</main>');
};
ensureGymState();syncExerciseCatalogFromKnownData();
state.ui=state.ui||{};state.ui.catalogCategory=state.ui.catalogCategory||'';state.ui.catalogGoal=state.ui.catalogGoal||'';
saveState();render();
