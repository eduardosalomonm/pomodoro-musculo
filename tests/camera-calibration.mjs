import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {poseFixture} from './pose-fixtures.mjs';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const url=process.env.APP_URL||'http://127.0.0.1:5181',output=process.env.OUTPUT_DIR||join(tmpdir(),'pomodoro-squats-checks');await mkdir(output,{recursive:true});
for(const [engine,device,name] of [[webkit,devices['iPhone 13'],'safari-calibration'],[chromium,devices['Pixel 7'],'android-calibration']]){
  const browser=await engine.launch();
  try{
    const page=await browser.newPage({...device,serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.route('**/vision_bundle.mjs',route=>route.fulfill({status:200,headers:{'content-type':'text/javascript','access-control-allow-origin':'*'},body:`export const FilesetResolver={forVisionTasks:async()=>({})};export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:globalThis.syntheticPose?[globalThis.syntheticPose]:[]})})};`}));
    await page.clock.install({time:new Date('2026-10-21T12:00:00+02:00')});await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();
    await page.evaluate(()=>{
      window.cameraStops=0;window.cameraRequests=[];
      Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{window.cameraRequests.push(options);return {getTracks:()=>[{stop:()=>window.cameraStops++}],getVideoTracks:()=>[]};}}});
      const video=document.getElementById('video');
      Object.defineProperty(video,'srcObject',{configurable:true,set(value){this.mockStream=value;},get(){return this.mockStream;}});
      Object.defineProperty(video,'play',{configurable:true,value:async()=>{}});Object.defineProperty(video,'pause',{configurable:true,value:()=>{}});
      Object.defineProperty(video,'videoWidth',{configurable:true,get:()=>640});Object.defineProperty(video,'videoHeight',{configurable:true,get:()=>480});Object.defineProperty(video,'currentTime',{configurable:true,get:()=>performance.now()/1000});
    });
    const hold=async(angle,seconds,kind)=>{await page.evaluate(lm=>window.syntheticPose=lm,angle==null?null:poseFixture(angle,kind));await page.clock.runFor(seconds*1000);};
    for(const kind of ['squats','pushups-floor','pushups-wall']){
      if(await page.locator('#vRest').isVisible())await page.locator('#restFocus').click();
      await page.locator(kind==='squats'?'#pickSquats':'#pickPushups').click();
      if(kind!=='squats')await page.locator('#pushupStyle').selectOption(kind==='pushups-wall'?'wall':'floor');
      await page.evaluate(lm=>window.syntheticPose=lm,poseFixture(170,kind));const before=await page.locator('#time').innerText();
      await page.locator('#calibrateBtn').click();await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');
      assert.equal(await page.locator('#plusRep').isDisabled(),true);await page.evaluate(()=>document.activeElement?.blur());await page.keyboard.press('+');assert.equal(await page.locator('#repCount').innerText(),'0');await hold(null,1,kind);assert.match(await page.locator('#calibrationTitle').innerText(),/Encuadre/);
      await hold(170,6,kind);assert.match(await page.locator('#calibrationTitle').innerText(),/flexionada/);await hold(100,5,kind);assert.match(await page.locator('#calibrationTitle').innerText(),/Dos repeticiones/);
      await hold(170,1,kind);for(let i=0;i<2;i++){await hold(100,1,kind);await hold(170,1,kind);}assert.equal(await page.locator('#calibrationConfirm').isVisible(),true);assert.equal(await page.locator('#repCount').innerText(),'0');assert.equal(await page.locator('#time').innerText(),before);
      await page.screenshot({path:join(output,`${name}-${kind}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('#calibrationConfirm').click();assert.equal(await page.locator('#plusRep').isDisabled(),false);assert.match(await page.locator('#cameraProfile').innerText(),/guardada/);
      await hold(170,1,kind);await hold(100,1,kind);await hold(170,1,kind);assert.equal(await page.locator('#repCount').innerText(),'1');await page.locator('#saveExercise').click();
    }
    const profiles=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.calibration')));assert.equal(Object.keys(profiles).length,3);assert.equal(await page.locator('#sToday').innerText(),'1');assert.equal(await page.locator('#sPushups').innerText(),'2');
    // Retest the saved calibration without storing practice reps, then cancel.
    await page.locator('#restFocus').click();await page.locator('#pickSquats').click();await page.locator('#camBtn').click();await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');await page.locator('#testCalibration').click();await hold(170,2,'squats');assert.match(await page.locator('#calibrationTitle').innerText(),/Dos repeticiones/);await page.locator('#cancelCalibration').click();assert.equal(await page.locator('#calibrationPanel').isVisible(),false);assert.equal(await page.locator('#repCount').innerText(),'0');
    // Rear lens is a separate context and a phone rotation cancels capture safely.
    await page.locator('#cameraFacing').selectOption('environment');await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');assert.match(await page.locator('#cameraProfile').innerText(),/Sin calibración/);assert.equal(await page.evaluate(()=>window.cameraRequests.at(-1).video.facingMode.ideal),'environment');
    await page.locator('#calibrateBtn').click();await page.setViewportSize({width:844,height:390});await page.clock.runFor(250);assert.equal(await page.locator('#calibrationPanel').isVisible(),false);assert.equal(await page.locator('#camBtn').innerText(),'Activar cámara');assert.equal(await page.locator('#startBtn').isDisabled(),false);
    // Cancelling while camera permission is still pending cannot restart it later.
    await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.finishCameraPermission=resolve);});
    await page.locator('#calibrateBtn').click();await page.locator('#cancelCalibration').click();const stops=await page.evaluate(()=>window.cameraStops);
    await page.evaluate(()=>window.finishCameraPermission({getTracks:()=>[{stop:()=>window.cameraStops++}],getVideoTracks:()=>[]}));await page.waitForFunction(before=>window.cameraStops>before,stops);assert.equal(await page.locator('#camBtn').innerText(),'Activar cámara');assert.equal(await page.locator('#calibrationPanel').isVisible(),false);
    await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('ps.calibration'))).length),3);assert.deepEqual(errors,[]);
    console.log(`${name}: guided calibration for squats, floor and wall pushups, practice isolation, saved profiles, lens separation, cancel and rotation passed (synthetic video/poses).`);
  }finally{await browser.close();}
}
