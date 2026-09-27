import {C,sampleGain} from './math.mjs';
const finite=(v,name)=>{if(!Number.isFinite(v))throw new TypeError(`${name} must be finite`);return v;};
const id=(v,name)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(`${name} must be a nonempty string`);return v;};
/** startedAt and actor.timeMs MUST be in the beneficiary actor's millisecond clock domain. */
export function normalizeGain(raw){
  if(!raw||raw.type!=='gain-stamina')throw new TypeError('Expected type: gain-stamina');
  const playerId=id(raw.playerId,'playerId'),amount=finite(raw.amount,'amount');
  if(amount<=0)throw new RangeError('amount must be positive');
  const startedAt=finite(raw.startedAt,'startedAt');
  const durationMs=Math.max(C.minimumDurationMs,finite(raw.durationMs??raw.duration??C.defaultDurationMs,'durationMs'));
  if(!Number.isFinite(startedAt+durationMs))throw new RangeError('event deadline overflows');
  const radius=finite(raw.radius??C.referenceRadius,'radius');
  if(radius<=0)throw new RangeError('radius must be positive');
  const eventId=raw.eventId==null?null:id(raw.eventId,'eventId');
  // Source intentionally does not change appearance. Distinct simultaneous gains need eventId.
  const key=JSON.stringify([playerId,eventId??['at',startedAt]]);
  return Object.freeze({type:'gain-stamina',playerId,amount,startedAt,durationMs,radius,eventId,key,
    source:typeof raw.source==='string'?raw.source:'unspecified'});
}
const invalidActor=a=>!a||a.present===false||a.alive===false||a.visible===false;
export class GainStaminaSystem {
  constructor({maxActive=64,maxActors=128,maxRememberedPerActor=1024}={}){
    for(const x of [maxActive,maxActors,maxRememberedPerActor])if(!Number.isInteger(x)||x<1)throw new RangeError('Capacities must be positive integers');
    this.maxActive=maxActive;this.maxActors=maxActors;this.maxRemembered=maxRememberedPerActor;
    this.active=new Map();this.ledgers=new Map();this.diagnostics={accepted:0,rejected:0,cancelled:0,expired:0};
  }
  ingest(raw,actor){
    let e;try{e=normalizeGain(raw);}catch(error){this.diagnostics.rejected++;return {accepted:false,reason:error.message};}
    if(invalidActor(actor)||actor.playerId!==e.playerId||!Number.isFinite(actor.timeMs))return this.reject('beneficiary-ineligible');
    if(!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return this.reject('invalid-actor-position');
    let l=this.ledgers.get(e.playerId);
    if(!l){if(this.ledgers.size>=this.maxActors)return this.reject('actor-ledger-capacity');
      l={seen:new Map(),retiredThrough:-Infinity,lastTime:actor.timeMs};this.ledgers.set(e.playerId,l);}
    if(l.seen.has(e.key)||e.startedAt<=l.retiredThrough)return this.reject('duplicate-or-retired');
    if(actor.timeMs<l.lastTime)return this.reject('actor-clock-rewind');
    if(actor.timeMs>=e.startedAt+e.durationMs)return this.reject('already-expired');
    if(this.active.size>=this.maxActive)return this.reject('active-capacity');
    l.lastTime=actor.timeMs;l.seen.set(e.key,e.startedAt);
    // A monotonic tombstone makes bounded deduplication fail closed, never replay old events.
    if(l.seen.size>this.maxRemembered){
      const oldest=Math.min(...l.seen.values());l.retiredThrough=Math.max(l.retiredThrough,oldest);
      for(const [key,t]of l.seen)if(t<=l.retiredThrough)l.seen.delete(key);
    }
    this.active.set(e.key,e);this.diagnostics.accepted++;
    return {accepted:true,event:e};
  }
  reject(reason){this.diagnostics.rejected++;return {accepted:false,reason};}
  update(actors){
    const read=id=>actors instanceof Map?actors.get(id):actors(id),out=[];
    const rewound=new Set();
    for(const [playerId,l]of this.ledgers){const a=read(playerId);
      if(a&&Number.isFinite(a.timeMs)){if(a.timeMs<l.lastTime)rewound.add(playerId);else l.lastTime=a.timeMs;}}
    for(const [key,e]of this.active){const a=read(e.playerId);
      if(invalidActor(a)||a.playerId!==e.playerId||!Number.isFinite(a.timeMs)||!Number.isFinite(a.x)||!Number.isFinite(a.y)||rewound.has(e.playerId)){
        this.active.delete(key);this.diagnostics.cancelled++;continue;
      }
      const s=sampleGain(e,a.timeMs);
      if(s.progress>=1){this.active.delete(key);this.diagnostics.expired++;continue;}
      if(s.active)out.push({...s,actor:a,rate:a.paused?0:Math.max(0,Number.isFinite(a.timeScale)?a.timeScale:1)});
    }
    return out;
  }
  cancelPlayer(playerId){for(const[key,e]of this.active)if(e.playerId===playerId){this.active.delete(key);this.diagnostics.cancelled++;}}
  /** New scene/actor epoch only. Never call this per frame or merely on invisibility. */
  resetEpoch(){this.active.clear();this.ledgers.clear();}
}
