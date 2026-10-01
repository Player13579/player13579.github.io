// 音色はゼロ設計。電気的な接続の収束/開放を2種類の連続周波数で示す。
import {smooth, pulse} from './artist.mjs';
export const SFX_SCORE = Object.freeze({sampleRate:48000, canonicalDurationSeconds:.760,
  departure:Object.freeze({carrierHz:[920,270], overtone:1.71, gain:.15, clickAtEms:300}),
  arrival:Object.freeze({carrierHz:[270,920], overtone:1.71, gain:.15, clickAtEms:152}),
  stereo:'fixed receipt anchor pan; no remote endpoint trajectory',
  onset:'phase matched E clock offset after validated GPU completion/currentness',
  ratePolicy:'rate0=suspend/silent; 0<rate<=12=exactPlaybackRate; >12=silent; VFX rate uncapped',
});
export function sampleSfx(t, variant='departure') {
  const score=SFX_SCORE[variant]; if (!score) throw new TypeError('sfx-variant');
  if (!Number.isFinite(t) || t<=0 || t>=.760) return 0;
  const a=score.carrierHz[0], b=score.carrierHz[1], D=.760;
  // 指数chirpの位相を解析積分しsample-rate依存の積分誤差/不連続を避ける。
  const k=Math.log(b/a)/D, phase=2*Math.PI*a*Math.expm1(k*t)/k;
  const envelope=pulse(0,.024,.44,.760,t);
  const attack=score.clickAtEms/1000;
  const latch=pulse(attack,attack+.004,attack+.016,attack+.034,t);
  const timbre=Math.sin(phase)*.70+Math.sin(phase*score.overtone+.3)*.22;
  const closure=Math.sin(2*Math.PI*1640*(t-attack))*latch*.075;
  // deterministic AM slowly opens/closes; broadband/noise/grainが主音にならない。
  const sweep=.76+.24*smooth(.06,.42,t);
  return score.gain*envelope*timbre*sweep+closure;
}
export function renderPcm(variant, sampleRate=48000) {
  if (!Number.isSafeInteger(sampleRate) || sampleRate<8000 || sampleRate>192000) throw new RangeError('sample-rate');
  const n=Math.ceil(.760*sampleRate), pcm=new Float32Array(n);
  for(let i=0;i<n;i++) pcm[i]=sampleSfx(i/sampleRate,variant);
  return pcm;
}
export function encodeWav(variant, sampleRate=48000) {
  const pcm=renderPcm(variant,sampleRate), buffer=new ArrayBuffer(44+pcm.length*2), v=new DataView(buffer);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length*2,true);
  pcm.forEach((x,i)=>v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,x))*32767),true));
  return new Uint8Array(buffer);
}
