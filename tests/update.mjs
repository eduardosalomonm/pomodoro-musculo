import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {VERSION} from '../release.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=new URL('../',import.meta.url),prefix='/pomodoro-squats/';
let version=VERSION;
const nextVersion=`${VERSION}-update-test`;
const server=createServer(async(req,res)=>{
  try{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(!pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
    const path=decodeURIComponent(pathname.slice(prefix.length))||'index.html';
    const file=new URL(path,root);if(!file.href.startsWith(root.href))throw Error('outside-root');
    let body=await readFile(file);if(path==='sw.js'||path==='release.js')body=Buffer.from(body.toString().replaceAll(VERSION,version));
    const extension=path.split('.').pop();res.writeHead(200,{'content-type':({html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',svg:'image/svg+xml',webmanifest:'application/manifest+json'})[extension]||'application/octet-stream','cache-control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
try{
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());const url=`http://127.0.0.1:${server.address().port}${prefix}`;
  await page.goto(url);await page.locator('html[data-ready="true"]').waitFor();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.locator('#pickPushups').click();await page.locator('#plusFive').click();
  version=nextVersion;await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});await page.locator('#updateNotice').waitFor();
  assert.equal(await page.locator('#repCount').innerText(),'5');assert.equal(await page.locator('#appVersion').innerText(),`Beta ${VERSION}`);
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('quota','QuotaExceededError');};});
  await page.locator('#updateAppBtn').click();assert.equal(await page.locator('#appVersion').innerText(),`Beta ${VERSION}`);assert.match(await page.locator('#toast').innerText(),/Exporta un respaldo/);
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await page.locator('#updateAppBtn').click();await page.waitForFunction(version=>document.getElementById('appVersion')?.textContent===`Beta ${version}`,nextVersion);
  assert.equal(await page.locator('#sPushups').innerText(),'5');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ps.log')).length),1);assert.equal(await page.evaluate(()=>localStorage.getItem('ps.exercise')),null);assert.match(await page.locator('#startBtn').innerText(),/Pausar/);
  await context.setOffline(true);await page.reload();await page.locator('html[data-ready="true"]').waitFor();assert.equal(await page.locator('#appVersion').innerText(),`Beta ${nextVersion}`);assert.equal(await page.locator('#sPushups').innerText(),'5');assert.deepEqual(errors,[]);
  console.log('Subpath hosting, coherent release cache, waiting update, progress-preserving reload and offline upgrade passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
