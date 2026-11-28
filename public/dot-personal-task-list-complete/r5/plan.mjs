export const VERSION='dot-personal-task-list-complete-r5',LIFE=900;
const id=s=>typeof s==='string'&&s.length>0&&s.length<=160;
const mode=s=>s==='download'||s==='upload';
function indexed(s){
 if(!s||s.phase!=='playing'||!id(s.roomId)||!id(s.selfId)||!Number.isSafeInteger(s.round)||s.round<1||!Number.isFinite(s.battleStartedAt)||s.battleStartedAt<=0||!Array.isArray(s.tasks)||s.tasks.length<1||s.tasks.length>30)return null;
 const m=new Map();
 for(const t of s.tasks){
  if(!t||!id(t.id)||!id(t.stationId)||!mode(t.type)||typeof t.done!=='boolean'||m.has(t.id))return null;
  m.set(t.id,t);
 }
 return m;
}
export function admit(x){
 if(!x||x.source!=='same-session-state'||x.stale!==false||!Number.isSafeInteger(x.sequence)||x.sequence<1||x.currentSequence!==x.sequence||!Number.isFinite(x.observedAt)||x.observedAt<0)return null;
 const {before:b,after:a,event:e}=x, lhs=indexed(b),rhs=indexed(a);
 if(!lhs||!rhs||lhs.size!==rhs.size||b.roomId!==a.roomId||b.selfId!==a.selfId||b.round!==a.round||b.battleStartedAt!==a.battleStartedAt)return null;
 let final=null;
 for(const [k,v] of lhs){
  const u=rhs.get(k);if(!u||!u.done||v.stationId!==u.stationId||v.type!==u.type)return null;
  if(!v.done){if(final)return null;final=v;}
 }
 if(!final||!e||e.type!=='action-task'||!['','hacker-auto'].includes(e.variant)||e.radius!==105||e.playerId!==a.selfId||e.targetId!==final.stationId||e.mode!==final.type||!Number.isFinite(b.serverNow)||!Number.isFinite(a.serverNow)||a.serverNow<b.serverNow||!Number.isFinite(e.at)||e.at<b.serverNow||e.at>a.serverNow)return null;
 return Object.freeze({round:a.round,sequence:x.sequence,at:x.observedAt});
}
const clamp=(t)=>Math.max(0,Math.min(1,t));
const smooth=(a,b,t)=>{const w=clamp((t-a)/(b-a));return w*w*(3-2*w)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {alpha:0,seam:1,lum:0};
 return {alpha:smooth(0,140,t)*(1-smooth(560,LIFE,t)),seam:reduced?0:smooth(195,515,t),lum:smooth(30,210,t)*(1-smooth(410,680,t))};
}
