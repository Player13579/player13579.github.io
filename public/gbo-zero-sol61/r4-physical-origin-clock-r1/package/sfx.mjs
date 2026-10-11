// R4: mechanically excited receiver contacts, finite seating friction and release.
// Synthetic modal response; frequencies/decays are design approximations for a
// small rigid receiver with a spring latch, not measured material coefficients.
export function gboPCM(rate,stage){
 if(!Number.isFinite(rate)||rate<8000||rate>192000||!['magazine-commit','weapon-retirement'].includes(stage))throw new RangeError('GBO PCM input');
 const retired=stage==='weapon-retirement',duration=retired?.52:.64;
 const data=new Float32Array(Math.ceil(rate*duration));let seed=0x71b041,low=0,frictionLow=0;
 const decay=(age,tau)=>age<0?0:Math.exp(-age/tau);
 const modes=(age,frequencies,decays,weights)=>{
  if(age<0)return 0;
  // Low-rate output omits an unresolvable mode instead of aliasing or changing
  // its frequency. The contact noise and lower body modes remain present.
  let value=0;for(let k=0;k<frequencies.length;k++){if(frequencies[k]<rate*.45)value+=Math.sin(2*Math.PI*frequencies[k]*age)*decay(age,decays[k])*weights[k];}return value;
 };
 for(let i=0;i<data.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=seed/2147483648-1;
  // Time constants remain the same at every output sample rate.
  low+= (1-Math.exp(-2*Math.PI*950/rate))*(noise-low);
  frictionLow+=(1-Math.exp(-2*Math.PI*3100/rate))*(noise-frictionLow);
  const contactNoise=noise-low,frictionBand=frictionLow-low;
  let value=0;
  if(!retired){
   // Receipt boundary: receiver contact excites a broadband tap and inharmonic
   // rigid-body modes. These decay from the contact; there is no pitch glide.
   const impact=contactNoise*.23*decay(t,.010);
   const receiver=modes(t,[680,1280,2470],[.037,.021,.012],[.090,.060,.034]);
   // Registered magazine->receiver seating interval. Friction is finite and
   // falls to zero at the jaw closure rather than running under the whole E.
   const travel=Math.min(1,t/.012)*Math.max(0,1-t/.180);
   const friction=frictionBand*.105*travel;
   // One spring-latch capture at the existing 160ms lock phase. Broadband
   // contact plus short unequal modes replace the old Gaussian 470Hz beep.
   const latchAge=t-.160;
   const latchNoise=contactNoise*.28*decay(latchAge,.0055);
   const latchModes=modes(latchAge,[1140,2630,4170],[.018,.010,.006],[.080,.046,.025]);
   value=impact+receiver+friction+latchNoise+latchModes;
  }else{
   // Retirement boundary unloads the registered receiver latch. A compact
   // spring/receiver knock communicates release, not firing or shattering.
   const release=contactNoise*.25*decay(t,.009);
   const releasedModes=modes(t,[430,1190,2260],[.055,.028,.014],[.095,.050,.029]);
   // The central support disengages during the existing 90..280ms cut. One
   // quieter contact at110ms and finite settling friction provide its response;
   // the following emissive withdrawal is not assigned a fabricated scrape.
   const disengageAge=t-.110;
   const disengage=contactNoise*.10*decay(disengageAge,.007)+modes(disengageAge,[740,1710],[.023,.012],[.033,.022]);
   const settling=frictionBand*.028*Math.min(1,t/.008)*decay(t,.070);
   value=release+releasedModes+disengage+settling;
  }
  const attack=Math.min(1,t/.0015),end=Math.max(0,Math.min(1,(duration-t)/.025));
  data[i]=value*attack*end;
 }
 return data;
}

export class GboSound{
 constructor({verify=false,contextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=contextFactory;this.context=null;this.muted=verify;this.voices=new Set();this.played=new Set();this.disposed=false;this.status=verify?'verify-hard-muted':'locked';}
 async enable(){if(this.verify||this.disposed)return false;this.context??=this.factory();await this.context.resume();if(this.disposed)return false;this.status=this.context.state==='running'?'enabled':'locked';return this.status==='enabled';}
 setMuted(value){this.muted=this.verify||Boolean(value);if(this.muted)this.stop();return !this.muted;}
 play(receipt,current){
  const now=performance.now(),origin=current?.startedAt,initialAge=now-origin;
  if(this.verify||this.muted||this.disposed||this.context?.state!=='running'||!receipt.completed||!receipt.source||receipt.cause!==current.cause||receipt.generation!==current.generation||current.mode!=='playing'||!Number.isFinite(receipt.ageMs)||receipt.ageMs<0||receipt.ageMs>70||!Number.isFinite(current.ageMs)||current.ageMs<0||current.ageMs>90||!Number.isFinite(origin)||!Number.isFinite(initialAge)||initialAge<0||initialAge>90||this.played.has(receipt.cause))return false;
  const context=this.context,data=gboPCM(context.sampleRate,receipt.stage),buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.getChannelData(0).set(data);const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=buffer;gain.gain.value=.46;voice.connect(gain);gain.connect(context.destination);
  voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};
  const finalAge=performance.now()-origin;
  if(!Number.isFinite(finalAge)||finalAge<0||finalAge>90||finalAge>=buffer.duration*1000||this.verify||this.muted||this.disposed||context.state!=='running'){voice.disconnect();gain.disconnect();return false;}
  voice.start(0,finalAge/1000);this.voices.add(voice);this.played.add(receipt.cause);return true;
 }
 stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 async dispose(){if(this.disposed)return;this.disposed=true;this.stop();await this.context?.close();this.status='disposed';}
}
