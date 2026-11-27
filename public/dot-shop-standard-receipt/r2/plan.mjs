export const TYPE='action-vending',VERSION='dot-shop-standard-receipt-r2',LIFE=780;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.radius!==90||e.variant!==''||e.durationMs!==0||e.targetX!=null||e.targetY!=null||e.targetId)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![e.x,e.y,e.at,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,settle:0,pulse:0};
 return {phase:t<165?'lift':t<420?'seat':'clear',alpha:s(0,83,t)*(1-s(435,LIFE,t)),
  settle:reduced?1:s(69,330,t),pulse:s(192,322,t)*(1-s(365,598,t))};
}
