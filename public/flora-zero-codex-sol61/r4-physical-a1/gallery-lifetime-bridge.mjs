import { projectCleanupReceipts, sourceIdentityFromPlaying } from './cleanup-transport.mjs';
const STAGES = new Map([
  ['child-document', 0], ['adapter', 1], ['device', 2], ['assets', 3],
  ['pipelines', 4], ['first-frame', 5], ['playing', 6],
]);
const STATUSES = new Set(['pending', 'delayed', 'ready', 'error', 'cancelled', 'unsupported']);
const DEFAULT_VERSION_ID = 'flora-invisible-codex-sol61-zero-r4';
const DEFAULT_ROUTE = '/public/flora-zero-codex-sol61/r4-physical-a1/index.html';
const R3_PASS_ORDER = Object.freeze(['WORLD', 'GAUSSIAN_X', 'OBSERVER_Y']);

function r3KernelReceiptIsBound(receipt) {
  const bytes = receipt?.kernelBytes;
  const kernelUniform = receipt?.kernelUniform;
  const spec = receipt?.kernelSpec;
  const bindings = receipt?.passBindings;
  const order = receipt?.passOrder;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== 192 ||
      !Array.isArray(kernelUniform) || kernelUniform.length !== 48 || !kernelUniform.every(Number.isFinite) ||
      receipt?.kernelByteLength !== 192 || !Array.isArray(bindings) || bindings.length !== 3 ||
      !Array.isArray(order) || order.length !== 3 || !spec || !receipt.device || !receipt.encoder ||
      !receipt.target || !receipt.sourceUniformBuffer || !receipt.kernelBuffer ||
      !receipt.worldTexture || !receipt.emissionTexture || !receipt.psfHorizontalTexture) return false;
  const key = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  const floats = Float32Array.from(kernelUniform);
  const floatBytes = new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
  if (receipt.kernelKey !== key || !floatBytes.every((value, index) => value === bytes[index])) return false;
  if (!R3_PASS_ORDER.every((name, index) => order[index] === name && bindings[index]?.name === name && bindings[index]?.order === index)) return false;
  if (!bindings.every(binding => binding?.device === receipt.device && binding?.encoder === receipt.encoder &&
      binding.inputTexture && binding.outputTexture)) return false;
  const [world, gaussian, observer] = bindings;
  if (world.inputTexture === null || world.outputTexture !== receipt.worldTexture ||
      world.emissionTexture !== receipt.emissionTexture || world.worldTexture !== null ||
      world.sourceUniformBuffer !== receipt.sourceUniformBuffer || world.kernelBuffer !== null ||
      gaussian.inputTexture !== receipt.emissionTexture || gaussian.outputTexture !== receipt.psfHorizontalTexture ||
      gaussian.emissionTexture !== null || gaussian.worldTexture !== null || gaussian.sourceUniformBuffer !== null ||
      gaussian.kernelBuffer !== receipt.kernelBuffer || observer.inputTexture !== receipt.psfHorizontalTexture ||
      observer.outputTexture !== receipt.target || observer.emissionTexture !== null ||
      observer.worldTexture !== receipt.worldTexture || observer.sourceUniformBuffer !== receipt.sourceUniformBuffer ||
      observer.kernelBuffer !== receipt.kernelBuffer) return false;
  return typeof spec.operatorVersion === 'string' && spec.operatorVersion.length > 0 &&
    Number.isFinite(spec.maxOffset) && Number.isInteger(spec.tapCount) && spec.tapCount > 0 &&
    Number.isFinite(spec.projectionScale) && Number.isFinite(spec.sigmaCss) && spec.sigmaCss >= 0 &&
    Number.isFinite(spec.radiusCss) && spec.radiusCss >= 0 && Number.isFinite(spec.normalizationF32) &&
    spec.quadrature === '8-point positive Gauss-Legendre per physical-pixel cell' &&
    spec.samplerSpacingBackingPx === 1 && spec.textureLoadBudgetPerFrame === 2 * spec.tapCount &&
    spec.maxOffset === floats[0] && spec.tapCount === floats[1] &&
    spec.normalizationF32 === floats[2] && spec.projectionScale === floats[3] &&
    receipt.passes === 3 && receipt.submitted === true && receipt.completed === true &&
    receipt.queueCompleted === true && receipt.sameDevice === true && receipt.sameEncoder === true;
}

