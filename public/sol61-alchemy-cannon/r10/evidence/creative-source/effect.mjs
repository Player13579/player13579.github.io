// GPT-6.1-Sol R10 unsealed: folded projected charge sheets with actual openings/occlusion; sampler unchanged.
export const VERSION = 'alchemy-cannon-new-e-sol61-r10';
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
// Authored folded charge-sheet projection; no calibrated fluid/volume claim.
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const axial=smooth(u/.06)*(1-smooth((u-.86)/.14));
  const phaseTime=reducedMotion?0:ageMs/420,q=u-1.22*phaseTime;
  return {radius:22*axial,center:2*axial*Math.sin(8*q),q,axial,phaseTime};
}
export function sampleChargeSheets(u,localY,ageMs,{reducedMotion=false,spread=0}={}) {
  if(!finite(localY)||!finite(spread)||spread<0||spread>4)throw Error('invalid-sheet-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),sheets=[];
  for(let fold=0;fold<3;fold++){
    const phi=fold*2.0943951023931953,theta=6*g.q+phi+.42*Math.sin(3*g.q);
    const depth=.9*Math.sin(theta);
    const y=g.center+11*g.axial*Math.cos(theta);
    const halfWidth=(5.5+2*Math.cos(7*g.q+phi+.35*Math.sin(3*g.q)))*g.axial;
    const distance=Math.abs(localY-y);
    const coverage=g.axial>0?smooth((halfWidth+spread*g.axial-distance)/(1.2+spread*.6)):0;
    const facing=smooth((depth+.14)/.28);
    const front=[.08+13.5,.72+7.5,.46+2.1],back=[.10,.82,.97];
    sheets.push({fold,depth,y,halfWidth,coverage,facing,color:front.map((v,i)=>mix(back[i],v,facing)),alpha:coverage*.94});
  }
  return sheets;
}
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!finite(u)||!finite(r)||!finite(ageMs)||!finite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),{radius,center}=g;
  const compressed=.5+.5*Math.cos(7*g.q),wake=0;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  // steps remains accepted for prior diagnostic-call compatibility; R10 uses three
  // projected surfaces, so there is no depth quadrature or steps accuracy claim.
  const sheets=sampleChargeSheets(u,center+r*radius,ageMs,{reducedMotion}).sort((a,b)=>a.depth-b.depth||a.fold-b.fold);
  let opacity=0,rgb=[0,0,0];
  for(const s of sheets){rgb=rgb.map((v,i)=>s.color[i]*2.6*s.alpha+v*(1-s.alpha));opacity=s.alpha+opacity*(1-s.alpha);}
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
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){
 // Vertex color is straight; alpha multiplication occurs exactly once.
 return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);
 }
 // Explicit folded sheet coverage and depth ordering retain openings in projection.
 let u=clamp(o.color.x,0.0,1.0);let localY=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let axial=smooth01(u/0.06)*(1.0-smooth01((u-0.86)/0.14));
 let phaseTime=select(age/420.0,0.0,reduced);let q=u-1.22*phaseTime;
 let center=2.0*axial*sin(8.0*q);
 if(axial<=0.0||power<=0.0){return vec4f(0.0);}
 let observer=o.emission> -1.5;let spread=select(0.0,4.0,observer);
 var depths:array<f32,3>;var alphas:array<f32,3>;var colors:array<vec3f,3>;
 for(var fold:u32=0u;fold<3u;fold++){
   let phi=f32(fold)*2.0943951023931953;let theta=6.0*q+phi+0.42*sin(3.0*q);
   let depth=0.9*sin(theta);let y=center+11.0*axial*cos(theta);
   let halfWidth=(5.5+2.0*cos(7.0*q+phi+0.35*sin(3.0*q)))*axial;
   let coverage=smooth01((halfWidth+spread*axial-abs(localY-y))/(1.2+spread*0.6));
   let facing=smooth01((depth+0.14)/0.28);
   let front=vec3f(0.08+13.5,0.72+7.5,0.46+2.1);let back=vec3f(0.10,0.82,0.97);
   depths[fold]=depth;alphas[fold]=coverage*select(0.94,0.075,observer);
   colors[fold]=select(mix(back,front,facing)*2.6,vec3f(0.08,0.86,0.75)*2.2,observer);
 }
 // Stable back-to-front order; material faces own their coverage, rather than
 // adding densities into one optically merged filled support.
 var order=array<u32,3>(0u,1u,2u);
 for(var i:u32=0u;i<2u;i++){
   for(var j:u32=0u;j<2u-i;j++){
     if(depths[order[j]]>depths[order[j+1u]]){let swap=order[j];order[j]=order[j+1u];order[j+1u]=swap;}
   }
 }
 var radiance=vec3f(0.0);var opacity=0.0;
 for(var i:u32=0u;i<3u;i++){
   let index=order[i];let alpha=alphas[index];
   radiance=colors[index]*alpha+radiance*(1.0-alpha);opacity=alpha+opacity*(1.0-alpha);
 }
 return vec4f(radiance*power,opacity*power);
}`;

