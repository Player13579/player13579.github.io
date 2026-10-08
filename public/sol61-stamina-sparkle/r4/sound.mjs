import {DURATION_MS,TRANSIT_STARTS_MS,ARRIVAL_MS} from './effect.mjs';
// Synthesized tactile air-pressure/friction design, not a recorded sound or literal
// physiological model. Three finite supply gestures settle at the visual arrivals.
export function synthesize(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('invalid sample rate');
 const n=Math.ceil(sampleRate*DURATION_MS/1000),left=new Float32Array(n),right=new Float32Array(n);
 let seed=0x66131004,low=0,mid=0;
 const lowRate=1-Math.exp(-2*Math.PI*180/sampleRate),midRate=1-Math.exp(-2*Math.PI*2100/sampleRate);
 const smooth=(a,b,x)=>{const s=Math.min(1,Math.max(0,(x-a)/(b-a)));return s*s*(3-2*s)};
 for(let i=0;i<n;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
  low+=lowRate*(noise-low);mid+=midRate*(noise-mid);
  const t=i/sampleRate;
  let supply=0,arrival=0;
  for(let route=0;route<3;route++){
   const age=t-TRANSIT_STARTS_MS[route]/1000;
   if(age>0&&age<.48)supply+=Math.sin(Math.PI*age/.48)**1.8*(1-route*.08);
   const at=t-ARRIVAL_MS[route]/1000;
   if(at>0&&at<.22)arrival+=(1-Math.exp(-at/.005))*Math.exp(-at/.060)*(1-smooth(.16,.22,at));
  }
  const settling=smooth(.72,.84,t)*(1-smooth(.94,1.17,t));
  const release=1-smooth(1.02,1.32,t);
  const sample=((mid-low)*(.20*supply+.31*arrival)+low*(.53*supply+.36*settling))*release;
  left[i]=sample;right[i]=sample*.985+(noise-mid)*.006*arrival*release;
 }
 return {sampleRate,left,right,durationMs:DURATION_MS};
}
export function createSound({verify=false}={}){
 let context=null,disposed=false,generation=0;const voices=new Map(),seen=new Set();
 async function activate(){if(disposed)throw Error('sound disposed');if(verify)return null;context??=new AudioContext();await context.resume();return context;}
 async function play(causeId,{ageMs=0,rate=1}={}){
  if(verify||disposed||seen.has(causeId)||typeof causeId!=='string'||!causeId||!Number.isFinite(ageMs)||ageMs<0||ageMs>=DURATION_MS||!Number.isFinite(rate)||rate<0)return false;
  const ownerGeneration=generation,ctx=await activate();
  if(disposed||ownerGeneration!==generation||seen.has(causeId)||ctx.state!=='running'||voices.size>=3)return false;
  const data=synthesize(ctx.sampleRate),buffer=ctx.createBuffer(2,data.left.length,ctx.sampleRate);buffer.copyToChannel(data.left,0);buffer.copyToChannel(data.right,1);
  const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=buffer;node.playbackRate.value=rate;gain.gain.value=.6;node.connect(gain);gain.connect(ctx.destination);
  const voice={node,gain};voices.set(causeId,voice);
  node.onended=()=>{if(voices.get(causeId)===voice)voices.delete(causeId);node.disconnect();gain.disconnect()};
  try{node.start(0,ageMs/1000);}catch(error){voices.delete(causeId);node.disconnect();gain.disconnect();throw error;}
  seen.add(causeId);if(seen.size>128)seen.delete(seen.values().next().value);return true;
 }
 function stop(){generation++;for(const {node,gain}of voices.values()){try{node.stop()}catch{}node.disconnect();gain.disconnect()}voices.clear();}
 return {activate,play,stop,setRate(rate){if(!Number.isFinite(rate)||rate<0)return;for(const {node}of voices.values())node.playbackRate.setValueAtTime(rate,context.currentTime)},get activeVoices(){return voices.size},get verifyMuted(){return verify},async dispose(){if(disposed)return;disposed=true;stop();if(context)await context.close()}};
}
