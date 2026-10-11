export const REVISIONS = Object.freeze({
  r1: Object.freeze({
    versionId: 'gunner-shooting-unified-sol61-r1',
    handgun: 'gunner-shooting-sol61-r1',
    other: 'gunner-shooting-nonhandgun-sol61-r1'
  }),
  r2: Object.freeze({
    versionId: 'gunner-shooting-unified-sol61-r2',
    handgun: 'gunner-shooting-sol61-r2',
    other: 'gunner-shooting-nonhandgun-sol61-r2'
  }),
  r3: Object.freeze({
    versionId: 'gunner-shooting-unified-sol61-r3',
    handgun: 'gunner-shooting-sol61-r3',
    other: 'gunner-shooting-nonhandgun-sol61-r3'
  })
});
export const WEAPONS = Object.freeze(['handgun', 'smg', 'assault', 'sniper']);
const SCHEMA = 'dva-gallery-startup/v1';
const proofOk = f => Boolean(f && f.recorded === true && f.submitted === true && f.completed === true && f.canvasConnected === true && Number.isSafeInteger(f.passes) && f.passes >= 2 && Number(f.viewportWidth) > 0 && Number(f.viewportHeight) > 0 && typeof f.causeID === 'string' && f.causeID && Number.isSafeInteger(f.sequence) && f.sequence > 0);

export function createGallerySfxAdapter(controller) {
  return Object.freeze({ activateFromGesture: async () => {
    const selected = controller.snapshot?.();
    if (selected?.revision === 'r3' && selected?.weapon === 'handgun' && typeof controller.activateHandgunAudioAndReplay === 'function') {
      return controller.activateHandgunAudioAndReplay();
    }
    const result = await controller.enableAudio();
    const ok = result?.ok === true || result?.enabled === true;
    return { ok, reason: result?.reason || (ok ? 'using the preview’s authored SFX' : result?.verify ? 'verification mode' : 'source audio is not running'), snapshot: result?.snapshot ?? result };
  } });
}

