import { PROFILE, sfxPCM } from './creative.mjs';

export function createFiniteAudioScheduler({hardZero=false}={}) {
  const played=new Set(),cancelled=new Set(),active=new Map(),lastAgeByReceipt=new Map();
  let context=null,unlocked=false,disposed=false;
  const snapshot=()=>Object.freeze({hardZero,unlocked,contextCount:context?1:0,played:played.size,active:active.size});
  async function unlockFromGesture(AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext) {
    if(hardZero||disposed)return snapshot();
    if(!AudioCtor)return snapshot();
    if(!context)context=new AudioCtor();
    await context.resume();unlocked=context.state==='running';return snapshot();
  }
  function stopAll(){for(const source of active.values()){try{source.stop();}catch{}}active.clear();}
  function record({receipt,clock,submitted=false,authoredVisible=false,roles=[],rate=1,sourceCurrent=true,privateAllowed=true}) {
    if(disposed||hardZero||!submitted||!authoredVisible||!receipt||!clock||
        !Number.isFinite(rate)||rate<=0){stopAll();return snapshot();}
    if(!sourceCurrent||!privateAllowed){for(const role of roles)if(['departure','arrival'].includes(role))cancelled.add(`${receipt.roomIncarnationId}:${receipt.clientRoomSessionGeneration}:${receipt.causalId}:${role}`);stopAll();return snapshot();}
    if(context?.state!=='running'||!unlocked)return snapshot();
    const age=clock.atEms-receipt.startedAtEms;
    if(age<0||age>=PROFILE.durationEms)return snapshot();
    const receiptKey=`${receipt.roomIncarnationId}:${receipt.clientRoomSessionGeneration}:${receipt.causalId}`;
    const previousAge=lastAgeByReceipt.get(receiptKey);lastAgeByReceipt.set(receiptKey,age);
    for(const role of roles){
      if(!['departure','arrival'].includes(role))continue;
      const start=role==='departure'?0:180,duration=role==='departure'?170:210,offsetMs=age-start;
      const key=`${receipt.roomIncarnationId}:${receipt.clientRoomSessionGeneration}:${receipt.causalId}:${role}`;
      if(played.has(key)||cancelled.has(key)||offsetMs<0||offsetMs>=duration)continue;
      // Never start a missed cue in the middle of its buffer. A first observation
      // or a frame gap beyond this small onset window consumes the cue as skipped.
      const onsetAllowanceMs=50;
      if(offsetMs>onsetAllowanceMs||previousAge!==undefined&&previousAge<start&&offsetMs>onsetAllowanceMs){cancelled.add(key);continue;}
      const pcm=sfxPCM(role,48000),buffer=context.createBuffer(1,pcm.length,48000);buffer.copyToChannel(pcm,0);
      const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;source.connect(context.destination);
      source.onended=()=>{if(active.get(key)===source)active.delete(key);};
      source.start(context.currentTime,Math.max(0,offsetMs/1000));active.set(key,source);played.add(key);
    }
    return snapshot();
  }
  function setRate(rate){if(!Number.isFinite(rate)||rate<0)throw new TypeError('Finite nonnegative E rate required');for(const source of active.values()){if(rate===0){try{source.stop();}catch{}}else source.playbackRate.value=rate;}}
  function revoke(){stopAll();}
  function invalidateReceipt(receipt){if(receipt){for(const role of ['departure','arrival'])cancelled.add(`${receipt.roomIncarnationId}:${receipt.clientRoomSessionGeneration}:${receipt.causalId}:${role}`);}stopAll();}
  async function dispose(){if(disposed)return;disposed=true;stopAll();try{await context?.close();}finally{context=null;unlocked=false;}}
  return Object.freeze({unlockFromGesture,record,setRate,revoke,invalidateReceipt,dispose,snapshot});
}
