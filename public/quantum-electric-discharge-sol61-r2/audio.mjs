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
  const bursts=[{at:0,amp:1},{at:RETURN_STROKE_MS,amp:.72}];
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
    for(let k=0;k<7;k++){
      const at=start+Math.floor(next()*(crackleEnd-start));
      const hz=2600+Math.floor(next()*3200),amp=(.06+next()*.08)*burst.amp;
      for(let j=0;j<Math.min(Math.ceil(.0035*sampleRate),n-at);j++){
        const t=j/sampleRate;out[at+j]+=Math.sin(2*Math.PI*hz*t)*Math.exp(-t/.00072)*amp;
      }
    }
  }
  // Remove bias only over the active transient, leaving the long silent tail
  // exactly zero; short edge fades prevent buffer-boundary clicks.
  const activeEnd=Math.min(n,Math.round(sampleRate*.28));let mean=0;
  for(let i=0;i<activeEnd;i++)mean+=out[i];mean/=activeEnd;
  let peak=0;for(let i=0;i<activeEnd;i++){out[i]-=mean;peak=Math.max(peak,Math.abs(out[i]))}
  const scale=peak>.82?.82/peak:1,edge=Math.max(1,Math.round(sampleRate*.002));
  for(let i=0;i<activeEnd;i++){const fade=i<edge?i/edge:i>=activeEnd-edge?(activeEnd-1-i)/edge:1;out[i]*=scale*Math.max(0,fade)}
  return out;
}

export function createSnapAudio({verify=false,AudioContextType=globalThis.AudioContext,isCurrentReceipt=()=>false}={}){
  let context=null,unlocked=false,disposed=false;
  const played=new Set(),active=new Set();
  const snapshot=()=>Object.freeze({verify,unlocked,contextState:context?.state??'unavailable',contextCreated:!!context,activeSources:active.size,admittedCauseCount:played.size});
  return {
    get unlocked(){return unlocked},snapshot,
    async enable(){
      if(verify||disposed||!AudioContextType)return false;
      try{
        context??=new AudioContextType();
        if(context.state!=='running')await context.resume();
        unlocked=context.state==='running';
        if(!unlocked){const failed=context;context=null;try{await failed.close?.()}catch{} }
        return unlocked;
      }catch{const failed=context;context=null;unlocked=false;try{await failed?.close?.()}catch{}return false}
    },
    play(receipt){
      if(verify||disposed||!unlocked||!context||context.state!=='running')return false;
      if(!receipt||!isCurrentReceipt(receipt)||receipt.completed!==true||receipt.mainFrameVisible!==true||receipt.sourceTargetVisible!==true||receipt.controls?.sourceEmission!==true||receipt.controls?.verify===true||!receipt.causeId||!Number.isFinite(receipt.ageMs)||receipt.ageMs<0||receipt.ageMs>=EVENT_DURATION_MS||played.has(receipt.causeId))return false;
      const data=renderQuantumDischargePcm(receipt.seed??receipt.causeId,context.sampleRate);
      try{
        const buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.copyToChannel(data,0);
        const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);active.add(source);
        source.onended=()=>{active.delete(source);try{source.disconnect()}catch{}};
        // Starting at the receipt's real event age preserves the 160 ms return
        // stroke phase. The missed onset is skipped; it is never replayed late.
        source.start(context.currentTime,receipt.ageMs/1000);
        played.add(receipt.causeId);return true;
      }catch{for(const source of active){try{source.stop()}catch{}try{source.disconnect()}catch{}}active.clear();return false}
    },
    async dispose(){if(disposed)return;disposed=true;unlocked=false;for(const source of active){try{source.stop()}catch{}try{source.disconnect()}catch{}}active.clear();const owned=context;context=null;try{await owned?.close?.()}catch{}},
  };
}
