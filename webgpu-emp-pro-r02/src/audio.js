import {synthesizeBank,SFX_SPEC} from './synthesis.js';
import {CONTRACT,point,finite,soundKey} from './contract.js';
export class EMPSound{
 constructor(){this.context=null;this.node=null;this.volume=.6;this.listener={x:0,y:0};this.fired=new Map();this.ids=new Map();this.serial=0;this.stats={queued:0,duplicateCauses:0,skippedBeforeUnlock:0,worklet:null};}
 async unlock(){if(!this.context){this.context=new AudioContext({latencyHint:'interactive'});try{await this.context.audioWorklet.addModule(new URL('./audio-worklet.js',import.meta.url));this.node=new AudioWorkletNode(this.context,'emp-actor-r02',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});this.node.connect(this.context.destination);this.node.port.onmessage=({data:d})=>{if(d.type==='stats'&&d.serial===this.serial)this.stats.worklet=d;};for(const kind of Object.keys(SFX_SPEC)){const bank=synthesizeBank(kind,this.context.sampleRate);this.node.port.postMessage({type:'bank',bank},[bank.body.buffer,bank.tail.buffer]);}this.node.port.postMessage({type:'reset',serial:this.serial});this.setListener(this.listener);this.setVolume(this.volume);}catch(e){await this.context.close();this.context=null;this.node=null;throw e;}}await this.context.resume();return this.context.state;}
 emit(e){if(e.binding.sound===false)return;const key=soundKey(e);if(this.fired.has(key)){this.ids.set(e.id,this.fired.get(key));this.stats.duplicateCauses++;return;}
  this.fired.set(key,e.id);this.ids.set(e.id,e.id);if(!this.node){this.stats.skippedBeforeUnlock++;return;}this.stats.queued++;
  this.node.port.postMessage({type:'voice',serial:this.serial,voice:{id:e.id,key,kind:e.kind,atMs:e.atMs,deadlineMs:e.binding.authorityDeadlineMs??null,resolveMs:null,origin:e.attachment,range:CONTRACT.audioRange[e.kind]}});
 }
 resolve(e){this.node?.port.postMessage({type:'resolve',serial:this.serial,id:this.ids.get(e.id)??e.id,atMs:e.resolution.atMs});}
 extend(e){const u=e.updates.at(-1);this.node?.port.postMessage({type:'extend',serial:this.serial,id:this.ids.get(e.id)??e.id,atMs:u.atMs,deadlineMs:u.authorityDeadlineMs});}
 move(id,p){this.node?.port.postMessage({type:'move',serial:this.serial,id:this.ids.get(id)??id,position:point(p)});}
 clock(actorMs,rate){this.node?.port.postMessage({type:'clock',actorMs,rate,contextTime:this.context.currentTime});}
 setListener(p){this.listener=point(p);this.node?.port.postMessage({type:'listener',position:this.listener});}
 setVolume(v){finite(v);this.volume=Math.max(0,Math.min(1,v));this.node?.port.postMessage({type:'volume',value:this.volume});}
 reset(){this.serial++;this.fired.clear();this.ids.clear();this.stats={queued:0,duplicateCauses:0,skippedBeforeUnlock:0,worklet:null};this.node?.port.postMessage({type:'reset',serial:this.serial});}
 async dispose(){await this.context?.close();this.context=null;this.node=null;}
}
