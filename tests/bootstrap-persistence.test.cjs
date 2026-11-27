'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const def=app.slice(app.indexOf('const defaultState = {'),app.indexOf('\n};',app.indexOf('const defaultState = {'))+3);
const fn=app.slice(app.indexOf('function loadState(){'),app.indexOf('\nfunction setView('));
function run(raw){const m=new Map(raw===null?[]:[['gym_tracker_ppl_upper_lower_v1',raw]]);const ctx={window:{},console,localStorage:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};vm.createContext(ctx);vm.runInContext(`const APP_VERSION='9.9.1',STORAGE_KEY='gym_tracker_ppl_upper_lower_v1',clone=x=>JSON.parse(JSON.stringify(x)),migrateStoredBenchState=x=>x;${def}\n${fn}\nlet state=loadState();globalThis.result=state;globalThis.saved=saveState();`,ctx);return {state:JSON.parse(JSON.stringify(ctx.result)),m,saved:ctx.saved};}
const fresh=run(null).state;assert.equal(fresh.currentWeek,1);assert.equal(fresh.history.length,0);assert.equal(fresh.currentSession,null);assert.equal(fresh.activeProgram,null);assert.equal(fresh.gymProfiles.length,0);assert.equal(fresh.onboardingComplete,false);assert.equal(fresh.settings.autoOpenWatch,false);assert.equal(fresh.settings.autoHealthExport,false);
const plan={title:'Test privato',weeks:5,workouts:{A:{name:'A',exercises:[]}}};
const old={version:'9.8.5',currentWeek:4,history:[{id:'sample-session-1',startedAt:'2026-01-01T12:00:00Z',exercises:[]}],activeProgram:plan,programLibrary:[],settings:{autoOpenWatch:false},privateExtra:{demo:true}};
const updated=run(JSON.stringify(old));assert.deepEqual(updated.state.history,old.history);assert.deepEqual(updated.state.activeProgram,plan);assert.deepEqual(updated.state.privateExtra,old.privateExtra);assert.equal(updated.state.currentWeek,4);assert.equal(updated.state.onboardingComplete,true);assert.equal(updated.state.settings.autoOpenWatch,false);assert.equal(updated.state.version,'9.9.1');assert.deepEqual(JSON.parse(updated.m.get('gym_tracker_ppl_upper_lower_v1::pre-upgrade')).state,old);
const corrupt=run('{bad');assert.equal(corrupt.saved,false);assert.equal(corrupt.state.storageRecoveryRequired,true);assert.equal(corrupt.m.get('gym_tracker_ppl_upper_lower_v1'),'{bad');
console.log('PASS: clean first launch, existing-state migration, pre-upgrade checkpoint and protection of unreadable data');
