import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const url=process.env.APP_URL||'http://127.0.0.1:5181';
const ready=page=>page.locator('html[data-ready="true"]').waitFor();
const log=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')||'[]'));
const fail=page=>page.evaluate(()=>{window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='ps.log')throw new DOMException('full','QuotaExceededError');return window.nativeSet.call(this,key,value);};});
const recover=page=>page.evaluate(()=>Storage.prototype.setItem=window.nativeSet);
for(const [engine,device,name] of [[webkit,devices['iPhone 13'],'safari'],[chromium,devices['Pixel 7'],'chrome']]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({...device,serviceWorkers:'block',acceptDownloads:true});
  await context.route('https://fonts.googleapis.com/**',r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await ready(page);
  await page.locator('#pickSquats').click();await page.locator('#plusFive').click();
  const other=await context.newPage();await other.goto(url);await other.locator('html[data-blocked="session-busy"]').waitFor();
  assert.equal(await other.locator('#main').evaluate(el=>el.inert),true);assert.match(await other.locator('#loadMessage').innerText(),/otra pestaña/);
  await page.locator('#saveExercise').click();assert.equal((await log(page))[0].reps,5);
  await page.close();await other.locator('#retryLoad').click();await ready(other);assert.equal((await log(other))[0].reps,5);
  await other.locator('#pickSquats').click();await other.locator('#plusRep').click();await other.locator('#saveExercise').click();await other.reload();await ready(other);
  assert.equal((await log(other)).reduce((n,e)=>n+e.reps,0),6);await other.goto('about:blank');await other.goBack();await ready(other);assert.equal((await log(other)).reduce((n,e)=>n+e.reps,0),6);await context.close();
  // Saving failures retain the active exercise, its recovery draft and export.
  const c=await browser.newContext({...device,serviceWorkers:'block',acceptDownloads:true});await c.route('https://fonts.googleapis.com/**',r=>r.abort());const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:new Date('2026-10-22T12:00:00Z')});await p.goto(url);await ready(p);await p.locator('#pickSquats').click();
  for(const viewport of [{width:390,height:664},{width:320,height:700},{width:844,height:390}]){
   await p.setViewportSize(viewport);await p.evaluate(()=>scrollTo(0,0));
   const bounds=await p.locator('#saveExercise').boundingBox();assert.ok(bounds.y+bounds.height<=viewport.height,`${name} save visible ${viewport.width}: ${JSON.stringify(bounds)}`);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await p.locator('#exercisePause').click();assert.equal(await p.locator('#exercisePause').innerText(),'Continuar');await p.locator('#exercisePause').click();
  await p.locator('#openCameraSettings').click();assert.equal(await p.locator('#closeCameraSettings').evaluate(el=>el===document.activeElement),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#cameraSettingsDialog').isVisible(),false);
  await p.locator('#plusFive').click();await fail(p);await p.locator('#saveExercise').click();assert.equal(await p.locator('#vExercise').isVisible(),true);assert.equal(await p.locator('#saveFailure').isVisible(),true);assert.equal(await p.locator('#repCount').innerText(),'5');assert.equal((await log(p)).length,0);
  await p.locator('#backToChoices').click();assert.equal(await p.locator('#vExercise').isVisible(),true);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ps.exercise')).reps),5);
  const downloadPromise=p.waitForEvent('download');await p.locator('#exportPending').click();const download=await downloadPromise;let bytes='';for await(const chunk of await download.createReadStream())bytes+=chunk;assert.equal(JSON.parse(bytes).log[0].reps,5);
  await recover(p);await p.locator('#retrySave').click();assert.equal(await p.locator('#vRest').isVisible(),true);assert.equal(await p.locator('#saveFailure').isVisible(),false);assert.equal((await log(p)).length,1);
  // Failed recovery must prevent a new activity from overwriting the old draft.
  await p.locator('#restFocus').click();await p.locator('#pickSquats').click();await p.locator('#plusRep').click();
  await p.addInitScript(()=>{window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='ps.log')throw Error('full');return window.nativeSet.call(this,key,value);};});
  await p.reload();await ready(p);await p.locator('#pickPushups').click();assert.equal(await p.locator('#vChoose').isVisible(),true);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ps.exercise')).reps),1);
  await recover(p);await p.locator('#retrySave').click();assert.equal((await log(p)).reduce((n,e)=>n+e.reps,0),6);
  // Routine completion failures preserve elapsed time and completion status.
  await p.locator('#pickStretch').click();await p.locator('[data-id="quick"]').click();await p.locator('#playPause').click();await fail(p);for(const seconds of [20,10,10,20])await p.clock.fastForward(seconds*1000);
  assert.equal(await p.locator('#player').isVisible(),true);assert.equal(await p.locator('#saveFailure').isVisible(),true);await recover(p);await p.locator('#retrySave').click();const stretch=(await log(p)).find(e=>e.type==='Estiramiento');assert.equal(stretch.durationSec,60);assert.equal(stretch.partial,false);
  // Opening another editor requires an explicit choice and never replaces a pending draft.
  await p.locator('#restStretch').click();await p.locator('#createRoutine').click();await p.locator('#routineName').fill('Mi borrador');await p.locator('#routineSeconds-0').fill('17');await p.locator('#closeRoutineEditor').click();const draft=await p.evaluate(()=>localStorage.getItem('ps.routineDraft'));
  await p.locator('#createRoutine').click();await p.locator('#cancelDraftChoice').click();assert.equal(await p.evaluate(()=>localStorage.getItem('ps.routineDraft')),draft);
  await p.locator('[data-routine-action="copy"][data-routine="quick"]').click();await p.locator('#continueExistingDraft').click();assert.equal(await p.locator('#routineName').inputValue(),'Mi borrador');assert.equal(await p.locator('#routineSeconds-0').inputValue(),'17');await p.locator('#closeRoutineEditor').click();
  await p.locator('[data-routine-action="copy"][data-routine="quick"]').click();await p.locator('#replaceExistingDraft').click();assert.match(await p.locator('#routineName').inputValue(),/copia/);await p.locator('#discardRoutineDraft').click();
  assert.deepEqual(errors,[]);await c.close();
  // Unsupported locking never enables a second writer.
  const unsupported=await browser.newPage({...device,serviceWorkers:'block'});await unsupported.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));await unsupported.goto(url);await unsupported.locator('html[data-blocked="session-unsupported"]').waitFor();assert.equal(await unsupported.locator('#main').evaluate(el=>el.inert),true);
  console.log(`${name}: exclusive tabs, recovery, failed writes/export/retry, completed routines, protected drafts and dedicated mobile controls passed.`);
 }finally{await browser.close();}
}
