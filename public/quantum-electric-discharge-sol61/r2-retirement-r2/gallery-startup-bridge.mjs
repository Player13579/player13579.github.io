const SCHEMA = 'dva-gallery-startup/v1';
const PHASES = Object.freeze(['child-document', 'adapter', 'device', 'assets', 'pipelines', 'first-frame', 'playing']);
const STATUSES = new Set(['pending', 'delayed', 'ready', 'error', 'cancelled', 'unsupported']);

function sha256Hex(bytes, cryptoImpl) {
  return cryptoImpl.subtle.digest('SHA-256', bytes).then(digest =>
    [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join(''));
}

export function createGalleryStartupBridge({
  windowRef = globalThis.window,
  search = windowRef?.location?.search || '',
  expectedRuntimeSha256,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  runtimeUrl,
  canvas,
  now = () => globalThis.performance?.now?.() ?? Date.now()
} = {}) {
  const params = new URLSearchParams(search);
  const token = params.get('galleryStartupToken');
  const versionId = params.get('galleryVersionId');
  const epochText = params.get('galleryAttemptEpoch');
  const attemptEpoch = Number(epochText);
  const identityValid = typeof token === 'string' && token.length >= 16 &&
    typeof versionId === 'string' && versionId.length > 0 &&
    Number.isSafeInteger(attemptEpoch) && attemptEpoch > 0 && String(attemptEpoch) === epochText;
  const state = {
    schema: SCHEMA, token: identityValid ? token : null, versionId: identityValid ? versionId : null,
    attemptEpoch: identityValid ? attemptEpoch : null, sequence: 0, stage: 'child-document',
    status: identityValid ? 'pending' : 'error', firstFrame: null, error: identityValid ? null : {
      code: 'STARTUP_IDENTITY_INVALID', message: 'Gallery startup token/version/epoch is missing or invalid.'
    }, source: null, lastUpdatedAt: now()
  };
  let stageIndex = 0;
  let retired = false;
  let disposeResources = () => {};

  function snapshot() {
    return Object.freeze({
      schema: state.schema, token: state.token, versionId: state.versionId,
      attemptEpoch: state.attemptEpoch, sequence: state.sequence, stage: state.stage,
      status: state.status, firstFrame: state.firstFrame ? Object.freeze({ ...state.firstFrame }) : null,
      error: state.error ? Object.freeze({ ...state.error }) : null,
      source: state.source ? Object.freeze({ ...state.source }) : null,
      lastUpdatedAt: state.lastUpdatedAt
    });
  }

  function send() {
    if (!identityValid || !windowRef?.parent || windowRef.parent === windowRef) return;
    try { windowRef.parent.postMessage(snapshot(), windowRef.location.origin); } catch { /* Snapshot remains readable. */ }
  }

  function report(stage, status, details = {}) {
    if (!identityValid || retired || !PHASES.includes(stage) || !STATUSES.has(status)) return false;
    const nextIndex = PHASES.indexOf(stage);
    if (nextIndex < stageIndex) return false;
    if (status === 'ready' && stage !== 'playing') return false;
    if (status === 'ready' && !isValidFirstFrame(details.firstFrame)) return false;
    stageIndex = nextIndex;
    state.sequence += 1;
    state.stage = stage;
    state.status = status;
    state.lastUpdatedAt = now();
    state.error = status === 'error' || status === 'unsupported'
      ? Object.freeze({ code: String(details.code || 'PREVIEW_STARTUP_ERROR').slice(0, 120),
          message: String(details.message || 'WebGPU preview startup failed.').slice(0, 1000) })
      : null;
    if (status === 'ready') state.firstFrame = Object.freeze({ ...details.firstFrame });
    send();
    return true;
  }

  function isValidFirstFrame(proof) {
    return proof?.recorded === true && proof?.submitted === true && proof?.completed === true &&
      proof?.canvasConnected === true && proof?.passes === 4 &&
      Number.isFinite(proof?.viewportWidth) && proof.viewportWidth > 0 &&
      Number.isFinite(proof?.viewportHeight) && proof.viewportHeight > 0 &&
      proof?.causeId != null && Number.isSafeInteger(proof?.generation) && proof.generation > 0 &&
      Number.isSafeInteger(proof?.submission) && proof.submission > 0 &&
      proof?.source?.path === 'runtime.mjs' && /^[0-9a-f]{64}$/.test(proof?.source?.sha256 || '');
  }

  async function verifyRuntimeSource() {
    if (!identityValid) throw Object.assign(new Error(state.error.message), { code: state.error.code });
    if (!/^[0-9a-f]{64}$/.test(expectedRuntimeSha256 || '')) {
      throw Object.assign(new Error('Pinned runtime source hash is invalid.'), { code: 'SOURCE_PIN_INVALID' });
    }
    if (typeof fetchImpl !== 'function' || typeof cryptoImpl?.subtle?.digest !== 'function') {
      throw Object.assign(new Error('Runtime source bytes cannot be verified in this browser.'), { code: 'SOURCE_VERIFICATION_UNAVAILABLE' });
    }
    const url = runtimeUrl || new URL('./runtime.mjs', import.meta.url);
    const response = await fetchImpl(url, { cache: 'no-store', credentials: 'same-origin' });
    if (!response?.ok) throw Object.assign(new Error(`Runtime source fetch failed with HTTP ${response?.status ?? 'unknown'}.`), { code: 'SOURCE_FETCH_FAILED' });
    const bytes = await response.arrayBuffer();
    const actual = await sha256Hex(bytes, cryptoImpl);
    if (actual !== expectedRuntimeSha256) {
      throw Object.assign(new Error('Fetched runtime source bytes do not match the frozen R2 pin.'), { code: 'SOURCE_HASH_MISMATCH' });
    }
    state.source = Object.freeze({ path: 'runtime.mjs', sha256: actual, bytes: bytes.byteLength });
    return state.source;
  }

  function firstFrameFromReceipt(receipt, { causeId, generation } = {}) {
    const rect = canvas?.getBoundingClientRect?.();
    if (!identityValid || retired || !receipt || receipt.causeId !== causeId ||
        receipt.generation !== generation || receipt.submitted !== true || receipt.completed !== true ||
        receipt.mainFrameVisible !== true || receipt.drawn !== true || !state.source ||
        !canvas || canvas.isConnected !== true || !Number.isSafeInteger(canvas.width) || canvas.width < 1 ||
        !Number.isSafeInteger(canvas.height) || canvas.height < 1 ||
        !rect || !Number.isFinite(rect.width) || rect.width <= 0 || !Number.isFinite(rect.height) || rect.height <= 0) return null;
    const proof = {
      recorded: true, submitted: true, completed: true, canvasConnected: true, passes: 4,
      viewportWidth: rect.width, viewportHeight: rect.height, causeId,
      generation, submission: receipt.submission,
      submittedAt: receipt.submittedAt, completedAt: receipt.completedAt,
      source: { ...state.source }
    };
    return isValidFirstFrame(proof) ? Object.freeze(proof) : null;
  }

  function fail(stage, error, status = 'error') {
    const effectiveStage = PHASES.indexOf(stage) < stageIndex ? state.stage : stage;
    return report(effectiveStage, status, { code: error?.code || error?.name || 'PREVIEW_STARTUP_ERROR',
      message: error?.message || String(error) });
  }

  function retire(reason = 'parent-retired') {
    if (retired) return;
    retired = true;
    try { disposeResources(reason); } finally {
      if (identityValid) {
        state.sequence += 1;
        state.stage = 'playing';
        state.status = 'cancelled';
        state.lastUpdatedAt = now();
        send();
      }
    }
  }

  function onMessage(event) {
    const data = event?.data;
    if (event?.source !== windowRef?.parent || event?.origin !== windowRef?.location?.origin ||
        data?.schema !== SCHEMA || data?.action !== 'retire' || !identityValid ||
        data.token !== token || data.versionId !== versionId || data.attemptEpoch !== attemptEpoch) return;
    retire(typeof data.reason === 'string' ? data.reason : 'parent-retired');
  }

  function bindCleanup(dispose) {
    disposeResources = typeof dispose === 'function' ? dispose : () => {};
  }

  if (identityValid) report('child-document', 'pending');
  windowRef?.addEventListener?.('message', onMessage);
  windowRef?.addEventListener?.('pagehide', () => retire('pagehide'), { once: true });
  return Object.freeze({ identityValid, snapshot, report, verifyRuntimeSource,
    firstFrameFromReceipt, fail, retire, bindCleanup, isRetired: () => retired });
}

export const galleryStartupContract = Object.freeze({ schema: SCHEMA, phases: PHASES, statuses: Object.freeze([...STATUSES]) });
