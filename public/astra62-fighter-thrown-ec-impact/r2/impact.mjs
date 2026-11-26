export const version='fighter-thrown-ec-impact-astra62-r2';
export const lifetimeMs=880;
export const boundWorld=180;
const sites=Object.freeze({west:Object.freeze([-51,4]),east:Object.freeze([48,-3])});
export function marker(mode){
  if(mode==='east')return sites.east;
  if(mode==='west'||mode==='ordinary')return sites.west;
  return null;
}
export function fixtureEvent(mode,id){
  return {id,kind:mode==='blade'?'fighter-shockwave':'fighter-energy-impact',variant:'one-body-damage',
    current:true,permitted:mode!=='hidden',settled:['west','east','ordinary','hidden','blade'].includes(mode),
    hasAttachment:mode!=='ordinary',sameThrow:mode!=='mismatch',
    point:marker(mode)??sites.west,worldRadius:boundWorld};
}
export function makeGate(){
  let last=0;
  return e=>{
    if(e?.kind!=='fighter-energy-impact'||e.variant!=='one-body-damage'||e.current!==true||
       e.permitted!==true||e.settled!==true||e.hasAttachment!==true||e.sameThrow!==true||
       !Number.isSafeInteger(e.id)||e.id<=last)return null;
    const v=e.point;
    if(!Array.isArray(v)||v.length!==2||!Number.isFinite(v[0])||!Number.isFinite(v[1])||
       Math.abs(v[0])>84||Math.abs(v[1])>10||e.worldRadius!==boundWorld)return null;
    last=e.id;
    return Object.freeze({id:e.id,x:v[0],y:v[1]});
  };
}
export function makeCue(rate){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
  const a=new Float32Array(Math.ceil(rate*.86)),tau=2*Math.PI;
  for(let i=0;i<a.length;i++){
    const t=i/rate;
    const rise=Math.min(1,t/.014);
    const front=rise*Math.exp(-7.4*t);
    const phase=tau*(126*t+8.4*(1-Math.exp(-9*t)));
    const ridge=Math.sin(phase)+.29*Math.sin(phase*1.88);
    const tail=Math.min(1,Math.max(0,(.79-t)/.11));
    a[i]=.13*tail*front*ridge;
  }
  return a;
}
