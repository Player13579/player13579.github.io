// GPT-6.1-Sol R9 draft: connected transported charge rolls; exact R8 event/sampler contract.
export const VERSION = 'alchemy-cannon-new-e-sol61-r9';
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
// Authored charge-roll representation, not a calibrated physical fluid solver.
// One parcel coordinate q advances monotonically from source to endpoint.
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const phaseTime=reducedMotion?0:ageMs/420;
  const q=u-1.22*phaseTime;
  const radius=(18+3*Math.cos(15*q))*axial;
  const center=2*axial*Math.sin(8*q);
  return {radius,center,q,axial,phaseTime};
}
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!finite(u)||!finite(r)||!finite(ageMs)||!finite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),{radius,center,q}=g;
  const compressed=.5+.5*Math.cos(15*q),wake=0;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  const step=2*radius/steps;
  let transmission=1,red=0,green=0,blue=0;
  for(let i=0;i<steps;i++){
    const z=-1+2*(i+.5)/steps;
    const edge=Math.max(0,1-r*r)*Math.max(0,1-z*z);
    let rho=0,sr=0,sg=0,sb=0;
    // The three rolls overlap; no separate rail meshes or independently fading lobes.
    // Helical placement AND folded excitation share q; neither is a static decoration.
    for(let roll=0;roll<3;roll++){
      const phi=roll*2.0943951023931953;
      const theta=9*q+phi+.30*Math.sin(15*q+phi);
      const cy=.34*Math.cos(theta),cz=.34*Math.sin(theta);
      const rollRadius=.64+.06*Math.cos(15*q+phi);
      const py=(r-cy)/rollRadius,pz=(z-cz)/rollRadius;
      const d=py*py+pz*pz,body=Math.max(0,1-d);
      const mass=body*body;
      const density=.18*mass*edge;
      const interior=Math.max(0,1-d/.62);
      const crest=.5+.5*Math.cos(15*q+phi+.75*py);
      // White charge occupies a moving folded interior within the shared body;
      // the outward-facing return material retains a resolved colored shoulder.
      const charge=interior*interior*(.30+.70*crest*crest);
      const facing=smooth((pz+.85)/1.7);
      const hot=[.08+13.5*charge,.72+7.5*charge,.46+2.1*charge];
      const cool=[.03,.22,.88];
      rho+=density;
      sr+=density*mix(cool[0],hot[0],facing);
      sg+=density*mix(cool[1],hot[1],facing);
      sb+=density*mix(cool[2],hot[2],facing);
    }
    const loss=Math.exp(-rho*step),absorbed=transmission*(1-loss);
    if(rho>1e-10){red+=absorbed*sr/rho*2.6;green+=absorbed*sg/rho*2.6;blue+=absorbed*sb/rho*2.6;}
    transmission*=loss;
  }
  const opacity=1-transmission,color=opacity>1e-7?[red/opacity,green/opacity,blue/opacity]:[0,0,0];
  return {radius,center,color,alpha:opacity*power,emission:0,compressed,wake};
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
 // One source-advected bundle of overlapping charge rolls; artistic material model.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let phaseTime=select(age/420.0,0.0,reduced);let q=u-1.22*phaseTime;
 let radius=(18.0+3.0*cos(15.0*q))*axial;
 let center=2.0*axial*sin(8.0*q);
 if(radius<0.0000001||power<=0.0){return vec4f(0.0);}
 if(o.emission> -1.5){
   let r=(localY-center)/(radius+4.0*axial);
   let alpha=pow(max(0.0,1.0-r*r),0.65)*power*0.075;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let r=(localY-center)/radius;if(abs(r)>=1.0){return vec4f(0.0);}
 let step=2.0*radius/16.0;
 var transmission=1.0;var radiance=vec3f(0.0);
 for(var i:u32=0u;i<16u;i++){
   let z= -1.0+(f32(i)+0.5)/8.0;
   let edge=max(0.0,1.0-r*r)*max(0.0,1.0-z*z);
   var rho=0.0;var weightedMaterial=vec3f(0.0);
   for(var roll:u32=0u;roll<3u;roll++){
     let phi=f32(roll)*2.0943951023931953;
     let theta=9.0*q+phi+0.30*sin(15.0*q+phi);
     let cy=0.34*cos(theta);let cz=0.34*sin(theta);
     let rollRadius=0.64+0.06*cos(15.0*q+phi);
     let py=(r-cy)/rollRadius;let pz=(z-cz)/rollRadius;
     let d=py*py+pz*pz;let body=max(0.0,1.0-d);let mass=body*body;
     let density=0.18*mass*edge;
     let interior=max(0.0,1.0-d/0.62);
     let crest=0.5+0.5*cos(15.0*q+phi+0.75*py);
     let charge=interior*interior*(0.30+0.70*crest*crest);
     let facing=smooth01((pz+0.85)/1.7);
     let hot=vec3f(0.08+13.5*charge,0.72+7.5*charge,0.46+2.1*charge);
     let cool=vec3f(0.03,0.22,0.88);
     rho+=density;weightedMaterial+=density*mix(cool,hot,facing);
   }
   let loss=exp(-rho*step);let absorbed=transmission*(1.0-loss);
   if(rho>0.0000000001){radiance+=absorbed*weightedMaterial/rho*2.6;}
   transmission*=loss;
 }
 return vec4f(radiance*power,(1.0-transmission)*power);
}`;

