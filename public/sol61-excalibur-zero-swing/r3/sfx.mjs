export const SFX_EDITION='excalibur-zero-swing-sol61-r3-sfx';
export const AUDIO_CUES=Object.freeze([{id:'gather',atMs:0,durationMs:230},{id:'receive',atMs:124,durationMs:226.5},{id:'swing',atMs:240,durationMs:156},{id:'release',atMs:350.5,durationMs:299.5}]);
/** Fresh edition PCM synthesis, no reused asset or old Excalibur sound recipe. */
export function synthesizeCue(kind,sampleRate=48000){
 const cue=AUDIO_CUES.find(x=>x.id===kind);if(!cue||!Number.isFinite(sampleRate)||sampleRate<8000)throw new TypeError('known cue and sample rate required');
 const pcm=new Float32Array(Math.ceil(cue.durationMs*sampleRate/1000));let seed=kind==='gather'?8173:kind==='swing'?29741:51749,filtered=0,phase=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate,u=i/Math.max(1,pcm.length-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
  let sample=0;
  if(kind==='gather'){
   filtered+=.12*(noise-filtered);phase+=2*Math.PI*(480+940*u*u)/sampleRate;
   const envelope=Math.pow(Math.sin(Math.PI*u),1.15)*(.3+.7*u);
   sample=envelope*(.115*filtered+.046*Math.sin(phase)+.027*Math.sin(phase*1.417));
  }else if(kind==='receive'){
   const beat=Math.floor(t*1000/16);const local=(t*1000-beat*16)/16;const arrivals=beat<7?Math.sin(Math.PI*local)*Math.exp(-local*3):0;const envelope=Math.sin(Math.PI*u)*Math.exp(-u*2.0)*.55+arrivals*.45;
   sample=envelope*(.060*Math.sin(2*Math.PI*972*t)+.025*Math.sin(2*Math.PI*1471*t));
  }else if(kind==='swing'){
   filtered+=(.55-.44*u)*(noise-filtered);
   const high=noise-filtered;const envelope=Math.pow(Math.sin(Math.PI*u),.72)*Math.exp(-u*1.0);
   sample=envelope*(.16*high+.06*filtered);
  }else{
   filtered+=.23*(noise-filtered);const attack=Math.min(1,t/.004);const finite=Math.pow(1-u,1.5);
   const ring=Math.sin(2*Math.PI*1180*t)*Math.exp(-t*18)+.42*Math.sin(2*Math.PI*1703*t)*Math.exp(-t*24);
   sample=attack*finite*(.09*ring+.105*filtered*Math.exp(-t*8));
  }
  pcm[i]=sample;
 }
 pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
}

export class ExcaliburSfxAdapter {
 constructor({verify=false,audioContextFactory=()=>new AudioContext()}={}){this.verify=verify;this.factory=audioContextFactory;this.context=null;this.enabled=false;this.causes=new Map();this.sources=new Map();this.buffers=new Map();}
 async enableFromGesture(){if(this.verify)return false;if(!this.context){this.context=this.factory();for(const cue of AUDIO_CUES){const pcm=synthesizeCue(cue.id,this.context.sampleRate),b=this.context.createBuffer(1,pcm.length,this.context.sampleRate);b.copyToChannel(pcm,0);this.buffers.set(cue.id,b);}}await this.context.resume();this.enabled=true;return true;}
 setEnabled(enabled){this.enabled=enabled===true&&!this.verify;if(!this.enabled)for(const id of this.sources.keys())this.cancelCause(id);}
 onMotionSample({causeId,ageMs,clock}){
  if(this.verify||!this.enabled||!this.context||clock.causeId!==causeId)return;
  const previous=this.causes.get(causeId),prior=previous?.ageMs??ageMs;
  const state=previous||{ageMs,fired:new Set()};
  // Holding/scrubbing backward never recreates a cause or repeats a sound.
  for(const cue of AUDIO_CUES){
   const crosses=previous?prior<cue.atMs&&ageMs>=cue.atMs:cue.atMs===0&&ageMs<=12;
   if(crosses&&!state.fired.has(cue.id)){state.fired.add(cue.id);if(ageMs-cue.atMs<=45){const src=this.context.createBufferSource();src.buffer=this.buffers.get(cue.id);src.connect(this.context.destination);const owned=this.sources.get(causeId)||new Set();owned.add(src);this.sources.set(causeId,owned);src.onended=()=>{owned.delete(src);if(!owned.size)this.sources.delete(causeId);src.disconnect();};src.start(this.context.currentTime);}}
  }
  state.ageMs=Math.max(prior,ageMs);this.causes.set(causeId,state);
 }
 cancelCause(causeId){for(const src of this.sources.get(causeId)||[]){try{src.stop();}catch{}src.disconnect();}this.sources.delete(causeId);this.causes.delete(causeId);}
 async dispose(){for(const id of [...this.sources.keys()])this.cancelCause(id);this.causes.clear();this.buffers.clear();this.enabled=false;await this.context?.close();this.context=null;}
}
