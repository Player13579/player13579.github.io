import {synthesize,sampleRate} from '../r6/sfx.mjs';
export {synthesize,sampleRate};
export function createSoundGate({verify=false,AudioContextClass}={}){
 let context=null,enabled=false,played=0,blocked=0,disposed=false;const voices=new Set(),seen=new Set(),pcm=synthesize();
 async function activateFromGesture(){if(verify||disposed){blocked++;return false;}const C=AudioContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;context??=new C();await context.resume();enabled=context.state==='running';return enabled;}
 function playOnce(identity,eventAgeMs=0){if(verify||disposed||!enabled||context?.state!=='running'||voices.size>=4||!identity||seen.has(identity)||!Number.isFinite(eventAgeMs)||eventAgeMs<0||eventAgeMs>=1700){blocked++;return false;}seen.add(identity);const offset=eventAgeMs/1000;if(offset>=pcm.length/sampleRate)return false;const buffer=context.createBuffer(1,pcm.length,sampleRate);buffer.copyToChannel(pcm,0);const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.72;source.connect(gain);gain.connect(context.destination);const voice={source,gain};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};source.start(0,offset);played++;return true;}
 function snapshot(){return{version:'sol61-mana-zero-r7-sfx',verify,immutableSilent:verify,enabled:verify?false:enabled,contextState:context?.state||'not-created',played,blocked,activeVoices:voices.size};}
 function stop(){for(const{source,gain}of voices){try{source.stop()}catch{}source.disconnect();gain.disconnect();}voices.clear()}
 async function dispose(){disposed=true;enabled=false;stop();if(context){await context.close();context=null;}}
 return{activateFromGesture,playOnce,snapshot,stop,dispose};
}
