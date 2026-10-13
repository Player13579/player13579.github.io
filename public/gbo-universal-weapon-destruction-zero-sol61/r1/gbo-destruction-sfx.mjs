// Newly authored synthetic stress/rupture/collapse, no recording or material assertion.
export function synthesizeDestruction(sampleRate=48000) {
 const duration=1.42, data=new Float32Array(Math.ceil(duration*sampleRate));
 let seed=0x715ce119, low=0, band=0;
 const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 for(let i=0;i<data.length;i++) {
  const t=i/sampleRate, n=rnd(); low+=0.025*(n-low); band+=0.28*(n-band);
  const stress=t<.22?Math.sin(Math.PI*Math.min(1,t/.22))**2*(band-low)*.19:0;
  let rupture=0;
  for(const [at,amp,decay] of [[.22,.43,42],[.35,.31,33],[.49,.25,29]]) {
   const s=t-at; if(s>=0) rupture+=amp*(1-Math.exp(-s*1800))*Math.exp(-s*decay)*(n*.64+band*.36);
  }
  const c=t-.60;
  const collapse=c>=0?(1-Math.exp(-c*22))*Math.exp(-c*6.8)*(low*.80+(band-low)*.19):0;
  const tail=Math.min(1,Math.max(0,(1.42-t)/.065));
  data[i]=(stress+rupture+collapse)*tail;
 }
 return {data,sampleRate,duration,kind:'synthetic_non_material_specific_fracture'};
}
export function createDestructionAudio({verify=false,createAudioContext,onState=()=>{}}={}) {
 let ctx=null,enabled=false,epoch=0,error=null,contextCreations=0,closed=false;
 const voices=new Map(), consumed=new Set();
 const report=()=>({verifyHardMute:!!verify,contextCreations,voices:voices.size,enabled,state:ctx?.state??'absent',error,closed});
 function stop(disable=true){epoch++;if(disable)enabled=false;for(const [voice,gain] of voices){try{voice.stop();}catch{}try{voice.disconnect();gain.disconnect();}catch{}}voices.clear();}
 async function activate(valid=()=>true){
  if(verify||closed||!valid())return false;
  const token=epoch;
  try {
   if(!ctx){ctx=createAudioContext();contextCreations++;}
   if(ctx.state!=='running')await ctx.resume();
   if(closed||token!==epoch||!valid())return false;
   enabled=ctx.state==='running'; if(!enabled)error='AudioContext did not enter running';else error=null;
  }catch(e){enabled=false;error=String(e.message??e);}
  onState(report());return enabled;
 }
 function play(causeId,age,valid=()=>true){
  if(verify||closed||!valid()||!enabled||ctx?.state!=='running'||consumed.has(causeId)||age>=1.42)return false;
  let source;
  try {
   const signal=synthesizeDestruction(ctx.sampleRate),buffer=ctx.createBuffer(1,signal.data.length,signal.sampleRate);
   buffer.copyToChannel(signal.data,0);source=ctx.createBufferSource();source.buffer=buffer;
   const gain=ctx.createGain();gain.gain.value=.7;source.connect(gain);gain.connect(ctx.destination);
   source.onended=()=>{voices.delete(source);try{source.disconnect();gain.disconnect();}catch{}};
   // Recheck before starting. A suspended context never consumes a cause.
   if(ctx.state!=='running'||!valid()){source.disconnect();gain.disconnect();return false;}
   source.start(ctx.currentTime,Math.max(0,age));voices.set(source,gain);consumed.add(causeId);error=null;onState(report());return true;
  }catch(e){try{source?.disconnect();}catch{}error=String(e.message??e);onState(report());return false;}
 }
 async function close(){if(closed)return report();closed=true;stop();if(ctx&&ctx.state!=='closed')try{await ctx.close();}catch(e){error=String(e);}onState(report());return report();}
 return {activate,play,stop,close,snapshot:report};
}
