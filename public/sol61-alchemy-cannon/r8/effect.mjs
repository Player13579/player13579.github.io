// GPT-6.1-Sol R8: a rotating two-state charged transport cross-section; R7 preserved.
export const VERSION = 'alchemy-cannon-new-e-sol61-r8';
export const DURATIONS = Object.freeze({'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
const finite = Number.isFinite;
const point = p => p && finite(p.x) && finite(p.y);
export function validateEvent(e, frameId) {
  if (!e || !Object.hasOwn(DURATIONS,e.type)) throw Error('unsupported-event-type');
  if (typeof e.id!=='string'||!e.id||typeof e.playerId!=='string'||!e.playerId||!finite(e.startedAt)) throw Error('invalid-event-identity-or-clock');
  if (!['continuous','gbo-tenfold'].includes(e.variant)) throw Error('unsupported-variant');
  const h=e.handWorld;
  if (!point(h)||h.eventId!==e.id||h.playerId!==e.playerId||h.frameId!==frameId||frameId==null) throw Error('event-bound-hand-world-unavailable');
  if(e.type==='alchemy-particle-cannon'&&(!finite(e.x)||!finite(e.y)||!finite(e.targetX)||!finite(e.targetY)||Math.hypot(e.targetX-e.x,e.targetY-e.y)<1e-6)) throw Error('invalid-activation-aim-projection');
  if(e.type==='alchemy-particle-beam'&&(!finite(e.targetX)||!finite(e.targetY)||Math.hypot(e.targetX-h.x,e.targetY-h.y)<1e-6)) throw Error('invalid-collision-endpoint');
  return true;
}
const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
// Projected optical model of one bounded population; not a calibrated physical/GPU volume solver.
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!Number.isFinite(u)||!Number.isFinite(r)||!Number.isFinite(ageMs)||!Number.isFinite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const travel=reducedMotion?.48:smooth((ageMs-28)/302),phaseTime=reducedMotion?0:ageMs/420;
  const compression=Math.exp(-(((u-travel)/.15)**2)),wake=1-smooth((u-travel+.20)/.20);
  const radius=(8+12*compression+.9*wake)*axial,center=3*axial*Math.sin(6*u-2*phaseTime);
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed:compression,wake};
  const twist=5*u-2*phaseTime,cs=Math.cos(twist),sn=Math.sin(twist),step=2*radius/steps;
  let transmission=1,red=0,green=0,blue=0;
  for(let i=0;i<steps;i++){
    const z=-1+2*(i+.5)/steps,p=cs*r-sn*z,q=sn*r+cs*z;
    const first=Math.max(0,1-((p-.31)/.63)**2-((q-.23)/.56)**2);
    const returning=Math.max(0,1-((p+.30)/.70)**2-((q+.20)/.57)**2);
    const edge=Math.max(0,1-r*r)*Math.max(0,1-z*z);
    const active=first*first,quiet=returning*returning;
    const rho=edge*(.22*active+.17*quiet+.024*edge)*(1+.7*compression);
    const loss=Math.exp(-rho*step),absorbed=transmission*(1-loss);
    const front=Math.max(0,1-((u-travel+.06*p-.04*q)/.12)**2);
    const pressure=front*front*compression;
    const core=active/(active+quiet+.00001),curl=quiet/(active+quiet+.00001);
    const excitation=(.45+.55*(1-wake))*(.70+.30*core);
    const sr=.028*curl+.05*core*excitation+13.5*pressure*core;
    const sg=.14*curl+1.22*core*excitation+7.5*pressure*core;
    const sb=.72*curl+.55*core*excitation+2.1*pressure*core;
    red+=absorbed*sr*2.6;green+=absorbed*sg*2.6;blue+=absorbed*sb*2.6;transmission*=loss;
  }
  const opacity=1-transmission,color=opacity>1e-7?[red/opacity,green/opacity,blue/opacity]:[0,0,0];
  return {radius,center,color,alpha:opacity*power,emission:0,compressed:compression,wake};
}
export function sampleEvent(e, nowMs, frameId, {observation=true,reducedMotion=false}={}) {
  validateEvent(e,frameId);
  if(!finite(nowMs))throw Error('invalid-sample-clock');
  const ageMs=nowMs-e.startedAt,duration=DURATIONS[e.type],out=[];
  const beam=e.type==='alchemy-particle-beam';
  const endpoint=beam?{x:e.targetX,y:e.targetY}:null;
  let phase=beam?'transport':ageMs<180?'gather':ageMs<520?'lock':'release';
  if(ageMs<0||ageMs>=duration)return {id:e.id,type:e.type,ageMs,phase:'inactive',endpoint,vertices:new Float32Array()};
  let dx=beam?e.targetX-e.handWorld.x:e.targetX-e.x,dy=beam?e.targetY-e.handWorld.y:e.targetY-e.y;
  const length=Math.hypot(dx,dy);dx/=length;dy/=length;
  const toWorld=(x,y)=>[e.handWorld.x+dx*x-dy*y,e.handWorld.y+dy*x+dx*y];
  const emit=(x,y,c,a,em,layer)=>{const p=toWorld(x,y);out.push(p[0],p[1],...c,a,em,layer);};
  const amber=[1,.48,.12],teal=[.08,.86,.75],white=[1,.94,.69];
  // R2 continuous cross sections keep colored material shoulders and a distinct luminous core.
  // Coverage, surface color and emission are separate; no hard-edged solid beam bar.
  const channel=(at,n,color,power,layer,spread=false)=>{
    const rows=[-1,-.58,0,.58,1];
    const rowAlpha=spread?[0,.075,.12,.075,0]:[0,.55,.96,.55,0];
    const rowColor=spread?rows.map(()=>color):[
      color.map(v=>v*.18),color.map(v=>v*.46),color,color.map(v=>v*.46),color.map(v=>v*.18)];
    const sections=Array.from({length:n+1},(_,i)=>at(i/n));
    const vertex=(i,j)=>{const p=sections[i];emit(p.x,p.y+rows[j]*p.w,rowColor[j],rowAlpha[j]*power,spread?1.2:(j===2?2.7:1.4),layer);};
    for(let i=0;i<n;i++)for(let j=0;j<rows.length-1;j++){
      vertex(i,j);vertex(i+1,j);vertex(i+1,j+1);
      vertex(i,j);vertex(i+1,j+1);vertex(i,j+1);
    }
  };
  if(!beam){
    const gather=reducedMotion?1:smooth(ageMs/180),release=smooth((ageMs-520)/380),power=smooth(ageMs/55)*(1-release);
    // Open fan-shaped intake persists during lock: broad channels, not disappearing beads.
    for(let i=-1;i<=1;i++){
      const shape=u=>({x:mix(-36,19,u),y:i*mix(23,18,gather)*(1-u)**1.25,
        w:(i===0?8:7)*Math.sin(Math.PI*u)**.38*(1-.26*gather)+2.1});
      if(observation)channel(u=>{const p=shape(u);return {...p,w:p.w+5};},28,teal,power,0,true);
      channel(shape,28,i===0?teal:amber,power,1);
    }
    // A short directional throat follows supply into its finite open tip, not a spherical core.
    channel(u=>({x:mix(4,24,u),y:0,w:6*Math.sin(Math.PI*u)**.6+.2}),18,white,power,3);
  }else{
    const t=ageMs/duration,power=smooth(ageMs/28)*(1-smooth((ageMs-330)/90));

    // Semantic ABI R5: negative emission marks a GPU material tuple [u,localY,encodedAge,power].
    // The stride/locations/draw binding remain unchanged; ordinary straight-RGBA vertices are untouched.
    const encodedAge=reducedMotion?-1-ageMs:ageMs;
    const quad=spread=>{
      const bound=spread?31:27,tag=spread?-1:-2,layer=spread?0:2;
      for(const [u,y] of [[0,-bound],[1,-bound],[1,bound],[0,-bound],[1,bound],[0,bound]])
        emit(u*length,y,[u,y,encodedAge],power,tag,layer);
    };
    if(observation)quad(true);
    quad(false);
    // Strong, short hand-side throat is the supplying source. No target impact
    // or pulse audio is invented, and its axial support cannot pass the endpoint.
    const throatLength=Math.min(18,length);
    channel(u=>({x:u*throatLength,y:0,w:4*Math.sin(Math.PI*u)**.6}),12,white,power,3);
  }
  return {id:e.id,type:e.type,ageMs,phase,endpoint,vertices:new Float32Array(out)};
}
export const SHADER = /* wgsl */ `
struct View { size: vec4f, };
@group(0) @binding(0) var<uniform> view: View;
struct Output { @builtin(position) position:vec4f, @location(0) color:vec4f, @location(1) emission:f32, };
@vertex fn vs(@location(0) pos:vec2f,@location(1) color:vec4f,@location(2) params:vec2f)->Output {
 var o:Output;
 o.position=vec4f(pos.x/view.size.x*2.0-1.0,1.0-pos.y/view.size.y*2.0,0.0,1.0);
 o.color=color;o.emission=params.x;return o;
}
fn smooth01(t:f32)->f32 {let q=clamp(t,0.0,1.0);return q*q*(3.0-2.0*q);}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){
 // Vertex color is straight; alpha multiplication occurs exactly once.
 return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);
 }
 // GPU projected optical profile of one finite population, not a calibrated real-fluid solver.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let travel=select(smooth01((age-28.0)/302.0),0.48,reduced);
 let phaseTime=select(age/420.0,0.0,reduced);
 let axialDistance=(u-travel)/0.15;let compression=exp(-axialDistance*axialDistance);
 let wake=1.0-smooth01((u-travel+0.20)/0.20);
 let radius=(8.0+12.0*compression+0.9*wake)*axial;
 let center=3.0*axial*sin(6.0*u-2.0*phaseTime);
 if(radius<0.0000001||power<=0.0){return vec4f(0.0);}
 if(o.emission> -1.5){
   let r=(localY-center)/(radius+4.0*axial);
   let alpha=pow(max(0.0,1.0-r*r),0.65)*power*0.075;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let r=(localY-center)/radius;if(abs(r)>=1.0){return vec4f(0.0);}
 let twist=5.0*u-2.0*phaseTime;let cs=cos(twist);let sn=sin(twist);let step=2.0*radius/16.0;
 var transmission=1.0;var radiance=vec3f(0.0);
 for(var i:u32=0u;i<16u;i++){
   let z= -1.0+(f32(i)+0.5)/8.0;let p=cs*r-sn*z;let q=sn*r+cs*z;
   let a=(p-0.31)/0.63;let b=(q-0.23)/0.56;
   let c=(p+0.30)/0.70;let d=(q+0.20)/0.57;
   let first=max(0.0,1.0-a*a-b*b);let returning=max(0.0,1.0-c*c-d*d);
   let edge=max(0.0,1.0-r*r)*max(0.0,1.0-z*z);
   let excitedLobe=first*first;let quiet=returning*returning;
   let rho=edge*(0.22*excitedLobe+0.17*quiet+0.024*edge)*(1.0+0.7*compression);
   let loss=exp(-rho*step);let absorbed=transmission*(1.0-loss);
   let frontDistance=(u-travel+0.06*p-0.04*q)/0.12;
   let front=max(0.0,1.0-frontDistance*frontDistance);let pressure=front*front*compression;
   let core=excitedLobe/(excitedLobe+quiet+0.00001);let curl=quiet/(excitedLobe+quiet+0.00001);
   let excitation=(0.45+0.55*(1.0-wake))*(0.70+0.30*core);
   let material=vec3f(0.028*curl+0.05*core*excitation+13.5*pressure*core,
      0.14*curl+1.22*core*excitation+7.5*pressure*core,
      0.72*curl+0.55*core*excitation+2.1*pressure*core);
   radiance+=absorbed*material*2.6;transmission*=loss;
 }
 // Integrated radiance is already premultiplied by optical transport; apply authored life gain once.
 return vec4f(radiance*power,(1.0-transmission)*power);
}`;

