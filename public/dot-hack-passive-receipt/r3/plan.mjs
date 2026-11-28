export const TYPE='instant-hack-acquired', VERSION='dot-hack-passive-receipt-r3', LIFE=720;
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
 if(!finite(t)||t<0||t>=LIFE)return {phase:'off',open:0,alpha:0,core:0,folds:[0,0,0]};
 return {phase:t<107?'seat':t<322?'fold':t<433?'rest':'clear',
  folds:reduced?[1,1,1]:[s(77,187,t),s(130,255,t),s(194,320,t)],
  open:reduced?1:s(77,320,t),alpha:s(0,74,t)*(1-s(432,690,t)),
  core:s(68,215,t)*(1-s(329,575,t))};
}
