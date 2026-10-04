export const EFFECT_ID = 'preparation-summon-zero-sol61-r1';
export const DURATION_MS = 980;
export const UNIFORM_FLOATS = 16;
const finite = Number.isFinite;
export function freezeReceipt(value) {
  if (!value || !value.causeId || !value.playerId || !value.sessionKey ||
      !finite(value.startedAtMs) || !Array.isArray(value.sourceWorld) ||
      value.sourceWorld.length !== 2 || !value.sourceWorld.every(finite))
    throw new TypeError('An actual human join/spriteReady cause, caller start, session and foot anchor are required');
  if (value.isBot || value.ejected || value.spriteReady !== true)
    throw new TypeError('Only a ready, present human join can own this effect');
  return Object.freeze({ causeId: String(value.causeId), playerId: String(value.playerId),
    sessionKey: String(value.sessionKey), startedAtMs: value.startedAtMs,
    sourceWorld: Object.freeze([...value.sourceWorld]) });
}
export function plan(receipt, { nowMs, active = true, sourceEnabled = true,
  nearEnabled = true, reducedMotion = false, intensity = 1 } = {}) {
  if (!receipt || !finite(nowMs) || !finite(intensity) || intensity < 0)
    throw new TypeError('A frozen receipt and finite caller clock/intensity are required');
  const ageMs = nowMs - receipt.startedAtMs;
  const visible = Boolean(active && sourceEnabled && ageMs >= 0 && ageMs < DURATION_MS);
  return Object.freeze({ effectId: EFFECT_ID, receipt, ageMs, visible,
    reducedMotion: Boolean(reducedMotion), nearEnabled: Boolean(visible && nearEnabled),
    intensity: visible ? intensity : 0, durationMs: DURATION_MS });
}
export function packUniforms(state, { width, height, scale, camera = [0, 0] } = {}) {
  if (!Array.isArray(camera) || camera.length !== 2 ||
      ![width, height, scale, ...camera].every(finite) || width <= 0 || height <= 0 || scale <= 0)
    throw new TypeError('Physical target extent, world-to-backing scale and camera are required');
  const [x, y] = state.receipt.sourceWorld;
  // 0..3 viewport; 4..7 source/clock/intensity; 8..11 cause gates; 12..15 reserved zero.
  return new Float32Array([width, height, scale, 0,
    (x - camera[0]) * scale, (y - camera[1]) * scale, state.ageMs, state.intensity,
    state.visible ? 1 : 0, state.reducedMotion ? 1 : 0, state.nearEnabled ? 1 : 0, 0,
    0, 0, 0, 0]);
}
export const FIXTURE = Object.freeze({ logicalWidth: 384, logicalHeight: 320,
  worldScale: 1, humanSpriteVisibleHeightWorld: 64, footSourceWorld: [128, 215],
  heldPhasesMs: [80, 260, 480, 620, 860, 979, 980], strongPhaseMs: 480 });
