import {VERSION_ID,DURATION_MS,SFX_OFFSET_MS,SFX_DURATION_MS,planSource} from './effect.mjs';
export const VERSION=VERSION_ID;
export { DURATION_MS,SFX_OFFSET_MS,SFX_DURATION_MS };
export const SFX_ONSET_WINDOW_MS=240;
export const GALLERY_ACTOR='gallery-shield-target';
const finite=Number.isFinite;
export function authoritativeFrame(event,now) {
 const s=planSource(event,now,GALLERY_ACTOR);
 if(!s.active||event.startedAt!==event.at||event.endsAt!==s.endsAt) return null;
 return Object.freeze({sourcePositive:true,active:true,causeId:s.causalId,ageMs:s.ageMs,durationMs:DURATION_MS});
}
export function shiftZoneForPause(event,elapsed) {
  if(!event || !finite(elapsed) || elapsed<0) throw TypeError('valid fixture and nonnegative pause required');
  return Object.freeze({...event,at:event.at+elapsed,startedAt:event.startedAt+elapsed,endsAt:event.endsAt+elapsed});
}
export function cueEligible({causeId,seenCauses,ageMs,current,hidden=false,verify=false,disposed=false}) {
  if(!causeId||!(seenCauses instanceof Set)||seenCauses.has(causeId))return false;
  seenCauses.add(causeId);
  return !verify&&!disposed&&!hidden&&current===true&&finite(ageMs)&&ageMs>0&&ageMs<=SFX_ONSET_WINDOW_MS;
}
export function syntheticZone({id='gallery-demo',now=Date.now(),ageMs=0}={}) {
 if(typeof id!=='string'||!id||!finite(now)||!finite(ageMs)||ageMs<0||ageMs>=DURATION_MS)throw RangeError('invalid barrier fixture clock');
 const at=now-ageMs;
 return Object.freeze({id:'magic_'+id,type:'preparation-barrier-hit',variant:'durability-broken',radius:110,durationMs:DURATION_MS,
  playerId:GALLERY_ACTOR,x:0,y:0,at,startedAt:at,endsAt:at+DURATION_MS});
}
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

