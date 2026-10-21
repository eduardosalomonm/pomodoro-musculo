import {MOVES} from './routines.js';
import {cleanRoutine, ROUTINE_LIMIT, STEP_LIMIT, MAX_ROUTINE_SECONDS} from './routine-model.js';
import {fmt,escapeHTML as esc} from './core.js';

export function initRoutineEditor({store,uid,toast,getRoutines,saveRoutines,onChange}) {
  const $ = id => document.getElementById(id);
  const dialog = $('routineEditor'), form = $('routineForm');
  let draft = null;
  const draftKey = 'ps.routineDraft';
  const currentDraft = () => {
    const raw = store.get(draftKey,null);
    if (!raw || !Array.isArray(raw.steps) || !raw.steps.length || raw.steps.length > STEP_LIMIT || typeof raw.name !== 'string') return null;
    if (!raw.steps.every(step=>Array.isArray(step)&&typeof step[0]==='string'&&Object.hasOwn(MOVES,step[0])&&(typeof step[1]==='string'||typeof step[1]==='number'))) return null;
    return {id:typeof raw.id==='string'&&/^custom-[a-zA-Z0-9-]{1,100}$/.test(raw.id)?raw.id:`custom-${uid()}`,name:raw.name.slice(0,60),steps:raw.steps.map(([move,seconds])=>[move,String(seconds).slice(0,3)])};
  };
  const renderDraftButton = () => { $('resumeRoutineDraft').hidden = !currentDraft(); };
  const persist = () => {
    if (!draft) return;
    draft.name = $('routineName').value;
    const saved = store.set(draftKey,draft);
    $('routineDraftStatus').textContent = saved ? 'Borrador guardado en este navegador. Cerrar conserva los cambios pendientes.' : 'No se pudo guardar el borrador. Mantén esta ventana abierta.';
    renderDraftButton();
  };
  function summary() {
    const valid = draft.steps.every(([,seconds])=>Number.isInteger(Number(seconds))&&Number(seconds)>=5&&Number(seconds)<=300);
    const seconds = draft.steps.reduce((sum,[,s])=>sum+(Number(s)||0),0);
    $('routineDuration').textContent = `${draft.steps.length} ${draft.steps.length===1?'paso':'pasos'} · ${valid?fmt(seconds):'revisa los segundos'}`;
    $('addRoutineStep').disabled = draft.steps.length >= STEP_LIMIT;
    $('routineEditorError').hidden = seconds <= MAX_ROUTINE_SECONDS;
    $('routineEditorError').textContent = seconds > MAX_ROUTINE_SECONDS ? 'La rutina puede durar hasta 30 minutos. Reduce los segundos o elimina algún paso.' : '';
  }
  function renderSteps(focusIndex=null,action=null) {
    $('routineSteps').innerHTML = draft.steps.map(([move,seconds],i)=>`<li class="routine-step" data-step="${i}">
      <div class="step-editor-head"><b>Paso ${i+1}</b><div class="step-order">
        <button type="button" data-action="up" aria-label="Subir paso ${i+1}" ${i===0?'disabled':''}>↑</button>
        <button type="button" data-action="down" aria-label="Bajar paso ${i+1}" ${i===draft.steps.length-1?'disabled':''}>↓</button>
        <button type="button" data-action="remove" aria-label="Eliminar paso ${i+1}" ${draft.steps.length===1?'disabled':''}>Eliminar</button>
      </div></div>
      <label for="routineMove-${i}">Movimiento<select id="routineMove-${i}" data-field="move">${Object.entries(MOVES).map(([id,m])=>`<option value="${id}" ${id===move?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
      <label class="step-seconds" for="routineSeconds-${i}">Segundos<input id="routineSeconds-${i}" data-field="seconds" type="number" inputmode="numeric" min="5" max="300" step="1" required value="${esc(seconds)}"><small>Entre 5 y 300 s</small></label>
    </li>`).join('');
    summary();
    if (focusIndex!=null) {
      const row=$('routineSteps').children[focusIndex];
      const target=action?row?.querySelector(`[data-action="${action}"]:not(:disabled)`):null;
      const focusTarget=target||row?.querySelector('button:not(:disabled)')||row?.querySelector('select');
      focusTarget?.focus({preventScroll:true});focusTarget?.scrollIntoView({block:'nearest'});
    }
  }
  function open(routine=null,copy=false,resume=false) {
    const exists = routine && getRoutines().some(r=>r.id===routine.id);
    if (!resume && (!exists || copy) && getRoutines().length>=ROUTINE_LIMIT) { toast('Puedes guardar hasta 50 rutinas. Elimina una para crear otra.'); return; }
    draft = resume ? currentDraft() : routine ? {id:exists&&!copy?routine.id:`custom-${uid()}`,name:copy?`${routine.name.slice(0,52)} · copia`:routine.name,steps:routine.steps.map(([move,seconds])=>[move,String(seconds)])} : {id:`custom-${uid()}`,name:'',steps:[['shrug','30'],['reach','30']]};
    if (!draft) return;
    $('routineEditorTitle').textContent = getRoutines().some(r=>r.id===draft.id)?'Editar rutina':'Tu propia rutina';
    $('routineName').value = draft.name; $('routineEditorError').hidden=true;
    renderSteps(); persist(); dialog.showModal();
    // Avoid automatically opening the iPhone keyboard before the user chooses a field.
    $('closeRoutineEditor').focus({preventScroll:true});
  }
  $('routineName').addEventListener('input',persist);
  $('routineSteps').addEventListener('input',e=>{
    const row=e.target.closest('[data-step]'); if(!row)return;
    const i=Number(row.dataset.step);
    if(e.target.dataset.field==='move') draft.steps[i][0]=e.target.value;
    if(e.target.dataset.field==='seconds') draft.steps[i][1]=e.target.value;
    persist(); summary();
  });
  $('routineSteps').addEventListener('change',e=>{
    if(e.target.dataset.field==='move'){draft.steps[Number(e.target.closest('[data-step]').dataset.step)][0]=e.target.value;persist();}
  });
  $('routineSteps').onclick=e=>{
    const button=e.target.closest('[data-action]'); if(!button)return;
    const i=Number(button.closest('[data-step]').dataset.step),action=button.dataset.action;
    if(action==='remove'&&draft.steps.length>1)draft.steps.splice(i,1);
    if(action==='up'&&i>0)[draft.steps[i-1],draft.steps[i]]=[draft.steps[i],draft.steps[i-1]];
    if(action==='down'&&i<draft.steps.length-1)[draft.steps[i+1],draft.steps[i]]=[draft.steps[i],draft.steps[i+1]];
    const focusIndex=Math.max(0,Math.min(draft.steps.length-1,i+(action==='up'?-1:action==='down'?1:0)));
    renderSteps(focusIndex,action==='remove'?null:action);persist();
    $('routineEditorAction').textContent=action==='remove'?'Paso eliminado.':`Paso movido a la posición ${focusIndex+1}.`;
  };
  $('addRoutineStep').onclick=()=>{if(draft.steps.length>=STEP_LIMIT)return;draft.steps.push(['shrug','30']);renderSteps(draft.steps.length-1);persist();$('routineSteps').lastElementChild.scrollIntoView({block:'nearest'});};
  $('closeRoutineEditor').onclick=()=>{persist();dialog.close();};
  dialog.addEventListener('cancel',persist);
  $('discardRoutineDraft').onclick=()=>{store.remove(draftKey);draft=null;dialog.close();renderDraftButton();toast('Borrador descartado');};
  $('resumeRoutineDraft').onclick=()=>open(null,false,true);
  form.onsubmit=e=>{
    e.preventDefault(); if(!form.reportValidity())return;
    const routine=cleanRoutine({...draft,name:$('routineName').value,steps:draft.steps.map(([move,seconds])=>[move,Number(seconds)])});
    if(!routine){$('routineEditorError').hidden=false;$('routineEditorError').textContent='Revisa los pasos: entre 5 y 300 segundos cada uno y hasta 30 minutos en total.';return;}
    const routines=[...getRoutines()],i=routines.findIndex(r=>r.id===routine.id);
    if(i<0&&routines.length>=ROUTINE_LIMIT){$('routineEditorError').hidden=false;$('routineEditorError').textContent='Ya tienes 50 rutinas. Elimina una antes de guardar otra.';return;}
    if(i<0)routines.push(routine);else routines[i]=routine;
    if(!saveRoutines(routines)){$('routineEditorError').hidden=false;$('routineEditorError').textContent='No se pudo guardar. Conservamos el borrador para que puedas volver a intentarlo.';return;}
    store.remove(draftKey);draft=null;dialog.close();onChange();renderDraftButton();toast('Rutina guardada');
  };
  function remove(routine){
    const next=getRoutines().filter(r=>r.id!==routine.id);
    if(!saveRoutines(next))return;
    onChange();toast('Rutina eliminada',()=>{
      if(getRoutines().length>=ROUTINE_LIMIT){toast('No queda espacio. Elimina una rutina antes de recuperarla.');return;}
      if(!getRoutines().some(r=>r.id===routine.id)&&saveRoutines([...getRoutines(),routine]))onChange();
    });
  }
  renderDraftButton();
  return {open,remove};
}
