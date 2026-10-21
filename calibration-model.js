import {RepTracker,poseChanged} from './pose-counter.js';
export const calibrationKind=(exercise,style)=>exercise==='pushups'?`pushups-${style==='wall'?'wall':'floor'}`:'squats';
export const profileKey=(kind,facing,aspect,lens='')=>`${kind}:${facing}:${aspect>=1?'landscape':'portrait'}${lens?`:${lens}`:''}`;
export function makeProfile(upper,lower,context,ts=Date.now()){
  const range=upper-lower;
  if(!Number.isFinite(upper)||!Number.isFinite(lower)||upper<130||upper>180||lower<35||range<30||range>130)return null;
  const up=upper-Math.min(12,Math.max(6,range*.15)),down=lower+Math.min(15,Math.max(6,range*.18));
  return {version:1,kind:context.kind,facing:context.facing,aspect:context.aspect,lens:context.lens||'',upper,lower,up,down,ts};
}
export function cleanProfile(p){
  if(!p||(p.lens!=null&&(typeof p.lens!=='string'||!/^([a-z0-9]+@[a-z0-9.]+)?$/.test(p.lens)||p.lens.length>80))||p.version!==1||!['squats','pushups-floor','pushups-wall'].includes(p.kind)||!['user','environment'].includes(p.facing)||!Number.isFinite(p.aspect)||p.aspect<.3||p.aspect>3||!Number.isFinite(p.ts)||p.ts<=0)return null;
  return makeProfile(p.upper,p.lower,p,p.ts);
}
export function cleanProfiles(value){const out={};if(!value||typeof value!=='object')return out;for(const raw of Object.values(value)){const p=cleanProfile(raw);if(p)out[profileKey(p.kind,p.facing,p.aspect,p.lens)]=p;}return out;}
export function compatibleProfile(p,context){return !!p&&p.kind===context.kind&&p.facing===context.facing&&(p.lens||'')===(context.lens||'')&&Math.abs(p.aspect-context.aspect)<.12;}
const median=values=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
export class CalibrationGuide {
  constructor(context,profile=null){this.context={...context};this.savedProfile=profile;this.restart();}
  restart(){this.stage='frame';this.profile=null;this.samples=[];this.reference=null;this.frameSince=null;this.lastAt=null;this.upper=null;this.progress=0;this.readyAt=0;this.testReps=0;this.tracker=null;this.message='';}
  retryTest(){if(this.profile){this.stage='test';this.testReps=0;this.tracker=new RepTracker({depth:this.profile.down,up:this.profile.up});this.message='';}}
  feed(p,now){
    if(this.stage==='complete')return;
    const gap=this.lastAt!=null&&now-this.lastAt>350;this.lastAt=now;this.message='';
    if(!p?.valid){this.samples=[];this.frameSince=null;this.progress=0;this.tracker?.reset();this.message=p?.message||'Ajusta el encuadre para continuar.';return;}
    if(Math.abs(p.aspect-this.context.aspect)>.12){this.restart();this.message='La orientación cambió. Reinicia con el iPhone en esta posición.';return;}
    if(poseChanged(this.reference,p)){this.restart();this.lastAt=now;this.message='La referencia cambió. Repite el encuadre y las posiciones.';}
    this.reference=p;
    if(gap){this.samples=[];this.frameSince=null;this.tracker?.reset();}
    if(this.stage==='frame'){
      this.frameSince??=now;this.progress=Math.min(100,(now-this.frameSince)/800*100);
      if(this.progress>=100){this.progress=0;if(this.savedProfile){this.profile=this.savedProfile;this.stage='test';this.tracker=new RepTracker({depth:this.profile.down,up:this.profile.up});}else{this.stage='extended';this.readyAt=now+3000;}}
      return;
    }
    if(this.stage==='test'){
      if(this.tracker.update(p.angle,now))this.testReps++;
      this.progress=this.testReps/2*100;
      if(this.testReps>=2)this.stage='complete';
      return;
    }
    if(now<this.readyAt){this.progress=0;return;}
    const eligible=this.stage==='extended'?p.angle>=130:p.angle<=this.upper-30&&p.angle>=35;
    if(!eligible){this.samples=[];this.progress=0;return;}
    if(this.samples.length&&(Math.abs(p.angle-median(this.samples.map(s=>s.angle)))>8||now-this.samples.at(-1).at>350))this.samples=[];
    this.samples.push({angle:p.angle,at:now});
    this.progress=Math.min(100,(now-this.samples[0].at)/1200*100,this.samples.length/10*100);
    if(this.progress<100||this.samples.length<10)return;
    const angle=median(this.samples.map(s=>s.angle));this.samples=[];this.progress=0;
    if(this.stage==='extended'){this.upper=angle;this.stage='bent';this.readyAt=now+2500;}
    else{
      this.profile=makeProfile(this.upper,angle,this.context);
      if(!this.profile){this.stage='extended';this.readyAt=now+3000;this.message='No hay suficiente diferencia entre posiciones. Revisa el encuadre y vuelve a intentarlo sin forzar.';return;}
      this.stage='test';this.tracker=new RepTracker({depth:this.profile.down,up:this.profile.up});
    }
  }
}
