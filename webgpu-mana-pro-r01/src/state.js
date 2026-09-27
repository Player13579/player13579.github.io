/** Game-facing state only. No DOM, RAF, sound unlock, automatic loop, or game-event wiring. */
export const VERSION = 'r0.1';
export const DEFAULT_DURATION_MS = 1500;
export const MIN_DURATION_MS = 900;
export const REFERENCE_RADIUS_PX = 82;
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const keyOf = (...parts) => JSON.stringify(parts);
export function phaseAt(ageMs, durationMs = DEFAULT_DURATION_MS) {
  const p = Math.max(0, Math.min(1, ageMs / durationMs));
  return p < .17 ? 'onset' : p < .46 ? 'conversion' : p < .82 ? 'absorption' : p < 1 ? 'settled-tail' : 'expired';
}
export function validateBeneficiary(b) {
  return b && finite(b.x) && finite(b.y) && finite(b.heightPx) && b.heightPx > 0 &&
    typeof b.alive === 'boolean' && typeof b.present === 'boolean' &&
    typeof b.inVent === 'boolean' && typeof b.invisible === 'boolean' &&
    (b.manaAnchor === undefined || (finite(b.manaAnchor?.x) && finite(b.manaAnchor?.y))) &&
    (b.contactScale === undefined || (finite(b.contactScale?.x) && finite(b.contactScale?.y) && b.contactScale.x>0 && b.contactScale.y>0));
}
function cloneBody(b){return {...b,...(b.manaAnchor?{manaAnchor:{...b.manaAnchor}}:{}),...(b.contactScale?{contactScale:{...b.contactScale}}:{})};}
function unavailable(b) {
  if (!b || !b.present) return 'leave';
  if (!b.alive) return 'death';
  if (b.inVent) return 'vent';
  if (b.invisible) return 'invisibility';
  return null;
}
function validClock(c) {return c && finite(c.timeMs) && finite(c.rate) && c.rate >= 0 && c.rate <= 8;}
function hash(text) {let h=2166136261; for (let i=0;i<text.length;i++) h=Math.imul(h^text.charCodeAt(i),16777619); return h>>>0;}

