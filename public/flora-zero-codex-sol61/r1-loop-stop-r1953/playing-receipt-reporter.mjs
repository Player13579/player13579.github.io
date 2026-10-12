export function createCurrentGenerationPlayingReporter({ bridge, canvas } = {}) {
  if (!bridge || !canvas) throw new TypeError('BRIDGE_AND_CANVAS_REQUIRED');
  let startupReady = false, lastIdentity = null, lastGeneration = 0;
  function report(receipt, source) {
    if (!bridge.enabled || !receipt || !source || receipt.captureKind !== 'natural-frame')
      return Object.freeze({ posted: false, reason: 'not-a-current-natural-frame' });
    if (receipt.sourceId !== source.sourceId || receipt.causeId !== source.causeId ||
        receipt.generation !== source.generation || receipt.version !== source.version ||
        receipt.completed !== true || receipt.submitted !== true || receipt.active !== true ||
        receipt.sameDevice !== true || !Number.isSafeInteger(receipt.frameId) || receipt.frameId < 1)
      return Object.freeze({ posted: false, reason: 'receipt-not-current-and-completed' });
    const identity = Object.freeze({ sourceId: source.sourceId, causeId: source.causeId, generation: source.generation });
    if (lastIdentity && identity.sourceId === lastIdentity.sourceId && identity.causeId === lastIdentity.causeId &&
        identity.generation === lastIdentity.generation)
      return Object.freeze({ posted: false, reason: 'identity-already-published' });
    if (!Number.isSafeInteger(identity.generation) || identity.generation <= lastGeneration)
      return Object.freeze({ posted: false, reason: 'generation-not-monotonic' });
    if (!startupReady && !bridge.reportPhase('first-frame', 'ready'))
      return Object.freeze({ posted: false, fatal: true, reason: 'startup-first-frame-phase-rejected' });
    if (!bridge.reportPlaying({ receipt, source, canvas }))
      return Object.freeze({ posted: false, fatal: true, reason: 'completed-playing-identity-rejected' });
    startupReady = true;
    lastIdentity = identity;
    lastGeneration = identity.generation;
    return Object.freeze({ posted: true, identity });
  }
  return Object.freeze({ report, snapshot: () => Object.freeze({ startupReady, lastIdentity, lastGeneration }) });
}
