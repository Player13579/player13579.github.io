(() => {
'use strict';
const SCHEMA='dva-gallery-startup/v1', VERSION='universal-combat-impact-sol61-r1';
const doc=document, canvas=doc.querySelector('canvas'), output=doc.querySelector('output'), button=doc.querySelector('button');
const parentWindow=window.parent, origin=location.origin, query=new URL(location.href).searchParams;
const one=k=>query.getAll(k).length===1?query.get(k):null;
const token=one('galleryStartupToken'), epochText=one('galleryAttemptEpoch'), attemptEpoch=Number(epochText);
function visual(text){output.hidden=false;output.textContent=text;}
try {
  if(parentWindow===window||parentWindow.location.origin!==origin||one('embed')!=='1'||one('galleryAutoLoop')!=='1'||
     one('galleryVersionId')!==VERSION||!/^[a-fA-F0-9]{32}$/.test(token??'')||
     !/^[1-9][0-9]*$/.test(epochText??'')||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0)
    throw new Error('ギャラリーの再生情報が無効です');
} catch(e){visual(String(e?.message||e));return;}
const adapterSessionId=crypto.randomUUID(), TARGET='main', zoom=1, life=850, world=Object.freeze({x:1500,y:900});
const clear={r:0.014,g:0.026,b:0.038,a:1};
let sequence=0, stage='child-document', latest=null, firstFrame=null,lastFrame=null;
let core=null, device=null,lostPromise=null,lostInfo=null,target=null,shapes=null, contextAttempted=false;
let raf=0,timer=0,serial=0,generation=0,cause=null,closed=false,failed=false,bootSettled=false,busy=null,boot=null,retirement=null;
let submitted=0,completed=0,queueFault=null;
const msg=e=>String(e?.message||e).slice(0,350);
function emit(status,extra={}){
  latest=Object.freeze({schema:SCHEMA,versionId:VERSION,token,attemptEpoch,adapterSessionId,sequence:++sequence,stage,status,firstFrame,lastFrame,...extra});
  parentWindow.postMessage(latest,origin);
}
function advance(s){if(!closed&&!failed){stage=s;emit('pending');}}
function cancel(){if(raf)cancelAnimationFrame(raf);if(timer)clearTimeout(timer);raf=timer=0;}
function invalidate(){generation++;cause=null;cancel();}
function current(){return !closed&&!failed&&!doc.hidden&&canvas.isConnected;}
function fail(error){if(closed||failed)return;failed=true;invalidate();button.disabled=true;visual(msg(error));emit('error',{error:msg(error)});}
function measure(){
  const b=canvas.getBoundingClientRect(),width=Math.round(b.width),height=Math.round(b.height);
  if(width<1||height<1)return null;const rawDpr=window.devicePixelRatio||1,limit=device.limits.maxTextureDimension2D,
    dpr=Math.min(rawDpr,limit/width,limit/height);
  return {kind:'main',width,height,dpr,rawDpr,rectWidth:b.width,rectHeight:b.height,
    pixelWidth:Math.max(1,Math.round(width*dpr)),pixelHeight:Math.max(1,Math.round(height*dpr))};
}
function same(v){const m=measure();return m&&Object.keys(m).every(k=>m[k]===v[k])&&canvas.width===v.pixelWidth&&canvas.height===v.pixelHeight;}
function restart(){if(!current()||!target)return;invalidate();cause={id:'universal-r1-'+(++serial),start:performance.now(),gen:generation};schedule();}
function schedule(){
  if(!current()||!cause||raf||busy)return;
  raf=requestAnimationFrame(()=>{raf=0;const work=draw();busy=work;work.catch(fail).finally(()=>{
    if(busy===work)busy=null;if(current()&&cause)schedule();
  });});
}
async function draw(){
  const own=cause,v=measure();if(!own||!current()||!v)return;
  const now=performance.now(),age=now-own.start,active=age>=0&&age<life;
  const camera={x:world.x-v.width/2,y:world.y-v.height/2};
  const commands=window.plan({scene:{now,effects:active?[{id:own.id,...world,startedAt:own.start,duration:life}]:[]},
    camera,zoom,viewport:v,visibility:{allowCull:true,culled:false}});
  if(!current()||own!==cause)return;
  target.resize(v.pixelWidth,v.pixelHeight);
  const frame=core.beginFrame('Universal Combat Impact R1');
  let batch=null,promise=null;const recordedAt=performance.now();
  try{
    batch=shapes.enqueue(frame,{...v,target:TARGET,clear,commands,label:'world:hit-effects'});
    // Same FrameCore transaction; observer obtains the core's validation and
    // queue fence for the precise submission, not from a separate draw.
    frame.addEncoder({reads:[],writes:[TARGET],encode(){},onSubmitted(proof){
      promise=proof;},onProofError(e){queueFault=e;}});
    const passes=frame.submit(), submittedAt=performance.now();submitted++;
    if(!promise||!promise.validation||!promise.done)throw Error('FrameCore 証跡がありません');
    try {
      const [validation]=await Promise.all([promise.validation,promise.done]);
      if(validation!==null)throw Error(validation?.message||'WebGPU 検証失敗');
      completed++;
    } catch(e){queueFault=e;throw e;}
    const completedAt=performance.now();
    if(current()&&own===cause&&own.gen===generation&&same(v)&&active&&commands.length>0&&passes>0&&
       submittedAt-own.start<life&&completedAt-own.start<life){
      lastFrame=Object.freeze({recorded:true,submitted:true,completed:true,validationCompleted:true,canvasConnected:canvas.isConnected,
        submissionId:submitted,causeId:own.id,cause:{id:own.id},generation:own.gen,passes,commandCount:commands.length,
        recordedAt,submittedAt,completedAt,validationCompletedAt:completedAt,ageMsAtSubmission:submittedAt-own.start,
        submittedAge:submittedAt-own.start,uniformAgeMs:age,viewportWidth:v.pixelWidth,viewportHeight:v.pixelHeight,
        cssWidth:v.width,cssHeight:v.height,rectWidth:v.rectWidth,rectHeight:v.rectHeight,dpr:v.dpr,rawDpr:v.rawDpr});
      if(!firstFrame){firstFrame=lastFrame;stage='playing';output.hidden=true;emit('ready',{causeId:own.id,generation:own.gen});}
    }
  } catch(e){frame.abandon();throw e;}
  finally {
    // If proof construction fails after a submission, still fence buffers.
    if(batch){if(queueFault||!promise)try{await device.queue.onSubmittedWorkDone();}catch(e){queueFault??=e;}
      batch.destroy();}
  }
  if(current()&&own===cause&&performance.now()-own.start>=life){cause=null;timer=setTimeout(()=>{timer=0;restart();},450);}
}
function onResize(){if(current()&&target)restart();}
function onVisibility(){if(doc.hidden)invalidate();else restart();}
function onDeviceError(e){queueFault??=e.error||e;fail(queueFault);}
function onMessage(e){
  const d=e.data;
  if(e.source!==parentWindow||e.origin!==origin||!d||typeof d!=='object'||Array.isArray(d)||
     d.schema!==SCHEMA||d.action!=='retire'||d.versionId!==VERSION||d.token!==token||d.attemptEpoch!==attemptEpoch)return;
  void retire();
}
const onPageHide=()=>{void retire();};
function retire(){
  if(retirement)return retirement;
  closed=true;invalidate();button.disabled=true;
  let result;retirement=new Promise(r=>{result=r;});
  let reported=false,drained=false,destroyCalled=false,contextUnconfigured=false,observerDisconnected=false;
  const errors=[];
  function report(reason){
    if(reported)return;reported=true;clearTimeout(deadline);if(reason)errors.push(msg(reason));
    const settled=errors.length===0, mode=settled?(device?'destroyed-loss-settled':'no-device-settled'):'unknown';
    const lifecycle={disposeSettled:settled,bootSettled,creationClosed:closed,teardown:settled?'disposed':'unknown',deviceLifecycle:mode,
      device:{status:mode,acquired:Boolean(device),drained:device?drained:false,destroyCalled,lostReason:lostInfo?.reason??null},
      submitted,completed,contextUnconfigured,observerDisconnected,rafPending:!!raf,loopTimerPending:!!timer,
      audio:{disposeSettled:settled,contextState:'absent',activeVoices:0},pendingWork:settled?0:1,cleanupErrors:errors.slice()};
    stage='playing';emit(settled?'cancelled':'error',{action:settled?'retired':'retire-error',lifecycle});result(latest);
  }
  const deadline=setTimeout(()=>report(Error('退役待機時間を超えました')),10000);
  async function attempt(fn){try{await fn();}catch(e){errors.push(msg(e));}}
  void (async()=>{
    await attempt(()=>boot);if(busy)await attempt(()=>busy);
    if(device)await attempt(async()=>{await device.queue.onSubmittedWorkDone();drained=true;});
    if(queueFault)errors.push(msg(queueFault));
    await attempt(()=>{
      button.removeEventListener('click',restart);doc.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('resize',onResize);window.removeEventListener('message',onMessage);window.removeEventListener('pagehide',onPageHide);
      device?.removeEventListener('uncapturederror',onDeviceError);observerDisconnected=true;
    });
    await attempt(()=>{
      if(target){if(!target.unregister())throw Error('共有コンテキストが未解除です');}
      else if(contextAttempted)throw Error('コンテキスト取得の完了状態が不明です');
      contextUnconfigured=true;
    });
    await attempt(()=>shapes?.destroy());
    if(device) {
      await attempt(()=>{if(core)core.destroy();else device.destroy();destroyCalled=true;});
      await attempt(async()=>{lostInfo=await lostPromise;if(lostInfo?.reason!=='destroyed')throw Error('所有デバイスの終了を確認できません');});
    }
    if(!bootSettled||submitted!==completed||raf||timer||!contextUnconfigured||!observerDisconnected||
       (device&&(!drained||!destroyCalled||lostInfo?.reason!=='destroyed')))errors.push('未完了の退役処理があります');
    report();
  })().catch(report);
  return retirement;
}
async function init(){
  try {
    if(closed)return;
    advance('adapter');
    const native=navigator.gpu;if(!native)throw Error('WebGPU は利用できません');
    const gpu={
      getPreferredCanvasFormat:()=>native.getPreferredCanvasFormat(),
      requestAdapter:async opts=>{
        const adapter=await native.requestAdapter(opts);if(closed||!adapter)return null;
        return {requestDevice:async descriptor=>{
          if(closed)throw Error('退役中');
          const d=await adapter.requestDevice(descriptor);device=d;lostPromise=d.lost;
          d.addEventListener('uncapturederror',onDeviceError);
          d.lost.then(info=>{lostInfo=info;if(!closed)fail(Error(info?.message||'WebGPU デバイスを喪失しました'));});
          return d;
        }};
      }
    };
    core=await window.DvaWebGPUFrameCore.create({gpu});if(closed)return;
    if(core.device!==device)throw Error('GPU 所有権が不明です');
    advance('device');advance('assets');
    if(typeof window.plan!=='function'||typeof window.DvaWebGPUEffectShapes?.create!=='function')throw Error('素材が利用できません');
    const v=measure()||{pixelWidth:1,pixelHeight:1};
    contextAttempted=true;target=core.registerTarget(TARGET,canvas,{width:v.pixelWidth,height:v.pixelHeight});
    shapes=window.DvaWebGPUEffectShapes.create({device,format:core.format,maxDraws:64});
    advance('pipelines');advance('first-frame');button.disabled=false;restart();
  } catch(e){fail(e);}
  finally{bootSettled=true;}
}
window.__dvaGalleryStartupSnapshot=()=>latest;
window.__dvaGalleryEffect=Object.freeze({snapshot:()=>latest,get disposed(){return closed;},get creationClosed(){return closed;}});
window.addEventListener('message',onMessage);window.addEventListener('pagehide',onPageHide);
window.addEventListener('resize',onResize);doc.addEventListener('visibilitychange',onVisibility);button.addEventListener('click',restart);
emit('pending');boot=Promise.resolve().then(init);
})();
