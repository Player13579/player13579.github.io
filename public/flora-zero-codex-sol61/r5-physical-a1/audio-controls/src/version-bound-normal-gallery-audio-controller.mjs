import { createNormalGalleryAudioController } from './normal-gallery-audio-controller.mjs';
import { VERSION as R3_MODEL_VERSION } from '../../inputs/sol-r5/model.mjs';

const R3_GALLERY_VERSION_ID = 'flora-invisible-codex-sol61-zero-r5';
const R3_SOURCE_MANIFEST_SHA256 = '5c4a37b5c44c7c4ed11096ff14042e5adae8b325754fb7a86d72d447270489c7';
const SHARED_FLORA_ZERO_SFX_SHA256 = '16be8b1cae31e84551d703500eda3070c425273e46547ff22c14629ddd7eb17d';
const R3_ROUTE_PATH = '/public/flora-zero-codex-sol61/r5-physical-a1/index.html';

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
