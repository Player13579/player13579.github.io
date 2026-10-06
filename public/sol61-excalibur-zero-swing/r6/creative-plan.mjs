import {MOTION_CONTRACT} from '../../request-20261005/excalibur-shared-sword-motion-runtime-luna-r1/motion-planner.mjs';

export const EDITION='excalibur-zero-swing-sol61-r6';
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
export function planCreativeFrame({motion,releaseMotion=null,sourceEpoch,releaseEpoch,physicalViewport:v,camera2D:c,mainOn=true,sourceOn=true,obsOn=true,supply=1,material={},observer={},reducedMotion=false}){
  if(!v||![v.width,v.height,v.dpr].every(x=>Number.isFinite(x)&&x>0)||
    !c||![c.x,c.y,c.pixelsPerWorld].every(Number.isFinite)||c.pixelsPerWorld<=0)throw new TypeError('current physical viewport and camera required');
  if(!motion?.active)return Object.freeze({edition:EDITION,active:false,emitting:false,clear:true,particles:[],release:null,charge:0,obsEnabled:false});
  const a=motion.ageMs,L=Math.hypot(...motion.landmarks.tipWorld.map((x,i)=>x-motion.landmarks.gripWorld[i]));
  const screen=p=>worldScreen(p,v,c);
  const base=motion.landmarks.bladeBaseWorld,tip=motion.landmarks.tipWorld;
  const axis=tip.map((x,i)=>x-base[i]),bladeLength=Math.hypot(...axis),u=axis.map(x=>x/bladeLength),n=[-u[1],u[0]];
  if(!Number.isFinite(supply)||supply<0||supply>1)throw new TypeError('field supply must be finite in [0,1]');
  const roughness=material.roughness??.24,keyIntensity=material.keyIntensity??1.4,environmentIntensity=material.environmentIntensity??.65;
  const keyDirection=material.keyDirection??[-.45,-.35,.82];
  if(!Number.isFinite(roughness)||roughness<.14||roughness>.8||!Number.isFinite(keyIntensity)||keyIntensity<0||keyIntensity>4||!Number.isFinite(environmentIntensity)||environmentIntensity<0||environmentIntensity>4||!Array.isArray(keyDirection)||keyDirection.length!==3||!keyDirection.every(Number.isFinite)||Math.hypot(...keyDirection)<1e-8)throw new TypeError('finite bounded material/incident light required');
  const reflectionOn=material.reflectionOn??true;const observerState={nearOn:observer.nearOn??true,flareOn:observer.flareOn??true,ghostOn:observer.ghostOn??true};if(typeof reflectionOn!=='boolean'||!Object.values(observerState).every(x=>typeof x==='boolean'))throw new TypeError('boolean component comparison controls required');
  const materialState=Object.freeze({reflectionOn,roughness,keyIntensity,environmentIntensity,keyDirection:keyDirection.map(x=>x/Math.hypot(...keyDirection)),viewDirection:[0,0,1],model:'orthographic 2.5D facets, GGX/Smith/Schlick'});
  const effectEnabled=mainOn&&sourceOn&&supply>0;
  let arrived=0,receivedFraction=0;const particles=[];
  for(let i=0;i<14;i++){
    const birth=(i%7)*5,arrival=124+(i%7)*16,progress=clamp((a-birth)/(arrival-birth));
    const bladeT=.12+.80*(i%7)/6;
    const sourcePoint=MOTION_CONTRACT.landmarks.bladeBasePx.map((x,j)=>mix(x,MOTION_CONTRACT.landmarks.tipPx[j],bladeT));
    // This is the exact same source affine as the rendered sword, including anatomy mirror.
    const target=motion.mapImagePoint(sourcePoint),sign=i%2?1:-1;
    const radius=L*(.30+.16*(i%7)/6),longitudinal=L*(-.11+.22*(i%7)/6);
    const remain=Math.pow(1-progress,1.25),bend=Math.sin(Math.PI*progress)*.035*L*sign;
    const pos=target.map((x,j)=>x+remain*(n[j]*radius*sign+u[j]*longitudinal)+u[j]*bend);
    if(progress>=1)arrived++;
    // Material response begins only after exact arrival. This is deposited field energy, not a fabricated game receipt.
    const deposited=smooth((a-arrival)/20);receivedFraction+=deposited/14;
    const envelope=smooth((a-birth)/18)*(1-smooth((a-arrival)/12));
    const cssRadius=1.35+.65*(i%7)/6;
    const radiusPx=Math.max(.65*v.dpr,cssRadius*L*c.pixelsPerWorld/64);
    particles.push(Object.freeze({index:i,positionWorld:pos,targetWorld:target,sourcePointPx:sourcePoint,positionPx:screen(pos),targetPx:screen(target),
      radiusPx,progress,arrivalMs:arrival,depositedFraction:deposited,brightness:effectEnabled?supply*envelope*mix(6.0,18.0,progress):0}));
  }
  // The finite 20 ms material response is driven by delivered energy, never an independent clock-only ramp.
  const validPeak=validateReleaseMotion(motion,releaseMotion,{sourceEpoch,releaseEpoch});
  const transferFraction=!validPeak||a<PEAK_AGE_MS?0:smooth((a-PEAK_AGE_MS)/90);
  const charge=effectEnabled?supply*receivedFraction*(1-transferFraction):0;
  const releasedField=effectEnabled?supply*receivedFraction*transferFraction:0;
  let release=null;
  if(validPeak&&a>=PEAK_AGE_MS){
    const elapsed=a-PEAK_AGE_MS;
    const velocity=releaseMotion.tipVelocity.world,direction=releaseMotion.tipVelocity.worldDirection;
    const releaseLength=Math.hypot(...releaseMotion.landmarks.tipWorld.map((x,i)=>x-releaseMotion.landmarks.gripWorld[i]));
    const origin=releaseMotion.releaseSample.originWorld;
    // Finite fantasy radiance packet. Its travel direction is actual velocity; its designed speed is bounded by sword scale.
    const speed=releaseMotion.tipVelocity.worldSpeed*1.4,distance=speed*elapsed;
    const center=origin.map((x,i)=>x+direction[i]*distance);
    const energy=releasedField*(1-smooth((a-500)/150));
    const halfLength=releaseLength*(.72+.68*smooth(elapsed/85)),halfWidth=releaseLength*(.28+.35*smooth(elapsed/100));
    const dirPx=[direction[0],-direction[1]],normalPx=[-dirPx[1],dirPx[0]];
    release=Object.freeze({originWorld:[...origin],originPx:screen(origin),positionWorld:center,positionPx:screen(center),
      directionWorld:[...direction],velocityWorld:[...velocity],directionPx:dirPx,normalPx,elapsedMs:elapsed,
      halfLengthPx:halfLength*c.pixelsPerWorld,halfWidthPx:halfWidth*c.pixelsPerWorld,energy:effectEnabled?energy:0,
      swordScaleWorld:releaseLength,sampleAgeMs:releaseMotion.ageMs,causeId:releaseMotion.causeId,sourceId:releaseMotion.sourceId,synthetic:releaseMotion.synthetic});
  }
  const releaseParticles=[];
  if(release){
    const peak=releaseMotion,tipDelta=peak.landmarks.tipWorld.map((x,j)=>x-peak.landmarks.gripWorld[j]);
    const gripV=peak.tipVelocity.gripWorld,tipRelative=peak.tipVelocity.swingRelativeWorld;
    const omega=(tipDelta[0]*tipRelative[1]-tipDelta[1]*tipRelative[0])/(tipDelta[0]**2+tipDelta[1]**2);
    for(let i=0;i<28;i++){
      const bladeT=.18+.80*(i%7)/6,birthMs=PEAK_AGE_MS,visibilityDelayMs=Math.floor(i/7)*7,dt=Math.max(0,a-PEAK_AGE_MS);
      const sourcePoint=MOTION_CONTRACT.landmarks.bladeBasePx.map((x,j)=>mix(x,MOTION_CONTRACT.landmarks.tipPx[j],bladeT));
      const origin=peak.mapImagePoint(sourcePoint),offset=origin.map((x,j)=>x-peak.landmarks.gripWorld[j]);
      const initialV=[gripV[0]-omega*offset[1],gripV[1]+omega*offset[0]];
      const group=Math.floor(i/7),spread=(group-1.5)*.14*(reducedMotion?.35:1),side=[-release.directionWorld[1],release.directionWorld[0]];
      const velocity=initialV.map((x,j)=>x*(1.12+group*.19)+side[j]*release.swordScaleWorld*spread/100);
      const life=130+group*24,envelope=smooth((dt-visibilityDelayMs)/12)*(1-smooth((dt-life*.62)/(life*.38)));
      const position=origin.map((x,j)=>x+velocity[j]*dt),radiusWorld=release.swordScaleWorld*(.026+.009*group+.005*(i%3));
      releaseParticles.push(Object.freeze({index:i,sourcePointPx:sourcePoint,originWorld:origin,initialVelocityWorld:initialV,velocityWorld:velocity,positionWorld:position,positionPx:screen(position),birthMs,visibilityDelayMs,ageMs:dt,radiusPx:radiusWorld*c.pixelsPerWorld,
        brightness:effectEnabled&&a>=birthMs?releasedField*envelope*(15+group*4):0,lifeMs:life}));
    }
  }
  const {a:ma,b:mb,c:mc,d:md,tx,ty}=motion.affine,det=ma*md-mb*mc;
  const inverse={a:md/det,b:-mb/det,c:-mc/det,d:ma/det,tx:(mb*ty-md*tx)/det,ty:(mc*tx-ma*ty)/det};
  const p0=screen([0,0]),px=screen([1,0]),py=screen([0,1]);
  const screenToSource={a:inverse.a/(px[0]-p0[0]),b:inverse.b/(py[1]-p0[1]),c:inverse.c/(px[0]-p0[0]),d:inverse.d/(py[1]-p0[1]),
    tx:inverse.tx-inverse.a*p0[0]/(px[0]-p0[0])-inverse.b*p0[1]/(py[1]-p0[1]),ty:inverse.ty-inverse.c*p0[0]/(px[0]-p0[0])-inverse.d*p0[1]/(py[1]-p0[1])};
  let lensSeed=screen(base.map((x,i)=>mix(x,tip[i],.76))),seedPower=0;
  for(const mote of particles){const depositedPower=effectEnabled?mote.depositedFraction*supply*(1-transferFraction)*14:0;if(depositedPower>=seedPower&&depositedPower>0){seedPower=depositedPower;lensSeed=mote.targetPx;}}
  return Object.freeze({edition:EDITION,active:true,clear:false,emitting:effectEnabled&&(charge>0||particles.some(p=>p.brightness>0)||(release?.energy||0)>0),
    ageMs:a,observer:Object.freeze(observerState),material:materialState,supply,transferFraction,releasedField,storedField:charge,causeId:motion.causeId,sourceId:motion.sourceId,synthetic:motion.synthetic,particles,releaseParticles,charge,receivedFraction,arrivedCount:arrived,release,screenToSource,
    swordLengthPx:L*c.pixelsPerWorld,rimWidthPx:Math.max(1.5*v.dpr,L*c.pixelsPerWorld*.048),obsEnabled:effectEnabled&&obsOn,
    surfaceNormalScreen:(()=>{const side=[800/Math.hypot(800,809),809/Math.hypot(800,809)];const raw=[ma*side[0]+mb*side[1],-(mc*side[0]+md*side[1])];return raw.map(x=>x/Math.hypot(...raw));})(),peakStatus:validPeak?'exact-peak-sample':'missing-peak-no-release',bladeBasePx:screen(base),tipPx:screen(tip),lensSourcePx:lensSeed});
}

