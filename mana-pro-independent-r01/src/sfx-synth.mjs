import {EFFECT_DURATION_SECONDS,PHASE} from './contract.mjs';
import {smooth,clamp01} from './phase.mjs';
/** オリジナル合成：種の短い打音→有色体の上昇音→腹部受領の二段階共鳴→有限終端。 */
export function synthesizeManaSFX(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRateは8000〜192000 Hz');
  const n=Math.round(EFFECT_DURATION_SECONDS*sampleRate),data=new Float32Array(n);
  const tau=2*Math.PI, duration=EFFECT_DURATION_SECONDS;
  const transitStart=PHASE.travelStart*duration, arrival=PHASE.receiveStart*duration, full=PHASE.receiveEnd*duration;
  let low=0,previous=0,rng=0x43B87F19,peak=0;
  for(let i=0;i<n;i++){
    const t=i/sampleRate,u=t/duration;
    rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
    const noise=((rng>>>0)/4294967295)*2-1;
    low+=.14*(noise-low);const band=low-previous;previous=low;
    const source=.18*Math.sin(tau*(440*t+72*t*t))*Math.exp(-t*22)+.10*Math.sin(tau*1174.66*t)*Math.exp(-t*37);
    let travel=0;
    if(t>=transitStart && t<PHASE.receiveEnd*duration){
      const q=t-transitStart,span=(PHASE.receiveEnd-PHASE.travelStart)*duration;
      const a=smooth(0,.04,q)*(1-smooth(span*.70,span,q));
      // 周波数の時間積分。ランダムなピッチジャンプではない。
      const ph=tau*(310*q+310*q*q+180*q*q*q);
      travel=a*(.09*Math.sin(ph)+.035*Math.sin(ph*1.501)+band*.04);
    }
    let receive=0;
    if(t>=arrival){
      const q=t-arrival,a=smooth(0,.012,q)*Math.exp(-3.7*q);
      receive=a*(.17*Math.sin(tau*659.255*q)+.09*Math.sin(tau*987.767*q)+.044*Math.sin(tau*1318.51*q));
    }
    if(t>=full){
      const q=t-full,a=smooth(0,.014,q)*Math.exp(-6.2*q);
      receive+=a*(.10*Math.sin(tau*880*q)+.037*Math.sin(tau*1760*q));
    }
    const finish=1-smooth(PHASE.fadeStart,PHASE.end,u);
    const edge=smooth(0,.003,t)*clamp01((duration-t)/.012);
    data[i]=(source+travel+receive)*finish*edge;peak=Math.max(peak,Math.abs(data[i]));
  }
  const scale=peak>0?.46/peak:0;
  for(let i=0;i<n;i++)data[i]*=scale;
  data[0]=0;data[n-1]=0;return data;
}
export function encodeWavePCM16(samples,sampleRate) {
  const bytes=new ArrayBuffer(44+samples.length*2),v=new DataView(bytes);
  const text=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);
  v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return new Uint8Array(bytes);
}
