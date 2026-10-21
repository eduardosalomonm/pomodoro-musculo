import {cleanRoutines} from './routine-model.js';
export const DEFAULTS = {focusMin:25, breakMin:5, targetReps:15, pushupTarget:8, dailyGoal:100, dailyPushupGoal:30, depth:105, autoFocus:0, voice:1, sound:1, pushupStyle:'floor', theme:'system', preferredExercise:'squats'};
const limits = {focusMin:[1,120], breakMin:[1,30], targetReps:[1,200], pushupTarget:[1,200], dailyGoal:[5,1000], dailyPushupGoal:[1,1000], autoFocus:[0,1], voice:[0,1], sound:[0,1]};
export function normalizeSettings(value={}) {
  const out={...DEFAULTS};
  if (!value || typeof value!=='object') return out;
  for (const [k,[min,max]] of Object.entries(limits)) {
    if (Number.isFinite(Number(value[k]))) out[k]=Math.min(max,Math.max(min,Math.round(Number(value[k]))));
  }
  if ([90,105,120].includes(Number(value.depth))) out.depth=Number(value.depth);
  for (const [k,options] of Object.entries({pushupStyle:['floor','wall'], theme:['system','light','dark'], preferredExercise:['squats','pushups','stretch']})) if (options.includes(value[k])) out[k]=value[k];
  return out;
}
export function dayKey(ts=Date.now()) { const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function dayOffset(ts,n) { const d=new Date(ts); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return d.getTime(); }
export function fmt(s) { s=Math.max(0,Math.ceil(s)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
export function escapeHTML(v) { return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const types=['Sentadillas','Flexiones','Zancadas','Plancha (seg)','Plancha','Saltos','Estiramiento'];
export function cleanEntry(e) {
  if (!e || typeof e!=='object' || typeof e.id!=='string' || !e.id.length || e.id.length>120 || !Number.isFinite(e.ts) || e.ts<0 || e.ts>8640000000000000 || !types.includes(e.type)) return null;
  const out={id:e.id,ts:e.ts,type:e.type,source:['manual','camera','mixed','routine'].includes(e.source)?e.source:'manual'};
  if (e.example===true) out.example=true;
  if (typeof e.detail==='string') out.detail=e.detail.slice(0,160);
  if (typeof e.partial==='boolean') out.partial=e.partial;
  if (e.type==='Estiramiento') {
    if (!Number.isInteger(e.durationSec) || e.durationSec<1 || e.durationSec>86400) return null;
    out.durationSec=e.durationSec;
  } else if (e.type==='Plancha (seg)' || e.type==='Plancha') {
    const secs=e.durationSec??e.reps;
    if (!Number.isInteger(secs) || secs<1 || secs>86400) return null;
    out.type='Plancha'; out.durationSec=secs;
  } else {
    if (!Number.isInteger(e.reps) || e.reps<0 || e.reps>100000) return null;
    out.reps=e.reps;
    if (Number.isInteger(e.target) && e.target>0 && e.target<=1000) out.target=e.target;
  }
  return out;
}
export function cleanLog(items) {
  if (!Array.isArray(items)) return [];
  const ids=new Set(); return items.map(cleanEntry).filter(e=>e && !ids.has(e.id) && ids.add(e.id)).sort((a,b)=>b.ts-a.ts);
}
export function cleanDaily(value) {
  const out={};
  if (value && typeof value==='object') for (const [k,v] of Object.entries(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isInteger(v) && v>=0 && v<=1000000 && dayKey(new Date(`${k}T12:00:00`).getTime())===k) out[k]=v;
  }
  return out;
}
export function parseBackup(value) {
  if (!value || value.app!=='pomodoro-squats' || ![1,2,3].includes(value.version) || !Array.isArray(value.log) || value.log.length>100000) throw Error('invalid-backup');
  const log=cleanLog(value.log);
  if (log.length!==value.log.length) throw Error('invalid-entries');
  return {log,pomos:cleanDaily(value.pomos),focusMinutes:cleanDaily(value.focusMinutes),routines:value.version===3?cleanRoutines(value.routines??[],true):[]};
}
export function summarize(log, now=Date.now()) {
  const real=log.filter(e=>!e.example), today=dayKey(now), entries=real.filter(e=>dayKey(e.ts)===today);
  const sum=type=>entries.filter(e=>e.type===type).reduce((s,e)=>s+(e.reps||0),0);
  const days=new Set(real.filter(e=>(e.reps||e.durationSec)>0).map(e=>dayKey(e.ts)));
  let streak=0;
  for(let i=days.has(today)?0:1;days.has(dayKey(dayOffset(now,-i)));i++) streak++;
  const week=Array.from({length:7},(_,i)=>{const ts=dayOffset(now,i-6),k=dayKey(ts); return {key:k,ts,reps:real.filter(e=>dayKey(e.ts)===k).reduce((s,e)=>s+(e.reps||0),0)};});
  return {squats:sum('Sentadillas'),pushups:sum('Flexiones'),stretchSec:entries.filter(e=>e.type==='Estiramiento').reduce((s,e)=>s+e.durationSec,0),streak,week};
}
export {jointAngle,RepTracker} from './pose-counter.js';
