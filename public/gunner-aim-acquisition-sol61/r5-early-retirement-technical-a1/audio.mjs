import { validateSource, synthesizeLock } from './contract.mjs';

export const CONFIRMATION_MS=210;
export const SOUND_END_MS=355;
export const SOUND_DURATION_MS=SOUND_END_MS-CONFIRMATION_MS;

const defaultNow=()=>globalThis.performance?.now?.()??Date.now();
const matchingCause=(a,b)=>!!a&&!!b&&a.id===b.id;

export function completeRenderReceipt(frozen,sequence,completedAt){
 if(!frozen||!Number.isSafeInteger(sequence)||sequence<1||!Number.isFinite(completedAt))throw new TypeError('completed render receipt inputs invalid');
 return {...frozen,sequence,passes:2,completed:true,completedAt};
}

// This exact consumer is called by the production R2 render-completion handler.
export function dispatchCompletedReceipt(audio,receipt,current){
 if(!audio||!receipt||!current)return false;
 const source=current.source;
 if(!receipt.completed||!receipt.sequence||receipt.cause!==source?.id||!matchingCause(receipt.source,source)||receipt.generation!==current.generation||receipt.source?.generation!=null&&receipt.source.generation!==receipt.generation||receipt.active!==true||receipt.phase!=='confirmed'||receipt.ageMs<CONFIRMATION_MS||receipt.ageMs>=SOUND_END_MS||receipt.sourceEnabled!==true)return false;
 if(!current.playing||current.held||!current.sourceEnabled||current.disposed||current.retired||current.generation!==receipt.generation)return false;
 return audio.play(source,receipt,current);
}

// Shared runtime lifecycle hook; intentionally does not clear per-cause heard history.
export function stopAudioForLifecycle(audio,reason,causeId=null){
 if(!audio)return false;
 const wholeRuntime=['hidden','stop','dispose','retire'].includes(reason);
 if(wholeRuntime)audio.stopAll(reason);else if(causeId)audio.stopCause(causeId,reason);
 return true;
}

export function createAudio({verify=false,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,now=defaultNow}={}){
 let context=null,muted=verify,unlocked=false,disposed=false;const heard=new Set(),events=[],voices=new Map();
 function snapshot(){return {verify,muted,unlocked,contextState:context?.state||'not-created',events:structuredClone(events),activeNodes:voices.size,heardCauseCount:heard.size};}
 async function unlock(){if(verify||disposed)return {ok:false,reason:verify?'verify-hard-mute':'disposed',snapshot:snapshot()};if(!AudioContextClass)return {ok:false,reason:'unsupported',snapshot:snapshot()};context??=new AudioContextClass();try{await context.resume();}catch(e){events.push({kind:'unlock-error',message:String(e)});return {ok:false,reason:'resume-rejected',snapshot:snapshot()};}unlocked=!disposed&&context.state==='running';return {ok:unlocked,reason:unlocked?'running':'not-running',snapshot:snapshot()};}
 function cleanupNode(id,node,{stop=false,reason='ended'}={}){if(voices.get(id)===node)voices.delete(id);node.onended=null;if(stop)try{node.stop();}catch{}try{node.disconnect();}catch{}events.push({kind:'voice-stop',cause:id,reason,atAudioTime:context?.currentTime??null});}
 function stopCause(id,reason='cancelled'){const node=voices.get(id);if(!node)return false;cleanupNode(id,node,{stop:true,reason});return true;}
 function stopAll(reason='cancelled'){let stopped=0;for(const [id,node] of [...voices])if(stopCause(id,reason))stopped++;return stopped;}
 function currentValid(source,receipt,current){return !disposed&&!verify&&!muted&&unlocked&&context?.state==='running'&&validateSource(source)&&receipt?.completed===true&&receipt.cause===source.id&&receipt.generation===current.generation&&receipt.source?.id===source.id&&receipt.source?.startedAt===source.startedAt&&receipt.sourceEnabled===true&&receipt.active===true&&receipt.phase==='confirmed'&&receipt.ageMs>=CONFIRMATION_MS&&receipt.ageMs<SOUND_END_MS&&current.source?.id===source.id&&current.generation===receipt.generation&&current.playing===true&&current.held===false&&current.sourceEnabled===true&&current.disposed!==true&&current.retired!==true&&!heard.has(source.id)&&!voices.has(source.id);}
 function liveAge(source){return now()-source.startedAt;}
 function play(source,receipt,current){
  if(!currentValid(source,receipt,current))return false;
  const firstAge=liveAge(source);if(!Number.isFinite(firstAge)||firstAge<CONFIRMATION_MS||firstAge>=SOUND_END_MS||firstAge>=source.duration)return false;
  const pcm=synthesizeLock(context.sampleRate),durationMs=pcm.length/context.sampleRate*1000,firstOffset=(firstAge-CONFIRMATION_MS)/1000;
  if(firstOffset<0||firstAge>=Math.min(SOUND_END_MS,CONFIRMATION_MS+durationMs))return false;
  const buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.getChannelData(0).set(pcm);
  const node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);
  // Re-read source clock immediately before scheduling; a delayed allocation cannot create a late onset.
  const scheduledAge=liveAge(source),offsetSeconds=(scheduledAge-CONFIRMATION_MS)/1000;
  if(!Number.isFinite(scheduledAge)||scheduledAge<CONFIRMATION_MS||scheduledAge>=SOUND_END_MS||scheduledAge>=source.duration||offsetSeconds<0||offsetSeconds>=durationMs/1000){try{node.disconnect();}catch{}return false;}
  const generation=receipt.generation;
  node.onended=()=>cleanupNode(source.id,node,{stop:false,reason:'ended'});
  try{node.start(0,offsetSeconds);}catch{node.onended=null;try{node.disconnect();}catch{}return false;}
  heard.add(source.id);voices.set(source.id,node);
  // Keep diagnostic sample accounting exact at integral frame boundaries;
  // floating-point seconds (for example 70 ms * 48 kHz) can round just above
  // the integer even though the requested elapsed offset is exact.
  const offsetFrames=(scheduledAge-CONFIRMATION_MS)*context.sampleRate/1000;
  const consumedFrames=Number.isInteger(offsetFrames)?offsetFrames:Math.ceil(offsetFrames);
  const remainingSamples=Math.max(0,pcm.length-consumedFrames);
  events.push({kind:'lock',cause:source.id,playerId:source.playerId,targetId:source.targetId,variant:source.variant,confirmationMs:CONFIRMATION_MS,receiptAgeMs:receipt.ageMs,liveAgeMs:scheduledAge,elapsedOffsetMs:scheduledAge-CONFIRMATION_MS,offsetSeconds,generation,remainingSamples,durationMs,atAudioTime:context.currentTime});
  if(events.length>128)events.shift();return true;
 }
 function mute(value){muted=verify||Boolean(value);if(muted)stopAll('muted');return {ok:!verify||Boolean(value),reason:verify?'verify-hard-mute':'updated',snapshot:snapshot()};}
 async function dispose(){if(disposed)return;disposed=true;stopAll('disposed');if(context)await context.close();unlocked=false;}
 return {snapshot,unlock,mute,play,stopCause,stopAll,dispose,liveAge};
}
