import {normalizeGain,sampleGain} from './sampler.mjs';
/** Trusted, discrete, positive gains only. The module never changes host SP. */
export class GainStaminaSystem {
 constructor({maxActive=64,maxActors=128,maxRememberedPerActor=1024}={}){
  for(const v of [maxActive,maxActors,maxRememberedPerActor])if(!Number.isInteger(v)||v<1)throw new TypeError('invalid_capacity');
  this.limits={maxActive,maxActors,maxRememberedPerActor};this.active=new Map();this.ledgers=new Map();
  this.diagnostics={accepted:0,rejected:0,duplicates:0,expired:0,cancelled:0};this.history=[];
 }
 #reject(reason){this.diagnostics.rejected++;if(reason==='duplicate')this.diagnostics.duplicates++;return {accepted:false,reason};}
 #actorProblem(a,id){
  if(!a)return 'actor_missing';if(a.playerId!==id)return 'actor_mismatch';
  if(a.alive===false)return 'dead';if(a.present===false)return 'exited';if(a.visible===false)return 'invisible';
  if(!Number.isFinite(a.timeMs)||!Number.isFinite(a.x)||!Number.isFinite(a.y)||(a.z!==undefined&&!Number.isFinite(a.z)))return 'invalid_actor';
  if(a.timeScale!==undefined&&(!Number.isFinite(a.timeScale)||a.timeScale<0))return 'invalid_actor_rate';return null;
 }
 #finish(key,reason){const e=this.active.get(key);if(!e)return;this.active.delete(key);this.diagnostics[reason==='expired'?'expired':'cancelled']++;
  this.history.push({key,playerId:e.playerId,startedAt:e.startedAt,durationMs:e.durationMs,reason});if(this.history.length>256)this.history.shift();}
 ingestAuthoritativeGain(input,actor){
  let event;try{event=normalizeGain(input);}catch(e){return this.#reject(e.message);}
  const issue=this.#actorProblem(actor,event.playerId);if(issue)return this.#reject(issue);
  let ledger=this.ledgers.get(event.playerId);
  if(ledger?.seen.has(event.key))return this.#reject('duplicate');
  if(ledger&&event.startedAt<=ledger.floor)return this.#reject('retired_timestamp');
  if(ledger&&actor.timeMs<ledger.lastTime){this.cancelPlayer(event.playerId,'clock_reversed');return this.#reject('clock_reversed');}
  if(actor.timeMs-event.startedAt>=event.durationMs)return this.#reject('already_expired');
  if(this.active.size>=this.limits.maxActive)return this.#reject('active_capacity');
  if(!ledger){
   if(this.ledgers.size>=this.limits.maxActors)return this.#reject('actor_capacity');
   ledger={seen:new Map(),floor:-Infinity,lastTime:actor.timeMs};this.ledgers.set(event.playerId,ledger);
  }
  // Bounded tombstones do not evict an active event or resurrect old IDs.
  if(ledger.seen.size>=this.limits.maxRememberedPerActor){
   const candidates=[...ledger.seen].filter(([k])=>!this.active.has(k)).sort((a,b)=>a[1]-b[1]);
   if(!candidates.length)return this.#reject('dedupe_capacity');
   const [key,time]=candidates[0];ledger.seen.delete(key);ledger.floor=Math.max(ledger.floor,time);
   if(event.startedAt<=ledger.floor)return this.#reject('retired_timestamp');
  }
  const used=new Set([...this.active.values()].filter(e=>e.playerId===event.playerId).map(e=>e.slot));
  let slot=0;while(used.has(slot))slot++;
  event=Object.freeze({...event,slot});ledger.seen.set(event.key,event.startedAt);ledger.lastTime=actor.timeMs;
  this.active.set(event.key,event);this.diagnostics.accepted++;return {accepted:true,event};
 }
 ingest(input,actor){return this.ingestAuthoritativeGain(input,actor);}
 update(actors){
  const rawGet=typeof actors==='function'?actors:id=>actors.get(id),cache=new Map(),result=[];
  const get=id=>{if(!cache.has(id))cache.set(id,rawGet(id));return cache.get(id);};
  const invalid=new Map();
  for(const e of this.active.values()){
   const a=get(e.playerId),ledger=this.ledgers.get(e.playerId);
   let issue=this.#actorProblem(a,e.playerId);
   if(!issue&&a.timeMs<ledger.lastTime)issue='clock_reversed';
   if(issue)invalid.set(e.playerId,issue);
  }
  for(const [id,why] of invalid)this.cancelPlayer(id,why);
  for(const [key,e] of this.active){
   const actor=get(e.playerId);this.ledgers.get(e.playerId).lastTime=actor.timeMs;
   const sample=sampleGain(e,actor.timeMs);
   if(sample.progress>=1){this.#finish(key,'expired');continue;}
   if(sample.active)result.push({...sample,actor:{...actor},rate:actor.paused?0:(actor.timeScale??1)});
  }
  return result;
 }
 cancelPlayer(id,reason='cancelled'){for(const [k,e] of this.active)if(e.playerId===id)this.#finish(k,reason);}
 cancelAll(reason='cancelled'){for(const k of [...this.active.keys()])this.#finish(k,reason);}
 resetEpoch(){this.cancelAll('epoch_reset');this.ledgers.clear();}
}
