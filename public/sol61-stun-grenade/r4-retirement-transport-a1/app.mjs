import {VERSION,DURATION_MS,fixture,CauseGate} from './source/plan.mjs';
import {StunRenderer} from './runtime.mjs';
import {StunSound} from './source/sound.mjs';

// Shared by the normal gallery's user-gesture unlock and the real completed-frame path.
export class GalleryAudioLifecycle {
  constructor({sound, verify=false}={}) {
    if (!sound || typeof sound.activate !== 'function' || typeof sound.play !== 'function' || typeof sound.snapshot !== 'function') throw new TypeError('authored StunSound is required');
    this.sound=sound;
    this.verify=Boolean(verify);
    this.unlocked=false;
    this.closed=false;
    this.activationSerial=0;
    this.currentCause=null;
  }
  activateFromGesture() {
    if (this.verify || this.closed) return Promise.resolve({state:'silent',enabled:false,verify:this.verify,closed:this.closed});
    const serial=++this.activationSerial;
    let activation;
    try { activation=this.sound.activate(); }
    catch { return Promise.resolve({state:'unsupported',enabled:false,verify:false,closed:false}); }
    return Promise.resolve(activation).then(ok=>{
      const snapshot=this.sound.snapshot();
      if (this.closed || serial!==this.activationSerial) return {state:'stale',enabled:false,verify:false,closed:this.closed};
      const active=ok===true && snapshot.verify!==true && snapshot.disposed!==true && snapshot.contextState==='running';
      if (active) this.unlocked=true;
      return active ? {state:'active',enabled:true,verify:false,closed:false,contextState:snapshot.contextState} : {state:'unsupported',enabled:false,verify:false,closed:false,contextState:snapshot.contextState};
    },()=>({state:'unsupported',enabled:false,verify:false,closed:this.closed}));
  }
  beginCause(cause, epoch) {
    if (this.closed || this.verify || !cause || typeof cause.id!=='string' || !Number.isSafeInteger(epoch)) return null;
    const soundState=this.sound.snapshot();
    const token=Object.freeze({causeId:cause.id,causeType:cause.type,epoch,audioEnabled:this.unlocked && soundState.contextState==='running' && soundState.disposed!==true});
    this.currentCause=token;
    return token;
  }
  complete(token,{cause,epoch,proof,ageMs,visible,running,held,sourceOn}={}) {
    if (!token || token!==this.currentCause || this.closed || this.verify || !token.audioEnabled) return false;
    if (epoch!==token.epoch || !running || held || !visible || sourceOn===false) return false;
    if (cause?.id!==token.causeId || cause?.type!==token.causeType || cause?.type!=='grenade-stun-impact') return false;
    if (!proof || proof.completed!==true || proof.stale===true || proof.causeId!==token.causeId || proof.canvasConnected===false || proof.sourceOn===false) return false;
    if (!Number.isFinite(ageMs) || ageMs<0 || ageMs>=85) return false;
    const snapshot=this.sound.snapshot();
    if (snapshot.verify===true || snapshot.disposed===true || snapshot.contextState!=='running') return false;
    return this.sound.play(cause,ageMs)===true;
  }
  invalidate() { this.activationSerial++; this.currentCause=null; }
  endCause(token) { if (this.currentCause===token) this.currentCause=null; }
  retire() { this.invalidate(); this.closed=true; this.unlocked=false; }
  snapshot() {
    const sound=this.sound.snapshot();
    const enabled=!this.verify && !this.closed && this.unlocked && sound.contextState==='running' && sound.disposed!==true;
    return {state:this.verify?'silent':this.closed?'closed':enabled?'active':'ready',enabled,verify:this.verify,closed:this.closed,contextState:sound.contextState};
  }
}

