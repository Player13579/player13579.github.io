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
export function createHumanSFX({verify=false,onStatus=()=>{}}={}) {
  let context=null,buffer=null,current=null,pending=0,disposed=false,startedCauseId=null;
  function stop(reason='stopped') {
    pending++;if(current){try{current.source.stop();}catch{}current.source.disconnect();current.gain.disconnect();current=null;}onStatus(reason);
  }
  async function start({causeId,elapsedMs,durationMs=1200,valid=()=>true}={}) {
    if(verify){onStatus('verify-audio-zero');return false;}
    if(disposed||!causeId||!Number.isFinite(elapsedMs)||elapsedMs<0||elapsedMs>=durationMs||!valid())return false;
    if(current?.causeId===causeId)return true;
    if(startedCauseId===causeId){onStatus('cause-already-consumed');return false;}
    stop('replacing');const ticket=pending;
    try {
      context??=new (globalThis.AudioContext??globalThis.webkitAudioContext)();await context.resume();
      if(disposed||ticket!==pending||!valid())return false;
      if(context.state!=='running'){onStatus('audio-gesture-required');return false;}
      if(!buffer){const pcm=synthesizeHumanSFX(context.sampleRate);buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.copyToChannel(pcm,0);}
      const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=1200/durationMs;gain.gain.value=.8;
      source.connect(gain).connect(context.destination);const entry={causeId,source,gain};current=entry;
      source.onended=()=>{source.disconnect();gain.disconnect();if(current===entry){current=null;onStatus('ended');}};
      source.start(0,elapsedMs/1000*1200/durationMs);startedCauseId=causeId;onStatus('playing-synthetic');return true;
    } catch(e){onStatus(`audio-unavailable: ${e.message}`);return false;}
  }
  async function dispose(){disposed=true;stop('disposed');await context?.close();context=null;buffer=null;}
  return {start,stop,dispose,getState:()=>({verify,allocated:!!context,playing:!!current,causeId:current?.causeId??null,disposed})};
}
