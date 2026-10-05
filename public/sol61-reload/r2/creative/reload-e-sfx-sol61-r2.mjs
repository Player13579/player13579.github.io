export const SFX_VERSION='reload-e-sfx-sol61-r2';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const bump=(t,at,duration)=>{const u=(t-at)/duration;return u>=0&&u<1?Math.sin(Math.PI*u)*Math.exp(-u*2.7):0;};
// 新しいR2音。幅のある受け口への移送、着座、完了ラッチの順序を一つのcauseへ結ぶ。
export function renderReloadPcm({phase,sampleRate=48000,seed=0x6212}={}){
 if(!['start','complete'].includes(phase))throw new TypeError('start/complete required');
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate [8000,192000]');
 const duration=phase==='start'?.47:.55,pcm=new Float32Array(Math.ceil(duration*sampleRate));let state=seed>>>0,low=0,mid=0,carrier=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate,u=i/Math.max(1,pcm.length-1);state=(Math.imul(state,1103515245)+12345)>>>0;const n=state/2147483648-1;
  low+=.035*(n-low);mid+=.22*(n-mid);const friction=mid-low;
  carrier+=2*Math.PI*(phase==='start'?620-180*u:470-90*u)/sampleRate;
  let value=0;
  if(phase==='start'){
   const motion=smooth(t/.018)*(1-smooth((t-.33)/.11));
   const mouth=bump(t,.018,.10);value=.17*friction*motion+.035*Math.sin(carrier)*motion+.052*Math.sin(2*Math.PI*1339*t)*mouth;
  }else{
   const seat=smooth(t/.008)*(1-smooth((t-.18)/.075));
   const settle=bump(t,.160,.15),lock=bump(t,.303,.15);
   value=.21*friction*seat+settle*(.07*Math.sin(2*Math.PI*391*(t-.160))+.034*Math.sin(2*Math.PI*1047*(t-.160)))+
    lock*(.11*Math.sin(2*Math.PI*278*(t-.303))+.105*(n-mid));
  }
  pcm[i]=value*(1-smooth((u-.88)/.12));
 }
 pcm[0]=0;pcm[pcm.length-1]=0;return Object.freeze({version:SFX_VERSION,phase,sampleRate,duration,pcm});
}
export function createReloadSfx({context,verify=false,masterGain=0.32,maxVoices=8}={}){
  if(!context||typeof context.createBuffer!=='function')throw new TypeError('owned AudioContext required');
  if(!Number.isFinite(masterGain)||masterGain<0||masterGain>1||!Number.isInteger(maxVoices)||maxVoices<1||maxVoices>32)throw new RangeError('audio gain/voice bounds');
  const emitted=new Set(),voices=new Map();let disposed=false,muted=false;
  const output=context.createGain();output.gain.value=verify?0:masterGain;output.connect(context.destination);
  const stopVoice=id=>{const v=voices.get(id);if(!v)return;voices.delete(id);
    const cleanup=()=>{v.source.disconnect();v.gain.disconnect();v.pan?.disconnect();};
    v.source.onended=cleanup;
    v.gain.gain.cancelScheduledValues(context.currentTime);v.gain.gain.setValueAtTime(v.gain.gain.value,context.currentTime);
    v.gain.gain.linearRampToValueAtTime(0,context.currentTime+0.012);
    try{v.source.stop(context.currentTime+0.014);}catch{cleanup();}
  };
  return Object.freeze({
    play({causeId,phase,visible=true,distance=0,pan=0,ageMs=0}={}){
      if(disposed||verify||muted||!visible||context.state!=='running')return {played:false,reason:disposed?'disposed':verify?'verify-zero':muted?'muted':!visible?'not-visible':'gesture-required'};
      if(typeof causeId!=='string'||!causeId||!Number.isFinite(distance)||distance<0||!Number.isFinite(pan)||Math.abs(pan)>1||!Number.isFinite(ageMs)||ageMs<0)throw new TypeError('same-cause audio source invalid');
      if(emitted.has(causeId))return {played:false,reason:'duplicate'};
      if(voices.size>=maxVoices)return {played:false,reason:'capacity'};
      const sample=renderReloadPcm({phase,sampleRate:context.sampleRate});
      if(ageMs>=sample.duration*1000)return {played:false,reason:'expired'};
      const buffer=context.createBuffer(1,sample.pcm.length,sample.sampleRate);buffer.getChannelData(0).set(sample.pcm);
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=1/Math.sqrt(1+distance*distance);
      source.connect(gain);const panner=typeof context.createStereoPanner==='function'?context.createStereoPanner():null;
      if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(output);}else gain.connect(output);
      emitted.add(causeId);if(emitted.size>256)emitted.delete(emitted.values().next().value);
      voices.set(causeId,{source,gain,pan:panner});source.onended=()=>{const v=voices.get(causeId);if(v?.source!==source)return;voices.delete(causeId);source.disconnect();gain.disconnect();panner?.disconnect();};
      source.start(context.currentTime,ageMs/1000);return {played:true,causeId,phase,offsetSeconds:ageMs/1000};
    },
    cancel(causeId){stopVoice(causeId);},
    setMuted(value){muted=Boolean(value);output.gain.setValueAtTime(verify||muted?0:masterGain,context.currentTime);},
    stopAll(){for(const id of [...voices.keys()])stopVoice(id);},
    dispose(){if(disposed)return;disposed=true;for(const id of [...voices.keys()])stopVoice(id);output.disconnect();emitted.clear();},
    snapshot(){return {version:SFX_VERSION,verify,muted,disposed,voices:voices.size,emittedCount:emitted.size};}
  });
}
