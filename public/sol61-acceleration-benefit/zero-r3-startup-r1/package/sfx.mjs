export function makeAccelerationPCM(rate,cause){
 const data=new Float32Array(Math.ceil(rate*.95));let low=0,seed=113+cause;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const white=seed/2147483648-1;low=.89*low+.11*white;const air=white-low;
  let pressure=0,contact=0;
  for(const onset of [0,.18]){
   const dt=t-onset;if(dt<0)continue;
   pressure+=Math.min(1,dt/.016)*Math.exp(-dt*5.8)*(.7+.3*Math.sin(Math.PI*Math.min(1,dt/.55)));
   contact+=(Math.sin(2*Math.PI*170*dt)+.28*Math.sin(2*Math.PI*390*dt))*Math.min(1,dt/.002)*Math.exp(-dt*65);
  }
  const terminal=Math.min(1,(.95-t)/.1);
  data[i]=(.14*air*pressure+.038*contact)*terminal;
 }
 return data;
}
export class AccelerationSound{
 constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=contextFactory;this.context=null;this.muted=verify;this.voices=new Set();this.played=new Set();this.status=verify?'verify-hard-muted':'locked';this.disposed=false;}
 async enable(){if(this.verify||this.disposed)return false;try{this.context??=this.factory();await this.context.resume();if(this.disposed)return false;this.status=this.context.state==='running'?'enabled':'locked';return this.status==='enabled';}catch(e){this.status='audio-retry-available';return false;}}
 setMuted(value){this.muted=this.verify||Boolean(value);if(this.muted)this.stop();return !this.muted;}
 play(receipt,current){
  if(this.verify||this.muted||this.disposed||this.context?.state!=='running'||!receipt.active||receipt.source===false||current.mode!=='playing'||receipt.cause!==current.cause||receipt.generation!==current.generation||receipt.ageMs>120||current.ageMs>160||this.played.has(receipt.cause))return false;
  let source,gain;
  try{
   const ctx=this.context;const rate=ctx.sampleRate;const pcm=makeAccelerationPCM(rate,receipt.cause);const buffer=ctx.createBuffer(1,pcm.length,rate);buffer.getChannelData(0).set(pcm);
   source=ctx.createBufferSource();gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.38;source.connect(gain);gain.connect(ctx.destination);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();this.voices.add(source);this.played.add(receipt.cause);return true;
  }catch{
   try{source?.stop();source?.disconnect();gain?.disconnect();}catch{}
   this.voices.delete(source);this.status='audio-retry-available';return false;
  }
 }
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 async dispose(){this.disposed=true;this.stop();if(this.context)await this.context.close();this.status='disposed';}
}
