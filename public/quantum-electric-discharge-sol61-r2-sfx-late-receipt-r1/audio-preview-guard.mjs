// Pure caller-side guard. Runtime identity proves the receipt is still the
// current successful completion; the surrounding preview state must still
// describe that same live visible source-on frame.
export function createAudioReceiptCurrentness({runtime,getPendingFrame,getCurrentCauseId,getControls,getPlaying,isVerify}){
  return receipt=>{
    const pending=getPendingFrame(),controls=getControls(),causeId=getCurrentCauseId();
    return !isVerify()&&getPlaying()&&runtime.ready&&runtime.lastReceipt===receipt&&!!pending&&
      pending.causeId===causeId&&receipt?.causeId===causeId&&pending.causeId===receipt.causeId&&
      pending.ageMs===receipt.ageMs&&pending.controls.sourceEmission===controls.sourceEmission&&
      pending.controls.observerScatter===controls.observerScatter&&pending.controls.reducedMotion===controls.reducedMotion&&
      pending.controls.targetVisible===controls.targetVisible&&controls.sourceEmission&&controls.targetVisible&&
      receipt.completed===true&&receipt.mainFrameVisible===true&&receipt.sourceTargetVisible===true&&
      receipt.controls?.sourceEmission===true&&receipt.controls?.targetVisible===true&&receipt.controls?.verify!==true;
  };
}
