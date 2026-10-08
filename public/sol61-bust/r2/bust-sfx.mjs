import {BUST_DURATIONS,BUST_CONTACT_MS,BUST_CUT_MS} from './bust.mjs';
// Original synthetic friction/contact/tension release. No recorded sample.
export function synthesizeBust(variant,sampleRate=48000) {
  if(!BUST_DURATIONS[variant]||!Number.isFinite(sampleRate)||sampleRate<8000)throw new TypeError('Invalid Bust audio input');
  const duration=variant==='timed-bust-start'?0.625:0.46;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=variant==='timed-bust-start'?3719:7919,low=0,mid=0;
  const lowK=1-Math.exp(-2*Math.PI*180/sampleRate),midK=1-Math.exp(-2*Math.PI*2600/sampleRate);
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate;seed=(1664525*seed+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=lowK*(noise-low);mid+=midK*(noise-mid);
    const friction=mid-low,high=noise-mid;
    let value=0;
    if(variant==='timed-bust-start') {
      // The slide terminates at the first key engagement, not an arbitrary beep.
      const slide=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-0.025)/0.175)));
      if(t>=0.025&&t<0.20)value+=0.23*friction*slide;
      for(const atMs of BUST_CONTACT_MS) {
        const a=t-atMs/1000;
        if(a>=0) value+=0.38*high*Math.exp(-a*165)+0.16*friction*Math.exp(-a*63)
          +0.075*(Math.sin(2*Math.PI*643*a)+0.40*Math.sin(2*Math.PI*1709*a))*Math.exp(-a*92);
      }
      // Finite release of the registered interface, without a sustained musical tone.
      if(t>=0.44) { const a=t-0.44; value+=0.10*friction*Math.exp(-a*30); }
    } else {
      // Initial load release precedes the middle/up/down joint rupture sequence.
      value+=0.23*low*Math.exp(-t*22);
      for(const atMs of BUST_CUT_MS) {
        const a=t-atMs/1000;
        if(a>=0) value+=0.40*high*Math.exp(-a*130)+0.16*friction*Math.exp(-a*42)
          +0.07*(Math.sin(2*Math.PI*237*a)+0.31*Math.sin(2*Math.PI*821*a))*Math.exp(-a*66);
      }
      // Broadband granular relaxation follows disappearing domain support.
      if(t>=0.20) { const a=t-0.20; value+=0.14*friction*Math.exp(-a*17); }
    }
    const attack=Math.min(1,t*sampleRate/12),tail=Math.min(1,(duration-t)/0.018);
    pcm[i]=Math.tanh(value)*attack*tail;
  }
  return pcm;
}

export function createBustSfx({context,verify=false,muted=false}={}) {
  if(!context)throw new TypeError('Caller-owned AudioContext required');
  let disposed=false,unlocked=false,epoch=0;
  const causes=new Map(),nodes=new Set();
  const dedupCapacity=128,dedupWindowActorMs=2000;
  function pruneCauses(){const at=context.currentTime;for(const [cause,expiresAt] of causes)if(at>=expiresAt)causes.delete(cause);}
  function stop(){epoch++;for(const node of nodes){try{node.stop();}catch{}node.disconnect();}nodes.clear();}
  return {
    async unlock(){const own=epoch;if(disposed||verify||muted)return false;await context.resume();if(disposed||own!==epoch||verify||muted)return false;unlocked=context.state==='running';return unlocked;},
    setMuted(value){muted=Boolean(value);if(muted){unlocked=false;stop();}},
    async request({causeId,variant,ageMs,completion,playbackRate=1}={}) {
      if(!causeId||!BUST_DURATIONS[variant]||!Number.isFinite(ageMs)||!completion||typeof completion.then!=='function'||!Number.isFinite(playbackRate)||playbackRate<=0)throw new TypeError('Bust cause/frame completion and positive playback rate required');
      pruneCauses();
      if(disposed||verify||muted||!unlocked||ageMs<0||ageMs>100||causes.has(causeId)||causes.size>=dedupCapacity)return false;
      const own=epoch;const requestedAt=context.currentTime;
      // The caller retains authoritative event age. An expired event cannot be
      // replayed by presenting its true age, and live entries are never evicted.
      causes.set(causeId,Math.min(Number.MAX_VALUE,requestedAt+dedupWindowActorMs/(1000*playbackRate)));
      try{await completion;}catch{return false;}
      if(disposed||own!==epoch||verify||muted||!unlocked||context.state!=='running'||ageMs+(context.currentTime-requestedAt)*1000*playbackRate>100)return false;
      const pcm=synthesizeBust(variant,context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.copyToChannel(pcm,0);
      const node=context.createBufferSource();node.buffer=buffer;node.playbackRate.value=playbackRate;node.connect(context.destination);nodes.add(node);
      node.onended=()=>{nodes.delete(node);node.disconnect();};node.start();return true;
    },
    stop,
    dispose(){if(disposed)return;disposed=true;unlocked=false;stop();causes.clear();},
    snapshot(){pruneCauses();return {disposed,unlocked,verify,muted,epoch,causes:causes.size,activeNodes:nodes.size,dedupCapacity,dedupWindowActorMs};}
  };
}
