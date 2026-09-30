export function synthesize(sampleRate=48000){
 if(!Number.isSafeInteger(sampleRate)||sampleRate<16000||sampleRate>192000)throw Error('invalid sample rate');
 const samples=new Float32Array(Math.round(sampleRate*1.2));let randomState=0x7a3160c1,phase=0,prior=0;
 const env=(t,a,d)=>t<a||t>=a+d?0:Math.sin(Math.PI*(t-a)/d)**2;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate;randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;const noise=(randomState>>>0)/4294967296*2-1,grain=noise-prior;prior=noise;
  let value=0;for(const a of [0,.16,.32]){const u=t-a;value+=env(t,a,.135)*(.105*Math.sin(2*Math.PI*(230*u+32*u*u))+.06*Math.sin(2*Math.PI*338*u)+.04*Math.sin(2*Math.PI*531*u)+.024*grain);}
  for(const a of [.48,.62,.76]){const u=t-a;value+=env(t,a,.23)*(.11*Math.sin(2*Math.PI*(288*u+180*u*u))+.05*Math.sin(2*Math.PI*432*u)+.024*Math.sin(2*Math.PI*720*u));}
  phase+=2*Math.PI*(180+130*t)/sampleRate;value+=env(t,.96,.22)*(.027*grain+.035*Math.sin(phase));samples[i]=value;
 }
 samples[0]=0;samples[samples.length-1]=0;return samples;
}
export function sfxSubmissionController({startVoice,cancelVoice,verification=false}={}){
 const seen=new Set(),voices=new Map(),rates=new Map();let closed=false;
 const stop=(key=null)=>{for(const [id,voice] of voices){if(key===null||key===id){cancelVoice?.(voice);voices.delete(id);}}};
 return Object.freeze({
  onSubmission(prepared,{submitted=false,eventKey=null,visible=true,gesture=false}={}){
   if(closed||verification){stop();return {status:'silent',gain:0};}
   if(prepared?.status!=='prepared'||!prepared.live||!visible||prepared.rate===0){stop(prepared?.receipt?.key??null);return {status:'silent'};}
   const currentKey=prepared.receipt.key;
   if(rates.has(currentKey)&&rates.get(currentKey)!==prepared.rate)stop(currentKey);rates.set(currentKey,prepared.rate);
   if(!submitted||eventKey!==prepared.receipt.key||!gesture||!startVoice)return {status:'not_started'};
   if(seen.has(eventKey))return {status:'already_consumed'};
   seen.add(eventKey);const cue={causeKey:eventKey,sourcePx:[...prepared.sourcePx],ageEms:prepared.ageEms,rate:prepared.rate,bufferOffsetSeconds:prepared.ageEms/1000,wallElapsedSeconds:prepared.ageEms/(1000*prepared.rate),durationWallSeconds:(1200-prepared.ageEms)/(1000*prepared.rate),playbackRate:prepared.rate,loop:false};voices.set(eventKey,startVoice(cue));return {status:'started',cue};
  },visibilityChanged(){stop();},cancel(key=null){stop(key);},voiceEnded(key){voices.delete(key);},close(){closed=true;stop();},audit(){return {seen:[...seen],activeVoiceCount:voices.size,voiceActive:voices.size>0,verification,gain:verification?0:null};}
 });
}
