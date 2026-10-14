import { DURATION_MS } from '../inputs/r1620-sfx.mjs';
export const FLORA_ZERO_AUDIO_SPEC = Object.freeze({ gain: 0.68, durationMs: DURATION_MS, panMin: -0.7, panMax: 0.7 });

export function createZeroSfxPlaybackHost(options) {
  const {
    verifyMode,
    AudioContextCtor,
    readCurrentSourceAgeMs,
    isSourceCurrent,
    resolveAudioBuffer,
    sourcePan = 0,
    maxVoices = 4,
    maxRememberedCauses = 2048,
    retirementTimeoutMs = 2000,
  } = options ?? {};

  if (typeof verifyMode !== 'boolean') throw new TypeError('verifyMode must be explicit');
  if (typeof AudioContextCtor !== 'function') throw new TypeError('AudioContextCtor is required');
  if (typeof readCurrentSourceAgeMs !== 'function') throw new TypeError('readCurrentSourceAgeMs is required');
  if (typeof isSourceCurrent !== 'function') throw new TypeError('isSourceCurrent is required');
  if (typeof resolveAudioBuffer !== 'function') throw new TypeError('resolveAudioBuffer is required');
  if (!Number.isSafeInteger(maxVoices) || maxVoices < 1) throw new RangeError('maxVoices must be a positive safe integer');
  if (!Number.isSafeInteger(maxRememberedCauses) || maxRememberedCauses < 1) throw new RangeError('maxRememberedCauses must be a positive safe integer');
  if (!Number.isFinite(retirementTimeoutMs) || retirementTimeoutMs <= 0) throw new RangeError('retirementTimeoutMs must be finite and positive');
  if (!Number.isFinite(sourcePan) || sourcePan < FLORA_ZERO_AUDIO_SPEC.panMin || sourcePan > FLORA_ZERO_AUDIO_SPEC.panMax) {
    throw new RangeError('sourcePan must be a fixed projected value in [-0.7, 0.7]');
  }

  let context = null;
  let disposed = false;
  let muted = false;
  let retirementPromise = null;
  let serial = 0;
  const started = new Set();
  const pending = new Map();
  const voices = new Map();
  const failures = [];
  let contextCreationAttempts = 0;
  let nodeCreationAttempts = 0;

  function receiptIdentity(receipt) {
    if (!receipt || receipt.kind !== 'flora-zero-frame-completed' || receipt.submitted !== true || receipt.completed !== true || receipt.sameDevice !== true) return null;
    if (typeof receipt.sourceId !== 'string' || !receipt.sourceId || typeof receipt.causeId !== 'string' || !receipt.causeId) return null;
    if (!Number.isSafeInteger(receipt.generation) || receipt.generation < 0 || (typeof receipt.frameId !== 'string' && !Number.isSafeInteger(receipt.frameId))) return null;
    if (!Number.isFinite(receipt.startedAtMs) || !Number.isFinite(receipt.durationMs) || receipt.durationMs <= 0 || !Number.isFinite(receipt.elapsedMs) || receipt.elapsedMs < 0 || !Number.isFinite(receipt.completedAtMs)) return null;
    if (receipt.clockKind !== 'producer-e-age' && receipt.clockKind !== 'preview-monotonic-rate1') return null;
    if (typeof receipt.version !== 'string' || !receipt.version || receipt.active !== true || !(receipt.uniformBytes instanceof Uint8Array) || receipt.uniformBytes.byteLength !== 160) return null;
    if (receipt.clockKind === 'producer-e-age' && (!Number.isFinite(receipt.eElapsedMs) || receipt.eElapsedMs < 0)) return null;
    if (receipt.target == null || receipt.encoder == null || receipt.device == null) return null;
    return {
      sourceId: receipt.sourceId,
      causeId: receipt.causeId,
      generation: receipt.generation,
      frameId: receipt.frameId,
      startedAtMs: receipt.startedAtMs,
      durationMs: receipt.durationMs,
      clockKind: receipt.clockKind,
      elapsedMs: receipt.elapsedMs,
      eElapsedMs: receipt.eElapsedMs,
      version: receipt.version,
      active: receipt.active,
      uniformBytes: receipt.uniformBytes,
      completedAtMs: receipt.completedAtMs,
      target: receipt.target,
      encoder: receipt.encoder,
      device: receipt.device,
    };
  }

  function identityKey(identity) {
    return JSON.stringify([identity.sourceId, identity.generation, identity.causeId]);
  }

  function currentAge(identity, receipt) {
    const current = readCurrentSourceAgeMs({
      sourceId: identity.sourceId,
      causeId: identity.causeId,
      generation: identity.generation,
      frameId: identity.frameId,
      clockKind: identity.clockKind,
      receipt,
    });
    if (!current || current.clockKind !== identity.clockKind || !Number.isFinite(current.ageMs) || current.ageMs < 0) throw new Error('current source age is unavailable, invalid, or from a different clock');
    return current.ageMs;
  }

  function checkCurrent(identity, receipt) {
    return !disposed && isSourceCurrent({
      sourceId: identity.sourceId,
      causeId: identity.causeId,
      generation: identity.generation,
      frameId: identity.frameId,
      receipt,
    }) === true;
  }

  async function unlockFromGesture() {
    if (verifyMode) return { unlocked: false, reason: 'verify-mode' };
    if (muted) return { unlocked: false, reason: 'muted' };
    if (disposed) throw new Error('playback host is retired');
    if (!context) {
      contextCreationAttempts++;
      context = new AudioContextCtor();
    }
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') return { unlocked: false, reason: 'context-not-running' };
    return { unlocked: true, state: context.state };
  }

  function settleVoice(voice, reason) {
    if (voice.settled) return;
    voice.settled = true;
    const cleanupErrors = [];
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch (error) { cleanupErrors.push(String(error)); }
    }
    voices.delete(voice.id);
    if (cleanupErrors.length) {
      failures.push(...cleanupErrors.map(message => ({ phase: 'voice-disconnect', voiceId: voice.id, message })));
      voice.resolve({ ended: true, reason, voiceId: voice.id, causeId: voice.causeId, cleanupErrors });
    } else {
      voice.resolve({ ended: true, reason, voiceId: voice.id, causeId: voice.causeId });
    }
  }

  async function playCompletedFrame(receipt) {
    if (verifyMode) return { status: 'suppressed-verify' };
    if (disposed) return { status: 'retired' };
    if (muted) return { status: 'suppressed-muted' };
    const identity = receiptIdentity(receipt);
    if (!identity || !checkCurrent(identity, receipt)) return { status: 'rejected-proof' };
    const key = identityKey(identity);
    if (started.has(key)) return { status: 'duplicate-start-suppressed' };
    if (started.size >= maxRememberedCauses) return { status: 'dedupe-history-capacity' };
    if (pending.has(key)) return pending.get(key).promise;
    if (!context || context.state !== 'running') return { status: 'context-not-unlocked' };
    if (voices.size >= maxVoices) return { status: 'voice-capacity' };

    const looseNodes = [];
    let nodesHandedOff = false;
    let voice = null;
    const controller = new AbortController();
    const work = (async () => {
      let buffer;
      try {
        buffer = await resolveAudioBuffer(context, { signal: controller.signal, source: identity, receipt });
        if (disposed) return { status: 'retired' };
        if (!checkCurrent(identity, receipt)) return { status: 'stale-after-buffer' };
        if (muted) return { status: 'suppressed-muted' };
        if (!buffer || buffer.numberOfChannels !== 1 || !Number.isFinite(buffer.duration) || buffer.duration <= 0 || !Number.isFinite(buffer.sampleRate) || buffer.sampleRate <= 0 || typeof buffer.getChannelData !== 'function') return { status: 'invalid-audio-buffer' };
        const expectedDurationSeconds = FLORA_ZERO_AUDIO_SPEC.durationMs / 1000;
        if (Math.abs(buffer.duration - expectedDurationSeconds) > 1 / buffer.sampleRate) return { status: 'audio-duration-mismatch' };
        const pcm = buffer.getChannelData(0);
        if (!pcm || pcm.length !== (Math.ceil(buffer.sampleRate * expectedDurationSeconds))) return { status: 'audio-sample-count-mismatch' };
        for (let index = 0; index < pcm.length; index++) {
          if (!Number.isFinite(pcm[index]) || Math.abs(pcm[index]) >= 0.9) return { status: 'audio-sample-out-of-contract' };
        }
        if (context.state !== 'running') return { status: 'context-not-running' };
        const ageMs = currentAge(identity, receipt);
        if (ageMs < Math.max(identity.elapsedMs, identity.eElapsedMs ?? 0)) return { status: 'source-clock-regressed' };
        if (ageMs >= FLORA_ZERO_AUDIO_SPEC.durationMs || ageMs >= buffer.duration * 1000) return { status: 'expired' };
        if (!checkCurrent(identity, receipt)) return { status: 'stale-before-start' };
        if (voices.size >= maxVoices) return { status: 'voice-capacity' };

        if (sourcePan !== 0 && typeof context.createStereoPanner !== 'function') return { status: 'unsupported-pan' };
        const source = context.createBufferSource();
        nodeCreationAttempts++; looseNodes.push(source);
        const gain = context.createGain();
        nodeCreationAttempts++; looseNodes.push(gain);
        const panner = typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
        if (panner) { nodeCreationAttempts++; looseNodes.push(panner); }
        source.buffer = buffer;
        gain.gain.setValueAtTime(FLORA_ZERO_AUDIO_SPEC.gain, context.currentTime);
        if (panner) panner.pan.setValueAtTime(sourcePan, context.currentTime);
        source.connect(gain);
        if (panner) { gain.connect(panner); panner.connect(context.destination); }
        else gain.connect(context.destination);

        let resolveEnded;
        const ended = new Promise(resolve => { resolveEnded = resolve; });
        const id = ++serial;
        voice = { id, sourceId: identity.sourceId, causeId: identity.causeId, generation: identity.generation, frameId: identity.frameId, nodes: panner ? [source, gain, panner] : [source, gain], settled: false, resolve: resolveEnded, ended };
        voices.set(id, voice);
        nodesHandedOff = true;
        source.onended = () => settleVoice(voice, 'ended');
        const ageAtStartMs = currentAge(identity, receipt);
        if (ageAtStartMs < Math.max(identity.elapsedMs, identity.eElapsedMs ?? 0)) {
          settleVoice(voice, 'source-clock-regressed');
          return { status: 'source-clock-regressed' };
        }
        if (muted) {
          try { source.stop(); } catch (error) { failures.push({ phase: 'muted-before-start', voiceId: id, message: String(error) }); }
          settleVoice(voice, 'muted-before-start');
          return { status: 'suppressed-muted' };
        }
        if (disposed || context.state !== 'running' || !checkCurrent(identity, receipt) || ageAtStartMs >= FLORA_ZERO_AUDIO_SPEC.durationMs || ageAtStartMs >= buffer.duration * 1000) {
          try { source.stop(); } catch (error) { failures.push({ phase: 'cancel-before-start', voiceId: id, message: String(error) }); }
          settleVoice(voice, 'rejected-before-start');
          return { status: 'stale-before-start' };
        }
        const offsetSeconds = ageAtStartMs / 1000;
        const remainingSeconds = Math.min((FLORA_ZERO_AUDIO_SPEC.durationMs - ageAtStartMs) / 1000, buffer.duration - offsetSeconds);
        if (!(remainingSeconds > 0)) {
          settleVoice(voice, 'expired-before-start');
          return { status: 'expired' };
        }
        try {
          source.start(context.currentTime, offsetSeconds, remainingSeconds);
        } catch (error) {
          settleVoice(voice, 'start-error');
          throw error;
        }
        started.add(key);
        return { status: 'started', voiceId: id, causeId: identity.causeId, generation: identity.generation, frameId: identity.frameId, ageAtStartMs, offsetSeconds, remainingSeconds, ended };
      } catch (error) {
        if (voice && !voice.settled) {
          try { voice.nodes[0].stop(); } catch (stopError) { failures.push({ phase: 'schedule-stop', voiceId: voice.id, message: String(stopError) }); }
          settleVoice(voice, 'schedule-error');
        }
        if (!nodesHandedOff) {
          for (const node of looseNodes) { try { node.disconnect(); } catch (cleanupError) { failures.push({ phase: 'partial-node-disconnect', causeId: identity.causeId, message: String(cleanupError) }); } }
        }
        failures.push({ phase: 'schedule', causeId: identity.causeId, message: String(error) });
        throw error;
      }
    })();
    pending.set(key, { promise: work, controller });
    try { return await work; }
    finally { if (pending.get(key)?.promise === work) pending.delete(key); }
  }

  async function stopVoices(predicate, reason) {
    const selected = [...voices.values()].filter(predicate);
    const errors = [];
    for (const voice of selected) {
      try { voice.nodes[0].stop(); } catch (error) { errors.push({ phase: 'voice-stop', voiceId: voice.id, message: String(error) }); }
    }
    if (selected.length) {
      let timeout;
      const result = await Promise.race([
        Promise.allSettled(selected.map(voice => voice.ended)).then(() => 'settled'),
        new Promise(resolve => { timeout = setTimeout(() => resolve('timeout'), retirementTimeoutMs); }),
      ]);
      clearTimeout(timeout);
      if (result === 'timeout') errors.push({ phase: 'voice-stop-timeout', remaining: selected.filter(voice => !voice.settled).length });
    }
    failures.push(...errors);
    return { requested: selected.length, remaining: selected.filter(voice => !voice.settled).length, reason, errors };
  }

  async function stopSource(identity) {
    if (!identity || typeof identity.sourceId !== 'string' || !identity.sourceId || typeof identity.causeId !== 'string' || !identity.causeId || !Number.isSafeInteger(identity.generation) || identity.generation < 0) {
      throw new TypeError('stopSource requires exact sourceId, causeId, and generation identity');
    }
    return stopVoices(voice => voice.sourceId === identity.sourceId && voice.causeId === identity.causeId && voice.generation === identity.generation, identity.reason ?? 'source-stopped');
  }

  async function setMuted(nextMuted) {
    if (typeof nextMuted !== 'boolean') throw new TypeError('muted state must be explicit');
    muted = nextMuted;
    return muted ? stopVoices(() => true, 'muted') : { requested: 0, remaining: voices.size, errors: [] };
  }

  async function retire() {
    if (retirementPromise) return retirementPromise;
    disposed = true;
    retirementPromise = (async () => {
      const errors = [];
      const inFlight = [...pending.values()];
      for (const item of inFlight) item.controller.abort();
      if (inFlight.length) {
        let timeout;
        const pendingResult = await Promise.race([
          Promise.allSettled(inFlight.map(item => item.promise)).then(() => 'settled'),
          new Promise(resolve => { timeout = setTimeout(() => resolve('timeout'), retirementTimeoutMs); }),
        ]);
        clearTimeout(timeout);
        if (pendingResult === 'timeout') errors.push({ phase: 'pending-audio-preparation-timeout', remaining: pending.size });
      }
      for (const voice of voices.values()) {
        try { voice.nodes[0].stop(); } catch (error) { errors.push({ phase: 'voice-stop', voiceId: voice.id, message: String(error) }); }
      }
      if (context) {
        try { await context.close(); } catch (error) { errors.push({ phase: 'context-close', message: String(error) }); }
      }
      const voiceSettlements = [...voices.values()].map(voice => voice.ended);
      if (voiceSettlements.length) {
        let timeout;
        const result = await Promise.race([
          Promise.allSettled(voiceSettlements).then(() => 'settled'),
          new Promise(resolve => { timeout = setTimeout(() => resolve('timeout'), retirementTimeoutMs); }),
        ]);
        clearTimeout(timeout);
        if (result === 'timeout') errors.push({ phase: 'voice-ended-timeout', remaining: voices.size });
      }
      errors.push(...failures);
      return {
        disposed: true,
        contextState: context?.state ?? 'absent',
        contextCloseCalled: Boolean(context),
        voicesRemaining: voices.size,
        pendingCount: pending.size,
        nodeCreationAttempts,
        contextCreationAttempts,
        errors,
        settled: errors.length === 0 && voices.size === 0 && (!context || context.state === 'closed'),
      };
    })();
    return retirementPromise;
  }

  return Object.freeze({
    unlockFromGesture,
    playCompletedFrame,
    setMuted,
    stopSource,
    stopCause: causeId => stopVoices(voice => voice.causeId === causeId, 'cause-stopped'),
    retire,
    snapshot: () => Object.freeze({
      verifyMode,
      disposed,
      muted,
      contextState: context?.state ?? 'absent',
      contextCreationAttempts,
      nodeCreationAttempts,
      startedCauseCount: started.size,
      pendingCount: pending.size,
      voicesRemaining: voices.size,
      errors: failures.length,
    }),
  });
}





