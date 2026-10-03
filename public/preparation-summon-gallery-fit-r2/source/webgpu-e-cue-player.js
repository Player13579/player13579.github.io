(function (root) {
  'use strict';

  // Adapter for the game's already-unlocked AudioContext/master gain. It never
  // constructs/resumes an AudioContext: event audio is dropped when unavailable.
  const SHAPES = new Set(['sine', 'triangle']);
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

  function createPlayer({ getContext, getMaster, isMuted = () => false,
    // Retained for caller compatibility; verification metadata never mutes.
    isVerify = () => false, maxVolume = 0.22, maxLateMs = 180,
    maxLayers = 8, maxLayerMs = 700, maxEntries = 2048,
    retentionMs = 30000 } = {}) {
    if (typeof getContext !== 'function' || typeof getMaster !== 'function')
      throw new TypeError('E cue player requires existing context/master getters');
    if (!Number.isFinite(maxVolume) || maxVolume < 0 || maxVolume > 0.35 ||
        !Number.isFinite(maxLateMs) || maxLateMs < 0 || !Number.isInteger(maxEntries) || maxEntries < 16 ||
        !Number.isFinite(retentionMs) || retentionMs < maxLateMs)
      throw new TypeError('Invalid E cue player limits');
    let roomKey = '';
    let monitoredContext = null, contextStateHandler = null;
    const consumed = new Map(), voices = new Set(), actorVoices = new Map();
    let watermark = 0;

    function prune(nowMs) {
      watermark = Math.max(watermark, nowMs);
      for (const [id, expiresAt] of consumed) if (expiresAt <= nowMs) consumed.delete(id);
    }
    function consume(id, nowMs, expiresFrom = nowMs) {
      if (consumed.has(id)) return false;
      if (consumed.size >= maxEntries) return false;
      consumed.set(id, Math.max(nowMs, expiresFrom) + retentionMs);
      return true;
    }

    function stopAll() {
      for (const voice of [...voices]) voice.stop();
      actorVoices.clear();
    }
    function enterRoom(roomId, roomGeneration) {
      if (typeof roomId !== 'string' || !roomId || !Number.isInteger(roomGeneration) || roomGeneration < 0)
        throw new TypeError('E cue player needs room ID and generation');
      const next = `${roomId}:${roomGeneration}`;
      if (roomKey !== next) { stopAll(); consumed.clear(); watermark = 0; roomKey = next; }
    }
    function play(cue, { nowMs, muted = false, verify = false, volume = 1,
      actorRate = null } = {}) {
      // `verify` remains accepted for compatibility and is intentionally ignored.
      if (!cue || typeof cue.eventId !== 'string' || !cue.eventId ||
          typeof cue.roomId !== 'string' || !cue.roomId || !Number.isInteger(cue.roomGeneration) ||
          cue.roomGeneration < 0 || !Number.isFinite(cue.startsAtMs) ||
          !Number.isFinite(cue.endsAtMs) || !Array.isArray(cue.layers) ||
          !Number.isFinite(nowMs) || !Number.isFinite(volume) ||
          (actorRate != null && (!Number.isFinite(actorRate) || actorRate < 0 || actorRate > 12)))
        throw new TypeError('E cue player requires a finite cue, event identity, room generation and nowMs');
      enterRoom(cue.roomId, cue.roomGeneration);
      const id = cue.eventId;
      prune(nowMs);
      if (consumed.has(id)) return null;
      if (watermark > cue.startsAtMs + maxLateMs) {
        consume(id, nowMs);
        return receipt(cue, 'suppressed', 0, 'policy-or-late');
      }
      if (!consume(id, nowMs, Math.max(cue.endsAtMs, cue.startsAtMs + maxLateMs)))
        return receipt(cue, 'suppressed', 0, 'receipt-capacity');
      // Gating/device loss consumes, never queues for a later unlock/resume.
      if (cue.layers.length < 1 || cue.layers.length > maxLayers ||
          nowMs > cue.startsAtMs + maxLateMs || volume <= 0 || maxVolume <= 0 ||
          muted || isMuted())
        return receipt(cue, 'suppressed', 0, 'policy-or-late');

      const context = getContext(), master = getMaster();
      if (!context || !master || context.state !== 'running' ||
          !(Number(master.gain?.value) > 0)) return receipt(cue, 'suppressed', 0, 'audio-unavailable');
      monitorContext(context);

      if (actorRate != null) {
        try {
          if (cue.layers.some(layer => !validLayer(layer, maxLayerMs)))
            throw new TypeError('Invalid finite E cue layer');
          const buffer = synthesizeActorCue(context, cue,
            Math.max(0, cue.startsAtMs - nowMs));
          const source = context.createBufferSource(), gain = context.createGain();
          source.buffer = buffer;
          source.playbackRate.setValueAtTime(actorRate, context.currentTime);
          gain.gain.value = clamp(volume, 0, 1) * (maxVolume / 0.22);
          source.connect(gain); gain.connect(master);
          const voice = createVoice(source, [source, gain], context, voices,
            () => actorVoices.delete(id));
          actorVoices.set(id, { source, voice, context });
          source.start(context.currentTime,
            clamp((nowMs - cue.startsAtMs) * actorRate / 1000,
              0, buffer.duration - 1 / buffer.sampleRate));
          return receipt(cue, 'scheduled', cue.layers.length, '');
        } catch (error) {
          actorVoices.get(id)?.voice.stop();
          return receipt(cue, 'failed', 0, String(error?.message || error));
        }
      }

      const scheduled = [];
      try {
        for (const layer of cue.layers) {
          if (!validLayer(layer, maxLayerMs)) throw new TypeError('Invalid finite E cue layer');
          const delayMs = layer.startAtMs == null
            ? layer.offsetMs
            : layer.startAtMs - cue.startsAtMs;
          const durationMs = layer.durationMs;
          const start = context.currentTime + Math.max(0, delayMs - (nowMs - cue.startsAtMs)) / 1000;
          const stop = start + durationMs / 1000;
          const source = layer.shape === 'noise'
            ? createNoise(context, layer, durationMs)
            : context.createOscillator();
          const gain = context.createGain();
          const nodes = [source, gain];
          if (layer.shape !== 'noise') {
            source.type = layer.shape;
            source.frequency.setValueAtTime(clamp(layer.frequencyHz, 20, 12000), start);
            source.frequency.linearRampToValueAtTime(clamp(layer.endFrequencyHz, 20, 12000), stop);
          } else {
            const filter = createBandFilter(context, layer, start, stop);
            source.connect(filter); filter.connect(gain); nodes.push(filter);
          }
          const amplitude = Math.min(0.16, layer.amplitude) * clamp(volume, 0, 1) * (maxVolume / 0.22);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(Math.max(0.0002, amplitude), start + Math.min(0.008, durationMs / 3000));
          gain.gain.exponentialRampToValueAtTime(0.0001, stop);
          if (layer.shape !== 'noise') source.connect(gain);
          gain.connect(master);
          const voice = createVoice(source, nodes, context, voices);
          scheduled.push(voice);
          source.start(start);
          source.stop(stop + 0.012);
        }
      } catch (error) {
        for (const voice of scheduled) voice.stop();
        return receipt(cue, 'failed', 0, String(error?.message || error));
      }
      return receipt(cue, 'scheduled', scheduled.length, '');
    }
    function validLayer(layer, maxDuration) {
      return layer && (SHAPES.has(layer.shape) || layer.shape === 'noise') &&
        Number.isFinite(layer.frequencyHz) && layer.frequencyHz > 0 && layer.frequencyHz <= 12000 &&
        Number.isFinite(layer.endFrequencyHz) && layer.endFrequencyHz > 0 && layer.endFrequencyHz <= 12000 &&
        Number.isFinite(layer.amplitude) && layer.amplitude > 0 && layer.amplitude <= 0.16 &&
        Number.isFinite(layer.offsetMs) && layer.offsetMs >= 0 &&
        Number.isFinite(layer.durationMs) && layer.durationMs > 0 && layer.durationMs <= maxDuration &&
        (layer.startAtMs == null || Number.isFinite(layer.startAtMs));
    }
    function receipt(cue, status, layerCount, reason) {
      return Object.freeze({ eventId: cue.eventId, roomId: cue.roomId,
        roomGeneration: cue.roomGeneration, status, layerCount, reason,
        endsAtMs: cue.endsAtMs });
    }
    function monitorContext(context) {
      if (monitoredContext === context || typeof context.addEventListener !== 'function') return;
      if (monitoredContext && contextStateHandler)
        monitoredContext.removeEventListener?.('statechange', contextStateHandler);
      monitoredContext = context;
      contextStateHandler = () => { if (context.state !== 'running') stopAll(); };
      context.addEventListener('statechange', contextStateHandler);
    }
    function setEventRate(eventId, rate) {
      if (!Number.isFinite(rate) || rate < 0 || rate > 12) return false;
      const entry = actorVoices.get(eventId);
      if (!entry) return false;
      entry.source.playbackRate.setValueAtTime(rate, entry.context.currentTime);
      return true;
    }
    function stopEvent(eventId) {
      const entry = actorVoices.get(eventId);
      if (!entry) return false;
      entry.voice.stop();
      return true;
    }
    return Object.freeze({ play, enterRoom, stopAll, setEventRate, stopEvent,
      has: id => consumed.has(id), size: () => consumed.size });
  }

  // Actor-owned one-shots are rendered to one finite buffer so a mid-cast
  // ACC switch changes the complete cue clock without re-triggering layers.
  function synthesizeActorCue(context, cue, preDelayMs = 0) {
    const rate = Math.max(8000, Math.min(48000, Number(context.sampleRate) || 44100));
    const ranges = cue.layers.map(layer => {
      const start = (layer.startAtMs == null ? layer.offsetMs :
        layer.startAtMs - cue.startsAtMs) / 1000;
      return { layer, start: Math.max(0, start + preDelayMs / 1000),
        duration: layer.durationMs / 1000 };
    });
    const end = Math.max(...ranges.map(item => item.start + item.duration));
    if (!(end > 0 && end <= 8)) throw new RangeError('Actor cue duration out of range');
    const buffer = context.createBuffer(1, Math.ceil((end + .015) * rate), rate);
    const output = buffer.getChannelData(0);
    for (const { layer, start, duration } of ranges) {
      let phase = 0, seed = (Math.round(layer.frequencyHz * 1000) ^
        Math.round(layer.endFrequencyHz * 100) ^ Math.ceil(duration * rate)) >>> 0;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      const begin = Math.floor(start * rate), count = Math.ceil(duration * rate);
      for (let i = 0; i < count && begin + i < output.length; i += 1) {
        const u = i / Math.max(1, count - 1);
        const frequency = clamp(layer.frequencyHz +
          (layer.endFrequencyHz - layer.frequencyHz) * u, 20, 12000);
        const age = i / rate;
        const attack = Math.min(1, age / Math.min(.008, duration / 3));
        const envelope = attack * Math.pow(.000625,
          Math.max(0, age - Math.min(.008, duration / 3)) /
          Math.max(.001, duration - Math.min(.008, duration / 3)));
        let sample;
        if (layer.shape === 'noise') {
          seed = (1664525 * seed + 1013904223) >>> 0;
          const white = ((seed / 4294967296) * 2 - 1) * .65;
          const omega = 2 * Math.PI * clamp(frequency, 80, rate * .45) / rate;
          const alpha = Math.sin(omega) / 1.6;
          const norm = 1 + alpha;
          sample = (alpha * white - alpha * x2 +
            2 * Math.cos(omega) * y1 - (1 - alpha) * y2) / norm;
          x2 = x1; x1 = white; y2 = y1; y1 = sample;
        } else {
          phase += 2 * Math.PI * frequency / rate;
          sample = layer.shape === 'triangle'
            ? 2 / Math.PI * Math.asin(Math.sin(phase)) : Math.sin(phase);
        }
        output[begin + i] += sample * layer.amplitude * envelope;
      }
    }
    for (let i = 0; i < output.length; i += 1)
      output[i] = clamp(output[i], -.7, .7);
    return buffer;
  }

  function createNoise(context, layer, durationMs) {
    const rate = Math.max(8000, Math.min(48000, Number(context.sampleRate) || 44100));
    const length = Math.max(1, Math.min(Math.ceil(rate * 0.7), Math.ceil(rate * durationMs / 1000)));
    const buffer = context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    // Deterministic bounded white noise; source itself is explicitly non-looping.
    let seed = (Math.round(layer.frequencyHz * 1000) ^ Math.round(layer.endFrequencyHz * 100) ^ length) >>> 0;
    for (let i = 0; i < data.length; i += 1) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      data[i] = ((seed / 4294967296) * 2 - 1) * 0.65;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    return source;
  }

  function createBandFilter(context, layer, start, stop) {
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(0.8, start);
    filter.frequency.setValueAtTime(clamp(layer.frequencyHz, 80, 8000), start);
    filter.frequency.linearRampToValueAtTime(clamp(layer.endFrequencyHz, 80, 8000), stop);
    return filter;
  }

  function createVoice(source, nodes, context, voices, onDone = null) {
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      voices.delete(voice);
      onDone?.();
      for (const node of nodes) { try { node.disconnect(); } catch (_) {} }
      source.onended = null;
    };
    const voice = { stop() {
      if (done) return;
      try { source.stop(context.currentTime); } catch (_) {}
      cleanup();
    } };
    source.onended = cleanup;
    voices.add(voice);
    return voice;
  }

  const api = Object.freeze({ createPlayer });
  root.DvaWebGPUECuePlayer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
