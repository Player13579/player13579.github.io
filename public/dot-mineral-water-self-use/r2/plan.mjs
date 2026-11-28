export const VERSION='dot-mineral-water-self-use-r2', LIFE=1060;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='gain-stamina'||e.effectKind!=='stamina'||e.radius!==82||e.durationMs!==1500||e.variant!=='mineral-water:use'||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,lift:0,tilt:0,light:0,pass:0};
 const start=ease(0,72,t), lower=ease(282,740,t), soft=ease(666,994,t);
 return {opacity:ease(0,92,t)*(1-ease(717,LIFE,t)),lift:reduced?.71*start*(1-soft):start*(1-lower),
 tilt:reduced?.73*start*(1-soft):start*(1-ease(240,598,t)),
 light:ease(264,426,t)*(1-ease(535,803,t)),pass:reduced?.52:ease(283,652,t)};
}
