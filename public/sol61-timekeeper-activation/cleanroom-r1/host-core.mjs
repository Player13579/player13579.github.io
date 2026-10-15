export const VERSION = 'timekeeper-activation-cleanroom-sol61-r1';
export const DURATION_MS = 5000;
export const LOOP_GAP_MS = 600;
export const SFX_OFFSET_MS = 0;
export const SFX_DURATION_MS = 920;
export const PACKAGE_SCHEMA = 'dva-timekeeper-cleanroom-gallery/v1';
export const SOURCE_SCHEMA = 'dva-timekeeper-cleanroom-source/v1';
export const SEAL_SCHEMA = 'dva-timekeeper-cleanroom-seal/v1';
export const PACKAGE_PREFIX = '/public/sol61-timekeeper-activation/cleanroom-r1/';
export const RUNTIME_CLOSURE = Object.freeze(['index.html', 'gallery-adapter.mjs', 'effect.mjs', 'body.png', 'host-core.mjs']);

export function validateRendererDiagnostics(diagnostics, validationError = null) {
  if (validationError) throw new Error('WebGPU validation error scope rejected renderer initialization: ' + String(validationError.message || validationError));
  if (!diagnostics || !Array.isArray(diagnostics.messages) || typeof diagnostics.compilation !== 'string') throw new Error('Renderer compilation diagnostics are missing or malformed');
  const snapshot = Object.freeze({ compilation: diagnostics.compilation,
    messages: Object.freeze(diagnostics.messages.map(message => Object.freeze({ ...message }))),
    error: diagnostics.error == null ? null : String(diagnostics.error) });
  if (snapshot.compilation !== 'COMPILATION_INFO_RECEIVED' || snapshot.error || snapshot.messages.some(message => message.type === 'error')) {
    const details = JSON.stringify(snapshot);
    throw new Error('Renderer WGSL compilation failed: ' + details);
  }
  return snapshot;
}

export async function createRendererUnderValidationScope(device, factory) {
  if (!device || typeof device.pushErrorScope !== 'function' || typeof device.popErrorScope !== 'function' || typeof factory !== 'function') throw new TypeError('device error scope and renderer factory required');
  device.pushErrorScope('validation');
  let renderer = null, diagnostics = null, creationError = null, validationError = null;
  try {
    try {
      renderer = factory();
      if (!renderer || typeof renderer.render !== 'function' || typeof renderer.dispose !== 'function' || !renderer.diagnosticsReady || typeof renderer.diagnosticsReady.then !== 'function') throw new Error('Renderer contract/diagnostics contract is incomplete');
      try { diagnostics = await renderer.diagnosticsReady; } catch (error) { creationError = error; }
    } catch (error) { creationError = error; }
  } finally {
    try { validationError = await device.popErrorScope(); } catch (error) { validationError = error; }
  }
  if (creationError) {
    if (!diagnostics) diagnostics = Object.freeze({ compilation: 'FAILED', messages: Object.freeze([]), error: String(creationError.message || creationError) });
    const error = new Error('Renderer creation failed after error-scope settlement: ' + String(creationError.message || creationError));
    error.renderer = renderer; error.diagnostics = diagnostics; error.validationError = validationError; throw error;
  }
  try {
    const snapshot = validateRendererDiagnostics(diagnostics, validationError);
    return Object.freeze({ renderer, diagnostics: snapshot });
  } catch (error) {
    error.renderer = renderer; error.diagnostics = diagnostics; error.validationError = validationError; throw error;
  }
}

export function parsePackagePins({ search, pathname, prefix = PACKAGE_PREFIX }) {
  if (typeof pathname !== 'string' || !pathname.startsWith(prefix) || pathname.includes('..')) throw new Error('package route is outside the pinned Timekeeper cleanroom family');
  const params = new URLSearchParams(search);
  for (const key of ['packageSchema', 'packageManifestSha256', 'packageSealSha256', 'sourceManifestSha256']) {
    if (params.getAll(key).length !== 1) throw new Error(`${key} must appear exactly once`);
  }
  const pins = Object.freeze({
    packageSchema: params.get('packageSchema'),
    packageManifestSha256: params.get('packageManifestSha256'),
    packageSealSha256: params.get('packageSealSha256'),
    sourceManifestSha256: params.get('sourceManifestSha256')
  });
  if (pins.packageSchema !== PACKAGE_SCHEMA) throw new Error('packageSchema query pin is missing or incorrect');
  for (const [key, value] of Object.entries(pins)) if (key !== 'packageSchema' && !/^[0-9a-f]{64}$/.test(value || '')) throw new Error(`${key} query pin is missing or malformed`);
  return pins;
}

