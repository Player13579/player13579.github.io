// Child-owned adapter for asset-gallery-sfx-bridge.js. Keep activation in the
// synchronous user-gesture stack; the returned promise only reports readiness.
export function createReloadGallerySfxApi({ verify = false, activate }) {
  let active = true;
  return Object.freeze({
    activateFromGesture(item) {
      if (!active || verify || String(item?.id || '').length === 0) {
        return Promise.resolve({ state: verify ? 'silent' : 'unsupported' });
      }
      try {
        // Invoke before returning/awaiting so AudioContext.resume sees the
        // gallery's transient user activation.
        const result = activate?.(item);
        return Promise.resolve(result).then(value => value ?? { state: 'active' });
      } catch (error) {
        return Promise.reject(error);
      }
    },
    dispose() { active = false; }
  });
}
