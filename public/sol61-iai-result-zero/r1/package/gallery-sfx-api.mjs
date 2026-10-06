export function createIaiGallerySfxApi({ renderer, getState }) {
  if (!renderer || typeof renderer.unlockAudio !== 'function' || typeof getState !== 'function') {
    throw new TypeError('Iai gallery SFX API requires renderer.unlockAudio and live state');
  }
  return Object.freeze({
    activateFromGesture() {
      let state;
      try { state = getState(); } catch { return Promise.resolve(false); }
      if (!state || state.verify === true || state.disposed === true || state.live !== true) {
        return Promise.resolve(false);
      }
      let unlock;
      try {
        // This call happens synchronously in the trusted gesture handler stack.
        unlock = renderer.unlockAudio();
      } catch {
        return Promise.resolve(false);
      }
      if (!unlock || typeof unlock.then !== 'function') return Promise.resolve(false);
      // Return a promise that can report true only for an actual boolean unlock result.
      return Promise.resolve(unlock).then(value => value === true, () => false);
    }
  });
}
