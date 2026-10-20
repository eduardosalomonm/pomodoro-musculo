import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const outputDir=process.env.OUTPUT_DIR||join(tmpdir(),'pomodoro-squats-checks');
await mkdir(outputDir,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true});
const url=process.env.APP_URL||'http://127.0.0.1:5181';
const context=await browser.newContext({viewport:{width:1440,height:1100},timezoneId:'Europe/Madrid',serviceWorkers:'block'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.abort());
await page.clock.install({time:new Date('2026-10-21T12:00:00+02:00')});
await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();
await page.screenshot({path:join(outputDir,'desktop.png'),fullPage:true});
assert.deepEqual(errors,[],'clean first load');
await page.locator('#pickPushups').click();await page.locator('#plusFive').click();await page.locator('#plusRep').click();
await page.locator('#backToChoices').click();assert.match(await page.locator('#log').innerText(),/6 flexiones/);
assert.equal(await page.locator('#sPushups').innerText(),'6');
await page.locator('#pickSquats').click();await page.locator('#plusFive').click();await page.locator('#resetBtn').click();assert.equal(await page.locator('#sToday').innerText(),'5');
await page.locator('#pickSquats').click();await page.locator('#plusFive').click();await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.locator('#sToday').innerText(),'10');assert.deepEqual(errors,[],'draft recovery');
await page.screenshot({path:join(outputDir,'activity.png'),fullPage:true});
await page.locator('#resetBtn').click();await page.locator('#settingsBtn').click();await page.locator('#focusMin').fill('1');await page.locator('#focusMin').dispatchEvent('change');await page.locator('#breakMin').fill('1');await page.locator('#breakMin').dispatchEvent('change');await page.locator('.dialog-done').click();
await page.locator('#startBtn').click();await page.clock.fastForward(61000);assert.match(await page.locator('#focusCount').innerText(),/1 bloque hoy/);assert.match(await page.locator('#focusMinutes').innerText(),/1 min/);
await page.locator('#pickSquats').click();await page.locator('#plusFive').click();await page.clock.fastForward(61000);assert.equal(await page.locator('#sToday').innerText(),'15');
await page.locator('#pickStretch').click();await page.locator('[data-id="quick"]').click();await page.clock.fastForward(5000);await page.locator('#playPause').click();await page.clock.fastForward(20000);await page.locator('#playPause').click();await page.clock.fastForward(3000);await page.locator('#finishStretch').click();
let logs=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')));const stretch=logs.find(e=>e.type==='Estiramiento');assert.ok(stretch.durationSec>=7&&stretch.durationSec<=9,`active seconds: ${stretch.durationSec}`);
await page.setViewportSize({width:390,height:844});await page.locator('#resetBtn').click();await page.clock.fastForward(4000);await page.screenshot({path:join(outputDir,'mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow');
await page.locator('#pickPushups').click();await page.screenshot({path:join(outputDir,'mobile-exercise.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'exercise overflow');
await page.locator('#settingsBtn').click();await page.screenshot({path:join(outputDir,'mobile-settings.png'),fullPage:true});await page.locator('.dialog-done').click();

// Keyboard Space on a focused button must not trigger the global timer shortcut.
await page.locator('#plusRep').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#repCount').innerText(),'1');assert.match(await page.locator('#startBtn').innerText(),/Pausar/);
await page.locator('#backToChoices').click();
// Slow camera permission must not reopen a stream after leaving the activity.
await page.evaluate(()=>{window.cameraStopped=0;window.cameraRequested=false;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:()=>{window.cameraRequested=true;return new Promise(resolve=>{window.finishCameraRequest=()=>resolve({getTracks:()=>[{stop:()=>window.cameraStopped++}]});});}});});
await page.locator('#pickPushups').click();await page.locator('#camBtn').click();await page.waitForFunction(()=>window.cameraRequested);await page.locator('#backToChoices').click();await page.evaluate(()=>window.finishCameraRequest());await page.waitForFunction(()=>window.cameraStopped>0);assert.equal(await page.locator('#video').isVisible(),false);
// Import merges duplicate IDs, escapes content, and fails atomically on malformed entries.
await page.locator('.backup-details summary').click();
const payload={app:'pomodoro-squats',version:2,log:[{id:'quoted-"-id',ts:new Date('2026-10-21T12:00:00+02:00').getTime(),type:'Flexiones',reps:9,source:'manual',detail:'<img src=x onerror=alert(1)>'}]};
const upload=async data=>page.locator('#importFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
await upload(payload);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ps.log')).some(e=>e.id==='quoted-"-id'));
const countBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).length);await upload(payload);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).length),countBefore);
assert.equal(await page.locator('#log img').count(),0);assert.match(await page.locator('#log').innerText(),/<img src=x/);
await upload({...payload,log:[{...payload.log[0],id:'bad',reps:-5}]});await page.waitForFunction(()=>document.getElementById('backupStatus').textContent.includes('No se importó'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).length),countBefore);
// Dark mode and small-screen layouts.
await page.locator('#settingsBtn').click();await page.locator('#theme').selectOption('dark');await page.locator('.dialog-done').click();await page.screenshot({path:join(outputDir,'dark-mobile.png'),fullPage:true});
for(const width of [320,768,1024]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);}
// Break paused through the main timer can resume a routine without counting the pause.
await page.locator('#resetBtn').click();await page.locator('#pickStretch').click();await page.locator('[data-id="quick"]').click();await page.clock.fastForward(4000);await page.locator('#startBtn').click();await page.clock.fastForward(15000);await page.locator('#playPause').click();assert.match(await page.locator('#playPause').innerText(),/Pausar rutina/);await page.clock.fastForward(2000);await page.locator('#finishStretch').click();
const finalLogs=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')));const lastStretch=finalLogs.filter(e=>e.type==='Estiramiento').sort((a,b)=>b.ts-a.ts)[0];assert.ok(lastStretch.durationSec>=5&&lastStretch.durationSec<=7,`resume time ${lastStretch.durationSec}`);
// A routine that finishes naturally is marked complete and saved exactly once.
await page.locator('#resetBtn').click();await page.locator('#settingsBtn').click();await page.locator('#breakMin').fill('3');await page.locator('#breakMin').dispatchEvent('change');await page.locator('.dialog-done').click();await page.locator('#pickStretch').click();await page.locator('[data-id="quick"]').click();for(const seconds of [20,10,10,20])await page.clock.fastForward(seconds*1000);assert.equal(await page.locator('#vRest').isVisible(),true);
const completed=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).filter(e=>e.type==='Estiramiento'&&!e.partial));assert.equal(completed.length,1);assert.equal(completed[0].durationSec,60);

assert.deepEqual(errors,[],'no browser exceptions');
console.log('Browser flows passed: draft recovery, exercise switching, end of break, focus statistics, routine active time, mobile layouts.');
await browser.close();