/** Packed layout mirrored literally by Params in creative-shader.mjs. */
export function encodeFrameUniforms(plan,v,c){
  const data=new Float32Array(320),put=(i,values)=>data.set(values,i*4);
  put(0,[v.width,v.height,plan.active?1:0,plan.obsEnabled?1:0]);
  if(!plan.active)return data;
  const q=plan.screenToSource;put(1,[q.a,q.b,q.tx,plan.charge]);put(2,[q.c,q.d,q.ty,plan.rimWidthPx]);
  put(3,[MOTION_CONTRACT.assetWidth,MOTION_CONTRACT.assetHeight,plan.ageMs,plan.swordLengthPx]);
  put(4,[...plan.bladeBasePx,...plan.tipPx]);
  const r=plan.release;put(5,r?[...r.positionPx,...r.directionPx]:[0,0,1,0]);
  put(6,r?[r.halfLengthPx,r.halfWidthPx,r.energy,1]:[0,0,0,0]);
  put(7,[...plan.lensSourcePx,plan.charge,plan.receivedFraction]);
  for(let i=0;i<plan.particles.length;i++)put(8+i,[...plan.particles[i].positionPx,plan.particles[i].radiusPx,plan.particles[i].brightness]);
  for(let i=0;i<plan.particles.length;i++){const mote=plan.particles[i];put(22+i,[...mote.targetPx,plan.swordLengthPx*.105,mote.depositedFraction*plan.supply*(1-plan.transferFraction)*(plan.emitting?1:0)]);}
  put(36,[plan.material.roughness,plan.material.keyIntensity,plan.material.environmentIntensity,0]);
  put(37,[...plan.material.keyDirection,0]);
  put(38,[...plan.surfaceNormalScreen,0,0]);
  put(39,[plan.obsEnabled&&plan.observer.nearOn?1:0,plan.obsEnabled&&plan.observer.flareOn?1:0,plan.obsEnabled&&plan.observer.ghostOn?1:0,plan.material.reflectionOn?1:0]);
  for(let i=0;i<(plan.releaseParticles?.length||0);i++){const q=plan.releaseParticles[i];put(40+i,[...q.positionPx,q.radiusPx,q.brightness]);}
  // R5 slots40..67 are finite source-derived release population. 1280 bytes / motes[72].
  // First640bytes: motes0..13, deposits14..27, material28..31. Expired remain zero.
  return data;
}
