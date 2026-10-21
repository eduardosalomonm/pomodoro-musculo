import test from 'node:test';
import assert from 'node:assert/strict';
import {openCamera,minimizeZoom,isUltraWide,cameraSignature} from '../camera-options.js';
import {makeProfile,cleanProfiles,compatibleProfile} from '../calibration-model.js';
function setup({enumeration=true,failWide=false,zoom=true}={}){
  const requests=[],tracks=[];
  const devices=[{kind:'videoinput',deviceId:'front',label:'Front Camera'},{kind:'videoinput',deviceId:'back',label:'Back Camera'},{kind:'videoinput',deviceId:'ultra',label:'Back Ultra Wide Camera'}];
  const media={getUserMedia:async options=>{
    requests.push(options);const id=options.video.deviceId?.exact||'back';
    if(id==='gone'||id==='ultra'&&failWide)throw Object.assign(new Error(),{name:'OverconstrainedError'});
    const s={deviceId:id,facingMode:id==='front'?'user':'environment',zoom:2};
    const track={label:devices.find(d=>d.deviceId===id)?.label,stops:0,stop(){this.stops++;},getSettings:()=>({...s}),getCapabilities:()=>zoom?{zoom:{min:1,max:5}}:{},applyConstraints:async c=>s.zoom=c.advanced[0].zoom};tracks.push(track);
    return {getTracks:()=>[track],getVideoTracks:()=>[track]};
  }};
  if(enumeration)media.enumerateDevices=async()=>devices;
  return {media,requests,tracks};
}
test('wide framing selects a named ultra-wide rear lens and verifies minimum zoom',async()=>{
  const s=setup(),r=await openCamera({...s,facing:'environment',wide:true});
  assert.equal(s.requests[1].video.deviceId.exact,'ultra');assert.equal(s.tracks[0].stops,1);assert.equal(r.ultraWide,true);assert.equal(r.zoomMin,true);assert.equal(r.track.getSettings().zoom,1);
  assert.equal(isUltraWide('Front Ultra Wide Camera'),false);assert.equal(isUltraWide('Cámara trasera ultra gran angular'),true);assert.equal(isUltraWide('Back Wide Camera'),false);
});
test('unsupported, rejected and silently ignored zoom never claims an adjustment',async()=>{
  assert.equal(await minimizeZoom({}),false);assert.equal(await minimizeZoom({getCapabilities:()=>({zoom:{min:.5,max:4}}),applyConstraints:async()=>{throw Error();}}),false);
  assert.equal(await minimizeZoom({getCapabilities:()=>({zoom:{min:1,max:4}}),applyConstraints:async()=>{},getSettings:()=>({zoom:2})}),false);
  const s=setup({enumeration:false,zoom:false}),r=await openCamera({...s,facing:'environment',wide:true});assert.equal(s.requests.length,1);assert.equal(r.ultraWide,false);assert.equal(r.zoomMin,false);
});
test('stale or unavailable lens falls back safely, manual lens takes priority',async()=>{
  const s=setup({failWide:true}),r=await openCamera({...s,facing:'environment',wide:true});assert.equal(r.fallback,true);assert.equal(r.ultraWide,false);assert.equal(r.track.getSettings().deviceId,'back');
  const t=setup();await openCamera({...t,deviceId:'front',facing:'user',wide:true});assert.equal(t.requests.length,1);assert.equal(t.requests[0].video.deviceId.exact,'front');
  const u=setup(),v=await openCamera({...u,deviceId:'gone',facing:'environment'});assert.equal(v.fallback,true);assert.equal(u.requests.length,2);
});
test('cancellation during permissions, enumeration or zoom releases streams and does not reopen',async()=>{
  for(const stage of ['permissions','enumeration','zoom']){
    const s=setup();let active=true;
    if(stage==='permissions'){const acquire=s.media.getUserMedia;s.media.getUserMedia=async o=>{const r=await acquire(o);active=false;return r;};}
    if(stage==='enumeration')s.media.enumerateDevices=async()=>{active=false;return [];};
    if(stage==='zoom'){s.media.enumerateDevices=async()=>[];const acquire=s.media.getUserMedia;s.media.getUserMedia=async o=>{const r=await acquire(o);r.getVideoTracks()[0].applyConstraints=async()=>{active=false;};return r;};}
    const r=await openCamera({...s,wide:true,facing:'environment',active:()=>active});assert.equal(r,null);assert.equal(s.requests.length,1);assert.ok(s.tracks.every(t=>t.stops>0));
  }
});
test('camera or zoom changes isolate calibration while old profiles still load',()=>{
  const s=setup(),context={kind:'squats',facing:'environment',aspect:4/3};
  const track={getSettings:()=>({deviceId:'back',zoom:1})},lens=cameraSignature(track),p=makeProfile(170,100,{...context,lens},123);
  assert.equal(compatibleProfile(p,{...context,lens}),true);assert.equal(compatibleProfile(p,{...context,lens:cameraSignature({getSettings:()=>({deviceId:'back',zoom:2})})}),false);assert.equal(compatibleProfile(p,{...context,lens:cameraSignature({getSettings:()=>({deviceId:'ultra',zoom:1})})}),false);
  const old=makeProfile(170,100,context,123);assert.equal(Object.keys(cleanProfiles({old,p})).length,2);assert.equal(compatibleProfile(old,{...context,lens}),false);
});
