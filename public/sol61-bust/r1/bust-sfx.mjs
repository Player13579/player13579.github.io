import {BUST_DURATIONS} from './bust.mjs';
// Original deterministic synthesis: damped plate/contact noise, no recordings.
export function synthesizeBust(variant,sampleRate=48000) {
  if(!BUST_DURATIONS[variant]||!Number.isFinite(sampleRate)||sampleRate<8000)throw new TypeError('Invalid Bust audio input');
  const duration=variant==='timed-bust-start'?0.36:0.43;
  const pcm=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=variant==='timed-bust-start'?3719:7919,low=0,previous=0;
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate;seed=(1664525*seed+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=0.12*(noise-low);const high=noise-previous;previous=noise;
    let value=0;
    if(variant==='timed-bust-start') {
      for(const at of [0,0.065,0.13]){const a=t-at;if(a>=0)value+=0.21*high*Math.exp(-a*130)+0.10*Math.sin(a*2*Math.PI*1140)*Math.exp(-a*65);}
      if(t>=0.13){const a=t-0.13;value+=0.09*(Math.sin(2*Math.PI*390*a)+0.5*Math.sin(2*Math.PI*1031*a))*Math.exp(-a*22);}
    } else {
      value=0.31*high*Math.exp(-t*65)+0.17*low*Math.exp(-t*18);
      for(const at of [0.018,0.042,0.071]){const a=t-at;if(a>=0)value+=0.10*high*Math.exp(-a*110);}
      value+=0.12*Math.sin(2*Math.PI*173*t)*Math.exp(-t*21)+0.045*Math.sin(2*Math.PI*709*t)*Math.exp(-t*37);
    }
    const attack=Math.min(1,t*sampleRate/12),tail=Math.min(1,(duration-t)/0.015);
    pcm[i]=Math.tanh(value)*attack*tail;
  }
  return pcm;
}
export function createBustSfx({context,verify=false,muted=false}={}) {
  if(!context)throw new TypeError('Caller-owned AudioContext required');
  let disposed=false,unlocked=false,epoch=0;
  const causes=new Set(),nodes=new Set();
  function stop(){epoch++;for(const node of nodes){try{node.stop();}catch{}node.disconnect();}nodes.clear();}
  return {
    async unlock(){const own=epoch;if(disposed||verify||muted)return false;await context.resume();if(disposed||own!==epoch||verify||muted)return false;unlocked=context.state==='running';return unlocked;},
    setMuted(value){muted=Boolean(value);if(muted){unlocked=false;stop();}},
    async request({causeId,variant,ageMs,completion,playbackRate=1}={}) {
      if(!causeId||!BUST_DURATIONS[variant]||!Number.isFinite(ageMs)||!completion||typeof completion.then!=='function'||!Number.isFinite(playbackRate)||playbackRate<=0)throw new TypeError('Bust cause/frame completion and positive playback rate required');
      if(disposed||verify||muted||!unlocked||ageMs<0||ageMs>100||causes.has(causeId))return false;
      causes.add(causeId);const own=epoch;const requestedAt=context.currentTime;
      try{await completion;}catch{return false;}
      if(disposed||own!==epoch||verify||muted||!unlocked||context.state!=='running'||ageMs+(context.currentTime-requestedAt)*1000*playbackRate>100)return false;
      const pcm=synthesizeBust(variant,context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.copyToChannel(pcm,0);
      const node=context.createBufferSource();node.buffer=buffer;node.playbackRate.value=playbackRate;node.connect(context.destination);nodes.add(node);
      node.onended=()=>{nodes.delete(node);node.disconnect();};node.start();return true;
    },
    stop,
    dispose(){if(disposed)return;disposed=true;unlocked=false;stop();},
    snapshot(){return {disposed,unlocked,verify,muted,epoch,causes:causes.size,activeNodes:nodes.size};}
  };
}
