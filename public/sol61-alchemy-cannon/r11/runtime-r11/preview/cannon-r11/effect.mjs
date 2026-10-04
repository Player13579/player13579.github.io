// GPT-6.1-Sol R11 UNSEALED: one finite charge sleeve, broad sidewall, advected nonperiodic return folds; sampler unchanged.
export const VERSION = 'alchemy-cannon-new-e-sol61-r11';
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
// Authored projected pressure sleeve, not a calibrated fluid/volume solver.
const pulse=(q,at,width)=>smooth(1-Math.abs((q-at)/width));
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const phaseTime=reducedMotion?0:ageMs/420,q=u-1.22*phaseTime;
  // Unequal finite parcels, no phase-shifted sinusoids or repeated crossings.
  const b0=pulse(q,-.72,.18),b1=pulse(q,-.23,.12),b2=pulse(q,.18,.21);
  const radius=(12+6*b0+4*b1+5*b2)*axial;
  const center=(3*b0-2.5*b1+1.6*b2)*axial;
  const fold=b0+.82*b1+.64*b2;
  const faceLow=center+radius*(-.62+.09*b1-.06*b2);
  const faceHigh=center+radius*(.42-.12*b0+.04*b2);
  const crease=center+radius*(.58-.86*fold);
  return {radius,center,q,axial,phaseTime,b0,b1,b2,fold,faceLow,faceHigh,crease,upper:center+radius,lower:center-radius};
}
export function sampleChargeSurfaces(u,localY,ageMs,{reducedMotion=false}={}) {
  if(!finite(localY))throw Error('invalid-surface-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion});
  const n=g.radius>0?Math.max(-1,Math.min(1,(localY-g.center)/g.radius)):0;
  const normal=Math.sqrt(Math.max(0,1-n*n));
  const wallCoverage=g.radius>0?smooth((g.radius-Math.abs(localY-g.center))/1.0):0;
  const wallLight=.2+.8*normal;
  const wall=[.025+.055*wallLight,.14+.68*wallLight,.23+.57*wallLight];
  const faceCoverage=g.radius>0?smooth((localY-g.faceLow)/.9)*smooth((g.faceHigh-localY)/.9):0;
  const white=[.08+13.5,.72+7.5,.46+2.1];
  const curl=g.upper>g.crease?Math.max(0,Math.min(1,(localY-g.crease)/(g.upper-g.crease))):0;
  const returnCoverage=g.radius>0?smooth((localY-g.crease)/.85)*smooth((g.upper-localY)/.9)*smooth((g.fold-.08)/.16):0;
  // Actual opaque return coverage prevents the hidden white face from leaking
  // through as another white union; no RGB cap or background compensation.
  const back=[.025+.085*(1-curl),.20+.62*(1-curl),.38+.51*(1-curl)];
  return [
    {role:'sidewall',fold:0,depth:-.6*normal,coverage:wallCoverage,alpha:wallCoverage,color:wall},
    {role:'white-main-face',fold:1,depth:.25,coverage:faceCoverage,alpha:faceCoverage,color:white},
    {role:'near-return-face',fold:2,depth:1+.6*g.fold,coverage:returnCoverage,alpha:returnCoverage,color:back}
  ];
}
// Legacy CPU diagnostic export remains available; these are role-owned surfaces,
// not three separate sheets or rolls. spread is the observer-envelope query.
export function sampleChargeSheets(u,localY,ageMs,{reducedMotion=false,spread=0}={}) {
  if(!finite(spread)||spread<0||spread>4)throw Error('invalid-sheet-sample');
  if(spread===0)return sampleChargeSurfaces(u,localY,ageMs,{reducedMotion});
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion});
  const coverage=g.radius>0?smooth((g.radius+spread*g.axial-Math.abs(localY-g.center))/(1+spread*.6)):0;
  return [{role:'observer-envelope',fold:0,depth:-1,coverage,alpha:.075*coverage,color:[.08,.86,.75]}];
}
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!finite(u)||!finite(r)||!finite(ageMs)||!finite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),{radius,center}=g;
  const compressed=g.fold,wake=0;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  // steps is validated for older diagnostic callers; this is explicit projected
  // surface occlusion, not 16-depth numerical integration or convergence.
  const surfaces=sampleChargeSurfaces(u,center+r*radius,ageMs,{reducedMotion});
  let opacity=0,rgb=[0,0,0];
  for(const s of surfaces){rgb=rgb.map((v,i)=>s.color[i]*2.6*s.alpha+v*(1-s.alpha));opacity=s.alpha+opacity*(1-s.alpha);}
  return {radius,center,color:opacity>1e-7?rgb.map(v=>v/opacity):[0,0,0],alpha:opacity*power,emission:0,compressed,wake};
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
fn parcel(q:f32,at:f32,width:f32)->f32 {return smooth01(1.0-abs((q-at)/width));}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){
 // Vertex color is straight; alpha multiplication occurs exactly once.
 return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);
 }
 // One finite sleeve: broad sidewall, continuous white face and front return.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let phaseTime=select(age/420.0,0.0,reduced);let q=u-1.22*phaseTime;
 let b0=parcel(q,-0.72,0.18);let b1=parcel(q,-0.23,0.12);let b2=parcel(q,0.18,0.21);
 let radius=(12.0+6.0*b0+4.0*b1+5.0*b2)*axial;
 let center=(3.0*b0-2.5*b1+1.6*b2)*axial;let fold=b0+0.82*b1+0.64*b2;
 if(radius<=0.0||power<=0.0){return vec4f(0.0);}
 let observer=o.emission> -1.5;
 if(observer){
   let coverage=smooth01((radius+4.0*axial-abs(localY-center))/3.4);
   let alpha=0.075*coverage*power;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let faceLow=center+radius*(-0.62+0.09*b1-0.06*b2);
 let faceHigh=center+radius*(0.42-0.12*b0+0.04*b2);
 let crease=center+radius*(0.58-0.86*fold);let upper=center+radius;
 let n=clamp((localY-center)/radius,-1.0,1.0);let normal=sqrt(max(0.0,1.0-n*n));
 let wallCoverage=smooth01((radius-abs(localY-center))/1.0);let wallLight=0.2+0.8*normal;
 let wall=vec3f(0.025+0.055*wallLight,0.14+0.68*wallLight,0.23+0.57*wallLight);
 let faceCoverage=smooth01((localY-faceLow)/0.9)*smooth01((faceHigh-localY)/0.9);
 let white=vec3f(0.08+13.5,0.72+7.5,0.46+2.1);
 let curl=clamp((localY-crease)/(upper-crease),0.0,1.0);
 let returnCoverage=smooth01((localY-crease)/0.85)*smooth01((upper-localY)/0.9)*smooth01((fold-0.08)/0.16);
 let back=vec3f(0.025+0.085*(1.0-curl),0.20+0.62*(1.0-curl),0.38+0.51*(1.0-curl));
 // The sleeve sidewall is behind the main face; the folded return is in front.
 // Full return coverage is opaque. It hides the rear emitter, not its brightness.
 var radiance=wall*2.6*wallCoverage;var opacity=wallCoverage;
 radiance=white*2.6*faceCoverage+radiance*(1.0-faceCoverage);
 opacity=faceCoverage+opacity*(1.0-faceCoverage);
 radiance=back*2.6*returnCoverage+radiance*(1.0-returnCoverage);
 opacity=returnCoverage+opacity*(1.0-returnCoverage);
 return vec4f(radiance*power,opacity*power);
}`;

