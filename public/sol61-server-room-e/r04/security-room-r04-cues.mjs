// Authored E-time cue policy. Pure CPU; caller owns shared clock and audio device.
export const AUTH_SOUND=Object.freeze({kind:'security-auth-confirm-r04',durationESeconds:.15,frequencyStartHz:620,frequencyEndHz:910,oscillator:'sine',attackESeconds:.012,decayESeconds:.138,peakGain:.06,positionInOriginalPixels:[1196,420],source:'PH-AUTH',loop:false,maxLateESeconds:.20});
export function createSecurityRoomR04Cues(){
  const receipts=new Set(),receiptTimes=new Map();let disposed=false,lastRate=null,lastHidden=null,generation=0;
  return Object.freeze({
    plan({gameE,authEvent=null,audio}){
      if(disposed)throw Error('r04 cues disposed');
      const t=gameE?.elapsedSeconds,rate=gameE?.rate,hidden=!!audio?.hidden;
      if(!Number.isFinite(t)||t<0||!Number.isFinite(rate)||rate<0)throw Error('valid shared E time/rate required');
      if(hidden&&!gameE.hiddenPaused)throw Error('hidden shared E clock must be paused');
      if(gameE.fixedACC2Active&&!gameE.fixedACC2AppliedOnce)throw Error('shared ACC2 must be applied once');
      const cancelVoices=audio.disposed||(lastRate!==null&&lastRate!==rate)||(lastHidden!==null&&lastHidden!==hidden);
      if(cancelVoices)generation++;
      lastRate=rate;lastHidden=hidden;
      let age=-1;
      if(authEvent){
        if(typeof authEvent.id!=='string'||!authEvent.id.trim()||!Number.isFinite(authEvent.atESeconds)||authEvent.atESeconds<0)throw Error('valid immutable auth receipt required');
        age=t-authEvent.atESeconds;if(age<0)throw Error('auth event cannot be in future E time');
        if(receiptTimes.has(authEvent.id)&&receiptTimes.get(authEvent.id)!==authEvent.atESeconds)throw Error('same receipt ID changed immutable E timestamp');
        receiptTimes.set(authEvent.id,authEvent.atESeconds);
      }
      const visual={eTime:t,authAge:age>=0&&age<1.25?age:-1,motionScale:gameE.reducedMotion?0:1};
      let sound=null,consumed=false;
      if(authEvent&&!receipts.has(authEvent.id)){
        const silent=audio.verify||hidden||audio.disposed||rate===0||age>AUTH_SOUND.maxLateESeconds;
        if(silent){receipts.add(authEvent.id);consumed=true;}
        else if(audio.firstGPUFrameSubmitted&&audio.currentLease&&audio.unlocked&&audio.voicePoolAvailable&&Number.isInteger(audio.currentVoiceCursor)&&audio.currentVoiceCursor>=0){
          receipts.add(authEvent.id);consumed=true;
          sound={...AUTH_SOUND,receiptId:authEvent.id,atESeconds:authEvent.atESeconds,voiceCursor:audio.currentVoiceCursor,generation,rateAtStart:rate,durationWallSeconds:AUTH_SOUND.durationESeconds/rate,attackWallSeconds:AUTH_SOUND.attackESeconds/rate,decayWallSeconds:AUTH_SOUND.decayESeconds/rate};
        }
      }
      return {visual,sound,cancelVoices,generation,receiptConsumed:consumed};
    },
    snapshot(){return {disposed,generation,seenIds:[...receipts],rate:lastRate,hidden:lastHidden};},
    dispose(){disposed=true;generation++;return {cancelVoices:true,generation};},
  });
}
