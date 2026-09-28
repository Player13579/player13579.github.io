import {synthesize,SFX_SECONDS} from './synthesis.js';
import {CONTRACT,point,finite} from './contract.js';
export class EMPSound {
  constructor(){this.context=null;this.node=null;this.volume=.65;this.listener={x:0,y:0};this.fired=new Set();this.serial=0;this.stats={causalVoices:0,duplicates:0,skippedBeforeUnlock:0};}
  async unlock(){
    if(!this.context){
      this.context=new AudioContext({latencyHint:'interactive'});
      await this.context.audioWorklet.addModule(new URL('./audio-worklet.js',import.meta.url));
      this.node=new AudioWorkletNode(this.context,'emp-actor-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.node.connect(this.context.destination);
      for(const kind of Object.keys(SFX_SECONDS)){
        const samples=synthesize(kind,48000);
        this.node.port.postMessage({type:'buffer',kind,sampleRate:48000,samples},[samples.buffer]);
      }
      this.node.port.postMessage({type:'clear',serial:this.serial});
      this.setVolume(this.volume);this.setListener(this.listener);
    }
    await this.context.resume();return this.context.state;
  }
  setVolume(value){finite(value,'volume');this.volume=Math.max(0,Math.min(1,value));this.node?.port.postMessage({type:'volume',value:this.volume});}
  setListener(position){this.listener=point(position);this.node?.port.postMessage({type:'listener',position:this.listener});}
  clock(actorMs,rate){this.node?.port.postMessage({type:'clock',actorMs,rate,contextTime:this.context.currentTime});}
  emit(event){
    if(!event.sound)return;
    if(this.fired.has(event.id)){this.stats.duplicates++;return;}
    this.fired.add(event.id);
    if(!this.node){this.stats.skippedBeforeUnlock++;return;}
    this.stats.causalVoices++;
    this.node.port.postMessage({type:'voice',serial:this.serial,voice:{id:event.id,kind:event.kind,origin:event.origin,atMs:event.atMs,range:CONTRACT.audioRange[event.kind]}});
  }
  reset(){this.fired.clear();this.serial++;this.node?.port.postMessage({type:'clear',serial:this.serial});}
  async dispose(){await this.context?.close();this.context=null;this.node=null;}
}
