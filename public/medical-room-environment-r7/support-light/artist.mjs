// GPT-6.1-Sol. 医療室r6: 原画のガラス開口を入射境界とする環境光。
export const ID='sol61-medical-vfx-r4-environment-r6';
export const ORIGINAL=Object.freeze({path:'medical-room-vfx-r4.png',width:1164,height:1351,sha256:'9f3fe2fb6772daa8104dcf97abe1bf87e5254a17af4c629dd0d3b5d7088ffa7e'});
export const DESIGN=Object.freeze({periodMs:22000,sourceRadiance:12,minimumTransmission:.35,
 aperture:Object.freeze({x:1004,y0:632,y1:916,sampleCount:8,sigma0:22,angularSlope:.16,directionSlope:.26,falloffLength:570}),
 floor:Object.freeze({bounds:[183,184,981,1253],diffuseTransfer:.32,color:Object.freeze([1,.96,.87])}),
 obstacles:Object.freeze([[331,413,592,1080],[195,108,489,343],[773,106,1008,360]].map(Object.freeze)),
 metal:Object.freeze({F0:.82,roughness:.24,indirectTransfer:.065}),
 vinyl:Object.freeze({F0:.04,roughness:.36,diffuseTransfer:.11}),
 observations:Object.freeze({bloomGain:.22,blurScale:.5,blurRadiusOriginalPx:14,ghostGain:.025,ghostSigmaOriginalPx:[31,72],ghostAxisFactor:.72}),
 sourceCenter:Object.freeze([1004,774]),opticalCenter:Object.freeze([582,675]),audio:'none'});
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function transmission(ms){
 if(!Number.isFinite(ms)||ms<0)throw Error('finite nonnegative canonical environmentTimeMs required');
 const t=(ms%22000)/1000;
 if(t<2.4)return .35;
 if(t<6.8)return .35+.65*smooth(2.4,6.8,t);
 if(t<11.4)return 1;
 if(t<17.8)return 1-.65*smooth(11.4,17.8,t);
 return .35;
}
export function segmentIntersectsRect(a,b,r){
 let low=0,high=1;
 for(let k=0;k<2;k++){
  const d=b[k]-a[k],lo=r[k],hi=r[k+2];
  if(Math.abs(d)<1e-9){if(a[k]<lo||a[k]>hi)return false;continue;}
  const t0=(lo-a[k])/d,t1=(hi-a[k])/d;low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));
  if(low>high)return false;
 }
 return high>1e-5&&low<1-1e-5;
}
export function transportAt(p,{occlude=true,sourceX=1004}={}){
 const dx=sourceX-p[0];if(dx<=0)return 0;
 const sigma=22+.16*dx;let sum=0,weight=0;
 for(let i=0;i<8;i++){
  const u=(i+.5)/8,y=632+284*u,w=Math.sin(Math.PI*u)**2;
  weight+=w;
  if(occlude&&DESIGN.obstacles.some(r=>segmentIntersectsRect([sourceX,y],p,r)))continue;
  const dy=p[1]-y-.26*dx;
  sum+=w*Math.exp(-.5*(dy/sigma)**2)*22/sigma;
 }
 return sum/weight/(1+(dx/570)**2);
}
export function floorMask(p){return p[0]>=183&&p[0]<=981&&p[1]>=184&&p[1]<=1253&&!DESIGN.obstacles.some(r=>p[0]>=r[0]&&p[0]<=r[2]&&p[1]>=r[1]&&p[1]<=r[3]);}
export function diffuseIncrement(baseLinear,p,ms,visibility=1){
 if(!floorMask(p))return baseLinear.map(()=>0);
 const incident=12*transmission(ms)*clamp(visibility,0,1)*.32*transportAt(p);
 return baseLinear.map((c,i)=>c*incident*DESIGN.floor.color[i]);
}
// CPU側の材質検査。GPU実画素の受入ではない。
const normalize=v=>{const l=Math.hypot(...v);return v.map(c=>c/l);};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function ggx(n,rough,F0){
 const l=normalize([.84,-.20,.50]),v=[0,0,1],h=normalize(l.map((q,i)=>q+v[i]));
 const nl=Math.max(dot(n,l),0),nv=Math.max(dot(n,v),1e-4),nh=Math.max(dot(n,h),0),vh=Math.max(dot(v,h),0);
 const a2=rough**4,D=a2/(Math.PI*(nh*nh*(a2-1)+1)**2),k=(rough+1)**2/8;
 const G=nl/(nl*(1-k)+k)*nv/(nv*(1-k)+k),F=F0+(1-F0)*(1-vh)**5;
 return D*F*G/(4*nv+1e-4);
}
// 六vec4。座標は原画pixel、scene viewportはbacking pixel。callerがfitを一度決定。
export function uniforms({viewportPx,imageRectPx,environmentTimeMs,sourceVisibility=1,effect=true,obs=true,reducedMotion=false}){
 if(!Array.isArray(viewportPx)||viewportPx.length!==2||!Array.isArray(imageRectPx)||imageRectPx.length!==4||![...viewportPx,...imageRectPx,environmentTimeMs,sourceVisibility].every(Number.isFinite)||viewportPx.some(v=>v<=0)||imageRectPx[2]<=0||imageRectPx[3]<=0||environmentTimeMs<0||sourceVisibility<0||sourceVisibility>1)throw Error('invalid medical r6 viewport/clock/source');
 const phase=reducedMotion?1:transmission(environmentTimeMs);
 return new Float32Array([...viewportPx,environmentTimeMs/1000,effect?1:0,...imageRectPx,phase,sourceVisibility,obs?1:0,0,1164,1351,1004,774,582,675,.22,.025,14,31,72,.72]);
}
// Input-clock authority only. No actor rate, wall fallback, synthetic source or audio.
export function acceptedFrameInput(raw){
 if(!raw||raw.visible!==true||raw.roomId!=='medical'||raw.current!==true)return null;
 if(!Number.isFinite(raw.environmentTimeMs)||raw.environmentTimeMs<0)throw Error('environment clock absent');
 return Object.freeze({roomId:'medical',environmentTimeMs:raw.environmentTimeMs,basisHash:ORIGINAL.sha256});
}
