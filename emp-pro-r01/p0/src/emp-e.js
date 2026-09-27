import {EMPGPU} from './renderer.js';
import {EMPSound} from './audio.js';
import {EventStore,TIMELINES} from './events.js';
import {finite,point,CONTRACT} from './contract.js';
export {CONTRACT,TIMELINES};
export {pairResult,classifyResonance,normalHit,ActorClock} from './contract.js';
/** External effect-only API. No demo imports, DOM controls, RAF loop or gameplay writes. */
export class EMPEffects {
  static async create({canvas,device,draft=false,maxEvents=256,onError}={}){
    if(!canvas)throw new TypeError('canvas is required');
    const gpu=await EMPGPU.create(canvas,{device,draft,onError});return new EMPEffects(gpu,{maxEvents});
  }
  constructor(gpu,options){this.gpu=gpu;this.events=new EventStore(options);this.audio=new EMPSound();this.actorMs=0;this.rate=1;this.disposed=false;}
  emit(kind,spec){
    if(this.disposed)throw new Error('Effect engine has been disposed');
    const r=this.events.add(kind,spec);if(r.accepted)this.audio.emit(r.event);return r;
  }
  charge(spec){return this.emit('charge',spec);}
  normal(spec){return this.emit('normal',spec);}
  suppression(spec){return this.emit('suppression',{sound:false,...spec});}
  resonance(spec){return this.emit('resonance',spec);}
  cancellation(spec){return this.emit('cancellation',spec);}
  /** Authoritative simulation time. Rewinds are explicit reset/seek, never implicit replay. */
  update({actorMs,rate=1}){
    finite(actorMs,'actorMs');finite(rate,'rate');if(rate<0||rate>8)throw new RangeError('rate must be 0..8');
    if(actorMs<this.actorMs)throw new RangeError('Actor clock cannot rewind; reset() and re-emit for a replay');
    this.actorMs=actorMs;this.rate=rate;this.audio.clock(actorMs,rate);this.events.prune(actorMs);
  }
  render(){this.gpu.render(this.events.active(this.actorMs),this.actorMs);}
  setView({center,pixelsPerGamePixel=1}){
    point(center,'center');finite(pixelsPerGamePixel,'pixelsPerGamePixel');if(pixelsPerGamePixel<=0)throw new RangeError('View scale must be positive');
    this.gpu.setView({center,pixelsPerGamePixel});
  }
  setListener(position){this.audio.setListener(position);}
  async enableAudio(){await this.audio.unlock();this.audio.clock(this.actorMs,this.rate);}
  setVolume(value){this.audio.setVolume(value);}
  /** Target-local status follows the actual target, but a pair center is an immutable emission snapshot. */
  moveAttachment(id,position){
    const p=point(position);const e=this.events.events.find(e=>e.id===id);
    if(!e)return false;
    if(!['charge','suppression'].includes(e.kind))throw new TypeError('Only charge/suppression can be attached. Releases/pairs are immutable spatial snapshots.');
    e.origin=p;return true;
  }
  setOccluders(boxes){
    this.gpu.occluders=boxes.map(b=>{for(const k of ['x','y','w','h'])finite(b[k],k);if(b.w<=0||b.h<=0)throw new RangeError('Positive occluder extent required');return {...b};});
  }
  reset(actorMs=0){finite(actorMs,'actorMs');this.events.reset();this.audio.reset();this.actorMs=actorMs;this.audio.clock(actorMs,this.rate);}
  stats(){return {version:CONTRACT.version,actorMs:this.actorMs,rate:this.rate,active:this.events.active(this.actorMs).length,retained:this.events.events.length,
    rememberedIds:this.events.seen.size,dropped:this.events.dropped,...this.gpu.stats,audio:{...this.audio.stats},gpuErrors:[...this.gpu.errors]};}
  async dispose(){if(this.disposed)return;this.disposed=true;await this.audio.dispose();this.gpu.dispose();}
}
