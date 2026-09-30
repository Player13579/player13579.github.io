// 新規r12音学。旧E PCM/音学moduleをimportしない。
import {SPEC,stateAt} from './phenomenon.mjs';
export function pcm(durationMs=1500,sampleRate=48000){
 if(!Number.isFinite(durationMs)||durationMs<SPEC.minimumDurationMs||!Number.isInteger(sampleRate)||sampleRate<8000)throw new RangeError('有限durationとsample rateが必要');
 const output=new Float32Array(Math.round(durationMs*sampleRate/1000));const ratio=[1,1.486,2.178,3.027],angle=[0,0,0,0];let random=120930,low=0,slow=0;
 for(let i=1;i<output.length-1;i++){
  const t=i/sampleRate,s=stateAt(t*1000,durationMs),u=s.u;
  random^=random<<13;random^=random>>>17;random^=random<<5;const raw=(random>>>0)/4294967296-.5;
  low+=.095*(raw-low);slow+=.013*(low-slow);const filtered=low-slow;
  const frequency=126+46*(s.fill-.12)/.88+7*s.settle;
  const modes=[.102,.042*(.3+.7*s.fill),.028*(1-.45*s.settle),.014*s.settle];let tone=0;
  for(let k=0;k<4;k++){angle[k]+=2*Math.PI*frequency*ratio[k]/sampleRate;tone+=modes[k]*Math.sin(angle[k]);}
  const envelope=s.establish*s.supply*(.65+.35*s.settle);
  const body=tone*envelope+.025*filtered*envelope*(1-.60*s.settle);
  const completion=Math.exp(-(((u-.48)/.055)**2))*Math.sin(angle[2])*.029*s.establish;
  const settle=Math.exp(-(((u-.78)/.070)**2))*Math.sin(angle[1])*.024*s.supply;
  output[i]=body+completion+settle;
 }
 return output;
}
export const AUDIO_PROTOCOL=Object.freeze({verify:'immutable silent, context count0',start:'user gesture permitted AND GPUready AND first successful submission AND live cause',time:'event wall age offset seconds, playback rate1, no rewind for existing event',duplicate:'eventId and outcomeId suppressed before visual or sound generation',preview:'same finite PCM each duration+600ms cycle, distinct local epoch/cycle cause after gesture',offsetBound:'0<=offset<rounded PCM samples/sampleRate; reject before consuming audio cause',cancel:'dead/ejected/vent/hidden/no source→short gain ramp then stop; pagehide dispose context/device',voices:'one finite source per new actor outcome, no marker or persistent oscillator',listening:'not_run'});
