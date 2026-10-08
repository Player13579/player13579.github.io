import { createExcaliburPreviewClock } from './preview-clock.mjs';

const finite = Number.isFinite;
function validateSession(session, edition) {
  const { source, command, viewport } = session || {};
  if (!source || source.previewOnly !== true || source.type !== 'alchemy-excalibur' ||
      !source.id || !source.playerId || !source.roomId || !Number.isSafeInteger(source.localGeneration) ||
      !finite(source.startedAt) || Number(source.duration) !== 1200 ||
      !command || String(command.sourceEffectId) !== String(source.id) ||
      String(command.playerId) !== String(source.playerId) || command.excaliburRoomId !== source.roomId ||
      command.movementMode !== 'alchemy-excalibur-slash' || command.exAction?.motionId !== 'alchemy-excalibur' ||
      command.exAction?.sourceEffectId !== source.id || command.exAction?.roomId !== source.roomId ||
      command.exAction?.generation !== source.localGeneration ||
      !finite(session.releaseBoundary) || session.releaseBoundary <= 0 || session.releaseBoundary >= 1 ||
      (edition === 'r10' && session.releaseBoundary !== 0.52) ||
      !viewport?.targetLease || viewport.width !== viewport.targetLease.logicalWidth ||
      viewport.height !== viewport.targetLease.logicalHeight || viewport.pixelWidth !== viewport.targetLease.width ||
      viewport.pixelHeight !== viewport.targetLease.height || viewport.targetLease.targetId !== 'main')
    throw new TypeError(`Exact preview-only ${edition} source, authored command, and current physical viewport required`);
}

