export const version='inventory-item-transfer-out-astra62-r1';
export const lifetimeMs=1310;

const examples=Object.freeze({partial:[3,1],last:[1,1],batch:[3,3]});
export function initialCount(mode) { return Object.hasOwn(examples,mode) ? examples[mode][0] : 0; }
export function fixtureEvent(mode,id) {
  const [before,amount]=Object.hasOwn(examples,mode) ? examples[mode] : [3,1];
  return {kind:mode==='receive'?'transfer-in':'transfer-out',variant:mode==='credits'?'credits':'item',
    committed:mode!=='failed' && (Object.hasOwn(examples,mode)||['credits','receive','other'].includes(mode)),
    owner:mode==='other'?'other':'self',current:true,id, item:'fixture-parcel',
    before,amount,after:before-amount};
}

export function makeGate() {
  let last=0;
  return r=>{
    if(r?.kind!=='transfer-out'||r.variant!=='item'||r.committed!==true||r.owner!=='self'||
       r.current!==true||!Number.isSafeInteger(r.id)||r.id<=last) return null;
    if(r.item!=='fixture-parcel'||!Number.isInteger(r.before)||r.before<1||r.before>3||
       !Number.isInteger(r.amount)||r.amount<1||r.amount>r.before||r.after!==r.before-r.amount)return null;
    last=r.id;
    return Object.freeze({id:r.id,before:r.before,amount:r.amount,after:r.after});
  };
}
export function makeCue(rate,amount) {
  if(!Number.isFinite(rate)||rate<8000||rate>192000||!Number.isInteger(amount)||amount<1||amount>3)
    throw new RangeError('audio format');
  const pcm=new Float32Array(Math.ceil(rate*(0.74+(amount-1)*0.26)));
  const tau=2*Math.PI;
  for(let i=0;i<pcm.length;i++){
    const t=i/rate;
    let sum=0;
    for(let j=0;j<amount;j++){
      const u=t-(0.115+j*.26);
      const d=Math.min(1,Math.max(0,u/.32));
      const swish=u>=0&&u<.32?Math.sin(Math.PI*d)**2*Math.sin(tau*(260*u+270*u*u)):0;
      const v=Math.max(0,t-(.45+j*.26));
      const contact=Math.min(1,v/.005)*Math.exp(-36*v)*Math.max(0,Math.min(1,(.24-v)/.04));
      sum+=.049*swish+contact*(.116*Math.sin(tau*558*v)+.037*Math.sin(tau*829*v));
    }
    pcm[i]=sum;
  }
  return pcm;
}
