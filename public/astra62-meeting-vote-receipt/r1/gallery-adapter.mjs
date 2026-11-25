// gallery-adapter.mjs
const SCHEMA='dva-gallery-startup/v1';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const message=e=>String(e?.message??e).slice(0,500);
export async function mountGalleryEffect(config){
  let status=document.querySelector('[data-gallery-status]');
  if(!status){status=document.createElement('output');status.dataset.galleryStatus='';document.body.append(status);}
  const visibleError=e=>{status.hidden=false;status.textContent=message(e);};
  let credentials;
  try{
    const q=new URL(location.href).searchParams;
    const one=k=>q.getAll(k).length===1?q.get(k):null;
    const token=one('galleryStartupToken'),rawEpoch=one('galleryAttemptEpoch'),epoch=Number(rawEpoch);
    if(window.parent===window||one('embed')!=='1'||one('galleryAutoLoop')!=='1'||one('galleryVersionId')!==config.versionId||!/^[0-9a-fA-F]{32}$/.test(token??'')||!/^[1-9]\d*$/.test(rawEpoch??'')||!Number.isSafeInteger(epoch)||epoch<=0)throw Error('Invalid gallery credentials');
    if(window.parent.location.origin!==location.origin)throw Error('Gallery parent must be same-origin');
    if(!config.versionId||typeof config.uniformValues!=='function')throw Error('Invalid gallery configuration');
    credentials={token,epoch};
  }catch(e){visibleError(e);throw e;}
  const {token,epoch}=credentials,origin=location.origin,parentWindow=window.parent;
  const canvas=document.querySelector('canvas');
  const stages=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
  let stageIndex=0,seq=0,latest=null,firstFrame=null,lastFrame=null;
  let creationClosed=false,disposed=false,fault=false,initPromise=Promise.resolve(),renderPromise=null,retirePromise=null;
  let device=null,context=null,uniform=null,pipeline=null,bind=null,format=null,mod=null,accept=null;
  let lostPromise=null,lostInfo=null,destroyCalled=false,drained=false,contextUnconfigured=false;
  let raf=0,loopTimer=0,serial=0,generation=0,submissionId=0,submitted=0,completed=0,active=null;
  let observer=null,observerDisconnected=false,bootSettled=false;
  let audio=null,audioBuffer=null,audioEnabled=false,audioIdentity=0;
  const voices=new Set(),activations=new Set();
  const verify=new URL(location.href).searchParams.has('verify');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let dimensions=null;
  function emit(action,state,extra={}){
    latest=freeze({schema:SCHEMA,...(action==='retired'||action==='retire-error'?{action}:{}),versionId:config.versionId,token,attemptEpoch:epoch,sequence:++seq,stage:stages[stageIndex],status:state,firstFrame,lastFrame,...extra});
    parentWindow.postMessage(latest,origin);
    return latest;
  }
  function advance(stage){if(creationClosed||fault)return;const i=stages.indexOf(stage);if(i<stageIndex)throw Error('Startup stage regression');stageIndex=i;emit('startup','pending');}
  function stopVoices(){
    for(const v of voices){try{v.stop();}catch{}try{v.disconnect();}catch{}v.onended=null;}
    voices.clear();
  }
  function stopAudio(){audioIdentity++;audioEnabled=false;if(active)active.audioEnabled=false;stopVoices();}
  function audioError(e){visibleError('Audio: '+message(e));}
  function activateFromGesture(){
    if(verify)return Promise.resolve({state:'silent',enabled:false,verify:true});
    if(creationClosed||fault||document.hidden)return Promise.resolve({state:'unavailable',enabled:false,verify:false});
    const identity=++audioIdentity;
    const task=(async()=>{
      try{
        if(!mod)return {state:'unavailable',enabled:false,verify:false};
        if(!audio||audio.state==='closed'){
          const C=window.AudioContext||window.webkitAudioContext;
          if(!C)throw Error('AudioContext unavailable');
          audio=new C();
          const pcm=mod.makeCue(audio.sampleRate);
          audioBuffer=audio.createBuffer(1,pcm.length,audio.sampleRate);
          audioBuffer.copyToChannel(pcm,0);
        }
        const owned=audio;
        if(owned.state!=='running')await owned.resume();
        if(creationClosed||fault||document.hidden||identity!==audioIdentity||owned!==audio||owned.state!=='running')return {state:'unavailable',enabled:false,verify:false};
        audioEnabled=true;if(active)active.audioEnabled=true;
        return {state:'active',enabled:true,verify:false};
      }catch(e){if(!creationClosed)audioError(e);return {state:'unavailable',enabled:false,verify:false};}
    })();
    activations.add(task);task.then(()=>activations.delete(task),()=>activations.delete(task));return task;
  }
  function soundAt(cause,gen){
    if(creationClosed||fault||document.hidden||verify||active!==cause||generation!==gen||!cause.audioEnabled||cause.audioStarted||!audioEnabled||audio?.state!=='running'||!audioBuffer)return;
    const elapsed=(performance.now()-cause.start)/1000;
    if(!(elapsed>0&&elapsed<audioBuffer.duration))return;
    let source;
    try{
      source=audio.createBufferSource();source.buffer=audioBuffer;source.connect(audio.destination);
      source.onended=()=>{try{source.disconnect();}catch{}voices.delete(source);};
      voices.add(source);source.start(0,elapsed);cause.audioStarted=true;
    }catch(e){if(source){voices.delete(source);try{source.disconnect();}catch{}}audioError(e);}
  }
  function cancelScheduling(){if(raf)cancelAnimationFrame(raf);raf=0;if(loopTimer)clearTimeout(loopTimer);loopTimer=0;}
  function invalidate(){generation++;active=null;cancelScheduling();audioIdentity++;stopVoices();}
  function fail(e){
    if(creationClosed||fault)return;
    fault=true;invalidate();visibleError('Gallery: '+message(e));emit('startup','error',{error:message(e)});
  }
  function available(){return !creationClosed&&!fault&&!document.hidden;}
  function measure(){
    if(!canvas?.isConnected||!device)return null;
    const rect=canvas.getBoundingClientRect(),cssWidth=canvas.clientWidth,cssHeight=canvas.clientHeight;
    if(!(rect.width>0&&rect.height>0&&cssWidth>0&&cssHeight>0))return null;
    const rawDpr=window.devicePixelRatio||1,limit=device.limits.maxTextureDimension2D;
    const dpr=Math.min(rawDpr,limit/cssWidth,limit/cssHeight);
    if(!(Number.isFinite(dpr)&&dpr>0))return null;
    const width=Math.min(limit,Math.max(1,Math.round(cssWidth*dpr))),height=Math.min(limit,Math.max(1,Math.round(cssHeight*dpr)));
    return {width,height,cssWidth,cssHeight,rectWidth:rect.width,rectHeight:rect.height,dpr,rawDpr,scale:Math.max(.1,Math.min(width/170,height/145,dpr))};
  }
  function sameSize(a,b){return !!a&&!!b&&Object.keys(a).every(k=>a[k]===b[k])&&canvas.width===a.width&&canvas.height===a.height;}
  function setSize(){
    const next=measure();if(!next)return null;
    if(!dimensions||canvas.width!==next.width||canvas.height!==next.height){
      canvas.width=next.width;canvas.height=next.height;
      context.configure({device,format,alphaMode:'opaque'});
    }
    dimensions=next;return next;
  }
  async function scoped(fn){
    device.pushErrorScope('validation');let value,error;
    try{value=await fn();}catch(e){error=e;}
    let validation;try{validation=await device.popErrorScope();}catch(e){error??=e;}
    if(validation)error??=Error(validation.message);
    if(error)throw error;return value;
  }
  function requestFrame(){
    if(!available()||!pipeline||!active||raf||renderPromise)return;
    raf=requestAnimationFrame(()=>{
      raf=0;if(!available()||!active)return;
      const task=draw();renderPromise=task;
      task.catch(fail).finally(()=>{if(renderPromise===task)renderPromise=null;if(available()&&active)requestFrame();});
    });
  }
  function beginCause(){
    if(!available()||!pipeline)return;
    stopVoices();generation++;
    const event=accept(mod.fixtureEvent(config.fixture,++serial));
    if(!event){active=null;throw Error('Fixture rejected by makeGate');}
    active={...event,start:performance.now(),audioStarted:false,audioEnabled};
    requestFrame();
  }
  function finishCause(cause,gen){
    if(!available()||active!==cause||generation!==gen)return;
    active=null;stopVoices();
    loopTimer=setTimeout(()=>{loopTimer=0;if(available()){try{beginCause();}catch(e){fail(e);}}},500);
  }
  async function draw(){
    if(!available()||!active)return;
    const cause=active,gen=generation;
    let size,frame,age,live;
    await scoped(async()=>{
      if(!available()||active!==cause||generation!==gen)return;
      size=setSize();if(!size)return;
      age=Math.max(0,performance.now()-cause.start);live=age<mod.lifetimeMs;
      const values=config.uniformValues({width:size.width,height:size.height,age,scale:size.scale,reduced:reduced.matches,live,cause:freeze({id:cause.id,start:cause.start,generation:gen})});
      const data=values instanceof Float32Array?values:(Array.isArray(values)?new Float32Array(values):null);
      if(!data||data.byteLength!==(config.uniformBytes??32)||!Array.from(data).every(Number.isFinite))throw Error('Invalid uniform values: exact finite Float32Array byte count required');
      if(!available()||active!==cause||generation!==gen)return;
      device.queue.writeBuffer(uniform,0,data);
      const encoder=device.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
      const command=encoder.finish(),recordedAt=performance.now(),submittedAt=performance.now();
      const submittedAge=submittedAt-cause.start;
      device.queue.submit([command]);submitted++;
      const id=++submissionId;
      await device.queue.onSubmittedWorkDone();completed++;
      frame={recorded:true,submitted:true,completed:true,canvasConnected:canvas.isConnected,passes:1,submissionId:id,causeId:cause.id,cause:{id:cause.id},generation:gen,recordedAt,submittedAt,completedAt:performance.now(),ageMsAtSubmission:submittedAge,submittedAge,uniformAgeMs:age,viewportWidth:size.width,viewportHeight:size.height,cssWidth:size.cssWidth,cssHeight:size.cssHeight,rectWidth:size.rectWidth,rectHeight:size.rectHeight,dpr:size.dpr,rawDpr:size.rawDpr,scale:size.scale};
    });
    if(!available()||active!==cause||generation!==gen)return;
    const now=performance.now();
    if(frame&&live&&now-cause.start<mod.lifetimeMs&&sameSize(size,measure())){
      frame.validationCompleted=true;frame.validationCompletedAt=now;
      lastFrame=freeze(frame);
      if(!firstFrame&&frame.ageMsAtSubmission>=100&&frame.ageMsAtSubmission<mod.lifetimeMs&&age>=100){
        firstFrame=lastFrame;stageIndex=stages.indexOf('playing');status.textContent='Playing';status.hidden=true;
        emit('startup','ready',{causeId:cause.id,generation:gen});
      }
      soundAt(cause,gen);
    }
    if(now-cause.start>=mod.lifetimeMs)finishCause(cause,gen);
  }
  function onVisibility(){
    invalidate();
    if(available()&&pipeline){try{beginCause();}catch(e){fail(e);}}
  }
  function onResize(){requestFrame();}
  function onGpuError(e){fail(e.error??e);}
  function onMessage(e){
    const d=e.data;
    if(e.source!==parentWindow||e.origin!==origin||!d||typeof d!=='object'||Array.isArray(d)||d.schema!==SCHEMA||d.action!=='retire'||d.versionId!==config.versionId||d.token!==token||d.attemptEpoch!==epoch)return;
    retire();
  }
  function onPageHide(){retire();}
  function lifecycle(errors){
    const hasDevice=!!device,settled=errors.length===0;
    return {disposeSettled:settled,bootSettled,teardown:settled?'disposed':'unknown',deviceLifecycle:hasDevice?(settled?'destroyed-loss-settled':'unknown'):'not-created',device:{status:hasDevice?(settled?'destroyed-loss-settled':'unknown'):'not-created',drained,destroyCalled,lostReason:lostInfo?.reason??null},submitted,completed,contextUnconfigured,rafPending:!!raf,loopTimerPending:!!loopTimer,observerDisconnected,audio:{disposeSettled:settled,contextState:audio?.state??'absent',activeVoices:voices.size},pendingWork:settled?0:(bootSettled?0:1)+(renderPromise?1:0)+activations.size+1,cleanupErrors:errors.slice()};
  }
  function retire(){
    if(retirePromise)return retirePromise;
    creationClosed=true;disposed=true;invalidate();audioEnabled=false;
    let resolveRetire;retirePromise=new Promise(r=>{resolveRetire=r;});
    let reported=false;const errors=[];
    const report=error=>{
      if(reported)return;reported=true;clearTimeout(deadline);
      if(error)errors.push(message(error));
      stageIndex=stages.indexOf('playing');
      if(errors.length){visibleError('Retirement failed: '+errors.join('; '));resolveRetire(emit('retire-error','error',{lifecycle:lifecycle(errors)}));}
      else resolveRetire(emit('retired','cancelled',{lifecycle:lifecycle(errors)}));
    };
    const deadline=setTimeout(()=>report(Error('Retirement exceeded 10000ms; cleanup is not settled')),10000);
    const attempt=async fn=>{try{await fn();}catch(e){errors.push(message(e));}};
    (async()=>{
      await attempt(()=>initPromise);
      if(renderPromise)await attempt(()=>renderPromise);
      if(device)await attempt(async()=>{await device.queue.onSubmittedWorkDone();drained=true;});
      else drained=true;
      stopAudio();
      if(audio)await attempt(async()=>{if(audio.state!=='closed')await audio.close();if(audio.state!=='closed')throw Error('Audio context not closed');});
      await attempt(()=>Promise.all([...activations]));
      await attempt(()=>{
        observer?.disconnect();observerDisconnected=true;
        document.removeEventListener('visibilitychange',onVisibility);
        window.removeEventListener('resize',onResize);
        window.removeEventListener('message',onMessage);
        window.removeEventListener('pagehide',onPageHide);
        device?.removeEventListener('uncapturederror',onGpuError);
      });
      await attempt(()=>{context?.unconfigure();contextUnconfigured=true;});
      await attempt(()=>uniform?.destroy());
      if(device){
        await attempt(()=>{device.destroy();destroyCalled=true;});
        await attempt(async()=>{const info=await lostPromise;lostInfo=info;if(info.reason!=='destroyed')throw Error('Owned device loss was not destroyed: '+info.reason);});
      }
      if(!bootSettled||voices.size||activations.size||raf||loopTimer||!contextUnconfigured||!observerDisconnected||!drained||audio&&audio.state!=='closed'||device&&(!destroyCalled||lostInfo?.reason!=='destroyed'))errors.push('Incomplete teardown');
      report();
    })().catch(report);
    return retirePromise;
  }
  const api=Object.freeze({snapshot:()=>latest,retire,get disposed(){return disposed;},get creationClosed(){return creationClosed;}});
  window.__dvaGalleryStartupSnapshot=()=>latest;
  window.__dvaGalleryEffect=api;
  window.__gallerySfx=Object.freeze({activateFromGesture,stop:stopAudio});
  window.addEventListener('message',onMessage);
  window.addEventListener('pagehide',onPageHide);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('resize',onResize);
  emit('startup','pending');
  initPromise=Promise.resolve().then(async()=>{
    if(creationClosed)return;
    advance('adapter');
    if(!canvas)throw Error('Missing gallery canvas');
    const bytes=config.uniformBytes??32;
    if(!Number.isSafeInteger(bytes)||bytes<=0||bytes%16)throw Error('uniformBytes must be a positive multiple of 16');
    if(!navigator.gpu)throw Error('WebGPU unavailable');
    const adapter=await navigator.gpu.requestAdapter();
    if(creationClosed)return;
    if(!adapter)throw Error('WebGPU adapter unavailable');
    advance('device');
    device=await adapter.requestDevice();
    lostPromise=device.lost.then(info=>{lostInfo=info;if(!creationClosed)fail(Error(info.message||'Unexpected GPU device loss'));return info;});
    device.addEventListener('uncapturederror',onGpuError);
    if(creationClosed)return;
    context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas unavailable');
    format=navigator.gpu.getPreferredCanvasFormat();
    advance('assets');
    mod=await import(new URL(config.moduleUrl,document.baseURI).href);
    if(creationClosed||fault)return;
    if(mod.version!==config.versionId||!Number.isFinite(mod.lifetimeMs)||mod.lifetimeMs<=100||typeof mod.fixtureEvent!=='function'||typeof mod.makeGate!=='function'||typeof mod.makeCue!=='function')throw Error('Effect module contract mismatch');
    accept=mod.makeGate();
    const response=await fetch(new URL(config.shaderUrl,document.baseURI));
    if(creationClosed||fault)return;
    if(!response.ok)throw Error('Shader HTTP '+response.status);
    const code=await response.text();if(creationClosed||fault)return;
    advance('pipelines');
    await scoped(async()=>{
      const shader=device.createShaderModule({code});
      const info=await shader.getCompilationInfo();
      if(creationClosed||fault)return;
      const errors=info.messages.filter(m=>m.type==='error');
      if(errors.length)throw Error(errors.map(m=>m.lineNum+': '+m.message).join(' / '));
      const ready=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
      if(creationClosed||fault)return;
      uniform=device.createBuffer({size:bytes,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      bind=device.createBindGroup({layout:ready.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});pipeline=ready;
    });
    if(creationClosed||fault)return;
    observer=new ResizeObserver(onResize);observer.observe(canvas);
    advance('first-frame');
    if(!document.hidden)beginCause();
  }).catch(fail).finally(()=>{bootSettled=true;});
  return api;
}
