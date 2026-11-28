export const VERSION='dot-match-finalized-r5',LIFE=1020;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=190;
const pos=x=>Number.isSafeInteger(x)&&x>0;
const keys=['roomId','selfId','round','start','generation'];
const point=s=>s&&id(s.roomId)&&id(s.selfId)&&pos(s.round)&&pos(s.start)&&pos(s.generation);
export function admit(o){
 if(!o||o.source!=='same-session-state'||!pos(o.sequence)||o.sequence!==o.currentSequence||o.stale!==false)return null;
 const {before,after,observedAt}=o;
 if(!point(before)||!point(after)||keys.some(k=>before[k]!==after[k]))return null;
 if(!['playing','meeting'].includes(before.phase)||after.phase!=='ended'||!['attackers','defenders','idea'].includes(after.winner))return null;
 if(!Number.isFinite(observedAt)||observedAt<after.start)return null;
 return Object.freeze({id:JSON.stringify(keys.map(k=>after[k])),at:observedAt});
}
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,narrow:0};
 return {phase:t<190?'settle':t<660?'gather':'quiet',
 alpha:s(0,100,t)*(1-s(reduced?324:465,LIFE,t)),narrow:reduced?0:s(190,742,t)};
}
