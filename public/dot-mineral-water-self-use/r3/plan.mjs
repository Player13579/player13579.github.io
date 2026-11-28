export const VERSION='dot-mineral-water-self-use-r3', LIFE=1060;
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
export function admit(x){
 const e=x?.event;
 if(x?.source!=='authoritative-event-replay'||x.phase!=='playing'||x.stale!==false||!id(x.selfId)||!id(e?.id)||e.type!=='gain-stamina'||e.effectKind!=='stamina'||e.radius!==82||e.durationMs!==1500||e.variant!=='mineral-water:use'||e.playerId!==x.selfId||!Number.isFinite(e.at)||e.at<0||!Number.isFinite(x.observedAt)||x.observedAt<e.at||x.observedAt-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const clamp=t=>Math.max(0,Math.min(1,t));
const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {opacity:0,lift:0,turn:0,light:0};
 const inP=ease(0,168,t), outP=ease(730,980,t);
 const turn=reduced?.56:ease(185,444,t)*(1-ease(565,730,t));
 return {opacity:ease(45,150,t)*(1-ease(775,1010,t)),lift:reduced?.84*ease(0,90,t)*(1-ease(920,LIFE,t)):inP*(1-outP),
 turn,light:ease(201,397,t)*(1-ease(555,779,t))};
}
