import {createGalleryAdapter} from './adapter-factory.mjs';
import {createThrowSfx} from './sfx.mjs';
const audio=globalThis.__throwR1502Observer?.audio;if(!audio)throw Error('audio observer must precede original modules/factory');audio.registerBootstrap({"originalAdapterSha256":"a900a952fb3a2ac8da932fcf277eb17edf01e8192341c8ba5be19930c564a89d","originalSfxSha256":"b976da42bd4a985bf52a1841cecfc7a790665417d7de4845896bdf4ed78ab25f"});
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
  Object.defineProperty(globalThis, '__throwR2Gallery', { value: adapter });
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
