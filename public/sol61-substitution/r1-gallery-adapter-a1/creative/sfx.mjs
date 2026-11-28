// 変わり身の術 R1。独立プレビュー用PCM。AudioContextや再生副作用を持たない。
import {SFX_CUES} from './contract.mjs';
export {SFX_CUES};
const TAU=Math.PI*2;
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const burst=(t,onset,attack,decay)=>{
  const q=t-onset;
  return q<=0?0:smooth(q/attack)*Math.exp(-q/decay);
};
export function synthesizeSubstitutionSfx(kind,{sampleRate=48000,seed=0x5eeda11}={}) {
  if(!Object.hasOwn(SFX_CUES,kind))throw new TypeError('Unknown substitution cause kind');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)
    throw new RangeError('sampleRate must be an integer from8000 to192000');
  if(!Number.isInteger(seed))throw new TypeError('seed must be an integer');
  const cue=SFX_CUES[kind], length=Math.ceil(sampleRate*cue.durationMs/1000);
  const pcm=new Float32Array(length);
  let rng=seed>>>0, low=0, previousLow=0, resonator1=0, resonator2=0, peak=0;
  const coefficient=1-Math.exp(-TAU*(kind==='grant'?3800:5100)/sampleRate);
  for(let i=0;i<length;i++){
    const t=i/sampleRate;
    rng=(Math.imul(rng,1664525)+1013904223)>>>0;
    const white=rng/2147483648-1;
    low+=coefficient*(white-low);
    const friction=low-previousLow*0.78; previousLow=low;
    let value;
    if(kind==='grant'){
      // A local dry fold draw, followed by a seated, short crystalline seam response.
      const draw=burst(t,0.0,0.012,0.11);
      const seat=burst(t,0.165,0.006,0.075);
      const modes=0.26*Math.sin(TAU*620*t)+0.16*Math.sin(TAU*934*t+0.37)
        +0.09*Math.sin(TAU*1471*t+0.91);
      value=0.33*friction*draw+seat*modes+
        0.09*draw*Math.sin(TAU*(205*t+115*t*t));
    }else{
      // The seam opens with a dry broad transient, then a hollow inward fold settles.
      const open=burst(t,0.0,0.005,0.070);
      const fold=burst(t,0.095,0.016,0.21);
      resonator1+=0.055*(low-resonator1);
      resonator2+=0.025*(resonator1-resonator2);
      const hollow=0.20*Math.sin(TAU*(344*t-64*t*t))+
        0.12*Math.sin(TAU*(517*t-83*t*t)+0.42)+0.07*Math.sin(TAU*809*t);
      value=0.58*friction*open+fold*(hollow+0.34*(resonator1-resonator2));
    }
    // Finite tails fade to exact zero; no DC step or unnecessary long reverberation.
    const end=(length-1-i)/sampleRate;
    value*=smooth(t/0.0025)*smooth(end/0.028);
    pcm[i]=value; peak=Math.max(peak,Math.abs(value));
  }
  if(peak>0.92){const gain=0.92/peak;for(let i=0;i<length;i++)pcm[i]*=gain;}
  pcm[0]=0;pcm[length-1]=0;
  return Object.freeze({sampleRate,channels:Object.freeze([pcm]),durationMs:cue.durationMs,
    cueOffsetMs:cue.offsetMs,soundOrigin:'source'});
}
// Schedule once by immutable cause identity in the source clock.
// GPU completion does not restart the sound. If admitted after cueOffsetMs, begin at
// PCM offset(ageMs-cueOffsetMs); reject if older than latestStartAgeMs.
// Unlock may occur with no cause; it only arms future causes. Never chase old sound.
// MainOFF/verify/mute/stop/hidden/expiry/replacement/dispose stop/prevent all sound.
// Grant is caster-position only. Trigger is origin-position only, never destination.
// A future main-game integration must choose existing ordinary sound OR this sound.
