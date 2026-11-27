export const VERSION='dot-mineral-water-self-use-r1', LIFE=1060;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='gain-stamina'||e.effectKind!=='stamina'||e.radius!==82||e.durationMs!==1500||e.variant!=='mineral-water:use'||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,lift:0,tilt:0,light:0};
 const lift=ease(12,390,t)*(1-ease(645,1020,t)), tilt=ease(250,493,t)*(1-ease(620,860,t));
 return {opacity:ease(0,130,t)*(1-ease(812,LIFE,t)),lift:reduced?.72*lift:lift,tilt:reduced?.65*tilt:tilt,light:ease(170,480,t)*(1-ease(621,910,t))};
}
