const terminalKinds = new Set(['natural-terminal-clear']);

function validTerminal(event, source, host, device) {
  const receipt = host?.lastTerminalReceipt;
  return event?.name === 'source-expired' && event.state === 'ready' &&
    source && host?.state === 'ready' && host.source == null &&
    event.sourceId === source.sourceId && event.causeId === source.causeId &&
    event.generation === source.generation && event.terminalFrameId === receipt?.frameId &&
    event.elapsedMs === receipt?.elapsedMs &&
    receipt?.sourceId === source.sourceId && receipt?.causeId === source.causeId &&
    receipt?.generation === source.generation && receipt?.version === source.version &&
    receipt?.clockKind === source.clockKind && receipt?.startedAtMs === source.startedAtMs &&
    receipt?.durationMs === source.durationMs && Number.isFinite(receipt.elapsedMs) &&
    receipt.elapsedMs >= source.durationMs && terminalKinds.has(receipt.captureKind) &&
    receipt.active === false && receipt.submitted === true && receipt.completed === true &&
    receipt.sameDevice === true && device != null && receipt.device === device &&
    Number.isSafeInteger(receipt.frameId) && receipt.frameId > 0;
}

/**
 * Repeats an R2 preview only after the existing host emits source-expired,
 * which follows its natural terminal-clear frame and queue/device fence.
 * This module does not own the host, source clock, rendering, or audio.
 */
export function createNaturalLoopController({ enabled, readSource, readHost, readDevice,
  startNext, onError = () => {}, enqueue = queueMicrotask } = {}) {
  if (typeof enabled !== 'boolean' || typeof readSource !== 'function' ||
      typeof readHost !== 'function' || typeof readDevice !== 'function' ||
      typeof startNext !== 'function' || typeof enqueue !== 'function')
    throw new TypeError('NATURAL_LOOP_DEPENDENCIES_REQUIRED');

  let ticket = 0;
  let held = false;
  let hidden = false;
  let retired = false;
  let scheduled = null;
  let lastStarted = null;
  const canRepeat = () => enabled && !held && !hidden && !retired;

  function cancel(reason = 'cancelled', { hold = true } = {}) {
    ticket += 1;
    scheduled = null;
    if (hold) held = true;
    return Object.freeze({ cancelled: true, reason, ticket });
  }

  function manualPlayRequested() {
    if (retired) return false;
    ticket += 1;
    scheduled = null;
    held = false;
    return true;
  }

  function setHidden(value) {
    hidden = value === true;
    if (hidden) cancel('document-hidden', { hold: false });
  }

  function onHostState(event) {
    const source = readSource();
    const host = readHost();
    const device = readDevice();
    if (!canRepeat() || !validTerminal(event, source, host, device)) return false;
    const key = `${source.sourceId}\u0000${source.causeId}\u0000${source.generation}\u0000${event.terminalFrameId}`;
    if (key === lastStarted || key === scheduled) return false;
    const capturedSource = source;
    const capturedReceipt = host.lastTerminalReceipt;
    const token = ++ticket;
    scheduled = key;
    enqueue(() => {
      if (token !== ticket || !canRepeat() || scheduled !== key) return;
      const latestHost = readHost();
      if (readSource() !== capturedSource || latestHost?.lastTerminalReceipt !== capturedReceipt ||
          !validTerminal(event, capturedSource, latestHost, readDevice())) {
        scheduled = null;
        return;
      }
      scheduled = null;
      lastStarted = key;
      const proof = Object.freeze({
        reason: 'natural-terminal-fence-completed',
        sourceId: capturedSource.sourceId,
        causeId: capturedSource.causeId,
        generation: capturedSource.generation,
        terminalFrameId: capturedReceipt.frameId,
      });
      // Terminal admission is bound to the expired source and fenced receipt only
      // immediately before starting. Once startNext publishes its new source, the
      // long-lived intent guard must not keep requiring that consumed terminal.
      const isCurrent = () => token === ticket && canRepeat() && lastStarted === key;
      const admissionIsCurrent = () => {
        if (!isCurrent() || readSource() !== capturedSource) return false;
        const currentHost = readHost();
        return currentHost?.lastTerminalReceipt === capturedReceipt &&
          validTerminal(event, capturedSource, currentHost, readDevice());
      };
      Promise.resolve().then(() => {
        if (!admissionIsCurrent()) return false;
        return startNext(proof, isCurrent);
      }).catch(error => {
        try { onError(error); } catch (_) {}
      });
    });
    return true;
  }

  function retire() {
    ticket += 1;
    scheduled = null;
    held = true;
    retired = true;
    return Object.freeze({ retired: true });
  }

  return Object.freeze({
    onHostState,
    cancel,
    hold: reason => cancel(reason || 'held', { hold: true }),
    manualPlayRequested,
    setHidden,
    retire,
    snapshot: () => Object.freeze({ enabled, held, hidden, retired, queued: scheduled !== null, ticket }),
  });
}
