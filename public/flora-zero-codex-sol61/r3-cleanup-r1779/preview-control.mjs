import { createWebGpuLifetimeHost } from './webgpu-lifetime-host.mjs';
import { create as createFloraRuntime } from './inputs/sol-r1701/runtime.mjs';
import { LIFE_MS, VERSION, previewCaster } from './inputs/sol-r1701/model.mjs';
import { createVersionBoundNormalGalleryAudioController } from './audio-controls/src/version-bound-normal-gallery-audio-controller.mjs';
import { createGalleryLifetimeBridge } from './gallery-lifetime-bridge.mjs';

const params = new URL(location.href).searchParams;
const verifyMode = params.has('verify');
const canvas = document.querySelector('#flora-zero');
const status = document.querySelector('#status');
const playButton = document.querySelector('#play');
const stopButton = document.querySelector('#stop');
const soundButton = document.querySelector('#sound');
const muteButton = document.querySelector('#mute');
const optionInputs = {
  sourceOn: document.querySelector('#source'),
  observerOn: document.querySelector('#observer'),
  nearOn: document.querySelector('#near'),
  background: document.querySelector('#background'),
};
const cssWidth = Math.max(1, Number(params.get('width')) || innerWidth);
const embeddedStageHeight = params.get('embed') === '1' ? Number(params.get('stageHeight')) : NaN;
const cssHeight = Math.max(1, Number.isFinite(embeddedStageHeight) && embeddedStageHeight > 0 ? embeddedStageHeight : Number(params.get('height')) || innerHeight - 140);
const dpr = Math.max(1, Math.min(2, Number(params.get('dpr')) || devicePixelRatio || 1));
canvas.style.width = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);

let source = null;
let host = null;
let runtimeDevice = null;
let bridge = null;
let retired = false;
let generation = 0;
let normalAudioUnlocked = false;
let firstFrameReported = false;
let startupStage = 'child-document';
let hostRetiredEvent = null;
let retirementPromise = null;
const receipts = [];
const failures = [];
const packagePin = params.get('packageManifestSha256');
const audioContextCtor = window.AudioContext || window.webkitAudioContext || function AudioUnavailable() {
  throw new Error('AUDIO_CONTEXT_UNAVAILABLE');
};
const audio = createVersionBoundNormalGalleryAudioController({
  galleryVersionId: VERSION,
  verifyMode,
  AudioContextCtor: audioContextCtor,
  readCurrentSourceAgeMs({ sourceId, causeId, generation: currentGeneration, clockKind }) {
    if (!source || source.sourceId !== sourceId || source.causeId !== causeId ||
        source.generation !== currentGeneration || source.clockKind !== clockKind) return null;
    return { clockKind, ageMs: Math.max(0, performance.now() - source.startedAtMs) };
  },
  isSourceCurrent({ sourceId, causeId, generation: currentGeneration }) {
    return !retired && !!source && source.sourceId === sourceId && source.causeId === causeId &&
      source.generation === currentGeneration && performance.now() - source.startedAtMs < LIFE_MS;
  },
});

function currentOptions() {
  return {
    sourceOn: optionInputs.sourceOn.checked,
    observerOn: optionInputs.observerOn.checked,
    nearOn: optionInputs.nearOn.checked,
    background: optionInputs.background.checked ? 'light' : 'dark',
  };
}

const R3_PASS_ORDER = Object.freeze(['WORLD', 'GAUSSIAN_X', 'OBSERVER_Y']);

