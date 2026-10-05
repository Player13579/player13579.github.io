import {MOTION_CONTRACT} from './motion-planner.mjs';

export const EDITION='excalibur-zero-swing-sol61-r2';
export const PEAK_AGE_MS=MOTION_CONTRACT.timingMs.peakAge;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const worldScreen=(p,v,c)=>[(p[0]-c.x)*c.pixelsPerWorld+v.width/2,v.height/2-(p[1]-c.y)*c.pixelsPerWorld];
export function validateReleaseMotion(motion,releaseMotion,{sourceEpoch,releaseEpoch}={}){
  if(!releaseMotion)return false;
  if(!motion||releaseMotion.causeId!==motion.causeId||releaseMotion.sourceId!==motion.sourceId||
    releaseMotion.clockKind!==motion.clockKind||releaseMotion.synthetic!==motion.synthetic||
    releaseMotion.contractVersion!==MOTION_CONTRACT.version||Math.abs(releaseMotion.ageMs-PEAK_AGE_MS)>1e-7||
    typeof sourceEpoch!=='string'||!sourceEpoch||releaseEpoch!==sourceEpoch)
    throw new TypeError('releaseMotion must be the same cause/source epoch exact 350.5 ms motion sample');
  if(releaseMotion.tipVelocity.worldSpeed<=0||!releaseMotion.tipVelocity.worldDirection)return false;
  return true;
}

