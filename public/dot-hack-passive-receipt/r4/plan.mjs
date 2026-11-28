export const TYPE='instant-hack-acquired', VERSION='dot-hack-passive-receipt-r4', LIFE=720;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function admit(e,{owner,now}={}) {
 if(!e||e.type!==TYPE||e.variant!=='vending'||e.radius!==124||e.durationMs!==0)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(e.targetX!=null||e.targetY!=null||e.targetId)return null;
 if(![e.x,e.y,e.at,now].every(finite)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,x:e.x,y:e.y,at:e.at,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!finite(t)||t<0||t>=LIFE)return {phase:'off',open:0,alpha:0,core:0};
 return {phase:t<164?'present':t<610?'stow':'clear',
  open:reduced?0:s(164,617,t),alpha:s(0,100,t)*(1-s(reduced?375:500,690,t)),
  core:s(32,152,t)*(1-s(248,505,t))};
}
