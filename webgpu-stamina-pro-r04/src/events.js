import { CONTRACT as C } from './contract.js';
import { normalizedPhase } from './sampler.js';

const finite = x => typeof x === 'number' && Number.isFinite(x);
export function normalizeGain(input) {
  if (!input || input.type !== 'gain-stamina') return { error: 'wrong_type' };
  if (input.authoritative !== true) return { error: 'not_authoritative' };
  if (input.kind !== 'discrete' || input.naturalTick === true) return { error: 'not_discrete_gain' };
  if (!finite(input.gain) || input.gain <= 0) return { error: 'non_positive_gain' };
  if (typeof input.playerId !== 'string' || !input.playerId.trim()) return { error: 'invalid_player' };
  if (!finite(input.startedAt)) return { error: 'invalid_startedAt' };
  if (input.duration !== undefined && input.durationMs !== undefined && input.duration !== input.durationMs) return { error: 'ambiguous_duration' };
  const requested = input.duration ?? input.durationMs ?? C.defaultDurationMs;
  const radius = input.radius ?? C.referenceRadius;
  if (!finite(requested) || requested <= 0) return { error: 'invalid_duration' };
  if (!finite(radius) || radius <= 0 || radius > 1024) return { error: 'invalid_radius' };
  if (input.sourceToken !== undefined && typeof input.sourceToken !== 'string') return { error: 'invalid_source_token' };
  if (input.eventId !== undefined && (typeof input.eventId !== 'string' || !input.eventId.trim())) return { error: 'invalid_event_id' };
  const duration = Math.max(C.minimumDurationMs, requested);
  const key = input.eventId ? JSON.stringify([input.playerId, 'id', input.eventId]) : JSON.stringify([input.playerId, 'fallback', input.startedAt, input.sourceToken ?? '']);
  return { value: Object.freeze({ type: input.type, authoritative: true, kind: 'discrete',
    playerId: input.playerId, startedAt: input.startedAt, duration, radius, gain: input.gain,
    eventId: input.eventId ?? null, sourceToken: input.sourceToken ?? null, key }) };
}

/** Presentation ledger. The trusted game bridge, not this class, authenticates authority. */
export class StaminaEvents {
  constructor({ onStart = () => {}, onUpdate = () => {}, onStop = () => {}, limit = C.maxActiveEvents } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > C.maxActiveEvents) throw new RangeError('invalid event limit');
    this.limit = limit; this.hooks = { onStart, onUpdate, onStop };
    this.actors = new Map(); this.events = new Map(); this.seen = new Set(); this.history = [];
    this.stats = { accepted: 0, rejected: 0, duplicate: 0, starts: 0, stops: 0, updates: 0 };
  }
  log(type, details) { this.history.push({ type, ...details }); if (this.history.length > 256) this.history.shift(); }
  setActor(input) {
    if (!input || typeof input.playerId !== 'string' || !finite(input.nowMs)) throw new TypeError('actor playerId and finite nowMs required');
    const prev = this.actors.get(input.playerId);
    if (prev && input.nowMs < prev.nowMs - 1e-5) this.cancelPlayer(input.playerId, 'clock_rewind');
    const actor = { alive: true, present: true, visible: true, rate: 1, position: [0, 0, 0], ...prev, ...input };
    if (['alive','present','visible'].some(k=>typeof actor[k]!=='boolean')) throw new TypeError('actor flags must be boolean');
    if (!finite(actor.rate) || actor.rate < 0 || actor.rate > 16) throw new RangeError('actor rate must be 0..16');
    if (!Array.isArray(actor.position) || actor.position.length !== 3 || !actor.position.every(finite)) throw new TypeError('position must be three finite numbers');
    this.actors.set(actor.playerId, actor);
    const reason = !actor.present ? 'exited' : !actor.alive ? 'death' : !actor.visible ? 'invisible' : null;
    if (reason) this.cancelPlayer(actor.playerId, reason);
    return actor;
  }
  ingest(input) {
    const normalized = normalizeGain(input);
    if (normalized.error) return this.reject(normalized.error);
    const event = normalized.value;
    if (this.seen.has(event.key)) { this.stats.duplicate++; return { accepted: false, reason: 'duplicate', key: event.key }; }
    if (this.seen.size >= C.maxSeenEvents) return this.reject('session_ledger_full');
    const actor = this.actors.get(event.playerId);
    if (!actor) return this.reject('unknown_actor');
    // Tombstone a well-formed authoritative gain even if no longer observable.
    this.seen.add(event.key);
    if (!actor.present || !actor.alive || !actor.visible) return this.reject('actor_unavailable');
    if (actor.nowMs >= event.startedAt + event.duration) return this.reject('stale');
    if (this.events.size >= this.limit) return this.reject('capacity');
    const occupied = new Set([...this.events.values()].filter(e=>e.event.playerId===event.playerId).map(e=>e.lane));
    let lane = 0; while (occupied.has(lane)) lane++;
    this.events.set(event.key, { event, started: false, lane }); this.stats.accepted++;
    this.log('accepted', { key: event.key, playerId: event.playerId });
    return { accepted: true, key: event.key, event };
  }
  reject(reason) { this.stats.rejected++; return { accepted: false, reason }; }
  update() {
    for (const [key, entry] of this.events) {
      const actor = this.actors.get(entry.event.playerId);
      if (!actor || !actor.present || !actor.alive || !actor.visible) { this.stop(key, 'actor_unavailable'); continue; }
      const p = normalizedPhase(entry.event, actor.nowMs);
      if (p >= 1) { this.stop(key, 'expired'); continue; }
      if (p < 0) continue;
      if (!entry.started) { entry.started = true; this.stats.starts++; this.hooks.onStart(entry.event, actor, p); this.log('start', { key, p }); }
      this.stats.updates++; this.hooks.onUpdate(entry.event, actor, p);
    }
  }
  active() {
    return [...this.events.values()].filter(e => e.started).map(e => ({ event: e.event, lane: e.lane, actor: this.actors.get(e.event.playerId), phase: normalizedPhase(e.event, this.actors.get(e.event.playerId).nowMs) }));
  }
  stop(key, reason = 'cancelled') {
    const entry = this.events.get(key); if (!entry) return false;
    this.events.delete(key); if (entry.started) { this.stats.stops++; this.hooks.onStop(entry.event, reason); }
    this.log('stop', { key, reason }); return true;
  }
  cancelPlayer(playerId, reason = 'cancelled') { for (const [key, e] of this.events) if (e.event.playerId === playerId) this.stop(key, reason); }
  resetSession() { for (const key of [...this.events.keys()]) this.stop(key, 'session_reset'); this.seen.clear(); this.actors.clear(); this.log('session_reset', {}); }
}
