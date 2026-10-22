import {cameraSelect,cameraClick} from './ui-helpers.mjs';
import {VERSION} from '../release.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const url=process.env.APP_URL||'http://127.0.0.1:5181';
const outputDir=process.env.OUTPUT_DIR||join(tmpdir(),'pomodoro-squats-checks');await mkdir(outputDir,{recursive:true});
for(const [engine,device,name] of [[chromium,devices['Pixel 7'],'android'],[webkit,devices['iPhone 13'],'safari']]){
  const browser=await engine.launch({headless:true});
  try{
    const context=await browser.newContext({...device,timezoneId:'Europe/Madrid',serviceWorkers:'block'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());
    await page.clock.install({time:new Date('2026-10-21T12:00:00+02:00')});
    await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();
    assert.equal(await page.locator('#welcomeCard').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:join(outputDir,`${name}-welcome.png`),fullPage:true});
    await page.locator('#trialBtn').click();assert.equal(await page.locator('#time').innerText(),'1:00');assert.equal(await page.locator('#focusCount').innerText(),'0 bloques hoy');
    await page.locator('#pickSquats').click();await page.locator('#plusFive').click();await page.locator('#saveExercise').click();assert.equal(await page.locator('#sToday').innerText(),'5');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.settings')).breakMin),5);
    await page.clock.fastForward(61000);assert.equal(await page.locator('#focusCount').innerText(),'0 bloques hoy');await page.locator('#resetBtn').click();
    await page.locator('#focusTask').fill('PRIVATE TASK NEVER SHARED');
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.shared=payload;}}));
    await page.locator('#shareBtn').click();const shared=await page.evaluate(()=>window.shared);assert.equal(shared.url,'https://eduardosalomonm.github.io/pomodoro-musculo/');assert.equal(JSON.stringify(shared).includes('PRIVATE TASK'),false);
    await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelled','AbortError');}}));await page.locator('#shareBtn').click();assert.equal(await page.locator('#helpDialog').isVisible(),false);
    await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedLink=text;}}});});
    await page.locator('#shareBtn').click();assert.equal(await page.evaluate(()=>window.copiedLink),shared.url);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked');}}}));await page.locator('#shareBtn').click();assert.equal(await page.locator('#publicLink').inputValue(),shared.url);assert.equal(await page.locator('#shareFallback').isVisible(),true);
    const feedback=await page.locator('#feedbackLink').getAttribute('href');assert.equal(feedback.includes('PRIVATE'),false);assert.ok(decodeURIComponent(feedback).includes(`Versión: ${VERSION}`));
    await page.locator('.help-done').click();await page.locator('#settingsBtn').click();await page.locator('#theme').selectOption('dark');await page.locator('.dialog-done').click();
    await page.locator('#pickPushups').click();await cameraSelect(page,'pushupStyle','wall');await page.locator('#plusRep').click();
    await page.screenshot({path:join(outputDir,`${name}-exercise.png`),fullPage:true});
    for(const viewport of [{width:320,height:700},{width:844,height:390}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} overflow at ${viewport.width}`);}
    await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.locator('#sPushups').innerText(),'1');assert.equal(await page.locator('#welcomeCard').isVisible(),false);assert.deepEqual(errors,[]);
    const manifest=await page.evaluate(async()=>{const r=await fetch('manifest.webmanifest');return r.json();});assert.ok(manifest.icons.some(i=>i.sizes==='192x192'&&i.type==='image/png'));assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
    console.log(`${name}: first use, 1-minute trial, sharing, privacy, theme, layouts, draft recovery and install metadata passed.`);
    await context.close();
  }finally{await browser.close();}
}
// Failures in module delivery expose a useful retry instead of a dead timer.
const browser=await chromium.launch();try{const page=await browser.newPage({serviceWorkers:'block'});await page.route('**/app.js',route=>route.abort());await page.goto(url);await page.locator('#retryLoad').waitFor();assert.match(await page.locator('#loadMessage').innerText(),/No se pudo abrir/);assert.equal(await page.locator('#main').evaluate(el=>el.inert),true);console.log('Startup failure shows retry and preserves inert controls.');}finally{await browser.close();}
