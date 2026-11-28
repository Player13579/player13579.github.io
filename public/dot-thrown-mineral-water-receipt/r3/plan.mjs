export const VERSION='dot-thrown-mineral-water-receipt-r3', LIFE=1060;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='gain-stamina'||e.effectKind!=='stamina'||e.radius!==82||e.durationMs!==1500||e.variant!=='mineral-water:thrown'||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,reach:0,light:0,drain:1};
 const fold=ease(125,733,t);
 return {opacity:ease(0,145,t)*(1-ease(610,LIFE,t)),reach:fold,
   light:ease(72,250,t)*(1-ease(411,798,t)),drain:reduced?.26:fold};
}
