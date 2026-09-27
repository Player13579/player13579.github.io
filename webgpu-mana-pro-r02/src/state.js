/** r0.2 — new implementation. Contract, not artwork, retained from r0.1.
 * No game mutation, wall-clock accumulation, RAF, renderer or browser dependency.
 */
export const CONTRACT = Object.freeze({defaultDurationMs:1500,minDurationMs:900,radiusPx:82,referenceHeightPx:64,maxRate:8});
const finite = Number.isFinite;
const validId = v => typeof v==='string' && v.length>0 && v.length<=256;
const clockOK = c => c && finite(c.timeMs) && c.timeMs>=0 && finite(c.rate) && c.rate>=0 && c.rate<=CONTRACT.maxRate;
const clone = value => structuredClone(value);
export function inspectBody(b) {
  if (!b) return 'absent';
  if (['alive','present','inVent','invisible'].some(k=>typeof b[k]!=='boolean')) return 'invalid-body-flags';
  if (!b.present) return 'departed'; if(!b.alive) return 'dead'; if(b.inVent) return 'vent'; if(b.invisible) return 'invisible';
  if(!finite(b.x)||!finite(b.y)||!finite(b.heightPx)||b.heightPx<=0) return 'invalid-body-transform';
  if(b.manaAnchor && (!finite(b.manaAnchor.x)||!finite(b.manaAnchor.y))) return 'invalid-anchor';
  if(b.contactScale && (!finite(b.contactScale.x)||!finite(b.contactScale.y)||b.contactScale.x<=0||b.contactScale.y<=0)) return 'invalid-contact-scale';
  return null;
}
export class ManaAcquireSystem {
  constructor({sessionId,getActorClock,getBeneficiary,audio=null,maxActive=64,maxSessionEvents=32768,onDiagnostic=()=>{}}={}) {
    if(!validId(sessionId)||typeof getActorClock!=='function'||typeof getBeneficiary!=='function') throw new TypeError('sessionId and host snapshot callbacks are required');
    if(!Number.isInteger(maxActive)||maxActive<1||!Number.isInteger(maxSessionEvents)||maxSessionEvents<1) throw new RangeError('capacities must be positive integers');
    Object.assign(this,{sessionId,getActorClock,getBeneficiary,audio,maxActive,maxSessionEvents,onDiagnostic});
    this.causes=new Map(); this.active=new Map(); this.lastClocks=new Map(); this.disposed=false;
    this.stats={accepted:0,duplicates:0,rejected:0,suppressed:0,expired:0,cancelled:0,sfxAttempts:0,sfxStarted:0,sfxSkipped:0,sessionSwitches:0};
  }
  _read(callback,id) {try{return callback(id);}catch(e){this._diagnostic('host-callback',{id,message:String(e)});return null;}}
  _diagnostic(type,data={}) {try{this.onDiagnostic({type,...data});}catch{ /* diagnostics must not alter authority */ }}
  _reject(reason) {this.stats.rejected++; return {status:'rejected',reason};}
  _audio(method,...args) {try{return this.audio?.[method]?.(...args);}catch(e){this._diagnostic('audio-error',{method,message:String(e)}); return false;}}
  _clock(id) {
    const c=this._read(this.getActorClock,id); if(!clockOK(c)) return null;
    const old=this.lastClocks.get(id);
    if(old!==undefined && c.timeMs+0.0001<old) {this.invalidateActor(id,'clock-rewind');return null;}
    this.lastClocks.set(id,c.timeMs); return {timeMs:c.timeMs,rate:c.rate};
  }
  onManaCommitted(e) {
    if(this.disposed) return this._reject('disposed');
    if(!e || !['sessionId','eventId','beneficiaryPlayerId','actorPlayerId'].every(k=>validId(e[k]))) return this._reject('invalid-id');
    if(e.sessionId!==this.sessionId) return this._reject('wrong-session');
    if(e.committed!==true||!finite(e.manaDelta)||e.manaDelta<=0) return this._reject('not-authoritative-positive-gain');
    if(e.route==='desire-refinement') return this._reject('desire-private-route');
    if(e.durationMs!==undefined&&(!finite(e.durationMs)||e.durationMs<=0)) return this._reject('invalid-duration');
    if(e.startedAtActorMs!==undefined&&!finite(e.startedAtActorMs)) return this._reject('invalid-start');
    if(e.radiusPx!==undefined&&(!finite(e.radiusPx)||e.radiusPx<=0)) return this._reject('invalid-radius');
    const clock=this._clock(e.actorPlayerId); if(!clock) return this._reject('invalid-actor-clock');
    const causeId=JSON.stringify([this.sessionId,e.eventId]);
    let cause=this.causes.get(causeId);
    const durationMs=e.durationMs===undefined?(cause?.durationMs??CONTRACT.defaultDurationMs):Math.max(CONTRACT.minDurationMs,e.durationMs);
    const startedAtActorMs=e.startedAtActorMs??cause?.startedAtActorMs??clock.timeMs;
    if(!finite(startedAtActorMs)||startedAtActorMs<0||startedAtActorMs>clock.timeMs+0.0001) return this._reject('invalid-start');
    if(cause && (cause.actorPlayerId!==e.actorPlayerId||cause.durationMs!==durationMs||Math.abs(cause.startedAtActorMs-startedAtActorMs)>0.0001)) return this._reject('cause-contract-conflict');
    if(cause?.seen.has(e.beneficiaryPlayerId)) {this.stats.duplicates++;return {status:'duplicate',reason:'already-consumed'};}
    if(!cause) {
      if(this.causes.size>=this.maxSessionEvents) return this._reject('session-dedupe-capacity');
      cause={id:causeId,eventId:e.eventId,actorPlayerId:e.actorPlayerId,startedAtActorMs,durationMs,seen:new Set(),members:new Set(),audioAttempted:false,audioStarted:false};
      this.causes.set(causeId,cause);
    }
    cause.seen.add(e.beneficiaryPlayerId);
    const body=this._read(this.getBeneficiary,e.beneficiaryPlayerId);
    const ageMs=clock.timeMs-startedAtActorMs;
    const reason=inspectBody(body) || (ageMs>=durationMs?'already-expired':null) || (this.active.size>=this.maxActive?'active-capacity':null);
    if(reason) {this.stats.suppressed++; return {status:'suppressed',reason};}
    const key=JSON.stringify([this.sessionId,e.eventId,e.beneficiaryPlayerId]);
    const item={key,causeId,eventId:e.eventId,beneficiaryPlayerId:e.beneficiaryPlayerId,actorPlayerId:e.actorPlayerId,startedAtActorMs,durationMs,radiusPx:e.radiusPx??CONTRACT.radiusPx,manaDelta:e.manaDelta,ageMs,rate:clock.rate,body:clone(body)};
    this.active.set(key,item); cause.members.add(key);
    let sfx='shared-cause';
    if(!cause.audioAttempted) {
      cause.audioAttempted=true;this.stats.sfxAttempts++;
      cause.audioStarted=this._audio('begin',{id:causeId,ageMs,durationMs,rate:clock.rate})===true;
      this.stats[cause.audioStarted?'sfxStarted':'sfxSkipped']++;sfx=cause.audioStarted?'started':'skipped';
    }
    this.stats.accepted++;
    return {status:'accepted',key,sfx,durationMs,clampedDuration:e.durationMs!==undefined && e.durationMs<CONTRACT.minDurationMs};
  }
  _remove(key,reason) {
    const item=this.active.get(key);if(!item)return;
    this.active.delete(key);const cause=this.causes.get(item.causeId);
    cause?.members.delete(key);
    if(cause && !cause.members.size && cause.audioStarted) {this._audio('cancel',cause.id,reason);cause.audioStarted=false;}
    this.stats[reason==='expired'?'expired':'cancelled']++;this._diagnostic('removed',{key,reason});
  }
  advance() {
    if(this.disposed)return [];
    const clocks=new Map();
    for(const item of [...this.active.values()]) {
      if(!this.active.has(item.key))continue;
      if(!clocks.has(item.actorPlayerId))clocks.set(item.actorPlayerId,this._clock(item.actorPlayerId));
      const c=clocks.get(item.actorPlayerId);
      if(!c){this._remove(item.key,'invalid-actor-clock');continue;}
      const b=this._read(this.getBeneficiary,item.beneficiaryPlayerId);const reason=inspectBody(b);
      if(reason){this._remove(item.key,reason);continue;}
      const age=c.timeMs-item.startedAtActorMs;
      if(age<0||age>=item.durationMs){this._remove(item.key,age<0?'clock-rewind':'expired');continue;}
      Object.assign(item,{ageMs:age,rate:c.rate,body:clone(b)});
    }
    for(const cause of this.causes.values())if(cause.members.size && cause.audioStarted){
      const c=clocks.get(cause.actorPlayerId);
      if(c)this._audio('sync',{id:cause.id,ageMs:c.timeMs-cause.startedAtActorMs,durationMs:cause.durationMs,rate:c.rate});
    }
    return this.snapshot();
  }
  snapshot() {return [...this.active.values()].map(clone);}
  invalidateBeneficiary(playerId,reason='invalidated') {for(const i of [...this.active.values()])if(i.beneficiaryPlayerId===playerId)this._remove(i.key,reason);}
  invalidateActor(playerId,reason='invalidated') {for(const i of [...this.active.values()])if(i.actorPlayerId===playerId)this._remove(i.key,reason);}
  setSession(sessionId) {
    if(!validId(sessionId))throw new TypeError('invalid session ID'); if(sessionId===this.sessionId)return;
    this._clear('session');this.sessionId=sessionId;this.stats.sessionSwitches++;
  }
  _clear(reason) {for(const key of [...this.active.keys()])this._remove(key,reason);this._audio('reset');this.causes.clear();this.lastClocks.clear();}
  dispose() {if(!this.disposed){this._clear('disposed');this.disposed=true;}}
}