function hex(buffer) { return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join(''); }
function jsonBytes(bytes, name) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (error) { throw new Error(`${name} is not valid UTF-8 JSON: ${String(error?.message || error)}`); }
}
function fileMap(records, expectedPaths, label) {
  if (!Array.isArray(records)) throw new Error(`${label} files must be an array`);
  const map = new Map();
  for (const record of records) {
    if (!record || typeof record.path !== 'string' || !Number.isSafeInteger(record.bytes) || record.bytes < 0 || !/^[0-9a-f]{64}$/.test(record.sha256 || '') || map.has(record.path)) throw new Error(`${label} has an invalid or duplicate file record`);
    map.set(record.path, { path: record.path, bytes: record.bytes, sha256: record.sha256 });
  }
  const expected = [...expectedPaths].sort();
  if (map.size !== expected.length || [...map.keys()].sort().some((path, i) => path !== expected[i])) throw new Error(`${label} closure paths do not match the required runtime set`);
  return map;
}

export async function verifyPackageClosure({ pins, packageManifestBytes, sealBytes, sourceManifestBytes, runtimeFiles, cryptoApi = globalThis.crypto }) {
  if (!cryptoApi?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  const digest = async bytes => hex(await cryptoApi.subtle.digest('SHA-256', bytes));
  if (await digest(packageManifestBytes) !== pins.packageManifestSha256) throw new Error('package manifest hash does not match URL pin');
  if (await digest(sealBytes) !== pins.packageSealSha256) throw new Error('package seal hash does not match URL pin');
  if (await digest(sourceManifestBytes) !== pins.sourceManifestSha256) throw new Error('source manifest hash does not match URL pin');
  const pkg = jsonBytes(packageManifestBytes, 'package manifest');
  const seal = jsonBytes(sealBytes, 'package seal');
  const source = jsonBytes(sourceManifestBytes, 'source manifest');
  if (pkg.schema !== PACKAGE_SCHEMA || seal.schema !== SEAL_SCHEMA || source.schema !== SOURCE_SCHEMA) throw new Error('package/source/seal schema mismatch');
  if (pkg.versionId !== VERSION || seal.versionId !== VERSION || source.versionId !== VERSION) throw new Error('package closure version mismatch');
  if (pkg.entry !== 'index.html') throw new Error('package entry must be index.html');
  if (pkg.sourceManifestSha256 !== pins.sourceManifestSha256 || seal.packageSchema !== PACKAGE_SCHEMA ||
      seal.packageManifestSha256 !== pins.packageManifestSha256 || seal.sourceManifestSha256 !== pins.sourceManifestSha256) throw new Error('package seal/source bindings mismatch');
  const runtimeExpected = RUNTIME_CLOSURE;
  const sourceFiles = fileMap(source.files, runtimeExpected, 'source manifest');
  const pkgFiles = fileMap(pkg.files, [...runtimeExpected, 'source-manifest.json'], 'package manifest');
  const sealFiles = fileMap(seal.files, runtimeExpected, 'package seal');
  const sourceManifestRecord = pkgFiles.get('source-manifest.json');
  if (sourceManifestRecord.bytes !== sourceManifestBytes.byteLength || sourceManifestRecord.sha256 !== pins.sourceManifestSha256) throw new Error('package manifest source-manifest record mismatch');
  const runtimeMap = new Map();
  for (const file of runtimeFiles) {
    if (!RUNTIME_CLOSURE.includes(file.path) || runtimeMap.has(file.path)) throw new Error('actual runtime closure has an unexpected or duplicate path');
    const actual = { path: file.path, bytes: file.bytes.byteLength, sha256: await digest(file.bytes) };
    runtimeMap.set(file.path, actual);
    for (const [label, map] of [['source manifest', sourceFiles], ['package manifest', pkgFiles], ['package seal', sealFiles]]) {
      const expected = map.get(file.path);
      if (!expected || expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) throw new Error(`${label} does not bind actual ${file.path} bytes`);
    }
  }
  if (runtimeMap.size !== runtimeExpected.length) throw new Error('actual runtime closure is incomplete');
  return Object.freeze({ status: 'PACKAGE_CLOSURE_VERIFIED', versionId: VERSION,
    packageSchema: PACKAGE_SCHEMA, packageManifestSha256: pins.packageManifestSha256,
    packageSealSha256: pins.packageSealSha256, sourceManifestSha256: pins.sourceManifestSha256,
    files: Object.freeze([...runtimeMap.values()]) });
}

export function parseStartupIdentity({ search, origin, parentIsSelf }) {
  const params = new URLSearchParams(search);
  if (['galleryStartupToken', 'galleryVersionId', 'galleryAttemptEpoch'].some(key => params.getAll(key).length !== 1)) return null;
  const token = params.get('galleryStartupToken');
  const versionId = params.get('galleryVersionId');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  if (parentIsSelf || !/^[0-9a-f]{32}$/i.test(token || '') ||
      versionId !== VERSION || !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0) return null;
  return Object.freeze({ token, versionId, attemptEpoch, origin });
}

export function validateRetireMessage(event, identity, lastSequence) {
  const d = event?.data;
  return Boolean(identity && event?.origin === identity.origin && d?.schema === 'dva-gallery-startup/v1' &&
    d.action === 'retire' && d.token === identity.token && d.versionId === identity.versionId &&
    d.attemptEpoch === identity.attemptEpoch && (d.sequence === undefined ||
      Number.isSafeInteger(d.sequence) && d.sequence > lastSequence));
}

export class EpisodeClock {
  constructor({ durationMs = DURATION_MS, gapMs = LOOP_GAP_MS } = {}) {
    this.durationMs = durationMs;
    this.gapMs = gapMs;
    this.elapsedMs = 0;
    this.loop = 0;
    this.lastNow = null;
    this.gapElapsedMs = 0;
    this.held = false;
  }

  start(now) {
    if (!Number.isFinite(now)) throw new TypeError('clock time must be finite');
    this.lastNow = now;
  }

  tick(now) {
    if (!Number.isFinite(now)) throw new TypeError('clock time must be finite');
    if (this.lastNow === null) this.lastNow = now;
    const delta = now - this.lastNow;
    if (delta < 0) throw new RangeError('monotonic clock moved backwards');
    if (!this.held) {
      let remaining = delta;
      while (remaining > 0) {
        if (this.elapsedMs < this.durationMs) {
          const active = Math.min(remaining, this.durationMs - this.elapsedMs);
          this.elapsedMs += active; remaining -= active;
          if (this.elapsedMs === this.durationMs) this.gapElapsedMs = 0;
        } else {
          const gap = Math.min(remaining, this.gapMs - this.gapElapsedMs);
          this.gapElapsedMs += gap; remaining -= gap;
          if (this.gapElapsedMs >= this.gapMs) {
            this.loop += 1; this.elapsedMs = 0; this.gapElapsedMs = 0;
          }
        }
      }
    }
    this.lastNow = now;
    return this.snapshot();
  }

  hold(ageMs, now) {
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > this.durationMs) throw new RangeError('held source age out of range');
    if (!Number.isFinite(now)) throw new TypeError('clock time must be finite');
    this.held = true;
    this.elapsedMs = ageMs;
    this.gapElapsedMs = 0;
    this.lastNow = now;
    return this.snapshot();
  }

  resume(now) {
    if (!Number.isFinite(now)) throw new TypeError('clock time must be finite');
    this.held = false;
    this.lastNow = now;
    return this.snapshot();
  }

  replay(now) {
    if (!Number.isFinite(now)) throw new TypeError('clock time must be finite');
    this.loop += 1;
    this.elapsedMs = 0;
    this.gapElapsedMs = 0;
    this.held = false;
    this.lastNow = now;
    return this.snapshot();
  }

  snapshot() {
    return Object.freeze({ elapsedMs: this.elapsedMs, loop: this.loop,
      inGap: this.elapsedMs >= this.durationMs, gapElapsedMs: this.gapElapsedMs, held: this.held });
  }
}