export function createController({ document, location, parentWindow, topWindow = null, outerIdentity = null, outerExpected = null, setTimeout: setTimer = setTimeout, clearTimeout: clearTimer = clearTimeout, now = () => Date.now(), teardownTimeoutMs = 2500 }) {
  const frame = document.querySelector('#shooting-leaf');
  const revisionSelect = document.querySelector('#revision');
  const weaponSelect = document.querySelector('#weapon');
  const audioButton = document.querySelector('#audio');
  const status = document.querySelector('#status');
  if (!frame || !revisionSelect || !weaponSelect) throw new Error('unified shooting controls missing');
  let current = null, serial = 0, disposed = false, switching = Promise.resolve(), controllerDisposePromise = null, outerSequence = 0, outerProofSent = false;
  const waiters = new Set();
  const state = { revision: 'r1', weapon: 'handgun', versionId: REVISIONS.r1.versionId, leafVersionId: '', attemptEpoch: 0, token: '', phase: 'idle', active: false, teardown: 'none', completedSource: null, error: null, deviceLifecycle: null };
  const snapshot = () => structuredClone(state);
  function postOuter(stage, status, extra = {}) {
    if (!outerIdentity || !topWindow || topWindow === parentWindow || !outerIdentity.token || !outerIdentity.versionId || !Number.isSafeInteger(outerIdentity.attemptEpoch) || outerIdentity.attemptEpoch < 1) return;
    topWindow.postMessage({ schema: SCHEMA, token: outerIdentity.token, versionId: outerIdentity.versionId, attemptEpoch: outerIdentity.attemptEpoch, sequence: ++outerSequence, stage, status, ...extra }, location.origin);
  }
  function resolveProof(proof) {
    state.completedSource = structuredClone(proof); state.phase = 'playing'; state.active = true;
    if (!outerProofSent && outerExpected?.revision === proof.revision && outerExpected?.weapon === proof.weapon && proof.versionId === outerIdentity?.versionId) {
      outerProofSent = true;
      postOuter('playing', 'ready', { firstFrame: structuredClone(proof.firstFrame), causeID: proof.causeID, variant: proof.weapon,
        nestedIdentity: { revision: proof.revision, weapon: proof.weapon, canonicalVersionId: proof.versionId, leafVersionId: proof.leafVersionId, token: proof.token, attemptEpoch: proof.attemptEpoch } });
    }
    for (const w of [...waiters]) { clearTimer(w.timer); waiters.delete(w); w.resolve(snapshot()); }
    if (status) status.textContent = '射撃中';
  }
  function onMessage(event) {
    const child = current;
    if (!child || event.source !== frame.contentWindow || event.origin !== location.origin || disposed) return;
    const m = event.data;
    if (!m || m.schema !== SCHEMA || m.token !== child.token || m.versionId !== child.leafVersionId || m.attemptEpoch !== child.attemptEpoch || !Number.isSafeInteger(m.sequence) || m.sequence <= child.lastSequence) return;
    child.lastSequence = m.sequence;
    if (m.status === 'error') { state.error = structuredClone(m.error || { code: 'CHILD_ERROR' }); state.phase = 'error'; state.active = false; return; }
    if (m.stage === 'first-frame' && m.status === 'ready' && (m.variant === undefined || m.variant === child.weapon) && proofOk(m.firstFrame) && (child.weapon === 'handgun' ? /^shooting-\d+$/.test(m.firstFrame.causeID) && Number.isSafeInteger(m.firstFrame.targetGeneration) && m.firstFrame.targetGeneration > 0 : m.variant === child.weapon && m.firstFrame.variant === child.weapon && m.firstFrame.sourceOn === true && m.firstFrame.observerOn === true && m.firstFrame.warmup === false)) {
      child.firstFrameProof = structuredClone(m.firstFrame); child.firstFrameSequence = m.sequence;
      return;
    }
    if (m.stage === 'playing' && m.status === 'ready' && (m.variant === undefined || m.variant === child.weapon) && !state.completedSource && child.firstFrameProof && proofOk(m.firstFrame) && m.firstFrame.causeID === child.firstFrameProof.causeID && m.firstFrame.sequence === child.firstFrameProof.sequence && (child.weapon !== 'handgun' || m.firstFrame.targetGeneration === child.firstFrameProof.targetGeneration) && m.firstFrame.causeID === (m.causeID || m.firstFrame.causeID) && (child.weapon === 'handgun' ? /^shooting-\d+$/.test(m.firstFrame.causeID) : typeof m.variant === 'string' && m.variant === child.weapon && typeof m.causeID === 'string' && m.causeID === m.firstFrame.causeID && m.firstFrame.variant === child.weapon && m.firstFrame.sourceOn === true && m.firstFrame.observerOn === true && m.firstFrame.warmup === false)) {
      resolveProof({ schema: 'dva-shooting-completed-source/v1', revision: child.revision, weapon: child.weapon, versionId: child.versionId, leafVersionId: child.leafVersionId, attemptEpoch: child.attemptEpoch, token: child.token, sequence: m.sequence, causeID: m.firstFrame.causeID, variant: child.weapon, firstFrame: structuredClone(m.firstFrame), sourceOn: m.firstFrame.sourceOn ?? null, observerOn: m.firstFrame.observerOn ?? null, observedAt: now() });
    }
  }
  parentWindow.addEventListener('message', onMessage);
  postOuter('child-document', 'pending');
  function makeUrl(revision, weapon, token, epoch, leafVersionId) {
    const base = new URL(`../${revision}/leaves/${weapon === 'handgun' ? 'handgun' : 'other'}/index.html`, location.href);
    base.searchParams.set('embed', ''); base.searchParams.set('galleryStartupToken', token); base.searchParams.set('galleryVersionId', leafVersionId); base.searchParams.set('galleryAttemptEpoch', String(epoch));
    if (weapon !== 'handgun') base.searchParams.set('weapon', weapon);
    const outerQuery = new URLSearchParams(location.search);
    if (outerQuery.has('verify')) base.searchParams.set('verify', outerQuery.get('verify') || '1');
    if (weapon !== 'handgun' || outerQuery.get('galleryAutoLoop') === '1') base.searchParams.set('galleryAutoLoop', '1');
    return base.href;
  }
  async function retireChild(child) {
    if (!child) return;
    state.teardown = 'retiring'; state.active = false;
    const win = frame.contentWindow;
    const disposer = child.weapon === 'handgun' ? win?.[`__DVA_SHOOTING_E_${child.revision.toUpperCase()}__`]?.dispose : win?.__shootingR1?.dispose;
    if (typeof disposer !== 'function') { state.teardown = 'unknown'; throw new Error('child dispose API unavailable; iframe retained'); }
    let timer;
    let outcome;
    let disposalResult = null;
    try {
      outcome = await Promise.race([
        Promise.resolve().then(() => {
          const result = disposer.call(child.weapon === 'handgun' ? win[`__DVA_SHOOTING_E_${child.revision.toUpperCase()}__`] : win.__shootingR1);
          if (!result || typeof result.then !== 'function') throw new Error('child dispose API did not return a promise');
          return result;
        }).then(value => { disposalResult = value; return 'disposed'; }),
        new Promise(resolve => { timer = setTimer(() => resolve('timeout'), teardownTimeoutMs); })
      ]);
    } catch (error) {
      clearTimer(timer); state.teardown = 'unknown'; throw new Error(`child dispose rejected; iframe retained: ${String(error?.message || error)}`);
    }
    clearTimer(timer);
    if (outcome !== 'disposed') { state.teardown = 'unknown'; throw new Error('child dispose did not settle within bounded teardown; iframe retained'); }
    const device = child.weapon === 'handgun'
      ? (() => {
          const runtime = disposalResult?.runtime;
          const losses = runtime?.loss;
          const latestLoss = Array.isArray(losses) && losses.length > 0 ? losses[losses.length - 1] : null;
          const validLoss = latestLoss !== null && typeof latestLoss === 'object' && !Array.isArray(latestLoss) &&
            typeof latestLoss.reason === 'string' && typeof latestLoss.message === 'string' &&
            typeof latestLoss.disposed === 'boolean' && typeof latestLoss.retiring === 'boolean';
          const destroyedLossSettled = runtime?.disposed === true && validLoss && latestLoss.reason === 'destroyed' &&
            latestLoss.disposed === true && latestLoss.retiring === true;
          return { drained: runtime?.disposed === true, destroyCalled: destroyedLossSettled, lostReason: validLoss ? latestLoss.reason : null };
        })()
      : { drained: disposalResult?.lifecycle?.drained === true, destroyCalled: disposalResult?.lifecycle?.destroyCalled === true, lostReason: disposalResult?.lifecycle?.lost?.reason || null };
    if (device.drained !== true || device.destroyCalled !== true || device.lostReason !== 'destroyed') {
      state.teardown = 'unknown'; state.deviceLifecycle = { status: 'unknown', ...device };
      throw new Error(`child dispose settled without a verified drain, destroy, and destroyed-loss receipt (reason: ${device.lostReason || 'unavailable'}); iframe retained`);
    }
    state.deviceLifecycle = { status: 'destroyed-loss-settled', ...device };
    frame.removeAttribute('src');
    current = null; state.teardown = 'disposed'; state.phase = 'idle';
  }
  function select({ revision = state.revision, weapon = state.weapon } = {}) {
    if (disposed) return Promise.reject(new Error('controller disposed'));
    if (!Object.hasOwn(REVISIONS, revision) || !WEAPONS.includes(weapon)) return Promise.reject(new TypeError('unsupported revision or weapon'));
    switching = switching.then(async () => {
      if (current) await retireChild(current);
      if (disposed) throw new Error('controller disposed');
      const epoch = ++serial, token = `shooting-unified-${epoch}-${Math.random().toString(36).slice(2)}`, leafVersionId = weapon === 'handgun' ? REVISIONS[revision].handgun : REVISIONS[revision].other;
      state.revision = revision; state.weapon = weapon; state.versionId = REVISIONS[revision].versionId; state.leafVersionId = leafVersionId; state.attemptEpoch = epoch; state.token = token; state.phase = 'starting'; state.active = false; state.teardown = 'none'; state.completedSource = null; state.error = null; state.deviceLifecycle = null;
      current = { revision, weapon, versionId: state.versionId, leafVersionId, attemptEpoch: epoch, token, lastSequence: -1 };
      revisionSelect.value = revision; weaponSelect.value = weapon;
      frame.setAttribute('src', makeUrl(revision, weapon, token, epoch, leafVersionId));
      if (status) status.textContent = '準備中';
      return snapshot();
    });
    return switching;
  }
  function waitForCompletedVisibleCause({ timeoutMs = 15000 } = {}) {
    if (state.completedSource && current && state.completedSource.token === current.token) return Promise.resolve(snapshot());
    return new Promise((resolve, reject) => {
      const w = { resolve, reject, timer: setTimer(() => { waiters.delete(w); reject(new Error('completed visible cause timeout')); }, timeoutMs) };
      waiters.add(w);
    });
  }
  async function enableAudio() {
    if (!current) throw new Error('no active shooting leaf');
    const win = frame.contentWindow;
    const api = current.weapon === 'handgun' ? win?.[`__DVA_SHOOTING_E_${current.revision.toUpperCase()}__`] : win?.__shootingR1;
    if (!api || typeof api.enableAudio !== 'function') throw new Error('child audio API unavailable');
    return api.enableAudio();
  }
  async function activateHandgunAudioAndReplay() {
    const failed = (reason, snap = snapshot()) => ({ ok: false, reason, snapshot: snap });
    if (new URL(location.href).searchParams.has('verify')) return failed('verification mode');
    if (disposed) return failed('controller disposed');
    const child = current;
    if (!child || child.revision !== 'r3' || child.weapon !== 'handgun') return failed('handgun source unavailable');
    const win = frame.contentWindow;
    const api = win?.[`__DVA_SHOOTING_E_${child.revision.toUpperCase()}__`];
    if (!api || typeof api.enableAudio !== 'function' || typeof api.play !== 'function' || typeof api.snapshot !== 'function') return failed('handgun audio/play API unavailable');
    let enabled;
    try { enabled = await api.enableAudio(); }
    catch (error) { return failed(String(error?.message || error)); }
    if (enabled?.ok !== true) return failed(enabled?.reason || (enabled?.verify ? 'verification mode' : 'source audio is not running'), enabled?.snapshot ?? api.snapshot());
    if (disposed || current !== child || frame.contentWindow !== win || new URL(location.href).searchParams.has('verify')) return failed(disposed ? 'controller disposed' : 'handgun source changed', api.snapshot());
    const before = api.snapshot();
    if (!before || before.disposed === true || before.ready !== true || before.verify === true || before.audio?.verify === true || before.audio?.muted === true) return failed('handgun source is unavailable or muted', before);
    try {
      const replay = await api.play();
      const after = replay ?? api.snapshot();
      const started = after?.running === true && typeof after?.causeID === 'string' && /^shooting-\d+$/.test(after.causeID) && after.causeID !== before.causeID;
      return started ? { ok: true, reason: 'handgun SFX enabled and source replayed', snapshot: after, previousCauseID: before.causeID } : failed('handgun replay did not start a new registered cause', after);
    } catch (error) { return failed(String(error?.message || error), api.snapshot()); }
  }
  function dispose({ notifyParent = false } = {}) {
    const observe = promise => promise.then(result => {
      if (notifyParent) postOuterRetired();
      return result;
    }, error => {
      state.teardown = 'unknown'; state.error = String(error?.message || error);
      if (notifyParent) postOuterRetirementFailure(error);
      throw error;
    });
    if (controllerDisposePromise) return observe(controllerDisposePromise);
    if (disposed) { if (notifyParent) postOuterRetired(); return Promise.resolve(snapshot()); }
    controllerDisposePromise = (async () => {
      await switching;
      await retireChild(current); disposed = true; parentWindow.removeEventListener('message', onMessage);
      for (const w of waiters) { clearTimer(w.timer); w.reject(new Error('controller disposed')); } waiters.clear();
      state.phase = 'disposed'; return snapshot();
    })();
    return observe(controllerDisposePromise);
  }
  function postOuterRetirementFailure(error) {
    if (!outerIdentity || !topWindow || topWindow === parentWindow || !outerIdentity.token ||
        !outerIdentity.versionId || !Number.isSafeInteger(outerIdentity.attemptEpoch) || outerIdentity.attemptEpoch < 1 ||
        state.teardown !== 'unknown') return;
    topWindow.postMessage({ schema: SCHEMA, action: 'retire-error', token: outerIdentity.token,
      versionId: outerIdentity.versionId, attemptEpoch: outerIdentity.attemptEpoch, sequence: ++outerSequence,
      teardown: 'unknown', error: { code: 'CHILD_RETIREMENT_FAILED', message: String(error?.message || error).slice(0, 500) } }, location.origin);
  }
  function postOuterRetired() {
    if (!outerIdentity || !topWindow || topWindow === parentWindow || !outerIdentity.token ||
        !outerIdentity.versionId || !Number.isSafeInteger(outerIdentity.attemptEpoch) || outerIdentity.attemptEpoch < 1 ||
        state.phase !== 'disposed' || state.teardown !== 'disposed') return;
    topWindow.postMessage({ schema: SCHEMA, action: 'retired', token: outerIdentity.token,
      versionId: outerIdentity.versionId, attemptEpoch: outerIdentity.attemptEpoch, sequence: ++outerSequence,
      lifecycle: { disposeSettled: true, teardown: 'disposed', deviceLifecycle: state.deviceLifecycle?.status, device: structuredClone(state.deviceLifecycle) } }, location.origin);
  }
  revisionSelect.addEventListener('change', () => { void select({ revision: revisionSelect.value, weapon: weaponSelect.value }).catch(e => { state.error = String(e); }); });
  weaponSelect.addEventListener('change', () => { void select({ revision: revisionSelect.value, weapon: weaponSelect.value }).catch(e => { state.error = String(e); }); });
  audioButton?.addEventListener('click', () => { void enableAudio().then(result => { if (status) status.textContent = result?.verify ? 'verify: 音声0固定' : result?.enabled || result?.ok ? '音声有効' : '音声未解除'; }).catch(e => { if (status) status.textContent = String(e.message || e); }); });
  return Object.freeze({ select, snapshot, waitForCompletedVisibleCause, enableAudio, activateHandgunAudioAndReplay, dispose });
}
