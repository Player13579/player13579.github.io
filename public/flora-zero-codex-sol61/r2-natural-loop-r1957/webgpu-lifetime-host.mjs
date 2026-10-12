const finite = Number.isFinite;

function assertSource(source) {
  if (!source || typeof source.causeId !== 'string' || !source.causeId ||
      typeof source.sourceId !== 'string' || !source.sourceId ||
      !Number.isFinite(source.startedAtMs) || !Number.isFinite(source.durationMs) ||
      source.durationMs <= 0 || !Number.isSafeInteger(source.generation) ||
      source.generation < 1 || !['producer-e-age','preview-monotonic-rate1'].includes(source.clockKind) ||
      source.clockKind === 'producer-e-age' && !finite(source.eElapsedMs))
    throw new TypeError('CURRENT_FINITE_SOURCE_REQUIRED');
}

/**
 * Fresh generic WebGPU effect host. Creative shader code is injected through
 * `effectFactory`; this module owns only device, frame, fence, source clock and
 * retirement semantics. No Canvas2D or GPU readback path exists here.
 */
export function createWebGpuLifetimeHost({ canvas, effectFactory, verify = false,
  now = () => performance.now(), requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id), readElapsedMs = (source, at) => {
    if (source.clockKind === 'producer-e-age') return source.eElapsedMs;
    if (source.clockKind === 'preview-monotonic-rate1') return at - source.startedAtMs;
    return NaN;
  }, readFrameOptions = () => ({}),
  onReceipt = () => {}, onFailure = () => {},
  onState = () => {}, audio = null } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function' ||
      typeof effectFactory?.create !== 'function' || typeof now !== 'function' ||
      typeof requestFrame !== 'function' || typeof cancelFrame !== 'function' ||
      typeof readElapsedMs !== 'function' || typeof readFrameOptions !== 'function')
    throw new TypeError('CANVAS_EFFECT_FACTORY_AND_FRAME_CLOCK_REQUIRED');

  let state = 'new', adapter = null, device = null, context = null, effect = null;
  let format = null;
  let deviceLostPromise = null;
  let frameHandle = null, frameId = 0, source = null, sourceSerial = 0;
  let retirePromise = null, lostRecord = null, lastFailure = null;
  const pending = new Set(), activeFrames = new Set(), audioOperations = new Set(), audioFailures = [];
  const terminalFlights = new Map();
  let lastTerminalReceipt = null, lastTerminalDiagnosticReceipt = null;
  const listeners = new Set();
  const emit = (name, detail = {}) => {
    const item = Object.freeze({ name, state, at: now(), ...detail });
    try { onState(item); } catch (_) {}
    for (const listener of listeners) { try { listener(item); } catch (_) {} }
  };
  const fail = error => {
    if (state === 'retired' || state === 'retiring') return;
    lastFailure = error instanceof Error ? error : new Error(String(error));
    state = 'failed';
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    try { onFailure(lastFailure); } catch (_) {}
    emit('failure', { message: String(lastFailure.message || lastFailure) });
    queueMicrotask(() => { void retire().catch(() => {}); });
  };
  const elapsed = (currentSource, at = now()) => {
    const value = readElapsedMs(currentSource, at);
    if (!finite(value) || value < 0) throw new Error('INVALID_SOURCE_CLOCK');
    return value;
  };

  async function start() {
    if (state !== 'new') throw new Error('HOST_START_IS_SINGLE_USE');
    if (!globalThis.navigator?.gpu) throw new Error('WEBGPU_UNAVAILABLE');
    state = 'starting'; emit('adapter-request');
    try {
      adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('WEBGPU_ADAPTER_UNAVAILABLE');
      emit('device-request');
      device = await adapter.requestDevice();
      if (!device?.queue?.submit || typeof device.queue.onSubmittedWorkDone !== 'function' ||
          typeof device.createCommandEncoder !== 'function' || typeof device.pushErrorScope !== 'function' ||
          typeof device.popErrorScope !== 'function' || typeof device.destroy !== 'function')
        throw new Error('WEBGPU_DEVICE_QUEUE_API_INCOMPLETE');
      context = canvas.getContext('webgpu');
      if (!context?.configure || !context?.getCurrentTexture)
        throw new Error('WEBGPU_CANVAS_CONTEXT_UNAVAILABLE');
      format = navigator.gpu.getPreferredCanvasFormat();
      if (!['bgra8unorm', 'rgba8unorm'].includes(format))
        throw new Error('UNSUPPORTED_CANVAS_FORMAT');
      context.configure({ device, format, alphaMode: 'opaque' });
      deviceLostPromise = Promise.resolve(device.lost).then(info => {
        lostRecord = Object.freeze({ reason: info?.reason || 'unknown', message: info?.message || '',
          at: now(), device });
        emit('device-lost', { reason: lostRecord.reason, message: lostRecord.message,
          wasOwnedRetirement: state === 'retiring' || state === 'retired' });
        if (state !== 'retiring' && state !== 'retired') fail(new Error('WEBGPU_DEVICE_LOST:' + lostRecord.reason));
        return lostRecord;
      }, error => {
        lostRecord = Object.freeze({ reason: 'loss-promise-rejected', message: String(error?.message || error),
          at: now(), device });
        if (state !== 'retiring' && state !== 'retired') fail(new Error('WEBGPU_DEVICE_LOST_PROMISE_REJECTED'));
        return lostRecord;
      });
      emit('effect-create', { format });
      effect = await effectFactory.create({ device, format, context, canvas });
      if (!effect || typeof effect.encodeFrame !== 'function' || typeof effect.dispose !== 'function')
        throw new Error('EFFECT_RUNTIME_API_INCOMPLETE');
      state = 'ready'; emit('ready', { format });
      return snapshot();
    } catch (error) {
      fail(error);
      await retire();
      throw error;
    }
  }

  async function play(nextSource) {
    if (state !== 'ready') throw new Error('HOST_NOT_READY');
    assertSource(nextSource);
    if (nextSource.generation < sourceSerial) throw new Error('STALE_SOURCE_GENERATION');
    if (source && nextSource.generation === source.generation &&
        (nextSource.sourceId !== source.sourceId || nextSource.causeId !== source.causeId))
      throw new Error('SOURCE_GENERATION_COLLISION');
    if (source && nextSource.generation === source.generation &&
        nextSource.sourceId === source.sourceId && nextSource.causeId === source.causeId) {
      if (nextSource.startedAtMs !== source.startedAtMs || nextSource.durationMs !== source.durationMs ||
          nextSource.clockKind !== source.clockKind)
        throw new Error('SOURCE_IDENTITY_METADATA_CHANGED');
      if (source.clockKind === 'producer-e-age') {
        if (nextSource.eElapsedMs < source.eElapsedMs) throw new Error('SOURCE_CLOCK_REGRESSED');
        source.eElapsedMs = nextSource.eElapsedMs;
      }
      return false;
    }
    if (source && nextSource.generation > source.generation)
      await stopSource({ sourceId: source.sourceId, causeId: source.causeId,
        generation: source.generation, reason: 'source-generation-replaced' });
    if (nextSource.generation === sourceSerial && source === null && sourceSerial !== 0)
      throw new Error('SOURCE_GENERATION_ALREADY_RETIRED');
    source = nextSource;
    lastTerminalReceipt = null; lastTerminalDiagnosticReceipt = null;
    sourceSerial = Math.max(sourceSerial, source.generation);
    if (frameHandle === null) frameHandle = requestFrame(tick);
    emit('source-accepted', { sourceId: source.sourceId, causeId: source.causeId,
      generation: source.generation, startedAtMs: source.startedAtMs, durationMs: source.durationMs });
  }

  function tick(_frameStartTimestamp) {
    frameHandle = null;
    if (state !== 'ready' || !source) return;
    const active = source;
    let age;
    // RAF timestamps describe frame start, not callback execution/source acceptance.
    try { age = elapsed(active); } catch (error) { fail(error); return; }
    if (age >= active.durationMs) { void completeNaturalTerminal(active).catch(fail); return; }
    void submitFrame(active, age).then(() => {
      if (state === 'ready' && source === active && frameHandle === null)
        frameHandle = requestFrame(tick);
    }, error => {
      if (error?.code === 'FRAME_SOURCE_SUPERSEDED') {
        if (state === 'ready' && source === active) void completeNaturalTerminal(active).catch(fail);
      } else fail(error);
    });
  }

  function completeNaturalTerminal(active) {
    if (terminalFlights.has(active)) return terminalFlights.get(active);
    const flight = (async () => {
      if (frameHandle !== null) cancelFrame(frameHandle);
      frameHandle = null;
      const prior = await Promise.allSettled([...activeFrames]);
      const rejected = prior.find(r => r.status === 'rejected' && r.reason?.code !== 'FRAME_SOURCE_SUPERSEDED');
      if (rejected) throw rejected.reason;
      if (state !== 'ready' || source !== active || active.generation !== sourceSerial) return null;
      const age = elapsed(active);
      if (age < active.durationMs) throw Error('NATURAL_TERMINAL_REQUIRES_ACTUAL_EXPIRED_SOURCE');
      let receipt;
      try { receipt = await submitFrame(active, age, false, true); }
      catch (error) { if (error?.code === 'FRAME_SOURCE_SUPERSEDED') return null; throw error; }
      if (!receipt || state !== 'ready' || source !== active || active.generation !== sourceSerial) return null;
      lastTerminalReceipt = receipt;
      await stopAudioSource(active, 'source-expired');
      if (state !== 'ready' || source !== active || active.generation !== sourceSerial) return null;
      source = null;
      emit('source-expired', { sourceId: active.sourceId, causeId: active.causeId,
        generation: active.generation, elapsedMs: receipt.elapsedMs, terminalFrameId: receipt.frameId });
      return receipt;
    })().finally(() => terminalFlights.delete(active));
    terminalFlights.set(active, flight);
    return flight;
  }

  function submitFrame(activeSource = source, elapsedMs = activeSource ? elapsed(activeSource) : NaN, diagnostic = false, terminal = false) {
    const operation = submitFrameInternal(activeSource, elapsedMs, diagnostic, terminal);
    activeFrames.add(operation);
    operation.finally(() => activeFrames.delete(operation)).catch(() => {});
    return operation;
  }

  async function captureDiagnosticFrame(elapsedMs, { resume = true } = {}) {
    if (state !== 'ready' || !source || !finite(elapsedMs) || elapsedMs < 0 || elapsedMs >= source.durationMs)
      throw new Error('CURRENT_SOURCE_AND_IN_LIFETIME_DIAGNOSTIC_AGE_REQUIRED');
    const capturedSource = source;
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    await Promise.allSettled([...activeFrames]);
    if (state !== 'ready' || source !== capturedSource || elapsed(capturedSource) >= capturedSource.durationMs)
      throw new Error('SOURCE_EXPIRED_OR_REPLACED_BEFORE_DIAGNOSTIC_CAPTURE');
    const receipt = await submitFrame(capturedSource, elapsedMs, true);
    if (!receipt || receipt.completed !== true) throw new Error('DIAGNOSTIC_FRAME_NOT_COMPLETED_WHILE_SOURCE_CURRENT');
    if (resume) resumePump();
    emit('diagnostic-frame-completed', { sourceId: capturedSource.sourceId, causeId: capturedSource.causeId,
      generation: capturedSource.generation, elapsedMs, frameId: receipt.frameId });
    return receipt;
  }

  async function captureTerminalDiagnosticFrame(elapsedMs, { resume = false } = {}) {
    if (state !== 'ready' || !source || !finite(elapsedMs) || elapsedMs < source.durationMs)
      throw Error('CURRENT_SOURCE_AND_EXPIRED_DIAGNOSTIC_AGE_REQUIRED');
    const active = source;
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    const prior = await Promise.allSettled([...activeFrames]);
    const rejected = prior.find(r => r.status === 'rejected');
    if (rejected) throw rejected.reason;
    if (state !== 'ready' || source !== active || terminalFlights.has(active))
      throw Error('SOURCE_REPLACED_OR_NATURAL_TERMINAL_PENDING');
    const receipt = await submitFrame(active, elapsedMs, true, true);
    if (!receipt || receipt.active !== false || !receipt.completed) throw Error('TERMINAL_DIAGNOSTIC_NOT_COMPLETED');
    lastTerminalDiagnosticReceipt = receipt;
    if (resume) resumePump();
    return receipt;
  }

  function resumePump() {
    if (state === 'ready' && source && frameHandle === null) {
      let age; try { age = elapsed(source); } catch (error) { fail(error); return false; }
      if (age >= source.durationMs) { void completeNaturalTerminal(source).catch(fail); return false; }
      frameHandle = requestFrame(tick); return true;
    }
    return false;
  }

  async function submitFrameInternal(activeSource, elapsedMs, diagnostic = false, terminal = false) {
    if (state !== 'ready' || !activeSource || activeSource !== source)
      throw new Error('STALE_FRAME_SOURCE');
    if (!finite(elapsedMs) || elapsedMs < 0 || (terminal ? elapsedMs < activeSource.durationMs : elapsedMs >= activeSource.durationMs))
      throw Error('EXACT_ACTIVE_OR_TERMINAL_FRAME_AGE_REQUIRED');
    const currentFrame = ++frameId;
    const target = context.getCurrentTexture();
    const view = target.createView();
    const encoder = device.createCommandEncoder({ label: `Flora zero frame ${currentFrame}` });
    const errors = [];
    device.pushErrorScope('out-of-memory');
    device.pushErrorScope('internal');
    device.pushErrorScope('validation');
    let submitted = false, encoded = null;
    try {
      encoded = await effect.encodeFrame({ device, encoder, target: view,
        width: canvas.width, height: canvas.height, format,
        frameId: currentFrame, source: activeSource, elapsedMs,
        options: readFrameOptions(activeSource, elapsedMs),
        normalAudioEnabled: !verify && !diagnostic && !terminal,
        captureKind: terminal ? (diagnostic ? 'controlled-age-terminal-diagnostic' : 'natural-terminal-clear') : (diagnostic ? 'controlled-age-diagnostic' : 'natural-frame') });
      if (state !== 'ready' || activeSource !== source ||
            activeSource.generation !== sourceSerial ||
            !diagnostic && (terminal ? elapsed(activeSource) < activeSource.durationMs : elapsed(activeSource) >= activeSource.durationMs))
          throw Object.assign(new Error('SOURCE_OR_HOST_RETIRED_DURING_ENCODING'), { code: 'FRAME_SOURCE_SUPERSEDED' });
      const runtimeReceipt = encoded?.receipt || encoded;
      if (!runtimeReceipt || runtimeReceipt.sourceId !== activeSource.sourceId ||
          runtimeReceipt.causeId !== activeSource.causeId || runtimeReceipt.generation !== activeSource.generation ||
          runtimeReceipt.clockKind !== activeSource.clockKind ||
          runtimeReceipt.durationMs !== activeSource.durationMs ||
          runtimeReceipt.startedAtMs !== activeSource.startedAtMs || runtimeReceipt.elapsedMs !== elapsedMs ||
          runtimeReceipt.active !== !terminal || typeof runtimeReceipt.version !== 'string')
        throw new Error('EFFECT_FRAME_SOURCE_BINDING_MISMATCH');
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
      submitted = true;
      const scopes = [device.popErrorScope(), device.popErrorScope(), device.popErrorScope()];
      const queueDone = device.queue.onSubmittedWorkDone();
      const validation = Promise.all(scopes).then(errors => {
        const error = errors.find(Boolean);
        if (error) throw error;
        return null;
      });
      let runtimeSubmitted;
      try {
        runtimeSubmitted = typeof encoded.onSubmitted === 'function'
          ? Promise.resolve(encoded.onSubmitted({ frameId: currentFrame, validation, done: queueDone }))
          : Promise.resolve();
      } catch (error) { runtimeSubmitted = Promise.reject(error); }
      const tracked = Promise.allSettled([validation, queueDone, runtimeSubmitted]).then(results => {
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
        const runtimeCompletion = results[2].value;
        if (typeof encoded.onSubmitted === 'function' &&
            (!runtimeCompletion || runtimeCompletion.submitted !== true || runtimeCompletion.completed !== true ||
             runtimeCompletion.frameId !== currentFrame || runtimeCompletion.sourceId !== activeSource.sourceId ||
             runtimeCompletion.causeId !== activeSource.causeId || runtimeCompletion.generation !== activeSource.generation || runtimeCompletion.active !== !terminal))
          throw new Error('EFFECT_COMPLETION_RECEIPT_MISMATCH');
        let stillOwned = false;
        try {
          stillOwned = (state === 'ready' && activeSource === source &&
              (diagnostic || (terminal ? elapsed(activeSource) >= activeSource.durationMs : elapsed(activeSource) < activeSource.durationMs))) ||
            (!terminal && state === 'retiring' && activeSource.generation === sourceSerial);
        } catch (_) {}
        if (!stillOwned || activeSource.generation !== sourceSerial) return null;
        const receipt = Object.freeze({ ...runtimeReceipt, kind: 'flora-zero-frame-completed',
          captureKind: terminal ? (diagnostic ? 'controlled-age-terminal-diagnostic' : 'natural-terminal-clear') : (diagnostic ? 'controlled-age-diagnostic' : 'natural-frame'),
          sourceId: activeSource.sourceId, causeId: activeSource.causeId,
          generation: activeSource.generation, startedAtMs: activeSource.startedAtMs,
          durationMs: activeSource.durationMs, clockKind: activeSource.clockKind,
          frameId: currentFrame, elapsedMs, submitted: true, completed: true,
          sameDevice: true, target, encoder, device, completedAtMs: now() });
        try { onReceipt(receipt); } catch (_) {}
        if (state === 'ready' && !verify && !diagnostic && !terminal && audio?.playCompletedFrame) {
          const operation = Promise.resolve().then(() => audio.playCompletedFrame(receipt)).catch(error => {
            audioFailures.push(error);
            emit('audio-playback-failed', { sourceId: receipt.sourceId, causeId: receipt.causeId,
              generation: receipt.generation, message: String(error?.message || error) });
          }).finally(() => audioOperations.delete(operation));
          audioOperations.add(operation);
        }
        emit('frame-completed', { sourceId: receipt.sourceId, causeId: receipt.causeId,
          generation: receipt.generation, frameId: currentFrame, elapsedMs });
        return receipt;
      }).finally(() => pending.delete(tracked));
      pending.add(tracked);
      return await tracked;
    } catch (error) {
      if (!submitted && typeof encoded?.abandon === 'function') {
        try { encoded.abandon(); } catch (abandonError) { audioFailures.push(abandonError); }
      }
      if (!submitted) {
        // Pop every scope even when encoding fails before submit; no scope is left stacked.
        const scopes = [device.popErrorScope(), device.popErrorScope(), device.popErrorScope()];
        await Promise.allSettled(scopes);
      }
      throw error;
    }
  }

  function snapshot() {
    return Object.freeze({ state, frameId, source: source && Object.freeze({ ...source }),
      pendingFrames: pending.size, terminalPending: terminalFlights.size,
      lastTerminalReceipt, lastTerminalDiagnosticReceipt, lost: lostRecord && Object.freeze({ reason: lostRecord.reason,
        message: lostRecord.message, at: lostRecord.at, sameDevice: lostRecord.device === device }),
      failure: lastFailure && String(lastFailure.message || lastFailure) });
  }
  async function stopAudioSource(activeSource, reason) {
    if (!audio?.stopSource) return Object.freeze({ requested: 0, remaining: 0, errors: [] });
    const receipt = await audio.stopSource({ sourceId: activeSource.sourceId,
      causeId: activeSource.causeId, generation: activeSource.generation, reason });
    if (!receipt || receipt.remaining !== 0 || !Array.isArray(receipt.errors) || receipt.errors.length)
      throw new Error('AUDIO_SOURCE_STOP_NOT_SETTLED');
    return receipt;
  }
  async function stopSource({ sourceId, causeId, generation, reason = 'explicit-stop' } = {}) {
    const active = source;
    if (!active || active.sourceId !== sourceId || active.causeId !== causeId ||
        active.generation !== generation) return Object.freeze({ stopped: false, reason: 'not-current-source' });
    source = null;
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    emit('source-stopped', { sourceId, causeId, generation, reason });
    const audioReceipt = await stopAudioSource(active, reason);
    return Object.freeze({ stopped: true, sourceId, causeId, generation, reason, audioReceipt });
  }
  function subscribe(listener) { if (typeof listener !== 'function') throw new TypeError('LISTENER_REQUIRED'); listeners.add(listener); return () => listeners.delete(listener); }

  function retire() {
    if (retirePromise) return retirePromise;
    if (state === 'retired') return Promise.resolve(snapshot());
    state = 'retiring';
    if (frameHandle !== null) cancelFrame(frameHandle);
    frameHandle = null;
    const retiringSource = source; source = null;
    emit('retiring', { sourceId: retiringSource?.sourceId ?? null, causeId: retiringSource?.causeId ?? null });
    retirePromise = (async () => {
      const pendingResults = await Promise.allSettled([...new Set([...pending, ...activeFrames, ...terminalFlights.values()])]);
      const pendingErrors = pendingResults.filter(result => result.status === 'rejected').map(result => result.reason);
      let effectError = null, queueError = null;
      let lostWaitError = null;
      if (retiringSource) {
        try { await stopAudioSource(retiringSource, 'host-retirement'); }
        catch (error) { effectError ||= error; }
      }
      try {
        const audioReceipt = await audio?.retire?.();
        if (audioReceipt && (audioReceipt.settled !== true ||
            Array.isArray(audioReceipt.errors) && audioReceipt.errors.length > 0))
          effectError ||= new Error('AUDIO_RETIREMENT_NOT_SETTLED:' + JSON.stringify(audioReceipt));
      } catch (error) { effectError ||= error; }
      await Promise.allSettled([...audioOperations]);
      if (audioFailures.length) effectError ||= new AggregateError(audioFailures, 'AUDIO_PLAYBACK_FAILURES');
      try { await effect?.dispose?.(); } catch (error) { effectError ||= error; }
      try { if (device) await device.queue.onSubmittedWorkDone(); } catch (error) { queueError = error; }
      try { context?.unconfigure?.(); } catch (error) { queueError ||= error; }
      if (device) {
        try { device.destroy(); } catch (error) { queueError ||= error; }
        if (deviceLostPromise) {
          let timer;
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('DEVICE_LOST_RETIREMENT_TIMEOUT')), 3000);
          });
          try { await Promise.race([deviceLostPromise, timeout]); }
          catch (error) { lostWaitError = error; }
          finally { clearTimeout(timer); }
        }
      }
      state = 'retired';
      emit('retired', { pendingErrorCount: pendingErrors.length,
        effectError: effectError && String(effectError.message || effectError),
        queueError: queueError && String(queueError.message || queueError),
        lostWaitError: lostWaitError && String(lostWaitError.message || lostWaitError),
        lost: lostRecord && { reason: lostRecord.reason, sameDevice: lostRecord.device === device } });
      if (pendingErrors.length || effectError || queueError || lostWaitError)
        throw new AggregateError([...pendingErrors, effectError, queueError, lostWaitError].filter(Boolean), 'FLORA_HOST_RETIREMENT_FAILED');
      return snapshot();
    })();
    return retirePromise;
  }

  return Object.freeze({ start, play, submitFrame, captureDiagnosticFrame, captureTerminalDiagnosticFrame, resumeAfterDiagnostic: resumePump,
    stopSource, retire, snapshot, subscribe,
    get state() { return state; }, get device() { return device; } });
}
