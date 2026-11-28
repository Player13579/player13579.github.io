export const TYPE='object-radioConsole', VERSION='dot-writing-desk-use-r2', DESK='v302-comms-radioConsole-1', LIFE=610;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const prefix='map-object:'+DESK+':object_use_';
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.radius!==100||e.variant!==''||e.durationMs!==0||
   e.effectKind!=='luckBoost'||e.objectId!==DESK||e.targetId||e.targetX!=null||e.targetY!=null)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[0-9a-f]{12}$/i.test(e.id)||
   typeof e.objectCausalId!=='string'||!e.objectCausalId.startsWith(prefix)||!/^[0-9a-f]{12}$/.test(e.objectCausalId.slice(prefix.length)))return null;
 if(![e.at,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age<0||age>=LIFE)return null;
 return Object.freeze({id:e.objectCausalId,at:e.at,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,settle:0,pulse:0};
 return {phase:t<250?"extend":t<435?"rest":"clear",alpha:s(0,80,t)*(1-s(420,LIFE,t)),
  settle:reduced?1:s(34,245,t),pulse:s(38,149,t)*(1-s(390,710,t))};
}
