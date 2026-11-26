'use strict';
// Node-only protocol tests; no Android SDK required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const ack = [], published = [], scheduled = [];
const fakeState = {
  currentSession: {
    id: 'session-123', workout: 'PUSH', startedAt: '2026-11-25T12:00:00.000Z',
    gymName: 'Borgaro', exercises: [{name: 'Panca piana', equipment: 'Bilanciere',
      restSec: 240, sets: [{label: '1', kg: 125, reps: 3, done: false, restSec: 240},
                             {label: '2', kg: 125, reps: 3, done: false, restSec: 240}]}]
  },
  timer: null,
  ui: {openExercise: 0},
  settings: {autoTimer: true},
  history: []
};
const context = {
  state: fakeState,
  window: {AndroidBridge: {
    publishWatchState: raw => published.push(JSON.parse(raw)),
    watchReady: () => {},
    ackWatchCommand: (id, status, reason) => ack.push({id, status, reason})
  }},
  setTimeout: fn => scheduled.push(fn),
  setInterval: () => 0,
  console,
  loadStepFor: () => 2.5,
  renderSettings: () => '<main class="content"></main>',
  saveState: () => {},
  updateSetField: (exi, si, field, value) => { fakeState.currentSession.exercises[exi].sets[si][field] = value; },
  completeSet: (exi, si) => {
    const set = fakeState.currentSession.exercises[exi].sets[si];
    if (!set.done) {
      set.done = true;
      set.completedAt = new Date().toISOString();
      fakeState.timer = {end: Date.now() + 240000, total: 240, label: 'Panca piana'};
      context.saveState();
    }
  },
  startTimer: (sec, name) => { fakeState.timer = {end: Date.now() + sec * 1000,total:sec,label:name}; },
  skipTimer: () => { fakeState.timer = null; },
  addTimer: seconds => { fakeState.timer.end += seconds * 1000; }
};
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname, '../watch_bridge.js'), 'utf8'), context);

const api = context.window.GymWatchBridge;
assert.equal(api.snapshot().workout, 'PUSH');
assert.equal(api.snapshot().exercises[0].stepKg, 2.5);
assert.equal(api.snapshot().exercises[0].sets[0].kg, 125);
const cmd = {id:'test-cmd-00000001',kind:'confirm',sessionId:'session-123',exi:0,si:0,
  kg:127.5,reps:4,at:new Date().toISOString()};
api.consumePending(JSON.stringify([cmd]));
assert.equal(fakeState.currentSession.exercises[0].sets[0].kg,127.5);
assert.equal(fakeState.currentSession.exercises[0].sets[0].reps,4);
assert.equal(fakeState.currentSession.exercises[0].sets[0].done,true);
assert.equal(ack.at(-1).status,'applied');
assert.equal(fakeState.watchProcessedIds.length,1);
// Same ID must never duplicate an update.
api.consumePending(JSON.stringify([cmd]));
assert.equal(fakeState.watchProcessedIds.length,1);
assert.equal(ack.at(-1).status,'applied');
// New command for an already-completed set must be rejected.
api.consumePending(JSON.stringify([{...cmd,id:'test-cmd-00000002'}]));
assert.equal(ack.at(-1).status,'rejected');
// Stale session is rejected without modifying current state.
api.consumePending(JSON.stringify([{...cmd,id:'test-cmd-00000003',sessionId:'old-session',si:1}]));
assert.equal(ack.at(-1).status,'rejected');
assert.equal(fakeState.currentSession.exercises[0].sets[1].done,false);
// Invalid reps cannot be saved.
api.consumePending(JSON.stringify([{...cmd,id:'test-cmd-00000004',si:1,reps:0}]));
assert.equal(ack.at(-1).status,'rejected');
assert.equal(fakeState.currentSession.exercises[0].sets[1].done,false);
// Timer commands are idempotent, and do not need a set coordinate.
api.consumePending(JSON.stringify([{id:'test-cmd-00000005',kind:'timer_add',sessionId:'session-123'}]));
assert.equal(ack.at(-1).status,'applied');
api.consumePending(JSON.stringify([{id:'test-cmd-00000006',kind:'timer_skip',sessionId:'session-123'}]));
assert.equal(ack.at(-1).status,'applied');
assert.equal(fakeState.timer,null);
// Deferred snapshot publishing and startup native handshaking.
for (const fn of scheduled) fn();
assert.ok(published.length > 0);
assert.equal(published.at(-1).protocol, 1);
console.log('PASS: snapshot, kg/reps confirmation, idempotency, stale session, validation, timer');
// Health updates can arrive after the authoritative session is saved.
let calls = 0;
context.window.GymHealth = {applyWatchBatch: c => { assert.equal(c.sessionId,'session-123'); calls++; }};
fakeState.currentSession = null;
const hb={id:'test-health-00000001',kind:'health_batch',sessionId:'session-123'};
api.consumePending(JSON.stringify([hb,hb]));
assert.equal(calls,1);assert.equal(ack.at(-1).status,'applied');
console.log('PASS: health command route accepts late batch and deduplicates ID');