export function completionStillCurrent({ generation, currentGeneration, disposed, retired, hidden,
  connected, surfaceCurrent, sourceOn, mainOn, active, ageMs }) {
  return generation === currentGeneration && !disposed && !retired && !hidden && connected &&
    surfaceCurrent && sourceOn && mainOn && active && Number.isFinite(ageMs) &&
    ageMs >= 0 && ageMs < DURATION_MS;
}

export class AudioVoiceGate {
  constructor({ verify = false, context = null, buffer = null, offsetMs = SFX_OFFSET_MS,
    durationMs = SFX_DURATION_MS, zeroOffsetEligibilityWindowMs = 100 } = {}) {
    this.verify = verify;
    this.context = context;
    this.buffer = buffer;
    this.offsetMs = offsetMs;
    this.durationMs = durationMs;
    this.zeroOffsetEligibilityWindowMs = zeroOffsetEligibilityWindowMs;
    this.unlockCauseId = null;
    this.lastOnset = null;
    this.seenCauses = new Set();
    this.voices = new Map();
    this.lastSkip = null;
    this.disposed = false;
  }

  activateFromGesture(causeId = null) {
    if (typeof causeId === 'string' && causeId) this.unlockCauseId = causeId;
    if (this.verify) return Object.freeze({ state: 'silent', reason: 'verification mode' });
    if (this.disposed || !this.context) return Object.freeze({ state: 'unsupported', reason: 'audio unavailable' });
    try {
      const resumed = this.context.state === 'running' ? Promise.resolve() : this.context.resume();
      return Promise.resolve(resumed).then(() => this.context.state === 'running'
        ? Object.freeze({ state: 'active' })
        : Object.freeze({ state: 'unsupported', reason: 'audio context is not running' }));
    } catch (error) {
      return Promise.resolve(Object.freeze({ state: 'unsupported', reason: String(error?.message || error) }));
    }
  }

