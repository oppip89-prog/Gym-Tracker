'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const now=Date.now(), start=now-600000, end=now-30000;
const old={id:'old-session',startedAt:new Date(start-86400000).toISOString(),finishedAt:new Date(end-86400000).toISOString(),exercises:[]};
const s={id:'new-session',workout:'PUSH',startedAt:new Date(start).toISOString(),finishedAt:new Date(end).toISOString(),exercises:[{sets:[{done:true,kg:50,reps:10}]}]};
const state={currentSession:null,history:[s,old],settings:{},ui:{view:'history'}},calls=[],jobs={},toggles=[];
const bridge={healthAction:(action,payload)=>calls.push({action,payload:JSON.parse(payload)}),queueHealthExport:(raw,revision)=>{const j=JSON.parse(raw);jobs[j.id]={revision,state:'scheduled',payload:j};return true;},getHealthExportResult:id=>JSON.stringify(jobs[id]||{}),forgetHealthExport:(id,revision)=>{if(jobs[id]?.revision===revision)delete jobs[id];},setHealthAutoExport:v=>toggles.push(v)};
const ctx={state,window:{AndroidBridge:bridge},console,setInterval:()=>0,setTimeout:()=>0,renderSettings:()=>'<main></main>',renderHome:()=>'<main></main>',renderSession:()=>'<main></main>',suggestedLoadForSet:()=>({mode:'increase',load:40,next:42.5}),saveState:()=>{},render:()=>{},toast:()=>{},document:{querySelector:()=>null},totalSessionVolume:()=>500,esc:s=>String(s),fmtDate:s=>s};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('health_v98.js','utf8'),ctx);
const api=ctx.window.GymHealth;
const allow=['android.permission.health.READ_EXERCISE','android.permission.health.WRITE_EXERCISE'];
api.receive({action:'status',available:true,granted:allow,requested:2});
api.queueFinished(s);assert.equal(s.healthV98.autoExport.status,'pending');assert.equal(old.healthV98,undefined);
assert.equal(api.scheduleNative(s.id),true);assert.equal(jobs[s.id].revision,0);
// Worker result is consumed automatically. The original workout remains unchanged.
jobs[s.id]={revision:0,state:'done',result:{action:'export',id:s.id,status:'exported',recordId:'test-health-id',heartStatus:'no_data'}};
api.processQueue();assert.equal(s.healthV98.autoExport.status,'exported');assert.ok(s.healthV98.exportedAt);assert.equal(s.healthV98.healthConnectRecordId,'test-health-id');assert.equal(jobs[s.id],undefined);
// Late first-party data increments the revision; imported measurements are not exported.
s.healthV98.importedSamples=[[start+10000,210]];
const batch={sessionId:s.id,segment:'segment-1234',segmentStart:start,recordedUntil:end-1000,totalKcal:40,samples:[[start+30000,145]],final:true};
api.applyWatchBatch(batch);assert.equal(s.healthV98.autoExport.revision,1);assert.equal(s.healthV98.autoExport.status,'pending');api.scheduleNative(s.id);assert.equal(jobs[s.id].payload.watchSamples.length,1);assert.equal(jobs[s.id].payload.watchSamples[0][1],145);assert.match(jobs[s.id].payload.notes,/40 kcal/);
api.applyWatchBatch(batch);assert.equal(s.healthV98.autoExport.revision,1);
// Background access denied: fallback runs through normal in-app API without confirmation.
jobs[s.id]={revision:1,state:'done',result:{action:'export',id:s.id,status:'foreground_required',error:'Apri GymTracker'}};
api.processQueue();assert.equal(calls.at(-1).action,'export');assert.equal(calls.at(-1).payload.id,s.id);
api.receive({action:'export',id:s.id,status:'exported',recordId:'test-health-id',heartStatus:'written'});assert.equal(s.healthV98.autoExport.status,'exported');assert.equal(s.healthV98.heartExportStatus,'written');
// Denied permissions and overlapping exercise never imply success.
const n={...s,id:'another-session',healthV98:undefined};state.history.unshift(n);api.queueFinished(n);api.receive({action:'status',available:true,granted:[],requested:2});assert.equal(n.healthV98.autoExport.status,'permission');api.receive({action:'status',available:true,granted:allow,requested:2});assert.equal(n.healthV98.autoExport.status,'pending');api.scheduleNative(n.id);jobs[n.id]={revision:0,state:'done',result:{action:'export',id:n.id,status:'overlap',error:'overlap'}};api.processQueue();assert.equal(n.healthV98.autoExport.status,'overlap');assert.equal(n.healthV98.exportedAt,undefined);
api.toggleAutoExport();assert.equal(state.settings.autoHealthExport,false);assert.equal(toggles.at(-1),false);const disabled={...s,id:'disabled-session',healthV98:undefined};api.queueFinished(disabled);assert.equal(disabled.healthV98,undefined);api.setMaxHr('185');assert.equal(state.settings.maxHeartRate,185);api.setMaxHr('99');assert.equal(state.settings.maxHeartRate,185);
assert.equal(old.healthV98,undefined);console.log('PASS: auto-export only new workouts, persisted job, verified readback result, late Watch batch revision, no re-export imported data, fallback, permissions, overlap, disable, HR max configuration');
