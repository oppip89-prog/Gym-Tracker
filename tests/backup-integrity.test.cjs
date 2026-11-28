'use strict';
// The public build must never contain the former embedded personal program/history.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data.js','utf8')+'\n'+fs.readFileSync('history_seed.js','utf8')+'\n globalThis.clean={p:DEFAULT_PROGRAM,history:INITIAL_HISTORY,boot:INITIAL_BOOTSTRAP}',ctx);
assert.equal(Object.keys(ctx.clean.p.workouts).length,0);assert.equal(ctx.clean.history.length,0);assert.equal(ctx.clean.boot,null);
assert.ok(!fs.existsSync('backups'),'Remove the old backups directory before building');
assert.ok(!fs.existsSync('REPORT_BACKUP_2026-11-25.md'),'Remove the old personal backup report');
const gradle=fs.readFileSync('android/app/build.gradle','utf8');assert.ok(!gradle.includes("include 'history_seed.js'"));assert.ok(gradle.includes("include 'personal_v99.js'"));assert.ok(gradle.includes("include 'styles_personal.css'"));assert.ok(gradle.includes("'syncWebAssets', Sync"));
const index=fs.readFileSync('index.html','utf8');assert.ok(!index.includes('history_seed.js'));assert.ok(index.includes('personal_v99.js'));
const names=['app.js','data.js','fitactive_v94.js','v10_upgrade.js','v9_features.js','exercise_library.js','history_seed.js','README.md','GUIDA_V990.md','GUIDA_GALAXY_WATCH6.md'];
for(const f of names){const s=fs.readFileSync(f,'utf8');assert.doesNotMatch(s,/PPLUL 15W|TM145|manual-seed|Botticelli|Grugliasco|Borgaro|Pinerolo|Beinasco/i,`${f}: personal seed or location`);}
vm.runInContext(fs.readFileSync('exercise_library.js','utf8')+'\nglobalThis.catalog=EXERCISE_LIBRARY_2026',ctx);assert.ok(ctx.catalog.length>=80);assert.equal(ctx.catalog.filter(x=>x.reference||x.referenceByGym||x.initialKg||x.history).length,0);
console.log('PASS: distribution excludes embedded history, personal programs, machine references and former backup files');
