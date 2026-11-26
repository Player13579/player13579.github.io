export const version='credit-transfer-out-astra62-r2';
export const lifetimeMs=1800;

export function fixtureEvent(mode,id){
  return {id,kind:mode==='incoming'?'transfer-in':mode==='donation'?'action-smartphone':'transfer-out',
    variant:mode==='item'?'item':mode==='donation'?'donation-rational':'credits',
    owner:mode==='foreign'?'other':'self',current:mode!=='stale',committed:['sent','item','incoming','donation','foreign','stale'].includes(mode)};
}
export function makeGate(){
  let last=0;
  return e=>{
    if(e?.kind!=='transfer-out'||e.variant!=='credits'||e.owner!=='self'||e.current!==true||
       e.committed!==true||!Number.isSafeInteger(e.id)||e.id<=last)return null;
    last=e.id;
    return Object.freeze({id:e.id});
  };
}

export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  const a=new Float32Array(Math.ceil(rate*1.02)),turn=2*Math.PI;
  for(let i=0;i<a.length;i++){
    const t=i/rate;
    const u=Math.max(0,t-.465);
    const impact=Math.min(1,u/.0025)*Math.exp(-u*44);
    const v=t-.67;
    const release=v>0&&v<.21?Math.sin(Math.PI*v/.21)**2*Math.sin(turn*(382*v+195*v*v)):0;
    const tail=Math.max(0,Math.min(1,(.96-t)/.05));
    a[i]=tail*(impact*(.116*Math.sin(turn*186*u)+.066*Math.sin(turn*449*u))+.042*release);
  }
  return a;
}
