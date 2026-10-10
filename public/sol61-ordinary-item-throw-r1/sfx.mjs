// Procedural ordinary-air throw cue. Stable event/cause identity is consumed once.
export function createThrowSfx({ AudioContextClass = globalThis.AudioContext } = {}) {
  if (typeof AudioContextClass !== 'function') throw new Error('Web Audio unavailable');
  const context=new AudioContextClass();
  const played=new Set();
  const voices=new Map();
  let disposed=false;
  async function unlock(){ if(disposed)throw new Error('SFX disposed'); return context.resume(); }
  function play({causeId,speedWorldPerMs,durationMs=600,verify=false,enabled=true,visibleFrameComplete=false}={}) {
    if(disposed)throw new Error('SFX disposed');
    if(verify||!enabled)return {status:'silent-gated'};
    if(!visibleFrameComplete)return {status:'await-visible-frame'};
    const id=String(causeId||'');
    if(!id||!Number.isFinite(speedWorldPerMs)||speedWorldPerMs<0||!Number.isFinite(durationMs)||durationMs<=0)
      throw new TypeError('SFX needs stable throw cause, nonnegative physical speed, and duration');
    if(played.has(id))return {status:'duplicate-suppressed',causeId:id};
    played.add(id);
    const speed=Math.max(0,Math.min(1,speedWorldPerMs/0.4));
    const seconds=Math.max(.08,Math.min(.6,durationMs/1000));
    const length=Math.ceil(context.sampleRate*seconds),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1);
    const source=context.createBufferSource(); source.buffer=buffer;
    const high=context.createBiquadFilter(); high.type='highpass'; high.frequency.value=160+speed*260;
    const band=context.createBiquadFilter(); band.type='bandpass'; band.frequency.value=850+speed*2100; band.Q.value=.72;
    const gain=context.createGain(),t=context.currentTime;
    gain.gain.setValueAtTime(.0001,t); gain.gain.linearRampToValueAtTime(.035+speed*.055,t+.018);
    gain.gain.setValueAtTime(.035+speed*.055,t+seconds*.24);
    gain.gain.exponentialRampToValueAtTime(.0001,t+seconds);
    source.connect(high);high.connect(band);band.connect(gain);gain.connect(context.destination);
    source.start(t);source.stop(t+seconds);voices.set(id,source);
    source.addEventListener('ended',()=>{voices.delete(id);source.disconnect();high.disconnect();band.disconnect();gain.disconnect();},{once:true});
    return {status:'started',causeId:id,speed,durationSeconds:seconds,centerHz:850+speed*2100};
  }
  function stop(causeId){const source=voices.get(String(causeId||''));if(!source)return false;try{source.stop();}catch{}return true;}
  function stopAll(){for(const source of voices.values()){try{source.stop();}catch{}}}
  async function dispose(){if(disposed)return;disposed=true;stopAll();await context.close();played.clear();voices.clear();}
  return Object.freeze({unlock,play,stop,stopAll,dispose,get playedCauses(){return [...played];}});
}