function errorText(value) { return String(value?.message || value || 'unknown error').slice(0, 500); }

function validAudioRetirement(audio) {
  return !!audio && audio.settled === true &&
    (audio.contextState === 'absent' || audio.contextState === 'closed') &&
    audio.voicesRemaining === 0 && audio.pendingCount === 0 &&
    Array.isArray(audio.errors) && audio.errors.length === 0;
}

export function evidenceFromCleanup(cleanup, sourceIdentity) {
  if (cleanup?.status === 'not-started') {
    if (!validAudioRetirement(cleanup.audioRetirement)) throw new Error('AUDIO_NOT_CLOSED_BEFORE_HOST_START');
    const safe = projectCleanupReceipts(cleanup, null);
    return Object.freeze({ host: { status: 'not-created', pendingFrames: 0 },
      audio: safe.audio, rawReceipts: Object.freeze({ host: null, hostRetiredEvent: null, audio: safe.audio }), resourceState: 'not-created' });
  }
  const host = cleanup?.hostResult, event = cleanup?.hostRetiredEvent, audio = cleanup?.audioRetirement;
  if (!host || host.state !== 'retired' || host.pendingFrames !== 0 ||
      host.lost?.sameDevice !== true || host.lost?.reason !== 'destroyed')
    throw new Error('HOST_RETIREMENT_SNAPSHOT_INCOMPLETE');
  if (!event || event.name !== 'retired' || event.pendingErrorCount !== 0 ||
      event.effectError !== null || event.queueError !== null || event.lostWaitError !== null ||
      event.lost?.sameDevice !== true || event.lost?.reason !== 'destroyed')
    throw new Error('HOST_RESOURCE_DRAIN_EVENT_INCOMPLETE');
  if (!validAudioRetirement(audio)) throw new Error('AUDIO_RETIREMENT_INCOMPLETE');
  const safe = projectCleanupReceipts(cleanup, sourceIdentity);
  const noErrors = event.pendingErrorCount === 0 && event.effectError === null &&
    event.queueError === null && event.lostWaitError === null;
  return Object.freeze({ sourceIdentity: safe.sourceIdentity,
    host: { status: host.state, pendingFrames: host.pendingFrames, sourceIdentity: safe.sourceIdentity,
      device: { status: 'destroyed-loss-settled', drained: noErrors && host.pendingFrames === 0,
        destroyCalled: host.state === 'retired' && host.lost.reason === 'destroyed' && host.lost.sameDevice === true,
        lostReason: host.lost.reason, sameDevice: host.lost.sameDevice },
      resourceCleanupErrors: [] },
    rawReceipts: Object.freeze({ sourceIdentity: safe.sourceIdentity, host: safe.host, hostRetiredEvent: safe.hostRetiredEvent, audio: safe.audio }),
    audio: safe.audio, resourceState: 'retired' });
}

/**
 * Child-side adapter for the actual 6543 parent gallery protocol. It emits
 * phase messages only when the caller observes those phases, and acknowledges
 * parent retirement only after the supplied real cleanup promise and its
 * host/audio receipts satisfy the checked resource contract.
 */
