"use strict";
// Test the actual loadState() implementation in isolation with browser storage mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const defaultStart=app.indexOf('const defaultState = {');
const defaultEnd=app.indexOf('\n};',defaultStart)+3;
assert.ok(defaultStart>=0 && defaultEnd>defaultStart);
const start=app.indexOf('function loadState(){');
const end=app.indexOf('\nfunction saveState(){',start);
assert.ok(start>=0 && end>start);
const functions=app.slice(start,end);
const seed=fs.readFileSync(path.join(root,'history_seed.js'),'utf8');
const script=`const APP_VERSION='9.5.1';const STORAGE_KEY='gym_tracker_ppl_upper_lower_v1';
const clone=(x)=>JSON.parse(JSON.stringify(x));
const migrateStoredBenchState=(x)=>x;
${app.slice(defaultStart,defaultEnd)}
${seed}
${functions}
globalThis.loadTheState=loadState;`;
function run(raw){
  const context={localStorage:{getItem:()=>raw},console};
  vm.createContext(context); vm.runInContext(script,context);
  return JSON.parse(JSON.stringify(context.loadTheState()));
}
const fresh=run(null);
assert.equal(fresh.currentWeek,3);
assert.equal(fresh.currentSession,null);
assert.equal(fresh.history.length,52);
assert.equal(fresh.activeGymId,'borgaro');
assert.ok(fresh.builderDraft);
assert.equal(fresh.version,'9.5.1');
const local={version:'9.4.0',currentWeek:4,history:[{id:'new-session-from-phone',startedAt:'2026-11-26T08:00:00.000Z'}],currentSession:null,activeProgram:fresh.activeProgram};
const existing=run(JSON.stringify(local));
assert.equal(existing.currentWeek,4);
assert.equal(existing.history.length,1);
assert.equal(existing.history[0].id,'new-session-from-phone');
assert.equal(existing.version,'9.5.1');
console.log('PASS: prima installazione usa backup 52 sessioni; installazione esistente mantiene lo storico locale');
