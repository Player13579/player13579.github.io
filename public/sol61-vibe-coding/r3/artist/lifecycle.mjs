import {programFor} from './programs.mjs';
export const DURATION_E_MS=1200;
export class VibeCauses {
  constructor(){this.spent=new Set();this.active=new Map();}
  accept(raw,owner,basis,origin='game') {
    if(origin!=='game'&&origin!=='gallery-fixture') throw new TypeError('Explicit origin required');
    if(!raw||raw.type!=='action-vibe-coding'||typeof raw.id!=='string'||!raw.id||!Number.isFinite(raw.at)||
      !Number.isFinite(raw.x)||!Number.isFinite(raw.y)||raw.radius!==145||raw.durationMs!==0||
      raw.playerId!==owner?.id||raw.targetId||raw.viewerId) throw new TypeError('Producer contract mismatch');
    const key=`${origin}:${raw.id}`;
    if(this.spent.has(key)) return null;
    // First valid receipt consumes identity even if the current registered source
    // is unavailable. A later snapshot must not promote a previously omitted E.
    this.spent.add(key);
    const program=programFor(raw.variant);
    if(!owner.currentVisible||!Number.isFinite(owner.eVisualTime)||!owner.identityGeneration||!basis||!Number.isFinite(basis.hWorld)||basis.hWorld<=0||!basis.generation||!owner.roomId)
      throw new TypeError('Current privacy, clock and registered H basis required');
    const cause={key,origin,raw:Object.freeze({...raw}),program,actorId:owner.id,roomId:owner.roomId,
      identityGeneration:owner.identityGeneration,basisGeneration:basis.generation,hWorld:basis.hWorld,
      startE:owner.eVisualTime,durationMs:DURATION_E_MS};
    this.active.set(key,cause);return cause;
  }
  sample(key,owner,basis) {
    const c=this.active.get(key);if(!c)return null;
    if(!owner||owner.id!==c.actorId||!owner.currentVisible||owner.roomId!==c.roomId||
      owner.identityGeneration!==c.identityGeneration||basis?.generation!==c.basisGeneration||
      !Number.isFinite(owner.eVisualTime)||owner.eVisualTime<c.startE) return this.cancel(key);
    const ageMs=owner.eVisualTime-c.startE;
    if(ageMs>=c.durationMs)return this.cancel(key);
    return {...c,ageMs};
  }
  cancel(key){this.active.delete(key);return null;}
  cancelAll(){this.active.clear();}
  // Session end is the only tombstone release; never call on resize/reconnect snapshots.
  disposeSession(){this.active.clear();this.spent.clear();}
}