export function createGalleryLifetimeBridge({ windowRef = globalThis.window,
  versionId = DEFAULT_VERSION_ID, routePath = DEFAULT_ROUTE,
  expectedPackageManifestSha256, retirePreview } = {}) {
  if (!windowRef?.location || typeof retirePreview !== 'function')
    throw new TypeError('WINDOW_LOCATION_AND_RETIRE_CALLBACK_REQUIRED');
  if (typeof expectedPackageManifestSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(expectedPackageManifestSha256))
    throw new TypeError('EXACT_PACKAGE_MANIFEST_PIN_REQUIRED');
  const pageUrl = new URL(windowRef.location.href);
  const params = pageUrl.searchParams;
  const token = params.get('galleryStartupToken');
  const protocolVersionId = params.get('galleryVersionId');
  const rawEpoch = params.get('galleryAttemptEpoch');
  const epoch = rawEpoch && /^\d+$/.test(rawEpoch) ? Number(rawEpoch) : NaN;
  const packageManifestSha256 = params.get('packageManifestSha256');
  const enabled = pageUrl.origin === windowRef.location.origin && pageUrl.pathname === routePath &&
    versionId === DEFAULT_VERSION_ID && routePath === DEFAULT_ROUTE &&
    protocolVersionId === versionId && typeof token === 'string' && /^[0-9a-f]{32}$/.test(token) &&
    Number.isSafeInteger(epoch) && epoch > 0 && packageManifestSha256 === expectedPackageManifestSha256;
  if (!enabled) return Object.freeze({ enabled: false, reason: 'PARENT_STARTUP_IDENTITY_MISMATCH',
    reportPhase() { return false; }, reportPlaying() { return false; },
    dispose() { return false; }, get sequence() { return 0; } });

  let sequence = 0, lastStageRank = -1, localRetirement = null, disposed = false, acceptedSourceIdentity = null;
  const onRetirement = event => {
    const data = event?.data;
    if (disposed || event?.source !== windowRef.parent || event?.origin !== pageUrl.origin ||
        data?.schema !== 'dva-gallery-startup/v1' || data?.action !== 'retire' ||
        data?.token !== token || data?.versionId !== versionId || data?.attemptEpoch !== epoch) return;
    void acknowledgeRetirement();
  };
  const onPageHide = () => { void localCleanup().catch(() => {}); };
  windowRef.addEventListener('message', onRetirement);
  windowRef.addEventListener('pagehide', onPageHide, { once: true });

  function post(data) {
    if (disposed) return false;
    sequence++;
    windowRef.parent.postMessage({ schema: 'dva-gallery-startup/v1', token, versionId,
      attemptEpoch: epoch, sequence, ...data }, pageUrl.origin);
    return true;
  }
  function reportPhase(stage, status = 'pending', detail = {}) {
    const rank = STAGES.get(stage);
    if (disposed || rank === undefined || stage === 'playing' && status === 'ready' ||
        !STATUSES.has(status) || rank < lastStageRank ||
        detail === null || typeof detail !== 'object' || Array.isArray(detail)) return false;
    if (status === 'ready' && !['adapter','device','assets','pipelines','first-frame'].includes(stage)) return false;
    if ((status === 'error' || status === 'unsupported') && !['error','object'].includes(typeof detail.error)) return false;
    lastStageRank = rank;
    const safeDetail = {};
    if (detail.error !== undefined) safeDetail.error = { code: String(detail.error?.code || 'STARTUP_ERROR').slice(0, 100),
      message: errorText(detail.error?.message || detail.error) };
    if (detail.progress !== undefined && Number.isFinite(detail.progress)) safeDetail.progress = detail.progress;
    return post({ stage, status, ...safeDetail });
  }
  function reportPlaying({ receipt, source, canvas } = {}) {
    if (disposed || !receipt || !source || !canvas || !canvas.isConnected ||
        receipt.completed !== true || receipt.submitted !== true || receipt.sameDevice !== true ||
        receipt.sourceId !== source.sourceId || receipt.causeId !== source.causeId ||
        receipt.generation !== source.generation || receipt.version !== 'flora-invisible-codex-sol61-zero-r4' || source.version !== 'flora-invisible-codex-sol61-zero-r4' || receipt.active !== true || !['preview-monotonic-rate1','producer-e-age'].includes(source.clockKind) || receipt.clockKind !== source.clockKind || !Number.isFinite(source.startedAtMs) || receipt.startedAtMs !== source.startedAtMs || receipt.durationMs !== source.durationMs ||
        !Number.isSafeInteger(receipt.frameId) || receipt.frameId < 1 ||
        !Number.isFinite(receipt.elapsedMs) || receipt.elapsedMs < 0 || receipt.elapsedMs >= source.durationMs ||
        !Number.isFinite(source.durationMs) || source.durationMs !== 1600 ||
        !Number.isSafeInteger(source.generation) || source.generation < 1 ||
        typeof source.sourceId !== 'string' || !source.sourceId ||
        typeof source.causeId !== 'string' || !source.causeId ||
        !receipt.target || !receipt.encoder || !receipt.device || !(receipt.uniformBytes instanceof Uint8Array) || receipt.uniformBytes.byteLength !== 160 ||
        !r3KernelReceiptIsBound(receipt) ||
        !Number.isSafeInteger(canvas.width) || canvas.width < 1 ||
        !Number.isSafeInteger(canvas.height) || canvas.height < 1) return false;
    if (lastStageRank < STAGES.get('first-frame')) return false;
    const firstFrame = Object.freeze({ recorded: true, submitted: true, completed: true, canvasConnected: true,
      passes: receipt.passes, viewportWidth: canvas.width, viewportHeight: canvas.height,
      version: receipt.version, sourceId: receipt.sourceId, causeId: receipt.causeId,
      generation: receipt.generation, frameId: receipt.frameId, elapsedMs: receipt.elapsedMs,
      durationMs: source.durationMs, clockKind: source.clockKind, startedAtMs: source.startedAtMs,
      sameDevice: true, sameEncoder: true, queueCompleted: true,
      packageManifestSha256: expectedPackageManifestSha256, uniformBytes: receipt.uniformBytes.byteLength,
      kernelBytes: Array.from(receipt.kernelBytes), kernelByteLength: receipt.kernelBytes.byteLength,
      kernelUniform: [...receipt.kernelUniform], kernelKey: receipt.kernelKey,
      kernelSpec: Object.freeze({ operatorVersion: receipt.kernelSpec.operatorVersion,
        maxOffset: receipt.kernelSpec.maxOffset, tapCount: receipt.kernelSpec.tapCount,
        projectionScale: receipt.kernelSpec.projectionScale, sigmaCss: receipt.kernelSpec.sigmaCss,
        radiusCss: receipt.kernelSpec.radiusCss, normalizationF32: receipt.kernelSpec.normalizationF32,
        quadrature: receipt.kernelSpec.quadrature,
        samplerSpacingBackingPx: receipt.kernelSpec.samplerSpacingBackingPx,
        textureLoadBudgetPerFrame: receipt.kernelSpec.textureLoadBudgetPerFrame }),
      passOrder: Object.freeze([...receipt.passOrder]), passBindingsMatch: true });
    lastStageRank = STAGES.get('playing');
    const posted = post({ stage: 'playing', status: 'ready', firstFrame });
    if (posted) acceptedSourceIdentity = sourceIdentityFromPlaying({ versionId, receipt, source });
    return posted;
  }
  function localCleanup() {
    if (!localRetirement) localRetirement = Promise.resolve().then(() => retirePreview());
    return localRetirement;
  }
  async function acknowledgeRetirement() {
    try {
      const cleanup = await localCleanup();
      const evidence = evidenceFromCleanup(cleanup, acceptedSourceIdentity);
      const lifecycle = Object.freeze({ disposeSettled: true, teardown: 'disposed',
        packageManifestSha256: expectedPackageManifestSha256, resourceState: evidence.resourceState,
        sourceIdentity: evidence.sourceIdentity ?? null,
        host: evidence.host, audio: evidence.audio, rawReceipts: evidence.rawReceipts ?? null });
      post({ action: 'retired', lifecycle });
      disposed = true;
      windowRef.removeEventListener('message', onRetirement);
      windowRef.removeEventListener('pagehide', onPageHide);
    } catch (error) {
      post({ action: 'retire-error', teardown: 'unknown', error: { code: 'RETIREMENT_NOT_SETTLED', message: errorText(error) },
        lifecycle: { disposeSettled: false, teardown: 'unknown', packageManifestSha256: expectedPackageManifestSha256 } });
      disposed = true;
      windowRef.removeEventListener('message', onRetirement);
      windowRef.removeEventListener('pagehide', onPageHide);
    }
  }

  reportPhase('child-document', 'pending');
  return Object.freeze({ enabled: true, versionId, token, attemptEpoch: epoch, packageManifestSha256,
    reportPhase, reportPlaying, retireLocally: localCleanup,
    dispose() { disposed = true; windowRef.removeEventListener('message', onRetirement); windowRef.removeEventListener('pagehide', onPageHide); },
    get sequence() { return sequence; } });
}

export const FLORA_ZERO_PARENT_PROTOCOL = Object.freeze({ schema: 'dva-gallery-startup/v1',
  versionId: DEFAULT_VERSION_ID, routePath: DEFAULT_ROUTE,
  requiredQuery: Object.freeze(['galleryStartupToken','galleryVersionId','galleryAttemptEpoch','packageManifestSha256']),
  startupStages: Object.freeze([...STAGES.keys()]),
  retirementAck: Object.freeze(['action:retired','lifecycle.disposeSettled:true','lifecycle.teardown:disposed']) });



