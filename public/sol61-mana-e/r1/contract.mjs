export const VERSION='mana-gpt61sol-r1-from-astra-r07';
export const DURATION=1.8, LOOP=2.6, SPARK_ANGLE=-.39;
export const SOURCE=Object.freeze([52,-8]),RECEIVER=Object.freeze([9.1,-21.6]);
export const ARRIVALS=Object.freeze([.60,.84,1.08]);
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const k=clamp((x-a)/(b-a));return k*k*(3-2*k);};
export function phaseAt(t){if(!Number.isFinite(t)||t<0||t>=DURATION)return'absent';if(t<.14)return'supply';if(t<.60)return'transport';if(t<1.08)return'receive';if(t<1.38)return'absorb';if(t<1.52)return'settle';return'release';}
export function hermite(a,b,va,vb,k,seconds){const k2=k*k,k3=k2*k;return a*(2*k3-3*k2+1)+va*seconds*(k3-2*k2+k)+b*(-2*k3+3*k2)+vb*seconds*(k3-k2);}
export function packetAt(i,t,{reduced=false,source=SOURCE,receiver=RECEIVER}={}){
 if(!Number.isInteger(i)||i<0||i>2||!Number.isFinite(t))throw new RangeError('packet');
 const arrival=ARRIVALS[i],start=arrival-.46,k=clamp((t-start)/.46),absorb=clamp((t-arrival)/.30);
 const v=[-35,-5],body=[receiver[0]-11.1,receiver[1]-6.4];
 const position=source.map((s,j)=>t<arrival?hermite(s,receiver[j],0,v[j],k,.46):hermite(receiver[j],body[j],v[j],0,absorb,.30));
 if(t<arrival)position[1]-=(reduced?20:60)*k*k*(1-k)*(1-k);
 return {x:position[0],y:position[1],arrival,absorb,active:t>=start&&t<arrival+.30,energy:smooth(start,start+.09,t)*(1-smooth(arrival+.12,arrival+.30,t))};
}
export function verificationMode(search){return new URLSearchParams(search).has('verify');}
export function validateReceipt(e){return !!e&&e.type==='gain-mana'&&e.confirmed===true&&!['natural-tick','initial-seed','snapshot'].includes(e.kind)&&['sessionId','causeId','recipientId'].every(k=>typeof e[k]==='string'&&e[k].length>0)&&Number.isFinite(e.actualDelta)&&e.actualDelta>0&&Number.isFinite(e.startedAt)&&Array.isArray(e.source)&&Array.isArray(e.receiver)&&e.source.length===2&&e.receiver.length===2&&[...e.source,...e.receiver].every(Number.isFinite);}
export class ReceiptGate {
 constructor(){this.session=null;this.seen=new Set();}
 reset(id){this.session=id;this.seen.clear();}
 accept(e){if(!validateReceipt(e)||e.sessionId!==this.session)return null;const key=JSON.stringify([e.sessionId,e.causeId,e.recipientId]);if(this.seen.has(key))return null;this.seen.add(key);return Object.freeze({...e,source:Object.freeze([...e.source]),receiver:Object.freeze([...e.receiver]),key});}
}
