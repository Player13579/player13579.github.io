export function gboPCM(rate,stage){
 if(!Number.isFinite(rate)||rate<8000||rate>192000||!['magazine-commit','weapon-retirement'].includes(stage))throw new RangeError('GBO PCM input');
 const retired=stage==='weapon-retirement',duration=retired?.52:.64,data=new Float32Array(Math.ceil(rate*duration));let seed=0x71b041,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low=.87*low+.13*noise;
  const attack=Math.min(1,t/.003),cut=Math.max(0,Math.min(1,(duration-t)/.045));
  if(retired){
   const snap=(noise-low)*Math.exp(-t/.020)*.28;
   const phase=2*Math.PI*(360*t-180*t*t);
   data[i]=(snap+Math.sin(phase)*Math.exp(-t/.105)*.14+low*Math.exp(-t/.16)*.13)*attack*cut;
  }else{
   const latch=(noise-low)*Math.exp(-t/.018)*.17+Math.sin(2*Math.PI*620*t)*Math.exp(-t/.030)*.09;
   const body=Math.sin(2*Math.PI*(130*t+140*t*t))*.16*Math.exp(-t/.15);
   const lock=Math.sin(2*Math.PI*470*t)*Math.exp(-Math.pow((t-.16)/.045,2))*.08;
   data[i]=(latch+body+lock+low*.10*Math.exp(-t/.08))*attack*cut;
  }
 }return data;
}
export class GboSound{
 constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=contextFactory;this.context=null;this.muted=verify;this.voices=new Set();this.played=new Set();this.disposed=false;this.status=verify?'verify-hard-muted':'locked';}
 async enable(){if(this.verify||this.disposed)return false;this.context??=this.factory();await this.context.resume();if(this.disposed)return false;this.status=this.context.state==='running'?'enabled':'locked';return this.status==='enabled';}
 setMuted(value){this.muted=this.verify||Boolean(value);if(this.muted)this.stop();return !this.muted;}
 play(receipt,current){
  if(this.verify||this.muted||this.disposed||this.context?.state!=='running'||!receipt.completed||!receipt.source||receipt.cause!==current.cause||receipt.generation!==current.generation||current.mode!=='playing'||receipt.ageMs>70||current.ageMs>90||this.played.has(receipt.cause))return false;
  const context=this.context,data=gboPCM(context.sampleRate,receipt.stage),buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.getChannelData(0).set(data);const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=buffer;gain.gain.value=.46;voice.connect(gain);gain.connect(context.destination);
  voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start(0,Math.max(0,current.ageMs)/1000);this.voices.add(voice);this.played.add(receipt.cause);return true;
 }
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 async dispose(){if(this.disposed)return;this.disposed=true;this.stop();await this.context?.close();this.status='disposed';}
}
