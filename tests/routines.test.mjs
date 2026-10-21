import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanRoutine,cleanRoutines,routineTotal} from '../routine-model.js';
import {parseBackup,normalizeSettings,summarize} from '../core.js';
const routine={id:'custom-test',name:' Mi pausa ',steps:[['shrug',5],['reach',45]]};
test('custom routine validation preserves order and makes an independent snapshot',()=>{
  const clean=cleanRoutine(routine);assert.equal(clean.name,'Mi pausa');assert.equal(routineTotal(clean),50);clean.steps[0][1]=15;assert.equal(routine.steps[0][1],5);
});
test('invalid moves, quantities, IDs, names and excessive routines are rejected',()=>{
  const invalid=[{id:'quick'},{name:'  '},{name:'a'.repeat(61)},{steps:[]},{steps:[['__proto__',30]]},{steps:[[{toString:null},30]]},{steps:[['shrug',4]]},{steps:[['shrug','30']]},{steps:[['shrug',300.1]]},{steps:[['shrug',301]]},{steps:Array.from({length:13},()=>['shrug',5])},{steps:Array.from({length:7},()=>['shrug',300])}];
  for(const override of invalid)assert.equal(cleanRoutine({...routine,...override}),null);
  assert.throws(()=>cleanRoutines([routine,routine],true));assert.throws(()=>cleanRoutines(Array(51).fill(routine),true));assert.deepEqual(cleanRoutines(null),[]);
});
test('old backups remain compatible and new backups reject malformed custom routines',()=>{
  for(const version of [1,2])assert.deepEqual(parseBackup({app:'pomodoro-squats',version,log:[]}).routines,[]);
  const backup={app:'pomodoro-squats',version:3,log:[],routines:[routine]};assert.equal(parseBackup(backup).routines[0].name,'Mi pausa');assert.throws(()=>parseBackup({...backup,routines:[{...routine,steps:[['bad',30]]}]}));assert.throws(()=>parseBackup({...backup,routines:[routine,routine]}));
});
test('daily pushup goal migrates and remains independent of per-break and squat targets',()=>{
  assert.equal(normalizeSettings({dailyGoal:80,pushupTarget:8}).dailyPushupGoal,30);
  const s=normalizeSettings({dailyGoal:80,pushupTarget:8,dailyPushupGoal:20});assert.equal(s.dailyPushupGoal,20);assert.equal(s.dailyGoal,80);assert.equal(s.pushupTarget,8);
  assert.equal(normalizeSettings({dailyPushupGoal:-1}).dailyPushupGoal,1);assert.equal(normalizeSettings({dailyPushupGoal:2000}).dailyPushupGoal,1000);
  const now=Date.now();assert.equal(summarize([{id:'x',type:'Flexiones',reps:20,ts:now}],now).pushups,20);
});
