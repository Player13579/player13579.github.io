import { createWebGpuLifetimeHost } from './webgpu-lifetime-host.mjs';
import { create as createFloraRuntime } from './inputs/sol-r1620/runtime.mjs';
import { LIFE_MS, VERSION } from './inputs/sol-r1620/model.mjs';
import { createNormalGalleryAudioController } from './audio-controls/src/normal-gallery-audio-controller.mjs';
import { createGalleryLifetimeBridge } from './gallery-lifetime-bridge.mjs';
import { createNaturalLoopController } from './natural-loop-controller.mjs';
import { createCurrentGenerationPlayingReporter } from './playing-receipt-reporter.mjs';

const params = new URL(location.href).searchParams;
const autoLoopEnabled = params.get('galleryAutoLoop') === '1';
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
let playIntentEpoch = 0;
let host = null;
let runtimeDevice = null;
let bridge = null;
let retired = false;
let generation = 0;
let normalAudioUnlocked = false;
let firstFrameReported = false;
let playingReporter = null;
let startupStage = 'child-document';
let hostRetiredEvent = null;
let retirementPromise = null;
const receipts = [];
const failures = [];
const naturalLoop = createNaturalLoopController({
  enabled: autoLoopEnabled,
  restart: loopGuard => play({ loopGuard }),
  isVisible: () => document.visibilityState !== 'hidden',
  onRestartError(error) { failures.push(String(error?.message || error)); status.value = `失敗: ${failures.at(-1)}`; },
});
const packagePin = params.get('packageManifestSha256');
const audioContextCtor = window.AudioContext || window.webkitAudioContext || function AudioUnavailable() {
  throw new Error('AUDIO_CONTEXT_UNAVAILABLE');
};
const audio = createNormalGalleryAudioController({
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

// Keep the registered visible support at 64 CSS pixels at the canvas DPR.
// The immutable R1 model/kernel still consumes physical backing-pixel units.
function currentFrameOptions() {
  const scale = (64 * dpr) / 224;
  const supportHeight = 64 * dpr;
  const caster = Object.freeze({
    x: canvas.width * 0.5 - 128 * scale,
    y: canvas.height * 0.60 - 239 * scale,
    width: 256 * scale,
    height: 256 * scale,
    supportHeight,
    logicalSupportHeight: 64,
    physicalScale: scale,
    dpr,
  });
  return Object.freeze({ ...currentOptions(), caster });
}

function casterEvidence() {
  const options = currentFrameOptions();
  const caster = options.caster;
  return Object.freeze({ logicalSupportHeight: caster.logicalSupportHeight,
    physicalSupportHeight: caster.supportHeight, physicalScale: caster.physicalScale, dpr: caster.dpr,
    x: caster.x, y: caster.y, width: caster.width, height: caster.height,
    canvasWidth: canvas.width, canvasHeight: canvas.height, cssWidth, cssHeight });
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
    routePath: '/public/flora-zero-codex-sol61/r1-loop-stop-r1953/index.html',
    expectedPackageManifestSha256: packagePin,
    retirePreview: retire,
  });
  if (!candidate.enabled) throw new Error(`PARENT_BRIDGE_IDENTITY_REJECTED:${candidate.reason}`);
  bridge = candidate;
  const verifiedPin = await verifyPackageManifestPin();
  if (verifiedPin !== candidate.packageManifestSha256) throw new Error('PACKAGE_MANIFEST_BRIDGE_PIN_MISMATCH');
  playingReporter = createCurrentGenerationPlayingReporter({ bridge: candidate, canvas });
  return candidate;
}

function snapshotCompletedReceipt(receipt) {
  const current = source;
  const bytes = receipt.uniformBytes instanceof Uint8Array ? Object.freeze(Array.from(receipt.uniformBytes)) : null;
  const matchesCurrentSource = !!current && receipt.sourceId === current.sourceId &&
    receipt.causeId === current.causeId && receipt.generation === current.generation;
  return Object.freeze({ sourceId: receipt.sourceId, causeId: receipt.causeId,
    generation: receipt.generation, frameId: receipt.frameId, elapsedMs: receipt.elapsedMs,
    uniformBytes: bytes,
    device: Object.freeze({ kind: receipt.device?.constructor?.name || 'GPUDevice',
      sameRuntimeDevice: receipt.device === runtimeDevice, sameDevice: receipt.sameDevice === true }),
    submitted: receipt.submitted === true, completed: receipt.completed === true,
    captureKind: receipt.captureKind, matchesCurrentSource });
}

