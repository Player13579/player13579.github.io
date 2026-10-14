// GPT-6.1-Sol R5: synthetic grip friction and displaced air, not a recording.
export function synthThrowPcm({sampleRate=48000,durationMs=600,speedWorldPerMs=.95}={}) {
  if (![sampleRate,durationMs,speedWorldPerMs].every(Number.isFinite)||sampleRate<=0||durationMs<=0||speedWorldPerMs<0) throw new TypeError('finite sound inputs required');
  const seconds=Math.min(.6,durationMs/1000), length=Math.ceil(sampleRate*seconds);
  const pcm=new Float32Array(length),speed=Math.min(2,speedWorldPerMs/.95);
  let seed=0x517cc1b7,low=0,slow=0,previous=0;
  for(let i=0;i<length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/2147483648-1,t=i/sampleRate;
    const coefficient=1-Math.exp(-2*Math.PI*(900+speed*1800)/sampleRate);
    low+=coefficient*(noise-low);slow+=(1-Math.exp(-2*Math.PI*150/sampleRate))*(noise-slow);
    const air=(low-slow),friction=noise-previous;previous=noise;
    const attack=Math.min(1,t/.018),close=Math.min(1,Math.max(0,(seconds-t)/.028));
    const travel=attack*close*Math.exp(-t/.23)*(1+.18*speed);
    const slip=t<.055?Math.sin(Math.PI*t/.055)**2*Math.exp(-t/.017):0;
    pcm[i]=air*.105*travel+friction*.042*slip;
  }
  return {pcm,seconds,sampleRate,mechanism:'synthetic grip slip plus band-limited air displacement'};
}
export function createThrowSfx({AudioContextClass=globalThis.AudioContext}={}) {
  if(typeof AudioContextClass!=='function')throw new Error('Web Audio unavailable');
  const context=new AudioContextClass(),played=new Set(),voices=new Map();let disposed=false,closeSettled=false,closeError=null,disposePromise=null;
  async function unlock(){if(disposed)return {status:'disposed'};await context.resume();return {status:disposed?'disposed':context.state==='running'?'running':'await-running'};}
  function play({causeId,speedWorldPerMs,durationMs=600,ageMs=0,verify=false,enabled=true,visibleFrameComplete=false}={}) {
    if(disposed)return {status:'disposed'};
    if(verify||!enabled)return {status:'silent-gated'};
    if(!visibleFrameComplete)return {status:'await-visible-frame'};
    const id=String(causeId||'');
    if(!id||![speedWorldPerMs,durationMs,ageMs].every(Number.isFinite)||speedWorldPerMs<0||durationMs<=0||ageMs<0)throw new TypeError('stable cause, speed, duration and nonnegative event age required');
    if(speedWorldPerMs===0)return {status:'stationary'};
    const seconds=Math.min(.6,durationMs/1000),offset=ageMs/1000;
    if(offset>=seconds)return {status:'expired',causeId:id};
    if(played.has(id))return {status:'duplicate-suppressed',causeId:id};
    if(context.state!=='running')return {status:'await-running',causeId:id};
    let source,gain,startAttempted=false,cleaned=false,stage='pcm';
    const cleanup=()=>{if(cleaned)return;cleaned=true;voices.delete(id);for(const node of [source,gain]){try{node?.disconnect();}catch{}}};
    try {
      const result=synthThrowPcm({sampleRate:context.sampleRate,durationMs,speedWorldPerMs});
      stage='buffer';const buffer=context.createBuffer(1,result.pcm.length,context.sampleRate);buffer.getChannelData(0).set(result.pcm);
      stage='source';source=context.createBufferSource();source.buffer=buffer;
      stage='gain';gain=context.createGain();gain.gain.value=1;
      stage='connect';source.connect(gain);gain.connect(context.destination);
      source.addEventListener('ended',cleanup,{once:true});
      // A second state gate protects a suspension during graph allocation.
      if(context.state!=='running'){cleanup();return {status:'await-running',causeId:id};}
      stage='start';startAttempted=true;source.start(context.currentTime,offset);
      played.add(id);voices.set(id,{source,cleanup});
      return {status:'started',causeId:id,offsetSeconds:offset,durationSeconds:seconds-offset,mechanism:result.mechanism};
    } catch(error){if(startAttempted){try{source?.stop();}catch{}}cleanup();return {status:'retryable-failure',causeId:id,stage,message:String(error?.message||error)};}
  }
  function stop(id){const voice=voices.get(String(id||''));if(!voice)return false;try{voice.source.stop();}catch{}voice.cleanup();return true;}
  function stopAll(){for(const id of [...voices.keys()])stop(id);}
  function retirementSnapshot(){return Object.freeze({settled:disposed&&closeSettled,contextState:context.state,voicesRemaining:voices.size,pendingCount:0,errors:closeError?[closeError]:[]});}
  async function dispose(){if(disposePromise)return disposePromise;disposed=true;disposePromise=(async()=>{stopAll();try{await context.close();closeSettled=true;}catch(error){closeError=String(error?.message||error);throw error;}finally{played.clear();}})();return disposePromise;}
  return Object.freeze({unlock,play,stop,stopAll,dispose,get playedCauses(){return [...played];},get state(){return disposed?'disposed':context.state;},get retirement(){return retirementSnapshot();}});
}
