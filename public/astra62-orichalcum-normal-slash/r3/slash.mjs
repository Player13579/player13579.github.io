export const version='orichalcum-normal-slash-astra62-r3';
export const lifetimeMs=980;
export function fixtureEvent(mode,id) {
  return {id,kind:mode==='wave'?'fighter-shockwave':'fighter-slash',
    variant:mode==='strong'?'enhance-1':mode==='gbo'?'gbo-tenfold':'enhance-0',
    committed:['right','left','strong','gbo','wave','private'].includes(mode),
    owner:'self',visible:mode!=='private',current:true,facing:mode==='left'?-1:1};
}
export function makeGate(){
  let last=0;
  return e=>{
    if(e?.kind!=='fighter-slash'||e.variant!=='enhance-0'||e.owner!=='self'||
       e.committed!==true||e.current!==true||e.visible!==true||
       !Number.isSafeInteger(e.id)||e.id<=last)return null;
    if(e.facing!==1&&e.facing!==-1)return null;
    last=e.id; return Object.freeze({id:e.id,facing:e.facing});
  };
}
export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  let seed=317263,lo=0,hi=0;
  const a=new Float32Array(Math.ceil(rate*.65));
  const l=1-Math.exp(-2*Math.PI*350/rate);
  for(let i=0;i<a.length;i++){
    const t=i/rate;
    const phase=Math.max(0,Math.min(1,(t-.17)/.29));
    const env=Math.sin(Math.PI*phase)**2;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed/2147483648-1;
    const h=1-Math.exp(-2*Math.PI*(1350+2600*env)/rate);
    lo+=l*(n-lo);hi+=h*(n-hi);
    const tail=Math.max(0,Math.min(1,(.53-t)/.05));
    a[i]=tail*env*(.23*(hi-lo)+.047*Math.sin(2*Math.PI*(290*t+390*t*t)));
  }
  return a;
}