export class ManaAcquireSystem {
  constructor({sessionId, getActorClock, getBeneficiary, audio = null, maxActive = 64, maxSessionEvents = 32768, onDiagnostic = () => {}}) {
    if (!id(sessionId) || typeof getActorClock !== 'function' || typeof getBeneficiary !== 'function') throw new TypeError('sessionId and both host callbacks are required');
    if (!Number.isInteger(maxActive) || maxActive < 1 || !Number.isInteger(maxSessionEvents) || maxSessionEvents < 1) throw new RangeError('Capacities must be positive integers');
    Object.assign(this,{sessionId,getActorClock,getBeneficiary,audio,maxActive,maxSessionEvents,onDiagnostic});
    this.effects=new Map(); this.seen=new Set(); this.causes=new Map(); this.disposed=false;
    this.stats={accepted:0,duplicates:0,suppressed:0,rejected:0,expired:0,cancelled:0,sfxStarted:0,sfxSkipped:0};
  }
  _callAudio(method,arg){try{return this.audio?.[method]?.(arg);}catch{this.onDiagnostic({status:'warning',reason:`audio-${method}-failed`});return false;}}
  _result(status,reason,extra={}) {const result={status,reason,...extra}; this.onDiagnostic(result); return result;}
  /** Call only AFTER an authoritative positive mana delta has committed. */
  emit(event) {
    if (this.disposed) return this._result('rejected','disposed');
    if (!event || !id(event.eventId) || !id(event.sessionId) || !id(event.beneficiaryPlayerId) || !id(event.actorPlayerId)) return this._result('rejected','invalid-identifiers');
    if (event.sessionId !== this.sessionId) return this._result('rejected','stale-session');
    if (event.committed !== true || !finite(event.manaDelta) || event.manaDelta <= 0) return this._result('rejected','not-positive-committed-gain');
    if (event.route === 'desire-refinement') return this._result('rejected','desire-private-effect-excluded');
    if (event.durationMs !== undefined && (!finite(event.durationMs) || event.durationMs <= 0)) return this._result('rejected','invalid-duration');
    if (event.radiusPx !== undefined && (!finite(event.radiusPx) || event.radiusPx <= 0)) return this._result('rejected','invalid-radius');
    const visualKey=keyOf(this.sessionId,event.eventId,event.beneficiaryPlayerId);
    const causeKey=keyOf(this.sessionId,event.eventId);
    if (this.seen.has(visualKey)) {this.stats.duplicates++; return this._result('duplicate','already-consumed',{key:visualKey});}
    if (this.seen.size >= this.maxSessionEvents) {this.stats.rejected++; return this._result('rejected','session-dedupe-capacity');}
    let c,b;
    try {c=this.getActorClock(event.actorPlayerId); b=this.getBeneficiary(event.beneficiaryPlayerId);} catch {return this._result('rejected','host-callback-failed');}
    if (!validClock(c)) return this._result('rejected','invalid-actor-clock');
    if (b && !validateBeneficiary(b)) return this._result('rejected','invalid-beneficiary-snapshot');
    const durationMs=Math.max(MIN_DURATION_MS,event.durationMs ?? DEFAULT_DURATION_MS);
    const start=event.startedAtActorMs ?? c.timeMs;
    if (!finite(start) || start > c.timeMs + .01) return this._result('rejected','future-or-invalid-start');
    const existingCause=this.causes.get(causeKey);
    if (existingCause && (existingCause.actorPlayerId !== event.actorPlayerId || existingCause.durationMs !== durationMs || (event.startedAtActorMs !== undefined && Math.abs(start-existingCause.start)>.01))) return this._result('rejected','cause-clock-contract-mismatch');
    const effectiveStart=existingCause?.start ?? start;
    this.seen.add(visualKey); // Suppressed events stay consumed. Revealing a player never replays them.
    const reason=unavailable(b);
    if (reason || c.timeMs-effectiveStart >= durationMs || this.effects.size >= this.maxActive) {
      this.stats.suppressed++;
      return this._result('suppressed',reason || (c.timeMs-effectiveStart >= durationMs ? 'already-expired' : 'active-capacity'),{key:visualKey});
    }
    const effect={key:visualKey,causeKey,eventId:event.eventId,beneficiaryPlayerId:event.beneficiaryPlayerId,
      actorPlayerId:event.actorPlayerId,sessionId:this.sessionId,manaDelta:event.manaDelta,route:event.route ?? 'unspecified',
      durationMs,radiusPx:event.radiusPx ?? REFERENCE_RADIUS_PX,start:existingCause?.start ?? start,lastClock:c.timeMs,
      ageMs:c.timeMs-(existingCause?.start ?? start),rate:c.rate,seed:hash(visualKey),beneficiary:cloneBody(b)};
    this.effects.set(visualKey,effect); this.stats.accepted++;
    let sfx='shared-cause';
    if (!existingCause) {
      this.causes.set(causeKey,{actorPlayerId:event.actorPlayerId,start,durationMs});
      // No delayed queue if browser sound is locked: keep one-cause/one-start semantics.
      let started=false;
      try {started=!!this.audio?.begin({id:causeKey,ageMs:effect.ageMs,durationMs,rate:c.rate});}
      catch {this.onDiagnostic({status:'warning',reason:'audio-begin-failed'});}
      sfx=started?'started':'skipped-unavailable'; this.stats[started?'sfxStarted':'sfxSkipped']++;
    }
    return this._result('accepted','committed-gain',{key:visualKey,sfx,durationMs,clampedDuration:durationMs!==(event.durationMs??DEFAULT_DURATION_MS)});
  }
  update() {
    if (this.disposed) return [];
    const clocks=new Map(), bodies=new Map(), synced=new Set(), remove=[];
    for (const e of this.effects.values()) {
      if (!clocks.has(e.actorPlayerId)) {try {clocks.set(e.actorPlayerId,this.getActorClock(e.actorPlayerId));} catch {clocks.set(e.actorPlayerId,null);}}
      if (!bodies.has(e.beneficiaryPlayerId)) {try {bodies.set(e.beneficiaryPlayerId,this.getBeneficiary(e.beneficiaryPlayerId));} catch {bodies.set(e.beneficiaryPlayerId,null);}}
      const c=clocks.get(e.actorPlayerId), b=bodies.get(e.beneficiaryPlayerId);
      let reason=unavailable(b);
      if (!reason && !validateBeneficiary(b)) reason='invalid-beneficiary-snapshot';
      if (!reason && !validClock(c)) reason='actor-clock-unavailable';
      if (!reason && c.timeMs + .01 < e.lastClock) reason='actor-clock-rewind';
      if (reason) {remove.push([e.key,reason]);continue;}
      e.ageMs=c.timeMs-e.start; e.lastClock=c.timeMs; e.rate=c.rate; e.beneficiary=cloneBody(b);
      if (e.ageMs>=e.durationMs) {remove.push([e.key,'expired']);continue;}
      if (!synced.has(e.causeKey)) {
        this._callAudio('sync',{id:e.causeKey,ageMs:e.ageMs,durationMs:e.durationMs,rate:e.rate}); synced.add(e.causeKey);
      }
    }
    for (const [key,reason] of remove) this._remove(key,reason);
    return this.snapshot();
  }
  _remove(key,reason) {
    const e=this.effects.get(key); if (!e) return false;
    this.effects.delete(key);
    if (![...this.effects.values()].some(x=>x.causeKey===e.causeKey)) this._callAudio('cancel',e.causeKey);
    this.stats[reason==='expired'?'expired':'cancelled']++;
    this.onDiagnostic({status:'removed',reason,key}); return true;
  }
  cancelBeneficiary(playerId,reason='host-cancel') {for (const e of [...this.effects.values()]) if(e.beneficiaryPlayerId===playerId)this._remove(e.key,reason);}
  cancelActor(playerId,reason='host-cancel') {for (const e of [...this.effects.values()]) if(e.actorPlayerId===playerId)this._remove(e.key,reason);}
  clear(reason='host-clear') {for (const key of [...this.effects.keys()]) this._remove(key,reason);}
  setSession(sessionId) {
    if (!id(sessionId)) throw new TypeError('Nonempty sessionId required');
    if (sessionId===this.sessionId) return;
    this.clear('session-switch'); this._callAudio('reset'); this.sessionId=sessionId; this.seen.clear(); this.causes.clear();
  }
  snapshot() {return [...this.effects.values()].map(e=>({...e,beneficiary:cloneBody(e.beneficiary),phase:phaseAt(e.ageMs,e.durationMs)}));}
  dispose() {if(this.disposed)return; this.clear('dispose'); this._callAudio('reset'); this.seen.clear(); this.causes.clear();this.disposed=true;}
}
