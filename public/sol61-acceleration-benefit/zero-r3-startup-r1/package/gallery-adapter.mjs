import { VERSION } from './model.mjs';
import './runtime.mjs';
import { createGallerySfxFacade, createGalleryStartupHost } from './gallery-host-core.mjs';

const STARTUP_SCHEMA = 'dva-gallery-startup/v1';
const params = new URLSearchParams(window.location.search);
const verify = params.has('verify');
const startup = { token: params.get('galleryStartupToken'), versionId: params.get('galleryVersionId'),
  attemptEpoch: Number(params.get('galleryAttemptEpoch')) };

// Runtime methods remain the authority for playback and SFX. The proxy lets lifecycle
// retirement stay safe even if the parent removes this frame during module evaluation.
const runtime = {
  snapshot: () => window.__dvaAcceleration?.snapshot?.() || { status: 'initializing' },
  enableAudio: () => window.__dvaAcceleration?.enableAudio?.() ?? false,
  setMuted: value => window.__dvaAcceleration?.setMuted?.(value) ?? false,
  stop: () => window.__dvaAcceleration?.stop?.() ?? false,
  dispose: () => window.__dvaAcceleration?.dispose?.()
};
const sfx = createGallerySfxFacade(runtime, verify);
window.__dvaGallerySfx = sfx;
// Exact API consumed by the pinned generic gallery SFX bridge.
window.__gallerySfx = sfx;

const host = createGalleryStartupHost({ win: window, doc: document, location: window.location,
  ...startup, runtime });
window.__dvaGalleryStartupSnapshot = () => host.snapshot;
window.__dvaGalleryStartupHost = host;
const hostStarted = host.start();
if (!hostStarted && window.parent !== window) {
  try { window.parent.postMessage({ schema: STARTUP_SCHEMA, token: startup.token,
    versionId: VERSION, attemptEpoch: startup.attemptEpoch, sequence: 1,
    stage: 'child-document', status: 'error', error: { code: 'INVALID_STARTUP_ENVELOPE',
      message: 'Gallery startup token, version or origin is invalid' } }, window.location.origin); } catch {}
}
if (!window.__dvaAcceleration) {
  if (hostStarted) host.fail('RUNTIME_START_FAILED', 'sealed runtime did not expose __dvaAcceleration');
} else if (hostStarted) host.progress('adapter');
