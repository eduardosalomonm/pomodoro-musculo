// Synthetic 640 × 480 side views, with coherent limbs and no camera footage.
export function poseFixture(angle,kind='squats'){
  const r=angle*Math.PI/180,lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9,presence:1}));
  const point=(x,y,visibility=1)=>({x:x/640,y:y/480,visibility,presence:1});
  for(let side=0;side<2;side++){
    const confidence=side===0?1:.9,offset=side*5;
    if(kind==='squats'){
      lm[23+side]=point(320+140*Math.sin(r)+offset,280+140*Math.cos(r),confidence);
      lm[25+side]=point(320+offset,280,confidence);lm[27+side]=point(320+offset,420,confidence);
    }else if(kind==='pushups-floor'){
      const x=420+130*Math.sin(r)+offset,y=280+130*Math.cos(r);
      lm[11+side]=point(x,y,confidence);lm[13+side]=point(420+offset,280,confidence);lm[15+side]=point(420+offset,410,confidence);
      lm[23+side]=point(x-180,y+25,confidence);lm[25+side]=point(x-280,y+40,confidence);
    }else{
      const x=480-300*Math.sin(r/2)+offset;
      lm[11+side]=point(x,180,confidence);lm[13+side]=point((x+480+offset)/2,180+150*Math.cos(r/2),confidence);lm[15+side]=point(480+offset,180,confidence);
      lm[23+side]=point(x,350,confidence);lm[25+side]=point(x,430,confidence);
    }
  }
  return lm;
}
