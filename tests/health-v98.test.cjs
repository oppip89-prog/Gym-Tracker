'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const now=Date.now(), start=now-600000, end=now-10000;
const s={id:'session-health-test',workout:'PUSH',startedAt:new Date(start).toISOString(),exercises:[{restSec:120,sets:[{done:true,kg:40,reps:10,completedAt:new Date(start+60000).toISOString()}]}]};
const state={currentSession:s,history:[],settings:{smartLoad:true,healthAdaptive:false},ui:{view:'session',openExercise:0}};
const context={state,window:{},console,setInterval:()=>0,setTimeout:()=>0,renderSettings:()=>'<main></main>',renderHome:()=>'<main></main>',renderSession:()=>'<main></main>',suggestedLoadForSet:()=>({mode:'increase',load:40,next:42.5}),saveState:()=>{},render:()=>{},toast:()=>{},document:{querySelector:()=>null},totalSessionVolume:()=>400,esc:s=>String(s),fmtDate:s=>s};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../health_v98.js'),'utf8'),context);
const h=context.window.GymHealth, batch={kind:'health_batch',sessionId:s.id,segment:'segment-12345',segmentStart:start,recordedUntil:start+200000,totalKcal:35,samples:[[start+60000,150],[start+120000,120],[start+180000,110]]};
h.applyWatchBatch(batch);assert.equal(h.stats(s).avg,127);assert.equal(h.stats(s).max,150);assert.equal(h.stats(s).recovery,30);assert.equal(h.stats(s).totalKcal,35);
h.applyWatchBatch(batch);assert.equal(h.stats(s).samples.length,3);assert.equal(h.stats(s).totalKcal,35);
// Out-of-order delivery does not erase later samples or roll back cumulative calories.
h.applyWatchBatch({...batch,recordedUntil:start+100000,totalKcal:15,samples:[[start+30000,100]]});assert.equal(h.stats(s).samples.length,4);assert.equal(h.stats(s).totalKcal,35);
assert.throws(()=>h.applyWatchBatch({...batch,sessionId:'not-found'}));assert.throws(()=>h.applyWatchBatch({...batch,segment:'invalid'}));
h.applyWatchBatch({...batch,samples:[[start-50000,120],[start+50000,999],['bad',100]]});assert.equal(h.stats(s).samples.length,4);
// Late health delivery updates finished session but never imports post-finish samples/calories.
s.finishedAt=new Date(end).toISOString();state.history=[s];state.currentSession=null;
h.applyWatchBatch({...batch,recordedUntil:end+30000,totalKcal:1000,samples:[[end-20000,130],[end+5000,120]]});assert.equal(h.stats(s).samples.length,5);assert.equal(h.stats(s).totalKcal,35);
// Separate source categories; Watch samples win over imported samples.
s.healthV98.activeKcal=22;s.healthV98.importedSamples=[[start+60000,230]];assert.equal(h.stats(s).activeKcal,22);assert.equal(h.stats(s).max,150);
// Optional, fresh evidence only. Never override bench, fixed weights or decreases.
const inc={mode:'increase',load:40,next:42.5,increased:true};
state.healthProfile={sleepMinutes:{value:300,at:now-1000},restingHr:{value:71,at:now-1000},restingBaseline:{value:60,at:now-1000}};
assert.equal(h.guard({},inc).next,42.5);state.settings.healthAdaptive=true;assert.equal(h.guard({},inc).next,40);assert.equal(h.guard({special:'bench_push'},inc).next,42.5);assert.equal(h.guard({},{mode:'decrease',load:40,next:37.5}).next,37.5);
state.healthProfile.sleepMinutes.at=now-48*3600000;state.healthProfile.restingHr.at=now-48*3600000;assert.equal(h.guard({},inc).next,42.5);
assert.ok(h.sessionCard(s,true).includes('Recupero FC'));console.log('PASS: health batch, replay, out-of-order, late session, range validation, kcal sources, recovery, opt-in Smart Load and bench protection');
