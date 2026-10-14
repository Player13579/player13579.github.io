import {normalizeEvent,sample} from './model.mjs';
export function synthesize(event,sampleRate=48000) {
  const e=normalizeEvent(event); if(!e) throw new TypeError('valid action-mana cause required');
  const duration=e.durationMs/1000, pcm=new Float32Array(Math.ceil(duration*sampleRate));
  let state=0x44661, lowNoise=0, lowerNoise=0;
  const arrivals=e.variantIndex===0?[.44,.465,.465]:e.variantIndex===1?[.52,.545,.545]:[.40,.49,.58];
  const frequencies=e.variantIndex===0?[246,351,528]:e.variantIndex===1?[164,237,389]:[412,583,829];
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate,p=t/duration;
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const noise=state/2147483648-1;
    // Two stable one-pole filters form a friction band with rate-correct constants.
    const fast=1-Math.exp(-2*Math.PI*1100/sampleRate),slow=1-Math.exp(-2*Math.PI*120/sampleRate);
    lowNoise+=fast*(noise-lowNoise); lowerNoise+=slow*(noise-lowerNoise);
    const friction=lowNoise-lowerNoise;
    const attack=Math.min(1,p/.04), release=Math.max(0,Math.min(1,(1-p)/.1));
    const transport=attack*Math.exp(-p*2.7)*release;
    let contact=0;
    for(let k=0;k<3;k++) {
      const tau=t-arrivals[k]*duration;
      if(tau>=0) {
        const onset=1-Math.exp(-tau*180);
        const envelope=onset*Math.exp(-tau*(e.variantIndex===1?17:24));
        contact+=envelope*(Math.sin(2*Math.PI*frequencies[k]*tau)+.32*Math.sin(2*Math.PI*frequencies[k]*1.437*tau));
      }
    }
    pcm[i]=(friction*transport*(e.variantIndex===1?.46:.32)+contact*.105)*release;
  }
  pcm[0]=0; pcm[pcm.length-1]=0; return pcm;
}
export function createSfxPlayer(context,{verify=false,muted=false}={}) {
  const played=new Set(),live=new Map(); let retired=false;
  return {
    play(event,nowMs) {
      const s=sample(event,nowMs);
      if(retired||verify||muted||context.state!=='running'||!s.active||played.has(s.causeKey)) return false;
      const pcm=synthesize(event,context.sampleRate), buffer=context.createBuffer(1,pcm.length,context.sampleRate);
      buffer.copyToChannel(pcm,0);
      const source=context.createBufferSource(); source.buffer=buffer; source.connect(context.destination);
      source.onended=()=>{source.disconnect();live.delete(s.causeKey);};
      try { source.start(0,s.ageMs/1000); } catch(error) {source.disconnect();throw error;}
      played.add(s.causeKey); live.set(s.causeKey,source); return true;
    },
    cancel(event) {const e=normalizeEvent(event), source=live.get(e?.causeKey);if(source){source.stop();live.delete(e.causeKey);}},
    retire(){retired=true;for(const source of live.values()){source.stop();source.disconnect();}live.clear();},
    snapshot(){return {played:[...played],live:[...live.keys()],retired,verify,muted};}
  };
}
