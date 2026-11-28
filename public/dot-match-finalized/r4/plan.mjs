export const VERSION='dot-match-finalized-r4',LIFE=1020;
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
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,top:0};
 return {phase:t<165?'reveal':t<740?'clear':'rest',
 alpha:s(0,105,t)*(1-s(reduced?315:750,LIFE,t)),top:reduced?0:s(162,755,t)};
}