function kernelReceiptEvidence(receipt, expectedDevice) {
  const sourceBytes = receipt?.uniformBytes;
  const kernelBytes = receipt?.kernelBytes;
  const kernelUniform = receipt?.kernelUniform;
  const order = receipt?.passOrder;
  const bindings = receipt?.passBindings;
  const spec = receipt?.kernelSpec;
  const bytes = kernelBytes instanceof Uint8Array ? Array.from(kernelBytes) : [];
  const floats = Array.isArray(kernelUniform) && kernelUniform.length === 48 ? kernelUniform.map(Number) : [];
  const key = bytes.map(value => value.toString(16).padStart(2, '0')).join('');
  let floatBytesMatch = false;
  if (Array.isArray(kernelUniform) && kernelUniform.length === 48 && floats.every(Number.isFinite)) {
    const floatBytes = new Uint8Array(Float32Array.from(floats).buffer);
    floatBytesMatch = bytes.length === 192 && floatBytes.every((value, index) => value === bytes[index]);
  }
  const world = bindings?.[0], gaussian = bindings?.[1], observer = bindings?.[2];
  const referencesMatch = !!expectedDevice && !!receipt?.encoder && !!receipt?.target && !!receipt?.sourceUniformBuffer &&
    !!receipt?.kernelBuffer && !!receipt?.worldTexture && !!receipt?.emissionTexture && !!receipt?.psfHorizontalTexture &&
    Array.isArray(bindings) && bindings.length === 3 &&
    R3_PASS_ORDER.every((name, index) => order?.[index] === name && bindings[index]?.name === name && bindings[index]?.order === index) &&
    bindings.every(binding => binding?.device === expectedDevice && binding?.encoder === receipt.encoder &&
      !!binding.inputTexture && !!binding.outputTexture) &&
    world.inputTexture !== null && world.outputTexture === receipt.worldTexture &&
    world.emissionTexture === receipt.emissionTexture && world.worldTexture === null &&
    world.sourceUniformBuffer === receipt.sourceUniformBuffer && world.kernelBuffer === null &&
    gaussian.inputTexture === receipt.emissionTexture && gaussian.outputTexture === receipt.psfHorizontalTexture &&
    gaussian.emissionTexture === null && gaussian.worldTexture === null && gaussian.sourceUniformBuffer === null &&
    gaussian.kernelBuffer === receipt.kernelBuffer &&
    observer.inputTexture === receipt.psfHorizontalTexture && observer.outputTexture === receipt.target &&
    observer.emissionTexture === null && observer.worldTexture === receipt.worldTexture &&
    observer.sourceUniformBuffer === receipt.sourceUniformBuffer && observer.kernelBuffer === receipt.kernelBuffer;
  const specMatches = !!spec && typeof spec.operatorVersion === 'string' && spec.operatorVersion.length > 0 &&
    Number.isFinite(spec.maxOffset) && Number.isInteger(spec.tapCount) && spec.tapCount > 0 &&
    Number.isFinite(spec.projectionScale) && Number.isFinite(spec.sigmaCss) && spec.sigmaCss >= 0 &&
    Number.isFinite(spec.radiusCss) && spec.radiusCss >= 0 && Number.isFinite(spec.normalizationF32) &&
    spec.quadrature === '8-point positive Gauss-Legendre per physical-pixel cell' &&
    spec.samplerSpacingBackingPx === 1 && spec.textureLoadBudgetPerFrame === 2 * spec.tapCount &&
    floats.length === 48 && spec.maxOffset === floats[0] && spec.tapCount === floats[1] &&
    spec.normalizationF32 === floats[2] && spec.projectionScale === floats[3];
  const valid = sourceBytes instanceof Uint8Array && sourceBytes.byteLength === 160 &&
    receipt?.kernelByteLength === 192 && bytes.length === 192 && floats.length === 48 &&
    typeof receipt?.kernelKey === 'string' && receipt.kernelKey === key && floatBytesMatch && specMatches &&
    receipt?.passes === 3 && order?.length === 3 && referencesMatch &&
    receipt?.submitted === true && receipt?.completed === true && receipt?.queueCompleted === true &&
    receipt?.sameDevice === true && receipt?.sameEncoder === true;
  return Object.freeze({ valid, kernelBytes: Object.freeze(bytes), kernelByteLength: bytes.length,
    kernelUniform: Object.freeze(floats), kernelKey: key,
    kernelSpec: spec ? Object.freeze({ operatorVersion: spec.operatorVersion, maxOffset: spec.maxOffset,
      tapCount: spec.tapCount, projectionScale: spec.projectionScale, sigmaCss: spec.sigmaCss,
      radiusCss: spec.radiusCss, normalizationF32: spec.normalizationF32, quadrature: spec.quadrature,
      samplerSpacingBackingPx: spec.samplerSpacingBackingPx,
      textureLoadBudgetPerFrame: spec.textureLoadBudgetPerFrame }) : null,
    passes: receipt?.passes ?? null, passOrder: Object.freeze(Array.isArray(order) ? [...order] : []),
    passBindingsMatch: referencesMatch, sameDevice: receipt?.sameDevice === true,
    sameEncoder: receipt?.sameEncoder === true, queueCompleted: receipt?.queueCompleted === true });
}

