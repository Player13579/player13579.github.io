export const TYPE='action-warp',VERSION='dot-scroll-warp-departure-r5',LIFE=760;
const DEPARTURE_MAX_AGE=920;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.radius!==125||e.durationMs!==0||e.variant!==''||e.targetId)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![e.x,e.y,e.at,e.targetX,e.targetY,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=DEPARTURE_MAX_AGE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {stage:'off',spread:0,hold:0,alpha:0};
 return {stage:t<240?'register':t<530?'vacate':'clear',
  spread:reduced?0:s(170,620,t),hold:s(138,273,t)*(1-s(420,710,t)),alpha:s(0,122,t)*(1-s(470,LIFE,t))};
}
