// GPT-6.1-Sol R11: finite material-settlement response on the actual body's alpha contour.
export const SETTLEMENT = Object.freeze({
  beginsMs: 814, sweepMs: 96, widthNormalized: .24,
  baseline: .32, movingGain: 1.28,
  sourceRGB: Object.freeze([.24, 1.15, .72]),
  sourceGain: 1.65, endsMs: 1020, lifetimeMs: 1200,
});
export function settlementGain(phaseMs, supportY) {
  if (![phaseMs,supportY].every(Number.isFinite)) throw new TypeError('Finite same-cause phase and registered support coordinate required');
  if (phaseMs < SETTLEMENT.beginsMs || phaseMs >= SETTLEMENT.endsMs || supportY < 0 || supportY > 1) return 0;
  const centre=1-(phaseMs-SETTLEMENT.beginsMs)/SETTLEMENT.sweepMs;
  return SETTLEMENT.baseline + SETTLEMENT.movingGain * Math.exp(-.5*((supportY-centre)/SETTLEMENT.widthNormalized)**2);
}
