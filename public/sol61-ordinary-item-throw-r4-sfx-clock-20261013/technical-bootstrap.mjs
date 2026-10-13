import {createGalleryAdapter,createThrowGallerySfxBridge} from './adapter-factory.mjs';
import {createThrowSfx} from './sfx.mjs';
const audio=globalThis.__throwR1502Observer?.audio;if(!audio)throw Error('audio observer must precede original modules/factory');audio.registerBootstrap({"originalAdapterSha256":"1487b2d7e8c0675c867b149b1203d37101ba8d259bf15e84044e1632ae0abe56","originalSfxSha256":"8734d10ea87e1ae5132b106f4513cd015d6bf4c6e6532434397450273710e49f"});
const canvas = globalThis.document?.querySelector('#throw-r4-fx');
if (canvas) {
  const params = new URLSearchParams(location.search), verify = params.has('verify');
  const statusNode = document.querySelector('#status');
  const adapter = createGalleryAdapter({ canvas, params, verify, sfxFactory:()=>audio.invokeFactory(createThrowSfx), status: value => {
    if (statusNode) statusNode.textContent = JSON.stringify(value, null, 2);
  } });
  const startupSnapshot = () => ({ schema: 'dva-gallery-startup/v1', token: params.get('galleryStartupToken'),
    versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')) });
  Object.defineProperty(globalThis, '__dvaGalleryStartupSnapshot', { value: startupSnapshot });
  Object.defineProperty(globalThis, '__throwR4Gallery', { value: adapter });
  Object.defineProperty(globalThis, '__gallerySfx', { value: createThrowGallerySfxBridge({
    adapter, versionId: params.get('galleryVersionId'), verify,
    isCurrent: candidate => globalThis.__throwR4Gallery === candidate
  }) });
  const controls = {
    replay: document.querySelector('#replay'), hold: document.querySelector('#hold'), phase: document.querySelector('#phase'),
    resume: document.querySelector('#resume'), source: document.querySelector('#source'), observer: document.querySelector('#observer'), sfx: document.querySelector('#sfx')
  };
  controls.replay?.addEventListener('click', () => adapter.replay());
  controls.hold?.addEventListener('click', () => adapter.setPhase(Number(controls.phase.value) / 1000));
  controls.resume?.addEventListener('click', () => adapter.resume());
  controls.source?.addEventListener('change', () => adapter.setSource(controls.source.checked));
  controls.observer?.addEventListener('change', () => adapter.setObserver(controls.observer.checked));
  controls.sfx?.addEventListener('click', () => adapter.enableSfx());
  if (verify && controls.sfx) controls.sfx.disabled = true;
  const onParentMessage = event => {
    if (event.source !== parent || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.schema === 'dva-gallery-startup/v1' && data.action === 'retire' &&
        data.token === params.get('galleryStartupToken') && data.versionId === params.get('galleryVersionId') &&
        data.attemptEpoch === Number(params.get('galleryAttemptEpoch'))) void adapter.retire();
  };
  addEventListener('message', onParentMessage);
  addEventListener('pagehide', () => { removeEventListener('message', onParentMessage); void adapter.retire(); }, { once: true });
  void adapter.initialize().catch(() => {});
}