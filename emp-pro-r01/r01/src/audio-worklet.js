/** Audio actor-time sampler. Same event buffer = one causal sound, not one sound per frame. */
class EMPActorAudio extends AudioWorkletProcessor {
  constructor() {
    super();this.buffers={};this.voices=[];this.anchorMs=0;this.anchorContext=0;this.rate=1;
    this.listener={x:0,y:0};this.volume=.65;this.pausedGain=1;this.serial=0;
    this.port.onmessage=({data:d})=>{
      if(d.type==='buffer')this.buffers[d.kind]={samples:d.samples,sampleRate:d.sampleRate};
      if(d.type==='clock'){this.anchorMs=d.actorMs;this.anchorContext=d.contextTime;this.rate=d.rate;}
      if(d.type==='listener')this.listener=d.position;
      if(d.type==='move'){const v=this.voices.find(v=>v.id===d.id);if(v)v.origin=d.position;}
      if(d.type==='volume')this.volume=d.value;
      if(d.type==='clear'){this.voices=[];this.serial=d.serial;}
      if(d.type==='voice'&&d.serial===this.serial){
        if(this.voices.length>=64)this.voices.shift();
        this.voices.push(d.voice);
      }
    };
  }
  process(inputs,outputs) {
    const output=outputs[0];if(!output||!output[0])return true;
    const L=output[0],R=output[1]??output[0];
    const startActor=this.anchorMs+(currentTime-this.anchorContext)*this.rate*1000;
    this.voices=this.voices.filter(v=>!this.buffers[v.kind]||startActor-v.atMs<this.buffers[v.kind].samples.length/this.buffers[v.kind].sampleRate*1000);
    for(let i=0;i<L.length;i++){
      let left=0,right=0;const actorMs=startActor+i/sampleRate*this.rate*1000;
      for(const v of this.voices){
        const b=this.buffers[v.kind];if(!b)continue;
        const idx=(actorMs-v.atMs)/1000*b.sampleRate;if(idx<0||idx>=b.samples.length-1)continue;
        const k=Math.floor(idx),f=idx-k;const sample=b.samples[k]*(1-f)+b.samples[k+1]*f;
        const dx=v.origin.x-this.listener.x,dy=v.origin.y-this.listener.y;
        const t=Math.min(1,Math.hypot(dx,dy)/v.range);
        const gain=(1-t*t)*(1-t*t)/(1+6*t*t);
        const pan=Math.max(-1,Math.min(1,dx/600));
        left+=sample*gain*Math.cos((pan+1)*Math.PI/4);right+=sample*gain*Math.sin((pan+1)*Math.PI/4);
      }
      this.pausedGain+=((this.rate===0?0:1)-this.pausedGain)*.015;
      L[i]=Math.tanh(left*this.volume)*.90*this.pausedGain;
      R[i]=Math.tanh(right*this.volume)*.90*this.pausedGain;
    }
    return true;
  }
}
registerProcessor('emp-actor-audio',EMPActorAudio);
