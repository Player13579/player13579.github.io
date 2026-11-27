export const TYPE='action-warp', VERSION='dot-scroll-warp-arrival-r1', LIFE=640;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.variant!=='arrival'||e.radius!==125||e.durationMs!==0)return null;
 if(typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id)||typeof owner!=='string'||!owner||e.playerId!==owner)return null;
 if(e.targetX!=null||e.targetY!=null||e.targetId)return null;
 if(![now,e.at,e.x,e.y].every(finite)||e.at<946684800000)return null;
 const age=now-e.at;
 if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function stateAt(t,{reduced=false}={}){
 if(!finite(t)||t<0||t>=LIFE)return {phase:'off',fold:0,alpha:0,touch:0};
 return {phase:t<160?'unfold':t<320?'contact':'clear',
 fold:reduced?1:smooth(22,215,t),
 alpha:smooth(0,65,t)*(1-smooth(301,620,t)),
 touch:smooth(118,229,t)*(1-smooth(289,498,t))};
}
