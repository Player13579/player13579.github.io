// New implementation of the already-owned 190ms HS onset score; no sustain/footstep sound.
export const ONSET_SCORE=Object.freeze([
 Object.freeze({type:'sine',fromHz:104,toHz:156,gain:.060,offsetMs:0,durationMs:190}),
 Object.freeze({type:'triangle',fromHz:312,toHz:468,gain:.035,offsetMs:25,durationMs:160}),
 Object.freeze({type:'sine',fromHz:624,toHz:468,gain:.014,offsetMs:55,durationMs:85})
]);
export function scheduleOnset(context,destination,startAt,{reducedMotion=false}={}){
 if(!context?.createOscillator||!context?.createGain||!destination||!Number.isFinite(startAt))throw new TypeError('owned audio context/destination/start required');
 const voices=[],factor=reducedMotion?.72:1;
 for(const note of ONSET_SCORE){
  const oscillator=context.createOscillator(),gain=context.createGain();
  const t=startAt+note.offsetMs*factor/1000,end=t+note.durationMs*factor/1000;
  oscillator.type=note.type;oscillator.frequency.setValueAtTime(note.fromHz,t);oscillator.frequency.linearRampToValueAtTime(note.toHz,end);
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(note.gain,t+.006*factor);gain.gain.exponentialRampToValueAtTime(.0001,end-.003*factor);gain.gain.linearRampToValueAtTime(0,end);
  oscillator.connect(gain);gain.connect(destination);oscillator.start(t);oscillator.stop(end);
  oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect();}catch{}};
  voices.push({oscillator,gain,end});
 }
 return Object.freeze({voices:Object.freeze(voices),stop(){for(const {oscillator,gain} of voices){try{oscillator.stop();gain.disconnect();oscillator.disconnect();}catch{}}}});
}