// Copy only values produced by the completed host callback. Never expose the
// GPUDevice, encoder, target, or texture objects through the serializable probe.
export function snapshotCompletedReceipt(receipt, { currentSource, currentVersion, runtimeDevice: expectedDevice }) {
  const uniform = receipt?.uniformBytes;
  const uniformBytes = ArrayBuffer.isView(uniform) ? Array.from(uniform) : [];
  const kernel = kernelReceiptEvidence(receipt, expectedDevice);
  const sourceMatches = !!currentSource && currentSource.version === currentVersion &&
    receipt?.version === currentVersion && receipt?.sourceId === currentSource.sourceId &&
    receipt?.causeId === currentSource.causeId && receipt?.generation === currentSource.generation &&
    receipt?.clockKind === currentSource.clockKind && receipt?.startedAtMs === currentSource.startedAtMs &&
    receipt?.durationMs === currentSource.durationMs;
  const identityMatches = !!expectedDevice && receipt?.device === expectedDevice;
  return Object.freeze({
    version: receipt?.version ?? null,
    sourceId: receipt?.sourceId ?? null,
    causeId: receipt?.causeId ?? null,
    generation: receipt?.generation ?? null,
    frameId: receipt?.frameId ?? null,
    elapsedMs: receipt?.elapsedMs ?? null,
    captureKind: receipt?.captureKind ?? null,
    uniformBytes: Object.freeze(uniformBytes),
    uniformByteLength: uniformBytes.length,
    kernelBytes: kernel.kernelBytes,
    kernelByteLength: kernel.kernelByteLength,
    kernelUniform: kernel.kernelUniform,
    kernelKey: kernel.kernelKey,
    kernelSpec: kernel.kernelSpec,
    passes: kernel.passes,
    passOrder: kernel.passOrder,
    passBindingsMatch: kernel.passBindingsMatch,
    sameEncoder: kernel.sameEncoder,
    queueCompleted: kernel.queueCompleted,
    device: Object.freeze({
      kind: receipt?.device?.constructor?.name || null,
      sameRuntimeDevice: identityMatches,
      sameDevice: receipt?.sameDevice === true && identityMatches,
    }),
    submitted: receipt?.submitted === true,
    completed: receipt?.completed === true,
    matchesCurrentSource: sourceMatches && identityMatches && uniformBytes.length === 160 && kernel.valid &&
      Number.isSafeInteger(receipt?.frameId) && receipt.frameId > 0 &&
      Number.isFinite(receipt?.elapsedMs) && receipt.elapsedMs >= 0 &&
      ['natural-frame','controlled-age-diagnostic','controlled-age-terminal-diagnostic','natural-terminal-clear'].includes(receipt?.captureKind) &&
      receipt?.submitted === true && receipt?.completed === true,
  });
}

function observeCompletedReceipt(receipt) {
  receipts.push(snapshotCompletedReceipt(receipt, {
    currentSource: source, currentVersion: VERSION, runtimeDevice,
  }));
  if (bridge?.enabled && !firstFrameReported && source && receipt.captureKind === 'natural-frame' &&
      receipt.sourceId === source.sourceId && receipt.causeId === source.causeId && receipt.generation === source.generation) {
    firstFrameReported = true;
    bridge.reportPhase('first-frame', 'ready');
    if (!bridge.reportPlaying({ receipt, source, canvas })) {
      firstFrameReported = false;
      const error = new Error('PARENT_FIRST_FRAME_RECEIPT_REJECTED');
      failures.push(error.message);
      status.value = `失敗: ${error.message}`;
    }
  }
}

// Resolve the measured CSS box and backing store after removing the old min-height stretch.
function canvasGeometry() {
  const rect = canvas.getBoundingClientRect();
  const cssBox = { width: rect.width, height: rect.height };
  if (![cssBox.width, cssBox.height, canvas.width, canvas.height].every(Number.isFinite) ||
      cssBox.width <= 0 || cssBox.height <= 0 || canvas.width <= 0 || canvas.height <= 0)
    throw new Error('ACTUAL_CANVAS_BOX_REQUIRED');
  const dprX = canvas.width / cssBox.width;
  const dprY = canvas.height / cssBox.height;
  if (!Number.isFinite(dprX) || !Number.isFinite(dprY) || Math.abs(dprX - dprY) > 0.02)
    throw new Error('CANVAS_BACKING_RATIO_MISMATCH');
  return Object.freeze({ cssWidth: cssBox.width, cssHeight: cssBox.height,
    physicalWidth: canvas.width, physicalHeight: canvas.height, dpr: dprX, requestedDpr: dpr });
}

