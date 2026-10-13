/* Version-bound Levitation adapter. The source owns visual/audio state; this layer only
   connects the gallery's real user gesture to the exact selected child runtime. */
(function (root) {
  'use strict';
  const VERSION_ID = 'levitation-support-volume-sol61-add1-20261013';
  const ROUTE = '/public/levitation-support-field-addone-sol61/index.html';
  const MANIFEST = '05b69595c10d6d1406debe5b7d64df9d53c02a35f7a295bd6b510c7bfac95355';
  const SEAL = 'c3e8deac9eb9a577b8802793f8de788eb9d142f9e1cdf7fbd2e294b45df9a511';
  const SOURCE = '8e1e8f6037e7a2195f2d6789c3a448a92dff1aca39de3c001ec43a2b1abec02c';
  const originalFactory = root.createGallerySfxBridge;
  if (typeof originalFactory !== 'function') throw new Error('gallery SFX bridge must load before Levitation adapter');
  function createGallerySfxBridge(options = {}) {
    const base = originalFactory(options);
    let active = null;
    function readRoute(iframe, item) {
      try {
        if (item?.id !== VERSION_ID || item?.packageManifestSha256 !== MANIFEST || item?.packageSealSha256 !== SEAL || item?.sourceManifestSha256 !== SOURCE) return null;
        const win = iframe?.contentWindow;
        const url = new URL(win?.location?.href);
        if (url.origin !== root.location.origin || url.pathname !== ROUTE
          || url.searchParams.get('galleryVersionId') !== VERSION_ID
          || url.searchParams.get('galleryPackageManifestSha256') !== MANIFEST
          || url.searchParams.get('galleryPackageSealSha256') !== SEAL
          || url.searchParams.get('gallerySourceManifestSha256') !== SOURCE
          || !/^[0-9a-f]{32}$/.test(url.searchParams.get('galleryStartupToken') || '')
          || !/^[1-9][0-9]*$/.test(url.searchParams.get('galleryAttemptEpoch') || '')) return null;
        const api = win.__levitation;
        let snapshot = null;
        try { snapshot = api?.snapshot?.() ?? null; } catch (_) { /* child may still be initializing */ }
        return { win, url, api, snapshot,
          token: url.searchParams.get('galleryStartupToken'), epoch: url.searchParams.get('galleryAttemptEpoch'),
          verify: options.verify === true || url.searchParams.has('verify') };
      } catch (_) { return null; }
    }
    function attachFrame(iframe, item) {
      if (item?.id !== VERSION_ID) { active = null; return base.attachFrame(iframe, item); }
      const child = readRoute(iframe, item);
      if (!child) { active = { iframe, item, state: 'unavailable', reason: 'Levitation route or source identity did not match' }; return { state: active.state, reason: active.reason }; }
      if (child.api && child.snapshot?.versionId !== VERSION_ID) { active = { iframe, item, state: 'unavailable', reason: 'Levitation runtime version did not match the selected source' }; return { state: active.state, reason: active.reason }; }
      const state = child.verify ? 'silent' : child.snapshot?.ready === true ? 'ready' : 'pending';
      active = { iframe, item, token: child.token, epoch: child.epoch, state,
        reason: child.verify ? 'verification mode is hard-muted' : state === 'pending' ? 'waiting for source-owned runtime startup' : '' };
      base.attachFrame(iframe, item);
      return { state: active.state, reason: active.reason };
    }
    function activateFromGesture(iframe, item) {
      if (item?.id !== VERSION_ID) { active = null; return base.activateFromGesture(iframe, item); }
      const child = readRoute(iframe, item);
      if (!active || active.iframe !== iframe || active.item?.id !== VERSION_ID || !child || active.token !== child.token || active.epoch !== child.epoch) {
        active = { iframe, item, state: 'unavailable', reason: 'Levitation selection changed or route identity is stale' };
        return { state: active.state, reason: active.reason };
      }
      if (child.verify) { active = { ...active, state: 'silent', reason: 'verification mode is hard-muted' }; return { state: 'silent', reason: active.reason }; }
      if (!child.api || typeof child.api.enableAudio !== 'function' || child.snapshot?.versionId !== VERSION_ID || child.snapshot?.ready !== true) {
        active = { ...active, state: 'pending', reason: 'Levitation source has not completed startup' };
        return { state: active.state, reason: active.reason };
      }
      let result;
      try { result = child.api.enableAudio(); }
      catch (_) { active = { ...active, state: 'unsupported', reason: 'Levitation audio activation failed' }; return { state: active.state, reason: active.reason }; }
      const normalize = value => {
        if (value?.ok === true) { active = { ...active, state: 'active', reason: 'using Levitation authored SFX' }; return { state: 'active', reason: active.reason, snapshot: value.snapshot }; }
        active = { ...active, state: 'unsupported', reason: value?.reason || 'Levitation did not confirm audio activation' };
        return { state: active.state, reason: active.reason, snapshot: value?.snapshot };
      };
      if (result && typeof result.then === 'function') {
        active = { ...active, state: 'pending', reason: 'waiting for Levitation audio status' };
        return Promise.resolve(result).then(normalize, () => normalize({ ok: false }));
      }
      return normalize(result);
    }
    function detachFrame(iframe) {
      if (iframe && active?.iframe && active.iframe !== iframe) return false;
      const wasActive = active?.iframe === iframe;
      if (wasActive) active = null;
      const detached = base.detachFrame(iframe);
      return detached === false ? false : true;
    }
    return Object.freeze({ attachFrame, activateFromGesture, detachFrame, get status() {
      return active ? { id: VERSION_ID, state: active.state, reason: active.reason } : base.status;
    } });
  }
  root.createGallerySfxBridge = createGallerySfxBridge;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createGallerySfxBridge };
})(typeof window !== 'undefined' ? window : globalThis);
