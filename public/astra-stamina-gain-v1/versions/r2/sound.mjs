import {DURATION_MS} from './runtime.mjs';
const smooth=(a,b,t)=>{const v=Math.max(0,Math.min(1,(t-a)/(b-a)));return v*v*(3-2*v);};
// A single deterministic breath-to-body phrase, not a looping oscillator cue.
export function synthesize(sampleRate=48000){
 const data=new Float32Array(Math.ceil(sampleRate*DURATION_MS/1000));let seed=9191,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)|0;
  const noise=(seed>>>0)/2147483648-1;low+=.065*(noise-low);
  const intake=smooth(0,.045,t)*(1-smooth(.38,.58,t));
  const seat=smooth(.50,.58,t)*(1-smooth(.84,1.22,t));
  const tail=1-smooth(1.19,1.38,t);
  const phase=2*Math.PI*(128*t+54*t*t-12*t*t*t);
  const body=Math.sin(phase)+.35*Math.sin(phase*1.503)+.12*Math.sin(phase*2.997);
  const contact=Math.sin(2*Math.PI*310*t)*Math.exp(-Math.pow((t-.56)/.055,2));
  data[i]=tail*(intake*low*.42+seat*body*.095+contact*.025);
 }return data;
}
export class StaminaSound{
 constructor({verify=false}={}){this.verify=verify;this.context=null;this.voices=new Map();this.starts=0;}
 async unlock(){if(this.verify)return false;this.context??=new AudioContext();await this.context.resume();return this.context.state==='running';}
 play(cue){
  if(this.verify||!this.context||this.context.state!=='running'||this.voices.has(cue.id)||!Number.isFinite(cue.rate)||cue.rate<0)return false;
  const c=this.context,node=c.createBufferSource(),gain=c.createGain();
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*DURATION_MS/1000),c.sampleRate);buffer.copyToChannel(synthesize(c.sampleRate),0);
  node.buffer=buffer;node.playbackRate.value=cue.rate;gain.gain.value=.65/(this.voices.size+1);node.connect(gain);gain.connect(c.destination);
  for(const v of this.voices.values())v.gain.gain.setValueAtTime(.65/(this.voices.size+1),c.currentTime);
  node.start(0,Math.min(cue.elapsedMs/1000,buffer.duration));this.starts++;this.voices.set(cue.id,{node,gain});
  node.onended=()=>{node.disconnect();gain.disconnect();if(this.voices.get(cue.id)?.node===node)this.voices.delete(cue.id);for(const v of this.voices.values())v.gain.gain.setTargetAtTime(.65/this.voices.size,c.currentTime,.025);};return true;
 }
 sync(plans){const ids=new Set(plans.map(p=>p.id));for(const[id,v]of this.voices){const p=plans.find(p=>p.id===id);if(!ids.has(id)||!p){v.node.stop();this.voices.delete(id);}else v.node.playbackRate.setValueAtTime(p.rate,this.context.currentTime);}}
 stop(){for(const v of this.voices.values())v.node.stop();this.voices.clear();}
 async dispose(){this.stop();if(this.context)await this.context.close();}
}
