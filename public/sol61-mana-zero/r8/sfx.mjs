import {synthesize,sampleRate} from './inherited/r6-sfx.mjs';

export const pcm=synthesize();
export const pcmFrames=pcm.length;
export function createR8SoundGate({verify=false,AudioContextClass}={}){
 let context=null,enabled=false,disposed=false,played=0,blocked=0;const voices=new Set(),seen=new Set();
 async function activateFromGesture(){if(verify||disposed){blocked++;return false}const C=AudioContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;context??=new C();await context.resume();enabled=context.state==='running';return enabled}
 function playOnce(identity,eventAgeMs=0){if(verify||disposed||!enabled||context?.state!=='running'||!identity||seen.has(identity)||!Number.isFinite(eventAgeMs)||eventAgeMs<0||eventAgeMs>=1700){blocked++;return false}const offset=eventAgeMs/1000;if(offset>=pcm.length/sampleRate){blocked++;return false}seen.add(identity);const buffer=context.createBuffer(1,pcm.length,sampleRate);buffer.copyToChannel(pcm,0);const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=1;gain.gain.value=.72;source.connect(gain);gain.connect(context.destination);const voice={source,gain};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect()};source.start(0,offset);played++;return true}
 function stop(){for(const{source,gain}of voices){try{source.stop()}catch{}source.disconnect();gain.disconnect()}voices.clear()}
 function snapshot(){return{verify,gain:verify?0:(enabled ? 0.72 : 0),contextState:context?.state??'not-created',contexts:context?1:0,played,blocked,voices:voices.size,pcmFrames:pcm.length,sampleRate}}
 async function dispose(){disposed=true;enabled=false;stop();if(context){await context.close();context=null}}
 return{activateFromGesture,playOnce,stop,snapshot,dispose};
}
