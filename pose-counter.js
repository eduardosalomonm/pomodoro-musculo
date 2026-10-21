export function jointAngle(a,b,c,width=1,height=1) {
  const ab=[(a.x-b.x)*width,(a.y-b.y)*height],cb=[(c.x-b.x)*width,(c.y-b.y)*height];
  const length=Math.hypot(...ab)*Math.hypot(...cb);
  if(length<1e-8)return NaN;
  return Math.acos(Math.max(-1,Math.min(1,(ab[0]*cb[0]+ab[1]*cb[1])/length)))*180/Math.PI;
}
export class RepTracker {
  constructor(options=105){const o=typeof options==='number'?{depth:options}:options;this.depth=o.depth??105;this.up=o.up??155;this.reset();}
  reset(){this.phase='ready';this.smooth=null;this.since=0;this.candidate='';this.lastAt=null;this.descentAt=null;this.lastCount=-Infinity;this.reason='';}
  update(angle,ts){
    if(!Number.isFinite(angle)||!Number.isFinite(ts)){this.reset();return false;}
    if(this.lastAt!=null&&(ts-this.lastAt>350||ts<=this.lastAt))this.reset();
    const dt=this.lastAt==null?80:ts-this.lastAt;this.lastAt=ts;
    const alpha=1-Math.exp(-dt/65);this.smooth=this.smooth==null?angle:this.smooth+(angle-this.smooth)*alpha;
    if(this.descentAt!=null&&ts-this.descentAt>10000){this.phase='ready';this.descentAt=null;this.candidate='';this.reason='restart';}
    const candidate=this.smooth>=this.up?'up':this.smooth<=this.depth?'down':'';
    if(!candidate){this.candidate='';return false;}
    if(candidate!==this.candidate){this.candidate=candidate;this.since=ts;if(candidate==='down'&&this.phase==='up'&&this.descentAt==null)this.descentAt=ts;return false;}
    if(ts-this.since<180)return false;
    if(this.phase==='ready'&&candidate==='up'){this.phase='up';this.descentAt=null;this.reason='';}
    else if(this.phase==='up'&&candidate==='down')this.phase='down';
    else if(this.phase==='up'&&candidate==='up')this.descentAt=null;
    else if(this.phase==='down'&&candidate==='up'){
      const duration=ts-(this.descentAt??ts);this.phase='up';this.descentAt=null;
      if(duration<600||ts-this.lastCount<650){this.reason='fast';return false;}
      this.reason='';this.lastCount=ts;return true;
    }
    return false;
  }
}
const distance=(a,b,w,h)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h);
export function measurePose(lm,width,height,kind='squats',preferred=null){
  const fail=(reason,message)=>({valid:false,reason,message});
  if(!lm||lm.length<33||!width||!height)return fail('missing','Buscando tu cuerpo. Coloca el iPhone fijo y encuádrate de lado.');
  const push=kind!=='squats',sets=push?[[11,13,15,23,25],[12,14,16,24,26]]:[[23,25,27],[24,26,28]];
  const visible=i=>{const p=lm[i];return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?Math.min(p.visibility??0,p.presence??1):0;};
  const score=ids=>Math.min(...ids.map(visible));
  const scores=sets.map(score);
  let side=preferred!=null&&scores[preferred]>=.65?preferred:scores[0]>=scores[1]?0:1;
  if(scores[side]<.65)return fail('visibility',push?'No veo bien hombro, codo, muñeca, cadera y rodilla. Colócate de lado y ajusta el encuadre.':'Incluye cadera, rodilla y tobillo en el encuadre y mejora la luz.');
  const ids=sets[side];
  if(ids.some(i=>lm[i].x<.025||lm[i].x>.975||lm[i].y<.025||lm[i].y>.975))return fail('clipped','Parte del cuerpo queda fuera. Aleja o recoloca el iPhone.');
  const [a,b,c,hip,knee]=ids.map(i=>lm[i]),diagonal=Math.hypot(width,height);
  const first=distance(a,b,width,height),second=distance(b,c,width,height);
  if(Math.min(first,second)<diagonal*.035||first+second<diagonal*.16)return fail('small','Te veo demasiado pequeño o las articulaciones se solapan. Acerca un poco el iPhone y colócalo de lado.');
  if(push){
    const torso=distance(a,hip,width,height);
    if(torso<diagonal*.09)return fail('torso','Incluye también el tronco y la cadera en la imagen.');
    if(kind==='pushups-floor'){
      if(Math.abs(a.x-hip.x)*width<Math.abs(a.y-hip.y)*height*.8)return fail('orientation','Para flexiones en suelo, coloca el iPhone de lado para ver el cuerpo en horizontal.');
      if(jointAngle(a,hip,knee,width,height)<140)return fail('body','No distingo la posición de flexión. Encuadra el tronco y la rodilla de lado; puedes apoyar las rodillas.');
    }else{
      if(hip.y<a.y+.05||Math.abs(c.x-a.x)*width<diagonal*.08||Math.abs(c.y-a.y)*height>torso*.65)return fail('wall','Para la variante de pared, ponte de lado y encuadra las manos apoyadas aproximadamente a la altura de los hombros.');
    }
  }
  const angle=jointAngle(a,b,c,width,height);
  if(!Number.isFinite(angle))return fail('geometry','No distingo esa articulación. Revisa el encuadre.');
  return {valid:true,angle,side,confidence:scores[side],center:{x:(a.x+c.x)/2,y:(a.y+c.y)/2},scale:(first+second)/diagonal,aspect:width/height,ids};
}
export function poseChanged(a,b){return !!a&&!!b&&(a.side!==b.side||Math.abs(a.aspect-b.aspect)>.12||Math.hypot(a.center.x-b.center.x,a.center.y-b.center.y)>.2||Math.max(a.scale/b.scale,b.scale/a.scale)>1.5);}
