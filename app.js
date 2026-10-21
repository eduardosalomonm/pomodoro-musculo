import {createCameraGuide} from './camera-guide.js';
import {measurePose,poseChanged} from './pose-counter.js';
import {calibrationKind} from './calibration-model.js';
import {initRoutineEditor} from './routine-editor.js';
import {cleanRoutines,routineTotal,ROUTINE_LIMIT} from './routine-model.js';
import {initCompanion} from './companion.js';
import {DEFAULTS,normalizeSettings,dayKey,dayOffset,fmt,escapeHTML as esc,cleanEntry,cleanLog,cleanDaily,parseBackup,summarize,jointAngle,RepTracker} from './core.js';
import {animate} from './figure.js';
import {MOVES,ROUTINES} from './routines.js';
const $=id=>document.getElementById(id);
const store={
  get(k,d){try {const v=localStorage.getItem(k);return v?JSON.parse(v):d;} catch{return d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{$('storageWarning').hidden=false;return false;}},
  remove(k){try{localStorage.removeItem(k);}catch{$('storageWarning').hidden=false;}}
};
let settings=normalizeSettings(store.get('ps.settings',{}));
let customRoutines=cleanRoutines(store.get('ps.routines',[]));
let pendingRoutine=null;
let log=cleanLog(store.get('ps.log',[]));
let pomos=cleanDaily(store.get('ps.pomos',{})), focusMinutes=cleanDaily(store.get('ps.focusMinutes',{}));
const uid=()=>crypto.randomUUID?.()??`${Date.now()}-${Math.random().toString(16).slice(2)}`;
let toastTimeout;
function toast(message,undo){
  clearTimeout(toastTimeout);$('toast').replaceChildren(document.createTextNode(message));
  if(undo){const b=document.createElement('button');b.textContent='Deshacer';b.onclick=()=>{undo();$('toast').classList.remove('show');};$('toast').append(' ',b);}
  $('toast').classList.add('show');toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),undo?7000:3500);
}
function announce(message){$('announcer').textContent=message;}
function saveLog(){const saved=store.set('ps.log',log);renderStats();renderHistory();return saved;}
function upsert(entry){const clean=cleanEntry(entry);if(!clean)return false;const i=log.findIndex(e=>e.id===clean.id);if(i<0)log.unshift(clean);else log[i]=clean;log.sort((a,b)=>b.ts-a.ts);return saveLog();}
// Write history first. If interrupted before removing a draft, its ID prevents duplication.
let audioCtx;
function unlockAudio(){try{audioCtx??=new AudioContext();audioCtx.resume().catch(()=>{});}catch{}}
function beep(freq=880,ms=140,times=2){if(!settings.sound)return;try{audioCtx??=new AudioContext();for(let i=0;i<times;i++){const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+i*(ms/1000+.08);o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.15,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+ms/1000);o.start(t);o.stop(t+ms/1000+.02);}}catch{}}
function say(text){if(!settings.voice||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='es-ES';speechSynthesis.speak(u);}catch{}}
function notify(title,body){beep();announce(`${title}. ${body}`);try{if(Notification.permission==='granted'&&document.hidden)new Notification(title,{body,icon:'icon.svg'});}catch{}}
function notificationState(){const state='Notification'in window?Notification.permission:'unsupported';$('notificationBtn').disabled=state==='granted'||state==='denied'||state==='unsupported';$('notificationBtn').textContent=state==='granted'?'Notificaciones activadas':'Activar notificaciones';$('notificationStatus').textContent=state==='denied'?'Permiso bloqueado. Puedes cambiarlo en los ajustes del navegador. La app debe estar abierta.':state==='unsupported'?'Este navegador no admite notificaciones. La app seguirá mostrando avisos.':'Los avisos necesitan que la app esté abierta.';}
$('notificationBtn').onclick=async()=>{try{await Notification.requestPermission();}catch{}notificationState();};
function applyTheme(){if(settings.theme==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=settings.theme;document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();}
function populateSettings(){for(const k of Object.keys(DEFAULTS))if($(k)&&k!=='pushupStyle')$(k).value=String(settings[k]);$('pushupStyle').value=settings.pushupStyle;}
function openSettings(){populateSettings();notificationState();$('settingsDialog').showModal();}
$('settingsBtn').onclick=openSettings;
$('editDailyGoals').onclick=()=>{openSettings();$('dailyPushupGoal').focus();$('dailyPushupGoal').scrollIntoView({block:'center'});};
$('settingsDialog').addEventListener('click',e=>{if(e.target===$('settingsDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
for(const k of Object.keys(DEFAULTS))if($(k)&&k!=='pushupStyle')$(k).addEventListener('change',()=>{
  if(!$(k).checkValidity()){$(k).reportValidity();$(k).value=settings[k];return;}
  settings=normalizeSettings({...settings,[k]:$(k).value});store.set('ps.settings',settings);populateSettings();applyTheme();
  if(!settings.voice)try{speechSynthesis.cancel();}catch{}
  if((k==='focusMin'||k==='breakMin')&&!timer.running&&timer.remaining===timer.total){setMode(timer.mode);renderTimer();}
  if(k==='depth')tracker?.reset();
  renderChoices();renderReps();renderStats();
});
$('focusTask').value=String(store.get('ps.task','')).slice(0,140);
$('focusTask').addEventListener('input',()=>store.set('ps.task',$('focusTask').value));
const freshTimer=mode=>({mode,running:false,endAt:0,total:(mode==='focus'?settings.focusMin:settings.breakMin)*60,remaining:(mode==='focus'?settings.focusMin:settings.breakMin)*60,snoozed:false});
const storedTimer=store.get('ps.timer',{});
let timer=freshTimer('focus');
if(storedTimer&&['focus','break'].includes(storedTimer.mode)&&typeof storedTimer.running==='boolean'&&Number.isFinite(storedTimer.total)&&storedTimer.total>0&&storedTimer.total<=7200&&Number.isFinite(storedTimer.remaining)&&storedTimer.remaining>=0&&storedTimer.remaining<=storedTimer.total&&Number.isFinite(storedTimer.endAt))timer={...timer,...storedTimer,snoozed:storedTimer.snoozed===true};
if(timer.running&&(!timer.endAt||Date.now()-timer.endAt>600000||timer.endAt-Date.now()>timer.total*1000+1000)){timer=freshTimer('focus');store.set('ps.timer',timer);}
const saveTimer=()=>store.set('ps.timer',timer);
const remaining=()=>Math.max(0,timer.running?(timer.endAt-Date.now())/1000:timer.remaining);
let breakNudge,view='choose';
function setMode(mode){timer=freshTimer(mode);saveTimer();}
function renderTimer(){
  const rem=remaining(),isBreak=timer.mode==='break';
  $('time').textContent=fmt(rem);$('ringArc').style.strokeDashoffset=339.3*(1-Math.min(1,rem/timer.total));$('ringArc').setAttribute('stroke',isBreak?'var(--sage)':'var(--accent)');
  $('modePill').classList.toggle('focus',!isBreak);$('t-title').textContent=isBreak?(timer.running?'Pausa activa':'Pausa en espera'):(timer.running?'En foco':rem<timer.total?'Foco en pausa':'Foco listo');
  $('startBtn').textContent=timer.running?(isBreak?'Pausar descanso':'Pausar foco'):(rem<timer.total?'Continuar':isBreak?'Empezar pausa':'Empezar foco');
  $('timerMessage').textContent=isBreak?'Cambia de postura.':timer.running?'Una cosa a la vez.':'Este rato es para ti.';
  $('timerHint').textContent=isBreak?'Elige una actividad y muévete a tu ritmo.':`Después, ${settings.breakMin} min para moverte.`;
  $('breakNowBtn').hidden=isBreak;$('snoozeBtn').hidden=!isBreak;$('skipBtn').hidden=!isBreak;$('breakClock').hidden=!isBreak;
  $('breakClock').textContent=`${timer.running?'Pausa':'En pausa'} · ${fmt(rem)}`;$('restTime').textContent=fmt(rem);
  $('b-title').textContent=isBreak?'Dale movimiento a tu pausa':'Tu próxima pausa';
  $('focusCount').textContent=`${pomos[dayKey()]||0} ${pomos[dayKey()]===1?'bloque':'bloques'} hoy`;
  $('focusMinutes').textContent=`${focusMinutes[dayKey()]||0} min de foco registrados`;
  document.body.classList.toggle('is-break',isBreak);
  document.title=timer.running?`${fmt(rem)} · ${isBreak?'Pausa':'Foco'} · Pomodoro Squats`:'Pomodoro Squats';
}
function startTimer(){store.set('ps.welcomed',true);$('welcomeCard').hidden=true;unlockAudio();timer.endAt=Date.now()+timer.remaining*1000;timer.running=true;saveTimer();if(rt.r&&rt.timerPaused){rt.timerPaused=false;rt.paused=false;rt.lastAt=Date.now();renderStep();}renderTimer();}
function pauseTimer(){if(timer.running&&Date.now()>=timer.endAt){updateTimer();return;}timer.remaining=remaining();timer.running=false;saveTimer();if(rt.r&&!rt.paused){tickRoutine();rt.paused=true;rt.timerPaused=true;renderStep();}renderTimer();}
function beginBreak(fromTimer=false,duration=settings.breakMin*60){
  const endAt=timer.endAt,minutes=Math.round(timer.total/60),count=fromTimer&&!timer.snoozed;
  settleActivity();clearTimeout(breakNudge);
  if(count){const key=dayKey(endAt||Date.now());pomos[key]=(pomos[key]||0)+1;focusMinutes[key]=(focusMinutes[key]||0)+minutes;store.set('ps.pomos',pomos);store.set('ps.focusMinutes',focusMinutes);}
  setMode('break');timer.total=timer.remaining=duration;startTimer();showView('choose');$('chooseHint').textContent=`Tienes ${fmt(duration)} para moverte. Elige una actividad.`;
  if(fromTimer){notify('Hora de moverte','Elige sentadillas, flexiones o estiramientos.');say('Hora de una pausa. Elige cómo quieres moverte.');}
  breakNudge=setTimeout(()=>{if(view==='choose'&&timer.mode==='break'&&timer.running)notify('Tu pausa sigue en marcha','Un poco de movimiento también cuenta.');},60000);
}
function endBreak(){
  clearTimeout(breakNudge);const saved=settleActivity(timer.endAt);setMode('focus');showView('choose');
  $('chooseHint').textContent=saved?'Tu movimiento está guardado. Cuando quieras, empieza otro bloque.':'Pausa terminada. Cuando quieras, empieza otro bloque.';
  notify('Vuelta al foco','Tu pausa ha terminado.');say('Pausa terminada. De vuelta al foco.');if(settings.autoFocus)startTimer();renderTimer();
}
function updateTimer(){if(timer.running&&Date.now()>=timer.endAt)timer.mode==='focus'?beginBreak(true):endBreak();renderTimer();if(dayKey()!==renderedDay)renderStats();}
$('startBtn').onclick=()=>timer.running?pauseTimer():startTimer();
$('resetBtn').onclick=()=>{settleActivity();clearTimeout(breakNudge);setMode('focus');showView('choose');$('chooseHint').textContent='Elige cómo quieres moverte. Tu pausa empieza al elegir.';renderTimer();};
$('breakNowBtn').onclick=()=>{if(timer.mode==='break')return;beginBreak();$('breakCard').focus({preventScroll:true});$('breakCard').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
$('snoozeBtn').onclick=()=>{settleActivity();clearTimeout(breakNudge);setMode('focus');timer.total=timer.remaining=300;timer.snoozed=true;startTimer();showView('choose');$('chooseHint').textContent='Tu pausa está pospuesta. Te avisamos en 5 minutos.';toast('Pausa pospuesta 5 min');};
$('skipBtn').onclick=()=>{settleActivity();clearTimeout(breakNudge);setMode('focus');showView('choose');$('chooseHint').textContent='Cuando quieras, empieza otro bloque.';if(settings.autoFocus)startTimer();renderTimer();};
let demoStop=null,stretchDemoStop=null;
function showView(next){
  view=next;for(const v of ['choose','exercise','stretch','rest'])$(`v${v[0].toUpperCase()+v.slice(1)}`).hidden=v!==next;
  $('backToChoices').hidden=next==='choose'||next==='rest';
  demoStop?.();demoStop=null;
  if(next==='exercise')demoStop=animate($('exerciseDemo'),()=>camOn?null:exercise.kind==='pushups'?{pushup:performance.now()/3000,wall:settings.pushupStyle==='wall'}:MOVES.squat);
  if(next==='stretch'){$('player').hidden=true;$('routinePicker').hidden=false;renderRoutinePicker();}
}
$('backToChoices').onclick=()=>{const saved=settleActivity();showView('choose');if(saved)toast('Movimiento guardado');};
function renderChoices(){
  $('squatChoiceTarget').textContent=`${settings.targetReps} reps`;$('pushupChoiceTarget').textContent=`${settings.pushupTarget} reps`;
  for(const [k,id] of [['squats','pickSquats'],['pushups','pickPushups'],['stretch','pickStretch']])$(id).querySelector('.preferred').hidden=settings.preferredExercise!==k||!store.get('ps.hasChosen',false);
}
function pickActivity(kind){
  unlockAudio();if(timer.mode!=='break')beginBreak();else settleActivity();clearTimeout(breakNudge);
  settings.preferredExercise=kind;store.set('ps.settings',settings);store.set('ps.hasChosen',true);renderChoices();
  if(kind==='stretch'){showView('stretch');announce('Elige una rutina de estiramientos.');return;}
  exercise={id:uid(),ts:Date.now(),kind,reps:0,cameraReps:0,manual:false};showView('exercise');renderExercise();announce(`${kind==='pushups'?'Flexiones':'Sentadillas'}. Objetivo: ${exerciseTarget()} repeticiones.`);
  say(kind==='pushups'?'Flexiones. Activa la cámara o cuenta a mano.':'Sentadillas. Activa la cámara o cuenta a mano.');
}
$('pickSquats').onclick=()=>pickActivity('squats');$('pickPushups').onclick=()=>pickActivity('pushups');$('pickStretch').onclick=()=>pickActivity('stretch');
let exercise=null;
const exerciseTarget=()=>exercise?.kind==='pushups'?settings.pushupTarget:settings.targetReps;
function renderExercise(){
  cameraGuide?.summary();
  const push=exercise?.kind==='pushups';$('exerciseTitle').textContent=push?'Flexiones':'Sentadillas';$('repUnit').textContent=push?'flexiones':'sentadillas';$('pushupStyleLabel').hidden=!push;$('pushupStyle').value=settings.pushupStyle;
  $('exerciseDemo').setAttribute('aria-label',push?`Demostración de flexión ${settings.pushupStyle==='wall'?'contra la pared':'en suelo'}`:'Demostración de sentadilla');
  $('exerciseCue').textContent=push?(settings.pushupStyle==='wall'?'Apoya las manos en la pared. Flexiona los codos y vuelve a extenderlos, con el cuerpo alineado.':'Con el cuerpo alineado, flexiona los codos y vuelve a extenderlos. Puedes apoyar las rodillas para adaptar el esfuerzo.'):'Baja como si te sentaras y vuelve a subir, a tu ritmo.';
  $('camHint').textContent=push?'Colócate de lado. La cámara necesita ver hombros, codos, muñecas y cadera.':'Colócate de lado y encuadra cadera, rodillas y tobillos.';renderReps();
}
function renderReps(){
  const n=exercise?.reps||0,target=exerciseTarget();$('repCount').textContent=n;$('repTarget').textContent=target;$('repBar').style.width=`${Math.min(100,n/target*100)}%`;
  $('repProgress').setAttribute('aria-valuemax',target);$('repProgress').setAttribute('aria-valuenow',Math.min(n,target));$('repProgress').setAttribute('aria-valuetext',`${n} de ${target} repeticiones`);
  $('minusRep').disabled=n===0;$('saveExercise').disabled=n===0;
}
function exerciseEntry(){if(!exercise?.reps)return null;return {id:exercise.id,ts:exercise.ts,type:exercise.kind==='pushups'?'Flexiones':'Sentadillas',reps:exercise.reps,target:exerciseTarget(),source:exercise.cameraReps?(exercise.manual?'mixed':'camera'):'manual',...(exercise.kind==='pushups'?{detail:settings.pushupStyle==='wall'?'Contra la pared':'En suelo'}:{})};}
function persistExercise(){const e=exerciseEntry();if(e)store.set('ps.exercise',e);else store.remove('ps.exercise');}
function addRep(n=1,fromCamera=false){
  if(!exercise||cameraGuide.active)return;const before=exercise.reps;exercise.reps=Math.max(0,Math.min(100000,before+n));if(fromCamera)exercise.cameraReps++;else exercise.manual=true;persistExercise();renderReps();
  if(fromCamera){beep(660,70,1);if(exercise.reps%5===0)say(String(exercise.reps));}
  if(before<exerciseTarget()&&exercise.reps>=exerciseTarget()){say('Objetivo cumplido. Puedes seguir o guardar y descansar.');toast('Objetivo cumplido. ¡Cada repetición suma!');}
}
function saveExercise(){const e=exerciseEntry();if(!e)return '';const saved=upsert(e);if(saved)store.remove('ps.exercise');return `${e.reps} ${e.type.toLowerCase()}`;}
$('plusRep').onclick=()=>addRep();$('minusRep').onclick=()=>addRep(-1);$('plusFive').onclick=()=>addRep(5);
$('saveExercise').onclick=()=>{const label=saveExercise();if(!label)return;stopCamera();exercise=null;renderReps();showView('rest');$('restDone').textContent=label;announce(`Guardado: ${label}`);toast(`Guardado: ${label}`);};
$('pushupStyle').onchange=()=>{const label=saveExercise();stopCamera();settings.pushupStyle=$('pushupStyle').value;store.set('ps.settings',settings);exercise={id:uid(),ts:Date.now(),kind:'pushups',reps:0,cameraReps:0,manual:false};renderExercise();if(label)toast(`Guardado: ${label}`);};
$('restStretch').onclick=()=>pickActivity('stretch');$('restFocus').onclick=()=>$('skipBtn').click();
let wakeLock=null,wakePending=false,wakeWanted=false;
async function keepAwake(on){wakeWanted=on;if(!on){const lock=wakeLock;wakeLock=null;try{await lock?.release();}catch{}return;}if(wakePending||wakeLock||document.hidden)return;wakePending=true;try{const lock=await navigator.wakeLock?.request('screen');if(wakeWanted&&!document.hidden){wakeLock=lock;lock?.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;});}else await lock?.release();}catch{}finally{wakePending=false;}}
let camOn=false,camLoading=false,stream=null,landmarker=null,modelPromise=null,camRaf=0,camGeneration=0,tracker=null;
let facing=store.get('ps.cameraFacing','user');if(!['user','environment'].includes(facing))facing='user';$('cameraFacing').value=facing;
const cameraContext=()=>({kind:calibrationKind(exercise?.kind,settings.pushupStyle),facing,aspect:$('video').videoWidth&&$('video').videoHeight?$('video').videoWidth/$('video').videoHeight:4/3});
const cameraGuide=createCameraGuide({store,getContext:cameraContext,getReady:()=>camOn,toast,say,announce,
  onBegin:()=>{const token={resume:timer.mode==='break'&&timer.running,id:exercise?.id};if(token.resume)pauseTimer();return token;},
  onEnd:token=>{if(token?.resume&&exercise?.id===token.id&&timer.mode==='break'&&!timer.running)startTimer();},
  onReset:()=>tracker?.reset(),
  onLock:active=>{document.body.classList.toggle('is-calibrating',active);for(const id of ['startBtn','resetBtn','snoozeBtn','skipBtn','pushupStyle','cameraFacing','plusRep','minusRep','plusFive','saveExercise','settingsBtn','testCalibration','forgetCalibration'])$(id).disabled=active;if(!active)renderReps();},
  onCancel:()=>{if(camLoading)stopCamera();else{cameraGuide.cancel();$('camHint').textContent='Calibración cancelada. Puedes seguir con el conteo o contar a mano.';}}
});
$('calibrateBtn').onclick=()=>{if(!exercise||camLoading)return;if(camOn)cameraGuide.start();else{cameraGuide.prepare();startCamera(true);}};
$('cameraFacing').onchange=()=>{const restart=camOn;stopCamera();facing=$('cameraFacing').value;store.set('ps.cameraFacing',facing);cameraGuide.summary();if(restart)startCamera();};
matchMedia('(orientation: portrait)').addEventListener('change',()=>{if(camOn||camLoading){stopCamera();$('camHint').textContent='La orientación cambió. Vuelve a activar la cámara con este encuadre y calibra si hace falta.';}});

const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
async function loadLandmarker(){
  if(landmarker)return landmarker;
  if(!modelPromise)modelPromise=(async()=>{const {PoseLandmarker,FilesetResolver}=await import(`${MP}/vision_bundle.mjs`);const files=await FilesetResolver.forVisionTasks(`${MP}/wasm`);const opts=delegate=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.6,minPosePresenceConfidence:.6,minTrackingConfidence:.6});try{return await PoseLandmarker.createFromOptions(files,opts('GPU'));}catch{return await PoseLandmarker.createFromOptions(files,opts('CPU'));}})().then(model=>landmarker=model).finally(()=>modelPromise=null);
  return modelPromise;
}
async function startCamera(calibrate=false){
  const generation=++camGeneration;const active=()=>generation===camGeneration&&view==='exercise'&&exercise&&!document.hidden;
  camLoading=true;$('calibrateBtn').disabled=true;$('camBtn').disabled=false;$('camBtn').textContent='Cancelar cámara';$('camHint').textContent='Preparando la cámara y el modelo. La primera vez puede tardar unos segundos.';
  let requested;
  try{
    requested=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}},audio:false});
    if(!active()){requested.getTracks().forEach(t=>t.stop());return;}
    stream=requested;const actualFacing=stream.getVideoTracks?.()[0]?.getSettings?.().facingMode;if(['user','environment'].includes(actualFacing)&&actualFacing!==facing){facing=actualFacing;$('cameraFacing').value=facing;store.set('ps.cameraFacing',facing);toast('Se usa la cámara disponible. Comprueba el encuadre antes de calibrar.');}const v=$('video');v.srcObject=stream;v.playsInline=true;v.muted=true;await v.play();if(!active())return;await loadLandmarker();if(!active())return;
    camLoading=false;camOn=true;tracker=new RepTracker(exercise.kind==='pushups'?100:settings.depth);keepAwake(true);$('video').classList.toggle('rear-camera',facing==='environment');$('overlay').classList.toggle('rear-camera',facing==='environment');
    $('video').hidden=false;$('overlay').hidden=false;$('exerciseDemo').hidden=true;$('camBtn').disabled=false;$('camBtn').textContent='Apagar cámara';
    stream.getVideoTracks?.().forEach(track=>track.addEventListener('ended',()=>{if(generation===camGeneration){stopCamera();$('camHint').textContent='La cámara se interrumpió. Tus repeticiones se conservan; puedes reactivarla o seguir a mano.';}}));
    cameraGuide.summary();if(calibrate)cameraGuide.start();else say('Cámara lista. Empieza con el cuerpo extendido.');runDetection(generation);
  }catch(e){
    requested?.getTracks().forEach(t=>t.stop());if(!active())return;stopCamera();
    $('camHint').textContent=e?.name==='NotAllowedError'?(requested?'El navegador no pudo mostrar la cámara. Abre la app directamente en Safari o Chrome y vuelve a activarla, o cuenta a mano.':'Cámara sin permiso. Actívalo en el navegador o utiliza los botones +1 y +5.'):e?.name==='NotFoundError'?'No se encontró una cámara. Puedes contar con +1 y +5.':'No se pudo cargar la cámara o el modelo. Comprueba la conexión o cuenta con +1 y +5.';
  }
}
function stopCamera(){camGeneration++;camOn=false;camLoading=false;cameraGuide.cancel();$('trackingQuality').textContent='Cámara apagada';cancelAnimationFrame(camRaf);stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').pause();$('video').srcObject=null;$('video').hidden=true;$('overlay').hidden=true;$('exerciseDemo').hidden=false;$('camBtn').disabled=false;$('camBtn').textContent='Activar cámara';tracker?.reset();keepAwake(!!rt.r&&!rt.paused);}
$('camBtn').onclick=()=>camOn||camLoading?stopCamera():startCamera();
const BONES=[[11,12],[11,23],[12,24],[23,24],[11,13],[13,15],[12,14],[14,16],[23,25],[25,27],[24,26],[26,28]];
function runDetection(generation){
  const v=$('video'),cv=$('overlay'),c=cv.getContext('2d');let last=-1,lastPose=null,nextFrameAt=0,videoShape='';
  const tick=ts=>{
    if(!camOn||generation!==camGeneration)return;
    try{if(v.currentTime!==last&&v.videoWidth&&ts>=nextFrameAt){
      nextFrameAt=ts+65;last=v.currentTime;
      const shape=`${v.videoWidth}x${v.videoHeight}`;
      if(videoShape&&videoShape!==shape){tracker.reset();cameraGuide.cancel();cameraGuide.summary();lastPose=null;}
      videoShape=shape;
      if(cv.width!==v.videoWidth||cv.height!==v.videoHeight){cv.width=v.videoWidth;cv.height=v.videoHeight;}
      const lm=landmarker.detectForVideo(v,performance.now()).landmarks?.[0];c.clearRect(0,0,cv.width,cv.height);
      if(lm){const css=getComputedStyle(document.documentElement);c.strokeStyle=css.getPropertyValue('--accent').trim();c.lineWidth=4;for(const [a,b] of BONES){if(!lm[a]||!lm[b]||(lm[a].visibility??0)<.65||(lm[b].visibility??0)<.65)continue;c.beginPath();c.moveTo(lm[a].x*cv.width,lm[a].y*cv.height);c.lineTo(lm[b].x*cv.width,lm[b].y*cv.height);c.stroke();}}
      const measurement=measurePose(lm,cv.width,cv.height,cameraContext().kind,lastPose?.side);
      $('trackingQuality').textContent=measurement.valid?'Buen encuadre · detección activa':'Ajusta el encuadre · conteo detenido';
      if(!measurement.valid){tracker.reset();lastPose=null;$('camHint').textContent=measurement.message;}
      else{
        if(poseChanged(lastPose,measurement))tracker.reset();lastPose=measurement;
        if(!cameraGuide.active){
          const p=cameraGuide.profile();tracker.depth=p?.down??(exercise.kind==='pushups'?100:settings.depth);tracker.up=p?.up??155;
          if(tracker.update(measurement.angle,performance.now()))addRep(1,true);
          $('camHint').textContent=tracker.reason==='fast'?'Ve un poco más despacio: ese ciclo fue demasiado corto.':tracker.phase==='ready'?`Extiende ${exercise.kind==='pushups'?'los brazos':'las piernas'} para empezar.`:tracker.phase==='down'?'Ahora vuelve a extender para completar la repetición.':`${exercise.kind==='pushups'?'Flexiona los codos':'Baja a tu ritmo'} y vuelve a subir.`;
        }
      }
      if(cameraGuide.active){cameraGuide.feed(measurement,performance.now());$('camHint').textContent=measurement.valid?'Calibración en curso · sigue las instrucciones.':measurement.message;}
    }}catch{stopCamera();$('camHint').textContent='La detección se ha detenido. Tus repeticiones se conservan; puedes continuar a mano.';return;}
    camRaf=requestAnimationFrame(tick);
  };camRaf=requestAnimationFrame(tick);
}
const rt={r:null,id:null,i:0,left:0,elapsedMs:0,paused:false,timerPaused:false,lastAt:0,ts:0,spoken:false,lastSaved:0};
function allRoutines(){return [...customRoutines,...ROUTINES];}
function renderRoutinePicker(){
  pendingRoutine=null;$('routineFit').hidden=true;
  $('routineList').innerHTML=allRoutines().map(r=>{
    const custom=r.id.startsWith('custom-');
    return `<div class="routine-item"><button class="routine" data-id="${esc(r.id)}"><span><strong>${esc(r.name)}</strong><small>${custom?'Tu rutina':esc(r.why)} · ${r.steps.length} pasos</small></span><span class="label">${fmt(routineTotal(r))} ↗</span></button><div class="routine-item-actions">${custom?`<button class="sm ghost" data-routine-action="edit" data-routine="${esc(r.id)}" aria-label="Editar ${esc(r.name)}">Editar</button>`:''}<button class="sm ghost" data-routine-action="copy" data-routine="${esc(r.id)}" aria-label="Copiar ${esc(r.name)}">${custom?'Duplicar':'Personalizar copia'}</button>${custom?`<button class="sm ghost" data-routine-action="delete" data-routine="${esc(r.id)}" aria-label="Eliminar ${esc(r.name)}">Eliminar</button>`:''}</div></div>`;
  }).join('');
}
function requestRoutine(r){
  if(!r)return;
  if(timer.mode==='break'&&routineTotal(r)>remaining()+1){
    pendingRoutine=r;$('routineFitMessage').textContent=`${r.name} dura ${fmt(routineTotal(r))} y quedan ${fmt(remaining())} de pausa.`;$('routineFit').hidden=false;$('routineFit').scrollIntoView({block:'nearest'});$('extendRoutineBreak').focus({preventScroll:true});return;
  }
  startRoutine(r);
}
$('extendRoutineBreak').onclick=()=>{
  const r=pendingRoutine;if(!r)return;pendingRoutine=null;
  const duration=routineTotal(r);timer.total=timer.remaining=duration;timer.running=false;startTimer();startRoutine(r);toast(`Pausa ajustada a ${fmt(duration)}`);
};
$('fitRoutineRemaining').onclick=()=>{const r=pendingRoutine;if(r){pendingRoutine=null;startRoutine(r);}};
const routineEditor=initRoutineEditor({store,uid,toast,getRoutines:()=>customRoutines,
  saveRoutines:routines=>{if(!store.set('ps.routines',routines))return false;customRoutines=routines;return true;},
  onChange:renderRoutinePicker
});
$('createRoutine').onclick=()=>routineEditor.open();
$('routineList').onclick=e=>{
  const action=e.target.closest('[data-routine-action]');
  if(action){const r=allRoutines().find(r=>r.id===action.dataset.routine);if(!r)return;if(action.dataset.routineAction==='delete')routineEditor.remove(r);else routineEditor.open(r,action.dataset.routineAction==='copy');return;}
  const b=e.target.closest('[data-id]');if(b)requestRoutine(allRoutines().find(r=>r.id===b.dataset.id));
};
function routineEntry(partial=true){const seconds=Math.floor(rt.elapsedMs/1000);return rt.r&&seconds>0?{id:rt.id,ts:rt.ts,type:'Estiramiento',detail:rt.r.name,durationSec:seconds,source:'routine',partial}:null;}
function persistRoutine(){const e=routineEntry();if(e)store.set('ps.routine',e);}
function startRoutine(r){if(!r)return;r={...r,steps:r.steps.map(step=>[...step])};stopRoutine();Object.assign(rt,{r,id:uid(),i:0,left:r.steps[0][1],elapsedMs:0,paused:!timer.running,timerPaused:!timer.running,lastAt:Date.now(),ts:Date.now(),spoken:false,lastSaved:0});$('routineFit').hidden=true;$('routinePicker').hidden=true;$('player').hidden=false;stretchDemoStop=animate($('stretchDemo'),()=>rt.r?MOVES[rt.r.steps[rt.i][0]]:null);keepAwake(!rt.paused);speakStep();renderStep();}
function speakStep(){const m=MOVES[rt.r.steps[rt.i][0]];if(!rt.paused){beep(740,100,1);say(`${m.name}. ${m.cue}`);}}
function tickRoutine(now=Date.now()){
  if(!rt.r)return;
  const delta=Math.max(0,now-rt.lastAt);rt.lastAt=now;if(rt.paused)return;
  const spent=Math.min(delta,rt.left*1000);rt.elapsedMs+=spent;rt.left=Math.max(0,rt.left-spent/1000);
  if(Math.floor(rt.elapsedMs/1000)!==rt.lastSaved){persistRoutine();rt.lastSaved=Math.floor(rt.elapsedMs/1000);}
  if(rt.left<=3&&!rt.spoken){rt.spoken=true;say('Tres, dos, uno');}
  if(rt.left<=0){if(rt.i<rt.r.steps.length-1){rt.i++;rt.left=rt.r.steps[rt.i][1];rt.spoken=false;speakStep();}else{finishRoutine(false);return;}}
  renderStep();
}
function renderStep(){if(!rt.r)return;const m=MOVES[rt.r.steps[rt.i][0]];const state=`${rt.id}:${rt.i}:${rt.paused}`;if(rt.lastAnnouncement!==state){rt.lastAnnouncement=state;announce(`${m.name}. Paso ${rt.i+1} de ${rt.r.steps.length}.${rt.paused?' Rutina en pausa.':''}`);}$('stepIdx').textContent=`${rt.r.name} · ${rt.i+1} de ${rt.r.steps.length}`;$('stepName').textContent=m.name;$('stepCue').textContent=m.cue;$('stepTime').textContent=fmt(rt.left);$('stepBars').innerHTML=rt.r.steps.map((_,j)=>`<i class="${j<rt.i?'done':j===rt.i?'now':''}"></i>`).join('');$('playPause').textContent=rt.paused?'Continuar rutina':'Pausar rutina';$('prevStep').disabled=rt.i===0;$('nextStep').textContent=rt.i===rt.r.steps.length-1?'Terminar →':'Siguiente →';$('routineStatus').textContent=rt.paused?'Rutina en pausa. Solo se registra el tiempo activo.':`Tiempo activo: ${fmt(Math.floor(rt.elapsedMs/1000))}. Se guarda al terminar o cambiar de actividad.`;}
function stopRoutine(save=true){
  if(!rt.r)return '';const entry=routineEntry();if(save&&entry){if(upsert(entry))store.remove('ps.routine');}
  rt.r=null;stretchDemoStop?.();stretchDemoStop=null;try{speechSynthesis.cancel();}catch{}keepAwake(camOn);return entry?`${fmt(entry.durationSec)} de estiramiento`:'';
}
function finishRoutine(partial=true){const e=routineEntry(partial),name=rt.r?.name;if(e){if(upsert(e))store.remove('ps.routine');}stopRoutine(false);say(partial?'Rutina guardada.':'Rutina completa. Disfruta de la pausa.');showView('rest');$('restDone').textContent=e?`${name} · ${fmt(e.durationSec)}`:'Rutina terminada';toast(e?'Tiempo activo guardado':'No hubo tiempo activo que guardar');announce(e?'Rutina guardada':'Rutina terminada');}
$('playPause').onclick=()=>{tickRoutine();if(!rt.r)return;const resume=rt.paused;if(resume&&timer.mode==='break'&&!timer.running)startTimer();rt.paused=!resume;rt.timerPaused=false;rt.lastAt=Date.now();renderStep();keepAwake(!rt.paused);if(rt.paused)try{speechSynthesis.cancel();}catch{}};
function navigateStep(direction){tickRoutine();if(!rt.r)return;const next=rt.i+direction;if(next>=rt.r.steps.length){finishRoutine();return;}if(next<0)return;rt.i=next;rt.left=rt.r.steps[next][1];rt.lastAt=Date.now();rt.spoken=false;speakStep();renderStep();}
$('prevStep').onclick=()=>navigateStep(-1);$('nextStep').onclick=()=>navigateStep(1);$('finishStretch').onclick=()=>{tickRoutine();if(rt.r)finishRoutine();};
function settleActivity(at=Date.now()){
  tickRoutine(at);const exerciseLabel=saveExercise(),stretchLabel=stopRoutine();stopCamera();demoStop?.();demoStop=null;exercise=null;renderReps();return exerciseLabel||stretchLabel;
}
let renderedDay='';
function renderStats(){
  renderedDay=dayKey();const s=summarize(log);$('todayDate').textContent=new Date().toLocaleDateString('es',{day:'numeric',month:'short'});$('sToday').textContent=s.squats;$('sGoal').textContent=settings.dailyGoal;$('sPushups').textContent=s.pushups;$('sStretch').textContent=s.stretchSec>0&&s.stretchSec<60?'<1':Math.floor(s.stretchSec/60);$('sStretch').title=`${s.stretchSec} segundos activos`;$('sStreak').textContent=s.streak;
  $('goalBar').style.width=`${Math.min(100,s.squats/settings.dailyGoal*100)}%`;$('goalProgress').setAttribute('aria-valuemax',settings.dailyGoal);$('goalProgress').setAttribute('aria-valuenow',Math.min(s.squats,settings.dailyGoal));$('goalProgress').setAttribute('aria-valuetext',`${s.squats} de ${settings.dailyGoal} sentadillas`);
  $('sPushupGoal').textContent=settings.dailyPushupGoal;$('pushupGoalBar').style.width=`${Math.min(100,s.pushups/settings.dailyPushupGoal*100)}%`;$('pushupGoalProgress').setAttribute('aria-valuemax',settings.dailyPushupGoal);$('pushupGoalProgress').setAttribute('aria-valuenow',Math.min(s.pushups,settings.dailyPushupGoal));$('pushupGoalProgress').setAttribute('aria-valuetext',`${s.pushups} de ${settings.dailyPushupGoal} flexiones`);$('pushupGoalMessage').textContent=s.pushups>=settings.dailyPushupGoal?'Meta de flexiones cumplida. ¡Buen trabajo!':s.pushups?`Te quedan ${settings.dailyPushupGoal-s.pushups} para tu meta.`:'Cada flexión suma.';
  $('goalMessage').textContent=s.squats>=settings.dailyGoal?'Meta de hoy cumplida. Disfruta de tu ritmo.':s.squats?`Te quedan ${settings.dailyGoal-s.squats} para tu meta.`:'Cada pausa suma.';
  const max=Math.max(1,...s.week.map(w=>w.reps));$('chart').innerHTML=s.week.map((w,i)=>`<div class="col-b" title="${esc(new Date(w.ts).toLocaleDateString('es'))}: ${w.reps} repeticiones"><em>${w.reps||''}</em><div class="b ${i===6?'today':''}" style="height:${w.reps/max*75}px"></div><small>${i===6?'Hoy':esc(new Date(w.ts).toLocaleDateString('es',{weekday:'narrow'}))}</small></div>`).join('');$('chart').setAttribute('aria-label',s.week.map(w=>`${new Date(w.ts).toLocaleDateString('es',{weekday:'long',day:'numeric'})}: ${w.reps} repeticiones`).join(', '));
}
let historyLimit=8;
function renderHistory(){
  $('historyCount').textContent=`${log.filter(e=>!e.example).length} registros`;$('exampleNote').hidden=!log.some(e=>e.example);$('clearExamples').hidden=!log.some(e=>e.example);$('showMore').hidden=log.length<=historyLimit;
  $('log').innerHTML=log.length?log.slice(0,historyLimit).map(e=>{
    const today=dayKey(e.ts)===dayKey(),when=new Date(e.ts).toLocaleString('es',{...(today?{}:{day:'numeric',month:'short'}),hour:'2-digit',minute:'2-digit'});
    const what=e.reps!=null?`${e.reps} ${e.type.toLowerCase()}`:`${e.type} · ${fmt(e.durationSec)}`;
    const source={camera:'cámara',manual:'manual',mixed:'mixto',routine:'rutina'}[e.source]||'manual';
    const meta=[today?`Hoy, ${when}`:when,e.detail,e.partial?'parcial':'',e.target?`objetivo ${e.target}`:''].filter(Boolean).map(esc).join(' · ');
    return `<li data-id="${esc(e.id)}"><span class="what">${esc(what)}<span class="chip">${source}</span>${e.example?'<span class="chip">ejemplo</span>':''}</span><span class="meta">${meta}</span><span class="acts">${e.reps!=null?'<button class="sm ghost" data-act="edit" aria-label="Corregir repeticiones">Editar</button>':''}<button class="sm ghost" data-act="delete" aria-label="Borrar registro">×</button></span></li>`;
  }).join(''):'<li class="empty"><strong>Tu primera pausa empieza aquí.</strong>Elige una actividad o anota un ejercicio.<br>Tu progreso aparecerá en este espacio.</li>';
}
$('showMore').onclick=()=>{historyLimit+=20;renderHistory();};
$('log').onclick=e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const li=b.closest('li'),entry=log.find(x=>x.id===li.dataset.id);if(!entry)return;
  if(b.dataset.act==='delete'){log=log.filter(x=>x.id!==entry.id);saveLog();toast('Registro eliminado',()=>{upsert(entry);});return;}
  if(li.querySelector('form'))return;
  const form=document.createElement('form');form.className='row';const inputId=`edit-${uid()}`;
  form.innerHTML=`<label class="micro" for="${inputId}">Total</label><input id="${inputId}" type="number" min="0" max="100000" value="${entry.reps}" required><button class="sm sage" type="submit">Guardar</button><button class="sm ghost" type="button">Cancelar</button>`;
  form.querySelector('[type="button"]').onclick=()=>form.remove();form.onsubmit=ev=>{ev.preventDefault();if(!form.reportValidity())return;entry.reps=Number(form.querySelector('input').value);delete entry.example;saveLog();toast('Registro actualizado');};li.append(form);form.querySelector('input').focus();
};
$('mType').onchange=()=>{$('manualUnit').textContent=$('mType').value==='Plancha'?'Segundos':'Repeticiones';};
$('manualForm').onsubmit=e=>{e.preventDefault();if(!$('manualForm').reportValidity())return;const n=Number($('mReps').value),type=$('mType').value;upsert({id:uid(),ts:Date.now(),type,source:'manual',...(type==='Plancha'?{durationSec:n}:{reps:n})});toast('Ejercicio guardado');};
$('clearExamples').onclick=()=>{log=log.filter(e=>!e.example);saveLog();toast('Ejemplos eliminados');};
$('exportBtn').onclick=()=>{
  persistExercise();persistRoutine();const backupLog=[...log];for(const draft of [exerciseEntry(),routineEntry()])if(draft){const i=backupLog.findIndex(e=>e.id===draft.id);if(i>=0)backupLog[i]=draft;else backupLog.push(draft);}
  const data={app:'pomodoro-squats',version:3,routines:customRoutines,exported:new Date().toISOString(),settings,pomos,focusMinutes,log:backupLog};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`pomodoro-squats-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('backupStatus').textContent='Respaldo exportado con tu historial y el movimiento pendiente.';
};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async()=>{
  const file=$('importFile').files[0];if(!file)return;
  try{if(file.size>10*1024*1024)throw Error('too-large');const d=parseBackup(JSON.parse(await file.text()));const ids=new Set(log.map(e=>e.id)),fresh=d.log.filter(e=>!ids.has(e.id));const routineIds=new Set(customRoutines.map(r=>r.id)),newRoutines=d.routines.filter(r=>!routineIds.has(r.id));if(customRoutines.length+newRoutines.length>ROUTINE_LIMIT)throw Error('too-many-routines');if(newRoutines.length){if(!store.set('ps.routines',[...customRoutines,...newRoutines]))throw Error('storage');customRoutines.push(...newRoutines);renderRoutinePicker();}log=cleanLog([...log,...fresh]);for(const [k,v] of Object.entries(d.pomos))pomos[k]=Math.max(pomos[k]||0,v);for(const [k,v] of Object.entries(d.focusMinutes))focusMinutes[k]=Math.max(focusMinutes[k]||0,v);store.set('ps.pomos',pomos);store.set('ps.focusMinutes',focusMinutes);saveLog();renderTimer();$('backupStatus').textContent=`Importados ${fresh.length} registros y ${newRoutines.length} rutinas nuevas. Tus ajustes y metas se conservan.`;toast(`Importados ${fresh.length} registros y ${newRoutines.length} rutinas`);}catch{$('backupStatus').textContent='No se importó ningún dato. El archivo debe ser un respaldo válido de Pomodoro Squats, de hasta 10 MB.';toast('No se pudo importar. Revisa el archivo.');}finally{$('importFile').value='';}
};
document.addEventListener('keydown',e=>{
  if(e.repeat||e.target.closest?.('input,select,textarea,button,a,summary,[contenteditable="true"]')||e.metaKey||e.ctrlKey||e.altKey||$('settingsDialog').open||$('routineEditor').open||$('helpDialog').open||cameraGuide.active)return;
  if(e.code==='Space'){e.preventDefault();$('startBtn').click();}
  else if(e.key.toLowerCase()==='b'){$('breakNowBtn').click();}
  else if(view==='exercise'&&['+','=','ArrowUp'].includes(e.key)){e.preventDefault();addRep();}
  else if(view==='exercise'&&['-','ArrowDown'].includes(e.key)){e.preventDefault();addRep(-1);}
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){tickRoutine();if(rt.r&&!rt.paused){rt.paused=true;rt.timerPaused=false;renderStep();}if(camOn||camLoading){stopCamera();$('camHint').textContent='La cámara se apagó al salir de la app. Puedes activarla para continuar.';}keepAwake(false);persistExercise();persistRoutine();try{speechSynthesis.cancel();}catch{}}
  else{updateTimer();if(rt.r){$('routineStatus').textContent='La rutina se pausó al salir de la app. Pulsa Continuar rutina cuando estés listo.';}keepAwake(camOn||!!rt.r&&!rt.paused);renderStats();}
});
window.addEventListener('pagehide',()=>{tickRoutine();persistExercise();persistRoutine();stopCamera();});
let recovered=0;
for(const key of ['ps.exercise','ps.routine']){
  const draft=cleanEntry(store.get(key,null));
  if(draft){if(upsert(draft)){store.remove(key);recovered++;}}else store.remove(key);
}
if(recovered){$('recoveryNote').textContent='Hemos recuperado el movimiento pendiente de tu última sesión.';$('recoveryNote').hidden=false;}

renderRoutinePicker();applyTheme();populateSettings();renderChoices();renderTimer();renderReps();renderStats();renderHistory();showView('choose');
if(timer.mode==='break')$('chooseHint').textContent='Tu pausa sigue en marcha. Elige cómo quieres moverte.';
setInterval(()=>{updateTimer();tickRoutine();},250);
initCompanion({store,toast,
  hasSession:()=>timer.running||log.some(e=>!e.example),
  startTrial:()=>{if(timer.running||timer.remaining<timer.total){toast('Termina o reinicia el bloque actual antes de probar.');return;}beginBreak(false,60);$('breakCard').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('breakCard').focus({preventScroll:true});},
  beforeUpdate:()=>{settleActivity();const saved=store.set('ps.log',log);return saveTimer()&&saved;}
});
