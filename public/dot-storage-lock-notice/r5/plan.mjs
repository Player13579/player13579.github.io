export const VERSION='dot-storage-lock-notice-r5', LIFE=920;
const text=s=>typeof s==='string'&&s.length>0&&s.length<=128;
export function admit(e,viewer,now){
 if(!e||e.type!=='emp-storage-lock'||e.variant!=='storage'||e.radius!==105||e.durationMs!==7000||!text(viewer)||e.playerId!==viewer||!text(e.id))return null;
 if(!Number.isFinite(now)||!Number.isFinite(e.at)||e.at<0||e.at>now||now-e.at>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,age:now-e.at});
}
const ramp=(a,b,t)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {closure:1,light:0,alpha:0};
 const tClose=ramp(82,322,t);
 return {closure:reduced?1:tClose,light:ramp(30,185,t)*(1-ramp(325,685,t)),alpha:ramp(0,100,t)*(1-ramp(590,LIFE,t))};
}