function currentFrameOptions() {
  const geometry = canvasGeometry();
  const caster = previewCaster({ widthPhysical: geometry.physicalWidth,
    heightPhysical: geometry.physicalHeight, supportHeightCss: 64, dpr: geometry.dpr });
  return Object.freeze({ ...currentOptions(), caster });
}

function casterEvidence() {
  const geometry = canvasGeometry();
  const caster = previewCaster({ widthPhysical: geometry.physicalWidth,
    heightPhysical: geometry.physicalHeight, supportHeightCss: 64, dpr: geometry.dpr });
  const physicalSupportHeight = caster.height * (224 / 256);
  return Object.freeze({ ...geometry, logicalSupportHeight: caster.supportHeight,
    physicalSupportHeight, physicalScale: caster.height / 256,
    uniformCssScale: caster.supportHeight / 64,
    uniformPhysicalProjectionScale: physicalSupportHeight / caster.supportHeight,
    caster: Object.freeze({ ...caster }) });
}

async function verifyPackageManifestPin() {
  if (!packagePin || !/^[0-9a-f]{64}$/.test(packagePin)) throw new Error('PACKAGE_MANIFEST_QUERY_PIN_REQUIRED');
  const response = await fetch(new URL('./package-manifest.json', location.href), { cache: 'no-store' });
  if (!response.ok) throw new Error(`PACKAGE_MANIFEST_FETCH_FAILED:${response.status}`);
  const bytes = await response.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== packagePin) throw new Error('PACKAGE_MANIFEST_HASH_MISMATCH');
  const manifest = JSON.parse(new TextDecoder().decode(bytes));
  if (manifest.versionId !== VERSION || manifest.groupId !== 'flora-invisible-codex-sol61-zero' || manifest.manifestSha256 !== undefined)
    throw new Error('PACKAGE_MANIFEST_IDENTITY_MISMATCH');
  return digest;
}

async function initializeParentBridge() {
  if (!params.has('galleryStartupToken') && !params.has('galleryAttemptEpoch')) return null;
  const candidate = createGalleryLifetimeBridge({
    versionId: VERSION,
    routePath: '/public/flora-zero-codex-sol61/r3-cleanup-r1779/index.html',
    expectedPackageManifestSha256: packagePin,
    retirePreview: retire,
  });
  if (!candidate.enabled) throw new Error(`PARENT_BRIDGE_IDENTITY_REJECTED:${candidate.reason}`);
  bridge = candidate;
  const verifiedPin = await verifyPackageManifestPin();
  if (verifiedPin !== candidate.packageManifestSha256) throw new Error('PACKAGE_MANIFEST_BRIDGE_PIN_MISMATCH');
  return candidate;
}

async function ensureHost() {
  if (host) return;
  if (retired) throw new Error('PREVIEW_RETIRED');
  startupStage = 'adapter';
  bridge?.reportPhase('adapter', 'pending');
  host = createWebGpuLifetimeHost({
    canvas,
    verify: verifyMode,
    effectFactory: { create: args => {
      return createFloraRuntime(args);
    } },
    readFrameOptions: currentFrameOptions,
    audio,
    onReceipt: observeCompletedReceipt,
    onFailure(error) {
      failures.push(String(error?.message || error));
      status.value = `失敗: ${failures.at(-1)}`;
      if (bridge?.enabled && !firstFrameReported) bridge.reportPhase(startupStage, 'error', { error });
    },
    onState(event) {
      status.value = `${event.name} / ${event.state}`;
      if (event.name === 'retired') hostRetiredEvent = Object.freeze({ ...event });
      if (!bridge?.enabled || firstFrameReported) return;
      if (event.name === 'device-request') {
        bridge.reportPhase('adapter', 'ready');
        startupStage = 'device';
        bridge.reportPhase('device', 'pending');
      } else if (event.name === 'effect-create') {
        bridge.reportPhase('device', 'ready');
        startupStage = 'assets';
        bridge.reportPhase('assets', 'pending');
      } else if (event.name === 'ready') {
        bridge.reportPhase('assets', 'ready');
        bridge.reportPhase('pipelines', 'ready');
        startupStage = 'first-frame';
        bridge.reportPhase('first-frame', 'pending');
      }
    },
  });
  await host.start();
  runtimeDevice = host.device;
  if (!runtimeDevice) throw new Error('HOST_DEVICE_WITNESS_UNAVAILABLE');
}

