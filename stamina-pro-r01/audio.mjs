/** Web Audio is optional; visuals never depend on sound permission or audio hardware. */
export class StaminaAudio {
  constructor(){this.context=null;this.node=null;this.enabled=false;this.telemetry={voiceStarts:0,activeVoices:0};this.error=null;}
  async enable(){
    if(this.context){await this.context.resume();this.enabled=true;return;}
    const ctx=new AudioContext({latencyHint:'interactive'});this.context=ctx;
    try{
      await ctx.audioWorklet.addModule(new URL('./audio-worklet.mjs',import.meta.url));
      this.node=new AudioWorkletNode(ctx,'stamina-e',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
      this.node.port.onmessage=({data})=>{if(data.type==='telemetry')this.telemetry=data;};
      this.node.connect(ctx.destination);await ctx.resume();this.enabled=true;
    }catch(error){this.error=String(error);this.context=null;await ctx.close();throw error;}
  }
  sync(samples){
    if(!this.node||!this.enabled)return;
    this.node.port.postMessage({type:'sync',audioTime:this.context.currentTime,events:samples.map(s=>({key:s.key,ageMs:s.ageMs,
      durationMs:s.durationMs,rate:s.rate,pan:0}))});
  }
  async mute(){this.sync([]);this.enabled=false;if(this.context)await this.context.suspend();}
  async dispose(){this.enabled=false;if(this.context)await this.context.close();this.node=null;this.context=null;}
}
