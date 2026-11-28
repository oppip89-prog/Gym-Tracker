'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../training_engine.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const exercise=(extra={})=>({name:'Press',exerciseId:'press',movementId:'bench-press',reps:'8-12',restSec:120,sets:Array.from({length:3},()=>({reps:8,restSec:120,done:false})),...extra});
const warm={name:'Preparazione',fixedMin:5,sets:[],done:true,isWarmup:true};
let ss={exercises:[warm,exercise()]};
assert.deepEqual(E.progress(ss),{done:0,total:3,pct:0});
assert.equal(E.estimate(ss).warmupMin,5);
assert.equal(E.estimate(ss).workMin,E.estimate({exercises:[exercise()]}).workMin);
const bench=exercise({special:'bench_push',fixedMin:20,sets:Array.from({length:8},()=>({reps:2,restSec:270}))});
assert.ok(E.exerciseSeconds(bench)>7*270); // No fixedMin override and no omitted rests.
assert.ok(E.exerciseSeconds(exercise({timeSides:2}))>E.exerciseSeconds(exercise({timeSides:1})));
const short=exercise(),long=clone(short);long.sets[0].restSec+=120;assert.equal(E.exerciseSeconds(long)-E.exerciseSeconds(short),120);
const full={exercises:[warm,...Array.from({length:7},(_,i)=>exercise({exerciseId:'p'+i,timePriority:i+1,minTimeSets:i===0?3:1,timeOptional:i>4}))]};
const a=E.adapt(clone(full),60),b=E.adapt(clone(full),45);
assert.ok(E.progress(b).total<E.progress(a).total);assert.ok(b.estimatedMin<=45);assert.equal(b.exercises[1].sets.length,3);assert.ok(b.exercises.every(e=>(e.sets||[]).every(st=>st.restSec===120)));
const done=clone(full);done.exercises[2].sets[0].done=true;const protectedBefore=clone(done.exercises[2]);E.adapt(done,10);assert.deepEqual(done.exercises[2],protectedBefore);assert.ok(done.timeUnmet);
const t=Date.parse('2026-01-01T10:00:00Z'),iso=n=>new Date(t+n*1000).toISOString();
const clock={startedAt:iso(0),exercises:[warm,exercise()]};
assert.equal(E.clock(clock,t+600000).seconds,0); // Warm-up never starts work clock.
clock.workStartedAt=iso(600);assert.equal(E.clock(clock,t+900000).seconds,300);
clock.workPauses=[{start:t+660000,end:t+720000},{start:t+690000,end:t+750000}];assert.equal(E.clock(clock,t+900000).seconds,210); // Union, no double subtraction.
clock.exercises[1].sets.forEach((s,i)=>{s.done=true;s.completedAt=iso(630+i*180);});
assert.equal(E.clock(clock,t+9999999).seconds,300); // Stops at final work set (990-600-90).
const inferred={startedAt:iso(0),exercises:[exercise()]};inferred.exercises[0].sets[0]={done:true,reps:8,completedAt:iso(600)};assert.ok(E.clock(inferred,t+620000).inferred);assert.ok(E.clock(inferred,t+620000).seconds<90);
const historical={id:'h',gymId:'g',startedAt:iso(0),finishedAt:iso(86400),exercises:[exercise({sets:Array.from({length:5},(_,i)=>({done:true,reps:10,restSec:120,completedAt:iso(600+i*210)}))})]};
assert.ok(E.observedWindow(historical).valid);assert.ok(E.observedWindow(historical).lateClose);assert.ok(E.observedWindow(historical).startToLastMin<60);
const batched=clone(historical);batched.exercises[0].sets.forEach(s=>s.completedAt=iso(600));assert.equal(E.observedWindow(batched).valid,false);
const excessive=clone(historical);excessive.exercises[0].sets[4].completedAt=iso(86400);assert.equal(E.observedWindow(excessive).valid,false);
const h2=clone(historical);h2.id='h2';const c=E.calibration([historical,h2,batched,excessive],'g');assert.equal(c.accepted,2);assert.equal(c.rejected,2);assert.ok(c.extras.press.seconds>0);
const bridge=fs.readFileSync('watch_bridge.js','utf8');const branch=bridge.slice(bridge.indexOf("} else if (kind === 'warmup_set')"),bridge.indexOf("} else if (kind === 'finish')"));assert.ok(!branch.includes('noteWorkCompletion992'));
const html=fs.readFileSync('index.html','utf8'),gradle=fs.readFileSync('android/app/build.gradle','utf8');for(const file of ['training_engine.js','training_v992.js','styles_training.css']){assert.ok(html.includes(file),file);assert.ok(gradle.includes(file),file);}
assert.ok(!fs.readFileSync('training_v992.js','utf8').includes('renderInstall'));
console.log('PASS: work-only count/clock, separate warm-up, 45/60 trimming, no completed-set deletion, rests, unilateral timing, outlier filtering, asset/protocol checks');
// Exercise actual app-level progression adapter with synthetic, non-personal records.
const vm=require('node:vm'),adapter=fs.readFileSync('training_v992.js','utf8');
const gate={state:{activeGymId:'g',settings:{smartLoad:true}},records:[],suggestedLoadForSet:()=>({next:12,load:10,mode:'increase'}),repRangeForSet:()=>({min:8,max:12}),rirEquivalent:s=>s.metricValue,defaultRir:()=>2};
gate.exerciseHistory=()=>gate.records;vm.createContext(gate);
vm.runInContext(adapter.slice(adapter.indexOf('function progressionRecords992'),adapter.indexOf('const warmupOriginal992')),gate);
const target={exerciseId:'press',sets:3,progressionKey:'new-program:press',entryLoadKg:20,entryLoadGymId:'g',progression:{increaseOnlyWhenAllSetsAtTop:true}};
assert.equal(gate.suggestedLoadForSet(target).next,20);
gate.records=[{exercise:{progressionKey:target.progressionKey},sets:[{kg:10,reps:12,metricValue:2},{kg:10,reps:10,metricValue:2},{kg:10,reps:9,metricValue:2}]}];
assert.equal(gate.suggestedLoadForSet(target).next,10);
gate.records[0].sets.forEach(s=>s.reps=12);assert.equal(gate.suggestedLoadForSet(target).next,12);
gate.records[0].sets.pop();assert.equal(gate.suggestedLoadForSet(target).next,10);
console.log('PASS: explicit first-exposure load and all-sets-at-target progression gate');
