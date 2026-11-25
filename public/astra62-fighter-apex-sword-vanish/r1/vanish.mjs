export const version='fighter-apex-sword-vanish-astra62-r1';
export const lifetimeMs=980;
const sites=Object.freeze({left:Object.freeze([-43,0]),right:Object.freeze([43,0])});
export function actorSite(mode){
  if(mode==='right')return sites.right;
  if(['left','guard','reflect','friendly','iai'].includes(mode))return sites.left;
  return null;
}
export function fixtureEvent(mode,id){
  const result=mode==='guard'?'guarded':mode==='reflect'?'reflected':mode==='friendly'?'friendlyFirePenalty':'destroyed';
  return {id,kind:mode==='iai'?'iai-destruction-attack':'fighter-energy-destruction-slash',variant:result,
    committed:['left','right','guard','reflect','friendly','iai','hidden'].includes(mode),
    current:true,viewerAllowed:mode!=='hidden',visibleBefore:mode!=='hidden',
    sameSubject:true,noBody:mode!=='iai',point:actorSite(mode)??sites.left};
}
export function makeGate(){
  let last=0;
  return e=>{
    if(e?.kind!=='fighter-energy-destruction-slash'||e.variant!=='destroyed'||e.committed!==true||
       e.current!==true||e.viewerAllowed!==true||e.visibleBefore!==true||e.sameSubject!==true||
       e.noBody!==true||!Number.isSafeInteger(e.id)||e.id<=last)return null;
    const p=e.point;
    if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||
       Math.abs(p[0])>88||Math.abs(p[1])>22)return null;
    last=e.id;
    return Object.freeze({id:e.id,x:p[0],y:p[1]});
  };
}
export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  const a=new Float32Array(Math.ceil(rate*.83)),tau=2*Math.PI;
  for(let i=0;i<a.length;i++){
    const t=i/rate;
    const edge=Math.min(1,t/.021)*Math.exp(-7.3*t);
    const u=Math.max(0,Math.min(1,(t-.11)/.44));
    const fold=t>.11&&t<.55?Math.sin(Math.PI*u)**2:0;
    const tail=Math.max(0,Math.min(1,(.78-t)/.08));
    a[i]=tail*(edge*.072*Math.sin(tau*543*t)+fold*(.073*Math.sin(tau*(326*t-96*t*t))+.022*Math.sin(tau*613*t)));
  }
  return a;
}
