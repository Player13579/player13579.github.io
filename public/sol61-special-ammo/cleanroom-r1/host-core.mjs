export const VERSION='special-ammo-cleanroom-sol61-r1';
export const MAX_DURATION_MS=1450,MAX_SFX_DURATION_MS=600,LOOP_GAP_MS=600;
const finite=Number.isFinite;
export function createPresentationClock({now=()=>performance.now()}={}){
 if(typeof now!=='function')throw TypeError('monotonic clock function required');
 let anchor=now(),accumulated=0,pausedAt=null,closed=false,last=0;
 function read(){if(closed)return last;const raw=pausedAt===null?accumulated+(now()-anchor):accumulated+(pausedAt-anchor);if(!finite(raw)||raw<last)throw RangeError('monotonic clock moved backwards');last=raw;return raw}
 return Object.freeze({nowMs:read,pause(){if(closed||pausedAt!==null)return false;pausedAt=now();read();return true},resume(){if(closed||pausedAt===null)return false;accumulated+=pausedAt-anchor;anchor=now();pausedAt=null;read();return true},get paused(){return pausedAt!==null},close(){if(closed)return last;last=read();closed=true;return last}})
}
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
export function completionIsCurrent({packet,renderedPacket,logicalNowMs,durationMs,generation,currentGeneration,current=true,hidden=false,disposed=false,retired=false}){
 if(!packet||packet!==renderedPacket||![logicalNowMs,durationMs].every(finite)||durationMs<=0||!Number.isSafeInteger(generation)||generation!==currentGeneration||current!==true||hidden||disposed||retired)return false;
 const age=logicalNowMs-packet.receivedAtMs;return finite(age)&&age>0&&age<durationMs
}
export function cueEligible({packet,seenPackets,logicalAgeMs,current,hidden=false,verify=false,disposed=false}){
 if(!packet||!(seenPackets instanceof WeakSet)||seenPackets.has(packet)||!finite(logicalAgeMs)||logicalAgeMs<=0)return false;seenPackets.add(packet);return !verify&&!disposed&&!hidden&&current===true&&logicalAgeMs<=100
}
export function validateRetireMessage(event,identity,parent,lastSequence){const d=event?.data;if(!identity||event?.source!==parent||event?.origin!==identity.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==identity.token||d.versionId!==identity.version||d.attemptEpoch!==identity.epoch)return false;if(d.sequence===undefined)return true;return Number.isSafeInteger(d.sequence)&&d.sequence>lastSequence}export function createCompletedFrame({version,submissionId,generation,currentGeneration,viewportWidth,viewportHeight,dpr,passes,submittedAtMs,completedAtMs,durationMs,packet,receipt,phase,active,sourceCurrent,canvasConnected,sameCanvas,sameViewport}){
 if(typeof version!=='string'||!version||!Number.isSafeInteger(submissionId)||submissionId<=0||!Number.isSafeInteger(generation)||generation!==currentGeneration||![viewportWidth,viewportHeight,dpr,submittedAtMs,completedAtMs,durationMs].every(finite)||viewportWidth<=0||viewportHeight<=0||dpr<=0||!Number.isInteger(passes)||passes!==1||!packet||!receipt||!packet.causalId||!['engage','material','release'].includes(phase)||active!==true||sourceCurrent!==true||canvasConnected!==true||sameCanvas!==true||sameViewport!==true)return null;
 if(submittedAtMs<packet.receivedAtMs||completedAtMs<submittedAtMs)return null;const ageMsAtCompletion=completedAtMs-packet.receivedAtMs;if(!finite(ageMsAtCompletion)||ageMsAtCompletion<=0||ageMsAtCompletion>=durationMs)return null;
 return Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,sourceVersionId:version,version,submissionId,generation,viewportWidth,viewportHeight,dpr,passes,submittedAtMs,completedAtMs,sourceOriginMs:packet.receivedAtMs,ageMsAtCompletion,durationMs,causeId:packet.causalId,packet,receipt,phase,active:true,queueCompletionObserved:true});
}