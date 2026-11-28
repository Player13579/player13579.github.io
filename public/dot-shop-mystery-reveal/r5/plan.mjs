export const TYPE='mystery-reveal',VERSION='dot-shop-mystery-reveal-r5',LIFE=1040;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.variant!==''||e.radius!==145||e.durationMs!==0||e.targetId||e.targetX!=null||e.targetY!=null)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![e.x,e.y,e.at,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,turn:0,gloss:0};
 return {phase:t<170?'appear':t<523?'turn':'settle',alpha:s(0,133,t)*(1-s(699,LIFE,t)),
  turn:reduced?.63:s(161,532,t),gloss:s(58,239,t)*(1-s(560,864,t))};
}
