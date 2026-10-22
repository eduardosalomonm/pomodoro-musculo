import {cameraSelect,cameraClick,openCameraOptions,closeCameraOptions} from './ui-helpers.mjs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const url=process.env.APP_URL||'http://127.0.0.1:5181',output=process.env.OUTPUT_DIR||join(tmpdir(),'pomodoro-squats-checks');await mkdir(output,{recursive:true});
for(const [engine,device,name] of [[webkit,devices['iPhone 13'],'safari-wide'],[chromium,devices['Pixel 7'],'android-wide']]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({...device,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/vision_bundle.mjs',r=>r.fulfill({status:200,headers:{'content-type':'text/javascript','access-control-allow-origin':'*'},body:'export const FilesetResolver={forVisionTasks:async()=>({})};export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:[]})})};'}));
  await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();await page.locator('#pickSquats').click();await page.locator('#plusFive').click();
  await page.evaluate(()=>{
   window.requests=[];window.stops=0;window.zoomCalls=[];window.available=true;
   const devices=[{kind:'videoinput',deviceId:'front',label:'Front Camera'},{kind:'videoinput',deviceId:'back',label:'Back Camera'},{kind:'videoinput',deviceId:'ultra',label:'Back Ultra Wide Camera'}];
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{enumerateDevices:async()=>window.available?devices:[],getUserMedia:async options=>{
    window.requests.push(options);const id=options.video.deviceId?.exact||(options.video.facingMode?.ideal==='user'?'front':'back');const settings={deviceId:id,facingMode:id==='front'?'user':'environment',zoom:2};
    const track={label:devices.find(d=>d.deviceId===id).label,stop:()=>window.stops++,addEventListener:()=>{},getSettings:()=>({...settings}),getCapabilities:()=>window.available?{zoom:{min:1,max:5}}:{},applyConstraints:async c=>{window.zoomCalls.push(c);settings.zoom=c.advanced[0].zoom;}};
    return {getTracks:()=>[track],getVideoTracks:()=>[track]};
   }}});
   const video=document.getElementById('video');Object.defineProperty(video,'srcObject',{configurable:true,set(v){this.mockStream=v;},get(){return this.mockStream;}});Object.defineProperty(video,'play',{configurable:true,value:async()=>{}});Object.defineProperty(video,'pause',{configurable:true,value:()=>{}});Object.defineProperty(video,'videoWidth',{configurable:true,get:()=>640});Object.defineProperty(video,'videoHeight',{configurable:true,get:()=>480});Object.defineProperty(video,'currentTime',{configurable:true,get:()=>performance.now()/1000});
  });
  await cameraClick(page,'wideCamera');await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');
  assert.equal(await page.locator('#cameraFacing').inputValue(),'environment');assert.equal(await page.locator('#wideCamera').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#wideCameraStatus').innerText(),/Ultra gran angular seleccionado/);await openCameraOptions(page);assert.equal(await page.locator('#cameraLensLabel').isVisible(),true);await closeCameraOptions(page);
  assert.equal(await page.evaluate(()=>window.requests.at(-1).video.deviceId.exact),'ultra');assert.equal(await page.evaluate(()=>window.zoomCalls.at(-1).advanced[0].zoom),1);assert.ok(await page.evaluate(()=>window.stops>=1));assert.equal(await page.locator('#repCount').innerText(),'5');
  await page.screenshot({path:join(output,`${name}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Manual selection can override automatic lens choice, without losing repetitions.
  await cameraSelect(page,'cameraLens','back');await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');assert.equal(await page.evaluate(()=>window.requests.at(-1).video.deviceId.exact),'back');assert.match(await page.locator('#wideCameraStatus').innerText(),/Zoom al mínimo/);assert.equal(await page.locator('#repCount').innerText(),'5');
  await page.locator('#calibrateBtn').click();assert.equal(await page.locator('#wideCamera').isDisabled(),true);await page.locator('#cancelCalibration').click();assert.equal(await page.locator('#wideCamera').isDisabled(),false);
  // The normal camera path and a browser without lens/zoom controls remain usable.
  await cameraClick(page,'wideCamera');await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');assert.equal(await page.locator('#wideCamera').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>window.available=false);await cameraClick(page,'wideCamera');await page.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');assert.match(await page.locator('#wideCameraStatus').innerText(),/Safari no permite confirmar/);assert.equal(await page.locator('#cameraLensLabel').isVisible(),false);assert.equal(await page.locator('#repCount').innerText(),'5');
  // Cancellation while a permission request is outstanding closes the late stream.
  await page.locator('#camBtn').click();await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.resolveCamera=resolve);});await page.locator('#camBtn').click();assert.equal(await page.locator('#wideCamera').isDisabled(),true);await page.locator('#camBtn').click();
  const before=await page.evaluate(()=>window.stops);await page.evaluate(()=>window.resolveCamera({getTracks:()=>[{stop:()=>window.stops++}],getVideoTracks:()=>[]}));await page.waitForFunction(n=>window.stops>n,before);assert.equal(await page.locator('#camBtn').innerText(),'Activar cámara');assert.equal(await page.locator('#wideCamera').isDisabled(),false);assert.deepEqual(errors,[]);
  console.log(`${name}: ultra-wide selection, verified minimum zoom, manual lenses, fallback, preserved reps, calibration locking and pending cancellation passed.`);
 }finally{await browser.close();}
}
