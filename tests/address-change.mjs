import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium,webkit,devices}=createRequire(import.meta.url)('playwright');
const root=new URL('../',import.meta.url),oldPath='/pomodoro-squats/',newPath='/pomodoro-musculo/';
// Serve both Pages roots from the same origin, like the public deployment.
const server=createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),prefix=[oldPath,newPath].find(p=>url.pathname.startsWith(p));if(!prefix)throw Error('path');const path=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html',file=new URL(path,root);if(!file.href.startsWith(root.href))throw Error('path');const data=await readFile(file);res.writeHead(200,{'content-type':({html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',webmanifest:'application/manifest+json'})[path.split('.').pop()]||'text/plain','cache-control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
try{
 for(const [engine,device,name] of [[webkit,devices['iPhone 13'],'safari'],[chromium,devices['Pixel 7'],'chrome']]){
  const browser=await engine.launch();try{
   const context=await browser.newContext({...device,serviceWorkers:'allow'});await context.route('https://fonts.googleapis.com/**',r=>r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   // Legacy data, including an unfinished activity and routine draft, are origin-wide.
   await page.addInitScript(()=>{if(location.pathname.startsWith('/pomodoro-squats/')&&!localStorage.getItem('migration-seeded')){localStorage.setItem('migration-seeded','yes');localStorage.setItem('ps.log',JSON.stringify([{id:'old-entry',ts:Date.now(),type:'Sentadillas',reps:5,source:'manual'}]));localStorage.setItem('ps.exercise',JSON.stringify({id:'pending-entry',ts:Date.now(),type:'Flexiones',reps:3,source:'manual'}));localStorage.setItem('ps.routineDraft',JSON.stringify({id:'custom-old',name:'Mi rutina',steps:[['shrug','15']]}));}});
   await page.goto(`${origin}${oldPath}?from=friend#main`);await page.waitForURL(`${origin}${newPath}?from=friend#main`);await page.locator('html[data-ready="true"]').waitFor();
   assert.equal(await page.title(),'Pomodoro Músculo');assert.equal(await page.locator('#sToday').innerText(),'5');assert.equal(await page.locator('#sPushups').innerText(),'3');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.routineDraft')).name),'Mi rutina');
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).length),2);
   assert.equal(await page.locator('.brand img').evaluate(el=>el.complete&&el.naturalWidth>0),true);await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(tmpdir(),`musculo-${name}-brand.png`)});
   const second=await context.newPage();await second.goto(`${origin}${oldPath}`);await second.waitForURL(`${origin}${newPath}`);await second.locator('html[data-blocked="session-busy"]').waitFor();assert.equal(await second.locator('#main').evaluate(el=>el.inert),true);await second.close();
   const newCache=await page.evaluate(async()=> (await caches.keys()).find(k=>k.includes('%2Fpomodoro-musculo%2F')));assert.ok(newCache);await page.close();
   // An installed legacy app may start offline: keep it functional and isolate its cache.
   const legacy=await context.newPage();await legacy.addInitScript(()=>Object.defineProperty(navigator,'onLine',{get:()=>false}));await legacy.goto(`${origin}${oldPath}`);await legacy.locator('html[data-ready="true"]').waitFor();await legacy.waitForFunction(()=>!!navigator.serviceWorker.controller);
   const keys=await legacy.evaluate(()=>caches.keys());assert.ok(keys.includes(newCache));assert.ok(keys.some(k=>k.includes('%2Fpomodoro-squats%2F')));
   if(engine===chromium){await context.setOffline(true);await legacy.reload();await legacy.locator('html[data-ready="true"]').waitFor();assert.equal(await legacy.locator('#sToday').innerText(),'5');}
   await legacy.close();const fresh=await context.newPage();await fresh.goto(`${origin}${newPath}`);await fresh.locator('html[data-ready="true"]').waitFor();assert.equal(await fresh.locator('#sPushups').innerText(),'3');assert.deepEqual(errors,[]);
   console.log(`${name}: old-to-new address, query/hash, shared history/drafts, single writer, logo and independent offline caches passed.`);
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
