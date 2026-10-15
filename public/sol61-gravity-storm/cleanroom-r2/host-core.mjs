export const VERSION='gravity-storm-cleanroom-sol61-r2';
export const DURATION_MS=12000;
export const VISUAL_RADIUS=520;
export const EYE_RADIUS=140;
export const SFX_OFFSET_MS=0;
export const SFX_DURATION_MS=900;
export const SFX_ONSET_WINDOW_MS=100;
export const LOOP_GAP_MS=600;
export const VARIANTS=Object.freeze([Object.freeze({id:'field-eye',durationMs:DURATION_MS})]);
const finite=n=>Number.isFinite(n);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function authoritativeFrame(zone,serverNow){
 if(!zone||typeof zone!=='object'||!finite(serverNow))return null;
 const{id,ownerId,targetId,x,y,safeX,safeY,startedAt,endsAt}=zone;
 if(typeof id!=='string'||!id||typeof ownerId!=='string'||!ownerId||typeof targetId!=='string'||!targetId||![x,y,startedAt,endsAt].every(finite))return null;
 if(serverNow<946684800000||startedAt<946684800000||endsAt-startedAt!==DURATION_MS||serverNow<startedAt||serverNow>=endsAt)return null;
 const barrier=own(zone,'barrierUntil')?zone.barrierUntil:0;
 const eyeCoords=finite(safeX)&&finite(safeY),eyeActive=eyeCoords&&finite(barrier)&&barrier>0&&serverNow<barrier;
 const ageMs=serverNow-startedAt;
 return Object.freeze({sourcePositive:true,sourceOn:true,mainOn:true,active:true,causeId:'gravity-storm:'+id,id,ownerId,targetId,center:Object.freeze({x,y}),safeEye:eyeCoords?Object.freeze({x:safeX,y:safeY}):null,ageMs,durationMs:DURATION_MS,visualRadius:VISUAL_RADIUS,eye:Object.freeze({active:eyeActive,radius:EYE_RADIUS,barrierUntil:eyeActive?barrier:0})});
}
export function shiftZoneForPause(zone,elapsedMs){
 if(!zone||typeof zone!=='object'||!finite(elapsedMs)||elapsedMs<0)throw new TypeError('valid zone and nonnegative elapsed time required');
 if(typeof zone.startedAt!=='number'||typeof zone.endsAt!=='number'||!finite(zone.startedAt)||!finite(zone.endsAt)||zone.endsAt-zone.startedAt!==DURATION_MS)throw new RangeError('invalid source zone lifetime');
 const shifted={...zone,startedAt:zone.startedAt+elapsedMs,endsAt:zone.endsAt+elapsedMs};
 if(own(zone,'barrierUntil')){
  const deadline=zone.barrierUntil;
  if(typeof deadline==='number'&&finite(deadline)&&deadline>0)shifted.barrierUntil=deadline+elapsedMs;
  else shifted.barrierUntil=deadline;
 }
 if(typeof zone.lastPulseAt==='number'&&finite(zone.lastPulseAt)&&zone.lastPulseAt>0)shifted.lastPulseAt=zone.lastPulseAt+elapsedMs;
 return Object.freeze(shifted);
}
export function resolveSafeEye(owner){if(!owner||owner.alive!==true||owner.ejected===true||!finite(owner.x)||!finite(owner.y))return null;return Object.freeze({x:owner.x,y:owner.y})}
export function cueEligible({causeId,seenCauses,ageMs,current,hidden=false,verify=false,disposed=false}){if(!causeId||!(seenCauses instanceof Set)||seenCauses.has(causeId))return false;seenCauses.add(causeId);return!verify&&!disposed&&!hidden&&current===true&&finite(ageMs)&&ageMs>0&&ageMs<=SFX_ONSET_WINDOW_MS}
export function syntheticZone({id='gallery-demo',ownerId='demo-owner',targetId='demo-target',now=Date.now(),ageMs=0,barrierActive=true}={}){if(![now,ageMs].every(finite)||now<946684800000||ageMs<0||ageMs>=DURATION_MS)throw new RangeError('invalid synthetic source clock');const startedAt=now-ageMs,endsAt=startedAt+DURATION_MS;return Object.freeze({id,ownerId,targetId,x:180,y:0,safeX:0,safeY:0,startedAt,endsAt,barrierUntil:barrierActive?endsAt-1000:0})}
export function completionIsCurrent({frame,currentGeneration,generation,disposed=false,retired=false,hidden=false,connected=false,surfaceCurrent=false,serverNow}){if(!frame||!finite(serverNow))return false;const age=serverNow-frame.startedAt;return generation===currentGeneration&&!disposed&&!retired&&!hidden&&connected&&surfaceCurrent&&age>0&&age<DURATION_MS&&frame.endsAt-frame.startedAt===DURATION_MS}

export class SingleFramePump{
 constructor({requestFrame,cancelFrame,draw,canRun=()=>true,onError=()=>{}}){if(typeof requestFrame!=='function'||typeof cancelFrame!=='function'||typeof draw!=='function'||typeof canRun!=='function')throw TypeError('frame pump dependencies required');this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.draw=draw;this.canRun=canRun;this.onError=onError;this.handle=null;this.inFlight=null;this.paused=false;this.disposed=false;this.generation=0}
 schedule(){if(this.disposed||this.paused||!this.canRun()||this.handle!==null||this.inFlight)return false;this.handle=this.requestFrame(()=>{this.handle=null;void this.#run(false)});return true}
 invalidate(){this.generation++;if(this.handle!==null){this.cancelFrame(this.handle);this.handle=null}this.schedule();return this.generation}
 pause(){this.paused=true;this.generation++;if(this.handle!==null){this.cancelFrame(this.handle);this.handle=null}}
 resume(){if(this.disposed)return false;this.paused=false;this.generation++;this.schedule();return true}
 async runOnce(){if(this.disposed)throw Error('frame pump disposed');if(this.handle!==null){this.cancelFrame(this.handle);this.handle=null}if(this.inFlight)await this.inFlight;return this.#run(true)}
 async #run(allowPaused){if(this.disposed||(!allowPaused&&(this.paused||!this.canRun())))return null;if(this.inFlight)return this.inFlight;const generation=this.generation,token=Object.freeze({generation,isCurrent:()=>generation===this.generation&&!this.disposed&&(allowPaused||(!this.paused&&this.canRun()))});let task;task=Promise.resolve().then(()=>this.draw(token)).catch(e=>{this.onError(e);return null}).finally(()=>{if(this.inFlight===task)this.inFlight=null;if(!this.disposed&&!this.paused)this.schedule()});this.inFlight=task;return task}
 async idle(){if(this.inFlight)await this.inFlight}
 async dispose(){if(this.disposed)return;this.disposed=true;this.paused=true;this.generation++;if(this.handle!==null){this.cancelFrame(this.handle);this.handle=null}await this.idle()}
 snapshot(){return Object.freeze({generation:this.generation,scheduled:this.handle!==null,inFlight:Boolean(this.inFlight),paused:this.paused,disposed:this.disposed})}
}


export function validateRetireMessage(event,identity,parent,lastSequence){const d=event?.data;if(!identity||event?.source!==parent||event?.origin!==identity.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==identity.token||d.versionId!==identity.version||d.attemptEpoch!==identity.epoch)return false;if(d.sequence===undefined)return true;return Number.isSafeInteger(d.sequence)&&d.sequence>lastSequence}

