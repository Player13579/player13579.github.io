/** The only time/transport sampler. It produces geometry/state, NEVER an image. */
import {C} from './constants.mjs';
export {C};
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const mix=(a,b,t)=>a+(b-a)*t;
export function smooth01(x){x=clamp(x);return x*x*x*(x*(x*6-15)+10);}
export function smoothDerivative(x){return x<=0||x>=1?0:30*x*x*(x-1)*(x-1);}
export const ramp=(p,a,b)=>smooth01((p-a)/(b-a));
export function hash32(text){let h=2166136261;for(const ch of String(text)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function envelope(p){return ramp(p,C.visibilityWindow[0],C.visibilityWindow[1])*(1-ramp(p,C.visibilityWindow[2],C.visibilityWindow[3]));}
export const arrivalAmount=(p,i)=>ramp(p,...C.arrivalWindows[i]);
export const arrivalFlux=(p,i)=>{const [a,b]=C.arrivalWindows[i];return smoothDerivative((p-a)/(b-a))/(b-a);};
export function transfer(p){
 const arrivals=C.arrivalWindows.map(([a,b],i)=>({
   amount:arrivalAmount(p,i), rate:arrivalFlux(p,i),
   leadingPosition:ramp(p,C.leadingStart[i],a), start:a,end:b
 }));
 const charge=(arrivals[0].amount+arrivals[1].amount)/2;
 return {arrivals,charge,external:1-charge,flux:(arrivals[0].rate+arrivals[1].rate)/2,morph:ramp(p,...C.morphWindow)};
}
export function normalizeGain(input){
 if(!input||input.type!=='gain-stamina')throw new TypeError('not_gain_stamina');
 if(input.authoritative===false)throw new TypeError('not_authoritative');
 if(input.gainKind!==undefined&&input.gainKind!=='discrete')throw new TypeError('not_discrete_gain');
 if(typeof input.playerId!=='string'||!input.playerId.trim())throw new TypeError('invalid_player_id');
 if(!Number.isFinite(input.amount)||input.amount<=0)throw new TypeError('nonpositive_gain');
 if(!Number.isFinite(input.startedAt))throw new TypeError('invalid_started_at');
 const supplied=input.durationMs??input.duration??C.defaultDurationMs;
 if(!Number.isFinite(supplied))throw new TypeError('invalid_duration');
 const radius=input.radius??C.referenceRadius;
 if(!Number.isFinite(radius)||radius<=0)throw new TypeError('invalid_radius');
 const id=input.eventId??null;
 if(id!==null&&(typeof id!=='string'||!id.trim()))throw new TypeError('invalid_event_id');
 const key=JSON.stringify([input.playerId,id===null?'time':'id',id??input.startedAt]);
 return Object.freeze({type:'gain-stamina',playerId:input.playerId,eventId:id,key,startedAt:input.startedAt,
   amount:input.amount,durationMs:Math.max(C.minimumDurationMs,supplied),radius,
   source:input.source??'unspecified',gainKind:'discrete',seed:hash32(id??String(input.startedAt)),slot:0});
}
export function sampleGain(event,actorTimeMs){
 if(!Number.isFinite(actorTimeMs))throw new TypeError('invalid_actor_clock');
 const ageMs=actorTimeMs-event.startedAt,p=ageMs/event.durationMs,t=transfer(p);
 const active=ageMs>=0&&ageMs<event.durationMs;
 const phase=p<0?'pending':p<0.08?'intake_onset':p<0.38?'intake':p<C.morphWindow[1]?'deposit':p<0.90?'settled':p<1?'release':'ended';
 return Object.freeze({...event,ageMs,progress:p,active,phase,opacity:active?envelope(p):0,...t});
}
const bezier=(a,b,c,d,t)=>{const u=1-t;return a*u*u*u+3*b*u*u*t+3*c*u*t*t+d*t*t*t;};
export function reservePoint(lane,s,slot=0){
 const side=lane===0?-1:1, dy=(slot%3-1)*0.7, dz=(slot%4)*0.42;
 return [side*(5.3+1.65*Math.sin(Math.PI*s)),23+19*s+dy,6.5+1.15*Math.sin(Math.PI*s)+dz];
}
export function inletPoint(lane,s){
 const k=lane===0?[-48,-33,-19,-4.7,38,45,20,32,-13,-12,10,7.6]:[46,31,18,4.7,23,14,41,32,15,16,10,7.6];
 return [bezier(...k.slice(0,4),s),bezier(...k.slice(4,8),s),bezier(...k.slice(8,12),s)];
}
export function ribbonPoint(sample,lane,s){
 // Coordinates: actor-local game px, +Y up, +Z toward the camera.
 const a=sample.arrivals[lane].amount,m=sample.morph;
 const u=a*0.52+(1-a*0.52)*s, outer=inletPoint(lane,u),inner=reservePoint(lane,s,sample.slot);
 const radiusScale=Math.min(1,sample.radius/C.referenceRadius);
 const externalScale=sample.radius>=C.referenceRadius?sample.radius/C.referenceRadius:1;
 const p=outer.map((v,j)=>{const value=mix(j===0?v*externalScale:v,inner[j],m);return j===1?32+(value-32)*radiusScale:value*radiusScale;});
 return p;
}
export function ribbonWidth(sample,lane,s){
 const bulge=Math.sin(Math.PI*s)**0.7;
 const a=sample.arrivals[lane];
 const crest=Math.exp(-(((s-a.leadingPosition)/0.14)**2))*(1-a.amount);
 const body=mix(C.intakeHalfWidthPx*(.42+.70*bulge+.05*crest),C.reserveHalfWidthPx*(.85+.22*bulge),sample.morph);
 return body*Math.min(1,sample.radius/C.referenceRadius);
}
export function projectLocal(p){
 // Orthographic camera; no unannounced body shortening/oblique camera.
 return [p[0],-p[1],0.5-p[2]/512];
}
export function sampleMetrics(sample){
 let maxRadius=0,minWidth=Infinity,maxWidth=0;
 for(let lane=0;lane<2;lane++)for(let i=0;i<=C.segments;i++){
  const s=i/C.segments,p=ribbonPoint(sample,lane,s),w=ribbonWidth(sample,lane,s);
  maxRadius=Math.max(maxRadius,Math.hypot(p[0],p[1]-32,p[2])+w*C.glowScale);
  minWidth=Math.min(minWidth,2*w);maxWidth=Math.max(maxWidth,2*w);
 }
 return {maxRadius,minWidth,maxWidth,conservationResidual:sample.external+sample.charge-1};
}
