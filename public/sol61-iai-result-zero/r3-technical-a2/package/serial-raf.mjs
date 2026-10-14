export function createSerialRaf({ requestFrame, cancelFrame, observe, isCurrent = () => true, isActive = () => true, isHeld = () => false }) {
  let frame = 0, running = false, live = true, disposed = false;
  const state = { running: false, disposed: false, scheduled: false, observations: 0, maxConcurrent: 0, failed: false };
  const canRun = () => live && !disposed && isCurrent() && isActive() && !isHeld();
  const schedule = () => {
    if (!canRun() || frame || running) return;
    frame = requestFrame(() => { frame = 0; void tick(); }); state.scheduled = true;
  };
  const tick = async () => {
    if (!canRun() || running) return;
    running = true; state.running = true; state.scheduled = false; state.observations++; state.maxConcurrent = Math.max(state.maxConcurrent, 1);
    try { await observe(); } catch { state.failed = true; live = false; } finally { running = false; state.running = false; schedule(); }
  };
  return Object.freeze({
    refresh() { if (!canRun()) { if (frame) cancelFrame(frame); frame = 0; state.scheduled = false; return; } schedule(); },
    wake() { schedule(); },
    dispose() { live = false; disposed = true; state.disposed = true; if (frame) cancelFrame(frame); frame = 0; state.scheduled = false; },
    get state() { return Object.freeze({ ...state }); },
  });
}
