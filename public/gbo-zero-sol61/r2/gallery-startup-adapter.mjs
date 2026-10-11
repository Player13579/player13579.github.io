const VERSION = 'gbo-zero-sol61-r2';
const DIRECTORY = 'public/gbo-zero-sol61/r2/';
const CLOSURE_PATH = `${DIRECTORY}source-closure-r2.json`;
const CLOSURE_SHA256 = 'e4922ce80fa3b85d5d5ced01586ac621a146658bf030b43d08f1d4b1139c08db';
const MANIFEST_SHA256 = '2c1d6a8e1d38196e8002783503f680e21563b5dd82e5bebaf8a1af52f145aceb';
const SEAL_SHA256 = '55b5afeafcc9923679851bc4461aa44733156ea83e6387e8bc32e122321cbeee';
const context = window.__dvaGalleryStartupContext;
if (!context || context.versionId !== VERSION || !context.token || !Number.isSafeInteger(context.attemptEpoch) || context.attemptEpoch < 1)
  throw new Error('R2 gallery startup token/version/epoch is missing or mismatched');

const phases = ['child-document','adapter','device','assets','pipelines','first-frame','playing'];
const state = { sequence: 0, rank: -1, retired: false, ready: false, sourcePins: null, firstFrame: null, timer: 0, retirement: null };
const current = () => !state.retired && !context.retired;
function post(stage, status, extra = {}) {
  if (!current() || window.parent === window) return;
  const rank = phases.indexOf(stage);
  if (rank < state.rank) return;
  state.rank = rank;
  const data = { schema: 'dva-gallery-startup/v1', token: context.token, versionId: VERSION,
    attemptEpoch: context.attemptEpoch, sequence: ++state.sequence, stage, status, ...extra };
  context.sequence = data.sequence;
  context.rank = rank;
  context.current = data;
  window.parent.postMessage(data, location.origin);
}
async function verifyClosure() {
  const response = await fetch(new URL(`/${CLOSURE_PATH}`, location.origin), { cache: 'no-store' });
  if (!response.ok) throw new Error(`R2 source closure HTTP ${response.status}`);
  const closureBytes = await response.arrayBuffer();
  const closureSha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', closureBytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (closureSha256 !== CLOSURE_SHA256) throw new Error('R2 source closure SHA-256 mismatch');
  const manifest = JSON.parse(new TextDecoder().decode(closureBytes));
  if (manifest.schema !== 'dva-gbo-r2-native-source-closure-r1000/v1' || manifest.versionId !== VERSION ||
      manifest.manifestSha256 !== MANIFEST_SHA256 || manifest.sealSha256 !== SEAL_SHA256 || !Array.isArray(manifest.files) || manifest.files.length !== 8)
    throw new Error('R2 source closure identity/shape mismatch');
  const pins = [];
  for (const item of manifest.files) {
    if (typeof item.path !== 'string' || !/^package\/(common\.wgsl|index\.html|model\.mjs|observer\.wgsl|renderer\.mjs|runtime\.mjs|sfx\.mjs|world\.wgsl)$/.test(item.path))
      throw new Error(`R2 source closure path rejected: ${item.path}`);
    const sourceResponse = await fetch(new URL(`/${DIRECTORY}${item.path}`, location.origin), { cache: 'no-store' });
    if (!sourceResponse.ok) throw new Error(`${item.path} HTTP ${sourceResponse.status}`);
    const bytes = await sourceResponse.arrayBuffer();
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== item.bytes || sha256 !== item.sha256) throw new Error(`${item.path} byte/hash mismatch`);
    pins.push({ path: item.path, bytes: bytes.byteLength, sha256 });
  }
  return { pins, manifest: { path: CLOSURE_PATH, sha256: closureSha256, manifestSha256: MANIFEST_SHA256, sealSha256: SEAL_SHA256 } };
}
function inspectHost() {
  const host = window.__gboGalleryHostR880;
  const snap = host?.snapshot?.();
  const child = snap?.childSnapshot;
  const receipt = child?.lastReceipt;
  const renderer = child?.renderer;
  const frame = document.querySelector('#preview');
  const canvas = frame?.contentDocument?.querySelector('#effect');
  const rect = canvas?.getBoundingClientRect?.();
  const visible = Boolean(canvas?.isConnected && canvas.width > 0 && canvas.height > 0 && rect && rect.width > 0 && rect.height > 0 &&
    rect.right > 0 && rect.bottom > 0 && rect.left < frame.contentWindow.innerWidth && rect.top < frame.contentWindow.innerHeight);
  const good = snap?.versionId === VERSION && snap.ready === true && snap.disposed === false &&
    child?.versionId === VERSION && child.ready === true && child.disposed === false &&
    Number.isSafeInteger(child.cause) && child.cause > 0 && Number.isSafeInteger(child.generation) && child.generation > 0 &&
    receipt?.completed === true && receipt.cause === child.cause && receipt.generation === child.generation &&
    receipt.source === true && receipt.observer === true && Number.isSafeInteger(receipt.submission) && receipt.submission > 0 &&
    renderer?.versionId === VERSION && renderer.disposed === false && renderer.submitted >= receipt.submission && renderer.completed > 0 &&
    Array.isArray(renderer.shaderDiagnostics) && renderer.shaderDiagnostics.every(row => row.messages?.every(m => m.type !== 'error')) &&
    Array.isArray(renderer.actualScopes) && renderer.actualScopes.every(row => row.error === null) && visible;
  return { good, host: snap, child, receipt, renderer, visible, canvas: { width: canvas?.width || 0, height: canvas?.height || 0 } };
}
async function poll() {
  if (!current()) return;
  try {
    const host = window.__gboGalleryHostR880;
    if (!host) { state.timer = setTimeout(poll, 25); return; }
    if (!state.sourcePins) {
      state.sourcePins = await verifyClosure();
      post('adapter', 'ready');
      post('device', 'ready', { deviceReady: true });
      post('assets', 'ready', { sourceClosure: state.sourcePins.pins, sourceClosureManifest: state.sourcePins.manifest });
      post('pipelines', 'ready', { versionId: VERSION });
    }
    const checked = inspectHost();
    if (checked.good) {
      state.ready = true;
      state.firstFrame = Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
        passes: 2, viewportWidth: checked.canvas.width, viewportHeight: checked.canvas.height,
        causeID: checked.child.cause, generation: checked.child.generation, submission: checked.receipt.submission,
        receipt: Object.freeze({ ...checked.receipt }), sourceClosure: state.sourcePins.pins,
        sourceClosureManifest: state.sourcePins.manifest, visible: true,
        shaderDiagnostics: checked.renderer.shaderDiagnostics, actualScopes: checked.renderer.actualScopes });
      post('first-frame', 'ready', { causeID: checked.child.cause, firstFrame: state.firstFrame });
      post('playing', 'ready', { causeID: checked.child.cause, firstFrame: state.firstFrame });
      return;
    }
    const failure = checked.child?.fatal || checked.host?.error;
    if (failure) throw new Error(String(failure));
    state.timer = setTimeout(poll, 20);
  } catch (error) {
    post('playing', 'error', { error: { code: 'GBO_R2_STARTUP_PROOF_FAILED', message: String(error?.message || error) } });
  }
}
function postRetirement(action, lifecycle, error) {
  const data = { schema: 'dva-gallery-startup/v1', token: context.token, versionId: VERSION,
    attemptEpoch: context.attemptEpoch, sequence: ++state.sequence, action,
    ...(lifecycle ? { lifecycle } : {}), ...(error ? { teardown: 'unknown', error } : {}) };
  context.current = data;
  if (window.parent !== window) window.parent.postMessage(data, location.origin);
}
async function retire() {
  if (state.retirement) return state.retirement;
  state.retired = true;
  context.retired = true;
  if (state.timer) clearTimeout(state.timer);
  state.retirement = (async () => {
    try {
      const host = window.__gboGalleryHostR880;
      if (!host?.dispose || !host?.snapshot) throw new Error('R2 explicit host disposal API unavailable');
      const cleanup = await host.dispose();
      const loss = cleanup?.deviceLoss;
      const device = {
        status: cleanup?.pass === true && cleanup.pendingTasks === 0 && cleanup.activeVoices === 0 &&
          cleanup.rendererDisposed === true && loss?.reason === 'destroyed' ? 'destroyed-loss-settled' : 'unknown',
        drained: cleanup?.pass === true && cleanup.pendingTasks === 0 && cleanup.activeVoices === 0 && cleanup.rendererDisposed === true,
        destroyCalled: loss?.expected === true, lostReason: loss?.reason || null
      };
      const lifecycle = { disposeSettled: true, teardown: device.status === 'destroyed-loss-settled' ? 'disposed' : 'unknown',
        deviceLifecycle: device.status, device, hostCleanup: cleanup };
      if (device.status !== 'destroyed-loss-settled') { postRetirement('retire-error', null, { code: 'R2_RETIREMENT_FAILED' }); return lifecycle; }
      postRetirement('retired', lifecycle);
      return lifecycle;
    } catch (cause) {
      postRetirement('retire-error', null, { code: 'R2_RETIREMENT_FAILED', message: String(cause?.message || cause).slice(0, 500) });
      return { disposeSettled: false, teardown: 'unknown', error: String(cause?.message || cause) };
    }
  })();
  return state.retirement;
}
window.__dvaGboGalleryStartupR1000 = Object.freeze({ snapshot: () => Object.freeze({ schema: 'dva-gallery-startup/v1',
  token: context.token, versionId: VERSION, attemptEpoch: context.attemptEpoch, ready: state.ready,
  retired: state.retired, firstFrame: state.firstFrame, sourcePins: state.sourcePins, retirement: state.retirement }), retire });
function handleParentRetireMessage(event) {
  const data = event?.data;
  if (event?.source !== window.parent || event?.origin !== location.origin ||
      data?.schema !== 'dva-gallery-startup/v1' || data.action !== 'retire' ||
      data.token !== context.token || data.versionId !== VERSION || data.versionId !== context.versionId ||
      data.attemptEpoch !== context.attemptEpoch) return;
  void retire();
}
window.addEventListener('message', handleParentRetireMessage);
window.addEventListener('dva-gallery-retire', () => void retire());
window.addEventListener('pagehide', () => void retire(), { once: true });
void poll();
