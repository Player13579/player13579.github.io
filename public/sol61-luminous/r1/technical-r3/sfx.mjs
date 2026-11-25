const PROFILES=Object.freeze({
 commit:{duration:.11,base:620,end:790,harmonics:[1,.27,.11],noise:.10,gain:.055},
 erase:{duration:.22,base:920,end:1450,harmonics:[1,.18,.08],noise:.18,gain:.075},
 acceleration:{duration:.24,base:680,end:1140,harmonics:[1,.33,.15],noise:.08,gain:.057},
 failure:{duration:.27,base:360,end:120,harmonics:[1,.31,.22],noise:.23,gain:.075},
 barrier:{duration:.18,base:920,end:660,harmonics:[1,.17,.31],noise:.08,gain:.052},
 body:{duration:.15,base:220,end:150,harmonics:[1,.42,.16],noise:.35,gain:.075},
 blocked:{duration:.18,base:520,end:420,harmonics:[1,.35,.25],noise:.12,gain:.062}
});
export function createCuePcm(kind,sampleRate=48000){
 const p=PROFILES[kind];if(!p)throw new TypeError('Unknown cue');
 if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new TypeError('Invalid sample rate');
 const result=new Float32Array(Math.ceil(p.duration*sampleRate));let phase=0;let seed=0x2f01d335;
 for(let i=0;i<result.length;i++){
   const t=i/sampleRate,x=t/p.duration;
   const envelope=Math.min(1,t/.008)*Math.pow(Math.max(0,1-x),2.6);
   const frequency=p.base*Math.pow(p.end/p.base,x);phase+=2*Math.PI*frequency/sampleRate;
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
   const noise=(seed>>>0)/4294967296*2-1;
   let v=noise*p.noise;
   p.harmonics.forEach((amplitude,h)=>{v+=amplitude*Math.sin(phase*(h===2?3.07:h+1)+h*.37);});
   result[i]=v*envelope*p.gain;
 }
 return result;
}
export function createLuminousAudio({verify=false}={}){
 let context=null,unlocked=false,disposed=false,disposal=null;
 const nodes=new Set();let requests=0,played=0,muted=0,lastError=null;
 let closeState='not-requested',closeSettled=false,closeError=null,cleanupError=null;
 function record(error){lastError=String(error?.stack||error);return lastError;}
 function disconnect(item){
  const errors=[];
  for(const node of [item.source,item.gain])if(node)try{node.disconnect();}catch(error){errors.push(record(error));}
  return errors;
 }
 async function unlock(){
   if(verify||disposed)return false;
   try{
     const C=globalThis.AudioContext||globalThis.webkitAudioContext;
     if(!C)throw new Error('Web Audio unavailable');
     context??=new C();await context.resume();unlocked=!disposed&&context.state==='running';
     if(unlocked)lastError=null;
     return unlocked;
   }catch(e){record(e);return false;}
 }
 function cue(kind,identity){
   requests++;
   let item;
   try{
    if(verify||disposed||!unlocked||context?.state!=='running'){muted++;return false;}
    const pcm=createCuePcm(kind,context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.copyToChannel(pcm,0);
    item={source:null,gain:null,identity};nodes.add(item);
    const source=item.source=context.createBufferSource(),gain=item.gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(context.destination);
    source.onended=()=>{nodes.delete(item);const errors=disconnect(item);if(errors.length)cleanupError=errors.join('; ');};
    source.start();played++;return true;
   }catch(error){record(error);if(item){nodes.delete(item);const errors=disconnect(item);if(errors.length)cleanupError=errors.join('; ');}return false;}
 }
 function cancel(){
  if(!context)return;
  for(const item of nodes){try{const now=context.currentTime;item.gain.gain.cancelScheduledValues(now);item.gain.gain.setValueAtTime(item.gain.gain.value,now);item.gain.gain.linearRampToValueAtTime(0,now+.012);item.source.stop(now+.014);}catch(e){record(e);}}
 }
 function finish(){}
 function dispose(){
  if(disposal)return disposal;
  disposed=true;unlocked=false;closeState=context?'pending':'no-context';
  disposal=(async()=>{
   cancel();
   const errors=[];
   if(context){
    try{
     await context.close();
     if(context.state!=='closed')throw new Error('AudioContext.close completed without closed state');
     closeState='closed';
    }catch(error){closeState='error';closeError=record(error);errors.push(closeError);}
   }
   closeSettled=true;
   for(const item of nodes){
    try{if(item.source)item.source.onended=null;}catch(error){errors.push(record(error));}
    errors.push(...disconnect(item));
   }
   nodes.clear();
   if(errors.length){cleanupError=errors.join('; ');throw new Error(cleanupError);}
   if(cleanupError)throw new Error(cleanupError);
  })();
  return disposal;
 }
 function snapshot(){
  let state='not-created';
  try{if(context)state=context.state;}catch(error){state='unknown';record(error);}
  return {verify,unlocked,disposed,disposedRequested:disposed,disposeSettled:closeSettled,state,closeState,closeSettled,closeError,cleanupError,requests,played,muted,activeNodes:nodes.size,lastError,listening:'not_run'};
 }
 return Object.freeze({unlock,cue,cancel,finish,dispose,snapshot});
}
