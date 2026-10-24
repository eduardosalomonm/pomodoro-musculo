import test from 'node:test';
import assert from 'node:assert/strict';
import {measurePose,RepTracker,FrontReference} from '../pose-counter.js';
// Synthetic 640 × 480 frontal view: shoulders wide, ankles out of frame (laptop webcam).
// `thigh` is the vertical hip→knee distance over shoulder width; `lean` shortens the torso on screen.
function front(thigh,{ankles=false,lean=0,shoulders=100}={}){
  const lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:.1,presence:1}));
  const p=(x,y)=>({x:x/640,y:y/480,visibility:.95,presence:1});
  const hipY=260,torso=120*Math.cos(lean*Math.PI/180),half=shoulders/2;
  lm[11]=p(320-half,hipY-torso);lm[12]=p(320+half,hipY-torso);lm[23]=p(290,hipY);lm[24]=p(350,hipY);
  lm[25]=p(285,hipY+thigh*shoulders);lm[26]=p(355,hipY+thigh*shoulders);
  if(ankles){lm[27]=p(285,470);lm[28]=p(355,470);}
  return lm;
}
const run=(seq,{depth=120,step=60}={})=>{
  const t=new RepTracker({depth,up:150}),ref=new FrontReference();let time=0,count=0;
  for(const [thigh,n,opts] of seq)for(let i=0;i<n;i++){time+=step;const lm=front(thigh,opts);const m0=measurePose(lm,640,480,'squats',null,ref.value,true);const r=ref.add(m0.ratio,time);const m=measurePose(lm,640,480,'squats',null,r,true);if(t.update(m.angle,time))count++;}
  return count;
};
test('frontal squat uses thigh foreshortening when ankles are hidden',()=>{
  const standing=measurePose(front(.9),640,480,'squats',null,.9),deep=measurePose(front(.3),640,480,'squats',null,.9);
  assert.equal(standing.valid,true);assert.equal(standing.view,'front');assert.ok(standing.angle>170);assert.ok(deep.angle<115,`deep angle ${deep.angle}`);
});
test('facing the camera prefers frontal mode even with ankles visible',()=>assert.equal(measurePose(front(.9,{ankles:true}),640,480,'squats').view,'front'));
test('frontal cycles count with the standard tracker',()=>assert.equal(run([[.9,20],[.3,20],[.9,20],[.3,20],[.9,20]]),2));
test('a normal squat with torso lean still counts',()=>assert.equal(run([[.9,20],[.42,20,{lean:40}],[.9,20],[.42,20,{lean:40}],[.9,20]]),2));
test('one noisy standing frame does not stall counting',()=>assert.equal(run([[.9,20],[1.2,1],[.9,5],[.3,20],[.9,20]]),1));
test('a slightly turned body keeps frontal mode once entered (hysteresis)',()=>{
  const turned=front(.9,{shoulders:50});
  assert.notEqual(measurePose(turned,640,480,'squats',null,0,false).view,'front');
  assert.equal(measurePose(turned,640,480,'squats',null,0,true).view,'front');
});
test('a short frame gap keeps the cycle; a long one resets it',()=>{
  const t=new RepTracker(100);let time=0,count=0;const f=(a,n=20,step=40)=>{for(let i=0;i<n;i++){time+=step;if(t.update(a,time))count++;}};
  f(175);f(80);time+=600;f(175);assert.equal(count,1);
  f(80);time+=1500;f(175);assert.equal(count,1);
});
