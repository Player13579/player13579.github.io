// Same-origin gallery startup protocol for the private Donation Zero R4 preview.
(() => {
  const params=new URL(location.href).searchParams;
  const token=String(params.get('galleryStartupToken')||'').slice(0,128);
  const versionId=String(params.get('galleryVersionId')||'donation-zero-sol61-r4').slice(0,128);
  const attemptEpoch=Number(params.get('galleryAttemptEpoch'))||0;
  const startedAtMs=performance.now();let sequence=0,terminal=false,cleanup=null,timer=0,firstFrameDeadlineAtMs=null;
  const standaloneManual=parent===window&&params.get('embed')!=='1'&&token==='';
  const state={schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:0,stage:'child-document',status:'pending',startedAtMs,stageStartedAtMs:startedAtMs,elapsedMs:0,mode:standaloneManual?'standalone-manual':'existing-autoplay',resourcesReady:false,awaitingInput:false,firstFrameDeadlineAtMs:null};
  const clean=(v,n)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,'_').slice(0,n);
  const snapshot=()=>Object.freeze({...state,...(state.error?{error:Object.freeze({...state.error})}:{}),...(state.firstFrame?{firstFrame:Object.freeze({...state.firstFrame})}:{})});
  function emit(stage,status,extra={}){
    if(!['child-document','adapter','device','assets','pipelines','awaiting-input','first-frame','playing'].includes(stage)||!['pending','delayed','ready','error','cancelled','unsupported'].includes(status))return;
    if(terminal&&!['error','unsupported','cancelled'].includes(status))return;
    if(['ready','error','unsupported','cancelled'].includes(status)){clearTimeout(timer);timer=0;}
    const now=performance.now();if(stage!==state.stage)state.stageStartedAtMs=now;state.stage=stage;state.status=status;state.sequence=++sequence;state.elapsedMs=Math.max(0,now-startedAtMs);
    if(extra.error)state.error={code:clean(extra.error.code||'PREVIEW_ERROR',64),message:clean(extra.error.message||extra.error,500)};
    if(extra.firstFrame)state.firstFrame={...extra.firstFrame};
    const message=snapshot();try{if(token&&parent!==window&&location.origin!=='null')parent.postMessage(message,location.origin);}catch{}
    const statusNode=document.getElementById('status');if(statusNode){statusNode.dataset.galleryStatus=status;statusNode.dataset.galleryStage=stage;statusNode.dataset.galleryError=status==='error'||status==='unsupported'?'true':'false';}
    return message;
  }
  function fail(error,code,status='error'){if(terminal)return;terminal=true;try{cleanup?.();}catch{}emit(state.stage,status==='unsupported'?'unsupported':'error',{error:{code:code||error?.code||'PREVIEW_ERROR',message:error?.message||error||'Preview failed'}});}
  function cancel(){if(terminal)return;terminal=true;clearTimeout(timer);timer=0;try{cleanup?.();}catch{}emit(state.stage,'cancelled');}
  function awaitInput(proof){if(!standaloneManual||terminal||proof?.ready!==true||proof?.clearCompleted!==true||!Number.isInteger(proof?.rendererCount)||proof.rendererCount<1)return false;state.resourcesReady=true;state.awaitingInput=true;clearTimeout(timer);timer=0;emit('awaiting-input','pending');return true;}
  function beginFirstFrame(reason){if(!standaloneManual||terminal||!state.awaitingInput||state.firstFrame||firstFrameDeadlineAtMs!==null||!['accepted-receive','active-hold','source-on-redraw'].includes(reason))return false;firstFrameDeadlineAtMs=performance.now()+90000;state.firstFrameDeadlineAtMs=firstFrameDeadlineAtMs;state.awaitingInput=false;emit('first-frame','pending',{firstFrame:{reason}});timer=setTimeout(()=>fail(new Error('Donation first frame exceeded 90 seconds'),'STARTUP_TIMEOUT_FIRST_FRAME'),90000);return true;}
  window.__dvaGalleryStartup=Object.freeze({advance:(stage,status='pending',extra={})=>emit(stage,status,extra),fail,awaitInput,beginFirstFrame,mode:state.mode,setCleanup:fn=>{cleanup=typeof fn==='function'?fn:null;},cancel,isActive:()=>!terminal,snapshot});
  window.__dvaGalleryStartupSnapshot=snapshot;
  addEventListener('error',event=>{if(!event.target||event.target===window||event.target instanceof HTMLScriptElement)fail(new Error(event.message||'Preview module/import failed'),'MODULE_OR_RUNTIME_ERROR');},true);
  addEventListener('unhandledrejection',event=>fail(event.reason instanceof Error?event.reason:new Error(String(event.reason||'rejection')),event.reason?.code||'UNHANDLED_REJECTION'));
})();
