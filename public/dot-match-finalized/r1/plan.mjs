export const VERSION='dot-match-finalized-r1',LIFE=1020;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=190;
const point=(s)=>s&&id(s.roomId)&&id(s.selfId)&&Number.isSafeInteger(s.round)&&s.round>0;
export function admit(o){
 if(!o||o.source!=='same-session-state'||!Number.isSafeInteger(o.sequence)||o.sequence<1||o.sequence!==o.currentSequence||o.stale!==false)return null;
 const {before,after,observedAt}=o;
 if(!point(before)||!point(after)||before.roomId!==after.roomId||before.selfId!==after.selfId||before.round!==after.round)return null;
 if(!['playing','meeting'].includes(before.phase)||after.phase!=='ended'||!['attackers','defenders','idea'].includes(after.winner))return null;
 if(!Number.isFinite(observedAt)||observedAt<0)return null;
 return Object.freeze({round:after.round,sequence:o.sequence,at:observedAt});
}
const s=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {phase:'off',alpha:0,pinch:0,rest:0};
 return {phase:t<255?'frame':t<568?'rest':'clear',alpha:s(0,130,t)*(1-s(632,LIFE,t)),pinch:reduced?1:s(72,515,t),rest:s(321,515,t)*(1-s(582,763,t))};
}
