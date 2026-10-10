export const SFX_VERSION='item-use-e-sfx-sol61-r3';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function generateUsePcm({sampleRate=48000,seed=0x67135e}={}){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate [8000,192000]');
 // Synthetic dry split, aperture release and capacity exhaustion, no pitch sweep.
 const duration=.56,pcm=new Float32Array(Math.ceil(duration*sampleRate));let n=seed>>>0,low=0,mid=0,body=0;
 const poleLow=1-Math.exp(-2*Math.PI*340/sampleRate),poleMid=1-Math.exp(-2*Math.PI*2800/sampleRate);
 const poleBody=1-Math.exp(-2*Math.PI*95/sampleRate);
 for(let i=0;i<pcm.length;i++){
  n^=n<<13;n^=n>>>17;n^=n<<5;const white=(n>>>0)/2147483648-1,t=i/sampleRate;
  low+=poleLow*(white-low);mid+=poleMid*(white-mid);body+=poleBody*(white-body);
  const attack=smooth(t/.008),tail=1-smooth((t-.50)/.06);
  const split=Math.exp(-Math.pow((t-.075)/.029,2));
  const open=Math.exp(-Math.pow((t-.180)/.057,2));
  const use=smooth((t-.245)/.045)*(1-smooth((t-.47)/.055));
  const exhaust=Math.exp(-Math.pow((t-.488)/.018,2));
  // The moving visual boundary has a sustained friction-like band that thins to a stop.
  // A short material response is colored noise, not an unrelated musical confirmation.
  const abrasion=(mid-low)*(.36*split+.24*open+.34*use*(1-smooth((t-.33)/.18)));
  const dry=(white-mid)*(.035*split+.045*exhaust);
  const cavity=(low-body)*(.40*open+.26*use);
  pcm[i]=(abrasion+dry+cavity)*attack*tail;
 }
 return {version:SFX_VERSION,sampleRate,duration,pcm};
}
export function createUseSfx({context,verify=false,masterGain=.30,maxVoices=8}={}){
 if(!context||typeof context.createBuffer!=='function')throw TypeError('owned AudioContext required');
 if(!Number.isFinite(masterGain)||masterGain<0||masterGain>1||!Number.isInteger(maxVoices)||maxVoices<1||maxVoices>32)throw RangeError('bounded gain/voices');
 const out=context.createGain();out.gain.value=verify?0:masterGain;out.connect(context.destination);const seen=new Set(),voices=new Map();let disposed=false,muted=false;
 function stop(id){const v=voices.get(id);if(!v)return;voices.delete(id);v.source.onended=()=>{v.source.disconnect();v.gain.disconnect();};v.gain.gain.cancelScheduledValues(context.currentTime);v.gain.gain.setValueAtTime(v.gain.gain.value,context.currentTime);v.gain.gain.linearRampToValueAtTime(0,context.currentTime+.010);try{v.source.stop(context.currentTime+.012);}catch{v.source.onended();}}
 return Object.freeze({
  play({causeId,ageMs=0,visible=true,distance=0}={}){if(disposed||verify||muted||!visible||context.state!=='running')return {played:false,reason:verify?'verify-zero':'not-ready'};if(typeof causeId!=='string'||!causeId||!Number.isFinite(ageMs)||ageMs<0||!Number.isFinite(distance)||distance<0)throw TypeError('same-cause audio input');if(seen.has(causeId))return {played:false,reason:'duplicate'};if(voices.size>=maxVoices)return {played:false,reason:'capacity'};const sample=generateUsePcm({sampleRate:context.sampleRate});if(ageMs>=sample.duration*1000)return {played:false,reason:'expired'};
   const buffer=context.createBuffer(1,sample.pcm.length,sample.sampleRate);buffer.getChannelData(0).set(sample.pcm);const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=1/Math.sqrt(1+distance*distance);source.connect(gain);gain.connect(out);source.onended=()=>{if(voices.get(causeId)?.source!==source)return;voices.delete(causeId);source.disconnect();gain.disconnect();};seen.add(causeId);if(seen.size>512)seen.delete(seen.values().next().value);voices.set(causeId,{source,gain});source.start(context.currentTime,ageMs/1000);return {played:true,causeId,offset:ageMs/1000};},
  cancel:stop,stopAll(){for(const id of [...voices.keys()])stop(id);},setMuted(v){muted=Boolean(v);out.gain.setValueAtTime(verify||muted?0:masterGain,context.currentTime);},dispose(){if(disposed)return;disposed=true;for(const id of [...voices.keys()])stop(id);out.disconnect();seen.clear();},snapshot(){return {disposed,verify,muted,voices:voices.size};}
 });
}
