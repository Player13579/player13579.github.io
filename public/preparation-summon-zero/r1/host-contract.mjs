export const VERSION = 'preparation-summon-zero-sol61-r1';

export function startupIdentity(params, startup, windowRef = globalThis.window) {
  const token = String(params?.get('galleryStartupToken') || '');
  const versionId = String(params?.get('galleryVersionId') || '');
  const epoch = Number(params?.get('galleryAttemptEpoch'));
  return Object.freeze({
    enabled: /^[0-9a-f]{32}$/i.test(token) && versionId === VERSION &&
      Number.isSafeInteger(epoch) && epoch > 0 && windowRef?.parent !== windowRef &&
      windowRef?.location?.origin && windowRef.location.origin !== 'null' &&
      typeof startup?.advance === 'function' && typeof startup?.isActive === 'function',
    token, versionId, epoch
  });
}

export function measureExtent(canvas, rawDpr = globalThis.devicePixelRatio) {
  const rect = canvas?.getBoundingClientRect?.();
  const clientWidth = canvas?.clientWidth, clientHeight = canvas?.clientHeight;
  const dpr = Number(rawDpr);
  const valid = canvas?.isConnected === true && Number.isFinite(rect?.width) && rect.width > 0 &&
    Number.isFinite(rect?.height) && rect.height > 0 && Number.isFinite(clientWidth) &&
    Number.isInteger(clientWidth) && clientWidth >= 0 && Number.isFinite(clientHeight) &&
    Number.isInteger(clientHeight) && clientHeight >= 0 && Number.isFinite(dpr) && dpr > 0 &&
    Math.abs(clientWidth - rect.width) <= 1 && Math.abs(clientHeight - rect.height) <= 1;
  if (!valid) return Object.freeze({ valid: false, reason: 'invalid-or-inconsistent-canvas-extent',
    connected: canvas?.isConnected === true, cssWidth: Number(rect?.width), cssHeight: Number(rect?.height),
    clientWidth, clientHeight, rawDpr: dpr, actualBackingWidth: Number(canvas?.width),
    actualBackingHeight: Number(canvas?.height) });
  const usedDpr = Math.max(1, dpr);
  const backingWidth = Math.max(1, Math.round(rect.width * usedDpr));
  const backingHeight = Math.max(1, Math.round(rect.height * usedDpr));
  return Object.freeze({ valid: true, connected: true, cssWidth: rect.width, cssHeight: rect.height,
    clientWidth, clientHeight, rawDpr: dpr, usedDpr, backingWidth, backingHeight,
    actualBackingWidth: Number(canvas.width), actualBackingHeight: Number(canvas.height) });
}

export function extentMatches(a, b) {
  return Boolean(a?.valid && b?.valid && a.cssWidth === b.cssWidth && a.cssHeight === b.cssHeight &&
    a.usedDpr === b.usedDpr && a.backingWidth === b.backingWidth && a.backingHeight === b.backingHeight);
}

export function makeFirstFrameReceipt({ proof, canvas, causeId, effectAgeMs } = {}) {
  const current = measureExtent(canvas);
  if (!proof || proof.recorded !== true || proof.submitted !== true || proof.completed !== true ||
      proof.layoutCurrent !== true || !Number.isSafeInteger(proof.frameId) || proof.frameId < 1 ||
      !Number.isSafeInteger(proof.passes) || proof.passes < 1 || !current.valid ||
      canvas?.isConnected !== true || proof.eventId !== causeId || proof.effectAgeMs !== effectAgeMs ||
      !extentMatches(proof.submittedExtent, current) || canvas.width !== proof.backingWidth ||
      canvas.height !== proof.backingHeight || proof.viewportWidth !== proof.submittedExtent.cssWidth ||
      proof.viewportHeight !== proof.submittedExtent.cssHeight ||
      proof.backingWidth !== proof.submittedExtent.backingWidth ||
      proof.backingHeight !== proof.submittedExtent.backingHeight) return null;
  return Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
    passes: proof.passes, viewportWidth: proof.viewportWidth, viewportHeight: proof.viewportHeight,
    backingWidth: proof.backingWidth, backingHeight: proof.backingHeight,
    frameId: proof.frameId, submittedCommands: proof.submittedCommands,
    eventId: causeId, effectAgeMs });
}

export function makePreviewSnapshot(state = {}) {
  return Object.freeze({ version: VERSION, verify: Boolean(state.verify), requestedAgeMs: state.requestedAgeMs,
    submittedAgeMs: state.submittedAgeMs, heldPhaseMs: state.heldPhaseMs, cause: state.cause || null,
    input: state.input || null, controls: state.controls || null, view: state.view || null,
    frame: state.frame || null, audio: state.audio || null, runtime: state.runtime || null,
    disposed: Boolean(state.disposed) });
}
