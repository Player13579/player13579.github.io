import {VoiceBank} from './sound.mjs';
class ReserveProcessor extends AudioWorkletProcessor {
 constructor(){
  super();this.bank=new VoiceBank({sampleRate});this.blocks=0;
  this.port.onmessage=({data})=>{
   if(data?.type==='sync')this.bank.sync(data.items,data.audioTime);
   if(data?.type==='cancel')this.bank.cancel();
   if(data?.type==='resetEpoch')this.bank.resetEpoch();
  };
 }
 process(inputs,outputs){
  const out=outputs[0];if(out?.length>=2)this.bank.process(out[0],out[1],currentTime);
  if(++this.blocks%16===0)this.port.postMessage({type:'stats',...this.bank.stats});
  return true;
 }
}
registerProcessor('reserve-stamina-r02',ReserveProcessor);
