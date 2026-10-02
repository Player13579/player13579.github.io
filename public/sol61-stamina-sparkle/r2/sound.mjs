import {DURATION_MS} from './effect.mjs';
export function synthesize(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('invalid sample rate');
 const n=Math.ceil(sampleRate*DURATION_MS/1000),left=new Float32Array(n),right=new Float32Array(n);
 let seed=0x66131003,filtered=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1};
 for(let i=0;i<n;i++){const t=i/sampleRate,p=t/(DURATION_MS/1000);filtered=filtered*.86+random()*.14;
  const attack=(1-Math.exp(-t/0.035))*Math.exp(-t/.27);const body=Math.sin(Math.PI*Math.min(1,t/.85))**2*Math.exp(-t/.62);
  const warm=Math.sin(2*Math.PI*(172*t+14*t*t))+.33*Math.sin(2*Math.PI*(344*t+7*t*t));
  let contacts=0;for(const at of [.32,.56,.81]){const dt=t-at;if(dt>0)contacts+=(Math.sin(2*Math.PI*982*dt)+.29*Math.sin(2*Math.PI*1537*dt))*(1-Math.exp(-dt/.004))*Math.exp(-dt/.076);}
  const release=Math.max(0,Math.min(1,(1-p)/.13));const sample=(filtered*attack*.35+warm*body*.14+contacts*.055)*release;
  left[i]=sample*(.97+.03*Math.sin(t*6));right[i]=sample*(.97-.03*Math.sin(t*6));
 }return {sampleRate,left,right,durationMs:DURATION_MS};
}
export function createSound({verify=false}={}){
 let context=null,disposed=false,generation=0;const voices=new Map(),seen=new Set();
 async function activate(){if(disposed)throw Error('sound disposed');context??=new AudioContext();await context.resume();return context;}
 async function play(causeId,{ageMs=0,rate=1}={}){if(verify||disposed||seen.has(causeId)||typeof causeId!=='string'||!causeId||!Number.isFinite(ageMs)||ageMs<0||ageMs>=DURATION_MS||!Number.isFinite(rate)||rate<0)return false;
  const ownerGeneration=generation;const ctx=await activate();if(disposed||ownerGeneration!==generation||seen.has(causeId))return false;if(voices.size>=3)return false;
  const data=synthesize(ctx.sampleRate),buffer=ctx.createBuffer(2,data.left.length,ctx.sampleRate);buffer.copyToChannel(data.left,0);buffer.copyToChannel(data.right,1);
  const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=buffer;node.playbackRate.value=rate;gain.gain.value=.6;node.connect(gain);gain.connect(ctx.destination);seen.add(causeId);if(seen.size>128)seen.delete(seen.values().next().value);voices.set(causeId,{node,gain});node.onended=()=>{voices.delete(causeId);node.disconnect();gain.disconnect()};node.start(0,ageMs/1000);return true;
 }
 function stop(){generation++;for(const {node,gain}of voices.values()){try{node.stop()}catch{}node.disconnect();gain.disconnect()}voices.clear();}
 return {activate,play,stop,setRate(rate){if(!Number.isFinite(rate)||rate<0)return;for(const {node}of voices.values())node.playbackRate.setValueAtTime(rate,context.currentTime)},get activeVoices(){return voices.size},get verifyMuted(){return verify},async dispose(){if(disposed)return;disposed=true;stop();if(context)await context.close()}};
}
