import { createNormalGalleryAudioController } from './normal-gallery-audio-controller.mjs';
import { VERSION as R3_MODEL_VERSION } from '../../inputs/sol-r4/model.mjs';

const R3_GALLERY_VERSION_ID = 'flora-invisible-codex-sol61-zero-r4';
const R3_SOURCE_MANIFEST_SHA256 = 'a93f4cf0650ff3a51c96efef96244037b6d1bd6befc5c24b9fceb701120e21f0';
const SHARED_FLORA_ZERO_SFX_SHA256 = 'aed90a1b42da84e6f17058bd34f6ee0497ec2e3dba49f35b95afc3cdb6b89766';
const R3_ROUTE_PATH = '/public/flora-zero-codex-sol61/r4-physical-a1/index.html';

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