if (typeof document!=='undefined' && typeof window!=='undefined') {
  const params=new URLSearchParams(location.search),verify=params.has('verify'),galleryVersionId=params.get('galleryVersionId')||VERSION,galleryVersionAllowed=galleryVersionId===VERSION||galleryVersionId==='stun-grenade-sol61-r4',canvas=document.querySelector('#stage');
  if(params.get('embed')==='1')document.body.classList.add('embed');
  const renderer=new StunRenderer(canvas,{onStage:stage=>notify(stage)}),sound=new StunSound({verify}),audioLifecycle=new GalleryAudioLifecycle({sound,verify}),gate=new CauseGate();
  let input=fixture(35),scale=1,running=false,epoch=1,causeOrdinal=1,started=0,raf=0,loopTimer=0,disposed=false,startupSequence=0,retiring=false,retirePromise=null,disposePromise=null,initTask=null,initialProof=null;
  const controls={sourceOn:true,observerOn:true,contextOn:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  const view=()=>({width:canvas.width,height:canvas.height,scale,camera:{x:0,y:0},origin:{x:canvas.width*.44,y:canvas.height*.5}});
  function notify(stage,proof=null,error=null){const token=params.get('galleryStartupToken'),versionId=galleryVersionId,attemptEpoch=Number(params.get('galleryAttemptEpoch'));if(retiring||!token||!galleryVersionAllowed||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0||window.parent===window)return;window.parent.postMessage({schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:++startupSequence,stage,status:error?'error':stage==='playing'&&proof?.completed?'ready':'pending',firstFrame:proof,error:error?{code:'STUN_PREVIEW_ERROR',message:error}:null},location.origin);}
  function snapshot(){return {versionId:VERSION,ready:renderer.ready,running,ageMs:input.ageMs,causeId:input.cause.id,epoch,scale,geometry:{cause:{...input.cause},receiver:{...input.receiver},projection:{...view(),receiverDisplayHeight:input.receiver.height*scale}},controls:{...controls},renderer:renderer.snapshot(),audio:sound.snapshot(),galleryAudio:audioLifecycle.snapshot(),sourceDurationMs:720,gameStunDurationMs:2500};}
  async function draw(ageMs){input={...input,ageMs};const current=epoch,causeId=input.cause.id;const proof=await renderer.render(input,view(),controls);if(current!==epoch||causeId!==input.cause.id||disposed)return {...proof,stale:true};return proof;}
  function stop({invalidateRenderer=true}={}){running=false;epoch++;audioLifecycle.invalidate();if(invalidateRenderer)renderer.invalidate();cancelAnimationFrame(raf);clearTimeout(loopTimer);raf=0;loopTimer=0;sound.cancel();}
  async function hold(ageMs,options={}){if(!Number.isFinite(ageMs))throw new TypeError('finite hold age');stop();Object.assign(controls,options);return draw(ageMs);}
  async function play({autoLoop=params.get('galleryAutoLoop')==='1'}={}){
    if(disposed||retiring)throw new Error('preview retirement in progress');stop();const current=epoch;input=fixture(0,{id:'synthetic-stun-grenade-'+(++causeOrdinal),height:64});gate.receive({...input.cause,at:input.cause.startedAt},{roomId:input.cause.roomId,generation:input.cause.generation});const audioToken=audioLifecycle.beginCause(input.cause,current);running=true;started=performance.now();
    let first=true;
    const frame=()=>{if(disposed||retiring||!running||current!==epoch)return;const age=performance.now()-started;const proofPromise=draw(Math.min(DURATION_MS,age));
      proofPromise.then(proof=>{if(current!==epoch||disposed||!running||proof.stale||!proof.completed)return;if(first){first=false;notify('playing',proof);}audioLifecycle.complete(audioToken,{cause:input.cause,epoch:current,proof,ageMs:performance.now()-started,visible:!document.hidden,running,held:false,sourceOn:controls.sourceOn});}).catch(fatal);
      if(age<DURATION_MS)raf=requestAnimationFrame(frame);else{running=false;audioLifecycle.endCause(audioToken);if(autoLoop)loopTimer=setTimeout(()=>{if(current===epoch&&!disposed)play({autoLoop}).catch(fatal);},350);}
    };raf=requestAnimationFrame(frame);return snapshot();
  }
  function fatal(error){if(retiring)return;stop();notify('playing',null,String(error?.message??error));document.body.dataset.error=String(error?.message??error);console.error(error);dispose().catch(e=>console.error(e));}
  function dispose(){if(disposePromise)return disposePromise;disposePromise=(async()=>{disposed=true;stop();audioLifecycle.retire();gate.dispose();await sound.dispose();const device=await renderer.dispose();const audio=sound.snapshot();return{device,audio,disposeSettled:true};})();return disposePromise;}
  window.__stunGrenade={snapshot,hold,play,setScale:async(value)=>{if(!Number.isFinite(value)||value<=0||value>4)throw new RangeError('scale (0,4]');scale=value;return hold(input.ageMs);},setControls:async(value)=>hold(input.ageMs,value),setReceiver:async(value)=>{if(!value||![value.x,value.y,value.height].every(Number.isFinite)||value.height<=0)throw new RangeError('finite registered receiver geometry with positive height');input={...input,receiver:{x:value.x,y:value.y,height:value.height}};return hold(input.ageMs);},dispose};
  // This is the API the existing parent gallery invokes from its explicit user gesture.
  window.__gallerySfx={activateFromGesture:()=>audioLifecycle.activateFromGesture(),snapshot:()=>audioLifecycle.snapshot()};
  document.querySelector('#replay').onclick=async()=>{try{await audioLifecycle.activateFromGesture();await play();}catch(e){fatal(e);}};
  document.querySelector('#age').oninput=e=>hold(Number(e.target.value)).catch(fatal);
  for(const [id,key] of [['source','sourceOn'],['observer','observerOn'],['context','contextOn']])document.querySelector('#'+id).onchange=e=>hold(input.ageMs,{[key]:e.target.checked}).catch(fatal);
  document.querySelector('#scale').onchange=e=>window.__stunGrenade.setScale(Number(e.target.value)).catch(fatal);
  function retire(event){const d=event?.data,token=params.get('galleryStartupToken'),attemptEpoch=Number(params.get('galleryAttemptEpoch'));if(event.source!==parent||event.origin!==location.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==token||d.versionId!==VERSION||d.attemptEpoch!==attemptEpoch||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0)return;if(retirePromise)return retirePromise;retiring=true;stop({invalidateRenderer:false});retirePromise=(async()=>{try{await initTask;}catch{}const result=await dispose(),p=result.device,a=result.audio;if(p?.status!=='destroyed-loss-settled'||p.sameOwnedDevice!==true||p.pendingSettled!==true||p.pendingCount!==0||p.queueDrained!==true||p.destroyCalled!==true||p.lostReason!=='destroyed'||p.resourcesDisposed!==true||p.contextUnconfigured!==true||p.cleanupErrors?.length||a?.disposed!==true||a?.nodes!==0||!['closed','not-created'].includes(a?.contextState))return false;const f=initialProof;const lifecycle={disposeSettled:true,teardown:'disposed',deviceLifecycle:'destroyed-loss-settled',device:{status:p.status,drained:p.queueDrained,destroyCalled:p.destroyCalled,lostReason:p.lostReason,sameOwnedDevice:p.sameOwnedDevice,pendingSettled:p.pendingSettled,pendingCount:p.pendingCount,resourcesDisposed:p.resourcesDisposed,contextUnconfigured:p.contextUnconfigured,queueDrainCount:p.queueDrainCount},audio:{disposeSettled:a.disposed,contextState:a.contextState==='not-created'?'absent':a.contextState,voicesRemaining:a.nodes},firstFrame:f?{submitted:f.submitted,queueCompleted:f.completed,version:f.versionId,sourceId:f.versionId,causeId:f.causeId,generation:f.generation,frameId:f.sequence,elapsedMs:f.ageMs,passes:f.passes,targetKind:'canvas-current-texture-view'}:null};window.parent.postMessage({schema:'dva-gallery-startup/v1',action:'retired',token,versionId:galleryVersionId,attemptEpoch,sequence:++startupSequence,lifecycle},location.origin);return true;})().catch(error=>{console.error('Stun retirement failed',error);return false;});return retirePromise;}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(params.get('galleryAutoLoop')==='1'&&!disposed&&!retiring)play().catch(fatal);});window.addEventListener('pagehide',()=>{retiring=true;stop({invalidateRenderer:false});Promise.resolve(initTask).catch(()=>{}).then(()=>dispose()).catch(e=>console.error(e));});window.addEventListener('message',event=>{void retire(event);});
  initTask=(async()=>{notify('child-document');await renderer.initialize();if(retiring)return;await renderer.resize(980,620);if(retiring)return;const proof=await draw(35);if(!proof?.completed||proof.stale)throw new Error('initial completed source frame missing');initialProof=proof;notify('first-frame',proof);notify('playing',proof);if(params.get('galleryAutoLoop')==='1'&&!retiring)await play();})();initTask.catch(e=>{if(!retiring)fatal(e);});
}

