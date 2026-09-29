export const soundVersion='sol61-cooldown-zero-r3-sfx';
export const sampleRate=48000;
export const soundDuration=1.50;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function pulse(t,at,dur,f,weight){let x=t-at;if(x<0||x>dur)return 0;const ramp=Math.min(1,x/0.009)*Math.pow(1-x/dur,2.4);return weight*ramp*(Math.sin(2*Math.PI*f*x)+0.30*Math.sin(2*Math.PI*f*1.51*x)+0.10*Math.sin(2*Math.PI*f*2.01*x));}
export function synthesize(rate=sampleRate){const data=new Float32Array(Math.ceil(rate*soundDuration));for(let i=0;i<data.length;i++){let t=i/rate;let v=0;
 // 固有の縮む間隔: 三つの柔らかい接合音が0.20→0.14→0.09sへ詰まり、0.90sで解放する。
 for(const [at,f,w] of [[.30,310,.14],[.50,390,.14],[.64,470,.14],[.73,560,.12]])v+=pulse(t,at,.16,f,w);
 let x=t-.30;if(x>=0&&x<.61){const e=Math.sin(Math.PI*x/.61)**1.8;const phase=2*Math.PI*(130*x+190*x*x);v+=.07*e*(Math.sin(phase)+.25*Math.sin(phase*2.18));}
 v+=pulse(t,.90,.54,760,.16)+pulse(t,.95,.48,1138,.055)+pulse(t,1.13,.30,1518,.025);
 const end=clamp((soundDuration-t)/.10,0,1);data[i]=v*end;
 }return data;}
export function createSoundGate({verify=false,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}={}){let ctx=null,enabled=false,played=0,blocked=0,voices=new Set();
 const snapshot=()=>({version:soundVersion,verify,immutableSilent:verify,enabled,contextState:ctx?.state||'not-created',played,blocked,activeVoices:voices.size});
 async function activateFromGesture(){if(verify){blocked++;return false;}if(!AudioContextClass)return false;ctx ||= new AudioContextClass();await ctx.resume();enabled=ctx.state==='running';return enabled;}
 function play(){if(verify||!enabled||!ctx){blocked++;return false;}const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*soundDuration),ctx.sampleRate);buffer.copyToChannel(synthesize(ctx.sampleRate),0);const source=ctx.createBufferSource();source.buffer=buffer;const gain=ctx.createGain();gain.gain.value=.50;source.connect(gain).connect(ctx.destination);voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect()};source.start();played++;return true;}
 async function dispose(){for(const v of voices){try{v.stop()}catch{}}voices.clear();if(ctx)await ctx.close();ctx=null;enabled=false;}
 return {activateFromGesture,snapshot,play,dispose};}



