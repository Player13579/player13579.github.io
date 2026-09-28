import {LIMITS} from './contract.mjs';
const smooth01=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
export const SOUND=Object.freeze({durationMs:210,seed:0x5A17C09B,voiceGain:.22,masterGain:.48});
/** 新規合成: 短い接触クリック→丸い胴→摩擦音ではない拡散尾。旧音源/銃声は未使用。 */
export function synthesizeContact(sampleRate=48000){
  if(!Number.isInteger(sampleRate)||sampleRate<16000||sampleRate>192000)throw new RangeError('sampleRate');
  const out=new Float32Array(Math.ceil(sampleRate*SOUND.durationMs/1000));let rng=SOUND.seed,lo=0,hi=0;
  const al=1-Math.exp(-2*Math.PI*1100/sampleRate),ah=1-Math.exp(-2*Math.PI*6500/sampleRate);
  const modes=[[730,.28,36],[1264,.13,46],[2053,.095,62],[3479,.045,90]];
  for(let i=0;i<out.length;i++){
    const t=i/sampleRate;rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
    const noise=(rng>>>0)/2147483648-1;lo+=al*(noise-lo);hi+=ah*(noise-hi);
    const edge=(hi-lo)*(.46*Math.exp(-155*t)+.04*Math.exp(-38*t));
    let modal=0;for(const [f,g,d] of modes){const phase=2*Math.PI*(f*t+36*(1-Math.exp(-t*70))/70);modal+=g*Math.sin(phase)*Math.exp(-d*t);}
    const onset=smooth01(t/.00075),tail=1-smooth01((t-.165)/.045);
    out[i]=(edge+modal)*onset*tail;
  }
  // DC補正は音声数値の整合。視覚の発光/露光とは関係しない。
  const mean=out.reduce((a,b)=>a+b,0)/out.length;
  for(let i=0;i<out.length;i++){const w=smooth01(i/64)*smooth01((out.length-1-i)/96);out[i]=(out[i]-mean)*w;}
  out[0]=out[out.length-1]=0;return out;
}
export function pcmMetrics(a){let peak=0,energy=0,mean=0,clip=0,maxDelta=0;for(let i=0;i<a.length;i++){peak=Math.max(peak,Math.abs(a[i]));energy+=a[i]*a[i];mean+=a[i];if(Math.abs(a[i])>=1)clip++;if(i)maxDelta=Math.max(maxDelta,Math.abs(a[i]-a[i-1]));}return {frames:a.length,finite:Array.from(a).every(Number.isFinite),peak,rms:Math.sqrt(energy/a.length),mean:mean/a.length,clipSamples:clip,maxAdjacentDelta:maxDelta,first:a[0],last:a.at(-1)};}
export function encodeWav(samples,sampleRate=48000){
  const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b),text=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,b.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){if(!Number.isFinite(samples[i])||Math.abs(samples[i])>1)throw new RangeError('PCM clip/nonfinite');v.setInt16(44+i*2,Math.round(samples[i]*32767),true);}return new Uint8Array(b);
}
export class ContactAudio {
  #ctx;#master;#buffer;#voices=new Map();#seen=new Map();#fence=-Infinity;#rate=1;
  constructor({context=null}={}){if(context)this.#connect(context);}
  #connect(context){this.#ctx=context;this.#master=context.createGain();this.#master.gain.value=SOUND.masterGain;this.#master.connect(context.destination);const pcm=synthesizeContact(context.sampleRate);this.#buffer=context.createBuffer(1,pcm.length,context.sampleRate);this.#buffer.copyToChannel(pcm,0);}
  async unlock(){if(!this.#ctx){const C=globalThis.AudioContext??globalThis.webkitAudioContext;if(!C)throw new Error('Web Audio unavailable');this.#connect(new C());}await this.#ctx.resume();return this.#ctx.state;}
  get unlocked(){return this.#ctx?.state==='running';}
  get activeVoices(){return this.#voices.size;}
  play({event,ageMs=0,rate=1,pan=0}){
    if(!event||typeof event.id!=='string'||!event.id.length||!Number.isFinite(event.atMs))throw new TypeError('verified event required');
    if(!Number.isFinite(ageMs)||!Number.isFinite(rate))return false;
    this.#fence=Math.max(this.#fence,event.atMs);
    for(const [id,until] of this.#seen)if(until<this.#fence)this.#seen.delete(id);
    if(this.#seen.has(event.id)||this.#seen.size>=LIMITS.maxSeen)return false;
    this.#seen.set(event.id,event.atMs+LIMITS.wallLifetimeMs+LIMITS.arrivalTTLms); // 予約は失敗/無音/容量超過より前
    if(!this.unlocked||this.#voices.size>=LIMITS.maxVoices||ageMs<0||ageMs>=SOUND.durationMs||rate<=0||rate>LIMITS.maxRate)return false;
    const c=this.#ctx,src=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();
    src.buffer=this.#buffer;src.playbackRate.value=rate;gain.gain.value=SOUND.voiceGain;panner.pan.value=Math.max(-1,Math.min(1,Number.isFinite(pan)?pan:0));
    src.connect(gain);gain.connect(panner);panner.connect(this.#master);this.#voices.set(event.id,{src,gain,panner});
    src.onended=()=>{if(this.#voices.get(event.id)?.src===src)this.#voices.delete(event.id);src.disconnect();gain.disconnect();panner.disconnect();};
    try{src.start(c.currentTime,ageMs/1000);}catch(error){this.#voices.delete(event.id);src.disconnect();gain.disconnect();panner.disconnect();throw error;}return true;
  }
  setRate(rate){if(!Number.isFinite(rate)||rate<0||rate>LIMITS.maxRate)throw new RangeError('audio rate');if(this.#rate===rate)return;this.#rate=rate;if(!this.#ctx)return;
    for(const {src,gain} of this.#voices.values()){src.playbackRate.setValueAtTime(rate,this.#ctx.currentTime);gain.gain.setValueAtTime(rate===0?0:SOUND.voiceGain,this.#ctx.currentTime);}}
  stop(id){const v=this.#voices.get(id);if(!v)return;v.gain.gain.setValueAtTime(0,this.#ctx.currentTime);try{v.src.stop();}catch{}this.#voices.delete(id);}
  resetSession(){for(const id of this.#voices.keys())this.stop(id);this.#seen.clear();this.#fence=-Infinity;}
  async dispose(){this.resetSession();this.#master?.disconnect();if(this.#ctx?.close)await this.#ctx.close();}
}
