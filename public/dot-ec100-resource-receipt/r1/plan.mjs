export const TYPE='fighter-energy-destruction-milestone', VERSION='dot-ec100-resource-receipt-r1', LIFE=720;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.variant!=='100'||e.radius!==138||e.durationMs!==0)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(e.targetX!=null||e.targetY!=null||e.targetId)return null;
 if(![e.x,e.y,e.at,now].every(finite)||e.at<946684800000)return null;
 const age=now-e.at; if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!finite(t)||t<0||t>=LIFE)return {phase:'off',travel:0,alpha:0,join:0};
 return {phase:t<190?'draw':t<386?'seat':'clear',
  travel:reduced?1:s(34,253,t),
  alpha:s(0,72,t)*(1-s(378,695,t)),
  join:s(168,260,t)*(1-s(340,618,t))};
}
