export const VERSION='dot-rational-mp-waiver-r5', LIFE=840;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='action-rational-free'||e.radius!==145||e.durationMs!==0||e.variant!==''||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,light:0,advance:0,clear:0};
 return {opacity:ease(0,100,t)*(1-ease(680,LIFE,t)),advance:reduced?1:ease(36,224,t),
  clear:reduced?0:ease(314,763,t),light:ease(38,168,t)*(1-ease(540,776,t))};
}
