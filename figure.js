let palette={at:-1e9};
function colors(){const now=performance.now();if(now-palette.at>500){const css=getComputedStyle(document.documentElement);palette={at:now,'--line':css.getPropertyValue('--line').trim(),'--ink':css.getPropertyValue('--ink').trim(),'--accent':css.getPropertyValue('--accent').trim()};}return palette;}
export const BASE = {tilt:0, nod:0, bend:0, fold:0, shrug:0, crouch:0, lS:12, lE:0, rS:12, rE:0};
function drawFigure(cv, pose){
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, s = H/240;
  const col = colors();
  c.clearRect(0,0,W,H);
  c.save(); c.translate(W/2, 0); c.scale(s,s);
  c.strokeStyle = col['--line']; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-90,222); c.lineTo(90,222); c.stroke();
  const P = {...BASE, ...pose};
  const rot = (x,y,deg) => { const r=deg*Math.PI/180; return [x*Math.cos(r)-y*Math.sin(r), x*Math.sin(r)+y*Math.cos(r)]; };
  const hip = [0, 140 + P.crouch*34];
  c.strokeStyle = col['--ink']; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
  const line = (...pts) => { c.beginPath(); c.moveTo(...pts[0]); pts.slice(1).forEach(p=>c.lineTo(...p)); c.stroke(); };
  // legs
  for (const side of [-1,1]){
    const h = [hip[0]+side*12, hip[1]], f = [side*24, 220];
    const k = [(h[0]+f[0])/2 + side*P.crouch*22, (h[1]+f[1])/2 - P.crouch*6];
    line(h,k,f);
  }
  // torso
  const len = 62*(1 - P.fold*0.55);
  const [tx,ty] = rot(0,-len,P.bend);
  const neck = [hip[0]+tx, hip[1]+ty];
  line(hip, neck);
  // arms
  c.strokeStyle = col['--accent'];
  for (const [side,S,E] of [[-1,P.lS,P.lE],[1,P.rS,P.rE]]){
    const [sx,sy] = rot(side*18, 4 - P.shrug*7, P.bend);
    const sh = [neck[0]+sx, neck[1]+sy];
    const a1 = P.bend + side*(-S);
    const [ux,uy] = rot(0, 30, a1); const el = [sh[0]+ux, sh[1]+uy];
    const [fx,fy] = rot(0, 28, a1 + side*(-E)); const ha = [el[0]+fx, el[1]+fy];
    line([neck[0], neck[1]+4 - P.shrug*7].map((v,i)=>i? v : v), sh, el, ha);
  }
  // head
  const [hx,hy] = rot(0,-18,P.bend+P.tilt);
  c.fillStyle = col['--ink'];
  c.beginPath(); c.arc(neck[0]+hx, neck[1]+hy + P.nod*9, 13, 0, Math.PI*2); c.fill();
  c.restore();
}
const lerp = (a,b,t) => { const o={}; for (const k in BASE) o[k]=(a[k]??BASE[k])+((b[k]??BASE[k])-(a[k]??BASE[k]))*t; return o; };
const ease = t => 0.5 - 0.5*Math.cos(t*Math.PI*2); // 0→1→0
export function animate(cv, getMove){
  let raf;
  const loop = ts => {
    const m = getMove(); if (m) {
      if (m.pushup != null) drawPushup(cv, m.pushup, m.wall);
      else drawFigure(cv, lerp(m.a, m.b, matchMedia("(prefers-reduced-motion: reduce)").matches ? .5 : ease((ts/1000 % m.period)/m.period)));
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}

function drawPushup(cv, progress, wall=false) {
  const c=cv.getContext('2d'), col=colors();
  const t=matchMedia('(prefers-reduced-motion: reduce)').matches?.5:(.5-.5*Math.cos(progress*Math.PI*2));
  c.clearRect(0,0,cv.width,cv.height); c.save(); c.scale(cv.width/480,cv.height/360);
  c.lineCap='round'; c.lineJoin='round';
  const line=(points,color,width=8)=>{c.strokeStyle=col[color];c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  if (wall) {
    line([[350,60],[350,300]],'--line',3); line([[120,300],[380,300]],'--line',3);
    const x=235+t*35;
    line([[180,298],[x-12,216],[x,137]],'--ink');
    line([[x,142],[310-t*4,174],[346,138]],'--accent');
    c.fillStyle=col['--ink'];c.beginPath();c.arc(x+3,112,16,0,7);c.fill();
  } else {
    line([[60,282],[420,282]],'--line',3);
    const y=160+t*55;
    line([[98,278],[210,y+45],[330,y]],'--ink');
    line([[330,y],[298-t*12,y+48],[334,278]],'--accent');
    c.fillStyle=col['--ink'];c.beginPath();c.arc(360,y-12,16,0,7);c.fill();
  }
  c.restore();
}
