export const VERSION='mana-revision-astra-r05';
export const DURATION=1.4, LOOP=2.2, SPARK_ANGLE=-.39;
export const SOURCE=Object.freeze([52,-8]),RECEIVER=Object.freeze([13,-22]);
export const ARRIVALS=Object.freeze([.56,.76,.96]);
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const k=clamp((x-a)/(b-a));return k*k*(3-2*k);};
export function phaseAt(t){if(!Number.isFinite(t)||t<0||t>=DURATION)return'absent';if(t<.13)return'supply';if(t<.56)return'transport';if(t<.96)return'receive';if(t<1.18)return'absorb';return'settle';}
export function packetAt(i,t,{reduced=false,source=SOURCE,receiver=RECEIVER}={}){
 if(!Number.isInteger(i)||i<0||i>2||!Number.isFinite(t))throw new RangeError('packet');
 const arrival=ARRIVALS[i],start=arrival-.43,k=clamp((t-start)/.43),absorb=clamp((t-arrival)/.22);
 const length=Math.hypot(receiver[0]-source[0],receiver[1]-source[1]);
 const direction=length>0?[(receiver[0]-source[0])/length,(receiver[1]-source[1])/length]:[-1,0];
 const travel=k*k*(3-2*k);
 return {x:source[0]+(receiver[0]-source[0])*travel+direction[0]*12*absorb,
 y:source[1]+(receiver[1]-source[1])*travel+direction[1]*12*absorb-(reduced?1.5:5)*Math.sin(Math.PI*k),
 arrival,absorb,active:t>=start&&t<arrival+.22,energy:smooth(start,start+.05,t)*(1-smooth(arrival+.13,arrival+.22,t))};
}
export function verificationMode(search){return new URLSearchParams(search).has('verify');}
export function validateReceipt(e){return !!e&&e.type==='gain-mana'&&e.confirmed===true&&['sessionId','causeId','recipientId'].every(k=>typeof e[k]==='string'&&e[k].length>0)&&Number.isFinite(e.actualDelta)&&e.actualDelta>0&&Number.isFinite(e.startedAt)&&Array.isArray(e.source)&&Array.isArray(e.receiver)&&e.source.length===2&&e.receiver.length===2&&[...e.source,...e.receiver].every(Number.isFinite);}
export class ReceiptGate {
 constructor(){this.session=null;this.seen=new Set();}
 reset(id){this.session=id;this.seen.clear();}
 accept(e){if(!validateReceipt(e)||e.sessionId!==this.session)return null;const key=JSON.stringify([e.sessionId,e.causeId,e.recipientId]);if(this.seen.has(key))return null;this.seen.add(key);return Object.freeze({...e,source:Object.freeze([...e.source]),receiver:Object.freeze([...e.receiver]),key});}
}
