export const VERSION='dot-enhance-activation-r4', LIFE=1200;
const id=(s,n=256)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
export function admit(i){
 const e=i?.event,p=i?.actor;
 if(i?.source!=='visible-magic-event-replay'||!['playing','meeting'].includes(i.phase)||i.stale!==false||
   e?.type!=='enhance-activation'||e.radius!==0||e.markerCount!==1||e.durationMs!==LIFE||
   !id(e.id)||!e.id.startsWith('magic_')||!id(e.variant)||!id(p?.id)||e.playerId!==p.id||
   p.alive!==true||p.ejected!==false||p.inVent!==false||p.invisible!==false||
   ![i.observedAt,e.at].every(Number.isFinite)||e.at<0||i.observedAt<e.at||i.observedAt-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at});
}
const ease=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {alpha:0,reach:0,contact:0,vanish:1};
 return {alpha:ease(0,152,t)*(1-ease(727,LIFE,t)),reach:reduced?.80:ease(196,623,t),
   contact:ease(52,205,t)*(1-ease(286,729,t)),vanish:ease(727,LIFE,t)};
}
