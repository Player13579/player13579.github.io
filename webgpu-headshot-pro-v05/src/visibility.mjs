import {LIMITS} from './contract.mjs';
const unit=v=>{if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))return null;const l=Math.hypot(...v);return l>1e-8?v.map(x=>x/l):null;};
/** 既存の受光面だけ。新しい対象/床を作らず、見えない面や光路は係数0。 */
export function surfaceResponse(surface){
  if(!surface||surface.present!==true||surface.visible!==true||surface.lightPathClear!==true)return 0;
  const n=unit(surface.normal),l=unit(surface.toSource);if(!n||!l)return 0;
  const reflectance=surface.diffuseReflectance;
  if(!Number.isFinite(reflectance)||reflectance<0||reflectance>1)return 0;
  return Math.max(0,n.reduce((s,x,i)=>s+x*l[i],0))*reflectance;
}
/** sample(p): 現在frameのホスト権限。R=可視,G=既存面反射係数,B=実在する光路,A=保護域。 */
export function makeVisibilityMask(sample){
  if(typeof sample!=='function')throw new TypeError('現在frameのmask callbackが必要');
  const size=LIMITS.maskSize,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let s;try{s=sample([2*(x+.5)/size-1,1-2*(y+.5)/size]);}catch{s=null;}
    const i=(y*size+x)*4,allowed=s?.visible===true&&s?.protected!==true;
    data[i]=allowed?255:0;data[i+3]=s?.protected===true?255:0;
    if(allowed){data[i+1]=Math.round(surfaceResponse(s.surface)*255);data[i+2]=s?.surface?.lightPathClear===true?255:0;}
  }
  return data;
}
