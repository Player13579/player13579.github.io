(function installFloraZeroSfxAdapter(root) {
  'use strict';
  const TARGETS = Object.freeze({
    'flora-invisible-codex-sol61-zero-r1': Object.freeze({
      galleryVersionId: 'flora-invisible-codex-sol61-zero-r1',
      modelVersion: 'flora-invisible-codex-sol61-zero-r1',
      routePath: '/public/flora-zero-codex-sol61/r1/index.html',
      packageManifestSha256: '741972569a8279449cb4cde4d9fe17237f86819cc8ac4d9a49351cb8095b39ac',
      packageSealSha256: 'c0bd2330284099e06007b5f4f74d424121bac6e1db1efba3b4966737104048fe',
      requireAudioModelVersion: false,
    }),
    'flora-invisible-codex-sol61-zero-r2': Object.freeze({
      galleryVersionId: 'flora-invisible-codex-sol61-zero-r2',
      modelVersion: 'flora-invisible-codex-sol61-zero-r2',
      routePath: '/public/flora-zero-codex-sol61/r2/index.html',
      packageManifestSha256: 'a039329565fbea469650de27f65f49c45383f7dca71652ec350779d07b3a9015',
      packageSealSha256: 'c44ad8553adcc275bbba477bc85040cd20f5bbf062243ae4a0392af0d8fc0e6b',
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
