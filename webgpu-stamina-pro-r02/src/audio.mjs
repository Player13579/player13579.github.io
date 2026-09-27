export class StaminaAudio {
 constructor(){this.enabled=false;this.error=null;this.stats={voiceStarts:0,voiceEnds:0,activeVoices:0,duplicateCommands:0,rejected:0,watchdogStops:0};this.context=null;this.node=null;}
 async enable(){
  if(!this.context){
   this.context=new AudioContext({latencyHint:'interactive'});
   await this.context.audioWorklet.addModule(new URL('./audio-worklet.mjs',import.meta.url));
   this.node=new AudioWorkletNode(this.context,'reserve-stamina-r02',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
   this.node.port.onmessage=({data})=>{if(data?.type==='stats')this.stats={...data};};
   this.node.onprocessorerror=()=>{this.error='AudioWorklet processor error';this.enabled=false;};
   this.node.connect(this.context.destination);
  }
  await this.context.resume();this.enabled=this.context.state==='running';return this.enabled;
 }
 sync(samples){if(!this.enabled||!this.node)return;this.node.port.postMessage({type:'sync',audioTime:this.context.currentTime,items:samples.map(s=>({key:s.key,ageMs:s.ageMs,durationMs:s.durationMs,seed:s.seed,rate:s.rate??1}))});}
 cancel(){this.node?.port.postMessage({type:'cancel'});}
 resetEpoch(){this.node?.port.postMessage({type:'resetEpoch'});}
 async mute(){this.cancel();this.enabled=false;/* Allow the processor's short release; context stays available. */}
 async dispose(){this.enabled=false;this.node?.disconnect();await this.context?.close();}
}
