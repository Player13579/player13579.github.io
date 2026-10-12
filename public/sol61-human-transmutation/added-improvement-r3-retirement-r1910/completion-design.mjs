export const BODY_COMPLETION = Object.freeze({
  beginsMs: 814,
  riseEndMs: 844,
  fadeBeginsMs: 890,
  endsMs: 1020,
  contourWidthH64: 0.8,
  sourceRGB: Object.freeze([0.24, 1.15, 0.72]),
  sourceGain: 1.65,
  glintRiseMs: 18,
  glintFallMs: 40,
  lifetimeMs: 1200,
});
export function smooth(a, b, t) {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
export function contourWidthCss(actualActorHeight) {
  if (!Number.isFinite(actualActorHeight) || actualActorHeight <= 0)
    throw new TypeError('Positive registered alpha-support height required');
  return BODY_COMPLETION.contourWidthH64 * actualActorHeight / 64;
}
export function bodyCompletionEnvelope(phaseMs) {
  if (!Number.isFinite(phaseMs)) throw new TypeError('Finite cause phase required');
  const c = BODY_COMPLETION;
  return smooth(c.beginsMs, c.riseEndMs, phaseMs) *
    (1 - smooth(c.fadeBeginsMs, c.endsMs, phaseMs));
}
export function completionGlintPulse({phaseMs, staggerMs, durationMs}) {
  if (![phaseMs, staggerMs, durationMs].every(Number.isFinite) || staggerMs < 0 || durationMs <= 40)
    throw new TypeError('Exact finite site timing required');
  const c = BODY_COMPLETION;
  if (phaseMs < 0 || phaseMs >= c.lifetimeMs) return 0;
  const age = phaseMs - c.beginsMs - staggerMs;
  return smooth(0, c.glintRiseMs, age) *
    (1 - smooth(durationMs - c.glintFallMs, durationMs, age));
}
