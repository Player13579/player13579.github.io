/** Nodeで検査できるactor-timeカーソル。ここでも権威判定はしない。 */
export function actorTimeAtAudio(clock,audioSeconds) {return clock.actorMs+(audioSeconds-clock.audioSec)*clock.rate*1000;}
export function voiceCursor(event,clock,audioSeconds,sampleRate) {
  const age=actorTimeAtAudio(clock,audioSeconds)-event.actorStartMs;
  return age<0||age>=1200-1e-9?null:age*sampleRate/1000;
}
export function interpolatedPCM(array,index) {
  if(index===null||index<0||index>=array.length)return 0;
  const i=Math.floor(index),f=index-i;return array[i]*(1-f)+(array[i+1]??0)*f;
}
export class OneCauseVoices {
  constructor(){this.seen=new Set();this.voices=new Map();}
  add(event,pcm){if(this.seen.has(event.causeId))return false;this.seen.add(event.causeId);this.voices.set(event.causeId,{event,pcm});return true;}
  prune(actorNow){for(const [id,v] of this.voices)if((typeof actorNow==='function'?actorNow(v.event.playerId):actorNow)>=v.event.actorStartMs+1200)this.voices.delete(id);}
}

export const playerClockKey=id=>`${typeof id}:${JSON.stringify(id)}`;