async function ensureHost() {
  if (host) return;
  if (retired) throw new Error('PREVIEW_RETIRED');
  startupStage = 'adapter';
  bridge?.reportPhase('adapter', 'pending');
  host = createWebGpuLifetimeHost({
    canvas,
    verify: verifyMode,
    effectFactory: { create(args) { runtimeDevice = args.device; return createFloraRuntime(args); } },
    readFrameOptions: currentFrameOptions,
    audio,
    onReceipt(receipt) {
      receipts.push(snapshotCompletedReceipt(receipt));
      if (bridge?.enabled && source && receipt.captureKind === 'natural-frame') {
        const publication = playingReporter?.report(receipt, source);
        if (publication?.posted) firstFrameReported = true;
        else if (publication?.fatal) {
          const error = new Error(`PARENT_PLAYING_RECEIPT_REJECTED:${publication.reason}`);
          failures.push(error.message);
          status.value = `失敗: ${error.message}`;
          if (!firstFrameReported) bridge.reportPhase('first-frame', 'error', { error });
        }
      }
    },
    onFailure(error) {
      failures.push(String(error?.message || error));
      status.value = `失敗: ${failures.at(-1)}`;
      if (bridge?.enabled && !firstFrameReported) bridge.reportPhase(startupStage, 'error', { error });
    },
    onState(event) {
      status.value = `${event.name} / ${event.state}`;
      if (event.name === 'source-expired') naturalLoop.onNaturalTerminal(event, host?.snapshot()?.lastTerminalReceipt);
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
}

async function play({ loopGuard = null } = {}) {
  if (retired) throw new Error('PREVIEW_RETIRED');
  if (loopGuard && !loopGuard()) return Object.freeze({ accepted: false, reason: 'natural-loop-cancelled' });
  if (!loopGuard) naturalLoop.cancel('manual-play');
  const playEpoch = ++playIntentEpoch;
  const currentPlay = () => !retired && playEpoch === playIntentEpoch && (!loopGuard || loopGuard());
  await ensureHost();
  if (!currentPlay()) return Object.freeze({ accepted: false, reason: 'play-cancelled' });
  if (source && performance.now() - source.startedAtMs < LIFE_MS) {
    await host.stopSource({ ...source, reason: 'gallery-replay' });
    if (!currentPlay()) return Object.freeze({ accepted: false, reason: 'play-cancelled' });
  }
  if (!verifyMode && normalAudioUnlocked) {
    const result = await audio.unlockFromGesture();
    normalAudioUnlocked = result?.unlocked === true;
    if (!currentPlay()) return Object.freeze({ accepted: false, reason: 'play-cancelled' });
  }
  generation += 1;
  const startedAtMs = performance.now();
  const acceptedSource = Object.freeze({
    sourceId: 'flora-zero-gallery-preview',
    causeId: `flora-zero-gallery-${crypto.randomUUID()}`,
    generation,
    startedAtMs,
    durationMs: LIFE_MS,
    clockKind: 'preview-monotonic-rate1',
    version: VERSION,
    scope: 'gallery-only; not a game event or main-game integration',
  });
  source = acceptedSource;
  await host.play(acceptedSource);
  if (!currentPlay()) {
    await host.stopSource({ ...acceptedSource, reason: 'play-cancelled' });
    if (source === acceptedSource) source = null;
    return Object.freeze({ accepted: false, reason: 'play-cancelled' });
  }
  naturalLoop.arm(acceptedSource);
  stopButton.disabled = false;
  playButton.textContent = '再生し直す';
  status.value = verifyMode ? '検証プレビュー再生中（音声なし）' :
    normalAudioUnlocked ? 'プレビュー再生中（音声有効）' : 'プレビュー再生中（音声は未有効）';
  return Object.freeze({ accepted: true, source: { ...acceptedSource }, scope: acceptedSource.scope });
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
  return Object.freeze({ captureKind: 'controlled-age-diagnostic', frameId: receipt.frameId,
    sourceId: receipt.sourceId, causeId: receipt.causeId, generation: receipt.generation,
    elapsedMs: receipt.elapsedMs, completed: receipt.completed, sameDevice: receipt.sameDevice,
    options: currentOptions(), caster: receipt.caster, uniformSupportScale: receipt.uniform?.[34], geometry: casterEvidence(), scope: source.scope });
}

async function stop(reason = 'gallery-stop') {
  const stopIntent = ++playIntentEpoch;
  naturalLoop.cancel(reason);
  if (!source || !host) return { stopped: false, reason: 'no-active-source' };
  const current = source;
  const result = await host.stopSource({ ...current, reason });
  if (source === current && playIntentEpoch === stopIntent) {
    source = null;
    stopButton.disabled = true;
    status.value = `停止: ${reason}`;
  }
  return result;
}

async function retire() {
  playIntentEpoch += 1;
  naturalLoop.dispose();
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
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') naturalLoop.cancel('hidden'); });
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
    audio: audio.snapshot(), receiptCount: receipts.length, receipts: [...receipts], failures: [...failures],
    parentPlayingIdentity: playingReporter?.snapshot() ?? null,
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




