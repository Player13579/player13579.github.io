export const VERSION = 'mana-revision-astra-r03';
export const DURATION = 1.5;
export const LOOP = 2.3;
export const ARRIVALS = Object.freeze([0.59, 0.77, 0.95]);
export const SPARK_ANGLE = -0.39;
export const SOURCE = Object.freeze([-52, -8]);
export const RECEIVER = Object.freeze([-3, -31]);
export const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
export function smooth(a,b,x) { const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); }
export function phaseAt(t) {
  if (!Number.isFinite(t) || t<0 || t>=DURATION) return 'absent';
  if(t<0.2) return 'source';
  if(t<0.59) return 'transport';
  if(t<0.95) return 'arrival-accumulation';
  if(t<1.24) return 'received';
  return 'settle';
}
export function parcelAt(index,t,reduced=false) {
  const start=0.17+index*0.18, arrival=ARRIVALS[index];
  const u=clamp((t-start)/(arrival-start));
  const s=u*u*(3-2*u), bend=(reduced?2:8)*Math.sin(Math.PI*u);
  return {x:SOURCE[0]+(RECEIVER[0]-SOURCE[0])*s,
    y:SOURCE[1]+(RECEIVER[1]-SOURCE[1])*s-bend,
    progress:u, active:t>=start && t<arrival,
    energy:smooth(start,start+.055,t)*(1-smooth(arrival-.045,arrival+.045,t))};
}
export function accumulation(t) { return ARRIVALS.reduce((sum,a)=>sum+smooth(a-.025,a+.115,t),0)/3; }
export function receiptKey(e) { return `${e.sessionId}\u0000${e.causeId}\u0000${e.recipientId}`; }
export function validateReceipt(e) {
  return !!e && e.type==='gain-mana' && e.confirmed===true &&
    ['sessionId','causeId','recipientId'].every(k=>typeof e[k]==='string' && e[k].length>0) &&
    Number.isFinite(e.actualDelta) && e.actualDelta>0 && Number.isFinite(e.startedAt) &&
    e.source?.length===2 && e.receiver?.length===2 && [...e.source,...e.receiver].every(Number.isFinite);
}
// No guessed source or guessed amount: a future game adapter must supply both.
export class ReceiptGate {
  constructor() { this.session=null; this.seen=new Set(); }
  reset(sessionId) { this.session=sessionId; this.seen.clear(); }
  accept(e) {
    if(!validateReceipt(e) || e.sessionId!==this.session) return null;
    const key=receiptKey(e); if(this.seen.has(key)) return null;
    this.seen.add(key);
    return Object.freeze({...e,source:Object.freeze([...e.source]),receiver:Object.freeze([...e.receiver]),key});
  }
}
export function verificationMode(search) { return new URLSearchParams(search).has('verify'); }
