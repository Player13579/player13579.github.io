import { EventGate, fixturePose, VERSION, DURATION_MS } from './source/model.mjs';

const verify = new URLSearchParams(location.search).has('verify');
if (verify) document.documentElement.classList.add('verify');
const frame = document.querySelector('#preview');
const status = document.querySelector('#status');
const evidence = document.querySelector('#evidence');
const gate = new EventGate();
const query = new URLSearchParams();
query.set('embed', '1');
if (verify) query.set('verify', '1');
frame.src = `./source/index.html?${query}`;

const $ = id => document.getElementById(id);
const controls = ['weapon','commit','retire','audio','source','observer','dispose'];
const state = { ready: false, disposed: false, startup: null, lastFixture: null, serial: 0, records: [], cleanup: null, disposePromise: null };
const append = row => { state.records.push(row); evidence.textContent = JSON.stringify(state.records, null, 2); };
function api() {
  const value = frame.contentWindow?.__gboZero;
  if (!value) throw new Error('preview runtime API unavailable');
  return value;
}
function safeSourceSnapshot(source) {
  try { return source?.snapshot?.() ?? null; } catch (error) { return { snapshotError:String(error?.message||error) }; }
}
const gallerySfxFacade = Object.freeze({
  activateFromGesture(item) {
    const rejected = (reason, snapshot=null) => Promise.resolve({ok:false,reason,snapshot});
    if (item?.id !== VERSION) return rejected('selected preview version does not match GBO R1');
    if (verify) return rejected('verification mode is hard-muted');
    if (!state.ready || state.disposed || !frame.isConnected) return rejected('GBO preview is not active');
    let source, activation, before;
    try {
      source = api();
      before = source.snapshot();
      if (before?.verify !== false) return rejected('GBO source is verification-muted',before);
      // This call must remain synchronous in the parent gallery's trusted gesture stack.
      activation = source.enableAudio();
    } catch (error) {
      return rejected(String(error?.message||error),safeSourceSnapshot(source));
    }
    const childWindow = frame.contentWindow;
    return Promise.resolve(activation).then(enabled => {
      let snapshot = safeSourceSnapshot(source);
      const stillCurrent = frame.isConnected && frame.contentWindow === childWindow &&
        childWindow?.__gboZero === source && state.ready && !state.disposed;
      const ok = enabled === true && stillCurrent && verify === false &&
        snapshot?.verify === false && snapshot?.muted === false && snapshot?.disposed === false;
      return {ok,reason:ok?'GBO source AudioContext confirmed running':'GBO source did not confirm active unmuted audio for the current preview',snapshot};
    }, error => ({ok:false,reason:String(error?.message||error),snapshot:safeSourceSnapshot(source)}));
  }
});
Object.defineProperty(window,'__gallerySfx',{value:gallerySfxFacade,enumerable:false,writable:false,configurable:false});

