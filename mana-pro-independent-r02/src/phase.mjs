import {PHASE, EFFECT_DURATION_SECONDS, GEOMETRY as G, BOUNDS} from './contract.mjs';
export const clamp01 = n => Math.min(1, Math.max(0, n));
export function smooth(a, b, t) { const v = clamp01((t-a)/(b-a)); return v*v*(3-2*v); }
export const lerp = (a,b,t) => a+(b-a)*t;
/** 太い輸送面の中軸。seedは幾何を乱さず、reducedMotionも必須の因果を消さない。 */
export function routePoint(t) {
  t=clamp01(t);
  return {x:lerp(G.routeStartX,G.routeEndX,t)+G.routeBend*Math.sin(Math.PI*t),
    y:lerp(G.routeStartY,G.routeEndY,t)};
}
export const routeRadius = t => G.routeRadius+G.routeSwell*Math.sin(Math.PI*clamp01(t));
/** 有限な表示量の受け渡し。manaの付与処理でも、実在物質の保存則でもない。 */
export function evaluatePhase(u, reducedMotion = false, seed = 0.5) {
  if(!Number.isFinite(u)) throw new TypeError('位相は有限数が必要です');
  u=clamp01(u);
  const source=1-smooth(PHASE.sourceDrainStart,PHASE.sourceDrainEnd,u);
  const received=smooth(PHASE.receiveStart,PHASE.receiveEnd,u);
  const transit=Math.max(0,1-source-received);
  const front=smooth(PHASE.travelStart,PHASE.travelEnd,u);
  const tail=smooth(PHASE.tailStart,PHASE.tailEnd,u);
  const shrink=smooth(PHASE.settleStart,PHASE.end,u);
  const fade=1-smooth(PHASE.fadeStart,PHASE.end,u);
  // 並行イベントでも源・到着位置・保存量をseedで移動しない。
  const materialLift=reducedMotion ? 0 : 0.035*Math.sin(Math.PI*u)*(0.5+0.5*clamp01(seed));
  return {u,seconds:u*EFFECT_DURATION_SECONDS,source,transit,received,front,tail,travel:front,
    remaining:fade,deposited:1-fade,transportCenter:routePoint(front),
    receiver:{x:G.receiverX,y:G.receiverY},inlet:routePoint(1),shrink,fade,materialLift,
    phase:u<PHASE.travelStart?'source':u<PHASE.receiveStart?'connected-transfer':
      u<PHASE.receiveEnd?'receive-fill':u<PHASE.settleStart?'received-hold':u<1?'converge':'ended'};
}
export function boundedLobe(x,y,cx,cy,rx,ry) {
  const q=Math.hypot((x-cx)/rx,(y-cy)/ry);
  return Math.exp(-2.4*q*q)*(1-smooth(.68,1,q));
}
/** PHに束縛した有限な照明。実材質への適用はホストの照明パスに限る。 */
export function sampleLightAtWorld(instance,x,y) {
  const s=evaluatePhase(instance.phase,instance.reducedMotion,instance.seed);
  const px=x-instance.worldX,py=y-instance.worldY;
  if(px<BOUNDS.minX||px>BOUNDS.maxX||py<BOUNDS.minY||py>BOUNDS.maxY||s.fade<=0)return [0,0,0];
  const c=routePoint((s.front+s.tail)*.5);
  const a=boundedLobe(px,py,G.sourceX,G.sourceY,60,29)*s.source*.26;
  const b=boundedLobe(px,py,c.x,c.y,40,38)*s.transit*.20;
  const squeeze=1-.88*s.shrink;
  const d=boundedLobe(px,py,G.receiverX,G.receiverY,58*squeeze,51*squeeze)*s.received*.28*squeeze*squeeze;
  return [(a*.95+b*.16+d*.12)*s.fade,(a*.65+b*.92+d*.84)*s.fade,(a*.21+b*.95+d*.74)*s.fade];
}
