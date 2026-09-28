import {EFFECTS} from './contract.mjs';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{let q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const bell=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
/** 純粋sampler。targetId、MP、30秒周期、4秒期限は入力にも判定にも使わない。 */
export function sampleEffect(event, actorNowMs, {reducedMotion=false}={}) {
  const age=actorNowMs-event.actorStartMs, active=age>=0&&age<1200;
  const kind=EFFECTS[event.eventId].kind;
  if (!active) return {active:false,ageActorMs:age,eventId:event.eventId,causeId:event.causeId,playerId:event.playerId,sourceEvent:event};
  let gate,shape,peak,body,glare,stress,phase;
  if (kind===0) {
    gate=smooth(0,46,age)*(1-smooth(820,1200,age));
    shape=smooth(72,290,age); // 横へ開いて止まる。遠方への輸送なし。
    peak=bell(age,156,62);body=.62+.38*smooth(0,160,age);glare=.72*peak+.09;
    stress=1-smooth(140,310,age);
    phase=age<72?'constraint':age<290?'release':age<820?'open_hold':'local_extinction';
  } else {
    gate=smooth(0,100,age)*(1-smooth(900,1200,age));
    shape=smooth(120,640,age); // 内向きの収束。攻撃方向・対象座標を持たない。
    peak=bell(age,610,135);body=.72+.28*shape;glare=.36*peak+.025;
    stress=smooth(250,660,age);
    phase=age<120?'establish':age<640?'tension_gather':age<900?'ready_hold':'local_extinction';
  }
  const physicalShape=shape;
  // 明示的なアクセシビリティ操作。寿命・原因ID・位相を保持し、変位だけを減らす。
  if (reducedMotion) shape=.72+.28*shape;
  const radius=event.radius;
  return {active:true,eventId:event.eventId,causeId:event.causeId,playerId:event.playerId,sourceEvent:event,
    ageActorMs:age,kind,x:event.x,y:event.y,radius,gate,shape,physicalShape,peak,body,glare,stress,phase,reducedMotion,
    footprintWorld:{minX:event.x-radius,minY:event.y-radius,maxX:event.x+radius,maxY:event.y+radius},
    bodyColor:kind===0?[.72,.24,.032]:[.074,.035,.30],
    sourceColor:kind===0?[1,.78,.34]:[.57,.23,1],
    coreColor:kind===0?[1,.98,.86]:[.96,.88,1],
    emissionSource:kind===0?'PH1.解除継ぎ目':'PH1.曲率拘束稜線'};
}
export function packedSamples(samples) {
  const out=new Float32Array(Math.max(1,samples.length)*16);
  samples.forEach((s,i)=>out.set([s.x,s.y,s.radius,s.kind,s.ageActorMs,s.gate,s.shape,s.peak,s.body,s.glare,s.stress,s.reducedMotion?1:0,0,0,0,0],i*16));
  return out;
}
export function sourcePositions(sample) {
  const s=sample,R=s.radius;
  return s.kind===0
    ? [{x:s.x-R*(.08+.20*s.shape),y:s.y-R*.38,power:s.gate*(.55+3.9*s.peak)},
       {x:s.x+R*(.08+.20*s.shape),y:s.y+R*.36,power:s.gate*(.40+2.8*s.peak)}]
    : [{x:s.x-R*(.28+.25*(-.10/.66)**2-.15*s.shape),y:s.y-R*.10,power:s.gate*(.15+2.9*s.peak)},
       {x:s.x+R*(.28+.25*(.19/.58)**2-.15*s.shape),y:s.y+R*.19,power:s.gate*(.10+1.9*s.peak)}];
}
export function sampleLocalLightAt(s,x,y,normal=[0,0,1]) {
  if (!s.active) return [0,0,0];
  let intensity=0;
  for(const q of sourcePositions(s)) {
    const dx=q.x-x,dy=q.y-y,d2=dx*dx+dy*dy+(s.radius*.20)**2;
    const lambert=Math.max(0,(normal[0]*dx+normal[1]*dy+normal[2]*s.radius*.20)/Math.sqrt(d2));
    intensity+=q.power*lambert*(s.radius*.12)**2/d2;
  }
  return s.sourceColor.map(c=>c*intensity);
}
export function sampleVoiceCursor(event,actorNowMs,sampleRate=48000) {
  const age=actorNowMs-event.actorStartMs;
  return age<0||age>=1200?null:age*sampleRate/1000;
}
