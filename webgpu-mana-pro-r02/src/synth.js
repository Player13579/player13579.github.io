/** Fresh r0.2 synthesis: a hollow onset, compressive phase modulation, harmonic seating, dim release.
 * Pure PCM generation. All timings are normalized to the same actor lifetime as the visual sampler.
 */
import {smooth,clamp} from './sampler.js';
const TAU=Math.PI*2;
function integralSmooth(a,b,p){if(p<=a)return 0;if(p>=b)return p-b+(b-a)*0.5;const t=(p-a)/(b-a);return (b-a)*(t**3-0.5*t**4);}
export function soundEnvelope(p){return smooth(0,0.009,p)*(0.40+0.37*Math.exp(-((p-0.39)**2)/0.07)+0.25*Math.exp(-((p-0.69)**2)/0.018))*(1-smooth(0.76,1,p));}
export function synthesizeMana({durationMs=1500,sampleRate=48000}={}){
  if(!Number.isFinite(durationMs)||durationMs<900||!Number.isFinite(sampleRate)||sampleRate<8000)throw new RangeError('Invalid synthesis duration or rate');
  const n=Math.ceil(durationMs*sampleRate/1000),left=new Float32Array(n),right=new Float32Array(n),seconds=durationMs/1000;
  for(let i=0;i<n;i++){
    const t=i/sampleRate,p=i/n,lock=smooth(0.34,0.76,p);
    const cycles=seconds*(286*p+174*integralSmooth(0.10,0.63,p)-68*integralSmooth(0.64,0.84,p));
    const phi=TAU*cycles,mod=1.05*(1-lock)+0.08,width=0.17*(1-smooth(0.27,0.78,p));
    const onset=0.095*Math.exp(-t/0.023)*smooth(0,0.003,t)*(Math.sin(TAU*1410*t)+0.35*Math.sin(TAU*2070*t));
    const env=soundEnvelope(p)*0.29;
    for(const [buffer,pan] of [[left,-1],[right,1]]){
      const phase=phi+pan*width;
      const body=Math.sin(phase+mod*Math.sin(phase*1.5))+0.27*Math.sin(2*phase+0.65*(1-lock))+0.12*Math.sin(3*phase);
      buffer[i]=Math.tanh(env*body+onset)*(1-smooth(0.995,1,p));
    }
  }
  return {left,right,sampleRate,durationMs};
}
export function encodeWav({left,right=left,sampleRate=48000}){
  if(left.length!==right.length)throw new RangeError('Stereo lengths differ');
  const n=left.length,buf=new ArrayBuffer(44+n*4),v=new DataView(buf);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.round(clamp(left[i],-1,1)*32767),true);v.setInt16(46+i*4,Math.round(clamp(right[i],-1,1)*32767),true);}
  return new Uint8Array(buf);
}
