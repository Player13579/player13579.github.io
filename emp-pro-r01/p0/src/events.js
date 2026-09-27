import {CONTRACT, point, finite, midpoint, distance} from './contract.js';
const DURATIONS={charge:1200,normal:520,suppression:7000,resonance:1600,cancellation:1600};
/** Deterministic retained events. IDs are idempotency keys until explicit reset(). */
export class EventStore {
  constructor({maxEvents=256,maxRememberedIds=100000}={}) {
    this.events=[];this.seen=new Set();this.maxEvents=maxEvents;this.maxRememberedIds=maxRememberedIds;this.dropped=0;
  }
  add(kind, spec) {
    if(!(kind in DURATIONS))throw new TypeError(`Unknown effect ${kind}`);
    if(!spec||typeof spec.id!=='string'||!spec.id.length)throw new TypeError('An external unique string id is required');
    if(this.seen.has(spec.id))return {accepted:false,reason:'duplicate',id:spec.id};
    if(this.seen.size>=this.maxRememberedIds)throw new RangeError('Idempotency epoch full; explicitly reset at a safe scene boundary');
    if(this.events.length>=this.maxEvents) {this.dropped++;return {accepted:false,reason:'capacity',id:spec.id};}
    const atMs=finite(spec.atMs,'atMs');
    let origin=point(spec.origin,'origin');
    const phase=spec.phase??1;
    if(![1,-1].includes(phase))throw new RangeError('phase must be +1 or -1');
    let a=null,b=null;
    if(kind==='resonance'||kind==='cancellation') {
      a=point(spec.a,'a'); b=point(spec.b,'b'); if(distance(a,b)>CONTRACT.pairDistance)throw new RangeError('Pair separation exceeds 520 game px'); const m=midpoint(a,b);
      if(Math.hypot(origin.x-m.x,origin.y-m.y)>1e-5)throw new RangeError('Pair origin MUST be the midpoint of a/b emission snapshots');
    }
    const targets=(spec.targets??[]).map((t,i)=>({id:String(t.id??i),position:point(t.position,`target ${i}`)}));
    if(kind==='normal'&&targets.some(t=>distance(origin,t.position)>CONTRACT.normalRange))throw new RangeError('Normal target exceeds 260 game px');
    const durationMs=kind==='suppression'?(spec.durationMs??CONTRACT.lockMs):DURATIONS[kind];
    finite(durationMs,'durationMs');if(durationMs<=0)throw new RangeError('duration must be positive');
    const event={id:spec.id,kind,atMs,origin,a,b,phase,targets,durationMs,actorId:spec.actorId??null,
      targetId:spec.targetId??null,seed:hash(spec.id),sound:spec.sound!==false};
    this.events.push(event);this.seen.add(spec.id);
    return {accepted:true,event};
  }
  active(actorMs) { return this.events.filter(e=>actorMs>=e.atMs&&actorMs<e.atMs+e.durationMs); }
  prune(actorMs) { this.events=this.events.filter(e=>actorMs<e.atMs+e.durationMs); }
  reset() { this.events.length=0;this.seen.clear();this.dropped=0; }
}
export function hash(text) {let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0)/4294967296;}
export function ageOf(event,time) {return (time-event.atMs)/1000;}
export const TIMELINES=Object.freeze({
  charge:{durationMs:1200,phases:[[0,280,'capture / separated teeth'],[280,930,'fold / lattice compression'],[930,1200,'phase lock / white seam']]},
  normal:{durationMs:520,phases:[[0,80,'source cleave'],[0,180,'source-to-target transport'],[180,360,'arrival / branching termination'],[360,520,'field extinction']],impactMs:180},
  suppression:{durationMs:7000,phases:[[0,220,'target-local latch'],[220,6620,'segmented held state'],[6620,7000,'unzip / release']]},
  resonance:{durationMs:1600,phases:[[0,180,'pair-to-midpoint interlock'],[180,440,'topology inversion'],[440,880,'six-cleft crystal / peak'],[880,1300,'lamellar separation'],[1300,1600,'extinction']]},
  cancellation:{durationMs:1600,phases:[[0,260,'counterphase approach'],[260,650,'opposed shear / dark null seam'],[650,1150,'inward collapse'],[1150,1600,'paired terminal slivers']]},
});
