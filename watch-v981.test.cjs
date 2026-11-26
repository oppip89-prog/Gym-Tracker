'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const state={currentSession:{id:'s-981',workout:'PUSH',startedAt:new Date(Date.now()-600000).toISOString(),exercises:[{name:'Riscaldamento generale',reps:'5 min',note:'Preparazione',sets:[],done:false},{name:'Panca',restSec:120,sets:[{kg:125,reps:3,done:false}],warmupSets:[{label:'W1',kg:60,reps:6,restSec:60,done:false}]}]},ui:{openExercise:0},settings:{autoTimer:true},timer:null,history:[]};
const acks=[], snapshots=[];let dialogs=0;
const ctx={state,console,window:{AndroidBridge:{publishWatchState:s=>snapshots.push(JSON.parse(s)),ackWatchCommand:(id,status,reason)=>acks.push({id,status,reason})}},setTimeout:()=>0,setInterval:()=>0,loadStepFor:()=>2.5,renderSettings:()=>'<main></main>',saveState:()=>{},render:()=>{},renderTimer:()=>{},toast:()=>{},priorBest:()=>({bestKg:0,bestE1rm:0}),isLowerHarder:()=>false,activeProgram:()=>({}),upsertCatalogExercise:()=>{},maybeQueueWeekAdvance:()=>null,releaseWakeLock:()=>{},confirm:()=>{dialogs++;throw new Error('Phone confirmation must not run for Watch')},timerFinishedHandled:false};
vm.createContext(ctx);
const app=fs.readFileSync('app.js','utf8'), v9=fs.readFileSync('v9_features.js','utf8');
// Use real production functions for warm-ups, progress, volume and finishing.
for(const [src,a,b] of [[app,'function sessionProgress(){','function openExercise('],[app,'function updateSetField(','function adjustActive('],[app,'function completeWarmup(','function setExerciseNote('],[app,'function totalSessionVolume(','function discardWorkout('],[app,'function startTimer(','function skipTimer('],[v9,'function completeWarmupSet(','function render']]) {
  let part=src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+1));
  if(src===v9) part=part.split('\n').slice(0,2).join('\n');
  vm.runInContext(part,ctx);
}
vm.runInContext(fs.readFileSync('watch_bridge.js','utf8'),ctx);
const api=ctx.window.GymWatchBridge;
let i=0;const send=(kind,args={})=>{const cmd={id:`v981-test-${String(++i).padStart(4,'0')}`,kind,sessionId:'s-981',at:new Date().toISOString(),...args};api.consumePending([cmd]);return cmd;};
assert.equal(api.snapshot().exercises[0].warmupDescription,'5 min');assert.equal(api.snapshot().exercises[1].warmupSets[0].kg,60);
const general=send('warmup_general',{exi:0});assert.equal(state.currentSession.exercises[0].done,true);api.consumePending([general]);assert.equal(state.currentSession.exercises[0].done,true);
const warm=send('warmup_set',{exi:1,si:0,kg:62.5,reps:5});assert.equal(state.currentSession.exercises[1].warmupSets[0].kg,62.5);assert.equal(state.currentSession.exercises[1].warmupSets[0].done,true);assert.equal(state.currentSession.exercises[1].sets[0].done,false);assert.equal(ctx.totalSessionVolume(state.currentSession),0);assert.match(state.timer.label,/warm-up/);api.consumePending([warm]);assert.equal(state.currentSession.exercises[1].warmupSets[0].done,true);
send('finish');assert.equal(acks.at(-1).status,'rejected');assert.ok(state.currentSession);assert.equal(dialogs,0);
send('confirm',{exi:1,si:0,kg:125,reps:3});assert.equal(state.currentSession.exercises[1].sets[0].done,true);
const finish=send('finish');assert.equal(acks.at(-1).status,'applied');assert.equal(state.currentSession,null);assert.equal(state.history.length,1);assert.equal(state.history[0].volume,375);assert.equal(state.history[0].progress,100);assert.equal(state.timer,null);assert.equal(api.snapshot().sessionId,'');api.consumePending([finish]);assert.equal(state.history.length,1);assert.equal(acks.at(-1).status,'applied');
// Explicit authorization permits partial completion without a second dialog on the phone.
state.currentSession={id:'s-981',workout:'PUSH',startedAt:new Date(Date.now()-60000).toISOString(),exercises:[{name:'Panca',sets:[{kg:125,reps:3,done:false}]}]};
send('finish',{allowIncomplete:true});assert.equal(state.history.length,2);assert.equal(state.history[0].progress,0);assert.equal(dialogs,0);console.log('PASS: warm-up general + sets, separate volume, sync replay, incomplete guard, full/partial finish, single history entry');
