export const VERSION='dot-gbo-magazine-commit-r2', TYPE='gbo-overdrive', LIFE=1450;
const match=/^magazine-commit:weapon:(handgun|smg|assault|sniper)$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function admit(e,{owner,now}={}){
 if(!e||e.type!==TYPE||typeof e.variant!=='string'||!match.test(e.variant)||e.radius!==175||e.durationMs!==LIFE)return null;
 if(typeof owner!=='string'||!owner||e.playerId!==owner||typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id))return null;
 if(![now,e.at,e.x,e.y].every(finite)||e.at<946684800000)return null;
 const age=now-e.at;if(age < -125 || age>=LIFE)return null;
 return Object.freeze({id:e.id,x:e.x,y:e.y,at:e.at,age});
}
const s=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function phaseAt(t,{reduced=false}={}){
 if(!finite(t)||t<0||t>=LIFE)return {phase:'off',stamp:0,pressure:0,alpha:0};
 return {phase:t<130?'seat':t<415?'stamp':t<865?'release':'clear',
  stamp:reduced?1:s(65,360,t),
  pressure:s(24,174,t)*(1-s(320,675,t)),
  alpha:s(0,76,t)*(1-s(628,1355,t))};
}