// Orchestrates the pinned bridge only. Host callbacks must return real current
// frame/lease/command objects produced by the selected source runtime.
export async function createExcaliburPreviewBridgeShell({
  edition = 'r10',
  bridgeFactory,
  renderer,
  textureCache,
  createSession,
  resizeSession,
  beginFrame,
  submitFrame = frame => frame.submit(),
  onFrame = () => {},
  disposeSession = () => {},
  clock = {}
} = {}) {
  if (!['r9', 'r10'].includes(edition) || typeof bridgeFactory !== 'function' ||
      typeof createSession !== 'function' || typeof beginFrame !== 'function' ||
      typeof submitFrame !== 'function' || typeof onFrame !== 'function' || typeof disposeSession !== 'function')
    throw new TypeError('Preview bridge shell requires selected edition, real bridge, session and renderer frame callbacks');

  const bridge = await bridgeFactory({ renderer, textureCache, edition });
  if (bridge?.scope !== 'standalone-preview-only' || bridge.edition !== edition ||
      typeof bridge.prepare !== 'function' || typeof bridge.record !== 'function' ||
      typeof bridge.recordTail !== 'function' || typeof bridge.retire !== 'function' ||
      typeof bridge.destroy !== 'function') {
    try { await bridge?.destroy?.(); } catch {}
    throw new TypeError('Exact standalone preview bridge API required');
  }

  let session = null, closed = false, cleanupPromise = Promise.resolve();
  const sessions = [];
  const recordFrame = timing => {
    if (closed || !session || timing.phase === 'dispose') return;
    const current = beginFrame(timing, session);
    if (!current || !current.frame || !current.target || !current.viewport ||
        current.source !== session.source || !current.currentState ||
        current.target !== current.viewport.targetLease?.targetId || current.viewport.targetLease !== session.viewport.targetLease ||
        typeof current.frame.sprite !== 'function' || typeof current.frame.addEncoder !== 'function')
      throw new TypeError('Host must open/clear one real shared-renderer frame and return its exact active preview inputs');
    if (timing.phase === 'expired' || timing.phase === 'ended' || !timing.eActive) {
      bridge.retire(session.source);
      const result = submitFrame(current.frame, timing, session);
      const submitted = result.submitted;
      onFrame(Object.freeze({ timing, submitted, scope: 'standalone-preview-only', retired: true }));
      return result.completion;
    }

    const actionLive = timing.slashActive;
    const command = actionLive ? current.command : null;
    const action = actionLive ? current.action : null;
    if (actionLive && (!command || command.exAction !== action || !finite(action.progress) ||
        Math.abs(action.progress - timing.slashProgress) > 1e-9 ||
        action.sourceEffectId !== session.source.id))
      throw new Error('Preview command/action must be the exact source-produced pose at the shell clock progress');
    const input = { frame: current.frame, target: current.target, viewport: current.viewport,
      source: session.source, command, action, eAgeSeconds: timing.eAgeMs / 1000,
      pathEndWorld: current.pathEndWorld, currentState: current.currentState,
      releaseBoundary: session.releaseBoundary,
      mainOn: current.mainOn, sourceOn: current.sourceOn, observerOn: current.observerOn, held: timing.state === 'held' };
    const planned = actionLive ? bridge.record(input) : bridge.recordTail(input);
    const result = submitFrame(current.frame, timing, session);
    const submitted = result.submitted;
    onFrame(Object.freeze({ timing, planned, submitted, scope: 'standalone-preview-only', retired: false }));
    return result.completion;
  };
  const lifecycle = createExcaliburPreviewClock({ ...clock, render: recordFrame,
    dispose: details => {
      if (closed) return;
      closed = true;
      const previous = session;
      if (previous) bridge.retire(previous.source);
      cleanupPromise = Promise.resolve().then(async () => {
        await bridge.destroy();
        for (const item of sessions) await disposeSession(item, details);
        sessions.length = 0;
      });
    }
  });

  async function installSession(nextSession, viewport = nextSession?.viewport) {
    validateSession(nextSession, edition);
    const prepared = await bridge.prepare({ viewport, sourceIds: [nextSession.source.id], prewarmCommands: [nextSession.command] });
    if (!prepared || prepared.scope !== 'standalone-preview-only') {
      bridge.retire(nextSession.source);
      throw new Error('Preview bridge prepare rejected the current target lease');
    }
    if (!sessions.includes(nextSession)) sessions.push(nextSession);
    session = nextSession;
  }
  async function play() {
    if (closed) throw new Error('preview shell is closed');
    await lifecycle.drain();
    const previous = session;
    const currentState = lifecycle.getState().state;
    if (previous && (currentState === 'running' || currentState === 'held')) lifecycle.end();
    if (previous) bridge.retire(previous.source);
    await lifecycle.drain();
    const nextSession = await createSession({ edition, generation: lifecycle.getState().generation + 1 });
    if (previous && nextSession?.source?.id === previous.source.id)
      throw new Error('Replay must allocate a fresh preview cause ID');
    await installSession(nextSession);
    return lifecycle.play();
  }
  async function resize(nextViewport) {
    if (closed || !session) throw new Error('preview shell has no live session');
    if (typeof resizeSession !== 'function') throw new Error('resize callback must obtain a newly registered sampleable target lease');
    const shouldResume = lifecycle.getState().state === 'running';
    if (shouldResume) lifecycle.hold();
    try {
      const nextSession = await resizeSession({ edition, session, nextViewport });
      if (nextSession?.source !== session.source) throw new Error('resize must retain the current preview cause');
      validateSession(nextSession, edition);
      const prepared = await bridge.prepare({ viewport: nextSession.viewport, sourceIds: [nextSession.source.id], prewarmCommands: [nextSession.command] });
      if (!prepared || prepared.scope !== 'standalone-preview-only') throw new Error('Preview bridge resize prepare rejected the new target lease');
      session = nextSession;
      const result = lifecycle.resize(nextSession.viewport);
      if (shouldResume) lifecycle.resume();
      return result;
    } catch (error) {
      if (shouldResume) lifecycle.resume();
      throw error;
    }
  }
  return Object.freeze({
    edition,
    scope: 'standalone-preview-only',
    play,
    replay: play,
    hold: () => lifecycle.hold(),
    resume: () => lifecycle.resume(),
    resize,
    end: () => { if(session)bridge.retire(session.source);return lifecycle.end(); },
    drain: () => lifecycle.drain(),
    getState: () => lifecycle.getState(),
    async dispose() {
      lifecycle.dispose();
      await cleanupPromise;
    }
  });
}
