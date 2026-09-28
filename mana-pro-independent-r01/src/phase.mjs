import {PHASE, EFFECT_DURATION_SECONDS, CONTRACT} from './contract.mjs';
export const clamp01 = n => Math.min(1, Math.max(0, n));
export function smooth(a, b, t) { const v = clamp01((t-a)/(b-a)); return v*v*(3-2*v); }
/** source / transit / receivedは表示上の有限蓄積量。mana値を書き換える計算ではない。 */
export function evaluatePhase(u, reducedMotion = false, seed = 0.5) {
  u = clamp01(u);
  const source = 1-smooth(PHASE.sourceDrainStart, PHASE.sourceDrainEnd, u);
  const received = smooth(PHASE.receiveStart, PHASE.receiveEnd, u);
  const transit = Math.max(0, 1-source-received);
  const travel = smooth(PHASE.travelStart, PHASE.travelEnd, u);
  const shrink = smooth(PHASE.settleStart, PHASE.end, u);
  const fade = 1-smooth(PHASE.fadeStart, PHASE.end, u);
  const wander = reducedMotion ? 0 : (seed-0.5)*22*Math.sin(Math.PI*travel);
  return {
    u, seconds: u*EFFECT_DURATION_SECONDS, source, transit, received,
    remaining: fade, deposited: 1-fade,
    transportCenter: {x: wander, y: -8+(CONTRACT.receiverOffset.y+8)*travel},
    receiver: {...CONTRACT.receiverOffset}, shrink, fade,
    phase: u < .08 ? 'source' : u < PHASE.receiveStart ? 'transport' : u < PHASE.settleStart ? 'receive-accumulate' : u < 1 ? 'converge' : 'ended',
  };
}
/** ホスト材質が実在する場合だけ利用する照明サンプル。光源からの距離で有限減衰する設計モデル。 */
export function sampleLightAtWorld(instance, x, y) {
  const s = evaluatePhase(instance.phase, instance.reducedMotion, instance.seed);
  const localX=x-instance.worldX, localY=y-instance.worldY;
  if (localX < -66 || localX > 66 || localY < -127 || localY > 13) return [0,0,0];
  const lobe = (cx,cy,rx,ry,a) => {
    const r=Math.hypot((localX-cx)/rx,(localY-cy)/ry);
    return a*s.fade*(1-smooth(.68,1,r))*Math.exp(-r*r*2.4);
  };
  const a=lobe(0,-8,48,27,s.source*.23);
  const b=lobe(s.transportCenter.x,s.transportCenter.y,48,39,s.transit*.16);
  const c=lobe(0,s.receiver.y,60,48,s.received*.24);
  return [a*.95+b*.12+c*.18,a*.52+b*.88+c*.84,a*.13+b*.60+c*.55];
}
