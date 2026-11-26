export const version = 'meeting-round-resume-astra62-r2';
export const lifetimeMs = 1190;

export function makeGate() {
  let highestId = 0;
  return receipt => {
    if (receipt?.kind !== 'meeting-tallied' || receipt.authorized !== true ||
        receipt.current !== true || receipt.settled !== true || receipt.before !== 'meeting' ||
        receipt.after !== 'playing' || !Number.isSafeInteger(receipt.id) || receipt.id <= highestId) return null;
    const from = receipt.previousRound;
    const to = receipt.round;
    if (!Number.isSafeInteger(from) || from < 1 || !Number.isSafeInteger(to) || to !== from+1) return null;
    highestId = receipt.id;
    return Object.freeze({id:receipt.id, from, to});
  };
}

export function fixtureEvent(mode,id) {
  const valid = ['small','carry','ended','same','pending'].includes(mode);
  const previousRound = mode === 'carry' ? 9 : 1;
  return {kind:'meeting-tallied', id, before:'meeting',
    after:mode === 'ended' ? 'ended' : 'playing', authorized:valid, current:true,
    settled:mode !== 'pending', previousRound, round:previousRound + (mode === 'same' ? 0 : 1)};
}

export function digitSlots(value) {
  const digits = Array.from(String(value),Number);
  return Array(16-digits.length).fill(-1).concat(digits);
}

export function makeCue(sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sample rate');
  const pcm=new Float32Array(Math.ceil(sampleRate*0.81));
  const tau=2*Math.PI;
  function hit(t, fundamental, decay) {
    if (t <= 0) return 0;
    return Math.min(t/0.003,1)*Math.exp(-decay*t)*
      (Math.sin(tau*fundamental*t)+0.32*Math.sin(tau*fundamental*2.71*t));
  }
  for(let i=0;i<pcm.length;i++){
    const t=i/sampleRate;
    const tail=Math.min(1,Math.max(0,(0.78-t)/0.04));
    pcm[i]=tail*(0.076*hit(t-0.22,390,60)+0.15*hit(t-0.58,277,30));
  }
  return pcm;
}
