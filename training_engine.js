/* GymTracker 9.9.2: pure, deterministic planning and timing. No personal data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GymTrainingEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const n=(v,d=0)=>Number.isFinite(Number(v))&&v!==''&&v!=null?Number(v):d;
  const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const time=x=>{const t=Date.parse(x);return Number.isFinite(t)?t:null;};
  const median=a=>{const b=a.filter(Number.isFinite).sort((x,y)=>x-y);return b.length?(b[(b.length-1)>>1]+b[b.length>>1])/2:0;};
  function rows(ex){if(Array.isArray(ex.sets))return ex.sets.filter(s=>!s.warmup);if(Array.isArray(ex.plannedSets))return ex.plannedSets.filter(s=>!s.warmup);return Array.from({length:cap(Math.round(n(ex.sets)),0,100)},()=>({}));}
  function warmExercise(ex){return ex.isWarmup===true||(!rows(ex).length&&!ex.special);}
  function identity(ex){return String(ex.exerciseId||ex.historyKey||ex.baseName||ex.name||'').trim();}
  function bilateralFactor(ex){if(ex.timeSides===1||ex.timeSides===2)return ex.timeSides;return /per lato|\/\s*lato|unilateral|singolo|bulgar/i.test([ex.name,ex.reps,ex.targetReps].join(' '))?2:1;}
  function executionSeconds(ex,s={}){
    if(n(ex.workSeconds)>0)return cap(n(ex.workSeconds),10,300);
    const label=String(s.warmup?s.reps||'6':s.targetRange||ex.targetReps||ex.reps||s.reps||'10');
    const r=label.match(/\d+(?:[.,]\d+)?/g)||[];
    let reps=r.length?(n(r[0].replace(',','.'))+n((r[1]||r[0]).replace(',','.')))/2:n(s.reps,10);
    if(/AMRAP|tecnic/i.test(label))reps=n(s.reps,10);
    if(ex.special)reps=n(s.reps,5);
    const tech=ex.technique||{};
    let secPerRep=3;
    if(tech.mode==='tempo')secPerRep=cap(n(tech.eccentricSeconds,3)+1,2,8);
    if(tech.mode==='pause')secPerRep=3+cap(n(tech.pauseSeconds,1),0,5);
    const sides=bilateralFactor(ex);
    let sec=cap(reps*secPerRep,25,120)*sides+(sides===2?15:0);
    if(Array.isArray(s.intensitySteps))sec+=s.intensitySteps.reduce((a,x)=>a+cap(n(x.reps,8)*3,15,90)+n(x.restSec,15),0);
    return Math.round(sec);
  }
  function progress(ss){let done=0,total=0;for(const e of ss?.exercises||[])for(const s of rows(e)){total++;if(s.done)done++;}return{done,total,pct:total?Math.round(done/total*100):0};}
  function observedWindow(ss){
    const start=time(ss.startedAt);if(start===null)return{valid:false,reason:'no-start'};
    const all=(ss.exercises||[]).flatMap(e=>rows(e).filter(s=>s.done).map(s=>({t:time(s.completedAt),e,s}))).filter(x=>x.t!==null).sort((a,b)=>a.t-b.t);
    const unique=[...new Set(all.map(x=>x.t))];
    if(all.length<4||unique.length<4)return{valid:false,reason:'too-few-distinct-timestamps'};
    const first=all[0],last=all.at(-1),span=(last.t-start)/1000;
    if(first.t<start||span<600||span>9000)return{valid:false,reason:'implausible-session-window'};
    const gaps=unique.slice(1).map((t,i)=>(t-unique[i])/1000);
    if(Math.max(...gaps)>1200)return{valid:false,reason:'long-gap'};
    const finish=time(ss.finishedAt),tail=finish===null?null:(finish-last.t)/60000;
    return{valid:true,startToLastMin:span/60,workEstimateMin:(last.t-first.t)/60000+executionSeconds(first.e,first.s)/60,lastAt:last.t,firstAt:first.t,tailMin:tail,lateClose:tail!==null&&tail>15};
  }
  // Learn extra time between actual consecutive sets, never use total durationMin.
  // Identical/batched timestamps, long sessions and gaps are excluded, not repaired.
  function calibration(history,gymId){
    const samples=new Map(),accepted=[],rejected=[];
    for(const ss of (history||[]).slice().sort((a,b)=>(time(b.startedAt)||0)-(time(a.startedAt)||0)).slice(0,40)){
      if(gymId&&ss.gymId!==gymId)continue;
      const obs=observedWindow(ss);if(!obs.valid){rejected.push({id:ss.id,reason:obs.reason});continue;}
      accepted.push(ss.id);
      for(const ex of ss.exercises||[]){
        const arr=rows(ex).filter(s=>s.done&&time(s.completedAt)!==null).sort((a,b)=>time(a.completedAt)-time(b.completedAt));
        for(let i=1;i<arr.length;i++){
          const gap=(time(arr[i].completedAt)-time(arr[i-1].completedAt))/1000;
          const rest=n(arr[i-1].restSec,n(ex.restSec,90));
          const base=rest+executionSeconds(ex,arr[i])+15;
          if(gap<Math.max(30,base*.55)||gap>Math.min(900,base*2.5))continue;
          const key=identity(ex);if(!samples.has(key))samples.set(key,[]);
          samples.get(key).push({extra:cap(gap-base,0,120),session:ss.id});
        }
      }
    }
    const extras={};for(const [key,a] of samples)if(a.length>=3&&new Set(a.map(x=>x.session)).size>=2)extras[key]={seconds:Math.round(median(a.map(x=>x.extra))),samples:a.length};
    return{extras,accepted:accepted.length,rejected:rejected.length};
  }
  function exerciseSeconds(ex,index=0,cal={extras:{}}){
    const setRows=rows(ex);if(!setRows.length||warmExercise(ex))return 0;
    const compound=/bench|knee-dominant|hip-hinge|hip-thrust|overhead-press|horizontal-pull|vertical-pull|incline-chest/.test(ex.movementId||'')||!!ex.special;
    const setup=n(ex.setupSec,index===0?90:compound?180:135);
    const extra=n(cal.extras?.[identity(ex)]?.seconds);
    let result=setup;
    setRows.forEach((s,i)=>{result+=executionSeconds(ex,s)+15;if(i<setRows.length-1)result+=n(s.restSec,n(ex.restSec,90))+extra;});
    return result;
  }
  function estimate(ss,cal={extras:{}},opts={}){
    let work=0,i=0;
    for(const e of ss.exercises||[])if(!warmExercise(e)){work+=exerciseSeconds(e,i++,cal);}
    const reserve=i?Math.max(120,work*.10):0;
    const workSec=work+reserve;
    // Initial preparation is separately displayed, never charged to work budget.
    let warmSec=0;
    for(const e of ss.exercises||[]){
      if(warmExercise(e))warmSec+=Math.max(0,n(e.fixedMin))*60;
      for(const s of e.warmupSets||[])warmSec+=executionSeconds({...e,timeSides:bilateralFactor(e)},s)+n(s.restSec,45);
    }
    return{workMin:Math.round(workSec/6)/10,warmupMin:Math.round(warmSec/6)/10,totalMin:Math.round((workSec+warmSec)/6)/10,reserveMin:Math.round(reserve/6)/10,series:progress(ss).total,calibratedExercises:(ss.exercises||[]).filter(e=>cal.extras?.[identity(e)]).length};
  }
  function adapt(ss,budget,cal={extras:{}}){
    budget=n(budget);ss.timeBudgetMin=budget;ss.timeOmitted=[];ss.timeRemoved=[];
    const original=estimate(ss,cal);ss.originalEstimatedMin=original.workMin;
    let guard=200;
    while(budget>0&&estimate(ss,cal).workMin>budget&&guard-->0){
      const choices=(ss.exercises||[]).map((e,i)=>({e,i,priority:n(e.timePriority,i<1?1:i<3?2:3),min:n(e.minTimeSets,e.special?2:i<1?2:1)})).filter(({e,min})=>Array.isArray(e.sets)&&rows(e).length>min&&!e.sets.some(s=>s.done));
      choices.sort((a,b)=>b.priority-a.priority||b.i-a.i);
      const optional=(ss.exercises||[]).map((e,i)=>({e,i,priority:n(e.timePriority,3)})).filter(({e,i})=>i>0&&e.timeOptional===true&&!rows(e).some(s=>s.done)).sort((a,b)=>b.priority-a.priority||b.i-a.i);
      // Omit a low-priority finisher before cutting a more important exercise.
      if(optional.length&&(!choices.length||optional[0].priority>choices[0].priority)){
        const {e,i}=optional[0];ss.timeOmitted.push({name:e.name,reason:'budget allenante'});ss.exercises.splice(i,1);continue;
      }
      if(choices.length){const {e}=choices[0];e.sets.pop();e.timeRemovedSets=n(e.timeRemovedSets)+1;e.timeAdaptReason='budget allenante';continue;}
      if(optional.length){const {e,i}=optional[0];ss.timeOmitted.push({name:e.name,reason:'budget allenante'});ss.exercises.splice(i,1);continue;}
      break;
    }
    const result=estimate(ss,cal);ss.estimatedMin=result.workMin;ss.warmupEstimatedMin=result.warmupMin;ss.timeReserveMin=result.reserveMin;ss.timeAdapted=result.workMin<original.workMin-.05;ss.timeUnmet=budget>0&&result.workMin>budget;ss.timeModelVersion='9.9.2';
    ss.timeRemoved=(ss.exercises||[]).filter(e=>n(e.timeRemovedSets)>0).map(e=>({name:e.name,sets:e.timeRemovedSets}));
    return ss;
  }
  function clock(ss,now=Date.now()){
    let start=time(ss?.workStartedAt),inferred=false;
    const events=(ss?.exercises||[]).flatMap(e=>rows(e).filter(s=>s.done&&time(s.completedAt)!==null).map(s=>({t:time(s.completedAt),e,s}))).sort((a,b)=>a.t-b.t);
    if(start===null&&events.length){start=Math.max(time(ss.startedAt)||0,events[0].t-executionSeconds(events[0].e,events[0].s)*1000);inferred=true;}
    if(start===null)return{seconds:0,started:false,inferred:false,paused:false};
    let end=Math.min(time(ss.finishedAt)||now,now);
    const p=progress(ss);if(p.total&&p.done===p.total&&events.length)end=Math.min(end,events.at(-1).t);
    const intervals=(ss.workPauses||[]).map(x=>[Math.max(start,n(x.start)),Math.min(end,x.end==null?end:n(x.end))]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    const union=[];for(const pair of intervals){const last=union.at(-1);if(last&&pair[0]<=last[1])last[1]=Math.max(last[1],pair[1]);else union.push(pair);}
    const pauseMs=union.reduce((a,[x,y])=>a+y-x,0);
    return{seconds:Math.max(0,(end-start-pauseMs)/1000),started:true,inferred:inferred||ss.workClockSource==='inferred-first-set',paused:(ss.workPauses||[]).some(x=>x.end==null),start};
  }
  return{rows,warmExercise,identity,executionSeconds,progress,observedWindow,calibration,exerciseSeconds,estimate,adapt,clock};
});
