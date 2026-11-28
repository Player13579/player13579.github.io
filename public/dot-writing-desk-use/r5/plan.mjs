export const TYPE='object-radioConsole', VERSION='dot-writing-desk-use-r5', DESK='v302-comms-radioConsole-1', LIFE=610;
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
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,settle:0,pulse:0,frontAlpha:0,capAlpha:0};
 const alpha=s(0,71,t)*(1-s(294,LIFE,t));
 const frontAlpha=reduced?.86:.86*s(46,143,t)*(1-.33*s(320,572,t));
 const capAlpha=reduced?.65:s(3,59,t)*(1-.64*s(123,280,t));
 return {phase:t<90?'contact':t<248?'front-receives':t<382?'held-on-face':'clear',alpha,
  settle:reduced?.79:s(50,204,t),pulse:s(23,109,t)*(1-s(251,601,t)),frontAlpha,capAlpha};
}
