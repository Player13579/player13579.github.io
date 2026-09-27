import {PROFILES,hashId,clamp} from './profiles.js';
/** 決定論PCM。外部gunshot素材・既存E波形を参照しない。 */
export function synthesize(variant,{sampleRate=48000,seed=1}={}){
  const p=PROFILES[variant];if(!p)throw new TypeError('variant');
  if(!Number.isInteger(sampleRate)||sampleRate<22050||sampleRate>192000)throw new RangeError('sampleRate');
  const out=new Float32Array(Math.ceil(sampleRate*p.audioDuration));
  let state=(seed>>>0)||1,low=0,slow=0,previous=0,hp=0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/2147483648-1;};
  const setups={
    handgun:{noise:0.95,decay:0.021,freq:153,body:0.76,ring:970,tail:0.064},
    smg:{noise:0.74,decay:0.010,freq:247,body:0.34,ring:1730,tail:0.029},
    assault:{noise:1.03,decay:0.028,freq:118,body:0.78,ring:690,tail:0.085},
    sniper:{noise:1.16,decay:0.032,freq:74,body:0.98,ring:412,tail:0.145},
    taser:{noise:0.36,decay:0.017,freq:212,body:0.35,ring:1450,tail:0.102}
  };const q=setups[variant];const toneFactor=0.985+(seed%301)/10000;
  for(let i=0;i<out.length;i++){
    const t=i/sampleRate;const n=random();low+=0.38*(n-low);slow+=0.042*(n-slow);
    // 段差の衝撃ではなく、短い連続attackから始める。
    const attack=Math.min(1,t/0.0018);const fade=Math.min(1,(p.audioDuration-t)/0.018);
    const shell=(low-slow)*q.noise*Math.exp(-t/q.decay);
    const phase=2*Math.PI*q.freq*toneFactor*(t+0.020*(1-Math.exp(-t/0.022)));
    const body=Math.sin(phase)*q.body*Math.exp(-t/q.tail);
    const clack=Math.sin(2*Math.PI*q.ring*t)*0.15*Math.exp(-Math.max(0,t-0.016)/0.035)*Math.min(1,t/0.010);
    const vent=slow*0.48*Math.exp(-t/(q.tail*1.2))*Math.min(1,t/0.006);
    let x=shell+body+clack+vent;
    if(variant==='taser'){
      const carrier=Math.sin(2*Math.PI*(1180*t+42*(1-Math.exp(-t/0.055))))+0.36*Math.sin(2*Math.PI*2033*t);
      const electric=carrier*0.38*Math.exp(-t/0.095)*(0.84+0.16*Math.cos(2*Math.PI*47*t));
      x=shell*0.65+body*0.25+electric+clack*0.4;
    }
    if(variant==='sniper')x+=0.17*Math.sin(2*Math.PI*52*t)*Math.exp(-t/0.155);
    x*=attack*fade;
    // 直流除去→穏やかな飽和→末端fade。音圧の実測値を意味しない。
    hp=0.9975*(hp+x-previous);previous=x;
    out[i]=Math.tanh(hp*1.35)*0.78*fade;
  }
  let peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));
  if(peak>0)for(let i=0;i<out.length;i++)out[i]*=0.68/peak;
  out[0]=0;out[out.length-1]=0;return out;
}
export function analyzePCM(samples,sampleRate=48000){
  let peak=0,sum=0,sq=0,maxStep=0,clipped=0;for(let i=0;i<samples.length;i++){const v=samples[i];peak=Math.max(peak,Math.abs(v));sum+=v;sq+=v*v;if(Math.abs(v)>=1)clipped++;if(i)maxStep=Math.max(maxStep,Math.abs(v-samples[i-1]));}
  const rms=Math.sqrt(sq/samples.length);return {sampleRate,samples:samples.length,duration:samples.length/sampleRate,peak,peakDbFS:20*Math.log10(Math.max(peak,1e-12)),rms,rmsDbFS:20*Math.log10(Math.max(rms,1e-12)),dc:sum/samples.length,maxStep,clipped,first:samples[0],last:samples.at(-1)};
}
export function encodeWav(samples,sampleRate=48000){
  const a=new ArrayBuffer(44+samples.length*2),v=new DataView(a);const str=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  str(0,'RIFF');v.setUint32(4,a.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,samples.length*2,true);
  samples.forEach((s,i)=>v.setInt16(44+i*2,Math.round(clamp(s,-1,1)*(s<0?32768:32767)),true));return new Uint8Array(a);
}
export const seedForVariant=variant=>hashId(`DVA/shoot-e/new/${variant}`);
