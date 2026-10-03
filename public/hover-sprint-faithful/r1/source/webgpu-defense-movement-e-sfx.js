(function (root) {
  'use strict';

  // One-shot, event-owned plans. Sound rendering stays in the app's audio owner.
  // action-dodge is intentionally shared with detectGameSounds' dodge-state edge.
  const PROFILES = Object.freeze({
    'preparation-barrier-hit:durability-hit': ['barrier-hit', [
      ['sine', 118, 72, .075, 0, 150, 'barrier-low-contact'],
      ['triangle', 354, 236, .035, 8, 118, 'barrier-body'],
      ['noise', 520, 290, .014, 0, 42, 'brief-shell-friction']]],
    'preparation-barrier-hit:durability-broken': ['barrier-break', [
      ['sine', 146, 54, .10, 0, 205, 'barrier-low-collapse'],
      ['triangle', 438, 174, .046, 12, 150, 'barrier-body-release'],
      ['noise', 620, 330, .018, 4, 58, 'brief-fracture-air']]],
    'action-stand:durability-created': ['barrier-activate', [
      ['sine', 92, 138, .075, 0, 190, 'barrier-low-rise'],
      ['triangle', 276, 414, .042, 24, 165, 'barrier-formant'],
      ['sine', 552, 414, .018, 54, 95, 'barrier-latch']]],
    'action-push:timed-bust-start': ['bust-activate', [
      ['sine', 84, 126, .085, 0, 190, 'bust-low-rise'],
      ['triangle', 252, 378, .045, 20, 158, 'bust-body'],
      ['noise', 460, 250, .012, 8, 46, 'short-pressure-air']]],
    'action-push:timed-bust-break': ['bust-break', [
      ['sine', 126, 48, .10, 0, 210, 'bust-low-break'],
      ['triangle', 315, 126, .05, 10, 155, 'bust-body-collapse'],
      ['noise', 560, 300, .017, 0, 54, 'brief-impact-air']]],
    'hover-sprint-active:auto-unsupported': ['hover-sprint', [
      ['sine', 104, 156, .060, 0, 190, 'hover-low-lift'],
      ['triangle', 312, 468, .035, 25, 160, 'hover-air-body'],
      ['sine', 624, 468, .014, 55, 85, 'hover-latch']]],
    'action-renki:': ['renki-start', [
      ['sine', 98, 147, .055, 0, 205, 'renki-low-focus'],
      ['triangle', 294, 441, .03, 35, 170, 'renki-focus-body']]],
    'action-renki:tenfold': ['renki-tenfold', [
      ['sine', 73, 110, .075, 0, 245, 'tenfold-low-focus'],
      ['triangle', 220, 330, .04, 32, 195, 'tenfold-focus-body'],
      ['sine', 440, 550, .019, 80, 105, 'tenfold-release-partial']]]
  });
  const SHARED = Object.freeze({ 'action-dodge': 'dodge-state-edge' });
  const REJECTED = Object.freeze({
    'action-renki:desire-recovery': 'desire-recovery-has-no-e',
    'action-renki:desire-recovery-start': 'desire-recovery-has-no-e'
  });

  function createLedger({ maxLateMs = 180, maxEntries = 2048, retentionMs = 30000 } = {}) {
    if (!Number.isFinite(maxLateMs) || maxLateMs < 0 || !Number.isInteger(maxEntries) || maxEntries < 16 ||
        !Number.isFinite(retentionMs) || retentionMs < maxLateMs)
      throw new TypeError('Invalid defense/movement E SFX ledger limits');
    let roomKey = '';
    const consumed = new Map();
    let watermark = 0;
    function prune(nowMs) {
      watermark = Math.max(watermark, nowMs);
      for (const [id, expiresAt] of consumed) if (expiresAt <= nowMs) consumed.delete(id);
    }
    function consume(id, nowMs, eventAtMs) {
      if (consumed.has(id)) return false;
      if (consumed.size >= maxEntries) return false;
      consumed.set(id, Math.max(nowMs, eventAtMs + maxLateMs) + retentionMs);
      return true;
    }
    function enterRoom(roomId, roomGeneration) {
      if (typeof roomId !== 'string' || !roomId || !Number.isInteger(roomGeneration) || roomGeneration < 0)
        throw new TypeError('Defense/movement E SFX needs room ID and generation');
      const next = `${roomId}:${roomGeneration}`;
      if (next !== roomKey) { roomKey = next; consumed.clear(); watermark = 0; }
    }
    function admit(event, { audible = true, reducedMotion = false } = {}) {
      if (!event || typeof event.eventId !== 'string' || !event.eventId ||
          typeof event.type !== 'string' || !event.type || typeof event.variant !== 'string' ||
          typeof event.roomId !== 'string' || !event.roomId || !Number.isInteger(event.roomGeneration) ||
          event.roomGeneration < 0 || !Number.isFinite(event.eventAtMs) || event.eventAtMs < 0 ||
          !Number.isFinite(event.nowMs) || event.nowMs < 0)
        throw new TypeError('Defense/movement E SFX requires event identity, variant, room generation and time');
      enterRoom(event.roomId, event.roomGeneration);
      prune(event.nowMs);
      if (watermark - event.eventAtMs > retentionMs) return null;
      if (consumed.has(event.eventId)) return null;
      if (!consume(event.eventId, event.nowMs, event.eventAtMs)) return null; // bounded exact-once admission.
      const key = `${event.type}:${event.variant}`;
      if (SHARED[event.type]) return Object.freeze({ suppressed: true, reason: 'shared-existing-sfx',
        sharedSfxKind: SHARED[event.type], eventId: event.eventId, type: event.type,
        variant: event.variant, roomId: event.roomId, roomGeneration: event.roomGeneration });
      if (REJECTED[key]) return Object.freeze({ suppressed: true, reason: REJECTED[key],
        eventId: event.eventId, type: event.type, variant: event.variant,
        roomId: event.roomId, roomGeneration: event.roomGeneration });
      const profile = PROFILES[key];
      if (!profile) throw new TypeError(`Unsupported defense/movement E SFX event: ${key}`);
      if (!audible || event.nowMs > event.eventAtMs + maxLateMs) return null;
      const scale = reducedMotion ? .72 : 1;
      const layers = profile[1].map(([shape, frequencyHz, endFrequencyHz, amplitude, offsetMs, durationMs, layer]) => {
        const offset = Math.round(offsetMs * scale), duration = Math.max(28, Math.round(durationMs * scale));
        return Object.freeze({ shape, frequencyHz, endFrequencyHz, amplitude, layer,
          offsetMs: offset, durationMs: duration, startAtMs: event.eventAtMs + offset,
          endAtMs: event.eventAtMs + offset + duration });
      });
      const endsAtMs = Math.max(...layers.map(layer => layer.endAtMs));
      return Object.freeze({ family: 'defense-movement', cue: profile[0], eventId: event.eventId,
        type: event.type, variant: event.variant, roomId: event.roomId,
        roomGeneration: event.roomGeneration, startsAtMs: event.eventAtMs, endsAtMs,
        layers: Object.freeze(layers), completionReceipt: Object.freeze({ eventId: event.eventId,
          roomId: event.roomId, roomGeneration: event.roomGeneration, endsAtMs }) });
    }
    return Object.freeze({ admit, enterRoom, has: id => consumed.has(id), size: () => consumed.size });
  }
  const api = Object.freeze({ PROFILES, SHARED, REJECTED, createLedger });
  root.DvaWebGPUDefenseMovementESfx = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
