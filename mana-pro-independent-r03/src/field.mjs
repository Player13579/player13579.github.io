import {SHAPE,TIME,PALETTE} from './shape-data.mjs';
import {BOUNDS} from './contract.mjs';
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
export const add3=(a,b)=>a.map((v,i)=>v+b[i]);
export const mul3=(a,s)=>a.map(v=>v*s);
/** これは表示用の保存量。実ゲームのmanaBefore/Afterを変更しない。 */
export function stateAt(p){
  const phase=clamp(p), emitted=smooth(TIME.emitStart,TIME.emitEnd,phase), received=smooth(TIME.emitStart,TIME.emitEnd,phase-TIME.transitDelay);
  const q=clamp((phase-TIME.emitStart)/(TIME.emitEnd-TIME.emitStart));
  return {phase,source:1-emitted,transit:Math.max(0,emitted-received),received,emitted,
    flux:6*q*(1-q),settle:smooth(TIME.settleStart,TIME.settleEnd,phase),active:p>=0&&p<1,
    // 3つの領域を縮小・順次消去せず、最終フレームまで同じ支持形を保持して同時終了。
    envelope:p>=0&&p<1?(1-.16*smooth(.85,1,phase))*(.88+.12*smooth(0,.035,phase)):0};
}
export function sdPolygon(p,verts){
  let d=Infinity,inside=false;
  for(let i=0,j=verts.length-1;i<verts.length;j=i++){
    const a=verts[i],b=verts[j],ex=b[0]-a[0],ey=b[1]-a[1],vx=p[0]-a[0],vy=p[1]-a[1];
    const h=clamp((vx*ex+vy*ey)/(ex*ex+ey*ey));
    d=Math.min(d,Math.hypot(vx-h*ex,vy-h*ey));
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return d*(inside?-1:1);
}
export function domainsAt(x,y,aa=1){
  const s=sdPolygon([x,y],SHAPE.source),t=sdPolygon([x,y],SHAPE.transport),r=sdPolygon([x,y],SHAPE.receiver);
  const cov=d=>1-smooth(-aa,aa,d);
  return {s,t,r,source:cov(s),transport:cov(t),receiver:cov(r),union:Math.max(cov(s),cov(t),cov(r))};
}
const srgb=x=>x<=.0031308?12.92*x:1.055*Math.pow(Math.max(0,x),1/2.4)-.055;
export const displayColor=c=>c.map(v=>clamp(srgb(Math.max(0,v)/(1+.16*Math.max(0,v)))));
/** GPUとは別のCPU解析用。GPU実画素・知覚合格の代用にはしない。 */
export function sampleField(x,y,p,{aa=1,reducedMotion=false,layers=31}={}){
  const st=stateAt(p),zero={rgb:[0,0,0],alpha:0,primary:0,light:[0,0,0],bloom:[0,0,0],fill:0};
  if(!st.active||x<BOUNDS.minX||x>BOUNDS.maxX||y<BOUNDS.minY||y>BOUNDS.maxY)return zero;
  const d=domainsAt(x,y,aa),sil=Math.max(d.source*(!!(layers&1)),d.transport*(!!(layers&2)),d.receiver*(!!(layers&4)));
  let color=[0,0,0],a=0;
  const over=(c,cov)=>{if(cov<=0)return;const next=cov+a*(1-cov);color=color.map((v,i)=>(c[i]*cov+v*a*(1-cov))/Math.max(next,1e-7));a=next;};
  // 搬送面は空のときも幅26~36wuの有色媒体。密度だけが進む。
  const s=clamp((-y-10)/53),localTime=p-TIME.transitDelay*s;
  const fluxT=clamp((localTime-TIME.emitStart)/(TIME.emitEnd-TIME.emitStart));
  const localFlux=4*fluxT*(1-fluxT);
  const insideFace=smooth(0,6,-d.t);
  const band=reducedMotion ? .58 :(.5+.5*Math.cos(2*Math.PI*(s*2.2-p*5.1)));
  const filledPath=smooth(TIME.emitStart-.012,TIME.emitStart+.020,localTime);
  let tc=mix3([.015,.060,.13],PALETTE.transportLit,clamp(.10+filledPath*(.40+localFlux*(.16+.28*band))));
  tc=mul3(tc,.46+.54*insideFace);
  const front=Math.exp(-Math.pow((localTime-TIME.emitStart-.012)/.025,2))*insideFace;
  tc=add3(tc,mul3([.28,.35,.38],front*.80));
  if(layers&2)over(tc,d.transport);
  // 広い供給体。外形は維持し、中心へ減る内側の明るい面で残量を示す。
  const sourceFace=smooth(.5,5,-d.s);
  const reservoir=(1-smooth(6+35*st.source,10+35*st.source,Math.abs(x)))*(1-smooth(3,7,Math.abs(y+5)));
  let sc=mix3(PALETTE.source,PALETTE.sourceLit,reservoir*(.54+.35*st.source));
  sc=mul3(sc,.40+.60*sourceFace);
  const footHot=Math.exp(-((x/12)**2+((y+7)/4.5)**2))*(.38+.42*st.source);
  sc=add3(sc,mul3([.56,.62,.65],footHot));
  if(layers&1)over(sc,d.source);
  // 受領形を初めから大きく確保。容量の境界と増える内部の面積を別々に描く。
  const wall=1-smooth(2.6,6,-d.r),fillY=SHAPE.receiverFloor+(SHAPE.receiverCeiling-SHAPE.receiverFloor)*st.received;
  const fill=smooth(fillY-1.2,fillY+1.2,y)*(1-wall*.65);
  const receiveFace=smooth(0,3.4,-d.r);
  let rc=mix3(PALETTE.receiver,PALETTE.rim,wall*.86);
  const ageDepth=clamp((y-fillY)/42);
  let fc=mix3(PALETTE.fresh,PALETTE.stored,clamp(.24+ageDepth*.9));
  const terrace=.92+.08*Math.cos((y+60)*.38);fc=mul3(fc,terrace*(1-.11*st.settle));
  rc=mix3(rc,fc,fill*receiveFace);
  const meniscus=Math.exp(-Math.pow((y-fillY)/1.9,2))*receiveFace*st.received;
  rc=add3(rc,mul3([.34,.40,.44],meniscus*.48));
  const focus=Math.exp(-Math.pow(x/mix(36,13,st.settle),2)-Math.pow((y-mix(-70,-83,st.settle))/11,2))*fill*receiveFace*st.settle;
  rc=add3(rc,mul3([.14,.09,.19],focus)); // 内部放射の収束。受領済み面積や接続形は縮小しない。
  if(layers&4)over(rc,d.receiver);
  const envelope=st.envelope;
  const sourceLight=Math.exp(-Math.pow(Math.max(0,d.s)/7.4,2))*(.65+.35*st.source);
  const transportLight=Math.exp(-Math.pow(Math.max(0,d.t)/5.5,2))*(.24+.42*filledPath+.18*localFlux);
  const receiveLight=Math.exp(-Math.pow(Math.max(0,d.r)/7.4,2))*(.36+.64*st.received);
  const clip=smooth(0,3,Math.min(x-BOUNDS.minX,BOUNDS.maxX-x,y-BOUNDS.minY,BOUNDS.maxY-y));
  const light=add3(add3(mul3([.06,.14,.40],sourceLight),mul3([.04,.24,.26],transportLight)),mul3([.24,.10,.38],receiveLight));
  const bloom=add3(add3(mul3([.006,.012,.026],sourceLight),mul3([.004,.022,.023],transportLight)),mul3([.018,.006,.027],receiveLight));
  return {rgb:color,alpha:a*.965*envelope,primary:sil,light:mul3(light,envelope*clip*(!!(layers&8))),bloom:mul3(bloom,envelope*clip*(!!(layers&16))),fill:fill*d.receiver};
}
export function composePixel(x,y,p,{background='dark',...opts}={}){
  const sample=sampleField(x,y,p,opts),bg=PALETTE[background];
  let c=bg.map((v,i)=>v*(1+Math.min(.45,sample.light[i]))+sample.bloom[i]);
  c=c.map((v,i)=>sample.rgb[i]*sample.alpha+v*(1-sample.alpha));
  return displayColor(c);
}
