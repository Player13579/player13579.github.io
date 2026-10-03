// Original creative design: GPT-6.1-Sol, 2026-10-04. No imported artistic source.
export const VERSION = 'alchemy-cannon-new-e-sol61-r1';
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
export function sampleEvent(e, nowMs, frameId, {observation=true}={}) {
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
  const tri=(p,q,r,c,a,em,layer)=>{emit(...p,c,a,em,layer);emit(...q,c,a,em,layer);emit(...r,c,a,em,layer);};
  // Smooth explicit triangles: no texture, no screen-wide optical lift.
  const oval=(cx,cy,rx,ry,c,a,em,layer)=>{
    const n=24;
    for(let i=0;i<n;i++){
      const t=i/n*Math.PI*2,u=(i+1)/n*Math.PI*2;
      const p=[cx+Math.cos(t)*rx,cy+Math.sin(t)*ry],q=[cx+Math.cos(u)*rx,cy+Math.sin(u)*ry];
      emit(cx,cy,c,a,em,layer);emit(...p,c,0,em,layer);emit(...q,c,0,em,layer);
    }
  };
  const amber=[1,.48,.12],teal=[.08,.86,.75],white=[1,.94,.69];
  if(!beam){
    const gather=smooth(ageMs/180),release=smooth((ageMs-520)/380),power=smooth(ageMs/55)*(1-release);
    const squeeze=mix(1,.46,gather),spread=25*squeeze;
    if(observation)oval(8,0,31,26,teal,power*.16,1.2,0);
    // Three broad input domains converge at one open throat, never a hit ring.
    for(const [cx,cy,rx,ry] of [[-12,-spread,16,10],[-21,0,15,10],[-12,spread,16,10]]){
      oval(mix(cx,2,gather),cy,rx*(1-.3*gather),ry,amber,power*.85,1.5,1);
      const q=[mix(cx,2,gather),cy];
      tri([q[0]-5,q[1]-5],[18,-3],[q[0]+7,q[1]+5],teal,power*.65,1.1,1);
    }
    oval(10,0,12,11,teal,power*.95,2.8,2);
    oval(14,0,6,6,white,power,4,3);
  }else{
    const t=ageMs/duration,power=smooth(ageMs/28)*(1-smooth((ageMs-330)/90));
    const ribbon=(width,c,a,em,layer)=>{
      // Segment at exact source and collision endpoint; all longitudinal coordinates stay [0,length].
      const n=36;
      for(let i=0;i<n;i++){
        const x0=length*i/n,x1=length*(i+1)/n;
        const w0=width*Math.sin(Math.PI*(i/n))**.22,w1=width*Math.sin(Math.PI*((i+1)/n))**.22;
        tri([x0,-w0],[x1,-w1],[x1,w1],c,a,em,layer);
        tri([x0,-w0],[x1,w1],[x0,w0],c,a,em,layer);
      }
    };
    if(observation)ribbon(13,teal,power*.12,1.2,0);
    ribbon(7,teal,power*.6,1.5,1);
    ribbon(2.4,white,power*.8,2,2);
    // Three extended population packets carry longitudinal phase, not hit flashes.
    for(let i=0;i<3;i++){
      const center=((t*.82+i/3)%1)*length;
      const half=Math.min(length*.13,48),start=Math.max(0,center-half),end=Math.min(length,center+half);
      const width=4.8;
      const c=i===1?amber:white;
      tri([start,0],[center,-width],[end,0],c,power,3,3);
      tri([start,0],[end,0],[center,width],c,power,3,3);
    }
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
@fragment fn fs(o:Output)->@location(0) vec4f {
 // Vertex color is straight; alpha multiplication occurs exactly once.
 return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);
}`;
