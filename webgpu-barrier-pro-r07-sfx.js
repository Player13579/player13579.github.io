/* ChatGPT Pro Barrier r0.7 game SFX adapter.
 * Uses only the package's authored WAV files and the game's shared WebAudio
 * context/master output. The caller owns receipt authority, visibility,
 * verification mode, mute state, and user-gesture/autoplay policy.
 *
 * const player = DvaWebGPUBarrierProR07Sfx.createPlayer({ context, destination });
 * player.play(receipts, { verify, muted, volume, pan });
 * A receipt is { roomId, roomGeneration, eventId, event } where event is one
 * of create/absorb/fracture/bust. Each distinct room/generation/eventId plays
 * at most once for the lifetime of this player.
 */
(function (root) {
  'use strict';

  const FILES = Object.freeze({
    create: 'create.wav',
    absorb: 'absorb.wav',
    fracture: 'fracture.wav',
    bust: 'bust.wav'
  });
  const DEFAULT_BASE_URL = './barrier-pro-r07/sfx/';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function createPlayer({ context, destination, baseUrl = DEFAULT_BASE_URL,
    fetchImpl = root.fetch?.bind(root) } = {}) {
    if (!context || typeof context.decodeAudioData !== 'function' ||
        typeof context.createBufferSource !== 'function' ||
        typeof context.createGain !== 'function')
      throw new TypeError('Barrier r0.7 SFX needs the shared game AudioContext');
    if (!destination) throw new TypeError('Barrier r0.7 SFX needs the shared game output node');
    if (typeof fetchImpl !== 'function') throw new TypeError('Barrier r0.7 SFX needs fetch');

    const decoded = new Map();
    const loading = new Map();
    const played = new Set();
    const inFlight = new Set();
    let destroyed = false;

    async function load(event) {
      if (decoded.has(event)) return decoded.get(event);
      if (loading.has(event)) return loading.get(event);
      const promise = (async () => {
        const response = await fetchImpl(new URL(FILES[event], new URL(baseUrl, root.location?.href || 'http://localhost/')),
          { cache: 'force-cache' });
        if (!response?.ok) throw new Error(`Barrier r0.7 SFX ${FILES[event]}: HTTP ${response?.status ?? 'network error'}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        decoded.set(event, buffer);
        return buffer;
      })();
      loading.set(event, promise);
      try { return await promise; }
      finally { loading.delete(event); }
    }

    async function play(receipts, options = {}) {
      if (destroyed || !Array.isArray(receipts) || options.verify || options.muted ||
          context.state !== 'running' || !destination) return 0;
      const volumeValue = options.volume === undefined ? 1 : Number(options.volume);
      const volume = Number.isFinite(volumeValue) ? clamp(volumeValue, 0, 1) : 0;
      if (volume === 0) return 0;
      const panValue = Number(options.pan);
      const pan = Number.isFinite(panValue) ? clamp(panValue, -1, 1) : 0;
      const accepted = [];
      for (const receipt of receipts) {
        if (!receipt || typeof receipt.roomId !== 'string' || !receipt.roomId ||
            !Number.isSafeInteger(receipt.roomGeneration) || receipt.roomGeneration < 0 ||
            typeof receipt.eventId !== 'string' || !receipt.eventId || !FILES[receipt.event]) continue;
        const key = JSON.stringify([receipt.roomId, receipt.roomGeneration, receipt.eventId]);
        if (played.has(key) || inFlight.has(key) || accepted.some(entry => entry.key === key)) continue;
        accepted.push({ key, event: receipt.event });
      }
      if (!accepted.length) return 0;
      accepted.forEach(entry => inFlight.add(entry.key));
      let buffers;
      try { buffers = await Promise.all(accepted.map(entry => load(entry.event))); }
      catch (error) {
        accepted.forEach(entry => inFlight.delete(entry.key));
        throw error;
      }
      if (destroyed || options.verify || options.muted || context.state !== 'running' ||
          (typeof options.isCurrent === 'function' && !options.isCurrent())) {
        accepted.forEach(entry => inFlight.delete(entry.key));
        return 0;
      }
      let count = 0;
      for (let i = 0; i < accepted.length; i++) {
        const { key } = accepted[i];
        if (played.has(key)) { inFlight.delete(key); continue; }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers[i];
        gain.gain.value = volume;
        source.connect(gain);
        let panner = null;
        if (typeof context.createStereoPanner === 'function') {
          panner = context.createStereoPanner();
          panner.pan.value = pan;
          gain.connect(panner);
          panner.connect(destination);
        } else gain.connect(destination);
        source.onended = () => {
          try { source.disconnect(); } catch (_) {}
          try { gain.disconnect(); } catch (_) {}
          try { panner?.disconnect(); } catch (_) {}
        };
        played.add(key);
        inFlight.delete(key);
        source.start(context.currentTime);
        count++;
      }
      return count;
    }

    return Object.freeze({
      play,
      destroy() { destroyed = true; decoded.clear(); loading.clear(); inFlight.clear(); played.clear(); },
      get playedReceiptCount() { return played.size; }
    });
  }

  const api = Object.freeze({ createPlayer, files: FILES });
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DvaWebGPUBarrierProR07Sfx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
