export function makeHeadshotPCM(rate,cause){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw new RangeError('sample rate');
 const data=new Float32Array(Math.ceil(rate*.32));let seed=(0x51ad+Number(cause))>>>0,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const white=seed/2147483648-1;low=.82*low+.18*white;
  const attack=Math.min(1,t/.0015);
  const dry=(white-low)*Math.exp(-t/0.017)*attack;
  const body=(Math.sin(2*Math.PI*190*t)+.24*Math.sin(2*Math.PI*410*t))*Math.exp(-t/.048)*attack;
  const contact=low*Math.exp(-t/.035)*attack;
  const tail=1-Math.min(1,Math.max(0,(t-.24)/.08));
  data[i]=(.31*dry+.12*body+.11*contact)*tail;
 }
 return data;
}
export class HeadshotSound{
 constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=contextFactory;this.context=null;this.muted=verify;this.voices=new Set();this.played=new Set();this.status=verify?'verify-hard-muted':'locked';this.disposed=false;}
 async enable(){if(this.verify||this.disposed)return false;try{this.context??=this.factory();await this.context.resume();if(this.disposed)return false;this.status=this.context.state==='running'?'enabled':'locked';return this.status==='enabled';}catch(e){this.status='audio-retry-available';return false;}}
 setMuted(value){this.muted=this.verify||Boolean(value);if(this.muted)this.stop();return !this.muted;}
 play(receipt,current){
  if(this.verify||this.muted||this.disposed||this.context?.state!=='running'||!receipt.active||receipt.source===false||current.mode!=='playing'||receipt.cause!==current.cause||receipt.generation!==current.generation||receipt.ageMs>70||current.ageMs>90||this.played.has(receipt.cause))return false;
  let source,gain;
  try{
   const ctx=this.context;const rate=ctx.sampleRate;const pcm=makeHeadshotPCM(rate,receipt.cause);const buffer=ctx.createBuffer(1,pcm.length,rate);buffer.getChannelData(0).set(pcm);
   source=ctx.createBufferSource();gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.38;source.connect(gain);gain.connect(ctx.destination);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start(0,Math.max(0,current.ageMs)/1000);this.voices.add(source);this.played.add(receipt.cause);return true;
  }catch{
   try{source?.stop();source?.disconnect();gain?.disconnect();}catch{}
   this.voices.delete(source);this.status='audio-retry-available';return false;
  }
 }
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 async dispose(){this.disposed=true;this.stop();if(this.context)await this.context.close();this.status='disposed';}
}
