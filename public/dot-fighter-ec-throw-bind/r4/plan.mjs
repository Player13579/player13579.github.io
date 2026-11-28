export const TYPE='fighter-energy-release',VERSION='dot-fighter-ec-throw-bind-r4',LIFE=540;
const num=x=>typeof x==='number'&&Number.isFinite(x);
export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||typeof e.variant!=='string'||!/^throw:remaining-ec-(0|[1-9][0-9]{0,5})$/.test(e.variant)||e.radius!==92||!Number.isInteger(e.durationMs)||e.durationMs<240||e.durationMs>920||e.targetId)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![e.x,e.y,e.at,e.targetX,e.targetY,now].every(num)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=Math.min(e.durationMs,LIFE))return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age,liveMs:Math.min(e.durationMs,LIFE)});
}
export function stateAt(t,liveMs=LIFE,{reduced=false}={}){
 if(!num(t)||t<=0||t>=liveMs)return {phase:'off',alpha:0,fold:0,shift:0};
 const x=t/liveMs;
 return {phase:x<.33?'draw':x<.69?'hold':'clear',
  alpha:smooth(0,.16,x)*(1-smooth(.60,1,x)),
  fold:smooth(.07,.58,x),
  shift:reduced?0:smooth(.08,.47,x)*(1-smooth(.53,.89,x))};
}
