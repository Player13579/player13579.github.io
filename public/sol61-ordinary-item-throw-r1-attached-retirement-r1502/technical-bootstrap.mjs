import {createGalleryAdapter} from './adapter-factory.mjs';
import {createThrowSfx} from './sfx.mjs';
const audio=globalThis.__throwR1502Observer?.audio;if(!audio)throw Error('audio observer must precede original modules/factory');audio.registerBootstrap({"originalAdapterSha256":"e3ab9c69e3a6fd88484492e5c7495447dfcc5f33b3a6bc476aaf5073990344ba","originalSfxSha256":"b676460a869a72618d0d8478c81801b4f22270c2616a51ee96d2f94176f85e17"});
const canvas = globalThis.document?.querySelector('#fx');
if (canvas) {
  const params = new URLSearchParams(location.search), verify = params.has('verify');
  const statusNode = document.querySelector('#status');
  const adapter = createGalleryAdapter({ canvas, params, verify, sfxFactory:()=>audio.invokeFactory(createThrowSfx), status: value => {
    if (statusNode) statusNode.textContent = JSON.stringify(value, null, 2);
  } });
  const startupSnapshot = () => ({ schema: 'dva-gallery-startup/v1', token: params.get('galleryStartupToken'),
    versionId: params.get('galleryVersionId'), attemptEpoch: Number(params.get('galleryAttemptEpoch')) });
  Object.defineProperty(globalThis, '__dvaGalleryStartupSnapshot', { value: startupSnapshot });
  Object.defineProperty(globalThis, '__throwR1Gallery', { value: adapter });
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
