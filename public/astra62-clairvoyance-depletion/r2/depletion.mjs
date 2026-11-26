export const version='clairvoyance-depletion-astra62-r2';
export const lifetimeMs=1070;

export function makeGate() {
  let last=0;
  return receipt=>{
    if (receipt?.event!=='clairvoyance-ended' || receipt.reason!=='mana-drain-exhausted' ||
        receipt.subject!=='self' || receipt.current!==true || receipt.committed!==true ||
        !Number.isSafeInteger(receipt.id) || receipt.id<=last) return null;
    if (receipt.wasActive!==true || receipt.active!==false || receipt.remainingMana!==0) return null;
    last=receipt.id;
    return Object.freeze({id:receipt.id});
  };
}

export function fixtureEvent(mode,id) {
  return {event:mode==='snapshot'?'state':'clairvoyance-ended',
    reason:mode==='depleted'||mode==='foreign'?'mana-drain-exhausted':mode==='manual'?'manual-off':
      mode==='teleport'?'teleport':null,
    subject:mode==='foreign'?'other':'self',current:true,committed:true,id,
    wasActive:mode!=='snapshot',active:false,remainingMana:0};
}

export function makeCue(rate) {
  if(!Number.isFinite(rate)||rate<8000||rate>192000) throw new RangeError('sample rate');
  const pcm=new Float32Array(Math.ceil(rate*0.91));
  const tau=2*Math.PI;
  for(let i=0;i<pcm.length;i++){
    const t=i/rate;
    const a=Math.max(0,1-t/0.38);
    const glow=Math.min(1,t/0.028)*a*a;
    const phase=tau*(518*t-155*t*t);
    const u=Math.max(0,t-0.61);
    const close=Math.min(1,u/0.007)*Math.exp(-28*u);
    const tail=Math.max(0,Math.min(1,(0.86-t)/0.05));
    pcm[i]=tail*(glow*(0.095*Math.sin(phase)+0.025*Math.sin(phase*2))+
      close*(0.064*Math.sin(tau*284*u)+0.025*Math.sin(tau*417*u)));
  }
  return pcm;
}
