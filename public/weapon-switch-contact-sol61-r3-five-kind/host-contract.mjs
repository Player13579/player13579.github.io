// CPU-only host helpers. Fixture coordinates are registered offsets from the
// fixture world's origin; the origin is anchored at the preview canvas center.
export const VERSION_ID = 'weapon-switch-contact-sol61-r3';
export const ACTIVE_LIFETIME_SECONDS = 0.78;
export const PREVIEW_RECEIPT_INTERVAL_MS = 900;

export function isSuccessfulWeaponSwitchReceipt(receipt) {
  return Boolean(receipt && typeof receipt.id === 'string' && receipt.id.length > 0 &&
    Number.isInteger(receipt.variant) && receipt.variant >= 0 && receipt.variant <= 4 &&
    Number.isFinite(receipt.x) && Number.isFinite(receipt.y));
}

export function projectFixtureWorldPoint(x, y, viewportWidth, viewportHeight, dpr = 1) {
  if (![x, y, viewportWidth, viewportHeight, dpr].every(Number.isFinite) || dpr <= 0) {
    throw new TypeError('Fixture projection requires finite coordinates and a positive DPR.');
  }
  // Fixture camera maps world origin to viewport center. Return CSS-pixel
  // offsets from that center; runtime applies DPR once when filling the ABI.
  const screenX = viewportWidth / 2 + x * dpr;
  const screenY = viewportHeight / 2 + y * dpr;
  return Object.freeze({ x: (screenX - viewportWidth / 2) / dpr,
    y: (screenY - viewportHeight / 2) / dpr });
}

export function receiptIsLive(ageSeconds) {
  return Number.isFinite(ageSeconds) && ageSeconds >= 0 && ageSeconds < ACTIVE_LIFETIME_SECONDS;
}

export function effectiveReceiptAge(cause, nowMs) {
  if (Number.isFinite(cause?.pausedAge)) return cause.pausedAge;
  return (nowMs - cause.receivedAt) / 1000;
}

export function freezeReceipt(cause, nowMs, requestedAge = null) {
  const age = Number.isFinite(requestedAge) ? requestedAge : effectiveReceiptAge(cause, nowMs);
  return { ...cause, pausedAt: nowMs, pausedAge: Math.min(ACTIVE_LIFETIME_SECONDS - Number.EPSILON, Math.max(0, age)) };
}

export function resumeReceipt(cause, nowMs) {
  if (!Number.isFinite(cause?.pausedAge)) return { ...cause };
  return { ...cause, receivedAt: nowMs - cause.pausedAge * 1000, pausedAt: null, pausedAge: null };
}

export function holdReceiptSet(state, nowMs, requestedAge, drawHeldFrame) {
  if (state.held) return false;
  const currentAge=state.cause?effectiveReceiptAge(state.cause,nowMs):null;
  state.fixedAge = Number.isFinite(requestedAge)
    ? Math.min(ACTIVE_LIFETIME_SECONDS - Number.EPSILON, Math.max(0, requestedAge))
    : receiptIsLive(currentAge) ? currentAge : 0;
  state.held = true;
  for (const cause of state.active) Object.assign(cause, freezeReceipt(cause, nowMs, requestedAge));
  drawHeldFrame(state.fixedAge, state.generation);
  return true;
}

export function drawReceiptAddedWhileHeld(state, cause, nowMs, drawHeldFrame) {
  if (!state.held) return false;
  Object.assign(cause, freezeReceipt(cause, nowMs, state.fixedAge ?? 0));
  drawHeldFrame(state.fixedAge ?? 0, cause.generation);
  return true;
}

export function resumeReceiptSet(state, nowMs) {
  if (!state.held) return false;
  for (const cause of state.active) Object.assign(cause, resumeReceipt(cause, nowMs));
  state.held = false;
  state.fixedAge = undefined;
  return true;
}
