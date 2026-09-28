/** DVAの数値を所有しない、正の離散SP受益通知専用runtime。 */
export const LIFETIME_MS = 1500;
export const MAX_ACTIVE = 128;
export const MAX_LEDGER = 65536;
const idOK = x => (typeof x === 'string' && x.length > 0 && x.length <= 200);
const finite = Number.isFinite;

export class CauseLedger {
  constructor(limit = MAX_LEDGER) { this.limit = limit; this.ids = new Set(); this.closed = false; }
  take(id) {
    if (this.closed) return 'closed';
    if (this.ids.has(id)) return 'duplicate';
    if (this.ids.size >= this.limit) return 'ledger-full';
    this.ids.add(id); return 'new';
  }
  endSession() { this.closed = true; this.ids.clear(); }
}

/** callbackを境界とし、未確定のACC2契約を通常時計へfallbackしない。 */
export class StaminaRuntime {
  constructor({ resolveActor, projectActor, nowReal = () => performance.now(),
    acc2Contract = null, audio = null, verify = false, ledger = new CauseLedger(), maxActive = MAX_ACTIVE } = {}) {
    if (typeof resolveActor !== 'function' || typeof projectActor !== 'function') throw new TypeError('actor/project callbacks required');
    if (!Number.isInteger(maxActive) || maxActive < 1 || maxActive > MAX_ACTIVE) throw new RangeError('maxActive');
    this.resolveActor = resolveActor; this.projectActor = projectActor; this.nowReal = nowReal;
    this.acc2Contract = acc2Contract; this.audio = audio; this.verify = verify; this.ledger = ledger;
    this.maxActive = maxActive; this.active = new Map(); this.disposed = false;
    this.stats = { accepted: 0, rejected: 0, expired: 0, cancelled: 0 };
  }
  reject(reason) { this.stats.rejected++; return { accepted: false, reason }; }
  accept(event) {
    if (this.disposed) return this.reject('disposed');
    if (!event || event.type !== 'gain-stamina' || event.authoritative !== true || event.grantKind !== 'discrete') return this.reject('not-authoritative-discrete-gain');
    if (!idOK(event.causeId) || !idOK(event.playerId) || !idOK(event.clockEpoch) || !finite(event.actualDelta) ||
      !finite(event.occurredRealMs) || !finite(event.occurredActorMs)) return this.reject('invalid-event');
    // actorの現在SPとの差分を作り直さない。post-cap deltaを唯一の適格判定値とする。
    const taken = this.ledger.take(event.causeId);
    if (taken !== 'new') return this.reject(taken);
    if (event.actualDelta <= 0) return this.reject('nonpositive-post-cap-delta');
    if (!['actor','acc2-fixed'].includes(event.clockDomain)) return this.reject('unknown-clock-domain');
    const actor = this.resolveActor(event.playerId);
    if (!this.validActor(actor, event)) return this.reject('actor-or-epoch-mismatch');
    let start = event.occurredActorMs, duration = LIFETIME_MS;
    if (event.clockDomain === 'acc2-fixed') {
      const c = this.acc2Contract;
      if (!c || !idOK(c.id) || typeof c.readMs !== 'function' || typeof c.eventStartMs !== 'function' ||
        !finite(c.durationMs) || c.durationMs <= 0) return this.reject('acc2-contract-required');
      start = c.eventStartMs(event); duration = c.durationMs;
    }
    const now = this.readClock(event, actor), real = this.nowReal();
    if (!finite(now) || !finite(start) || !finite(real) || start > now || event.occurredRealMs > real) return this.reject('invalid-or-future-clock');
    const age = now - start;
    if (age >= duration) return this.reject('already-expired');
    // 容量超過を記録してfail-closed。別の既存原因を上書きしない。
    if (this.active.size >= this.maxActive) return this.reject('active-capacity');
    const occupied = new Set([...this.active.values()].filter(x=>x.playerId===event.playerId).map(x=>x.lane));
    let lane=0; while(occupied.has(lane)) lane++;
    const immutable = Object.freeze({ ...event });
    const item = { event: immutable, causeId:event.causeId, playerId:event.playerId, lane,
      start, duration, lastClock:now, lastReal:real, phase:age/duration, rate:0, terminal:false };
    this.active.set(item.causeId,item); this.stats.accepted++;
    // 発音権はここで一度だけ判断。draw/frame/再入場/音のunlockは発音開始を所有しない。
    if (!this.verify) this.audio?.offer({ causeId:item.causeId, phase:item.phase,
      durationMs:duration, realAgeMs:real-event.occurredRealMs,
      live:event.delivery==='live', delayed:event.delayed===true,
      visible:actor.visible!==false && actor.occluded!==true, nowRealMs:real });
    return { accepted:true, causeId:item.causeId, initialPhase:item.phase };
  }
  validActor(actor,event) {
    return actor && actor.playerId===event.playerId && actor.clockEpoch===event.clockEpoch &&
      finite(actor.clockMs) && Array.isArray(actor.world) && actor.world.length===3 && actor.world.every(finite) &&
      finite(actor.heightWorld) && actor.heightWorld>0;
  }
  readClock(event,actor) { return event.clockDomain==='actor' ? actor.clockMs : this.acc2Contract?.readMs(actor,event); }
  frame({reducedMotion=false, documentVisible=true}={}) {
    if(this.disposed) return [];
    const out=[], real=this.nowReal();
    if(!finite(real)) throw new TypeError('finite monotonic real clock required');
    for(const [id,item] of this.active) {
      const actor=this.resolveActor(item.playerId), ev=item.event;
      if(!this.validActor(actor,ev)) { this.remove(id,'cancelled'); continue; }
      const now=this.readClock(ev,actor);
      if(!finite(now) || now<item.lastClock || real<item.lastReal) { this.remove(id,'cancelled'); continue; }
      const age=now-item.start;
      if(age>=item.duration) { this.remove(id,'expired'); continue; }
      const realDt=real-item.lastReal;
      item.rate=realDt>0 ? (now-item.lastClock)/realDt : item.rate;
      item.phase=age/item.duration; item.lastClock=now; item.lastReal=real;
      const visible=documentVisible && actor.visible!==false && actor.occluded!==true;
      if(!visible) this.audio?.stop(id);
      else if(!this.verify) this.audio?.sync(id,item.phase,item.rate,item.duration,real);
      if(!visible) continue;
      const f=this.projectActor(actor);
      if(!validFrame(f)) { this.audio?.stop(id); continue; }
      out.push({causeId:id,playerId:item.playerId,phase:item.phase,rate:item.rate,lane:item.lane,
        reducedMotion:Boolean(reducedMotion),world:[...actor.world],...f});
    }
    return out;
  }
  remove(id,reason) { if(this.active.delete(id)){this.stats[reason]++;this.audio?.stop(id);} }
  dispose({endSession=false}={}) {
    if(this.disposed)return;
    for(const id of this.active.keys()) this.audio?.stop(id);
    this.active.clear(); this.disposed=true;
    // ledgerは再mount間で共有できる。session終了だけが履歴を破棄する。
    if(endSession)this.ledger.endSession();
  }
}
export function validFrame(f) {
  const pair=x=>Array.isArray(x)&&x.length===2&&x.every(finite);
  return !!f&&pair(f.originPx)&&pair(f.axisXPx)&&pair(f.axisYPx)&&
    Math.abs(f.axisXPx[0]*f.axisYPx[1]-f.axisXPx[1]*f.axisYPx[0])>1e-6&&
    Array.isArray(f.capsules)&&f.capsules.length>0&&f.capsules.length<=12&&
    f.capsules.every(c=>Array.isArray(c)&&c.length===5&&c.every(finite)&&c[4]>0)&&
    (f.occluders===undefined||(Array.isArray(f.occluders)&&f.occluders.length<=4&&f.occluders.every(r=>r.length===4&&r.every(finite)&&r[2]>=r[0]&&r[3]>=r[1])));
}
