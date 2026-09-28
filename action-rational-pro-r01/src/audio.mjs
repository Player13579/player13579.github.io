import {EFFECTS} from './contract.mjs';
import {synthesizeSFX} from './sfx-synth.mjs';
export class ActorAudio {
  constructor(clock){this.clock=clock;this.context=null;this.node=null;this.sent=new Set();this.events=new Map();this.enabled=false;this.muted=true;this.unlocking=null;}
  async enable(){
    if(this.unlocking)return this.unlocking;
    this.unlocking=this.#enable();
    try{return await this.unlocking;}finally{this.unlocking=null;}
  }
  async #enable(){
    if(!this.context){
      this.context=new AudioContext({latencyHint:'interactive'});
      await this.context.audioWorklet.addModule(new URL('./sfx-worklet.mjs',import.meta.url));
      this.node=new AudioWorkletNode(this.context,'dva-actor-sfx',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.gain=this.context.createGain();this.gain.gain.value=0;
      this.node.connect(this.gain);this.gain.connect(this.context.destination);
      for(const eventId of Object.keys(EFFECTS)){const pcm=synthesizeSFX(eventId,48000);this.node.port.postMessage({kind:'bank',eventId,pcm});}
    }
    await this.context.resume();this.enabled=true;this.muted=false;this.sync();
    this.gain.gain.setTargetAtTime(.32,this.context.currentTime,.006);
    for(const event of this.events.values())this.#send(event);
  }
  accept(event){this.events.set(event.causeId,event);this.#send(event);}
  #send(event){
    if(!this.node||this.sent.has(event.causeId))return;
    const now=this.clock.now(event.playerId);
    if(now>=event.actorStartMs+1200){this.sent.add(event.causeId);return;}
    this.sync();this.sent.add(event.causeId);this.node.port.postMessage({kind:'event',event});
  }
  sync(){
    if(!this.node)return;
    // GPU待ちとは独立。出力デバイスの実遅延ゼロは保証しない。
    const ids=new Set([...this.events.values()].map(e=>e.playerId));
    for(const playerId of ids){
      const snap=this.clock.snapshot(playerId);
      this.node.port.postMessage({kind:'clock',playerId,clock:{...snap,audioSec:this.context.currentTime}});
    }
  }
  setMuted(muted){this.muted=muted;if(this.gain)this.gain.gain.setTargetAtTime(muted?0:.32,this.context.currentTime,.006);}
  async destroy(){this.node?.port.postMessage({kind:'clear'});this.node?.disconnect();await this.context?.close();}
}
