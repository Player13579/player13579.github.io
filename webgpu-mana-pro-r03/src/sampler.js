/** One authoritative animation sampler for GPU, references, timeline and QA.
 * r0.3 redesign goal:
 * - body-owned mana acquisition, not a detached oval inserted into the torso
 * - readable at H64 as acquisition -> conversion -> absorption/settlement -> low-luma afterglow
 * - no rings, no upward particles, no white glow blobs, no texture assets
 */
import {CONTRACT} from './state.js';
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const lerp=(a,b,t)=>a+(b-a)*t;
export const PALETTE=Object.freeze({core:[0.026,0.093,0.137],volume:[0.080,0.455,0.442],edge:[0.35,0.90,0.73],interface:[0.98,0.79,0.42],tail:[0.082,0.17,0.19],keyline:[0.014,0.034,0.052]});
export const PHASES=Object.freeze([
  {id:'formation',from:0,to:0.15,label:'発生'},
  {id:'conversion',from:0.15,to:0.43,label:'変換'},
  {id:'absorption',from:0.43,to:0.72,label:'吸収'},
  {id:'settlement',from:0.72,to:0.88,label:'定着'},
  {id:'afterglow',from:0.88,to:1,label:'低明度余韻'}
]);
export function sampleTime(ageMs,durationMs=CONTRACT.defaultDurationMs){
  if(!Number.isFinite(ageMs)||!Number.isFinite(durationMs)||durationMs<CONTRACT.minDurationMs)throw new RangeError('finite age and duration >=900 actor-ms required');
  const p=clamp(ageMs/durationMs),alive=ageMs>=0&&ageMs<durationMs;
  const formation=smooth(0,0.11,p),conversion=smooth(0.14,0.43,p),absorption=smooth(0.36,0.74,p),settlement=smooth(0.58,0.86,p);
  const tail=1-smooth(0.87,1,p),energy=lerp(1,0.06,smooth(0.86,0.992,p));
  return {p,alive,phase:alive?(PHASES.find(s=>p>=s.from&&p<s.to)?.id??'formation'):'removed',formation,conversion,absorption,settlement,tail,energy};
}
function primitive(kind,layer,cx,cy,hw,hh,angle,fill,opacity,energy,anchor,contact,phase){
  return {kind,layer,cx,cy,hw,hh,angle,fill,opacity,energy,anchorX:anchor.x,anchorY:anchor.y,contactX:contact.x,contactY:contact.y,phase};
}
export function sampleMana(item,{overlap=1}={}){
  const t=sampleTime(item.ageMs,item.durationMs); if(!t.alive)return {time:t,primitives:[],bounds:null};
  const b=item.body,R=item.radiusPx??82,h=b.heightPx/64;
  const a={x:b.x+(b.manaAnchor?.x??0),y:b.y+(b.manaAnchor?.y??-0.47*b.heightPx)};
  const contact={x:(b.contactScale?.x??1)*h,y:(b.contactScale?.y??1)*h};
  const weight=1/Math.pow(Math.max(1,overlap),0.29);
  const output=[];

  const intake=smooth(0.0,0.17,t.p)*(1-smooth(0.50,0.77,t.p));
  const seamTravel=smooth(0.09,0.62,t.p);
  const lodged=smooth(0.25,0.80,t.p);
  const settleBands=smooth(0.48,0.78,t.p)*(1-smooth(0.90,1.0,t.p));
  const after=smooth(0.70,0.95,t.p)*t.tail;

  // Exterior shroud: attached to the beneficiary-side receiving edge from the start.
  const shroudAlpha=intake*0.88*weight;
  if(shroudAlpha>0.00001){
    const shroudCx=a.x+lerp(-0.17*R,-0.06*R,seamTravel),shroudCy=a.y+lerp(0.06*R,0.01*R,seamTravel);
    const shroudHw=R*lerp(0.205,0.135,seamTravel),shroudHh=R*lerp(0.185,0.145,seamTravel);
    output.push(primitive(0,'back',shroudCx,shroudCy,shroudHw,shroudHh,-0.47,lerp(-0.76,0.85,seamTravel),shroudAlpha,lerp(1,0.74,smooth(0.42,0.78,t.p)),a,contact,t.p));
    output.push(primitive(1,'front',shroudCx+1.2*contact.x,shroudCy-0.5*contact.y,shroudHw*0.92,shroudHh*0.94,-0.47,lerp(-0.70,0.90,seamTravel),shroudAlpha*0.74,lerp(1,0.78,smooth(0.42,0.78,t.p)),a,contact,t.p));
  }

  // Tissue-interface response: localized, follows the intake, never a full-screen bloom.
  const interfaceAlpha=smooth(0.0,0.20,t.p)*(1-smooth(0.80,0.98,t.p))*0.34*weight;
  if(interfaceAlpha>0.00001){
    output.push(primitive(4,'front',a.x-2.6*contact.x,a.y+1.4*contact.y,14.2*contact.x,17.8*contact.y,-0.16,lerp(-0.55,0.72,lodged),interfaceAlpha,lerp(1,0.38,smooth(0.82,0.99,t.p)),a,contact,t.p));
  }

  // Reservoir: body-bound volume grows as exterior occupation shrinks.
  const reservoirAlpha=smooth(0.18,0.50,t.p)*t.tail*0.94*weight;
  if(reservoirAlpha>0.00001){
    output.push(primitive(2,'front',a.x+lerp(-1.8,1.0,lodged)*contact.x,a.y+lerp(4.2,0.8,lodged)*contact.y,
      lerp(4.0,6.3,lodged)*contact.x,lerp(6.6,10.6,lodged)*contact.y,-0.18,lerp(-0.92,0.95,lodged),reservoirAlpha,t.energy,a,contact,t.p));
  }

  // Settlement bands: short layered ribs communicate that the gained mana has seated inside the body.
  if(settleBands>0.00001){
    const bandX=a.x+lerp(-0.8,1.25,lodged)*contact.x;
    const xs=[-0.4,0,0.45],ys=[-3.8,0.8,5.2],scales=[0.86,1,0.9];
    for(let i=0;i<3;i++){
      output.push(primitive(5,'front',bandX+xs[i]*contact.x,a.y+ys[i]*contact.y,3.95*scales[i]*contact.x,1.75*scales[i]*contact.y,-0.27,lerp(-0.35,0.82,lodged),0.52*settleBands*weight,t.energy*0.92,a,contact,t.p));
    }
  }

  // Compact terminal seed: keeps a low-luma settled state instead of ending as a flat grey plate.
  const seedAlpha=after*0.62*weight;
  if(seedAlpha>0.00001){
    output.push(primitive(6,'front',a.x+0.9*contact.x,a.y+1.1*contact.y,2.2*contact.x,3.6*contact.y,-0.14,lerp(-0.2,0.45,t.settlement),seedAlpha,Math.max(0.1,t.energy*0.72),a,contact,t.p));
  }

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
