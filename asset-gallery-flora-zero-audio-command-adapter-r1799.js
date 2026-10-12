(function installFloraZeroSfxAdapter(root) {
  'use strict';
  const TARGETS = Object.freeze({
    'flora-invisible-codex-sol61-zero-r1': Object.freeze({
      galleryVersionId: 'flora-invisible-codex-sol61-zero-r1',
      modelVersion: 'flora-invisible-codex-sol61-zero-r1',
      routePath: '/public/flora-zero-codex-sol61/r1-cleanup-r1772/index.html',
      packageManifestSha256: 'ab72e37d6d23888866e50c258a234906afa34b7645e61a8d2b1ab73f66dd623b',
      packageSealSha256: '62edb421116b17d30095545a1f55d3d5b952eaef8a94f18dcf334fe27d4ebb93',
      requireAudioModelVersion: false,
    }),
    'flora-invisible-codex-sol61-zero-r2': Object.freeze({
      galleryVersionId: 'flora-invisible-codex-sol61-zero-r2',
      modelVersion: 'flora-invisible-codex-sol61-zero-r2',
      routePath: '/public/flora-zero-codex-sol61/r2-cleanup-r1772/index.html',
      packageManifestSha256: '93679ffcc6826270711f6f844999f704da99e790d2781579e205d718529652e2',
      packageSealSha256: '92d797046a01b81a4646c3a49b91da80975c2343b9fbd73e50695c817b0f7c5d',
      requireAudioModelVersion: true,
    }),
    'flora-invisible-codex-sol61-zero-r3': Object.freeze({
      galleryVersionId: 'flora-invisible-codex-sol61-zero-r3',
      modelVersion: 'flora-invisible-codex-sol61-zero-r3',
      routePath: '/public/flora-zero-codex-sol61/r3-cleanup-r1779/index.html',
      packageManifestSha256: 'bc70f32f90e47131f5ec21591bcafe37dc88154cfbd962db2d60a4f399e9f200',
      packageSealSha256: '66059c711cc701ac208d6b1c44ce0212c0382d80c70986c6ba05bafe7879c9d8',
      requireAudioModelVersion: true,
    }),
  });
  // Preserve the current generic factory for every unrelated entry.
  const previousFactory = typeof root.createGallerySfxBridge === 'function'
    ? root.createGallerySfxBridge.bind(root) : null;
  const timers = root;

  function targetForItem(item) {
    const target = TARGETS[item?.id];
    return target && item.packageManifestSha256 === target.packageManifestSha256 &&
      item.packageSealSha256 === target.packageSealSha256 ? target : null;
  }
  function isKnownFlora(item) { return Object.prototype.hasOwnProperty.call(TARGETS, item?.id); }

  function targetIdentity(iframe, item, verify) {
    const target = targetForItem(item);
    if (verify || !target || !iframe?.isConnected) return null;
    try {
      const url = new URL(iframe.src || iframe.getAttribute?.('src'), root.location.href);
      const token = url.searchParams.get('galleryStartupToken') || '';
      const epoch = url.searchParams.get('galleryAttemptEpoch') || '';
      if (url.origin !== root.location.origin || url.pathname !== target.routePath ||
          url.searchParams.get('galleryVersionId') !== target.galleryVersionId ||
          url.searchParams.get('packageManifestSha256') !== target.packageManifestSha256 ||
          url.searchParams.get('embed') !== '1' || url.searchParams.get('galleryAutoLoop') !== '1' ||
          !/^[0-9a-f]{32}$/.test(token) || !/^[1-9][0-9]*$/.test(epoch)) return null;
      const sealQuery = url.searchParams.get('packageSealSha256');
      if (sealQuery !== null && sealQuery !== target.packageSealSha256) return null;
      const child = iframe.contentWindow;
      const doc = iframe.contentDocument || child?.document;
      if (!child || !doc || child.location.origin !== root.location.origin ||
          new URL(child.location.href).searchParams.has('verify')) return null;
      const probe = child.__floraZeroGalleryProbe?.snapshot?.();
      const startup = child.__dvaGalleryStartupSnapshot?.();
      if (!probe || probe.version !== target.modelVersion || probe.verifyMode !== false) return null;
      if (target.requireAudioModelVersion && probe.audio?.modelVersion !== target.modelVersion) return null;
      if (!startup || startup.schema !== 'dva-gallery-startup/v1' || startup.token !== token ||
          startup.versionId !== target.galleryVersionId || startup.attemptEpoch !== Number(epoch) ||
          !Number.isSafeInteger(startup.sequence) || startup.sequence < 0) return null;
      return { child, doc, probe, target };
    } catch (_) { return null; }
  }

  function createGallerySfxBridge(options = {}) {
    const verify = options.verify === true;
    const base = previousFactory ? previousFactory(options) : null;
    let floraFrame = null;
    let floraItem = null;
    let generation = 0;

    function targetFor(item) { return targetForItem(item); }
    function isFlora(item) { return isKnownFlora(item); }
    function current(iframe, item) {
      return iframe === floraFrame && item === floraItem && targetIdentity(iframe, item, verify);
    }
    function readAudio(target) {
      try { return target.child.__floraZeroGalleryProbe.snapshot().audio; } catch (_) { return null; }
    }

    function attachFrame(iframe, item) {
      if (!isFlora(item)) return base?.attachFrame(iframe, item) ?? { state: 'unsupported', reason: 'bridge unavailable' };
      generation++;
      floraFrame = iframe; floraItem = item;
      if (verify) return { state: 'silent', reason: 'verification mode' };
      const target = targetIdentity(iframe, item, false);
      return target ? { state: 'ready', reason: 'explicit user gesture required' }
        : { state: 'unavailable', reason: 'exact Flora route or startup identity is not current' };
    }

    function activateFromGesture(iframe, item) {
      if (!isFlora(item)) return base?.activateFromGesture(iframe, item) ?? { state: 'unsupported', reason: 'bridge unavailable' };
      if (verify) return { state: 'silent', reason: 'verification mode' };
      const target = current(iframe, item);
      if (!target) return { state: 'unsupported', reason: 'exact Flora route or startup identity rejected' };
      const sound = target.doc.getElementById('sound');
      if (!sound || sound.disabled || typeof sound.click !== 'function') return { state: 'unsupported', reason: 'authored sound control unavailable' };
      const operation = ++generation;
      // Forward the user's real parent gesture synchronously to the exact child.
      try { sound.click(); } catch (_) { return { state: 'unsupported', reason: 'authored sound control failed' }; }
      return new Promise(resolve => {
        const startedAt = Date.now();
        const poll = () => {
          if (operation !== generation || !current(iframe, item)) {
            resolve({ state: 'stale', reason: 'preview changed before audio activation settled' }); return;
          }
          const audio = readAudio(target);
          if (!audio || audio.verifyMode !== false && audio.verifyMode !== undefined) {
            resolve({ state: 'unsupported', reason: 'child audio probe unavailable or muted' }); return;
          }
          if (audio.retired) { resolve({ state: 'stale', reason: 'preview retired' }); return; }
          if (audio.playIntent === true && audio.muted === false && audio.playback?.contextState === 'running' &&
              (!target.target.requireAudioModelVersion || audio.modelVersion === target.target.modelVersion)) {
            resolve({ state: 'active', reason: 'child audio context confirmed running' }); return;
          }
          if (Date.now() - startedAt >= 1800) {
            resolve({ state: 'unsupported', reason: 'child did not confirm running normal audio' }); return;
          }
          timers.setTimeout(poll, 20);
        };
        poll();
      });
    }

    function detachFrame(iframe) {
      if (isFlora(floraItem)) {
        if (iframe && iframe !== floraFrame) return false;
        generation++;
        floraFrame = null; floraItem = null;
        return true;
      }
      return base?.detachFrame(iframe) ?? false;
    }

    return Object.freeze({ attachFrame, activateFromGesture, detachFrame,
      get status() { return isFlora(floraItem) ? { id: floraItem.id, state: 'attached' } : (base?.status ?? { state: 'idle' }); } });
  }

  Object.defineProperty(root, 'createFloraZeroGallerySfxBridge', { configurable: true, value: createGallerySfxBridge });
  Object.defineProperty(root, 'createGallerySfxBridge', { configurable: true, value: createGallerySfxBridge });
  if (typeof module !== 'undefined' && module.exports) module.exports = { createGallerySfxBridge,
    FLORA_ZERO_AUDIO_TARGETS: TARGETS };
})(typeof window !== 'undefined' ? window : globalThis);
