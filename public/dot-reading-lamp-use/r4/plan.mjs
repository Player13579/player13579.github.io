export const TYPE='object-readingLamp', VERSION='dot-reading-lamp-use-r4', LAMP='v302-archive-readingLamp-3', LIFE=760;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const prefix='map-object:'+LAMP+':object_use_';
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.radius!==100||e.variant!==''||e.durationMs!==0||
   e.effectKind!=='mana'||e.objectId!==LAMP||e.targetId||e.targetX!=null||e.targetY!=null)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[0-9a-f]{12}$/i.test(e.id)||
   typeof e.objectCausalId!=='string'||!e.objectCausalId.startsWith(prefix)||!/^[0-9a-f]{12}$/.test(e.objectCausalId.slice(prefix.length)))return null;
 if(![e.at,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age<0||age>=LIFE)return null;
 return Object.freeze({id:e.objectCausalId,at:e.at,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,near:0,far:0};
 if(reduced){
   const shared=s(0,120,t)*(1-s(410,LIFE,t));
   return {phase:'soft',alpha:shared,near:shared,far:shared*.94};
 }
 const near=s(0,113,t)*(1-s(235,490,t)),far=.97*s(135,300,t)*(1-s(387,LIFE,t));
 return {phase:t<135?'near':t<490?'pair':'far',alpha:Math.max(near,far),near,far};
}