async function play() {
  if (retired) throw new Error('PREVIEW_RETIRED');
  await ensureHost();
  if (source && performance.now() - source.startedAtMs < LIFE_MS) {
    await host.stopSource({ ...source, reason: 'gallery-replay' });
  }
  if (!verifyMode && normalAudioUnlocked) {
    const result = await audio.unlockFromGesture();
    normalAudioUnlocked = result?.unlocked === true;
  }
  generation += 1;
  const startedAtMs = performance.now();
  source = Object.freeze({
    sourceId: 'flora-zero-gallery-preview-r3',
    causeId: `flora-zero-gallery-r3-${crypto.randomUUID()}`,
    generation,
    startedAtMs,
    durationMs: LIFE_MS,
    clockKind: 'preview-monotonic-rate1',
    version: VERSION,
    scope: 'gallery-only; not a game event or main-game integration',
  });
  await host.play(source);
  stopButton.disabled = false;
  playButton.textContent = '再生し直す';
  status.value = verifyMode ? '検証プレビュー再生中（音声なし）' :
    normalAudioUnlocked ? 'プレビュー再生中（音声有効）' : 'プレビュー再生中（音声は未有効）';
  return Object.freeze({ accepted: true, source: { ...source }, scope: source.scope });
}

async function captureAge(ageMs, nextOptions = undefined) {
  if (!host || !source || retired) throw new Error('CURRENT_PREVIEW_REQUIRED');
  if (nextOptions !== undefined) {
    if (!nextOptions || typeof nextOptions !== 'object') throw new TypeError('OPTIONS_OBJECT_REQUIRED');
    const allowed = ['sourceOn','observerOn','nearOn','background'];
    for (const key of Object.keys(nextOptions)) if (!allowed.includes(key)) throw new Error(`UNSUPPORTED_OPTION:${key}`);
    if ('sourceOn' in nextOptions) optionInputs.sourceOn.checked = Boolean(nextOptions.sourceOn);
    if ('observerOn' in nextOptions) optionInputs.observerOn.checked = Boolean(nextOptions.observerOn);
    if ('nearOn' in nextOptions) optionInputs.nearOn.checked = Boolean(nextOptions.nearOn);
    if ('background' in nextOptions) optionInputs.background.checked = nextOptions.background === 'light';
  }
  const receipt = await host.captureDiagnosticFrame(ageMs, { resume: true });
  const receiptEvidence = snapshotCompletedReceipt(receipt, {
    currentSource: source, currentVersion: VERSION, runtimeDevice,
  });
  return Object.freeze({ ...receiptEvidence, captureKind: 'controlled-age-diagnostic',
    options: currentOptions(), caster: receipt.caster, uniformCssScale: receipt.uniform?.[34], uniformPhysicalProjectionScale: receipt.uniform?.[35], geometry: casterEvidence(), scope: source.scope });
}

async function stop(reason = 'gallery-stop') {
  if (!source || !host) return { stopped: false, reason: 'no-active-source' };
  const current = source;
  const result = await host.stopSource({ ...current, reason });
  source = null;
  stopButton.disabled = true;
  status.value = `停止: ${reason}`;
  return result;
}

