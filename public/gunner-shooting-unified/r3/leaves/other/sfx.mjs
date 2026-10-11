import {synthesizeMaterialShot} from './material-sfx.mjs';
import {resolveCauseOffset,startBufferAtCauseOffset} from '../playback-offset.mjs';
export const synthesizeShot=synthesizeMaterialShot;
export function createSfx({verify=false,now=()=>performance.now()}={}){
 let context=null,gain=null,disposed=false,epoch=0;let watermark=-Infinity;const played=new Set(),nodes=new Set();const status={enabled:false,state:'locked',failures:[],count:0,verify,lastPlayback:null};
 async function enable(){const ticket=++epoch;if(disposed||verify)return {...status};try{
  if(!context){context=new (globalThis.AudioContext||globalThis.webkitAudioContext)();gain=context.createGain();gain.gain.value=.6;gain.connect(context.destination);}
  await context.resume();if(disposed||ticket!==epoch)return {...status};status.state=context.state;status.enabled=context.state==='running';
 }catch(e){status.failures.push(String(e));status.enabled=false;status.state=context?.state??'unavailable';}return {...status};}
 function play(source){
  if(disposed||verify||!status.enabled||context?.state!=='running'||source.startedAt<watermark)return {ok:false,reason:verify?'verify':disposed?'disposed':'audio-locked',snapshot:{...status}};
  if(source.startedAt>watermark){played.clear();watermark=source.startedAt;}if(played.has(source.causeID))return {ok:false,reason:'duplicate-cause',snapshot:{...status}};
  let signal;try{signal=synthesizeShot(source.variant,context.sampleRate,status.count+1)}catch(e){status.failures.push(String(e));status.lastPlayback={causeID:source.causeID,ok:false,reason:'invalid-sample',clockDomain:'performance.now'};return {ok:false,reason:'invalid-sample',snapshot:{...status}};}
  const buffer=context.createBuffer(1,signal.length,context.sampleRate);buffer.copyToChannel(signal,0);
  const timing=resolveCauseOffset({startedAt:source.startedAt,now:now(),sampleRate:context.sampleRate,sampleCount:signal.length,verify});
  status.lastPlayback={causeID:source.causeID,...timing};if(!timing.ok)return {ok:false,reason:timing.reason,snapshot:{...status}};
  const node=context.createBufferSource();node.buffer=buffer;node.connect(gain);nodes.add(node);node.onended=()=>{nodes.delete(node);node.disconnect();};
  const started=startBufferAtCauseOffset(node,timing);if(!started.ok){nodes.delete(node);node.disconnect();status.lastPlayback={causeID:source.causeID,...started};return {ok:false,reason:started.reason,snapshot:{...status}};}played.add(source.causeID);status.count++;return {ok:true,reason:'started',source:node,offset:started,snapshot:{...status}};
 }
 function suspend(){epoch++;status.enabled=false;for(const n of nodes){try{n.stop()}catch{}}nodes.clear();}
 async function dispose(){if(disposed)return;disposed=true;suspend();await context?.close();played.clear();status.state='closed';}
 return {enable,play,suspend,dispose,snapshot:()=>({...status,state:context?.state??status.state,nodes:nodes.size})};
}
