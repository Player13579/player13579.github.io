import {synthesizeMana} from './synth.js';
/** Explicit user-gesture unlock. There is deliberately no replay queue. */
export class ManaAudio {
  constructor(){this.context=null;this.node=null;this.master=null;this.volume=.65;this.muted=false;this.disposed=false;this.stats={started:0,skipped:0};this._unlocking=null;}
  async unlock(){
    if(this.disposed)throw new Error('Audio disposed');
    if(this._unlocking)return this._unlocking;
    this._unlocking=this._unlock();
    try{return await this._unlocking;} finally {this._unlocking=null;}
  }
  async _unlock(){
    if(!this.context){
      const C=globalThis.AudioContext??globalThis.webkitAudioContext;
      if(!C)throw new Error('Web Audio unavailable');
      this.context=new C({latencyHint:'interactive'});
    }
    // Resume immediately inside the initiating click before asynchronous module loading.
    await this.context.resume();
    if(!this.node){
      await this.context.audioWorklet.addModule(new URL('./mana-worklet.js',import.meta.url));
      this.node=new AudioWorkletNode(this.context,'mana-acquire-r01',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.master=this.context.createGain();this.master.gain.value=this.muted?0:this.volume;
      this.node.connect(this.master).connect(this.context.destination);
      const bank=synthesizeMana(this.context.sampleRate);
      this.node.port.postMessage({type:'bank',bank},[bank.left.buffer,bank.right.buffer]);
    }
    return this.context.state;
  }
  begin(voice){
    if(!this.node||this.context.state!=='running'||this.disposed){this.stats.skipped++;return false;}
    this.node.port.postMessage({type:'begin',voice});this.stats.started++;return true;
  }
  sync(voice){this.node?.port.postMessage({type:'sync',voice});}
  cancel(id){this.node?.port.postMessage({type:'cancel',id});}
  reset(){this.node?.port.postMessage({type:'reset'});}
  setVolume(value){if(!Number.isFinite(value))throw new TypeError('Finite volume required');this.volume=Math.max(0,Math.min(1,value));this._gain();}
  setMuted(value){this.muted=!!value;this._gain();}
  _gain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.008);}
  async dispose(){if(this.disposed)return;this.disposed=true;this.reset();this.node?.disconnect();await this.context?.close();}
}
