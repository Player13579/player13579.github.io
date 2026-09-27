/** One authoritative animation sampler for GPU, references, timeline and QA.
 * Fresh r0.2 morphology: ONE broad oblique volume, a receiving interface, and an embedded reservoir.
 * No rings, trajectories made of particles, skeletal branches, random seeds or background-dependent palettes.
 */
import {CONTRACT} from './state.js';
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const lerp=(a,b,t)=>a+(b-a)*t;
export const PALETTE=Object.freeze({core:[0.027,0.104,0.148],volume:[0.075,0.44,0.43],edge:[0.30,0.87,0.68],interface:[0.98,0.76,0.40],keyline:[0.012,0.036,0.057]});
export const PHASES=Object.freeze([{id:'formation',from:0,to:0.14,label:'発生'},{id:'conversion',from:0.14,to:0.40,label:'変換'},{id:'absorption',from:0.40,to:0.70,label:'吸収'},{id:'settlement',from:0.70,to:0.84,label:'定着'},{id:'afterglow',from:0.84,to:1,label:'低明度余韻'}]);
export function sampleTime(ageMs,durationMs=CONTRACT.defaultDurationMs){
  if(!Number.isFinite(ageMs)||!Number.isFinite(durationMs)||durationMs<CONTRACT.minDurationMs)throw new RangeError('finite age and duration >=900 actor-ms required');
  const p=clamp(ageMs/durationMs),alive=ageMs>=0&&ageMs<durationMs;
  const formation=smooth(0,0.105,p),conversion=smooth(0.14,0.40,p),absorption=smooth(0.36,0.72,p),settlement=smooth(0.56,0.81,p);
  const tail=1-smooth(0.84,1,p),energy=lerp(1,0.08,smooth(0.84,0.985,p));
  return {p,alive,phase:alive?(PHASES.find(s=>p>=s.from&&p<s.to)?.id??'formation'):'removed',formation,conversion,absorption,settlement,tail,energy};
}
function primitive(kind,layer,cx,cy,hw,hh,angle,fill,opacity,energy,anchor,contact,phase){
  return {kind,layer,cx,cy,hw,hh,angle,fill,opacity,energy,anchorX:anchor.x,anchorY:anchor.y,contactX:contact.x,contactY:contact.y,phase};
}
export function sampleMana(item,{overlap=1}={}){
  const t=sampleTime(item.ageMs,item.durationMs);if(!t.alive)return {time:t,primitives:[],bounds:null};
  const b=item.body,R=item.radiusPx??82,h=b.heightPx/64;
  const a={x:b.x+(b.manaAnchor?.x??0),y:b.y+(b.manaAnchor?.y??-0.49*b.heightPx)};
  const contact={x:(b.contactScale?.x??1)*h,y:(b.contactScale?.y??1)*h};
  const output=[]; const weight=1/Math.pow(Math.max(1,overlap),0.27);
  // The only exterior volume is on one oblique intake axis; no paired articulated silhouette.
  const move=smooth(0.14,0.73,t.p),remaining=1-smooth(0.43,0.77,t.p);
  const cx=a.x+lerp(-0.43*R,-0.035*R,move),cy=a.y+lerp(0.17*R,0.015*R,move);
  const hw=R*lerp(0.265,0.058,move),hh=R*lerp(0.145,0.092,t.conversion)*(0.92+0.08*remaining);
  const packetAlpha=t.formation*remaining*0.96*weight;
  if(packetAlpha>0.00001){
    output.push(primitive(0,'back',cx,cy,hw,hh,-0.18,lerp(-0.74,0.78,t.conversion),packetAlpha,1,a,contact,t.p));
    // Same material crosses the silhouette and is revealed ONLY inside the declared chest contact mask.
    output.push(primitive(1,'front',cx,cy,hw,hh,-0.18,lerp(-0.74,0.78,t.conversion),packetAlpha,1,a,contact,t.p));
  }
  const received=smooth(0.26,0.76,t.p);
  const reservoirAlpha=smooth(0.23,0.52,t.p)*t.tail*0.94*weight;
  if(reservoirAlpha>0.00001){
    output.push(primitive(2,'front',a.x+lerp(-3,0,received)*contact.x,a.y+lerp(4,0,received)*contact.y,
      lerp(5.2,7.4,received)*contact.x,lerp(7,11.6,received)*contact.y,-0.10,lerp(-0.9,0.94,received),reservoirAlpha,t.energy,a,contact,t.p));
  }
  // Broad local tissue-interface response. It follows received volume, not an extra trigger or glow sprite.
  const tissue=smooth(0.30,0.50,t.p)*(1-smooth(0.73,0.94,t.p))*0.28*weight;
  if(tissue>0.00001)output.unshift(primitive(3,'front',a.x-2*contact.x,a.y+2*contact.y,13*contact.x,17*contact.y,-0.10,received,tissue,t.energy,a,contact,t.p));
  const bounds={anchor:a,radiusPx:R,referenceHeightPx:64};
  return {time:t,primitives:output,bounds};
}
export function sampleScene(items){
  const count=new Map();for(const i of items)count.set(i.beneficiaryPlayerId,(count.get(i.beneficiaryPlayerId)||0)+1);
  return items.flatMap(i=>sampleMana(i,{overlap:count.get(i.beneficiaryPlayerId)}).primitives);
}
/** 5 vec4<f32>, 80-byte stride. Exactly matches shaders/mana.wgsl Instance. */
export function packPrimitives(primitives){
  const data=new Float32Array(primitives.length*20);
  primitives.forEach((s,i)=>data.set([s.cx,s.cy,s.hw,s.hh,s.angle,s.kind,s.fill,s.opacity,s.energy,s.phase,0,0,s.anchorX,s.anchorY,s.contactX,s.contactY,0,0,0,0],i*20));
  return data;
}
