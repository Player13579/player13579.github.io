import {LIMITS, OBSERVATION_BUDGET, profileFor, clamp, smoothstep} from './profiles.mjs';
/** 接触固有の短い圧着音。銃声、勝利音、死亡声、頭蓋破壊の録音は使用しない。 */
export function synthesizeContact(variant, sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sampleRate');
  const p = profileFor(variant); const duration = p.soundMs / 1000;
  const out = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = (0x51f2a937 ^ (p.weaponIndex * 15485863) ^ (p.aim ? 0x4123 : 0)) >>> 0;
  let slow = 0, fast = 0, phase = 0;
  const aSlow = 1 - Math.exp(-2 * Math.PI * 700 / sampleRate);
  const aFast = 1 - Math.exp(-2 * Math.PI * Math.min(5600, sampleRate * 0.35) / sampleRate);
  const f = Math.min(p.frequency, sampleRate * 0.19);
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const n = (seed >>> 0) / 2147483648 - 1;
    slow += aSlow * (n - slow); fast += aFast * (n - fast);
    const band = fast - slow;
    // 数値は音色の設計パラメータ。頭部や武器の実測共振を主張しない。
    phase += 2 * Math.PI * f * (1 + 0.10 * Math.exp(-t * 190)) / sampleRate;
    const mode1 = Math.sin(phase) * Math.exp(-p.damping * t);
    const mode2 = Math.sin(phase * (p.aim ? 1.493 : 1.547) + 0.17) * Math.exp(-p.damping * 1.85 * t);
    const mode3 = Math.sin(phase * 2.127) * Math.exp(-p.damping * 2.8 * t);
    const transient = band * Math.exp(-t * (p.weapon === 'smg' ? 125 : 85));
    let value = 0.54 * mode1 + 0.25 * mode2 + 0.075 * mode3 + 0.21 * transient;
    if (p.weapon === 'taser') {
      // 同一接触における緩い電気的残留音。追加発射、周期ブザー、スタン成立を含まない。
      const residue = smoothstep(0.006, 0.022, t) * Math.exp(-31 * t);
      value += 0.14 * Math.sin(phase * 1.86) * residue;
    }
    const attack = smoothstep(0, 0.0022, t);
    const tail = 1 - smoothstep(duration - 0.019, duration, t);
    out[i] = value * attack * tail;
  }
  // DCを除去後に端点窓を再適用する。先頭/末尾は正確に0。
  const mean = out.reduce((a,b) => a+b, 0) / out.length;
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const edge = Math.min(1, i / (sampleRate * 0.0012), (out.length - 1 - i) / (sampleRate * 0.006));
    out[i] = (out[i] - mean) * Math.max(0, edge); peak = Math.max(peak, Math.abs(out[i]));
  }
  const targetPeak = 0.60; const gain = peak > 0 ? targetPeak / peak : 0;
  for (let i=0;i<out.length;i++) out[i] *= gain;
  out[0] = 0; out[out.length - 1] = 0;
  return out;
}
export function encodeWav(samples, sampleRate = 48000) {
  if (!(samples instanceof Float32Array)) throw new TypeError('Float32Array');
  const bytes = new ArrayBuffer(44 + samples.length * 2); const v = new DataView(bytes);
  const text = (at, s) => [...s].forEach((c,i) => v.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);
  v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  samples.forEach((s,i) => v.setInt16(44+i*2, Math.round(clamp(s,-1,1) * (s<0 ? 32768 : 32767)),true));
  return bytes;
}
export function pcmMetrics(samples, sampleRate) {
  let peak=0,sum=0,power=0,step=0;
  for(let i=0;i<samples.length;i++){const x=samples[i];peak=Math.max(peak,Math.abs(x));sum+=x;power+=x*x;if(i)step=Math.max(step,Math.abs(x-samples[i-1]));}
  return {sampleRate,samples:samples.length,durationMs:samples.length/sampleRate*1000,peak,mean:sum/samples.length,rms:Math.sqrt(power/samples.length),maxSampleStep:step,first:samples[0],last:samples.at(-1)};
}
/** ユーザー操作でunlockしたAudioContextを注入。suspend中の発音は破棄し再試行しない。 */
export class ContactAudio {
  #context; #master; #voices = new Map(); #heard = new Map(); #buffers = new Map(); #disposed = false;
  constructor(context, {destination = context?.destination, volume = OBSERVATION_BUDGET.masterGain} = {}) {
    if (!context || typeof context.createBuffer !== 'function') throw new TypeError('AudioContext');
    this.#context = context; this.#master = context.createGain(); this.#master.gain.value = clamp(volume);
    this.#master.connect(destination);
  }
  get activeCount() { return this.#voices.size; }
  setVolume(value) { if (!Number.isFinite(value)) throw new TypeError('volume'); this.#master.gain.setValueAtTime(clamp(value),this.#context.currentTime); }
  play({event,profile = profileFor(event.variant),ageMs,rate,pan=0}) {
    const ctx=this.#context; const now=ctx.currentTime;
    for (const [id,t] of this.#heard) if (now-t>5) this.#heard.delete(id);
    if (this.#disposed || this.#heard.has(event.id)) return {played:false,reason:'duplicate_or_disposed'};
    if(this.#heard.size>=LIMITS.maxSeen)return {played:false,reason:'audio_dedupe_capacity'};
    this.#heard.set(event.id,now);
    if(ctx.state!=='running'||rate<=0||ageMs>=profile.soundMs)return {played:false,reason:'not_running_or_late'};
    if(this.#voices.size>=LIMITS.maxVoices)return {played:false,reason:'voice_capacity'};
    if(!this.#buffers.has(event.variant)){
      const pcm=synthesizeContact(event.variant,ctx.sampleRate);const buffer=ctx.createBuffer(1,pcm.length,ctx.sampleRate);
      buffer.copyToChannel(pcm,0);this.#buffers.set(event.variant,buffer);
    }
    const source=ctx.createBufferSource();const gain=ctx.createGain();const panner=ctx.createStereoPanner();
    source.buffer=this.#buffers.get(event.variant);source.playbackRate.value=rate;
    // 8音同相でもPCMピーク上限: 8 * .60 * .20 * 1 = .96。既存銃声のbusには触らない。
    gain.gain.value=OBSERVATION_BUDGET.voiceGain;panner.pan.value=clamp(pan,-1,1);
    source.connect(gain).connect(panner).connect(this.#master);
    const record={source,gain,panner};this.#voices.set(event.id,record);
    source.onended=()=>{if(this.#voices.get(event.id)===record)this.#voices.delete(event.id);source.disconnect();gain.disconnect();panner.disconnect();};
    source.start(now,Math.max(0,ageMs)/1000);
    return {played:true,id:event.id};
  }
  setRate(rate) {
    if(!Number.isFinite(rate)||rate<0||rate>LIMITS.maxRate)throw new RangeError('rate');
    const now=this.#context.currentTime;
    for(const v of this.#voices.values()){
      v.source.playbackRate.setValueAtTime(rate,now);
      // rate=0で凍結したPCMの直流値を出力しない。再開時もsourceを作り直さない。
      v.gain.gain.setValueAtTime(rate===0?0:OBSERVATION_BUDGET.voiceGain,now);
    }
  }
  stop(id) {
    const v=this.#voices.get(id);if(!v)return;
    // 非可視化・部屋切替は残響を持ち越さず即時切断。過去に聞こえた音は取り消せない。
    v.gain.gain.setValueAtTime(0,this.#context.currentTime);
    try{v.source.stop(this.#context.currentTime);}catch{/* 既に終了済み */}
    this.#voices.delete(id);
  }
  resetSession(){for(const id of [...this.#voices.keys()])this.stop(id);this.#heard.clear();}
  dispose(){if(this.#disposed)return;this.resetSession();this.#master.disconnect();this.#buffers.clear();this.#disposed=true;}
}
