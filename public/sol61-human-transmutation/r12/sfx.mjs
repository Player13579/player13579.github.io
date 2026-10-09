// Synthetic dry material condensation; no existing samples or pitched beep.
export function synthesizeHumanSFX(sampleRate=48000) {
  if(!Number.isSafeInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('Valid PCM sample rate required');
  const pcm=new Float32Array(Math.ceil(sampleRate*1.2));let seed=0x5f2178,low=0,mid=0,previous=0;
  for(let i=0;i<pcm.length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=(seed>>>0)/2147483648-1,t=i/sampleRate;
    // Two fixed material bands: high dry friction and low soft closure, no pitch sweep.
    low+=.032*(noise-low);mid+=.29*(noise-mid);
    const friction=mid-low,grain=friction-previous*.42;previous=friction;
    const rise=1-Math.exp(-t/0.018),main=Math.max(0,1-t/.86);
    const packets=.56+.44*Math.pow(Math.sin(Math.PI*t/.085),2);
    const lower=Math.exp(-Math.pow((t-.13)/.115,2));
    const trunk=Math.exp(-Math.pow((t-.40)/.22,2));
    const crown=Math.exp(-Math.pow((t-.73)/.105,2));
    const closure=Math.exp(-Math.pow((t-.84)/.045,2));
    const tail=t>.91?Math.pow(Math.max(0,(1.17-t)/.26),2):1;
    pcm[i]=rise*tail*(grain*(.10*main*packets+.045*lower+.06*trunk+.045*crown)+low*closure*.32);
  }
  return pcm;
}

function completedSourceReceipt(receipt,causeId,generation) {
  return !!receipt&&receipt.causeId===causeId&&receipt.generation===generation&&receipt.active===true&&
    receipt.actorVisible===true&&receipt.sourceEnabled===true&&receipt.queueCompleted===true&&
    Number.isSafeInteger(receipt.submitted)&&receipt.submitted>0&&receipt.completed===receipt.submitted;
}

export function createHumanSFX({verify=false,onStatus=()=>{}}={}) {
  let context=null,buffer=null,current=null,epoch=0,disposed=false,unlockPromise=null;
  const succeeded=new Set(),retired=new Set(),inFlight=new Map();
  const keyFor=(causeId,generation)=>`${String(causeId)}\u0000${generation}`;
  function stop(reason='stopped') {
    epoch++;
    const entry=current;current=null;
    if(entry)retired.add(entry.key);
    for(const key of inFlight.keys())retired.add(key);
    if(entry){try{entry.source.stop();}catch{}try{entry.source.disconnect();}catch{}try{entry.gain.disconnect();}catch{}}
    onStatus(reason);
  }
  function retire(causeId,generation,reason='retired') {
    if(causeId&&Number.isSafeInteger(generation))retired.add(keyFor(causeId,generation));
    stop(reason);
  }
  async function unlock() {
    if(verify){onStatus('verify-audio-zero');return false;}
    if(disposed)return false;
    if(context?.state==='running')return true;
    if(unlockPromise)return unlockPromise;
    try {
      context??=new (globalThis.AudioContext??globalThis.webkitAudioContext)();
      const resumeResult=context.resume();
      const task=Promise.resolve(resumeResult).then(()=>{
        if(disposed)return false;
        if(context?.state==='running'){onStatus('audio-unlocked');return true;}
        onStatus('audio-gesture-required');return false;
      },error=>{
        if(!disposed)onStatus(`audio-unavailable: ${error?.message??String(error)}`);
        return false;
      }).finally(()=>{if(unlockPromise===task)unlockPromise=null;});
      unlockPromise=task;
      return await task;
    } catch(error) {
      if(!disposed)onStatus(`audio-unavailable: ${error?.message??String(error)}`);
      return false;
    }
  }
  async function start({causeId,generation,elapsedMs,durationMs=1200,frameReceipt,valid=()=>true}={}) {
    if(verify){onStatus('verify-audio-zero');return false;}
    const readElapsed=()=>typeof elapsedMs==='function'?elapsedMs():elapsedMs;
    const initialElapsed=readElapsed();
    if(disposed||!causeId||!Number.isSafeInteger(generation)||!Number.isFinite(initialElapsed)||initialElapsed<0||initialElapsed>=durationMs||
      !completedSourceReceipt(frameReceipt,causeId,generation)||!valid())return false;
    const key=keyFor(causeId,generation);
    if(current?.key===key)return true;
    if(succeeded.has(key)||retired.has(key)){onStatus('cause-already-consumed');return false;}
    const pending=inFlight.get(key);
    if(pending?.epoch===epoch)return pending.promise;
    if(current||inFlight.size)stop('replacing');
    const ticket=epoch,attempt={epoch:ticket,promise:null};
    attempt.promise=Promise.resolve().then(async()=>{
      let source=null,gain=null,entry=null;
      try {
        if(unlockPromise)await unlockPromise;
        let phase=readElapsed();
        if(disposed||ticket!==epoch||!Number.isFinite(phase)||phase<0||phase>=durationMs||!valid()||!completedSourceReceipt(frameReceipt,causeId,generation))return false;
        if(!context||context.state!=='running'){onStatus('audio-gesture-required');return false;}
        if(!buffer){const pcm=synthesizeHumanSFX(context.sampleRate);const next=context.createBuffer(1,pcm.length,context.sampleRate);next.copyToChannel(pcm,0);buffer=next;}
        source=context.createBufferSource();gain=context.createGain();source.buffer=buffer;source.playbackRate.value=1200/durationMs;gain.gain.value=.8;
        source.connect(gain).connect(context.destination);
        entry={key,causeId,generation,source,gain};
        source.onended=()=>{try{source.disconnect();}catch{}try{gain.disconnect();}catch{}if(current===entry){current=null;onStatus('ended');}};
        phase=readElapsed();
        if(disposed||ticket!==epoch||!Number.isFinite(phase)||phase<0||phase>=durationMs||!valid()||!completedSourceReceipt(frameReceipt,causeId,generation)){
          try{source.stop();}catch{}try{source.disconnect();}catch{}try{gain.disconnect();}catch{}
          return false;
        }
        source.start(0,phase/1000*1200/durationMs);
        current=entry;succeeded.add(key);onStatus('playing-synthetic');return true;
      } catch(error) {
        if(source){try{source.stop();}catch{}try{source.disconnect();}catch{}}
        if(gain){try{gain.disconnect();}catch{}}
        if(current===entry)current=null;
        if(!disposed)onStatus(`audio-unavailable: ${error?.message??String(error)}`);
        return false;
      } finally {
        if(inFlight.get(key)===attempt)inFlight.delete(key);
      }
    });
    inFlight.set(key,attempt);
    return attempt.promise;
  }
  async function dispose() {
    if(disposed)return;
    disposed=true;stop('disposed');
    const closing=context;context=null;buffer=null;
    try{await closing?.close();}catch{}
  }
  return {unlock,start,stop,retire,dispose,getState:()=>({verify,allocated:!!context,unlocked:context?.state==='running',unlockPending:!!unlockPromise,playing:!!current,causeId:current?.causeId??null,generation:current?.generation??null,pendingStarts:inFlight.size,disposed})};
}