/** New creative state, independent of render polling. Current geometry uses only the supplied motion. */
export function planCreativeFrame({motion,releaseMotion=null,sourceEpoch,releaseEpoch,physicalViewport:v,camera2D:c,mainOn=true,sourceOn=true,obsOn=true}){
  if(!v||![v.width,v.height,v.dpr].every(x=>Number.isFinite(x)&&x>0)||
    !c||![c.x,c.y,c.pixelsPerWorld].every(Number.isFinite)||c.pixelsPerWorld<=0)throw new TypeError('current physical viewport and camera required');
  if(!motion?.active)return Object.freeze({edition:EDITION,active:false,emitting:false,clear:true,particles:[],release:null,charge:0,obsEnabled:false});
  const a=motion.ageMs,L=Math.hypot(...motion.landmarks.tipWorld.map((x,i)=>x-motion.landmarks.gripWorld[i]));
  const screen=p=>worldScreen(p,v,c);
  const base=motion.landmarks.bladeBaseWorld,tip=motion.landmarks.tipWorld;
  const axis=tip.map((x,i)=>x-base[i]),bladeLength=Math.hypot(...axis),u=axis.map(x=>x/bladeLength),n=[-u[1],u[0]];
  const effectEnabled=mainOn&&sourceOn;
  let arrived=0,receivedFraction=0;const particles=[];
  for(let i=0;i<14;i++){
    const birth=(i%5)*9,arrival=182+(i%7)*8.5,progress=clamp((a-birth)/(arrival-birth));
    const bladeT=.13+.79*((i*5)%14)/13;
    const sourcePoint=MOTION_CONTRACT.landmarks.bladeBasePx.map((x,j)=>mix(x,MOTION_CONTRACT.landmarks.tipPx[j],bladeT));
    // This is the exact same source affine as the rendered sword, including anatomy mirror.
    const target=motion.mapImagePoint(sourcePoint),sign=i%2?1:-1;
    const radius=L*(.24+.19*((i*3)%7)/6),longitudinal=L*(-.16+.31*((i*7)%13)/12);
    const remain=Math.pow(1-progress,1.55),bend=Math.sin(Math.PI*progress)*.035*L*sign;
    const pos=target.map((x,j)=>x+remain*(n[j]*radius*sign+u[j]*longitudinal)+u[j]*bend);
    if(progress>=1)arrived++;
    // Material response begins only after exact arrival. This is deposited field energy, not a fabricated game receipt.
    const deposited=smooth((a-arrival)/18);receivedFraction+=deposited/14;
    const envelope=smooth((a-birth)/24)*(1-smooth((progress-.83)/.17));
    const cssRadius=1.1+.7*((i*11)%9)/8;
    const radiusPx=Math.max(.65*v.dpr,cssRadius*L*c.pixelsPerWorld/64);
    particles.push(Object.freeze({index:i,positionWorld:pos,targetWorld:target,sourcePointPx:sourcePoint,positionPx:screen(pos),targetPx:screen(target),
      radiusPx,progress,arrivalMs:arrival,depositedFraction:deposited,brightness:effectEnabled?envelope*mix(2.8,6.5,progress):0}));
  }
  // The finite 18 ms material response is driven by delivered energy, never an independent clock-only ramp.
  const charge=effectEnabled?receivedFraction*(1-smooth((a-365)/220)):0;
  const validPeak=validateReleaseMotion(motion,releaseMotion,{sourceEpoch,releaseEpoch});
  let release=null;
  if(validPeak&&a>=PEAK_AGE_MS){
    const elapsed=a-PEAK_AGE_MS,t=elapsed/(650-PEAK_AGE_MS);
    const velocity=releaseMotion.tipVelocity.world,direction=releaseMotion.tipVelocity.worldDirection;
    const origin=releaseMotion.releaseSample.originWorld;
    // Finite fantasy radiance packet. Its travel direction is actual velocity; its designed speed is bounded by sword scale.
    const speed=L*.0048,distance=speed*elapsed;
    const center=origin.map((x,i)=>x+direction[i]*distance);
    const energy=(1-smooth(t))*(.72+.28*Math.exp(-elapsed/50));
    const halfLength=L*(.16+.08*smooth(elapsed/70)),halfWidth=L*(.07+.025*smooth(elapsed/80));
    const dirPx=[direction[0],-direction[1]],normalPx=[-dirPx[1],dirPx[0]];
    release=Object.freeze({originWorld:[...origin],originPx:screen(origin),positionWorld:center,positionPx:screen(center),
      directionWorld:[...direction],velocityWorld:[...velocity],directionPx:dirPx,normalPx,elapsedMs:elapsed,
      halfLengthPx:halfLength*c.pixelsPerWorld,halfWidthPx:halfWidth*c.pixelsPerWorld,energy:effectEnabled?energy:0,
      sampleAgeMs:releaseMotion.ageMs,causeId:releaseMotion.causeId,sourceId:releaseMotion.sourceId,synthetic:releaseMotion.synthetic});
  }
  const {a:ma,b:mb,c:mc,d:md,tx,ty}=motion.affine,det=ma*md-mb*mc;
  const inverse={a:md/det,b:-mb/det,c:-mc/det,d:ma/det,tx:(mb*ty-md*tx)/det,ty:(mc*tx-ma*ty)/det};
  const p0=screen([0,0]),px=screen([1,0]),py=screen([0,1]);
  const screenToSource={a:inverse.a/(px[0]-p0[0]),b:inverse.b/(py[1]-p0[1]),c:inverse.c/(px[0]-p0[0]),d:inverse.d/(py[1]-p0[1]),
    tx:inverse.tx-inverse.a*p0[0]/(px[0]-p0[0])-inverse.b*p0[1]/(py[1]-p0[1]),ty:inverse.ty-inverse.c*p0[0]/(px[0]-p0[0])-inverse.d*p0[1]/(py[1]-p0[1])};
  return Object.freeze({edition:EDITION,active:true,clear:false,emitting:effectEnabled&&(charge>0||particles.some(p=>p.brightness>0)||(release?.energy||0)>0),
    ageMs:a,causeId:motion.causeId,sourceId:motion.sourceId,synthetic:motion.synthetic,particles,charge,receivedFraction,arrivedCount:arrived,release,screenToSource,
    swordLengthPx:L*c.pixelsPerWorld,rimWidthPx:Math.max(.7*v.dpr,L*c.pixelsPerWorld*.017),obsEnabled:effectEnabled&&obsOn,
    peakStatus:validPeak?'exact-peak-sample':'missing-peak-no-release',bladeBasePx:screen(base),tipPx:screen(tip),lensSourcePx:screen(base.map((x,i)=>mix(x,tip[i],.76)))});
}

/** Packed layout mirrored literally by Params in creative-shader.mjs. */
export function encodeFrameUniforms(plan,v,c){
  const data=new Float32Array(160),put=(i,values)=>data.set(values,i*4);
  put(0,[v.width,v.height,plan.active?1:0,plan.obsEnabled?1:0]);
  if(!plan.active)return data;
  const q=plan.screenToSource;put(1,[q.a,q.b,q.tx,plan.charge]);put(2,[q.c,q.d,q.ty,plan.rimWidthPx]);
  put(3,[MOTION_CONTRACT.assetWidth,MOTION_CONTRACT.assetHeight,plan.ageMs,plan.swordLengthPx]);
  put(4,[...plan.bladeBasePx,...plan.tipPx]);
  const r=plan.release;put(5,r?[...r.positionPx,...r.directionPx]:[0,0,1,0]);
  put(6,r?[r.halfLengthPx,r.halfWidthPx,r.energy,1]:[0,0,0,0]);
  put(7,[...plan.lensSourcePx,plan.charge,0]);
  for(let i=0;i<plan.particles.length;i++)put(8+i,[...plan.particles[i].positionPx,plan.particles[i].radiusPx,plan.particles[i].brightness]);
  // Unused particle slots and all expired values stay zero.
  return data;
}
