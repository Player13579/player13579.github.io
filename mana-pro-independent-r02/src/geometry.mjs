/**
 * CPU参照用の解析場。プレビュー/ゲームのfallbackではない。
 * WGSLと同じGEOMETRY/PHASEを参照し、採用造形の断面・面積・接続を検査する。
 * 数値検査やこの参照像を実GPU画素・芸術的合格と呼ばない。
 */
import {GEOMETRY as G,BOUNDS,PHASE} from './contract.mjs';
import {smooth,clamp01,lerp,routePoint,routeRadius,evaluatePhase,boundedLobe,sampleLightAtWorld} from './phase.mjs';
export const coverage=(d,aa)=>1-smooth(-aa,aa,d);
const empty=()=>({color:[0,0,0],emission:[0,0,0],opacity:0,density:0,distance:1e6});
const mix=(a,b,t)=>a.map((n,i)=>lerp(n,b[i],t));
const ellipse=(x,y,rx,ry)=>(Math.hypot(x/rx,y/ry)-1)*Math.min(rx,ry);
export function sourceShape(s) {
  const size=Math.sqrt(s.source);
  return {cx:G.sourceX,cy:G.sourceY,rx:G.sourceRadiusX*(.38+.62*size),ry:G.sourceRadiusY*(.46+.54*size)};
}
export function sourceField(x,y,s,aa) {
  if(s.source<=1e-5||s.fade<=0)return empty();
  const a=sourceShape(s),qx=x-a.cx,qy=y-a.cy,d=ellipse(qx,qy,a.rx,a.ry);
  const fill=coverage(d,aa)*smooth(0,.012,s.source)*s.fade;
  const inner=coverage(d+G.edgeWidth,aa),face=clamp01(.62-qy/a.ry*.28);
  const core=boundedLobe(qx,qy,-a.rx*.37,-1,a.rx*.63,a.ry*.70);
  const color=mix([.12,.047,.014],mix([.45,.18,.024],[.90,.53,.105],face),inner);
  const density=.50+1.35*s.source;
  return {color,opacity:fill*(1-Math.exp(-3.0*density)),
    emission:[.94,.86,.46].map(c=>c*core*(.58+.30*s.source)),density,distance:d};
}
/** 前端と後端を持つ連続面。点列/残像/独立粒子を作らない。 */
export function ribbonInfo(x,y,s) {
  let distance=1e6,v=0;
  for(let i=0;i<G.routeSegments;i++){
    const a=lerp(s.tail,s.front,i/G.routeSegments),b=lerp(s.tail,s.front,(i+1)/G.routeSegments);
    const p=routePoint(a),q=routePoint(b),dx=q.x-p.x,dy=q.y-p.y;
    const h=clamp01(((x-p.x)*dx+(y-p.y)*dy)/Math.max(.00001,dx*dx+dy*dy));
    const t=lerp(a,b,h),d=Math.hypot(x-p.x-h*dx,y-p.y-h*dy)-routeRadius(t);
    if(d<distance){distance=d;v=t;}
  }
  return {distance,v,radius:routeRadius(v)};
}
export function transportField(x,y,s,aa) {
  if(s.front<=.00001||s.tail>=.99999||s.fade<=0)return empty();
  const r=ribbonInfo(x,y,s),d=r.distance;
  const gate=smooth(0,.018,s.front)*(1-smooth(.95,1,s.tail));
  const body=coverage(d,aa)*gate*s.fade;
  const inner=coverage(d+G.edgeWidth,aa),thickness=clamp01(-d/r.radius);
  const crest=Math.exp(-Math.pow((r.v-(s.front-.06))/.18,2));
  const feed=Math.exp(-Math.pow((r.v-lerp(0,1,smooth(.22,.64,s.u)))/.23,2));
  const bodyColor=mix([.016,.19,.24],[.028,.62,.58],Math.pow(thickness,.65));
  const color=mix([.008,.043,.085],bodyColor,inner);
  const radiance=thickness*(.09+.30*crest+.20*feed+s.materialLift);
  const density=.90+.65*s.transit;
  return {color,emission:[.46,.92,.86].map(n=>n*radiance),opacity:body*(1-Math.exp(-3*density)),density,distance:d};
}
/** 容器輪郭を先行表示せず、入ってきた量だけ腹部の面を下から上へ形成する。 */
export function receiverShape(x,y,s) {
  const squeeze=1-.88*s.shrink;
  const qx=(x-G.receiverX)/squeeze,qy=(y-G.receiverY)/squeeze;
  const width=lerp(G.receiveHalfWidthMin,G.receiveHalfWidthMax,s.received);
  const height=lerp(G.receiveHeightMin,G.receiveHeightMax,s.received);
  const ny=clamp01((G.receiveBottom-qy)/height),nx=qx/width;
  const side=Math.abs(qx)-width*(.88+.12*Math.sin(Math.PI*ny));
  const bottom=qy-G.receiveBottom+6*nx*nx;
  const top=G.receiveBottom-height+7*nx*nx-qy;
  return {distance:Math.max(side,bottom,top)*squeeze,qx,qy,width,height,ny,nx,squeeze};
}
export function receiveField(x,y,s,aa) {
  if(s.received<=.00001||s.fade<=0)return empty();
  const r=receiverShape(x,y,s),d=r.distance;
  const a=coverage(d,aa)*smooth(0,.012,s.received)*s.fade;
  const inner=coverage(d+G.edgeWidth*r.squeeze,aa);
  const across=1-clamp01(Math.abs(r.nx));
  const color=mix([.008,.040,.075],mix([.015,.19,.24],[.035,.53,.43],.3+.7*across),inner);
  // 受領面の上端は量に応じて上昇。同じ面内の広い明度帯であり、細線/外付け輪ではない。
  const lip=Math.exp(-Math.pow((r.ny-.77)/.26,2));
  const inlet=boundedLobe(x,y,G.routeEndX,G.routeEndY,23,19);
  const arrival=Math.sin(Math.PI*clamp01((s.u-PHASE.receiveStart)/(PHASE.receiveEnd-PHASE.receiveStart)));
  const radiance=inner*((.12+.27*s.received)*lip*(.5+.5*across)+.29*inlet*arrival);
  const density=.75+1.30*s.received;
  return {color,emission:[.36,.92,.70].map(n=>n*radiance),opacity:a*(1-Math.exp(-2.8*density)),density,distance:d};
}
export function sampleFields(x,y,u,{scale=.5,reducedMotion=false,seed=.5}={}) {
  const s=evaluatePhase(u,reducedMotion,seed),aa=Math.max(.5,.65/scale);
  if(x<BOUNDS.minX||x>BOUNDS.maxX||y<BOUNDS.minY||y>BOUNDS.maxY||u>=1){return {s,source:empty(),transport:empty(),receive:empty(),light:[0,0,0]};}
  return {s,source:sourceField(x,y,s,aa),transport:transportField(x,y,s,aa),receive:receiveField(x,y,s,aa),
    light:sampleLightAtWorld({phase:u,reducedMotion,seed,worldX:0,worldY:0},x,y)};
}
export function linearToSRGB(x){x=clamp01(x);return x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055;}
/** 参照合成。GPU経路はshaders/mana.wgslのみを使用する。 */
export function sampleReference(x,y,u,background,{world=true,observation=true,lighting=true,...options}={}) {
  const f=sampleFields(x,y,u,options),bgA=background[3]??1;
  let c=background.slice(0,3).map(n=>n*bgA),alpha=bgA;
  const all=[f.source,f.transport,f.receive];
  const cov=Math.max(...all.map(v=>v.opacity));
  if(lighting)c=c.map((n,i)=>n+f.light[i]*bgA*(.72+.28*background[i]));
  if(world)for(const v of all){const a=clamp01(v.opacity);c=c.map((n,i)=>n*(1-a)+(v.color[i]+v.emission[i])*a);alpha=alpha*(1-a)+a;}
  if(observation){const peak=Math.max(...f.light),a=Math.min(G.observePeak,peak*.38)*(1-cov*.86);c=c.map((n,i)=>n*(1-a)+f.light[i]/Math.max(.0001,peak)*a);alpha=alpha*(1-a)+a;}
  return {rgba:[...c.map(n=>linearToSRGB(n/Math.max(.00001,alpha))*alpha),alpha],fields:f};
}
