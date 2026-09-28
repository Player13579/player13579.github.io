// Authority and lifecycle only: no geometry, timers, game mutation or automatic events.
import {CONTRACT,validId,bodyStatus,clockStatus,normalDuration} from './contract.js';
const tuple = (...parts) => JSON.stringify(parts);
export class ManaGainLedger {
  constructor({sessionId, getActorClock, getBeneficiary, audio = null, onDiagnostic = () => {}, maxInstances = 128, maxCauses = 65536}) {
    if (!validId(sessionId) || typeof getActorClock !== 'function' || typeof getBeneficiary !== 'function') throw new TypeError('sessionId and host snapshot functions are required');
    if (![maxInstances,maxCauses].every(n => Number.isInteger(n) && n > 0)) throw new RangeError('positive integer capacities required');
    this.sessionId = sessionId; this.getActorClock = getActorClock; this.getBeneficiary = getBeneficiary; this.audio = audio; this.onDiagnostic = onDiagnostic;
    this.maxInstances = maxInstances; this.maxCauses = maxCauses; this.instances = new Map(); this.causes = new Map(); this.clocks = new Map(); this.closed = false;
    this.stats = {accepted:0,duplicate:0,rejected:0,suppressed:0,expired:0,cancelled:0,audioRequested:0,audioDispatched:0,audioSkipped:0};
  }
  diagnostic(type, detail) { try { this.onDiagnostic({type,...detail}); } catch { /* observer cannot change authority */ } }
  read(fn, id) { try { return fn(id); } catch (e) { this.diagnostic('snapshot-exception',{id,message:String(e)}); return null; } }
  audioCall(name, payload) { try { return this.audio?.[name]?.(payload); } catch (e) { this.diagnostic('audio-exception',{name,message:String(e)}); return false; } }
  reject(reason) { this.stats.rejected++; return {status:'rejected',reason}; }
  clock(id) {
    const c = this.read(this.getActorClock,id);
    if (!clockStatus(c)) return null;
    const last = this.clocks.get(id);
    if (last !== undefined && c.timeMs < last - 1e-6) { this.cancelActor(id,'clock-rewind'); return null; }
    this.clocks.set(id,c.timeMs); return {timeMs:c.timeMs,rate:c.rate};
  }
  commit(e) {
    if (this.closed) return this.reject('disposed');
    if (!e || !['sessionId','eventId','beneficiaryPlayerId','actorPlayerId'].every(k => validId(e[k]))) return this.reject('invalid-id');
    if (e.sessionId !== this.sessionId) return this.reject('wrong-session');
    if (e.committed !== true || !Number.isFinite(e.manaDelta) || e.manaDelta <= 0) return this.reject('not-committed-positive-gain');
    if (e.route === 'desire-refinement') return this.reject('desire-private-route');
    const causeKey = tuple(e.sessionId,e.eventId), existing = this.causes.get(causeKey);
    let duration;
    try { duration = normalDuration(e.durationMs === undefined ? existing?.durationMs : e.durationMs); } catch { return this.reject('invalid-duration'); }
    if (e.radiusPx !== undefined && (!Number.isFinite(e.radiusPx) || e.radiusPx <= 0)) return this.reject('invalid-radius');
    if (e.startedAtActorMs !== undefined && (!Number.isFinite(e.startedAtActorMs) || e.startedAtActorMs < 0)) return this.reject('invalid-start');
    const clock = this.clock(e.actorPlayerId); if (!clock) return this.reject('invalid-clock');
    const start = e.startedAtActorMs ?? existing?.start ?? clock.timeMs;
    if (start > clock.timeMs + 1e-6) return this.reject('future-event');
    if (existing && (existing.actorId !== e.actorPlayerId || existing.durationMs !== duration || Math.abs(existing.start - start) > 1e-6)) return this.reject('cause-conflict');
    if (existing?.consumed.has(e.beneficiaryPlayerId)) { this.stats.duplicate++; return {status:'duplicate'}; }
    if (!existing && this.causes.size >= this.maxCauses) return this.reject('dedupe-capacity');
    const cause = existing ?? {id:causeKey, actorId:e.actorPlayerId, durationMs:duration, start, consumed:new Set(), members:new Set(), audioAttempted:false, audioActive:false};
    if (!existing) this.causes.set(causeKey,cause);
    cause.consumed.add(e.beneficiaryPlayerId); // includes hidden, expired and capacity-suppressed recipients
    const body = this.read(this.getBeneficiary,e.beneficiaryPlayerId), ageMs = clock.timeMs - start;
    const reason = bodyStatus(body) || (ageMs >= duration ? 'already-expired' : null) || (this.instances.size >= this.maxInstances ? 'instance-capacity' : null);
    if (reason) { this.stats.suppressed++; return {status:'suppressed',reason}; }
    const key = tuple(e.sessionId,e.eventId,e.beneficiaryPlayerId);
    this.instances.set(key,{key,causeId:causeKey,eventId:e.eventId,beneficiaryPlayerId:e.beneficiaryPlayerId,actorPlayerId:e.actorPlayerId,startActorMs:start,durationMs:duration,ageMs,rate:clock.rate,radiusPx:e.radiusPx ?? CONTRACT.radiusPx,manaDelta:e.manaDelta,body:structuredClone(body)});
    cause.members.add(key); this.stats.accepted++;
    if (!cause.audioAttempted) {
      cause.audioAttempted = true; this.stats.audioRequested++;
      cause.audioActive = this.audioCall('start',{id:causeKey,ageMs,durationMs:duration,rate:clock.rate}) === true;
      this.stats[cause.audioActive ? 'audioDispatched' : 'audioSkipped']++;
    }
    return {status:'accepted',key,durationMs:duration,clamped:e.durationMs !== undefined && e.durationMs < CONTRACT.minimumMs};
  }
  remove(key, reason) {
    const item = this.instances.get(key); if (!item) return;
    this.instances.delete(key); const cause = this.causes.get(item.causeId); cause.members.delete(key);
    if (cause.audioActive && !cause.members.size) { this.audioCall('stop',{id:cause.id,reason}); cause.audioActive = false; }
    this.stats[reason === 'expired' ? 'expired' : 'cancelled']++; this.diagnostic('removed',{key,reason});
  }
  update() {
    if (this.closed) return [];
    const clockCache = new Map();
    for (const item of [...this.instances.values()]) {
      if (!clockCache.has(item.actorPlayerId)) clockCache.set(item.actorPlayerId,this.clock(item.actorPlayerId));
      if (!this.instances.has(item.key)) continue;
      const clock = clockCache.get(item.actorPlayerId), body = this.read(this.getBeneficiary,item.beneficiaryPlayerId);
      const reason = !clock ? 'invalid-clock' : bodyStatus(body);
      if (reason) { this.remove(item.key,reason); continue; }
      const age = clock.timeMs - item.startActorMs;
      if (age < 0 || age >= item.durationMs) { this.remove(item.key,age < 0 ? 'clock-rewind' : 'expired'); continue; }
      item.ageMs = age; item.rate = clock.rate; item.body = structuredClone(body);
    }
    const activeCauses = new Set([...this.instances.values()].map(v => v.causeId));
    for (const id of activeCauses) { const c = this.causes.get(id); const clock = clockCache.get(c.actorId); if (c.audioActive && clock) this.audioCall('sync',{id,ageMs:clock.timeMs-c.start,durationMs:c.durationMs,rate:clock.rate}); }
    return this.snapshot();
  }
  snapshot() { return [...this.instances.values()].map(v => structuredClone(v)); }
  cancelBeneficiary(id, reason = 'host-invalidation') { for (const v of [...this.instances.values()]) if (v.beneficiaryPlayerId === id) this.remove(v.key,reason); }
  cancelActor(id, reason = 'actor-invalidation') { for (const v of [...this.instances.values()]) if (v.actorPlayerId === id) this.remove(v.key,reason); }
  resetSession(id) {
    if (!validId(id)) throw new TypeError('nonempty session ID required');
    if (id === this.sessionId) return;
    this.clear('session-change'); this.sessionId = id;
  }
  clear(reason) { for (const key of [...this.instances.keys()]) this.remove(key,reason); this.audioCall('clear'); this.causes.clear(); this.clocks.clear(); }
  dispose() { if (!this.closed) { this.clear('disposed'); this.closed = true; } }
}
