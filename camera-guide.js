import {CalibrationGuide,cleanProfiles,profileKey,compatibleProfile} from './calibration-model.js';

export function createCameraGuide({store,getContext,getReady,onBegin,onEnd,onLock,onReset,toast,say,announce,onCancel}){
  const $=id=>document.getElementById(id);
  let profiles=cleanProfiles(store.get('ps.calibration',{})),guide=null,pending=false,token=null,lastStage='';
  function profile(){const c=getContext();const p=profiles[profileKey(c.kind,c.facing,c.aspect,c.lens)];return compatibleProfile(p,c)?p:null;}
  function summary(){
    const p=profile(),ready=getReady(),context=getContext(),saved=Object.values(profiles).some(p=>p.kind===context.kind&&p.facing===context.facing);
    $('cameraProfile').textContent=!ready?(saved?'Hay un ajuste guardado para este ejercicio y cámara.':'Todavía no has calibrado este ejercicio con esta cámara.'):p?`Calibración guardada · ${new Date(p.ts).toLocaleDateString('es',{day:'numeric',month:'short'})}`:'Sin calibración compatible · se usa el ajuste predeterminado';
    $('testCalibration').hidden=!p||!ready;$('forgetCalibration').hidden=!p||!ready;$('calibrateBtn').disabled=pending||!!guide;
    $('calibrationReminder').textContent='Recalibra si mueves el iPhone o cambias de posición. Cada ejercicio, lente y encuadre guarda su propio ajuste.';
  }
  function lock(){onLock(true);$('calibrationPanel').hidden=false;$('calibrationPanel').scrollIntoView({block:'start'});}
  function prepare(){if(pending||guide)return;token=onBegin();pending=true;lastStage='';lock();$('calibrationTitle').textContent='Preparando la cámara';$('calibrationCue').textContent='Permite el acceso a la cámara. Puedes cancelar mientras carga el modelo.';$('calibrationCounter').textContent='';$('calibrationFill').style.width='0%';$('calibrationConfirm').hidden=true;$('retryCalibrationTest').hidden=true;$('restartCalibration').hidden=true;summary();}
  function start(useSaved=false){
    if(!getReady())return;
    if(!pending&&!guide)token=onBegin();
    pending=false;guide=new CalibrationGuide(getContext(),useSaved?profile():null);lastStage='';lock();onReset();render(performance.now());summary();
  }
  function render(now){
    if(!guide)return;
    const stage=guide.stage,push=getContext().kind!=='squats',countdown=Math.max(0,Math.ceil((guide.readyAt-now)/1000));
    const text={
      frame:['1 / Encuadre',push?'Apoya el iPhone fijo. Deja visibles hombro, codo, muñeca, cadera y rodilla de un lado. Mantén el encuadre un instante.':'Apoya el iPhone fijo. Colócate de lado y encuadra cadera, rodillas y tobillos cerca del centro. La cabeza puede quedar fuera. Mantén el encuadre un instante.'],
      extended:['2 / Posición extendida',push?'Extiende los brazos en tu posición de flexión. Mantén la posición un momento.':'Ponte de pie con las piernas extendidas. Mantén la posición un momento.'],
      bent:['3 / Posición flexionada',push?'Flexiona los codos hasta un punto cómodo y mantente un momento, sin forzar.':'Baja hasta un punto cómodo y mantente un momento, sin forzar.'],
      test:['4 / Dos repeticiones de prueba',push?'Primero extiende los brazos. Haz dos flexiones completas y despacio. Estas pruebas no se suman a tu actividad.':'Primero ponte de pie. Haz dos sentadillas completas y despacio. Estas pruebas no se suman a tu actividad.'],
      complete:['¿Ha contado tus dos repeticiones?','Si coincide con lo que hiciste, guarda el ajuste. Si contó de más o de menos, repite la prueba o vuelve a calibrar.']
    }[stage];
    $('calibrationTitle').textContent=text[0];$('calibrationCue').textContent=guide.message||text[1];
    $('calibrationCounter').textContent=stage==='test'||stage==='complete'?`${guide.testReps} / 2 de prueba`:countdown?`Prepárate · ${countdown}`:guide.progress>0?'Mantén la posición…':'';
    $('calibrationFill').style.width=`${guide.progress}%`;$('calibrationProgress').setAttribute('aria-valuenow',Math.round(guide.progress));
    $('calibrationConfirm').hidden=stage!=='complete';$('retryCalibrationTest').hidden=stage!=='complete';$('restartCalibration').hidden=stage==='frame';
    if(lastStage!==stage){lastStage=stage;say(text[1]);announce(`${text[0]}. ${text[1]}`);}
  }
  function feed(measurement,now){if(!guide)return;guide.feed(measurement,now);render(now);}
  function cancel(){
    const wasActive=pending||!!guide;const restore=token;pending=false;guide=null;token=null;lastStage='';$('calibrationPanel').hidden=true;
    if(wasActive){onLock(false);onReset();onEnd(restore);}summary();
  }
  $('calibrationConfirm').onclick=()=>{
    if(guide?.stage!=='complete'||!guide.profile)return;
    const p={...guide.profile,ts:Date.now()},next={...profiles,[profileKey(p.kind,p.facing,p.aspect,p.lens)]:p};
    if(!store.set('ps.calibration',next)){toast('No se pudo guardar la calibración. Puedes intentarlo de nuevo.');return;}
    profiles=next;cancel();toast('Calibración guardada. El conteo de actividad empieza con el siguiente ciclo.');say('Calibración guardada. Ya puedes contar tu actividad.');
  };
  $('retryCalibrationTest').onclick=()=>{guide?.retryTest();lastStage='';render(performance.now());};
  $('restartCalibration').onclick=()=>start(false);
  $('cancelCalibration').onclick=onCancel;
  $('testCalibration').onclick=()=>start(true);
  $('forgetCalibration').onclick=()=>{
    const p=profile();if(!p)return;const next={...profiles};delete next[profileKey(p.kind,p.facing,p.aspect,p.lens)];
    if(store.set('ps.calibration',next)){profiles=next;onReset();summary();toast('Calibración eliminada para este ejercicio y cámara');}
  };
  summary();return {get active(){return pending||!!guide;},prepare,start,feed,cancel,profile,summary};
}
