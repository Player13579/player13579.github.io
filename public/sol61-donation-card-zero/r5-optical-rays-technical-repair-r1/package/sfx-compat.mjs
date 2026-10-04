import {createGallerySfxHook as createSourceHook} from './creative.mjs';

// Translate the frozen Donation {enabled, settled} promise result into the
// boolean contract accepted by the current shared gallery gesture bridge.
// The source hook still owns audio activation and its one restart.
export function createGallerySfxHook(sound, restart, isDisposed = () => false) {
  const source = createSourceHook(sound, restart, isDisposed);
  return Object.freeze({
    ...source,
    activateFromGesture: async (...args) => {
      try {
        const result = await source.activateFromGesture(...args);
        return result?.enabled === true && result?.settled === true && !isDisposed();
      } catch {
        return false;
      }
    }
  });
}
