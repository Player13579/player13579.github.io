export class AccelerationSound{
 constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=contextFactory;this.context=null;this.muted=verify;this.voices=new Set();this.played=new Set();this.status=verify?'verify-hard-muted':'locked';this.disposed=false;}
 async enable(){if(this.verify||this.disposed)return false;try{this.context??=this.factory();await this.context.resume();if(this.disposed)return false;this.status=this.context.state==='running'?'enabled':'locked';return this.status==='enabled';}catch(e){this.status='audio-retry-available';return false;}}
 setMuted(value){this.muted=this.verify||Boolean(value);if(this.muted)this.stop();return !this.muted;}
 play(receipt,current){
  if(this.verify||this.muted||this.disposed||this.context?.state!=='running'||!receipt.active||receipt.source===false||current.mode!=='playing'||receipt.cause!==current.cause||receipt.generation!==current.generation||receipt.ageMs>120||current.ageMs>160||this.played.has(receipt.cause))return false;
  this.played.add(receipt.cause);const ctx=this.context;const rate=ctx.sampleRate;const duration=.62;const buffer=ctx.createBuffer(1,Math.ceil(rate*duration),rate);const samples=buffer.getChannelData(0);
  let noise=0,seed=113+receipt.cause;
  for(let i=0;i<samples.length;i++){
    const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;noise=.83*noise+.17*white;
    const body=Math.sin(2*Math.PI*(118*t+34*t*t))*Math.exp(-t*7.5);
    const onset=(white-noise)*Math.exp(-t*35);
    const release=(white-noise)*Math.sin(Math.PI*Math.min(1,t/.62))**2*Math.exp(-t*3.8);
    // Synthetic compressed-air discharge + short actuator vibration, not a melody.
    samples[i]=.28*(.32*body+.65*onset+.8*release)*Math.min(1,t/.008);
  }
  const source=ctx.createBufferSource();const gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.38;source.connect(gain);gain.connect(ctx.destination);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};this.voices.add(source);source.start();return true;
 }
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 async dispose(){this.disposed=true;this.stop();if(this.context)await this.context.close();this.status='disposed';}
}
