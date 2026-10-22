import {cameraSelect,cameraClick} from './ui-helpers.mjs';
import {poseFixture} from './pose-fixtures.mjs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true});
const url=process.env.APP_URL||'http://127.0.0.1:5181';
try {
  const offline=await browser.newContext();
  const page=await offline.newPage();
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto(url);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;await caches.open('unrelated-app-cache');});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.reload();
  await offline.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#pickPushups').click();await page.locator('#plusFive').click();await page.locator('#saveExercise').click();
  assert.equal(await page.locator('#sPushups').innerText(),'5');
  assert.equal(await page.evaluate(async()=>(await caches.keys()).includes('unrelated-app-cache')),true);
  console.log('Offline shell, manual exercise saving, and cache isolation passed.');
  await offline.close();

  const camera=await browser.newContext({serviceWorkers:'block'});
  const cp=await camera.newPage();const errors=[];cp.on('pageerror',e=>errors.push(e.message));
  await cp.route('https://fonts.googleapis.com/**',r=>r.abort());
  let modelRequested,resolveModel;
  const requested=new Promise(resolve=>modelRequested=resolve);
  const gate=new Promise(resolve=>resolveModel=resolve);
  await cp.route('**/vision_bundle.mjs',async route=>{modelRequested();await gate;await route.fulfill({status:200,headers:{'content-type':'text/javascript','access-control-allow-origin':'*'},body:`export const FilesetResolver={forVisionTasks:async()=>({})};export const PoseLandmarker={createFromOptions:async()=>({detectForVideo:()=>({landmarks:globalThis.syntheticPose?[globalThis.syntheticPose]:[]})})};`});});
  await cp.goto(url);
  await cp.evaluate(()=>{
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');ctx.fillRect(0,0,640,480);window.mockStream=canvas.captureStream(30);window.mockDraw=setInterval(()=>ctx.fillRect(0,0,640,480),30);return window.mockStream;}});
  });
  await cp.locator('#pickSquats').click();await cp.locator('#camBtn').click();await requested;
  await cp.locator('#backToChoices').click();resolveModel();
  await cp.waitForFunction(()=>window.mockStream.getTracks().every(t=>t.readyState==='ended'));
  assert.equal(await cp.locator('#video').isVisible(),false);
  await cp.locator('#pickSquats').click();await cp.locator('#camBtn').click();await cp.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');
  const pose=async(angle,push=false)=>cp.evaluate(lm=>{window.syntheticPose=lm;},poseFixture(angle,push?'pushups-wall':'squats'));
  await pose(175);await cp.waitForTimeout(450);await pose(80);await cp.waitForTimeout(700);await pose(175);await cp.waitForFunction(()=>document.getElementById('repCount').textContent==='1');
  await cp.locator('#saveExercise').click();let logs=await cp.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')));assert.equal(logs[0].source,'camera');assert.equal(logs[0].reps,1);
  await cp.locator('#restFocus').click();await cp.locator('#pickPushups').click();await cameraSelect(cp,'pushupStyle','wall');await cp.locator('#camBtn').click();await cp.waitForFunction(()=>document.getElementById('camBtn').textContent==='Apagar cámara');
  await pose(175,true);await cp.waitForTimeout(450);await pose(80,true);await cp.waitForTimeout(700);await pose(175,true);await cp.waitForFunction(()=>document.getElementById('repCount').textContent==='1');
  await cp.locator('#saveExercise').click();logs=await cp.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')));assert.equal(logs[0].type,'Flexiones');assert.equal(logs[0].source,'camera');assert.equal(logs[0].detail,'Contra la pared');assert.deepEqual(errors,[]);
  console.log('Camera lifecycle and synthetic squat/pushup pose integration passed (not physical accuracy).');
  await camera.close();
} finally {await browser.close();}
