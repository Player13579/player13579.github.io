(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (!params.has('embed') || params.has('verify')) return;
  let activated = false;
  const onGesture = event => {
    if (!event.isTrusted || activated) return;
    const bridge = window.__gallerySfx;
    if (!bridge || typeof bridge.activateFromGesture !== 'function') return;
    activated = true;
    document.removeEventListener('pointerdown', onGesture, true);
    document.removeEventListener('keydown', onGesture, true);
    Promise.resolve(bridge.activateFromGesture()).then(result => {
      window.__r9GalleryAudioBridge.lastResult = result?.state || 'unknown';
    }, () => { window.__r9GalleryAudioBridge.lastResult = 'locked'; });
  };
  document.documentElement.dataset.r9GalleryAudioBridge = 'trusted-gesture-to-existing-proof-gated-sfx';
  window.__r9GalleryAudioBridge = { mode: 'embedded normal route; existing __gallerySfx; source submission proof retained', lastResult: 'awaiting-gesture' };
  document.addEventListener('pointerdown', onGesture, true);
  document.addEventListener('keydown', onGesture, true);
})();
