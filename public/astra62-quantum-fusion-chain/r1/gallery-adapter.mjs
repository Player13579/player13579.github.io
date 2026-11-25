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
  let diagnostics=null,diagnosticStart=null,diagnosticPanel=null;
  function diagnosticSnapshot(){
    try{
      if(!verify||!diagnostics)return null;
      const copy=x=>{
        if(x===null||typeof x!=='object')return x;
        const out=Array.isArray(x)?[]:{};
        for(const k of Object.keys(x))out[k]=copy(x[k]);
        return Object.freeze(out);
      };
      const allowedStages=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
      const allowedStatuses=['pending','ready','error','cancelled'];
      const observedStage=stages[stageIndex],postedStatus=latest?.status;
      const safeCount=x=>Number.isSafeInteger(x)&&x>=0?x:null;
      return copy({...diagnostics,observed:{
        stage:allowedStages.includes(observedStage)?observedStage:null,
        lastPostedStatus:allowedStatuses.includes(postedStatus)?postedStatus:null,
        bootSettled,creationClosed,disposed,fault,hasDevice:!!device,hasContext:!!context,pipelineReady:!!pipeline,activePresent:!!active,renderPending:!!renderPromise,
        submitted:safeCount(submitted),completed:safeCount(completed),rafPending:!!raf,loopTimerPending:!!loopTimer,observerDisconnected,drained,destroyCalled,deviceLossObserved:!!lostInfo,
        audioCreated:!!audio,audioClosed:!!audio&&audio.state==='closed',voicesCount:safeCount(voices.size),activationsCount:safeCount(activations.size),firstFramePresent:!!firstFrame
      }});
    }catch{return null;}
  }
  function diagnosticRender(){
    try{if(verify&&diagnosticPanel)diagnosticPanel.textContent=JSON.stringify(diagnosticSnapshot(),null,2);}catch{}
  }
  function diagnostic(op,lane,step,value){
    try{
      if(!verify||!diagnostics)return value;
      const inc=x=>Math.min(Number.MAX_SAFE_INTEGER,x+1);
      const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
      if(op==='enter'||op==='return'||op==='rejected'){
        if(!own(diagnostics.lanes,lane))return value;
        const record=diagnostics.lanes[lane];
        if(!own(record.steps,step))return value;
        const item=record.steps[step];
        if(op==='enter'){record.lastAwaitEntered=step;item.entered=inc(item.entered);}
        if(op==='return'){record.lastNormalReturned=step;item.normalReturned=inc(item.normalReturned);}
        if(op==='rejected')item.rejections=inc(item.rejections);
        const elapsed=performance.now()-diagnosticStart;
        if(diagnostics.trace.length===24)diagnostics.trace.shift();
        diagnostics.trace.push({lane,step,event:op,ageMs:Number.isFinite(elapsed)&&elapsed>=0?elapsed:null});
      }else if(op==='failure'){
        if(['boot-exception','render-exception','retire-attempt-exception','retire-exception','audio-exception','application-fault'].includes(value))diagnostics.lastFailure=value;
      }else if(op==='fault'){
        diagnostics.faultObserved=true;
      }else if(op==='count'){
        if(own(diagnostics.counters,step))diagnostics.counters[step]=inc(diagnostics.counters[step]);
      }else if(op==='reset-frame'){
        for(const k of Object.keys(diagnostics.frame))diagnostics.frame[k]=null;
      }else if(op==='frame'){
        if(own(diagnostics.frame,step)&&step!=='withinAgeWindow'){
          diagnostics.frame[step]=typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
          const f=diagnostics.frame;
          f.withinAgeWindow=f.uniformAgeMs===null||f.submittedAgeMs===null?null:f.uniformAgeMs>=120&&f.uniformAgeMs<=300&&f.submittedAgeMs>=120&&f.submittedAgeMs<=300;
        }
      }else if(op==='same-size'){
        diagnostics.frame.sameSize=typeof value==='boolean'?value:null;
      }
      diagnosticRender();
    }catch{}
    return value;
  }
  if(verify){
    let details=null;
    try{
      const definitions={
        boot:['adapter','device','module-import','shader-fetch','shader-text','scope','scope-body','compilation-info','pipeline-creation','error-scope-pop'],
        render:['scope','scope-body','render-queue','error-scope-pop'],
        retire:['init','init-work','render','render-work','drain','drain-work','drain-queue','audio','audio-work','audio-close','activations','activations-work','listeners','listeners-work','context','context-work','uniform','uniform-work','destroy','destroy-work','loss','loss-work','device-loss'],
        audio:['resume']
      };
      diagnostics={lanes:{},trace:[],lastFailure:null,faultObserved:false,counters:{readyPostReturns:0,retiredPostReturns:0,retireErrorPostReturns:0,trustedRetireCommands:0,deviceLossRegistrations:0,deviceLossCallbacks:0,submitReturns:0,ageWindowSubmitReturns:0,validatedAgeWindowFrames:0},frame:{uniformAgeMs:null,submittedAgeMs:null,completionAgeMs:null,validationAgeMs:null,submittedLive:null,validationBeforeExpiry:null,sameSize:null,validationAccepted:null,withinAgeWindow:null}};
      for(const lane of Object.keys(definitions)){
        const steps={};
        for(const step of definitions[lane])steps[step]={entered:0,normalReturned:0,rejections:0};
        diagnostics.lanes[lane]={lastAwaitEntered:null,lastNormalReturned:null,steps};
      }
      diagnosticStart=performance.now();
      Object.defineProperty(window,'__dvaFusionAwaitDiagnostics',{configurable:true,get:diagnosticSnapshot});
      details=document.createElement('details');
      details.open=false;
      details.style.cssText='position:fixed;bottom:0;left:0;max-height:75%;overflow:auto;max-width:100%;font:11px monospace;z-index:2147483647;color:#fff;background:#111';
      const summary=document.createElement('summary'),pre=document.createElement('pre');
      summary.textContent='検証診断';
      pre.style.cssText='margin:0;white-space:pre-wrap;overflow-wrap:anywhere';
      details.append(summary,pre);
      document.body.append(details);
      diagnosticPanel=pre;
      diagnosticRender();
    }catch{
      diagnosticPanel=null;
      try{if(details&&details!==status&&details.parentNode)details.parentNode.removeChild(details);}catch{}
    }
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let dimensions=null;
  function emit(action,state,extra={}){
    latest=freeze({schema:SCHEMA,...(action==='retired'||action==='retire-error'?{action}:{}),versionId:config.versionId,token,attemptEpoch:epoch,sequence:++seq,stage:stages[stageIndex],status:state,firstFrame,lastFrame,...extra});
    parentWindow.postMessage(latest,origin);
    if(action==='startup'&&state==='ready')diagnostic('count',null,'readyPostReturns');
    if(action==='retired')diagnostic('count',null,'retiredPostReturns');
    if(action==='retire-error')diagnostic('count',null,'retireErrorPostReturns');
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
        if(owned.state!=='running'){diagnostic('enter','audio','resume');await owned.resume();diagnostic('return','audio','resume');}
        if(creationClosed||fault||document.hidden||identity!==audioIdentity||owned!==audio||owned.state!=='running')return {state:'unavailable',enabled:false,verify:false};
        audioEnabled=true;if(active)active.audioEnabled=true;
        return {state:'active',enabled:true,verify:false};
      }catch(e){diagnostic('failure','audio',null,'audio-exception');if(!creationClosed)audioError(e);return {state:'unavailable',enabled:false,verify:false};}
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
    diagnostic('fault');diagnostic('failure',null,null,'application-fault');
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
    return {width,height,cssWidth,cssHeight,rectWidth:rect.width,rectHeight:rect.height,dpr,rawDpr,scale:Math.min(width/292,height/135,dpr)};
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
  async function scoped(fn,lane){
    device.pushErrorScope('validation');let value,error;
    try{diagnostic('enter',lane,'scope-body');value=await fn();diagnostic('return',lane,'scope-body');}catch(e){diagnostic('rejected',lane,'scope-body');error=e;}
    let validation;try{diagnostic('enter',lane,'error-scope-pop');validation=await device.popErrorScope();diagnostic('return',lane,'error-scope-pop');}catch(e){diagnostic('rejected',lane,'error-scope-pop');error??=e;}
    if(validation)error??=Error(validation.message);
    if(error)throw error;return value;
  }
  function requestFrame(){
    if(!available()||!pipeline||!active||raf||renderPromise)return;
    raf=requestAnimationFrame(()=>{
      raf=0;if(!available()||!active)return;
      const task=draw();renderPromise=task;
      task.catch(e=>{fail(e);diagnostic('failure','render',null,'render-exception');}).finally(()=>{if(renderPromise===task)renderPromise=null;if(available()&&active)requestFrame();});
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
    loopTimer=setTimeout(()=>{loopTimer=0;if(available()){try{beginCause();}catch(e){fail(e);}}},900);
  }
  async function draw(){
    if(!available()||!active)return;
    const cause=active,gen=generation;
    let size,frame,age,live;
    diagnostic('reset-frame');
    diagnostic('enter','render','scope');
    await scoped(async()=>{
      if(!available()||active!==cause||generation!==gen)return;
      size=setSize();if(!size)return;
      age=Math.max(0,performance.now()-cause.start);live=age<mod.lifetimeMs;
      diagnostic('frame',null,'uniformAgeMs',age);diagnostic('frame',null,'submittedLive',live);
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
      diagnostic('frame',null,'submittedAgeMs',submittedAge);
      device.queue.submit([command]);submitted++;
      diagnostic('count',null,'submitReturns');
      if(age>=120&&age<=300&&submittedAge>=120&&submittedAge<=300)diagnostic('count',null,'ageWindowSubmitReturns');
      const id=++submissionId;
      diagnostic('enter','render','render-queue');
      await device.queue.onSubmittedWorkDone();diagnostic('return','render','render-queue');completed++;
      frame={recorded:true,submitted:true,completed:true,canvasConnected:canvas.isConnected,passes:1,submissionId:id,causeId:cause.id,cause:{id:cause.id},generation:gen,recordedAt,submittedAt,completedAt:performance.now(),ageMsAtSubmission:submittedAge,submittedAge,uniformAgeMs:age,viewportWidth:size.width,viewportHeight:size.height,cssWidth:size.cssWidth,cssHeight:size.cssHeight,rectWidth:size.rectWidth,rectHeight:size.rectHeight,dpr:size.dpr,rawDpr:size.rawDpr,scale:size.scale};
      diagnostic('frame',null,'completionAgeMs',frame.completedAt-cause.start);
    },'render');
    diagnostic('return','render','scope');
    if(!available()||active!==cause||generation!==gen)return;
    const now=performance.now();
    diagnostic('frame',null,'validationAgeMs',now-cause.start);
    diagnostic('frame',null,'validationBeforeExpiry',now-cause.start<mod.lifetimeMs);
    diagnostic('frame',null,'validationAccepted',false);
    if(frame&&live&&now-cause.start<mod.lifetimeMs&&diagnostic('same-size',null,null,sameSize(size,measure()))){
      diagnostic('frame',null,'validationAccepted',true);
      frame.validationCompleted=true;frame.validationCompletedAt=now;
      lastFrame=freeze(frame);
      if(frame.uniformAgeMs>=120&&frame.uniformAgeMs<=300&&frame.submittedAge>=120&&frame.submittedAge<=300)diagnostic('count',null,'validatedAgeWindowFrames');
      if(!firstFrame&&frame.uniformAgeMs>=120&&frame.uniformAgeMs<=300&&frame.submittedAge>=120&&frame.submittedAge<=300){
        firstFrame=lastFrame;stageIndex=stages.indexOf('playing');status.textContent='Playing';status.hidden=true;
        emit('startup','ready',{causeId:cause.id,generation:gen});
      }
      soundAt(cause,gen);
    }
    if(now-cause.start>=mod.lifetimeMs&&!live)finishCause(cause,gen);
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
    diagnostic('count',null,'trustedRetireCommands');
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
    const attempt=async (fn,step)=>{try{diagnostic('enter','retire',step+'-work');await fn();diagnostic('return','retire',step+'-work');}catch(e){diagnostic('rejected','retire',step+'-work');diagnostic('failure','retire',null,'retire-attempt-exception');errors.push(message(e));}};
    (async()=>{
      diagnostic('enter','retire','init');
      await attempt(()=>initPromise,'init');
      diagnostic('return','retire','init');
      if(renderPromise){diagnostic('enter','retire','render');await attempt(()=>renderPromise,'render');diagnostic('return','retire','render');}
      if(device){
        diagnostic('enter','retire','drain');
        await attempt(async()=>{diagnostic('enter','retire','drain-queue');await device.queue.onSubmittedWorkDone();diagnostic('return','retire','drain-queue');drained=true;},'drain');
        diagnostic('return','retire','drain');
      }
      else drained=true;
      stopAudio();
      if(audio){
        diagnostic('enter','retire','audio');
        await attempt(async()=>{if(audio.state!=='closed'){diagnostic('enter','retire','audio-close');await audio.close();diagnostic('return','retire','audio-close');}if(audio.state!=='closed')throw Error('Audio context not closed');},'audio');
        diagnostic('return','retire','audio');
      }
      diagnostic('enter','retire','activations');
      await attempt(()=>Promise.all([...activations]),'activations');
      diagnostic('return','retire','activations');
      diagnostic('enter','retire','listeners');
      await attempt(()=>{
        observer?.disconnect();observerDisconnected=true;
        document.removeEventListener('visibilitychange',onVisibility);
        window.removeEventListener('resize',onResize);
        window.removeEventListener('message',onMessage);
        window.removeEventListener('pagehide',onPageHide);
        device?.removeEventListener('uncapturederror',onGpuError);
      },'listeners');
      diagnostic('return','retire','listeners');
      diagnostic('enter','retire','context');
      await attempt(()=>{context?.unconfigure();contextUnconfigured=true;},'context');
      diagnostic('return','retire','context');
      diagnostic('enter','retire','uniform');
      await attempt(()=>uniform?.destroy(),'uniform');
      diagnostic('return','retire','uniform');
      if(device){
        diagnostic('enter','retire','destroy');
        await attempt(()=>{device.destroy();destroyCalled=true;},'destroy');
        diagnostic('return','retire','destroy');
        diagnostic('enter','retire','loss');
        await attempt(async()=>{diagnostic('enter','retire','device-loss');const info=await lostPromise;diagnostic('return','retire','device-loss');lostInfo=info;if(info.reason!=='destroyed')throw Error('Owned device loss was not destroyed: '+info.reason);},'loss');
        diagnostic('return','retire','loss');
      }
      if(!bootSettled||voices.size||activations.size||raf||loopTimer||!contextUnconfigured||!observerDisconnected||!drained||audio&&audio.state!=='closed'||device&&(!destroyCalled||lostInfo?.reason!=='destroyed'))errors.push('Incomplete teardown');
      report();
    })().catch(e=>{diagnostic('failure','retire',null,'retire-exception');report(e);});
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
    diagnostic('enter','boot','adapter');
    const adapter=await navigator.gpu.requestAdapter();
    diagnostic('return','boot','adapter');
    if(creationClosed)return;
    if(!adapter)throw Error('WebGPU adapter unavailable');
    advance('device');
    diagnostic('enter','boot','device');
    device=await adapter.requestDevice();
    diagnostic('return','boot','device');
    lostPromise=device.lost.then(info=>{diagnostic('count',null,'deviceLossCallbacks');lostInfo=info;if(!creationClosed)fail(Error(info.message||'Unexpected GPU device loss'));return info;});
    diagnostic('count',null,'deviceLossRegistrations');
    device.addEventListener('uncapturederror',onGpuError);
    if(creationClosed)return;
    context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas unavailable');
    const preferred=navigator.gpu.getPreferredCanvasFormat();
    format=preferred.endsWith('-srgb')?preferred.slice(0,-5):preferred;
    advance('assets');
    diagnostic('enter','boot','module-import');
    mod=await import(new URL(config.moduleUrl,document.baseURI).href);
    diagnostic('return','boot','module-import');
    if(creationClosed||fault)return;
    if(mod.version!==config.versionId||!Number.isFinite(mod.lifetimeMs)||mod.lifetimeMs<=100||typeof mod.fixtureEvent!=='function'||typeof mod.makeGate!=='function'||typeof mod.makeCue!=='function')throw Error('Effect module contract mismatch');
    accept=mod.makeGate();
    diagnostic('enter','boot','shader-fetch');
    const response=await fetch(new URL(config.shaderUrl,document.baseURI));
    diagnostic('return','boot','shader-fetch');
    if(creationClosed||fault)return;
    if(!response.ok)throw Error('Shader HTTP '+response.status);
    diagnostic('enter','boot','shader-text');
    const code=await response.text();diagnostic('return','boot','shader-text');if(creationClosed||fault)return;
    advance('pipelines');
    diagnostic('enter','boot','scope');
    await scoped(async()=>{
      const shader=device.createShaderModule({code});
      diagnostic('enter','boot','compilation-info');
      const info=await shader.getCompilationInfo();
      diagnostic('return','boot','compilation-info');
      if(creationClosed||fault)return;
      const errors=info.messages.filter(m=>m.type==='error');
      if(errors.length)throw Error(errors.map(m=>m.lineNum+': '+m.message).join(' / '));
      diagnostic('enter','boot','pipeline-creation');
      const ready=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
      diagnostic('return','boot','pipeline-creation');
      if(creationClosed||fault)return;
      uniform=device.createBuffer({size:bytes,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      bind=device.createBindGroup({layout:ready.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});pipeline=ready;
    },'boot');
    diagnostic('return','boot','scope');
    if(creationClosed||fault)return;
    observer=new ResizeObserver(onResize);observer.observe(canvas);
    advance('first-frame');
    if(!document.hidden)beginCause();
  }).catch(e=>{fail(e);diagnostic('failure','boot',null,'boot-exception');}).finally(()=>{bootSettled=true;});
  return api;
}