window.__gboGalleryHostR880 = Object.freeze({versionId:VERSION, snapshot:()=>{
  let childSnapshot=null; try { childSnapshot=api().snapshot(); } catch (_) {}
  return {versionId:VERSION,ready:state.ready,disposed:state.disposed,startup:state.startup,
    lastFixture:state.lastFixture?.row||null,childSnapshot,cleanup:state.cleanup};
},dispose:disposeOwned});
function lockControls(disabled) { for (const id of controls) $(id).disabled = disabled; }
async function disposeOwned() {
  if (state.disposePromise) return state.disposePromise;
  state.disposePromise = (async () => {
    const before = api().snapshot();
    if (before.disposed) return state.cleanup;
    api().stop();
    const snap = await api().dispose();
    const cleanup = { disposed:snap.disposed, pendingTasks:snap.pendingTasks, activeVoices:snap.activeVoices,
      rendererDisposed:snap.renderer?.disposed, deviceLoss:snap.deviceLoss,
      pass:snap.disposed===true && snap.pendingTasks===0 && snap.activeVoices===0 &&
        snap.renderer?.disposed===true && snap.deviceLoss?.expected===true };
    state.disposed = true; state.cleanup = cleanup;
    append({kind:'explicit-dispose',cleanup});
    status.textContent = cleanup.pass ? 'owned renderer/audio/tasks drained; device destruction loss recorded.' : 'cleanup incomplete: '+JSON.stringify(cleanup);
    frame.remove(); updateButtons(); return cleanup;
  })();
  return state.disposePromise;
}
function updateButtons() {
  const canRun = state.ready && !state.disposed;
  $('weapon').disabled = !canRun || state.lastFixture?.stage === 'magazine-commit';
  $('commit').disabled = !canRun;
  $('retire').disabled = !canRun || state.lastFixture?.stage !== 'magazine-commit';
  $('audio').disabled = !canRun || verify;
  $('source').disabled = !canRun;
  $('observer').disabled = !canRun;
  $('dispose').disabled = !canRun;
}
function resolvedPose() {
  // Gallery diagnostic fixture only. This is not a live game-world/camera resolver.
  const w = Math.max(1, frame.contentWindow.innerWidth * (frame.contentWindow.devicePixelRatio || 1));
  const h = Math.max(1, frame.contentWindow.innerHeight * (frame.contentWindow.devicePixelRatio || 1));
  return fixturePose({ width: w, height: h, H: 64 * (frame.contentWindow.devicePixelRatio || 1) });
}
async function waitForReceipt(cause, stage, generation, timeoutMs = 3000) {
  const until = performance.now() + timeoutMs;
  while (performance.now() < until) {
    const snap = api().snapshot();
    const receipt = snap.lastReceipt;
    if (receipt?.completed && receipt.cause === cause && receipt.generation === generation && receipt.stage === stage) return { snap, receipt };
    if (snap.fatal) throw new Error(`preview failed: ${snap.fatal}`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`completed ${stage} receipt timed out for host cause ${cause}`);
}
async function fixture(stage) {
  if (!state.ready || state.disposed) throw new Error('preview is not ready');
  if (stage === 'weapon-retirement' && state.lastFixture?.stage !== 'magazine-commit') throw new Error('retirement requires a separately accepted commit fixture first');
  const weaponId = $('weapon').value;
  const now = performance.now();
  const wireEvent = Object.freeze({
    id: `gbo-gallery-r855-${++state.serial}`,
    type: 'gbo-overdrive',
    x: 0,
    y: 0,
    radius: stage === 'magazine-commit' ? 175 : 185,
    playerId: 'gallery-fixture-player',
    targetId: null,
    variant: `${stage === 'weapon-retirement' ? 'destroyed' : 'magazine-commit'}:weapon:${weaponId}`,
    durationMs: DURATION_MS,
    at: Date.now() - 1
  });
  // Mirrors the client event normalization boundary (wire at/durationMs -> startedAt/duration).
  const event = Object.freeze({ ...wireEvent, startedAt: now - Math.max(0, Date.now() - wireEvent.at), duration: wireEvent.durationMs });
  const accepted = gate.accept(event, resolvedPose(), now);
  if (!accepted || accepted.stage !== stage || accepted.weaponId !== weaponId) throw new Error('fixture event rejected or stage/weapon mapping mismatch');
  const cause = api().setStage(accepted.stage);
  const started = api().snapshot();
  if (cause !== started.cause || started.stage !== stage) throw new Error('runtime did not start the accepted fixture stage');
  const { snap, receipt } = await waitForReceipt(cause, stage, started.generation);
  const row = Object.freeze({
    eventId: event.id,
    producerWireEvent: wireEvent,
    eventVariant: event.variant,
    acceptedStage: accepted.stage,
    acceptedWeapon: accepted.weaponId,
    eventAgeMs: accepted.ageMs,
    rendererCause: cause,
    generation: started.generation,
    receipt,
    runtimeStatus: snap.status,
    note: 'synthetic gallery fixture; not a live app event or game integration proof'
  });
  state.lastFixture = { stage, weaponId, eventId: event.id, row };
  append(row);
  status.textContent = `${stage} / ${weaponId}: accepted exact fixture variant and received completed frame ${receipt.submission}.`;
  updateButtons();
  return row;
}

addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  const msg = event.data;
  if (msg?.type !== 'dva-gallery-startup/v1') return;
  if (msg.versionId !== VERSION || msg.status !== 'ready' || msg.completed !== true || msg.receipt?.completed !== true) {
    status.textContent = 'startup identity/receipt mismatch';
    append({ kind: 'startup-rejected', message: msg });
    return;
  }
  let snap;
  try { snap = api().snapshot(); } catch (error) { status.textContent = String(error); return; }
  if (snap.versionId !== VERSION || !snap.ready || snap.lastReceipt?.completed !== true || snap.lastReceipt.submission !== msg.receipt.submission) {
    status.textContent = 'startup runtime snapshot does not match the completed startup receipt';
    append({ kind: 'startup-snapshot-mismatch', message: msg, snapshot: snap });
    return;
  }
  state.ready = true;
  state.startup = { versionId: msg.versionId, status: msg.status, receipt: msg.receipt, snapshot: snap };
  window.dispatchEvent(new CustomEvent('gbo-gallery-host-ready-r880'));
  append({ kind: 'startup', ...state.startup });
  status.textContent = `${VERSION}: startup completed frame ${msg.receipt.submission}; ready for explicit fixtures.`;
  updateButtons();
});

$('commit').addEventListener('click', () => void fixture('magazine-commit').catch(error => { status.textContent = error.message; append({ kind: 'fixture-error', error: error.message }); }));
$('retire').addEventListener('click', () => void fixture('weapon-retirement').catch(error => { status.textContent = error.message; append({ kind: 'fixture-error', error: error.message }); }));
$('audio').addEventListener('click', async () => {
  try { await api().enableAudio(); const snap = api().snapshot(); append({ kind: 'audio-gesture', enabledByGesture: true, verify: snap.verify, muted: snap.muted }); status.textContent = `audio gesture handled; verify=${snap.verify}, muted=${snap.muted}`; }
  catch (error) { status.textContent = `audio unavailable: ${error.message}`; }
});
for (const id of ['source','observer']) $(id).addEventListener('change', () => {
  try {
    const snap = api().setOptions({ [id]: $(id).checked });
    const field = id === 'source' ? 'source' : 'observer';
    const accepted = snap.options[field] === $(id).checked;
    append({ kind: 'render-option', field, enabled: $(id).checked, accepted });
    status.textContent = `${field} ${accepted ? 'updated' : 'mismatch'}; source and observer controls affect the package preview only.`;
  } catch (error) { status.textContent = error.message; }
});
$('dispose').addEventListener('click', () => void disposeOwned().catch(error => { status.textContent = `cleanup error: ${error.message}`; append({kind:'cleanup-error',error:error.message}); }));
lockControls(true);
