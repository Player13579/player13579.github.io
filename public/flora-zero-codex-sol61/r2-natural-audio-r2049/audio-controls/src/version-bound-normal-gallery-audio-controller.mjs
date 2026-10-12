import { createNormalGalleryAudioController } from './normal-gallery-audio-controller.mjs';
import { VERSION as R2_MODEL_VERSION } from '../inputs/r1652/model.mjs';

const R1_MODEL_VERSION = 'flora-invisible-codex-sol61-zero-r1';

// Gallery identities are exact, versioned aliases to their own producer model.
// This map deliberately has no fallback and never maps R2 to R1.
export const FLORA_ZERO_AUDIO_VERSION_BINDINGS = Object.freeze({
  'flora-invisible-codex-sol61-zero-r1': Object.freeze({
    galleryVersionId: 'flora-invisible-codex-sol61-zero-r1',
    modelVersion: R1_MODEL_VERSION,
    sourceManifestSha256: '423bc13bbcbd2f6d4d35adc627841bf8adabf819ebddcb5da8b0d7fea5cdc0a3',
    sfxSha256: '58394bf0d49b784b94674c4c4dbcc92be14d16609937c10190565a93013059aa',
    routePath: '/public/flora-zero-codex-sol61/r1-natural-audio-r2049/index.html',
  }),
  'flora-invisible-codex-sol61-zero-r2': Object.freeze({
    galleryVersionId: 'flora-invisible-codex-sol61-zero-r2',
    modelVersion: R2_MODEL_VERSION,
    sourceManifestSha256: '1a8a858b13115190f37c98176b41ac00b8db0c5df84caf7c8b719ea1329fec15',
    sfxSha256: '58394bf0d49b784b94674c4c4dbcc92be14d16609937c10190565a93013059aa',
    routePath: '/public/flora-zero-codex-sol61/r2-natural-audio-r2049/index.html',
  }),
});

export function createVersionBoundNormalGalleryAudioController({ galleryVersionId, ...options } = {}) {
  const binding = FLORA_ZERO_AUDIO_VERSION_BINDINGS[galleryVersionId];
  if (!binding) throw new TypeError(`unsupported Flora gallery version: ${String(galleryVersionId)}`);
  const controller = createNormalGalleryAudioController(options);

  async function playCompletedFrame(receipt) {
    // Keep verification's unconditional mute behavior even for malformed or
    // cross-version receipts. The underlying controller creates no context.
    if (options.verifyMode === true) return controller.playCompletedFrame(receipt);
    if (receipt?.version !== binding.modelVersion) return Object.freeze({ status: 'rejected-version' });
    return controller.playCompletedFrame(receipt);
  }

  return Object.freeze({
    ...controller,
    playCompletedFrame,
    snapshot: () => Object.freeze({ ...controller.snapshot(), galleryVersionId, modelVersion: binding.modelVersion }),
  });
}
