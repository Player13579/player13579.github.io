// GPT-6.1-Sol: 武器切替の創作5/5。実銃の性能・発射・充電状態を表さない。
export const VERSION='weapon-switch-kind-sol61-r4';
export const EDITION=Object.freeze({number:5,limit:5});
export const TIMING=Object.freeze({onset:.06,arrivalStart:.12,contact:.31,seated:.40,soundEnd:.58,visualEnd:.78,previewIntervalMs:900});
export const ABI=Object.freeze({bytes:64,passes:3,worldTargets:['rgba16float','rgba16float'],observerTaps:9});
export const PROFILES=Object.freeze([
 {kind:'HG',colorName:'琥珀',rgb:[1.8,.82,.18],start:.12,duration:.22,delay:[0,0,0],distance:.255,quintic:false,extra:'receiver-seat'},
 {kind:'SMG',colorName:'緑青',rgb:[.18,1.8,.78],start:.12,duration:.208,delay:[0,.016,.032],distance:.28,quintic:false,extra:'ordered-seam-pair'},
 {kind:'AR',colorName:'青',rgb:[.20,.86,1.8],start:.12,duration:.22,delay:[0,.02,0],distance:.28,quintic:false,extra:'balanced-front-rear'},
 {kind:'SR',colorName:'紫',rgb:[1.25,.30,1.8],start:.12,duration:.24,delay:[0,0,0],distance:.30,quintic:true,extra:'inward-barrel-glint'},
 {kind:'TSR',colorName:'朱赤',rgb:[1.8,.40,.55],start:.12,duration:.224,delay:[.016,0,.016],distance:.26,quintic:false,extra:'paired-interface-light'}
].map(p=>Object.freeze({...p,rgb:Object.freeze(p.rgb),delay:Object.freeze(p.delay)})));
export const SLICE_BOUNDARIES=Object.freeze([-.02,.12]);
const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v);};
export const pulse=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
function profile(v){if(!Number.isInteger(v)||v<0||v>4)throw new RangeError('destination variant 0..4');return PROFILES[v];}
export function sliceIndex(y){return y<-.02?0:y<.12?1:2;}
export function rowShift(variant,row,t,{reducedMotion=false,motionDetail=true}={}){
  const p=profile(variant);if(!Number.isInteger(row)||row<0||row>2||!Number.isFinite(t))throw new RangeError('row/time');
  const start=motionDetail?p.start+p.delay[row]:.12,duration=motionDetail?p.duration:.24;
  const n=clamp((t-start)/duration),a=motionDetail&&p.quintic?n*n*n*(n*(n*6-15)+10):n*n*(3-2*n);
  return (row===1?1:-1)*(1-a)*(reducedMotion?.06:motionDetail?p.distance:.28);
}
// 分割数・運動を武器種別に変える。完成形の gunDistance は共通の登録輪郭。
export function worldProjection(x,y,v,t,aa,{reducedMotion=false,motionDetail=true}={}){
  const p=profile(v),row=sliceIndex(y),dx=x-.035;
  const seam=(distance)=>(1-smooth(.31,.40,t))*(1-smooth(.00252,.00630,distance));
  if(!motionDetail||v===1)return {x:dx-rowShift(v,row,t,{reducedMotion,motionDetail}),y,mask:1-seam(Math.min(Math.abs(y+.02),Math.abs(y-.12)))};
  const n=clamp((t-p.start)/p.duration),a=p.quintic?n*n*n*(n*(n*6-15)+10):n*n*(3-2*n);
  if(v===0){const angle=reducedMotion?0:-.16*(1-a),c=Math.cos(angle),s=Math.sin(angle),dy=y-(reducedMotion?.04:.20)*(1-a);return {x:c*dx+s*dy,y:-s*dx+c*dy,mask:1};}
  if(v===2)return {x:dx-(dx<0?-1:1)*(reducedMotion?.045:.22)*(1-a),y,mask:1-seam(Math.abs(dx))};
  if(v===3)return {x:dx,y,mask:1-smooth(-.36+1.05*a-aa,-.36+1.05*a+aa,dx)};
  return {x:dx,y:y-(dx<0?-1:1)*(reducedMotion?.04:.16)*(1-a),mask:1-seam(Math.abs(dx))};
}
const box=(x,y,cx,cy,rx,ry)=>{const dx=Math.abs(x-cx)-rx,dy=Math.abs(y-cy)-ry;return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0);};
export function gunDistance(x,y,v){
  profile(v);let barrel=[.19,.045],receiver=[.12,.08],bx=.22;
  if(v===1){barrel=[.23,.05];receiver=[.16,.09];bx=.25;}
  if(v===2){barrel=[.30,.04];receiver=[.17,.085];bx=.29;}
  if(v===3){barrel=[.35,.028];receiver=[.14,.07];bx=.30;}
  if(v===4){barrel=[.14,.07];receiver=[.10,.09];bx=.17;}
  let d=Math.min(box(x,y,0,0,...receiver),box(x,y,bx,-.025,...barrel),box(x,y,-.045,.135,.045,.105));
  if(v===1||v===2)d=Math.min(d,box(x,y,.09,.15,.036,.085));
  if(v===2||v===3)d=Math.min(d,box(x,y,-.245,.01,.095,.045));
  if(v===3)d=Math.min(d,box(x,y,.075,-.105,.11,.028));return d;
}
const spot=(x,y,cx,cy,rx,ry)=>Math.exp(-(((x-cx)/rx)**2)-((y-cy)/ry)**2);
export function extraEmission(x,y,v,t){
  profile(v);
  if(v===0)return 3.2*spot(x,y,-.02,.015,.065,.042)*pulse(t,.385,.400,.425,.455);
  if(v===1)return 2.4*(spot(x,y,-.045,-.02,.065,.026)*pulse(t,.37,.385,.402,.420)+spot(x,y,.08,.12,.065,.026)*pulse(t,.402,.416,.434,.455));
  if(v===2)return 2.3*(spot(x,y,-.22,.01,.070,.026)+spot(x,y,.22,-.025,.070,.024))*pulse(t,.385,.4,.45,.49);
  if(v===3){const f=smooth(.36,.49,t);return 3.0*spot(x,y,.45-.36*f,-.025,.045,.024)*pulse(t,.36,.39,.46,.505);}
  return 2.7*(spot(x,y,-.035,-.02,.045,.024)+spot(x,y,.06,.12,.045,.024))*pulse(t,.388,.4,.43,.468);
}
// CPU近似は契約検査用。実WGSL/画素の品質証明ではない。
export function sampleWorld({x,y,variant,ageSeconds,h=64,mainOn=true,dockOn=true,sourceOn=true,extraOn=true,motionDetail=true,reducedMotion=false,faceOn=true}){
  const p=profile(variant),t=ageSeconds;
  if(![x,y,t,h].every(Number.isFinite)||h<=0)throw new TypeError('finite coordinates/time and positive scale');
  if(t<0||t>=.78||Math.abs(x)>.92||Math.abs(y)>.52)return {rgba:[0,0,0,0],emission:[0,0,0]};
  const aa=Math.max(1/h,.002),q=worldProjection(x,y,variant,t,aa,{reducedMotion,motionDetail});
  const shape=gunDistance(q.x,q.y,variant),onset=smooth(.06,.14,t),fade=1-smooth(.57,.78,t);
  const coverage=(1-smooth(-aa,aa,shape))*q.mask*onset*fade*Number(mainOn);
  const outline=(1-smooth(0,.019,Math.abs(shape)))*q.mask*onset*fade*Number(mainOn);
  const retract=smooth(0,.16,t),dockDistance=Math.min(box(x,y,-.15-.16*retract,.04,.045,.12),box(x,y,.15+.16*retract,.04,.045,.12));
  const dock=(1-smooth(-aa,aa,dockDistance))*(1-smooth(.13,.23,t))*Number(dockOn);
  const energy=(outline*(.55+1.7*pulse(t,.32,.37,.43,.51))+Number(extraOn)*extraEmission(q.x,q.y,variant,t)*coverage+.25*dock)*Number(sourceOn);
  const emission=p.rgb.map(c=>c*energy),face=p.rgb.map(c=>c*.17*coverage*Number(faceOn)+c*.06*dock);
  return {rgba:[...face.map((c,i)=>c+emission[i]),Math.max(coverage*.82,outline,dock*.76)],emission};
}
export function planFrame({receipt,scope,ageSeconds,viewport,settings={}}){
  const keys=['roomId','ownerId','leaseId','generation','deviceGeneration','targetGeneration'];
  const idsValid=['roomId','ownerId','leaseId'].every(k=>typeof scope?.[k]==='string'&&scope[k].length>0);
  const generationsValid=['generation','deviceGeneration','targetGeneration'].every(k=>Number.isSafeInteger(scope?.[k])&&scope[k]>=0);
  const current=scope?.current===true&&idsValid&&generationsValid&&keys.every(k=>receipt?.[k]===scope[k]);
  const valid=receipt&&typeof receipt.id==='string'&&receipt.id.length>0&&Number.isInteger(receipt.variant)&&receipt.variant>=0&&receipt.variant<5&&[receipt.x,receipt.y].every(Number.isFinite);
  if(!viewport||![viewport.width,viewport.height,viewport.centerX,viewport.centerY,viewport.h].every(Number.isFinite)||viewport.width<=0||viewport.height<=0||viewport.h<=0)throw new TypeError('positive configured viewport');
  const active=Boolean(current&&valid&&Number.isFinite(ageSeconds)&&ageSeconds>=0&&ageSeconds<.78);
  const bit=(k)=>Number(settings[k]!==false);
  const u=new Float32Array([viewport.width,viewport.height,viewport.centerX,viewport.centerY,active?ageSeconds:.78,viewport.h,valid?receipt.variant:0,Number(settings.reducedMotion===true),active?bit('mainOn'):0,active?bit('dockOn'):0,active?bit('sourceOn'):0,bit('observerOn'),bit('extraOn'),bit('motionDetail'),bit('faceOn'),0]);
  return Object.freeze({active,uniforms:u,causeId:active?receipt.id:null,version:VERSION,pixelMeasured:false});
}
export function planObserver({frames,viewport,observerOn=true}){
  if(!Array.isArray(frames)||frames.length>4)throw new RangeError('at most four real receipts');
  if(!viewport||![viewport.width,viewport.height,viewport.h].every(Number.isFinite)||viewport.width<=0||viewport.height<=0||viewport.h<=0)throw new TypeError('configured viewport');
  const live=frames.filter(f=>f.active),margin=Math.max(1,Math.round(viewport.h*.025));
  let x0=viewport.width,y0=viewport.height,x1=0,y1=0;
  for(const frame of live){const u=frame.uniforms;x0=Math.min(x0,u[2]-.92*u[5]-margin);x1=Math.max(x1,u[2]+.92*u[5]+margin);y0=Math.min(y0,u[3]-.52*u[5]-margin);y1=Math.max(y1,u[3]+.52*u[5]+margin);}
  if(!live.length)x0=x1=y0=y1=0;
  else {x0=Math.min(viewport.width,Math.max(0,x0));y0=Math.min(viewport.height,Math.max(0,y0));x1=Math.max(0,Math.min(viewport.width,x1));y1=Math.max(0,Math.min(viewport.height,y1));}
  const uniforms=new Float32Array([viewport.width,viewport.height,(x0+x1)/2,(y0+y1)/2,0,viewport.h,Math.max(0,(x1-x0)/2),Math.max(0,(y1-y0)/2),0,0,0,Number(observerOn),0,0,0,0]);
  return Object.freeze({uniforms,bounds:[x0,y0,x1,y1],active:live.length>0,taps:9});
}
export const PASS_PLAN=Object.freeze([
 Object.freeze({name:'world',entry:'fs',drawVertices:3,attachments:['main rgba16float premultiplied','source rgba16float additive radiance'],clearBothToZero:true}),
 Object.freeze({name:'observer',entry:'fs',drawVertices:3,inputs:['same-frame main','same-frame source','dedicated union-bound observer uniform']}),
 Object.freeze({name:'composite',implementation:'existing host composite, unchanged display encoding'})
]);
