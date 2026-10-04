// GPT-6.1-Sol R12 UNSEALED: finite compression front and substantial connected supply; exact R11 event sampler.
export const VERSION = 'alchemy-cannon-new-e-sol61-r12';
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
// Finite compression packet and substantial supply tail. No calibrated fluid claim.
const pulse=(q,at,width)=>smooth(1-Math.abs((q-at)/width));
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const shapeAge=reducedMotion?210:Math.max(0,ageMs);
  const front=.08+.92*smooth(shapeAge/210);
  const q=u-1.22*shapeAge/420;
  const head=pulse(u,front-.10,.22),fold=pulse(q,-.19,.13);
  const axial=smooth(u/.035)*smooth((front-u)/.07);
  const radius=(7+13*head-1.5*fold)*axial;
  const center=(-3.5*head+3*fold)*axial;
  const faceLow=center+radius*(-.65+.08*fold);
  const faceHigh=center+radius*(.42-.15*head-.20*fold);
  const crease=center+radius*(.76-.94*head-.50*fold);
  const returnGate=smooth((head+.65*fold-.10)/.30);
  return {radius,center,q,axial,shapeAge,front,head,fold,faceLow,faceHigh,crease,returnGate,upper:center+radius,lower:center-radius};
}
export function sampleChargeSurfaces(u,localY,ageMs,{reducedMotion=false}={}) {
  if(!finite(localY))throw Error('invalid-surface-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion});
  const n=g.radius>0?Math.max(-1,Math.min(1,(localY-g.center)/g.radius)):0;
  const normal=Math.sqrt(Math.max(0,1-n*n));
  const wallCoverage=g.radius>0?smooth((g.radius-Math.abs(localY-g.center))/.9):0;
  // These are different local reflecting materials, not a scale on the emitter.
  const wall=[.018+.035*normal,.075+.18*normal,.15+.19*normal];
  const faceCoverage=g.radius>0?smooth((localY-g.faceLow)/.8)*smooth((g.faceHigh-localY)/.8):0;
  const white=[13.58,8.22,2.56];
  const curl=g.upper>g.crease?Math.max(0,Math.min(1,(localY-g.crease)/(g.upper-g.crease))):0;
  const returnCoverage=g.radius>0?smooth((localY-g.crease)/.8)*smooth((g.upper-localY)/.9)*g.returnGate:0;
  const back=[.035+.045*(1-curl),.14+.10*(1-curl),.22+.12*(1-curl)];
  return [
    {role:'rear-packet-sidewall',fold:0,depth:-.6*normal,coverage:wallCoverage,alpha:wallCoverage,color:wall},
    {role:'connected-white-supply-and-compression-face',fold:1,depth:.25,coverage:faceCoverage,alpha:faceCoverage,color:white},
    {role:'near-canted-packet-return',fold:2,depth:1+.6*g.head,coverage:returnCoverage,alpha:returnCoverage,color:back}
  ];
}
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
  const compressed=g.head,wake=1-g.head;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  // Explicit premultiplied surface-over order; steps stays a validated legacy option.
  let opacity=0,rgb=[0,0,0];
  for(const s of sampleChargeSurfaces(u,center+r*radius,ageMs,{reducedMotion})){
    rgb=rgb.map((v,i)=>s.color[i]*2.6*s.alpha+v*(1-s.alpha));opacity=s.alpha+opacity*(1-s.alpha);
  }
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
 // Finite advancing compression packet with a connected substantial supply tail.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let shapeAge=select(max(0.0,age),210.0,reduced);
 let front=0.08+0.92*smooth01(shapeAge/210.0);
 let q=u-1.22*shapeAge/420.0;
 let head=parcel(u,front-0.10,0.22);let fold=parcel(q,-0.19,0.13);
 let axial=smooth01(u/0.035)*smooth01((front-u)/0.07);
 let radius=(7.0+13.0*head-1.5*fold)*axial;
 let center=(-3.5*head+3.0*fold)*axial;
 if(radius<=0.0||power<=0.0){return vec4f(0.0);}
 let observer=o.emission> -1.5;
 if(observer){
   let coverage=smooth01((radius+4.0*axial-abs(localY-center))/3.4);
   let alpha=0.075*coverage*power;
   return vec4f(vec3f(0.08,0.86,0.75)*2.2*alpha,alpha);
 }
 let faceLow=center+radius*(-0.65+0.08*fold);
 let faceHigh=center+radius*(0.42-0.15*head-0.20*fold);
 let crease=center+radius*(0.76-0.94*head-0.50*fold);let upper=center+radius;
 let returnGate=smooth01((head+0.65*fold-0.10)/0.30);
 let n=clamp((localY-center)/radius,-1.0,1.0);let normal=sqrt(max(0.0,1.0-n*n));
 let wallCoverage=smooth01((radius-abs(localY-center))/0.9);
 let wall=vec3f(0.018+0.035*normal,0.075+0.18*normal,0.15+0.19*normal);
 let faceCoverage=smooth01((localY-faceLow)/0.8)*smooth01((faceHigh-localY)/0.8);
 let white=vec3f(13.58,8.22,2.56);
 let curl=clamp((localY-crease)/(upper-crease),0.0,1.0);
 let returnCoverage=smooth01((localY-crease)/0.8)*smooth01((upper-localY)/0.9)*returnGate;
 let back=vec3f(0.035+0.045*(1.0-curl),0.14+0.10*(1.0-curl),0.22+0.12*(1.0-curl));
 // Rear reflecting wall, unchanged strong emitter, then opaque near return.
 var radiance=wall*2.6*wallCoverage;var opacity=wallCoverage;
 radiance=white*2.6*faceCoverage+radiance*(1.0-faceCoverage);
 opacity=faceCoverage+opacity*(1.0-faceCoverage);
 radiance=back*2.6*returnCoverage+radiance*(1.0-returnCoverage);
 opacity=returnCoverage+opacity*(1.0-returnCoverage);
 return vec4f(radiance*power,opacity*power);
}`;

