// Synthesized dry soft contact. No gun mechanism, bullet direction or death cue.
export function synthContact(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new TypeError('Valid sample rate required');
  const length = Math.ceil(sampleRate * 0.115), samples = new Float32Array(length);
  let seed = 0x715261, low = 0, previousLow = 0;
  for (let i=0; i<length; i++) {
    const t=i/sampleRate;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise=(seed >>> 0)/4294967296*2-1;
    low += (noise-low)*(1-Math.exp(-2*Math.PI*1450/sampleRate));
    const dry=low-previousLow; previousLow=low;
    const attack=1-Math.exp(-t/0.00075);
    const body=Math.sin(2*Math.PI*165*t)*Math.exp(-t/0.021);
    const snap=low*Math.exp(-t/0.010)+dry*0.9*Math.exp(-t/0.007);
    const end=Math.min(1,Math.max(0,(0.115-t)/0.012));
    samples[i]=(body*0.30+snap*0.48)*attack*end;
  }
  samples[0]=0; samples[length-1]=0; return samples;
}

export function createContactAudio({verify = false} = {}) {
  let context=null, destroyed=false, epoch=0; const seen=new Set(), pending=new Set(), voices=new Set();
  async function unlock() {
    if(destroyed||verify)return false;
    const ownedEpoch=epoch;context??=new AudioContext();await context.resume();
    return !destroyed&&ownedEpoch===epoch&&context.state==='running';
  }
  const sourceAge=receipt=>performance.now()-receipt.submittedAt+receipt.ageMs;
  async function play(receipt) {
    if (destroyed || verify || !receipt?.active || !receipt.eventId ||
        !Number.isFinite(receipt.ageMs)||receipt.ageMs<0||receipt.ageMs>90||
        !Number.isFinite(receipt.submittedAt)||sourceAge(receipt)<0||sourceAge(receipt)>90||
        receipt.completion !== 'fulfilled' || seen.has(receipt.eventId)||pending.has(receipt.eventId)) return false;
    pending.add(receipt.eventId);const ownedEpoch=epoch;
    try {
      if(!await unlock())return false;
      const age=sourceAge(receipt);
      if(destroyed||epoch!==ownedEpoch||age<0||age>90)return false;
      const samples=synthContact(context.sampleRate);
      const buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=.42;source.connect(gain).connect(context.destination);
      voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
      seen.add(receipt.eventId);if(seen.size>256)seen.delete(seen.values().next().value);
      // Resume does not replay a stale onset: PCM phase follows the same
      // completed contact's age, with a finite 115ms waveform endpoint.
      source.start(0,age/1000);return true;
    } finally {pending.delete(receipt.eventId);}
  }
  async function stop() { epoch++;for(const source of voices) { try {source.stop();} catch {} } voices.clear(); }
  async function dispose() { destroyed=true; await stop(); if(context) await context.close(); }
  return {unlock,play,stop,dispose};
}
