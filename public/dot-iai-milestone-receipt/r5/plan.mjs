export const VERSION='dot-iai-milestone-receipt-r5', TYPE='instant-iai-acquired';
export const VISUAL_MS=820, FIRST_SOUND_MS=244;
const variants = new Set(['ec-500']);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(from,to,x)=>{const v=clamp((x-from)/(to-from));return v*v*(3-2*v)};
export function phaseAt(t){
 if(!Number.isFinite(t)||t<0||t>=VISUAL_MS)return 'off';
 return t<199?'receive':t<378?'settle':'release';
}
export function receipt(event,{selfId,serverNow}={}){
 if(!event||event.type!==TYPE||!variants.has(event.variant)||typeof selfId!=='string'||!selfId.length||event.playerId!==selfId)return null;
 if(typeof event.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(event.id)||event.radius!==122)return null;
 if(![event.x,event.y,event.at,serverNow].every(Number.isFinite)||event.at<946684800000||serverNow<946684800000||event.at-serverNow>125)return null;
 const ageMs=serverNow-event.at;
 if(ageMs>=VISUAL_MS)return null;
 return Object.freeze({causeId:event.id,type:TYPE,ageMs,active:ageMs>=0,scope:'receipt-owner-only',x:event.x,y:event.y,at:event.at});
}
export function envelope(t,{reduced=false}={}){
 const phase=phaseAt(t);
 if(phase==='off')return Object.freeze({phase,extent:0,intake:0,settled:0,front:0});
 return Object.freeze({phase,extent:reduced?.68:smooth(38,267,t),
  front:reduced?.67:smooth(42,263,t),intake:smooth(0,85,t)*(1-smooth(243,419,t)),
  settled:smooth(155,279,t)*(1-smooth(305,VISUAL_MS,t))});
}
