// A finite activation cue, not a claim to synthesize the sustained gas jet sound.
// Creative score and sample synthesis by GPT-6.1-Sol; cause admission belongs to host.
export const ONSET_SCORE = Object.freeze([
  Object.freeze({type:'filtered-noise',fromHz:720,toHz:1540,gain:0.040,offsetMs:0,durationMs:190}),
  Object.freeze({type:'sine',fromHz:92,toHz:138,gain:0.041,offsetMs:7,durationMs:164})
]);
function excitationBuffer(context) {
  const frames = Math.ceil(context.sampleRate * 0.190), buffer = context.createBuffer(1,frames,context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x61b105; let slow = 0;
  for (let i=0;i<frames;i++) {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    const white = (seed/4294967296)*2-1;
    slow += 0.16*(white-slow);
    data[i] = (white-slow)*0.65;
  }
  return buffer;
}
export function scheduleOnset(context,destination,startAt,{reducedMotion=false}={}) {
  if (!context?.createOscillator || !context?.createBufferSource || !context?.createBiquadFilter || !context?.createGain || !destination || !Number.isFinite(startAt)) throw new TypeError('owned audio context/destination/start required');
  // Reduced motion changes visual convection only. Audio time/pitch remains the
  // same action cue so it does not falsely signal weaker gameplay thrust.
  void reducedMotion;
  const voices = [];
  for (const note of ONSET_SCORE) {
    const gain = context.createGain(), t = startAt+note.offsetMs/1000, end = t+note.durationMs/1000;
    let oscillator, filter = null;
    if (note.type === 'filtered-noise') {
      oscillator = context.createBufferSource(); oscillator.buffer = excitationBuffer(context);
      filter = context.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.setValueAtTime(0.85,t);
      filter.frequency.setValueAtTime(note.fromHz,t); filter.frequency.exponentialRampToValueAtTime(note.toHz,t+0.06); filter.frequency.linearRampToValueAtTime(540,end);
      oscillator.connect(filter); filter.connect(gain);
    } else {
      oscillator = context.createOscillator(); oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.fromHz,t); oscillator.frequency.exponentialRampToValueAtTime(note.toHz,t+0.055); oscillator.frequency.linearRampToValueAtTime(106,end);
      oscillator.connect(gain);
    }
    gain.gain.setValueAtTime(0,t); gain.gain.linearRampToValueAtTime(note.gain,t+0.011);
    gain.gain.exponentialRampToValueAtTime(note.gain*0.45,t+0.073);
    gain.gain.exponentialRampToValueAtTime(0.0001,end-0.007); gain.gain.linearRampToValueAtTime(0,end);
    gain.connect(destination); oscillator.start(t); oscillator.stop(end);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); filter?.disconnect(); };
    voices.push(Object.freeze({oscillator,gain,end}));
  }
  return Object.freeze({voices:Object.freeze(voices),stop(){ for (const voice of voices) {try{voice.oscillator.stop();}catch{} voice.oscillator.disconnect(); voice.gain.disconnect();} }});
}
