// Exact authored audio design. One receipt starts one three-phase finite sound.
export function synthesizeSummon(sampleRate=48000) {
  if(!Number.isInteger(sampleRate)||sampleRate<8000)throw new Error('Invalid sample rate');
  const output=new Float32Array(Math.ceil(sampleRate*3.2));
  const ease=(a,b,t)=>{let q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
  for(let i=0;i<output.length;i++) {let t=i/sampleRate;
    const gate=ease(0,.045,t)*(1-ease(2.35,3.2,t));
    const birth=ease(0,.6,t)*(1-ease(.8,1.2,t));
    const arrival=ease(.75,.82,t)*(1-ease(1.15,1.62,t));
    const settle=ease(1.15,1.6,t)*(1-ease(2.25,3.1,t));
    // Phase-continuous chirp locks into a low harmonic interval at the arrival.
    const phase=2*Math.PI*(110*t+34*(t-Math.exp(-2*t)/-2-.5));
    const low=.20*Math.sin(phase)*(.55+birth+.6*arrival+.25*settle);
    const lattice=.10*Math.sin(2*Math.PI*440*t)*birth + .09*Math.sin(2*Math.PI*660*t)*arrival;
    const seal=.07*Math.sin(2*Math.PI*220*t)*settle;
    output[i]=(low+lattice+seal)*gate;
  }return output;
}
export function playSummon(context,{causeId,when=context.currentTime,verify=false,muted=false,gain=.6,seen=new Set()}={}) {
  if(verify||muted||!causeId||seen.has(causeId)||context.state!=='running')return null;
  seen.add(causeId);const pcm=synthesizeSummon(context.sampleRate);const buffer=context.createBuffer(1,pcm.length,context.sampleRate);
  buffer.copyToChannel(pcm,0);const node=context.createBufferSource();node.buffer=buffer;
  const volume=context.createGain();volume.gain.value=Math.max(0,Math.min(1,gain));node.connect(volume);volume.connect(context.destination);
  node.start(when);node.onended=()=>{node.disconnect();volume.disconnect();};
  return {stop:()=>{try{node.stop();}catch{}node.disconnect();volume.disconnect();},duration:3.2,causeId};
}
