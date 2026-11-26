// Proof predicate only: no production caller, and never generates proof.
export const VERSION='fighter-shockwave-sol61-r5';
export function mayReportReady(frame,live) {
 return frame!==null&&live!==null&&frame.version===VERSION&&live.version===VERSION&&
  frame.attempt===live.attempt&&frame.generation===live.generation&&frame.device===live.device&&frame.device!=null&&
  frame.recorded===true&&frame.submitted===true&&frame.completed===true&&frame.passes===1&&frame.cleanScopes===true&&
  frame.canvasConnected===true&&live.canvasConnected===true&&frame.visible===true&&live.visible===true&&live.alive===true&&
  live.deviceLost===false&&live.uncaptured===false&&[frame.width,frame.height,live.width,live.height].every(x=>Number.isFinite(x)&&x>0)&&
  [frame.phase,live.phase].every(x=>Number.isFinite(x)&&x>0&&x<1.08);
}
export function mayReportRetired(l) {
 return l!=null&&l.bootSettled===true&&l.rafStopped===true&&l.drawSettled===true&&l.audioResumeSettled===true&&
  ((l.audioCreated===false&&l.audioState==='not-created')||(l.audioCreated===true&&l.audioState==='closed'))&&
  ((l.deviceCreated===false&&l.deviceState==='not-created'&&l.noPendingAdapterDevice===true)||
   (l.deviceCreated===true&&l.deviceState==='destroyed-loss-settled'&&l.drainCompleted===true&&l.destroyCalled===true&&l.lostReason==='destroyed'))&&
  ((l.contextConfigured===false&&l.contextState==='not-configured')||(l.contextConfigured===true&&l.contextState==='unconfigured'))&&
  ((l.bufferCreated===false&&l.bufferState==='not-created')||(l.bufferCreated===true&&l.bufferState==='destroyed'))&&
  Array.isArray(l.errors)&&l.errors.length===0;
}