async function retire() {
  if (retirementPromise) return retirementPromise;
  if (retired) return host?.snapshot() ?? { state: 'retired' };
  retired = true;
  source = null;
  stopButton.disabled = true;
  playButton.disabled = true;
  soundButton.disabled = true;
  muteButton.disabled = true;
  retirementPromise = (async () => {
    if (!host) {
      const audioRetirement = await audio.retire();
      if (audioRetirement?.settled !== true || audioRetirement.voicesRemaining !== 0 || audioRetirement.pendingCount !== 0 || audioRetirement.errors?.length)
        throw new Error('AUDIO_RETIREMENT_NOT_SETTLED');
      status.value = '終了';
      return { status: 'not-started', audioRetirement };
    }
    const hostResult = await host.retire();
    const audioRetirement = await audio.retire();
    const finalHost = host.snapshot();
    if (!hostRetiredEvent || hostResult?.state !== 'retired' || finalHost?.state !== 'retired' ||
        finalHost?.pendingFrames !== 0 || finalHost?.lost?.sameDevice !== true || finalHost?.lost?.reason !== 'destroyed' ||
        hostRetiredEvent?.name !== 'retired' || hostRetiredEvent.pendingErrorCount !== 0 ||
        hostRetiredEvent.effectError !== null || hostRetiredEvent.queueError !== null || hostRetiredEvent.lostWaitError !== null ||
        hostRetiredEvent.lost?.sameDevice !== true || hostRetiredEvent.lost?.reason !== 'destroyed' ||
        audioRetirement?.settled !== true || audioRetirement.voicesRemaining !== 0 || audioRetirement.pendingCount !== 0 || audioRetirement.errors?.length)
      throw new Error('GALLERY_RETIREMENT_EVIDENCE_INCOMPLETE');
    status.value = '終了・GPU/音声資源を退役';
    return { status: 'retired', hostResult: finalHost, hostRetiredEvent, audioRetirement };
  })();
  return retirementPromise;
}

playButton.addEventListener('click', () => { void play().catch(error => { failures.push(String(error?.message || error)); status.value = `失敗: ${failures.at(-1)}`; }); });
stopButton.addEventListener('click', () => { void stop(); });
soundButton.addEventListener('click', async () => {
  if (verifyMode) { status.value = '検証モードは完全無音です'; return; }
  try {
    const result = await audio.unlockFromGesture();
    normalAudioUnlocked = result?.unlocked === true;
    status.value = normalAudioUnlocked ? '音声有効（再生時のみ）' : `音声未有効: ${result?.reason || 'unlock-failed'}`;
    if (normalAudioUnlocked && source && performance.now() - source.startedAtMs >= 680) await play();
  } catch (error) { failures.push(String(error?.message || error)); status.value = `音声エラー: ${failures.at(-1)}`; }
});
muteButton.addEventListener('click', async () => {
  if (verifyMode) { status.value = '検証モードは完全無音です'; return; }
  const muted = muteButton.dataset.muted !== 'true';
  await audio.setMuted(muted);
  if (muted) normalAudioUnlocked = false;
  muteButton.dataset.muted = String(muted);
  muteButton.textContent = muted ? '音声を戻す' : '消音';
  status.value = muted ? '消音' : '消音解除 — 再度「音声を有効化」を押してください';
});
document.querySelector('#retire').addEventListener('click', () => { void retire().catch(error => { failures.push(String(error?.message || error)); status.value = `終了エラー: ${failures.at(-1)}`; }); });
window.addEventListener('pagehide', () => { void retire().catch(() => {}); }, { once: true });

void (async () => {
  try {
    bridge = await initializeParentBridge();
    if (params.get('galleryAutoLoop') === '1') await play();
  } catch (error) {
    failures.push(String(error?.message || error));
    status.value = `失敗: ${failures.at(-1)}`;
    bridge?.reportPhase('child-document', 'error', { error });
  }
})();

Object.defineProperty(globalThis, '__floraZeroGalleryProbe', {
  configurable: false,
  value: Object.freeze({ play, captureAge, stop, retire, snapshot: () => Object.freeze({
    version: VERSION, verifyMode, source: source && { ...source }, host: host?.snapshot() ?? null,
    audio: audio.snapshot(), receiptCount: receipts.length, receipts: Object.freeze(receipts.slice()), failures: [...failures],
    canvas: { width: canvas.width, height: canvas.height, cssWidth, cssHeight, dpr }, options: currentOptions(), geometry: casterEvidence(),
    scope: 'gallery-only; preview event IDs are never game inventory or entitlement receipts',
  }) }),
});
Object.defineProperty(globalThis, '__dvaGalleryStartupSnapshot', {
  configurable: false,
  value: () => Object.freeze({ schema: 'dva-gallery-startup/v1',
    token: params.get('galleryStartupToken'), versionId: params.get('galleryVersionId'),
    attemptEpoch: Number(params.get('galleryAttemptEpoch')), sequence: bridge?.sequence ?? 0 }),
});
status.value = verifyMode ? '検証用プレビュー準備完了（verify=1・音声なし）' : '準備完了 — 再生を押してください';


