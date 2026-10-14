export const EVENT_DURATION_MS=1050;
export const RETURN_STROKE_MS=160;

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function seeded(seed){let s=Number(seed)>>>0;if(!s){for(const ch of String(seed??1))s=(Math.imul(s^ch.charCodeAt(0),16777619))>>>0}s||=1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1}}

// Deterministic transient spectrum: one-pole high-pass followed by low-pass,
// with fixed, exponentially damped material resonances. No frequency sweep.
export function renderQuantumDischargePcm(seed=1,sampleRate=48000){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate must be an integer in [8000,192000]');
  const n=Math.ceil(sampleRate*EVENT_DURATION_MS/1000),out=new Float32Array(n),rand=seeded(seed);
  const white=new Float32Array(n),hp=new Float32Array(n),lp=new Float32Array(n);
  for(let i=0;i<n;i++)white[i]=rand();
  const hpA=Math.exp(-2*Math.PI*180/sampleRate),lpA=Math.exp(-2*Math.PI*9200/sampleRate);
  let prevX=0,prevHP=0,prevLP=0;
  for(let i=0;i<n;i++){
    const x=white[i];const h=hpA*(prevHP+x-prevX);prevX=x;prevHP=h;hp[i]=h;
    prevLP+=(1-lpA)*(h-prevLP);lp[i]=prevLP;
  }
  const bursts=[{at:12,amp:.30},{at:52,amp:.17},{at:96,amp:.12},{at:RETURN_STROKE_MS,amp:1}];
  const resonances=[{hz:210,amp:.19,decay:19},{hz:510,amp:.12,decay:13},{hz:1180,amp:.055,decay:7}];
  for(const burst of bursts){
    const start=Math.round(burst.at*sampleRate/1000),noiseEnd=Math.min(n,start+Math.round(.031*sampleRate));
    for(let i=start;i<noiseEnd;i++){
      const t=(i-start)/sampleRate,env=Math.exp(-t/.008)*(1-Math.exp(-t/.00045));
      out[i]+=lp[i]*env*burst.amp*.74;
    }
    for(const r of resonances){
      const end=Math.min(n,start+Math.ceil(r.decay*sampleRate/1000));
      for(let i=start;i<end;i++){
        const t=(i-start)/sampleRate;
        out[i]+=Math.sin(2*Math.PI*r.hz*t)*Math.exp(-t/(r.decay/1000))*r.amp*burst.amp;
      }
    }
    // Sparse deterministic crackles are impulses passed through a short damped
    // fixed-frequency resonator; each burst has no late catch-up behavior.
    const crackleEnd=Math.min(n,start+Math.round(.11*sampleRate));
    let state=(Number(seed)>>>0)^Math.imul(Math.round(burst.at+17),0x45d9f3b);
    const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
    for(let k=0;k<4;k++){
      const at=start+Math.floor(next()*(crackleEnd-start));
      const hz=2600+Math.floor(next()*3200),amp=(.06+next()*.08)*burst.amp;
      for(let j=0;j<Math.min(Math.ceil(.0035*sampleRate),n-at);j++){
        const t=j/sampleRate;out[at+j]+=Math.sin(2*Math.PI*hz*t)*Math.exp(-t/.00072)*amp;
      }
    }
  }
  // Remove bias only over the active transient, leaving the long silent tail
  // exactly zero; short edge fades prevent buffer-boundary clicks.
  const activeEnd=Math.min(n,Math.round(sampleRate*.30));let mean=0;
  for(let i=0;i<activeEnd;i++)mean+=out[i];mean/=activeEnd;
  let peak=0;for(let i=0;i<activeEnd;i++){out[i]-=mean;peak=Math.max(peak,Math.abs(out[i]))}
  const scale=peak>.82?.82/peak:1,edge=Math.max(1,Math.round(sampleRate*.002));
  for(let i=0;i<activeEnd;i++){const fade=i<edge?i/edge:i>=activeEnd-edge?(activeEnd-1-i)/edge:1;out[i]*=scale*Math.max(0,fade)}
  return out;
}

