export function createRuntimeInitGate() {
  let state = 'initializing';
  let deferred = false;
  return Object.freeze({
    isReady: () => state === 'ready',
    isClosed: () => state === 'closed',
    defer: () => {
      if (state === 'initializing') deferred = true;
      return false;
    },
    open: () => {
      if (state !== 'initializing') return false;
      state = 'ready';
      const hadDeferredWork = deferred;
      deferred = false;
      return hadDeferredWork;
    },
    close: () => {
      if (state === 'closed') return false;
      state = 'closed';
      deferred = false;
      return true;
    },
  });
}
