export function cssRadiusToBacking(radiusCss, backingWidth, cssWidth) {
  if (![radiusCss, backingWidth, cssWidth].every(Number.isFinite) || radiusCss < 0 || backingWidth <= 0 || cssWidth <= 0) return null;
  return radiusCss * backingWidth / cssWidth;
}

export function isValidPoisonReadyProof({ receipt, plan, field, currentTargetGeneration, backingWidth, backingHeight, canvasConnected, nowMs }) {
  const lifetime = field?.endsAt - field?.createdAt;
  return receipt?.submitted === true && receipt?.completed === true && receipt?.current === true && receipt?.active === true &&
    receipt?.scopeErrors === null && receipt?.passes === 2 && plan?.active === true && Number.isFinite(plan?.build) && plan.build > 0 &&
    Number.isFinite(plan?.ageMs) && plan.ageMs >= 0 && Number.isFinite(lifetime) && lifetime > 0 && plan.ageMs < lifetime &&
    Number.isFinite(receipt?.ageMs) && receipt.ageMs >= 0 && receipt.ageMs < lifetime &&
    Number.isFinite(nowMs) && field?.createdAt <= nowMs && nowMs < field?.endsAt &&
    Number.isSafeInteger(receipt?.generation) && Number.isSafeInteger(receipt?.targetGeneration) &&
    receipt.generation === plan.generation && receipt.targetGeneration === currentTargetGeneration &&
    plan.targetGeneration === currentTargetGeneration && receipt.causeId === plan.causeId &&
    receipt.width === backingWidth && receipt.height === backingHeight && backingWidth > 0 && backingHeight > 0 && canvasConnected === true;
}

export function createSerialFrameLoop({ requestFrame, cancelFrame, isCurrent, isActive, isHeld, observe }) {
  if (![requestFrame, cancelFrame, isCurrent, isActive, isHeld, observe].every(fn => typeof fn === 'function')) {
    throw new TypeError('frame-loop callbacks are required');
  }
  let frameId = null, running = false, disposed = false;
  const shouldRun = () => !disposed && isCurrent() && isActive() && !isHeld();
  function schedule() {
    if (frameId !== null || running || !shouldRun()) return;
    frameId = requestFrame(() => { void tick().catch(() => {}); });
  }
  async function tick() {
    frameId = null;
    if (!shouldRun() || running) return;
    running = true;
    try { await observe(); }
    finally { running = false; }
    schedule();
  }
  return Object.freeze({
    refresh() {
      if (disposed) return;
      if (!shouldRun()) { if (frameId !== null) cancelFrame(frameId); frameId = null; return; }
      schedule();
    },
    wake() { schedule(); },
    dispose() { if (disposed) return; disposed = true; if (frameId !== null) cancelFrame(frameId); frameId = null; },
    get state() { return Object.freeze({ scheduled: frameId !== null, running, disposed }); },
  });
}