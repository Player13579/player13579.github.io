function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value)}return value}

export function createSettledRetirement({
  prepare, awaitInitialization, readDevice, readContext, disposeResources, closeAudio,
  lostDeadlineMs = 8500, queueDrainDeadlineMs = 8500, now = () => performance.now()
} = {}) {
  if (![prepare, awaitInitialization, readDevice, readContext, disposeResources, closeAudio].every(x => typeof x === 'function')) {
    throw new TypeError('retirement requires actual owner callbacks');
  }
  let promise = null;
  let state = { phase: 'active', startedAt: null, settledAt: null, lifecycle: null, error: null };
  const snapshot = () => Object.freeze({
    phase: state.phase, startedAt: state.startedAt, settledAt: state.settledAt,
    lifecycle: state.lifecycle ? deepFreeze(structuredClone(state.lifecycle)) : null,
    error: state.error ? { name: state.error.name, message: state.error.message } : null
  });
  const retire = () => {
    if (promise) return promise;
    state.phase = 'retiring'; state.startedAt = now();
    try { prepare(); } catch (error) { state.error = error; }
    promise = (async () => {
      const errors = [];
      if (state.error) errors.push(`prepare: ${state.error.message || state.error}`);
      let initializationSettled = false;
      try { await awaitInitialization(); initializationSettled = true; }
      catch (error) { errors.push(`initialization: ${error?.message || error}`); }
      let device, context;
      try { device = readDevice(); } catch (error) { errors.push(`device access: ${error?.message || error}`); }
      try { context = readContext(); } catch (error) { errors.push(`context access: ${error?.message || error}`); }
      let drained = false, contextUnconfigured = false, destroyCalled = false, lostReason = null;
      let deviceLostSettled = false;
      if (!device) errors.push('owned GPUDevice was not created');
      else {
        let timer;
        try { await Promise.race([Promise.resolve(device.queue.onSubmittedWorkDone()), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`queue drain exceeded ${queueDrainDeadlineMs}ms deadline`)), queueDrainDeadlineMs); })]); drained = true; }
        catch (error) { errors.push(`queue drain: ${error?.message || error}`); }
        finally { clearTimeout(timer); }
      }
      let resources = { total: 0, disposed: 0 };
      try {
        resources = await disposeResources() || resources;
        if (Array.isArray(resources.errors)) for (const detail of resources.errors) errors.push(`resource disposal: ${detail}`);
        if (!Number.isSafeInteger(resources.total) || !Number.isSafeInteger(resources.disposed) || resources.disposed !== resources.total) {
          errors.push('owned renderer resources were not all disposed');
        }
      } catch (error) { errors.push(`resource disposal: ${error?.message || error}`); }
      if (!context) errors.push('owned GPUCanvasContext was not created');
      else {
        try { context.unconfigure(); contextUnconfigured = true; }
        catch (error) { errors.push(`context unconfigure: ${error?.message || error}`); }
      }
      let lostPromise;
      if (device) {
        try { lostPromise = device.lost; }
        catch (error) { errors.push(`device.lost access: ${error?.message || error}`); }
        try { destroyCalled = true; device.destroy(); }
        catch (error) { errors.push(`device destroy: ${error?.message || error}`); }
        if (lostPromise && typeof lostPromise.then === 'function') {
          let timer;
          try {
            const info = await Promise.race([
              Promise.resolve(lostPromise),
              new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`device.lost exceeded ${lostDeadlineMs}ms deadline`)), lostDeadlineMs); })
            ]);
            deviceLostSettled = true;
            lostReason = info?.reason ?? null;
            if (lostReason !== 'destroyed') errors.push(`device.lost reason was ${String(lostReason)}`);
          } catch (error) { errors.push(`device.lost: ${error?.message || error}`); }
          finally { clearTimeout(timer); }
        } else errors.push('device.lost is not a promise');
      }
      let audio = { contextState: 'absent', voicesRemaining: 0 };
      try {
        audio = await closeAudio() || audio;
        if (!['absent', 'closed'].includes(audio.contextState) || audio.voicesRemaining !== 0) errors.push('audio teardown did not settle closed/absent with zero voices');
      } catch (error) { errors.push(`audio teardown: ${error?.message || error}`); }
      const destroyedLoss = Boolean(device && drained && destroyCalled && deviceLostSettled && lostReason === 'destroyed');
      const lifecycle = {
        disposeSettled: true,
        teardown: errors.length === 0 && initializationSettled ? 'disposed' : 'unknown',
        deviceLifecycle: errors.length === 0 && initializationSettled && destroyedLoss ? 'destroyed-loss-settled' : 'unknown',
        device: { status: errors.length === 0 && initializationSettled && destroyedLoss ? 'destroyed-loss-settled' : 'unknown', drained, destroyCalled, lostReason },
        renderer: { contextUnconfigured, resourcesDisposed: resources.disposed === resources.total && Number.isSafeInteger(resources.total) },
        audio: { contextState: audio.contextState, voicesRemaining: audio.voicesRemaining },
        cleanupErrors: errors,
        initializationSettled,
        rendererResourceCount: resources.total,
        teardownStartedAt: state.startedAt,
        teardownSettledAt: now()
      };
      state.settledAt = lifecycle.teardownSettledAt;
      state.lifecycle = deepFreeze(structuredClone(lifecycle));
      if (errors.length || !initializationSettled || !destroyedLoss || !contextUnconfigured || !lifecycle.renderer.resourcesDisposed) {
        const error = new Error(errors.join('; ') || 'retirement lifecycle proof incomplete');
        error.lifecycle = deepFreeze(structuredClone(lifecycle));
        state.error = error; state.phase = 'error';
        throw error;
      }
      state.phase = 'settled';
      return deepFreeze(structuredClone(lifecycle));
    })();
    return promise;
  };
  return Object.freeze({ retire, snapshot });
}
