(function(root){
  'use strict';
  const VERSION_ID='hover-sprint-faithful-extraction-r1';
  const ROOM_ID='hover-sprint-gallery-r1';
  const ROOM_GENERATION=1;
  const LOCAL_START_MS=500;
  const SERVER_START_MS=10000;
  const LIVE_MS=8000;
  const LOOP_MS=8500;
  const finite=Number.isFinite;
  function normalizedHeading(value){
    if(!value||!finite(value.x)||!finite(value.y))throw new TypeError('heading must be finite');
    const n=Math.hypot(value.x,value.y);if(n<1e-6)throw new RangeError('heading must be nonzero');
    return {x:value.x/n,y:value.y/n};
  }
  function backingSize(devicePixelRatio=1){const dpr=Math.max(1,finite(devicePixelRatio)?devicePixelRatio:1);return {width:Math.max(1,Math.round(384*dpr)),height:Math.max(1,Math.round(320*dpr)),dpr};}
  function buildSample(elapsedMs,{sourceOn=true,reducedMotion=false,heading={x:1,y:0},cycle=0,roomGeneration=ROOM_GENERATION}={}){
    if(!finite(elapsedMs)||elapsedMs<0||elapsedMs>=LOOP_MS)throw new RangeError('elapsed must be within 0..8500 ms');
    if(!Number.isSafeInteger(cycle)||cycle<0||!Number.isSafeInteger(roomGeneration)||roomGeneration<0)throw new RangeError('invalid fixture identity');
    const h=normalizedHeading(heading),side={x:-h.y,y:h.x},p={x:160,y:150};
    const visualY=y=>31+(y-31)*.72;
    const pair=(y,spacing)=>[-1,1].map(sign=>({x:p.x+side.x*spacing*sign,y:p.y+visualY(y)+side.y*spacing*sign}));
    const id=`${ROOM_ID}:${roomGeneration}:cycle-${cycle}:hover-human-1`;
    const player={id:'hover-human-1',alive:true,ejected:false,inVent:false,
      hoverSprintUntil:SERVER_START_MS+cycle*LOOP_MS+LIVE_MS,hoverSprintDurationMs:LIVE_MS,
      travelHeading:h,feetJetsWorld:pair(23,6),backJetsWorld:pair(-2,8)};
    const active=sourceOn&&elapsedMs<LIVE_MS;
    return Object.freeze({
      scene:Object.freeze({nowMs:LOCAL_START_MS+cycle*LOOP_MS+elapsedMs,
        serverNow:SERVER_START_MS+cycle*LOOP_MS+elapsedMs,
        players:active?[Object.freeze(player)]:[],events:active&&elapsedMs<360?[Object.freeze({id,type:'hover-sprint-active',variant:'auto-unsupported',playerId:player.id,startedAt:LOCAL_START_MS+cycle*LOOP_MS,durationMs:1200})]:[],reducedMotion:Boolean(reducedMotion)}),
      camera:Object.freeze({x:0,y:0}),zoom:1,
      viewport:Object.freeze({kind:'main',width:384,height:320,pixelWidth:384,pixelHeight:320}),
      causeId:id,actorId:player.id,elapsedMs,cycle,sourceOn:Boolean(sourceOn),reducedMotion:Boolean(reducedMotion),held:false
    });
  }
  function recordFrame({renderer,targetId='hover-sprint-preview',pass,input,pixelWidth,pixelHeight,onSubmitted=()=>{},onProofError=()=>{}}={}){
    if(!renderer||typeof renderer.beginFrame!=='function'||!pass?.record||!input)throw new TypeError('Hover Sprint frame needs shared renderer, pass and sample');
    const frame=renderer.beginFrame('Hover Sprint E-only replay');frame.clear(targetId,[0,0,0,0]);
    const result=pass.record({frame,target:targetId,viewport:{...input.viewport,pixelWidth,pixelHeight},scene:input.scene,camera:input.camera,zoom:input.zoom});
    let proof=null,error=null;
    frame.addEncoder({reads:[],writes:[targetId],label:'hover-sprint-visible-submission-proof',encode(){},
      onSubmitted(value){proof=value;onSubmitted(value);},onProofError(value){error=value;onProofError(value);}});
    const submissionCount=frame.submit();
    const renderPassCount=submissionCount-1;
    if(!Number.isSafeInteger(renderPassCount)||renderPassCount<1)throw new Error(`Invalid Hover Sprint render-pass receipt: ${renderPassCount}`);
    return Object.freeze({result,submissionCount,renderPassCount,get proof(){return proof;},get proofError(){return error;}});
  }
  function canAdmitOnset({hasOnset,visible,sourceOn,held,currentAgeMs,sameCause}={}){
    return Boolean(hasOnset&&visible&&sourceOn&&!held&&finite(currentAgeMs)&&currentAgeMs>=0&&currentAgeMs<=180&&sameCause===true);
  }
  function validStartup({params,startup,windowRef=globalThis.window}={}){
    const q=params||new URLSearchParams(windowRef?.location?.search||'');
    const token=String(q.get('galleryStartupToken')||''),versionId=String(q.get('galleryVersionId')||''),attemptEpoch=Number(q.get('galleryAttemptEpoch'));
    return Boolean(/^[0-9a-f]{32}$/i.test(token)&&versionId===VERSION_ID&&Number.isSafeInteger(attemptEpoch)&&attemptEpoch>0&&
      windowRef&&windowRef.parent!==windowRef&&windowRef.location?.origin&&windowRef.location.origin!=='null'&&
      typeof startup?.advance==='function'&&typeof startup?.isActive==='function');
  }
  function createStartupBridge({params,startup,windowRef=globalThis.window,documentRef=globalThis.document,canvas,verify=false,isEvidenceCurrent=()=>true}={}){
    const q=params||new URLSearchParams(windowRef?.location?.search||'');
    const token=String(q.get('galleryStartupToken')||''),versionId=String(q.get('galleryVersionId')||''),attemptEpoch=Number(q.get('galleryAttemptEpoch'));
    const enabled=validStartup({params:q,startup,windowRef});let pending=null,completed=false;
    function current(){
      if(!enabled||!startup.isActive())return false;
      const latest=new URLSearchParams(windowRef.location.search);
      if(latest.get('galleryStartupToken')!==token||latest.get('galleryVersionId')!==VERSION_ID||Number(latest.get('galleryAttemptEpoch'))!==attemptEpoch)return false;
      const s=startup.snapshot?.();return !s||(s.token===token&&s.versionId===VERSION_ID&&Number(s.attemptEpoch)===attemptEpoch);
    }
    function report(stage,status,detail={}){if(!current())return false;startup.advance(stage,status,detail);return true;}
    function view(){const r=canvas?.getBoundingClientRect?.();return {canvasConnected:canvas?.isConnected===true,visible:documentRef?.visibilityState!=='hidden',width:Number(r?.width),height:Number(r?.height),backingWidth:Number(canvas?.width),backingHeight:Number(canvas?.height)};}
    function validVisible(e){const v=view();return e?.sourceOn===true&&e?.drawn===1&&e?.commands>0&&e?.submitted===true&&v.canvasConnected&&v.visible&&v.width>0&&v.height>0&&v.backingWidth>0&&v.backingHeight>0&&isEvidenceCurrent(e)===true;}
    function markSubmitted(e){if(completed||!current()||!Number.isSafeInteger(e?.frameId)||e.frameId<1||!Number.isSafeInteger(e?.passes)||e.passes<1||!validVisible(e))return false;pending={frameId:e.frameId,commands:e.commands,passes:e.passes,causeId:e.causeId};report('pipelines','ready');report('first-frame','pending');return true;}
    function complete(e){if(!pending||!current()||e?.queueCompleted!==true||e.frameId!==pending.frameId||e.commands!==pending.commands||e.passes!==pending.passes||e.causeId!==pending.causeId||!validVisible(e))return false;const v=view();const proof=Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,passes:e.passes,viewportWidth:v.width,viewportHeight:v.height,backingWidth:v.backingWidth,backingHeight:v.backingHeight,frameId:e.frameId,submittedCommands:e.commands,eventId:e.causeId,effectAgeMs:e.effectAgeMs});pending=null;completed=true;return report('first-frame','ready',{firstFrame:proof})&&report('playing','ready',{firstFrame:proof});}
    return Object.freeze({enabled,current,report,markSubmitted,complete,fail:(error,code,status='error')=>current()&&startup.fail(error,code,status),getSnapshot:()=>startup?.snapshot?.()||null,verify});
  }
  function createSfxBridge({verify=false,unlockAudio=async()=>false,getAudioSnapshot=()=>({})}={}){
    async function activateFromGesture(item){
      if(item?.id!==VERSION_ID)return {state:'unsupported',reason:'version identity mismatch'};
      if(verify)return {state:'silent',reason:'verify mode hard-mutes all audio'};
      try{await unlockAudio();}catch(error){return {state:'unavailable',reason:String(error?.message||error)};}
      const audio=getAudioSnapshot()||{};
      if(audio.verify===true)return {state:'silent',reason:'verify mode hard-mutes all audio'};
      if(audio.supported===false)return {state:'unsupported',reason:'Web Audio unsupported'};
      if(audio.contextState!=='running')return {state:'unavailable',reason:`AudioContext is ${audio.contextState||'not running'}`};
      if(audio.muted===true||!(Number(audio.masterGain)>0))return {state:'silent',reason:'audio remains muted'};
      return {state:'active',reason:'existing Hover Sprint SFX unlocked by gesture'};
    }
    return Object.freeze({activateFromGesture,getSnapshot:()=>Object.freeze({...getAudioSnapshot(),verify:Boolean(verify)})});
  }
  const api=Object.freeze({VERSION_ID,ROOM_ID,ROOM_GENERATION,LOCAL_START_MS,SERVER_START_MS,LIVE_MS,LOOP_MS,normalizedHeading,backingSize,buildSample,recordFrame,canAdmitOnset,validStartup,createStartupBridge,createSfxBridge});
  root.DvaHoverSprintGalleryContract=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
