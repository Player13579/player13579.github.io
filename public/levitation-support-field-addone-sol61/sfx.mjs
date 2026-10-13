// Fresh Sol acoustic material: pressure formation / steady recirculation / release.
// No assets, oscillators, landing impact, thruster or inherited old E sound.
import {VERSION,validateSource} from './model.mjs';
export const AUDIO=Object.freeze({onsetMs:480,sustainMs:1200,releaseMs:420,gain:.78,mono:true});
const smooth=x=>{const q=Math.max(0,Math.min(1,x));return q*q*(3-2*q);};
function noise(n,seed){let q=(seed>>>0)||0x6d2b79f5;const out=new Float64Array(n);for(let i=0;i<n;i++){q^=q<<13;q^=q>>>17;q^=q<<5;out[i]=((q>>>0)/4294967296)*2-1;}return out;}
function filterPeriodic(x,rate,hz){const a=Math.exp(-2*Math.PI*hz/rate),b=1-a;let state=0;for(const v of x)state=a*state+b*v;state/=1-Math.pow(a,x.length);const out=new Float64Array(x.length);for(let i=0;i<x.length;i++){state=a*state+b*x[i];out[i]=state;}return out;}
export function synthesize({phase,sampleRate=48000,seed=1}={}){
 if(!['onset','sustain','release'].includes(phase))throw new TypeError('explicit acoustic phase required');
 if(!Number.isSafeInteger(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('sample rate / uint32 cause seed');
 const durationMs=AUDIO[phase+'Ms'],n=Math.round(sampleRate*durationMs/1000),white=noise(n,(seed^({onset:0x44f8a,sustain:0x135b,release:0x931d}[phase]))>>>0);
 const low=filterPeriodic(white,sampleRate,180),air=filterPeriodic(white,sampleRate,1200),base=filterPeriodic(white,sampleRate,260);const samples=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/sampleRate;let envelope=1;
  if(phase==='onset')envelope=smooth(t/.18)*(1-smooth((t-.18)/.30));
  if(phase==='release')envelope=smooth(t/.008)*(1-smooth(t/.42));
  const material=.65*low[i]+1.20*(air[i]-base[i]);
  samples[i]=material*({onset:.72,sustain:.34,release:.56}[phase])*envelope*Math.sqrt(sampleRate/48000);
 }
 // Finite edges vanish exactly; sustain remains a periodic stationary material.
 if(phase!=='sustain'){samples[n-1]=0;samples[0]=0;}
 return Object.freeze({version:VERSION,phase,samples,sampleRate,durationMs,loop:phase==='sustain',channels:1});
}
export function acousticPlan(actor,nowMs){
 actor=validateSource(actor);
 const age=nowMs-actor.startedAt;if(!Number.isFinite(age)||age<0)return null;
 if(!actor.active){const releaseAge=nowMs-actor.endedAt;if(!Number.isFinite(releaseAge)||releaseAge<0||releaseAge>=420)return null;return {phase:'release',offsetSeconds:releaseAge/1000,gain:smooth((actor.endedAt-actor.startedAt)/360),remainingMs:420-releaseAge,loop:false};}
 if(age<360)return {phase:'onset',offsetSeconds:age/1000,gain:1,remainingMs:480-age,loop:false};
 return {phase:'sustain',offsetSeconds:((age-360)%1200)/1000,gain:smooth((age-360)/120),remainingMs:null,loop:true,onsetTail:age<480?{phase:'onset',offsetSeconds:age/1000,gain:1,remainingMs:480-age,loop:false}:null};
}
