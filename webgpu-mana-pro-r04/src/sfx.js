// New r0.4 synthesis. One continuous voice per cause, not notes triggered by visual sublayers.
import {sampleTime} from './sampler.js';
import {ease,clamp} from './math.js';
const TAU=2*Math.PI;
export function envelope(p) {
  if(p<=0||p>=1)return 0;
  const t=sampleTime(p*1500,1500);
  return ease(0,0.008,p)*(0.28+0.34*clamp(t.flux/6)+0.14*Math.sin(Math.PI*t.stored))*(1-ease(0.78,1,p));
}
export function synthesize({durationMs=1500,sampleRate=48000}={}) {
  if(!Number.isFinite(durationMs)||durationMs<900||!Number.isInteger(sampleRate)||sampleRate<8000)throw new RangeError('valid duration and integer sample rate required');
  const n=Math.ceil(durationMs*sampleRate/1000),left=new Float32Array(n),right=new Float32Array(n);let phi=0,p2=0,p3=0;
  for(let i=0;i<n;i++) {
    const p=i/(n-1),st=sampleTime(p*durationMs,durationMs),flux=clamp(st.flux/6);
    // Inharmonic partials settle into a narrow harmonic body exactly with received state.
    const f=440+184*st.stored+94*flux*(1-st.stored);
    phi+=TAU*f/sampleRate; p2+=TAU*f*(2+0.23*(1-st.stored))/sampleRate; p3+=TAU*f*(3-0.31*(1-st.stored))/sampleRate;
    const width=0.24*(1-st.stored),attack=0.14*Math.exp(-p/0.021)*ease(0,0.002,p),gain=0.51*envelope(p),tail=1-ease(0.996,1,p);
    for(const [a,sgn] of [[left,-1],[right,1]]) {
      const phase=sgn*width;
      const tonal=0.80*Math.sin(phi+phase)+0.26*Math.sin(p2-phase*0.7)+0.12*Math.sin(p3+phase*1.3);
      const onset=attack*Math.sin(2.7*phi+sgn*0.10);
      a[i]=Math.tanh(gain*tonal+onset)*tail;
    }
  }
  return {left,right,sampleRate,durationMs};
}
export function encodeWav(pcm) {
  const {left,right,sampleRate}=pcm;if(left.length!==right.length)throw new RangeError('channel lengths differ');
  const bytes=new Uint8Array(44+left.length*4),d=new DataView(bytes.buffer);
  const ascii=(at,s)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
  ascii(0,'RIFF');d.setUint32(4,bytes.length-8,true);ascii(8,'WAVE');ascii(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,2,true);d.setUint32(24,sampleRate,true);d.setUint32(28,sampleRate*4,true);d.setUint16(32,4,true);d.setUint16(34,16,true);ascii(36,'data');d.setUint32(40,left.length*4,true);
  for(let i=0;i<left.length;i++){d.setInt16(44+4*i,Math.round(clamp(left[i],-1,1)*32767),true);d.setInt16(46+4*i,Math.round(clamp(right[i],-1,1)*32767),true);}return bytes;
}
