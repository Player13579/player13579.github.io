export function createNaturalLoopController({ enabled, restart, isVisible = () => true, onRestartError = () => {} } = {}) {
  if (typeof enabled !== 'boolean' || typeof restart !== 'function' || typeof isVisible !== 'function')
    throw new TypeError('NATURAL_LOOP_CONFIGURATION_REQUIRED');
  let generation = 0, armedSource = null, timer = null, disposed = false;
  const validTerminal = (event, receipt, source) => !!source && event?.name === 'source-expired' &&
    event.sourceId === source.sourceId && event.causeId === source.causeId && event.generation === source.generation &&
    Number.isSafeInteger(event.terminalFrameId) && event.terminalFrameId > 0 &&
    receipt?.captureKind === 'natural-terminal-clear' && receipt.submitted === true && receipt.completed === true &&
    receipt.active === false && receipt.sameDevice === true && receipt.frameId === event.terminalFrameId && receipt.elapsedMs === event.elapsedMs &&
    receipt.sourceId === source.sourceId && receipt.causeId === source.causeId && receipt.generation === source.generation &&
    Number.isFinite(receipt.elapsedMs) && Number.isFinite(receipt.durationMs) && receipt.elapsedMs >= receipt.durationMs;
  function clearTimer() { if (timer !== null) clearTimeout(timer); timer = null; }
  function arm(source) {
    if (disposed) return false;
    generation += 1; clearTimer(); armedSource = source && Object.freeze({ sourceId: source.sourceId,
      causeId: source.causeId, generation: source.generation }); return !!armedSource;
  }
  function cancel(reason = 'cancelled') {
    generation += 1; clearTimer(); armedSource = null; return Object.freeze({ cancelled: true, reason });
  }
  function onNaturalTerminal(event, receipt) {
    const ticket = generation, source = armedSource;
    if (!enabled || disposed || !isVisible() || timer !== null || !validTerminal(event, receipt, source)) return false;
    timer = setTimeout(async () => {
      timer = null;
      if (disposed || generation !== ticket || armedSource !== source || !isVisible()) return;
      try { await restart(() => !disposed && generation === ticket && armedSource === source && isVisible()); }
      catch (error) { if (generation === ticket && !disposed) { armedSource = null; onRestartError(error); } }
    }, 0);
    return true;
  }
  function dispose() { disposed = true; return cancel('retired'); }
  return Object.freeze({ arm, cancel, dispose, onNaturalTerminal,
    snapshot: () => Object.freeze({ enabled, generation, armed: !!armedSource, queued: timer !== null, disposed }) });
}


