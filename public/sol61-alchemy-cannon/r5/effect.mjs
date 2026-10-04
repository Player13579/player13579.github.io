// GPT-6.1-Sol R5: GPU projected material extinction/radiance and coherent compressed-to-wake transport; R4 preserved.
export const VERSION = 'alchemy-cannon-new-e-sol61-r5';
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
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true}={}) {
  if(!Number.isFinite(u)||!Number.isFinite(r)||!Number.isFinite(ageMs)||!Number.isFinite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1)throw Error('invalid-material-sample');
  const axial=(u===0||u===1)?0:Math.sin(Math.PI*u)**.35;
  const travel=reducedMotion?.48:smooth((ageMs-28)/302),phaseTime=reducedMotion?0:ageMs/420;
  const compressed=Math.exp(-(((u-travel)/.12)**2));
  const wake=1-smooth((u-travel+.20)/.20);
  const radius=(14+5*compressed+3*wake)*axial;
  const center=4.2*axial*Math.sin(u*Math.PI*1.5-phaseTime*2.6);
  if(!integrate)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  if(radius<1e-7||Math.abs(r)>=1)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  const fold=.30*Math.sin(u*4-phaseTime*1.7),step=2*radius/16;
  let transmission=1,red=0,green=0,blue=0;
  for(let i=0;i<16;i++){
    const z=-1+(i+.5)/8,radial=r*r+z*z;
    const edge=1-smooth((radial-.60)/.40),bulk=Math.exp(-2.8*radial)*edge;
    const quiet=1-smooth((r+.45*z-fold+.15)/.35);
    const rho=bulk*(.11+.18*compressed+.05*wake)*(1+.30*quiet);
    const loss=Math.exp(-rho*step),absorbed=transmission*(1-loss);
    // Calm supplied material, a dense cool wake and a strongly radiating pressure state are distinct.
    const pressure=compressed*Math.exp(-(((r-.12)/.58)**2)-z*z/.64);
    const supply=1-.65*wake;
    const q=.15+.85*quiet;
    const sr=(.020*q+.018*(1-quiet)*supply+9.0*pressure);
    const sg=(.16*q+.65*(1-quiet)*supply+5.0*pressure);
    const sb=(.38*q+.42*(1-quiet)*supply+1.4*pressure);
    red+=absorbed*sr*2.6;green+=absorbed*sg*2.6;blue+=absorbed*sb*2.6;
    transmission*=loss;
  }
  const opacity=1-transmission,alpha=opacity*power;
  // The unchanged shader premultiplies once. emission=0 avoids applying another gain to integrated radiance.
  const color=opacity>1e-7?[red/opacity,green/opacity,blue/opacity]:[0,0,0];
  return {radius,center,color,alpha,emission:0,compressed,wake};
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
 let axial=pow(max(0.0,sin(3.14159265*u)),0.35);
 let travel=select(smooth01((age-28.0)/302.0),0.48,reduced);
 let phaseTime=select(age/420.0,0.0,reduced);
 let axialDistance=(u-travel)/0.12;let compressed=exp(-axialDistance*axialDistance);
 let wake=1.0-smooth01((u-travel+0.20)/0.20);
 let radius=(14.0+5.0*compressed+3.0*wake)*axial;
 let center=4.2*axial*sin(u*3.14159265*1.5-phaseTime*2.6);
 if(radius<0.0000001||power<=0.0){return vec4f(0.0);}
 if(o.emission> -1.5){
   let r=(localY-center)/(radius+4.0*axial);
   let alpha=pow(max(0.0,1.0-r*r),0.65)*power*0.075;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let r=(localY-center)/radius;
 if(abs(r)>=1.0){return vec4f(0.0);}
 let fold=0.30*sin(u*4.0-phaseTime*1.7);let step=2.0*radius/16.0;
 var transmission=1.0;var radiance=vec3f(0.0);
 for(var i:u32=0u;i<16u;i++){
   let z= -1.0+(f32(i)+0.5)/8.0;let radial=r*r+z*z;
   let edge=1.0-smooth01((radial-0.60)/0.40);let bulk=exp(-2.8*radial)*edge;
   let quiet=1.0-smooth01((r+0.45*z-fold+0.15)/0.35);
   let rho=bulk*(0.11+0.18*compressed+0.05*wake)*(1.0+0.30*quiet);
   let loss=exp(-rho*step);let absorbed=transmission*(1.0-loss);
   let pressureDistance=(r-0.12)/0.58;let pressure=compressed*exp(-pressureDistance*pressureDistance-z*z/0.64);
   let supply=1.0-0.65*wake;let q=0.15+0.85*quiet;
   let material=vec3f(0.020*q+0.018*(1.0-quiet)*supply+9.0*pressure,
     0.16*q+0.65*(1.0-quiet)*supply+5.0*pressure,
     0.38*q+0.42*(1.0-quiet)*supply+1.4*pressure);
   radiance+=absorbed*material*2.6;transmission*=loss;
 }
 // Integrated radiance is already premultiplied by optical transport; apply authored life gain once.
 return vec4f(radiance*power,(1.0-transmission)*power);
}`;

