// Same-origin gallery child startup protocol; this classic script runs before module imports.
(() => {
  const params = new URL(location.href).searchParams;
  const token = String(params.get('galleryStartupToken') || '').slice(0, 128);
  const versionId = String(params.get('galleryVersionId') || 'donation-card-zero-sol61-r3-post').slice(0, 128);
  const attemptEpoch = Number(params.get('galleryAttemptEpoch')) || 0;
  const startedAtMs = performance.now();
  let sequence = 0, terminal = false, cleanup = null, timer = 0;
  const state = {schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:0,
    stage:'child-document',status:'pending',startedAtMs,stageStartedAtMs:startedAtMs,elapsedMs:0};
  const safe = (v,n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'_').slice(0,n);
  const snapshot = () => Object.freeze({...state,
    ...(state.error ? {error:Object.freeze({...state.error})} : {}),
    ...(state.firstFrame ? {firstFrame:Object.freeze({...state.firstFrame})} : {})});
  function emit(stage,status,extra={}) {
    if(!['child-document','adapter','device','assets','pipelines','first-frame','playing'].includes(stage) ||
       !['pending','delayed','ready','error','cancelled','unsupported'].includes(status)) return;
    if(terminal && !['error','unsupported','cancelled'].includes(status)) return;
    if(['ready','error','unsupported','cancelled'].includes(status)){clearTimeout(timer);timer=0;}
    const now=performance.now(); if(stage!==state.stage)state.stageStartedAtMs=now;
    state.stage=stage;state.status=status;state.sequence=++sequence;state.elapsedMs=Math.max(0,now-startedAtMs);
    if(extra.error)state.error={code:safe(extra.error.code||'PREVIEW_ERROR',64),message:safe(extra.error.message||extra.error,500)};
    if(extra.firstFrame)state.firstFrame={...extra.firstFrame};
    const message=snapshot();
    try{if(token&&parent!==window&&location.origin!=='null')parent.postMessage(message,location.origin);}catch{}
    const node=document.getElementById('status');
    if(node){node.dataset.galleryStatus=status;node.dataset.galleryStage=stage;
      if(status==='error'||status==='unsupported'){node.dataset.galleryError='true';node.textContent=state.error?.message||'Preview failed';}
      else if(status==='ready'){node.dataset.galleryError='false';node.textContent='描画を開始しました（品質は別途確認）';}
      else{node.dataset.galleryError='false';node.textContent=stage==='child-document'?'プレビューを読み込んでいます…':`WebGPU ${stage}…`;}}
    return message;
  }
  function fail(error,code,status='error'){
    if(terminal)return;terminal=true;try{cleanup?.();}catch{}
    emit(state.stage,status==='unsupported'?'unsupported':'error',{error:{code:code||error?.code||'PREVIEW_ERROR',message:error?.message||error||'Preview failed'}});
  }
  function cancel(){if(terminal)return;terminal=true;clearTimeout(timer);timer=0;try{cleanup?.();}catch{}emit(state.stage,'cancelled');}
  window.__dvaGalleryStartup=Object.freeze({advance:(s,st='pending',extra={})=>emit(s,st,extra),fail,
    setCleanup:fn=>{cleanup=typeof fn==='function'?fn:null;},cancel,isActive:()=>!terminal,snapshot});
  window.__dvaGalleryStartupSnapshot=snapshot;
  addEventListener('error',e=>{if(!e.target||e.target===window||e.target instanceof HTMLScriptElement)
    fail(new Error(e.message||'Preview module/import failed'),'MODULE_OR_RUNTIME_ERROR');},true);
  addEventListener('unhandledrejection',e=>fail(e.reason instanceof Error?e.reason:new Error(String(e.reason||'rejection')),e.reason?.code||'UNHANDLED_REJECTION'));
  addEventListener('pagehide',cancel,{once:true});
  addEventListener('message',e=>{const d=e.data;if(e.origin===location.origin&&e.source===parent&&d?.schema==='dva-gallery-startup/v1'&&d.action==='retire'&&d.token===token&&d.versionId===versionId&&d.attemptEpoch===attemptEpoch)cancel();});
  timer=setTimeout(()=>fail(new Error('Preview startup exceeded 90 seconds'),'STARTUP_TIMEOUT_OVERALL'),90000);
  emit('child-document','pending');
})();
