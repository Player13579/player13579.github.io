import {normalizeEvent,sample} from './model.mjs';
export function synthesize(event,sampleRate=48000) {
  const e=normalizeEvent(event); if(!e) throw new TypeError('valid action-mana cause required');
  const duration=e.durationMs/1000, pcm=new Float32Array(Math.ceil(duration*sampleRate));
  let state=0x44661, previousNoise=0, angle=0;
  for(let i=0;i<pcm.length;i++) {
    const t=i/sampleRate,p=t/duration;
    const attack=Math.min(1,p/.025), release=Math.min(1,(1-p)/.1);
    const contact=Math.exp(-Math.pow((p-.18)/.07,2));
    const excitation=attack*release*(.42*Math.exp(-p*3.3)+.16*contact);
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const noise=state/2147483648-1;
    previousNoise=previousNoise*.86+noise*.14;
    const v=e.variantIndex;
    // Driven friction plus inharmonic field modes: gathering, seating, or ordered settling.
    const frequency=v===0?260+170*p:v===1?170+50*(1-Math.exp(-p*8)):420-130*p;
    angle+=2*Math.PI*frequency/sampleRate;
    const modes=Math.sin(angle)*.36+Math.sin(angle*1.413)*.18+Math.sin(angle*2.17)*.09;
    const texture=previousNoise*(v===1?.54:.32)*(1-p);
    pcm[i]=(modes+texture)*excitation*.34;
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
