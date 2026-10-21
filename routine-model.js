import {MOVES} from './routines.js';
export const ROUTINE_LIMIT = 50;
export const STEP_LIMIT = 12;
export const MAX_ROUTINE_SECONDS = 1800;
export const routineTotal = routine => routine.steps.reduce((sum,[,seconds])=>sum+seconds,0);
export function cleanRoutine(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,100}$/.test(value.id)) return null;
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 60) return null;
  if (!Array.isArray(value.steps) || !value.steps.length || value.steps.length > STEP_LIMIT) return null;
  const steps = [];
  for (const step of value.steps) {
    if (!Array.isArray(step) || step.length !== 2 || typeof step[0] !== 'string' || !Object.hasOwn(MOVES,step[0]) || !Number.isInteger(step[1]) || step[1] < 5 || step[1] > 300) return null;
    steps.push([step[0],step[1]]);
  }
  const routine = {id:value.id,name:value.name.trim(),steps};
  return routineTotal(routine) <= MAX_ROUTINE_SECONDS ? routine : null;
}
export function cleanRoutines(value, strict = false) {
  if (!Array.isArray(value) || value.length > ROUTINE_LIMIT) {
    if (strict) throw Error('invalid-routines');
    return [];
  }
  const ids = new Set(), routines = [];
  for (const raw of value) {
    const routine = cleanRoutine(raw);
    if (!routine || ids.has(routine.id)) { if (strict) throw Error('invalid-routines'); continue; }
    ids.add(routine.id); routines.push(routine);
  }
  return routines;
}
