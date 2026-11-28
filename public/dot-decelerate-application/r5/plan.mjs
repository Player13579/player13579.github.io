export const TYPE='gravity-decelerate', VERSION='dot-decelerate-application-r5', LIFE=1140, STATUS_MS=8000, TIME_SCALE=.38;
const n=x=>typeof x==='number'&&Number.isFinite(x);
const s=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u)};
export function admit(e,{viewer,now}={}){
 if(!e||e.type!==TYPE||e.variant!==''||e.radius!==150||e.durationMs!==STATUS_MS)return null;
 if(typeof viewer!=='string'||!viewer||e.targetId!==viewer||typeof e.playerId!=='string'||!e.playerId)return null;
 if(typeof e.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(e.id)||e.targetX!=null||e.targetY!=null)return null;
 if(![e.x,e.y,e.at,now].every(n)||e.at<946684800000)return null;
 const age=now-e.at;if(age< -125||age>=LIFE)return null;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,age});
}
export function stateAt(t,{reduced=false}={}){
 if(!n(t)||t<=0||t>=LIFE)return {phase:'off',arrival:0,coupling:0,shift:0,localClockMs:0,alpha:0};
 const k=t-220, ramp=110;
 const integral=k<=0?t:220+(k<ramp?k-(1-TIME_SCALE)*k*k/(2*ramp):ramp*(1+TIME_SCALE)/2+(k-ramp)*TIME_SCALE);
 return {phase:t<220?'arrive':t<630?'retard':'clear',arrival:reduced?1:s(0,185,t),
  coupling:s(160,430,t),shift:reduced?0:Math.min(1,integral/680),localClockMs:integral,
  alpha:s(0,86,t)*(1-s(690,LIFE,t))};
}

export const FLOOR_SPEED_MPS=1.37, FLOOR_PERIOD_M=.47;
export function floorFlow(t,{reduced=false}={}){
 const p=stateAt(t,{reduced});
 if(p.alpha<=0)return {outer:0,local:0,mask:0};
 // These are preview phase integrals, not game movement or a visual duration readout.
 const normalMs=reduced?514:t, localMs=reduced?336:p.localClockMs;
 return {outer:normalMs*.001*FLOOR_SPEED_MPS,local:localMs*.001*FLOOR_SPEED_MPS,mask:p.alpha};
}
