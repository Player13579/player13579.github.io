import {synthesizeMana} from './synth.js';
/** Dedicated E adapter; sharing an AudioContext is safe. Do not share this adapter across unrelated subsystems. */
export class ManaAudio {
  constructor({context=null,destination=null,volume=0.7,onDiagnostic=()=>{}}={}){
    Object.assign(this,{context,destination,onDiagnostic});this.ownsContext=!context;this.node=null;this.volume=volume;this.muted=false;this.cache=new Map();this.started=new Set();this.disposed=false;
    this.metrics={starts:0,skipped:0,active:0,worklet:null};
  }
  async unlock(){
    if(this.disposed)throw new Error('Audio disposed');
    if(!this.context){const C=globalThis.AudioContext??globalThis.webkitAudioContext;if(!C)throw new Error('Web Audio unavailable');this.context=new C({latencyHint:'interactive'});}
    await this.context.resume();
    if(!this.node){
      await this.context.audioWorklet.addModule(new URL('./mana-worklet.js',import.meta.url));
      this.node=new AudioWorkletNode(this.context,'dva-mana-acquire-r02',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.node.port.onmessage=({data})=>{if(data.type==='metrics'){this.metrics.worklet=data;this.metrics.active=data.active;}};
      this.node.onprocessorerror=()=>{this.onDiagnostic({type:'audio-processor-error'});this.node?.disconnect();};
      this.node.connect(this.destination??this.context.destination);this.setVolume(this.volume);this.setMuted(this.muted);
    }
    return this.context.state==='running';
  }
  begin({id,ageMs,durationMs,rate}){
    if(this.started.has(id))return false;
    this.started.add(id); // includes skips: unmuting/unlocking never replays a past cause
    if(!this.node||this.context.state!=='running'||this.disposed){this.metrics.skipped++;return false;}
    const key=`${this.context.sampleRate}:${durationMs}`;let pcm=this.cache.get(key);
    if(!pcm){pcm=synthesizeMana({durationMs,sampleRate:this.context.sampleRate});if(this.cache.size>=16)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,pcm);}
    this.node.port.postMessage({type:'begin',voice:{id,ageMs,rate,at:this.context.currentTime,pcm}});this.metrics.starts++;return true;
  }
  sync({id,ageMs,rate}){this.node?.port.postMessage({type:'sync',voice:{id,ageMs,rate,at:this.context.currentTime}});}
  cancel(id,reason){this.node?.port.postMessage({type:'cancel',id,reason,at:this.context.currentTime});}
  reset(){this.node?.port.postMessage({type:'reset'});this.started.clear();}
  setVolume(value){if(!Number.isFinite(value)||value<0||value>1)throw new RangeError('Volume must be 0..1');this.volume=value;this.node?.port.postMessage({type:'gain',value});}
  setMuted(value){this.muted=!!value;this.node?.port.postMessage({type:'muted',value:this.muted});}
  async dispose(){if(this.disposed)return;this.disposed=true;this.reset();this.node?.disconnect();this.node=null;this.cache.clear();if(this.ownsContext&&this.context)await this.context.close();}
}