  acceptCompletedCause({ causeId, sourcePositive, sourceOn, mainOn, active, ageMs,
    generationCurrent, hidden = false, disposed = false, retired = false }) {
    if (!causeId || this.seenCauses.has(causeId)) return false;
    this.seenCauses.add(causeId);
    const reject = reason => { this.lastSkip = Object.freeze({ causeId, reason }); return false; };
    if (this.verify) return reject('verification-hard-muted');
    if (this.disposed || disposed || retired) return reject('retired-or-disposed');
    if (hidden) return reject('hidden');
    if (!generationCurrent) return reject('stale-generation');
    if (!sourcePositive || !sourceOn || !mainOn || !active) return reject('nonpositive-or-inactive-source');
    if (this.unlockCauseId === causeId) return reject('unlock-mid-cause-no-catch-up');
    if (!Number.isFinite(ageMs) || ageMs < 0) return reject('invalid-source-age');
    if (this.offsetMs === 0 ? !(ageMs > 0 && ageMs <= this.zeroOffsetEligibilityWindowMs) : ageMs >= this.offsetMs) return reject('completion-after-onset-window');
    if (!this.context || this.context.state !== 'running' || !this.buffer) return reject('audio-not-unlocked-before-onset');
    try {
      const node = this.context.createBufferSource();
      node.buffer = this.buffer;
      node.connect(this.context.destination);
      const when = this.offsetMs === 0 ? this.context.currentTime : this.context.currentTime + (this.offsetMs - ageMs) / 1000;
      const onsetDelayMs = this.offsetMs === 0 ? ageMs : this.offsetMs;
      const voice = { causeId, node, when, onsetDelayMs, stopped: false };
      this.lastOnset = Object.freeze({ causeId, onsetDelayMs, zeroOffsetEligibilityWindowMs: this.offsetMs === 0 ? this.zeroOffsetEligibilityWindowMs : null });
      this.voices.set(causeId, voice);
      node.onended = () => { this.voices.delete(causeId); try { node.disconnect(); } catch {} };
      node.start(when);
      return true;
    } catch (error) {
      try { this.voices.get(causeId)?.node?.disconnect?.(); } catch {}
      this.voices.delete(causeId);
      this.lastSkip = Object.freeze({ causeId, reason: 'voice-scheduling-failed', detail: String(error?.message || error) });
      return false;
    }
  }

  stopCause(causeId, reason = 'cause-stopped') {
    const voice = this.voices.get(causeId);
    if (!voice) return false;
    this.voices.delete(causeId);
    voice.stopped = true;
    try { voice.node.stop(); } catch {}
    try { voice.node.disconnect(); } catch {}
    this.lastSkip = Object.freeze({ causeId, reason });
    return true;
  }

  stopAll(reason = 'host-stopped') {
    for (const id of [...this.voices.keys()]) this.stopCause(id, reason);
  }

  dispose() {
    this.stopAll('disposed');
    this.disposed = true;
  }

  snapshot() {
    return Object.freeze({ verify: this.verify, hardMuted: this.verify,
      seenCauseCount: this.seenCauses.size, activeVoices: this.voices.size,
      lastSkip: this.lastSkip, lastOnset: this.lastOnset, onsetDelayMs: this.lastOnset?.onsetDelayMs ?? null,
      zeroOffsetEligibilityWindowMs: this.offsetMs === 0 ? this.zeroOffsetEligibilityWindowMs : null, disposed: this.disposed,
      contextState: this.context?.state || 'absent' });
  }
}
