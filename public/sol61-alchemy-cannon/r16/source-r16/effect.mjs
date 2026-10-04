// GPT-6.1-Sol R16 UNSEALED. Offset charge body and independent emission/extinction; inherited sampler/activation preserved.
export const VERSION='alchemy-cannon-new-e-sol61-r16';
export const DURATIONS=Object.freeze({'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
const finite=Number.isFinite;const point=p=>p&&finite(p.x)&&finite(p.y);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
import {MATERIAL_WGSL} from './material.mjs';
export {section as sampleTransportGeometry,sampleTransportMaterial} from './material.mjs';
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

export const SHADER="struct View { size: vec4f, };\n@group(0) @binding(0) var<uniform> view: View;\nstruct Output { @builtin(position) position:vec4f, @location(0) color:vec4f, @location(1) emission:f32, };\n@vertex fn vs(@location(0) pos:vec2f,@location(1) color:vec4f,@location(2) params:vec2f)->Output {\n var o:Output;\n o.position=vec4f(pos.x/view.size.x*2.0-1.0,1.0-pos.y/view.size.y*2.0,0.0,1.0);\n o.color=color;o.emission=params.x;return o;\n}\n"+MATERIAL_WGSL;
