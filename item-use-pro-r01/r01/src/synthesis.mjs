import {VARIANTS} from './contract.mjs';
export const SOUND_SPEC=Object.freeze({
  'mineral-water':Object.freeze({seconds:0.164,baseHz:760,partialHz:1730,noiseMix:0.28,decay:0.047,seed:0x39a1}),
  seawater:Object.freeze({seconds:0.188,baseHz:430,partialHz:1190,noiseMix:0.68,decay:0.053,seed:0x714f}),
  antidote:Object.freeze({seconds:0.136,baseHz:1050,partialHz:2380,noiseMix:0.18,decay:0.034,seed:0x26b5})
});
/** 原音。使用成立の短い一打。嚥下・容器・回復音の録音や既存E波形は使わない。 */
export function synthesize(variant,sampleRate=48000){
  if(!VARIANTS.includes(variant))throw new RangeError('unknown variant');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate out of range');
  const s=SOUND_SPEC[variant],n=Math.ceil(s.seconds*sampleRate),out=new Float32Array(n);
  let seed=s.seed,lp=0,last=0,mean=0,peak=0;
  for(let i=0;i<n;i++){
    const t=i/sampleRate;
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=((seed>>>0)/4294967295)*2-1;
    lp+=0.21*(noise-lp);
    const band=lp-last*0.58;last=lp;
    const a=1-Math.exp(-t/0.0017),tail=Math.min(1,Math.max(0,(s.seconds-t)/0.018));
    const env=a*Math.exp(-t/s.decay)*tail*tail;
    // 周波数上昇や協和終止を設けない。二つの非整数比モードを一つの包絡で励起する。
    const f=s.baseHz;
    const tone=Math.sin(2*Math.PI*(f*t-0.027*f*t*t)) * 0.68 + Math.sin(2*Math.PI*s.partialHz*t+0.35)*Math.exp(-t/0.021)*0.32;
    out[i]=(tone*(1-s.noiseMix)+band*s.noiseMix*3.1)*env;
    mean+=out[i];
  }
  mean/=n;
  // DC補正を端点で切らない。端点は厳密に0、正規化は有限のpeakにのみ行う。
  for(let i=0;i<n;i++){
    const taper=Math.sin(Math.PI*i/(n-1))**2;
    out[i]-=mean*taper*2;
    peak=Math.max(peak,Math.abs(out[i]));
  }
  const gain=peak>0?0.58/peak:0;
  for(let i=0;i<n;i++)out[i]*=gain;
  out[0]=out[n-1]=0;
  return out;
}
export function encodeWav(samples,sampleRate=48000){
  const a=new ArrayBuffer(44+samples.length*2),v=new DataView(a);
  const str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,a.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return new Uint8Array(a);
}
