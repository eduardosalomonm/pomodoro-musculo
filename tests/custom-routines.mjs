import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const url=process.env.APP_URL||'http://127.0.0.1:5181';
const output=process.env.OUTPUT_DIR||join(tmpdir(),'pomodoro-squats-checks');await mkdir(output,{recursive:true});
for(const [engine,device,name] of [[webkit,devices['iPhone 13'],'safari-custom'],[chromium,devices['Pixel 7'],'android-custom']]){
  const browser=await engine.launch();
  try{
    const page=await browser.newPage({...device,serviceWorkers:'block',timezoneId:'Europe/Madrid',acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.clock.install({time:new Date('2026-10-21T12:00:00+02:00')});await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();
    await page.locator('#editDailyGoals').click();await page.locator('#dailyPushupGoal').fill('5');await page.locator('#dailyPushupGoal').dispatchEvent('change');await page.locator('.dialog-done').click();
    await page.locator('#pickPushups').click();await page.locator('#plusFive').click();await page.locator('#saveExercise').click();assert.equal(await page.locator('#sPushups').innerText(),'5');assert.equal(await page.locator('#sPushupGoal').innerText(),'5');assert.equal(await page.locator('#pushupGoalProgress').getAttribute('aria-valuenow'),'5');assert.match(await page.locator('#pushupGoalMessage').innerText(),/cumplida/);assert.equal(await page.locator('#sToday').innerText(),'0');
    await page.locator('#restStretch').click();await page.locator('#createRoutine').click();await page.locator('#saveCustomRoutine').click();assert.equal(await page.locator('#routineEditor').isVisible(),true);assert.equal(await page.locator('#routineName').evaluate(el=>el.validity.valueMissing),true);await page.locator('#routineName').fill('Mi pausa <b>segura</b>');await page.locator('#routineSeconds-0').fill('5');await page.locator('#routineSeconds-1').fill('7');
    await page.locator('#addRoutineStep').click();await page.locator('#routineMove-2').selectOption('neckL');await page.locator('#routineSeconds-2').fill('9');await page.locator('[data-step="2"] [data-action="up"]').click();
    assert.equal(await page.locator('#routineMove-1').inputValue(),'neckL');await page.locator('[data-step="2"] [data-action="remove"]').click();assert.match(await page.locator('#routineDuration').innerText(),/0:14/);
    await page.screenshot({path:join(output,`${name}-editor.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#saveCustomRoutine').click();const customId=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routines'))[0].id);assert.equal(await page.locator('#routineList b').count(),0);assert.match(await page.locator('#routineList').innerText(),/Mi pausa <b>segura<\/b>/);
    await page.locator(`[data-id="${customId}"]`).click();await page.clock.fastForward(5000);await page.clock.fastForward(9000);assert.equal(await page.locator('#vRest').isVisible(),true);
    let log=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')));assert.equal(log.find(e=>e.type==='Estiramiento').durationSec,14);assert.equal(log.find(e=>e.type==='Estiramiento').partial,false);
    // Draft edits survive a reload without replacing the saved routine.
    await page.locator('#restStretch').click();await page.locator(`[data-routine-action="edit"][data-routine="${customId}"]`).click();await page.locator('#routineName').fill('Borrador pendiente');await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.locator('#sPushupGoal').innerText(),'5');await page.locator('#pickStretch').click();await page.locator('#resumeRoutineDraft').click();assert.equal(await page.locator('#routineName').inputValue(),'Borrador pendiente');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routines'))[0].name),'Mi pausa <b>segura</b>');await page.locator('#saveCustomRoutine').click();
    // Native controls remain usable at narrow widths and landscape sizes.
    await page.locator(`[data-routine-action="edit"][data-routine="${customId}"]`).click();for(const viewport of [{width:320,height:700},{width:844,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.locator('#routineEditor').evaluate(el=>el.scrollWidth>el.clientWidth+1),false,`${name} editor overflow ${viewport.width}`);}await page.locator('#discardRoutineDraft').click();
    // Deleting allows an actual pointer/touch undo.
    await page.locator(`[data-routine-action="delete"][data-routine="${customId}"]`).click();await page.locator('#toast button').click();assert.equal(await page.locator(`[data-id="${customId}"]`).count(),1);
    // Built-ins are copied, never changed by the editor.
    await page.locator('[data-routine-action="copy"][data-routine="quick"]').click();await page.locator('#routineName').fill('Pausa larga');await page.locator('#routineSeconds-0').fill('300');await page.locator('#saveCustomRoutine').click();
    await page.locator('#resetBtn').click();await page.locator('#settingsBtn').click();await page.locator('#breakMin').fill('1');await page.locator('#breakMin').dispatchEvent('change');await page.locator('.dialog-done').click();await page.locator('#pickStretch').click();const longId=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routines')).find(r=>r.name==='Pausa larga').id);
    await page.locator(`[data-id="${longId}"]`).click();assert.equal(await page.locator('#routineFit').isVisible(),true);await page.locator('#extendRoutineBreak').click();assert.equal(await page.locator('#player').isVisible(),true);assert.match(await page.locator('#time').innerText(),/5:40/);await page.clock.fastForward(2000);await page.locator('#finishStretch').click();
    // A shorter pause can be kept explicitly and is recorded as partial.
    await page.locator('#resetBtn').click();await page.locator('#pickStretch').click();await page.locator(`[data-id="${longId}"]`).click();await page.locator('#fitRoutineRemaining').click();await page.clock.fastForward(61000);
    const partial=await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).filter(e=>e.type==='Estiramiento').sort((a,b)=>b.ts-a.ts)[0]);assert.equal(partial.partial,true);assert.ok(partial.durationSec>=59&&partial.durationSec<=60);
    // Export includes custom routines; imports merge without duplicates or changing goals.
    await page.locator('.backup-details summary').click();const downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadPromise;const stream=await download.createReadStream();let bytes='';for await(const chunk of stream)bytes+=chunk;const backup=JSON.parse(bytes);assert.equal(backup.version,3);assert.equal(backup.routines.length,2);assert.equal(backup.settings.dailyPushupGoal,5);
    const imported={...backup,routines:[{id:'custom-import',name:'Importada',steps:[['reach',5]]}]};const upload=data=>page.locator('#importFile').setInputFiles({name:'routines.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await upload(imported);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ps.routines')).length===3);await upload(imported);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routines')).length),3);
    await upload({...imported,routines:[{...imported.routines[0],id:'custom-invalid',steps:[['missing',5]]}]});await page.waitForFunction(()=>document.getElementById('backupStatus').textContent.includes('No se importó'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routines')).length),3);
    // Daily goals reset by local day without losing the user's chosen target.
    await page.clock.fastForward(24*60*60*1000);assert.equal(await page.locator('#sPushups').innerText(),'0');assert.equal(await page.locator('#sPushupGoal').innerText(),'5');assert.equal(await page.locator('#pushupGoalProgress').getAttribute('aria-valuenow'),'0');assert.deepEqual(errors,[]);
    console.log(`${name}: daily goal, custom routine creation/order/playback, drafts, safe names, delete undo, pause extension, backups and local-day reset passed.`);
  }finally{await browser.close();}
}
