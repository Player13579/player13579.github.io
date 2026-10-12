import { createNormalGalleryAudioController } from './normal-gallery-audio-controller.mjs';
import { VERSION as R3_MODEL_VERSION } from '../../inputs/sol-r1701/model.mjs';

const R3_GALLERY_VERSION_ID = 'flora-invisible-codex-sol61-zero-r3';
const R3_SOURCE_MANIFEST_SHA256 = '9cf87e60bf26f25c9573b05d5d94e17d98859074af74dbed3dba1283324aadf5';
const SHARED_FLORA_ZERO_SFX_SHA256 = '58394bf0d49b784b94674c4c4dbcc92be14d16609937c10190565a93013059aa';
const R3_ROUTE_PATH = '/public/flora-zero-codex-sol61/r3-natural-loop-r1965/index.html';

export const FLORA_ZERO_AUDIO_VERSION_BINDINGS = Object.freeze({
  [R3_GALLERY_VERSION_ID]: Object.freeze({
    galleryVersionId: R3_GALLERY_VERSION_ID,
    modelVersion: R3_MODEL_VERSION,
    sourceManifestSha256: R3_SOURCE_MANIFEST_SHA256,
    sfxSha256: SHARED_FLORA_ZERO_SFX_SHA256,
    routePath: R3_ROUTE_PATH,
  }),
});

export function createVersionBoundNormalGalleryAudioController({ galleryVersionId, ...options } = {}) {
  const binding = FLORA_ZERO_AUDIO_VERSION_BINDINGS[galleryVersionId];
  if (!binding) throw new TypeError(`unsupported Flora gallery version: ${String(galleryVersionId)}`);
  const controller = createNormalGalleryAudioController(options);
  async function playCompletedFrame(receipt) {
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
