import {KINDS,CONTRACT,VISUAL,point,finite,id,clone,freeze,stable} from './contract.js';
/** Server metadata is copied intact, never interpreted to choose a branch or recipient. */
export class EventStore {
  constructor({maxEvents=1024,maxCommands=50000}={}){this.events=new Map();this.commands=new Map();this.maxEvents=maxEvents;this.maxCommands=maxCommands;this.log=[];}
  _record(action,result,detail={}){this.log.push({action,...result,...detail});if(this.log.length>2000)this.log.shift();return result;}
  add(kind,spec){
    if(!KINDS.includes(kind))throw new TypeError('Unknown visual branch');
    id(spec?.id);finite(spec.atMs,'atMs');point(spec.origin,'origin');
    for(const k of ['cause','owner','phase','pair'])if(!Object.hasOwn(spec,k))throw new TypeError(`Explicit ${k} required (null permitted for pair)`);
    const original=freeze(clone(spec));
    if(this.events.has(spec.id)){const old=this.events.get(spec.id);return this._record('emit',{accepted:false,reason:old.kind===kind&&stable(old.binding)===stable(original)?'duplicate':'id_conflict',id:spec.id});}
    if(this.events.size>=this.maxEvents)return this._record('emit',{accepted:false,reason:'capacity',id:spec.id});
    if(spec.authorityDeadlineMs!==null&&spec.authorityDeadlineMs!==undefined){finite(spec.authorityDeadlineMs,'authorityDeadlineMs');if(spec.authorityDeadlineMs<spec.atMs)throw new RangeError('deadline precedes event');}
    if(spec.revision!==undefined&&(!Number.isInteger(spec.revision)||spec.revision<0))throw new RangeError('revision must be a nonnegative integer');
    if(kind==='suppression'&&!Number.isFinite(spec.authorityDeadlineMs))throw new TypeError('Storage lock requires the authoritative deadline; no inferred 7s expiry');
    if(kind==='resonance'||kind==='cancellation'){
      point(spec.a,'a');point(spec.b,'b');
      // Diagnostic only: even inconsistent snapshots are not silently relocated/reclassified.
    }
    if(kind==='normal'&&spec.targets!==undefined){if(!Array.isArray(spec.targets))throw new TypeError('targets must be an array');spec.targets.forEach(t=>{id(t.id,'target id');point(t.position,'target snapshot');});}
    const e={id:spec.id,kind,atMs:spec.atMs,binding:original,attachment:point(spec.origin),updates:[],resolution:null};
    this.events.set(e.id,e);this._record('emit',{accepted:true,id:e.id,kind}, {atMs:e.atMs,cause:clone(spec.cause)});return {accepted:true,event:e};
  }
  _command(command){id(command?.commandId,'commandId');id(command.eventId,'eventId');finite(command.atMs,'atMs');const key=stable(clone(command));
    if(this.commands.has(command.commandId))return {accepted:false,reason:this.commands.get(command.commandId)===key?'duplicate':'command_conflict'};
    if(this.commands.size>=this.maxCommands)return {accepted:false,reason:'command_capacity'};
    const e=this.events.get(command.eventId);if(!e)return {accepted:false,reason:'unknown_event'};
    if(command.atMs<e.atMs)return {accepted:false,reason:'before_start'};
    // Optional authority echo must equal the original, not replace it.
    for(const k of ['cause','owner','phase','pair'])if(Object.hasOwn(command,k)&&stable(command[k])!==stable(e.binding[k]))return {accepted:false,reason:`binding_conflict:${k}`};
    return {accepted:true,event:e,key};
  }
  resolve(command){const r=this._command(command);if(!r.accepted)return this._record('resolve',r,{id:command?.eventId});
    const e=r.event;if(e.resolution)return this._record('resolve',{accepted:false,reason:'already_resolved',id:e.id});
    this.commands.set(command.commandId,r.key);e.resolution=freeze(clone(command));
    return this._record('resolve',{accepted:true,event:e,id:e.id},{atMs:command.atMs});
  }
  extendLock(command){const r=this._command(command);if(!r.accepted)return this._record('extend',r,{id:command?.eventId});const e=r.event;
    if(e.kind!=='suppression')return this._record('extend',{accepted:false,reason:'not_lock'});
    finite(command.authorityDeadlineMs,'authorityDeadlineMs');finite(command.revision,'revision');
    if(!Number.isInteger(command.revision)||command.revision<0)throw new RangeError('nonnegative integer revision');
    const last=e.updates.at(-1);const oldEnd=last?.authorityDeadlineMs??e.binding.authorityDeadlineMs;const oldRev=last?.revision??e.binding.revision??0;
    if(e.resolution)return this._record('extend',{accepted:false,reason:'already_resolved'});
    if(command.revision<=oldRev)return this._record('extend',{accepted:false,reason:'stale_revision'});
    if(command.atMs>oldEnd||command.atMs<(last?.atMs??e.atMs))return this._record('extend',{accepted:false,reason:'outside_live_interval'});
    if(command.authorityDeadlineMs<oldEnd)return this._record('extend',{accepted:false,reason:'not_extension'});
    this.commands.set(command.commandId,r.key);e.updates.push(freeze(clone(command)));return this._record('extend',{accepted:true,event:e,id:e.id},{atMs:command.atMs,deadline:command.authorityDeadlineMs});
  }
  moveAttachment(eventId,p){const e=this.events.get(eventId);if(!e)return false;if(!['charge','suppression'].includes(e.kind))throw new TypeError('Only charge/lock attachment may move; release/pair snapshots are immutable');e.attachment=point(p);return true;}
  reset(){this.events.clear();this.commands.clear();this.log=[];}
}
/** Visual expiry is separate from an authoritative expiry. Charge readiness never expires it. */
export function timing(e,time){
  let deadline=e.binding.authorityDeadlineMs??null;
  for(const u of e.updates)if(u.atMs<=time)deadline=u.authorityDeadlineMs;
  const naturalEnd=e.kind==='normal'?e.atMs+VISUAL.normalMs:['resonance','cancellation'].includes(e.kind)?e.atMs+VISUAL.pairMs:null;
  const resolved=e.resolution&&e.resolution.atMs<=time?e.resolution.atMs:null;
  const authorityEnd=resolved===null?deadline:deadline===null?resolved:Math.min(deadline,resolved);
  // A finite cosmetic release follows authority resolution. No gameplay effect is prolonged.
  const terminalAt=authorityEnd!==null&&(naturalEnd===null||authorityEnd<naturalEnd)?authorityEnd:null;
  const removalAt=terminalAt!==null?Math.min(terminalAt+VISUAL.releaseMs[e.kind],naturalEnd??Infinity):naturalEnd;
  return {deadline,resolved,authorityEnd,terminalAt,removalAt,naturalEnd};
}
export const TIMELINES=Object.freeze({
 charge:{readyMs:1200,lifetime:'until host resolve/deadline',tailMs:240,phases:[[0,260,'capture'],[260,960,'interlocking comb compression'],[960,1200,'latch'],[1200,null,'ready-held; no autonomous discharge']]},
 normal:{lifetimeMs:520,visualArrivalMs:180,phases:[[0,90,'source split'],[0,180,'moving finite packet front'],[180,330,'target termination'],[330,520,'segment-by-segment de-energization']]},
 resonance:{lifetimeMs:1600,phases:[[0,220,'two sources -> declared midpoint'],[180,580,'interlocked six-cleft unfolding'],[580,850,'split-spine state'],[850,1400,'different branch extinctions'],[1400,1600,'finite remnant']]},
 cancellation:{lifetimeMs:1600,phases:[[0,300,'opposed comb ingress'],[300,710,'interleaving at null seam'],[710,1340,'traveling annihilation front'],[1340,1600,'seam closure; no outward blast']]},
 suppression:{lifetime:'authoritative deadline + 280ms cosmetic release',phases:[[0,240,'target latch'],[240,null,'hold; extension keeps phase'],[null,280,'authority-end unzipping']]}
});
