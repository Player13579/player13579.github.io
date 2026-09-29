export const sampleRate=48000;
const tau=Math.PI*2;
const clamp=n=>Math.max(0,Math.min(1,n));
const fade=(a,b,t)=>{const n=clamp((t-a)/(b-a));return n*n*(3-2*n)};
// New finite score: one intake resonance expands into a settled chord. No packet arrival motif.
export function synthesize(){const data=new Float32Array(sampleRate*1.7);for(let i=0;i<data.length;i++){const t=i/sampleRate,attack=fade(0,.075,t),off=1-fade(1.36,1.7,t);const draw=attack*(1-fade(.73,1.10,t));const phase=tau*(159*t+23*t*t);const intake=.064*draw*(Math.sin(phase)+.31*Math.sin(phase*2+.48)+.12*Math.sin(phase*3.01));const x=t-.80;const settle=x>0?(1-Math.exp(-x/.04))*Math.exp(-x/.24):0;const chord=.079*settle*(Math.sin(tau*246.94*x)+.50*Math.sin(tau*369.99*x)+.17*Math.sin(tau*617.35*x));const shimmer=.014*fade(.04,.24,t)*(1-fade(.72,1.18,t))*Math.sin(tau*(892*t-85*t*t))*Math.sin(Math.PI*clamp(t/1.18));data[i]=(intake+chord+shimmer)*off;}return data;}
export function createSoundGate({verify=false,AudioContextClass}={}){let context=null,enabled=false,played=0,blocked=0;const voices=new Set();const pcm=synthesize();
 async function activateFromGesture(){if(verify){blocked++;return false;}const C=AudioContextClass||globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;context??=new C();await context.resume();enabled=context.state==='running';return enabled;}
 function play(){if(verify||!enabled||context?.state!=='running'||voices.size>=4){blocked++;return false;}const buffer=context.createBuffer(1,pcm.length,sampleRate);buffer.copyToChannel(pcm,0);const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.72;source.connect(gain);gain.connect(context.destination);const voice={source,gain};voices.add(voice);source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};source.start();played++;return true;}
 function snapshot(){return{version:'sol61-mana-zero-r1-sfx',verify,immutableSilent:verify,enabled:verify?false:enabled,contextState:context?.state||'not-created',played,blocked,activeVoices:voices.size};}
 async function dispose(){enabled=false;for(const {source,gain}of voices){try{source.stop()}catch{}source.disconnect();gain.disconnect();}voices.clear();if(context){await context.close();context=null;}}
 return{activateFromGesture,play,snapshot,dispose};
}
