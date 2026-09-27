/** Original deterministic synthesis. No sample imports. The bank is 1500 actor-ms. */
export const BANK_DURATION_MS=1500;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const windowed=(t,start,attack,decay)=> t<start ? 0 : (1-Math.exp(-(t-start)/attack))*Math.exp(-(t-start)/decay);
export function synthesizeMana(sampleRate=48000) {
  if (!Number.isFinite(sampleRate) || sampleRate<8000 || sampleRate>192000) throw new RangeError('sampleRate 8000..192000');
  const length=Math.round(sampleRate*BANK_DURATION_MS/1000), left=new Float32Array(length), right=new Float32Array(length);
  let phaseA=0,phaseB=0,phaseC=0,peak=0;
  for(let i=0;i<length;i++) {
    const t=i/sampleRate, p=t/1.5;
    const fold=smooth(.04,.46,p), settle=smooth(.40,.78,p);
    const fa=310+350*fold, fb=1110-120*fold, fc=1480-160*settle;
    phaseA+=2*Math.PI*fa/sampleRate; phaseB+=2*Math.PI*fb/sampleRate; phaseC+=2*Math.PI*fc/sampleRate;
    // Inward duplex sweep -> stable 660/990 Hz pair; transient is part of this ONE voice.
    const attack=windowed(t,0,.0025,.052);
    const click=attack*(.44*Math.sin(2*Math.PI*(1770*t-1100*t*t))+.17*Math.sin(2*Math.PI*2863*t));
    const body=windowed(t,.018,.055,.67);
    const fm=2.3*(1-fold)+.13;
    const a=Math.sin(phaseA+fm*Math.sin(phaseA*1.997));
    const b=.55*Math.sin(phaseB+.37*(1-settle)*Math.sin(phaseB*1.5));
    const facet=.13*Math.sin(phaseC)*windowed(t,.22,.055,.36);
    const stitch=windowed(t,.68,.004,.12)*.14*Math.sin(phaseA*2.01)+windowed(t,.92,.006,.14)*.08*Math.sin(phaseB*1.002);
    const tail=windowed(t,.80,.02,.25)*(.22*Math.sin(phaseA)+.10*Math.sin(phaseB));
    const envelope=(1-smooth(.88,1,p))*smooth(0,.0015,p);
    const width=.55*(1-settle);
    const common=click+body*.35*(a+b)+facet+stitch+tail;
    const difference=body*.11*(a-b)*width;
    left[i]=(common+difference)*envelope; right[i]=(common-difference)*envelope;
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  }
  // Fixed single-voice peak -12 dBFS. The mixer separately budgets concurrent causes.
  const scale=Math.pow(10,-12/20)/Math.max(1e-9,peak);
  for(let i=0;i<length;i++){left[i]*=scale;right[i]*=scale;}
  return {left,right,sampleRate,durationMs:BANK_DURATION_MS};
}
/** Portable stereo PCM WAV exporter; same samples as runtime synthesis. */
export function encodeWav({left,right,sampleRate}) {
  const n=left.length, out=new ArrayBuffer(44+n*4),v=new DataView(out);
  const text=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,36+n*4,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);
  v.setUint16(32,4,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.round(clamp(left[i],-1,1)*32767),true);v.setInt16(46+i*4,Math.round(clamp(right[i],-1,1)*32767),true);}
  return out;
}
