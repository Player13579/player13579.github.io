export const VERSION='dot-teleport-scroll-receipt-r3', TYPE='teleport-map-scroll-acquired';
export const VISUAL_MS=900, FIRST_SOUND_MS=244;
const variants = new Set(['vending','mystery-box']);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(from,to,x)=>{const v=clamp((x-from)/(to-from));return v*v*(3-2*v)};
export function phaseAt(t){
 if(!Number.isFinite(t)||t<0||t>=VISUAL_MS)return 'off';
 return t<185?'roll':t<540?'retain':'clear';
}
export function receipt(event,{selfId,serverNow}={}){
 if(!event||event.type!==TYPE||!variants.has(event.variant)||typeof selfId!=='string'||!selfId.length||event.playerId!==selfId)return null;
 if(typeof event.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(event.id)||event.radius!==124)return null;
 if(![event.x,event.y,event.at,serverNow].every(Number.isFinite)||event.at<946684800000||serverNow<946684800000||event.at-serverNow>125)return null;
 const ageMs=serverNow-event.at;
 if(ageMs>=VISUAL_MS)return null;
 return Object.freeze({causeId:event.id,type:TYPE,ageMs,active:ageMs>=0,scope:'receipt-owner-only',x:event.x,y:event.y,at:event.at});
}
export function envelope(t,{reduced=false}={}){
 const phase=phaseAt(t);
 if(phase==='off')return Object.freeze({phase,lineProgress:0,darkBody:0,heat:0,drawPetal:false,soundBand:false});
 const fade=1-smooth(485,VISUAL_MS,t);
 // One cartographic patch folds into itself; a bulk receipt is one cue even
 // when a bulk transaction emits one receipt for multiple stored charges.
 return Object.freeze({phase,lineProgress:reduced?1:smooth(40,342,t),darkBody:smooth(0,68,t)*fade,
   heat:smooth(12,155,t)*(1-smooth(360,810,t)),drawPetal:true,soundBand:t>=FIRST_SOUND_MS&&t<FIRST_SOUND_MS+90});
}
