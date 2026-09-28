import {synthesize} from './sfx.js';
export class ManaGainAudio {
  constructor({context=null,onDiagnostic=()=>{}}={}){this.context=context;this.ownsContext=!context;this.node=null;this.ready=false;this.disposed=false;this.pending=null;this.cache=new Map();this.gain=0.66;this.onDiagnostic=onDiagnostic;this.workletStats=null;}
  async unlock(){
    if(this.disposed)throw new Error('audio disposed');
    if(this.ready){await this.context.resume();return;}
    if(this.pending)return this.pending;
    this.pending=(async()=>{
      this.context??=new AudioContext({sampleRate:48000});await this.context.resume();
      await this.context.audioWorklet.addModule(new URL('./audio-worklet.js',import.meta.url));
      this.node=new AudioWorkletNode(this.context,'mana-gain-r04',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.node.port.onmessage=({data})=>{if(data.type==='stats')this.workletStats=data.stats;};
      this.node.onprocessorerror=()=>{this.ready=false;this.onDiagnostic({type:'audio-worklet-error'});};
      this.node.connect(this.context.destination);
      for(const d of [1500,900])this.cache.set(d,synthesize({durationMs:d}));
      this.node.port.postMessage({type:'gain',value:this.gain});this.ready=true;
    })();try{await this.pending;}finally{this.pending=null;}
  }
  start(v){if(!this.ready||this.context.state!=='running')return false;let pcm=this.cache.get(v.durationMs);if(!pcm){pcm=synthesize({durationMs:v.durationMs});if(this.cache.size>=12)this.cache.delete(this.cache.keys().next().value);this.cache.set(v.durationMs,pcm);}this.node.port.postMessage({type:'start',value:{...v,pcm,at:this.context.currentTime}});return true;}
  sync(v){if(this.ready)this.node.port.postMessage({type:'sync',value:{...v,at:this.context.currentTime}});}
  stop(v){if(this.ready)this.node.port.postMessage({type:'stop',value:{...v,at:this.context.currentTime}});}
  clear(){if(this.ready)this.node.port.postMessage({type:'clear'});}
  setGain(v){if(!Number.isFinite(v)||v<0||v>1)throw new RangeError('gain 0..1 required');this.gain=v;if(this.ready)this.node.port.postMessage({type:'gain',value:v});}
  setMuted(v){if(this.ready)this.node.port.postMessage({type:'mute',value:!!v});}
  async dispose(){if(this.disposed)return;this.clear();this.node?.disconnect();if(this.ownsContext&&this.context)await this.context.close();this.ready=false;this.disposed=true;}
}
