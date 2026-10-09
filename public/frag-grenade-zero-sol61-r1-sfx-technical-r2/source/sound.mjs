import {DURATION_MS,fragmentContactTimes} from './plan.mjs';
export const SOUND_DURATION=.84;
export const METAL_CONTACT_TIMES=Object.freeze(fragmentContactTimes().slice(0,4));
export function renderPCM(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<22050||sampleRate>192000)throw new RangeError('sample rate 22050..192000');
 const output=new Float32Array(Math.round(sampleRate*SOUND_DURATION));
 let seed=0x4a891cf1,slow=0,medium=0,old=0,dc=0;
 const lp=1-Math.exp(-2*Math.PI*160/sampleRate),mp=1-Math.exp(-2*Math.PI*1700/sampleRate),pole=Math.exp(-2*Math.PI*23/sampleRate);
 for(let i=0;i<output.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;slow+=lp*(n-slow);medium+=mp*(n-medium);
  const high=n-medium,band=medium-slow;
  // Shell fracture at contact, compact pressure impulse then filtered dust.
  const crack=(high*.51+band*.30)*Math.exp(-t/0.013);
  const pressure=(Math.sin(2*Math.PI*(91*t-37*t*t))*.48+slow*.33)*Math.exp(-t/.13);
  const tail=band*.17*Math.exp(-t/.20)*(1-Math.exp(-t/.008));
  // Sparse metal contacts follow the authored fragment flight; no music/tone.
  let contacts=0;for(const hit of METAL_CONTACT_TIMES){const dt=t-hit;if(dt>=0)contacts+=(high*.068+Math.sin(2*Math.PI*(710+hit*460)*dt)*.025)*Math.exp(-dt/.017);}
  const attack=Math.min(1,t/.0007),release=Math.min(1,(output.length-1-i)/(sampleRate*.055));
  const value=(crack+pressure+tail+contacts)*attack*release;
  dc=value-old+pole*dc;old=value;output[i]=dc;
 }
 let peak=0;for(const x of output)peak=Math.max(peak,Math.abs(x));
 for(let i=0;i<output.length;i++)output[i]*=peak>0?.69/peak:0;
 output[0]=0;output[output.length-1]=0;return output;
}
export class FragSound{
 constructor({verify=false}={}){this.verify=verify;this.context=null;this.master=null;this.played=new Set();this.voices=new Set();this.disposed=false;this.epoch=0;this.attempts=0;this.starts=0;this.errors=[];}
 async activate(){if(this.verify||this.disposed)return false;const epoch=this.epoch;try{if(!this.context){const C=globalThis.AudioContext??globalThis.webkitAudioContext;if(!C)return false;this.context=new C();this.master=this.context.createGain();this.master.gain.value=.42;this.master.connect(this.context.destination);}if(this.context.state!=='running')await this.context.resume();return !this.disposed&&epoch===this.epoch&&this.context.state==='running';}catch(error){this.errors.push('audio activation: '+String(error.message??error));return false;}}
 play(cause,ageMs){
  this.attempts++;if(this.disposed||this.verify||!cause?.id||this.played.has(cause.id)||!Number.isFinite(ageMs)||ageMs<0||ageMs>=100||ageMs>=DURATION_MS||this.context?.state!=='running')return false;
  try {const context=this.context,source=context.createBufferSource(),gain=context.createGain();
  const pcm=renderPCM(context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.getChannelData(0).set(pcm);
  source.buffer=buffer;source.loop=false;gain.gain.value=.82;source.connect(gain);gain.connect(this.master);
  const voice={source,gain};const cleanup=()=>{if(!this.voices.delete(voice))return;source.onended=null;source.disconnect();gain.disconnect();};source.onended=cleanup;
  this.voices.add(voice);try{source.start();}catch(error){cleanup();this.errors.push(String(error.message??error));return false;}
  this.played.add(cause.id);this.starts++;return true;
  }catch(error){this.errors.push('audio construction: '+String(error.message??error));return false;}
 }
 cancel(){this.epoch++;for(const voice of [...this.voices]){try{voice.source.stop();}catch{}voice.source.onended=null;voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);}}
 snapshot(){return {verify:this.verify,state:this.context?.state??'uncreated',attempts:this.attempts,starts:this.starts,voices:this.voices.size,played:[...this.played],errors:[...this.errors]};}
 async dispose(){if(this.disposed)return;this.disposed=true;this.cancel();this.master?.disconnect();await this.context?.close();}
}
