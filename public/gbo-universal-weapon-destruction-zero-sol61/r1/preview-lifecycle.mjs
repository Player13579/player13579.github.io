export async function awaitUniversalCompletedReceipt(runtime,{retiring=()=>false,now=()=>performance.now(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=5000}={}) {
 const initial=runtime.snapshot(),expectedCause=initial.cause,expectedGeneration=initial.generation,deadline=now()+timeoutMs;
 if(!((typeof expectedCause==='string'&&expectedCause.length>0)||(Number.isSafeInteger(expectedCause)&&expectedCause>0))||!Number.isSafeInteger(expectedGeneration)||expectedGeneration<1)throw Error('No active cause');
 for(;;){
  const s=runtime.snapshot(),r=s.lastReceipt;
  if(retiring()||s.lifecycle?.teardown?.status==='disposed'||s.state==='failed'||s.errors?.length)throw Error('Ready prohibited by retirement or failure');
  if(s.cause!==expectedCause||s.generation!==expectedGeneration)throw Error('Ready cause/generation changed');
  if(s.ready===true&&r?.cause===expectedCause&&r.generation===expectedGeneration&&r.completed===true&&Number.isSafeInteger(r.sequence)&&r.sequence>0&&r.passes===2&&r.active===true&&r.source===true&&Number.isFinite(r.age)&&r.age>=0&&r.age<s.duration)return s;
  if(now()>=deadline)throw Error('Completed receipt timeout');
  await sleep(8);
 }
}
export function buildUniversalFirstFrame({runtime,canvas,style,versionId,sourceClosure,sourceClosureManifest}) {
 const s=runtime.snapshot(),r=s.lastReceipt,b=canvas.getBoundingClientRect();
 if(!r||r.completed!==true||r.passes!==2)throw Error('No completed two-pass frame');
 return {versionId,recorded:true,submitted:Number.isSafeInteger(r.sequence)&&r.sequence>0,completed:r.completed===true,passes:r.passes,canvasConnected:canvas.isConnected,visible:b.width>0&&b.height>0&&style.visibility!=='hidden'&&style.display!=='none',sourceId:versionId,causeId:String(r.cause),generation:r.generation,frameId:r.sequence,elapsedMs:r.age*1000,durationMs:s.duration*1000,phase:r.phase,viewportWidth:r.viewport?.backingWidth??canvas.width,viewportHeight:r.viewport?.backingHeight??canvas.height,receipt:r,audioProof:s.audio,sourceClosure,sourceClosureManifest};
}
export function buildUniversalRetirementLifecycle(s) {
 const l=s.lifecycle,d=l?.teardown,loss=d?.lost;
 if(l?.disposeSettled!==true||d?.status!=='disposed'||l?.deviceDrained!==true||l?.deviceDestroyed!==true||l?.deviceLostSettled!==true||loss?.reason!=='destroyed'||loss.expected!==true)throw Error('Retirement not accepted');
 const deviceLifecycle='destroyed-loss-settled';
 return {...d,disposeSettled:l.disposeSettled,teardown:'disposed',deviceDrained:l.deviceDrained,deviceDestroyed:l.deviceDestroyed,deviceLostSettled:l.deviceLostSettled,deviceLoss:loss,deviceLifecycle,device:{status:deviceLifecycle,drained:l.deviceDrained,destroyCalled:l.deviceDestroyed,lostReason:loss.reason}};
}
export function setRuntimeOptionsSafely(runtime,options,onError=()=>{}) {
 try { if(runtime.setOptions(options)===false)throw Error('Runtime rejected option update'); return true; }
 catch(error) { try { onError(error); } catch {} return false; }
}
export function refreshRuntimeAfterResize(changed,runtime,onError=()=>{}) {
 return changed?setRuntimeOptionsSafely(runtime,{},onError):false;
}
export function muteRuntimeWhenHidden(hidden,runtime,onError=()=>{}) {
 return hidden?setRuntimeOptionsSafely(runtime,{muted:true},onError):false;
}
export function runtimePlaybackLabel(snapshot,verify=false) {
 if(snapshot?.state==='active')return verify||snapshot.audio?.enabled?'再生中':'再生中・音声待ち';
 if(snapshot?.state==='finished')return '再生完了';
 if(snapshot?.state==='failed')return '再生エラー';
 return '再生待ち';
}
export function validateTransportManifest(data,{version,actualHash,queryPin,embedded}) {
 if(data?.schema!=='dva-gallery-transport-manifest/v1'||data.version!==version||!Array.isArray(data.files)||data.files.length!==3)throw Error('Transport manifest identity');
 if((embedded&&!queryPin)||(queryPin&&queryPin!==actualHash))throw Error('Transport manifest query pin mismatch');
 for(const [i,name] of ['preview.html','preview.mjs','preview-lifecycle.mjs'].entries()){const pin=data.files[i];if(pin?.path!==name||!/^[a-f0-9]{64}$/.test(pin.sha256)||!Number.isSafeInteger(pin.bytes)||pin.bytes<1)throw Error('Transport file pins');}
 return true;
}
