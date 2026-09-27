import {LIMITS,clamp} from './profiles.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function unit(v){if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))return null;const l=Math.hypot(...v);return l>1e-8?v.map(x=>x/l):null;}
/**
 * PH2 ReflectionClosure。入力の法線/視線/光線/粗さ/F0/反射率はホストの実在面から取得する。
 * GGX + Smith + Schlick + diffuse。B channelへの量子化前に[0,1]へ制限する近似であり、
 * HDR鏡面材質の完全な再現器ではない。情報が不足した面は反射を0にする。
 */
export function receiverResponse(s){
  if(!s)return 0;const n=unit(s.normal),v=unit(s.view),l=unit(s.light);
  if(!n||!v||!l||![s.roughness,s.f0,s.albedo,s.occlusion].every(Number.isFinite))return 0;
  const nl=Math.max(0,dot(n,l)),nv=Math.max(0,dot(n,v));if(nl<=0||nv<=0)return 0;
  const h=unit(l.map((x,i)=>x+v[i]));if(!h)return 0;
  const nh=Math.max(0,dot(n,h)),vh=Math.max(0,dot(v,h));const a=clamp(s.roughness,.045,1)**2,a2=a*a;
  const D=a2/(Math.PI*(nh*nh*(a2-1)+1)**2);
  const g1=x=>2*x/(x+Math.sqrt(a2+(1-a2)*x*x));
  const f=clamp(s.f0)+(1-clamp(s.f0))*(1-vh)**5;
  const spec=D*g1(nl)*g1(nv)*f/Math.max(4*nl*nv,1e-8);
  const diffuse=(1-f)*clamp(s.albedo)/Math.PI;
  return clamp((diffuse+spec)*nl*Math.PI*clamp(s.occlusion));
}
/** ヒット対象の位置/顔/法線を生成しない。sampleReceiver=nullなら近傍光も0。 */
export function makeReceiverMask({authorizePixel,sampleReceiver,protectPixel=()=>false,size=LIMITS.maskSize}){
  if(typeof authorizePixel!=='function'||typeof sampleReceiver!=='function'||!Number.isInteger(size)||size!==LIMITS.maskSize)throw new TypeError('明示的なmask入力とsize=128が必要');
  const out=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;const u=(x+.5)/size,v=(y+.5)/size;
    if(protectPixel(u,v)===true){out[i+3]=255;continue;}
    if(authorizePixel(u,v)!==true)continue;
    out[i]=255;
    const s=sampleReceiver(u,v);
    if(s&&Number.isFinite(s.coverage)){out[i+1]=Math.round(clamp(s.coverage)*255);out[i+2]=Math.round(receiverResponse(s)*255);}
  }
  return out;
}
