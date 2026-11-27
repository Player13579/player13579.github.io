export const VERSION='dot-rational-mp-waiver-r1', LIFE=840;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='action-rational-free'||e.radius!==145||e.durationMs!==0||e.variant!==''||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,aperture:.5,light:0,open:0};
 const phase=ease(95,490,t);
 return {opacity:ease(0,112,t)*(1-ease(510,LIFE,t)),open:ease(20,175,t)*(1-ease(480,645,t)),aperture:reduced?.48:.22+.61*phase,light:ease(80,340,t)*(1-ease(440,650,t))};
}
