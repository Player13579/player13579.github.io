/** r0.3 synthesis: ingress ping -> conversion sweep -> seated body tone -> dim release.
 * Pure PCM generation. All timings are normalized to the same actor lifetime as the visual sampler.
 */
import {smooth,clamp} from './sampler.js';
const TAU=Math.PI*2;
function integralSmooth(a,b,p){if(p<=a)return 0;if(p>=b)return p-b+(b-a)*0.5;const t=(p-a)/(b-a);return (b-a)*(t**3-0.5*t**4);} 
export function soundEnvelope(p){
  const onset=0.42*Math.exp(-((p-0.045)**2)/0.0016);
  const body=0.58*Math.exp(-((p-0.38)**2)/0.040);
  const settle=0.34*Math.exp(-((p-0.70)**2)/0.020);
  return smooth(0,0.008,p)*(onset+body+settle)*(1-smooth(0.80,1,p));
}
export function synthesizeMana({durationMs=1500,sampleRate=48000}={}){
  if(!Number.isFinite(durationMs)||durationMs<900||!Number.isFinite(sampleRate)||sampleRate<8000)throw new RangeError('Invalid synthesis duration or rate');
  const n=Math.ceil(durationMs*sampleRate/1000),left=new Float32Array(n),right=new Float32Array(n),seconds=durationMs/1000;
  for(let i=0;i<n;i++){
    const t=i/sampleRate,p=i/n,lock=smooth(0.30,0.74,p),seat=smooth(0.52,0.82,p);
    const cycles=seconds*(308*p+146*integralSmooth(0.06,0.52,p)-42*integralSmooth(0.60,0.84,p));
    const phi=TAU*cycles;
    const shimmer=1.12*(1-lock)+0.10;
    const stereoWidth=0.19*(1-smooth(0.24,0.80,p));
    const chirp=0.11*Math.exp(-t/0.028)*smooth(0,0.003,t)*(Math.sin(TAU*1320*t)+0.42*Math.sin(TAU*2050*t));
    const env=soundEnvelope(p)*0.27;
    for(const [buffer,pan] of [[left,-1],[right,1]]){
      const phase=phi+pan*stereoWidth;
      const carrier=Math.sin(phase+shimmer*Math.sin(phase*1.45+0.22))+0.26*Math.sin(2*phase+0.45*(1-lock))+0.10*Math.sin(3*phase+0.9*seat);
      const seated=0.24*seat*Math.sin(phase*0.5+pan*0.18);
      buffer[i]=Math.tanh(env*(carrier+seated)+chirp)*(1-smooth(0.995,1,p));
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