export function createSnapAudio({verify=false,AudioContextType=globalThis.AudioContext,isCurrentReceipt=()=>false,getCurrentEvent=()=>null,now=()=>performance.now()}={}){
 let context=null,unlocked=false,disposed=false,muted=false,epoch=0,pendingEnable=null,disposePromise=null,lastContextState='absent';
 const played=new Set(),active=new Set();let lastPlayDecision=null;
 function audioClock(receipt){const event=getCurrentEvent(),clock=now();if(!event||event.causeId!==receipt?.causeId||event.generation!==receipt?.generation||!Number.isFinite(event.startedAt)||!Number.isFinite(clock)||clock<event.startedAt)return null;const ageMs=clock-event.startedAt;if(ageMs<receipt.ageMs)return null;return{causeId:event.causeId,generation:event.generation,startedAt:event.startedAt,ageMs};}

 const stop=()=>{epoch++;for(const source of active){try{source.stop()}catch{}try{source.disconnect()}catch{}}active.clear();};
 const snapshot=()=>Object.freeze({verify,muted,unlocked,disposed,contextState:context?.state??lastContextState,contextCreated:!!context,activeSources:active.size,admittedCauseCount:played.size,lastPlayDecision});
 const api={get unlocked(){return unlocked&&!muted},snapshot,stop,setMuted(value){muted=verify||!!value;stop();return !muted;},
 enable(){if(verify||disposed||muted||!AudioContextType)return Promise.resolve(false);if(pendingEnable)return pendingEnable;
 const ownEpoch=epoch;const ownPromise=(async()=>{try{context??=new AudioContextType();if(context.state!=='running')await context.resume();
 if(disposed||muted||epoch!==ownEpoch)return false;unlocked=context.state==='running';return unlocked;
 }catch{return false;}})();pendingEnable=ownPromise;ownPromise.finally(()=>{if(pendingEnable===ownPromise)pendingEnable=null;});return ownPromise;},
 play(receipt){if(verify||muted||disposed||!unlocked||context?.state!=='running'||!receipt||!isCurrentReceipt(receipt)||receipt.completed!==true||receipt.mainFrameVisible!==true||receipt.sourceTargetVisible!==true||receipt.controls?.sourceEmission!==true||receipt.controls?.verify===true||!receipt.causeId||!Number.isFinite(receipt.ageMs)||receipt.ageMs<0||receipt.ageMs>=300||played.has(receipt.causeId))return false;
 const firstClock=audioClock(receipt);if(!firstClock||firstClock.ageMs>=300){lastPlayDecision={status:firstClock?'expired-audible-window':'stale-event-clock',causeId:receipt.causeId,generation:receipt.generation,receiptAgeMs:receipt.ageMs,currentAgeMs:firstClock?.ageMs??null};return false;}
 const data=renderQuantumDischargePcm(receipt.seed??receipt.causeId,context.sampleRate);try{const buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.copyToChannel(data,0);
 const playClock=audioClock(receipt);if(!playClock||playClock.causeId!==firstClock.causeId||playClock.generation!==firstClock.generation||playClock.startedAt!==firstClock.startedAt||playClock.ageMs>=300||!isCurrentReceipt(receipt)){lastPlayDecision={status:playClock&&playClock.ageMs>=300?'expired-audible-window':'stale-event-clock',causeId:receipt.causeId,generation:receipt.generation,receiptAgeMs:receipt.ageMs,currentAgeMs:playClock?.ageMs??null};return false;}
 const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);active.add(source);source.onended=()=>{active.delete(source);try{source.disconnect()}catch{}};
 source.start(context.currentTime,playClock.ageMs/1000);played.add(receipt.causeId);lastPlayDecision={status:'started',causeId:receipt.causeId,generation:receipt.generation,receiptAgeMs:receipt.ageMs,currentAgeMs:playClock.ageMs,pcmOffsetSeconds:playClock.ageMs/1000};return true;}catch{stop();return false;}},
 dispose(){if(disposePromise)return disposePromise;disposed=true;unlocked=false;stop();disposePromise=(async()=>{await pendingEnable;const owned=context;if(owned){await owned.close();lastContextState=owned.state;if(lastContextState!=='closed')throw new Error('audio context did not close');context=null;}return snapshot();})();return disposePromise;}
 };return api;
}