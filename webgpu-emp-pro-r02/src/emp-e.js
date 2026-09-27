import {EMPGPU} from './renderer.js';
import {EMPSound} from './audio.js';
import {EventStore,TIMELINES} from './events.js';
import {sampleStore} from './sampler.js';
import {finite,clone} from './contract.js';
export {CONTRACT,VERSION,ActorClock} from './contract.js';
export {TIMELINES,EventStore};export {sampleEvent,sampleStore} from './sampler.js';
/** Host-facing effect-only API. Does not import the preview or write gameplay state. */
export class EMPEffects{
 static async create({canvas,device,quality='high',onError,...options}={}){if(!canvas)throw new TypeError('canvas is required');const gpu=await EMPGPU.create(canvas,{device,quality,onError});return new EMPEffects(gpu,options);}
 constructor(gpu,options={}){this.gpu=gpu;this.events=new EventStore(options);this.audio=new EMPSound();this.actorMs=0;this.rate=1;this.disposed=false;}
 _live(){if(this.disposed)throw new Error('Effect instance disposed');}
 emit(kind,spec){this._live();const r=this.events.add(kind,spec);if(r.accepted)this.audio.emit(r.event);return r;}
 charge(s){return this.emit('charge',s);}normal(s){return this.emit('normal',s);}resonance(s){return this.emit('resonance',s);}cancellation(s){return this.emit('cancellation',s);}suppression(s){return this.emit('suppression',s);}storageLock(s){return this.suppression(s);}
 resolve(command){this._live();const r=this.events.resolve(command);if(r.accepted)this.audio.resolve(r.event);return r;}
 extendLock(command){this._live();const r=this.events.extendLock(command);if(r.accepted)this.audio.extend(r.event);return r;}
 moveAttachment(id,position){const moved=this.events.moveAttachment(id,position);if(moved)this.audio.move(id,position);return moved;}
 update({actorMs,rate=1}){this._live();finite(actorMs);finite(rate);if(actorMs<this.actorMs)throw new RangeError('Explicit reset and replay required for backwards seek');if(rate<0||rate>8)throw new RangeError('rate 0..8');this.actorMs=actorMs;this.rate=rate;this.audio.clock(actorMs,rate);}
 render(){this._live();this.gpu.render(sampleStore(this.events,this.actorMs),this.actorMs);}
 setView(v){this.gpu.setView(v);}setQuality(q){this.gpu.setQuality(q);}setBackground(rgba){this.gpu.setBackground(rgba);}
 setOccluders(shapes){if(!Array.isArray(shapes))throw new TypeError('array required');for(const b of shapes){if(b.polygon){if(b.polygon.length<3)throw new TypeError('polygon requires >=3 points');for(const p of b.polygon){finite(p.x);finite(p.y);}}else{for(const k of['x','y','w','h'])finite(b[k]);if(b.w<=0||b.h<=0)throw new RangeError('positive occluder size');}if(b.depth!==undefined)finite(b.depth);if(b.color!==undefined&&(!Array.isArray(b.color)||b.color.length!==3||b.color.some(x=>!Number.isFinite(x)||x<0||x>1)))throw new TypeError('occluder color requires 3 finite 0..1 components');}this.gpu.occlusion=clone(shapes);}
 setListener(p){this.audio.setListener(p);}setVolume(v){this.audio.setVolume(v);}async enableAudio(){this._live();const state=await this.audio.unlock();this.audio.clock(this.actorMs,this.rate);return state;}
 reset(actorMs=0){this._live();this.actorMs=finite(actorMs);this.events.reset();this.audio.reset();this.audio.clock(actorMs,this.rate);}
 snapshot(){return{actorMs:this.actorMs,rate:this.rate,active:sampleStore(this.events,this.actorMs).map(s=>({id:s.event.id,kind:s.kind,phase:s.phase,authorityActive:s.authorityActive,deadline:s.deadline,removalAt:s.removalAt,information:s.information})),gpu:this.gpu.diagnostics(),audio:this.audio.stats,eventLog:this.events.log.map(({event,...rest})=>rest)};}
 async dispose(){if(this.disposed)return;this.disposed=true;this.gpu.dispose();await this.audio.dispose();}
}
