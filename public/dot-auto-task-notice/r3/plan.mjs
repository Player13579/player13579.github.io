export const TYPE='action-task',VERSION='dot-auto-task-notice-r3',LIFE=1040;
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||e.radius!==105||e.durationMs!==0||e.variant!=='hacker-auto'||!['download','upload'].includes(e.mode))return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![e.x,e.y,e.at,now].every(numeric)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!numeric(t)||t<=0||t>=LIFE)return {stage:'off',spread:0,hold:0,alpha:0};
 return {stage:t<190?'arrive':t<530?'hold':'clear',spread:reduced?1:s(145,410,t),hold:s(35,230,t)*(1-s(450,770,t)),alpha:s(0,105,t)*(1-s(660,LIFE,t))};
}
