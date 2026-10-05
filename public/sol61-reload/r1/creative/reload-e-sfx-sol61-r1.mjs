export const SFX_VERSION='reload-e-sfx-sol61-r1';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function noise(seed){let n=seed>>>0;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return ((n>>>0)/2147483648)-1;};}
function impact(t,at,length){const x=(t-at)/length;return x>=0&&x<1?Math.exp(-7*x)*smooth(x/0.025)*(1-smooth((x-0.82)/0.18)):0;}
// 専用PCM: 摩擦の細い輸送音＋非整数倍の弾性共鳴。仮ビープ/銃声/素材流用ではない。
export function renderReloadPcm({phase,sampleRate=48000,seed=0x5e10ad}={}){
  if(!['start','complete'].includes(phase))throw new TypeError('start/complete required');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate [8000,192000]');
  const duration=phase==='start'?0.205:0.315;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));const rnd=noise(seed);let low=0,band=0;
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate,n=rnd();low+=0.08*(n-low);band+=0.31*(n-band);const texture=band-low;
    const frictionWindow=phase==='start'?smooth(t/0.011)*(1-smooth((t-0.105)/0.06)):smooth(t/0.008)*(1-smooth((t-0.09)/0.09));
    const resonanceAt=phase==='start'?0.014:0.078;
    const res=impact(t,resonanceAt,phase==='start'?0.14:0.19);
    const local=Math.max(0,t-resonanceAt);
    const freqs=phase==='start'?[423,1073,1817]:[318,807,1459];
    const modes=0.50*Math.sin(2*Math.PI*freqs[0]*local)+0.25*Math.sin(2*Math.PI*freqs[1]*local)*Math.exp(-17*local)+0.14*Math.sin(2*Math.PI*freqs[2]*local)*Math.exp(-31*local);
    const zip=0.09*Math.sin(2*Math.PI*(920*t-1800*t*t))*frictionWindow;
    const latch=phase==='complete'?impact(t,0.190,0.082)*(0.32*texture+0.26*Math.sin(2*Math.PI*247*(t-0.190))):0;
    const tail=1-smooth((t-duration+0.022)/0.022);
    pcm[i]=(0.23*texture*frictionWindow+0.31*modes*res+zip+latch)*tail;
  }
  return Object.freeze({version:SFX_VERSION,phase,sampleRate,duration,pcm});
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
