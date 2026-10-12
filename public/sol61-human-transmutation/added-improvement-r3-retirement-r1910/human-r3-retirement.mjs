export async function drainHumanR3Device({device,deviceLostPromise,closeSubmissions,awaitRenderTail,readTerminalReceipt,disposeRenderer,disposeAudio,destroyDevice}){
  const errors=[];
  try{closeSubmissions();}catch(error){errors.push(`closeSubmissions:${String(error?.message||error)}`);}
  try{await awaitRenderTail();}catch(error){errors.push(`renderTail:${String(error?.message||error)}`);}
  let terminalReceipt=null;
  try{
    const projected=readTerminalReceipt();
    if(projected&&typeof projected==='object'&&projected.queueCompleted===true&&Number.isSafeInteger(projected.submitted)&&projected.submitted>0&&projected.completed===projected.submitted)terminalReceipt=projected;
    else errors.push('terminalReceipt:missing-or-incomplete');
  }catch(error){errors.push(`terminalProjection:${String(error?.message||error)}`);}
  let queueFenceStatus='not-attempted';
  try{if(!device?.queue||typeof device.queue.onSubmittedWorkDone!=='function')throw new Error('actual device queue fence unavailable');await device.queue.onSubmittedWorkDone();queueFenceStatus='fulfilled';}
  catch(error){queueFenceStatus='rejected';errors.push(`queueFence:${String(error?.message||error)}`);}
  try{await disposeRenderer();}catch(error){errors.push(`rendererDispose:${String(error?.message||error)}`);}
  try{await disposeAudio();}catch(error){errors.push(`audioDispose:${String(error?.message||error)}`);}
  let destroyCalls=0;
  try{if(typeof destroyDevice!=='function')throw new Error('captured device destroy operation unavailable');destroyCalls++;destroyDevice();}catch(error){errors.push(`deviceDestroy:${String(error?.message||error)}`);}
  let lostReason=null,lostSettled=false;
  try{const info=await deviceLostPromise;lostReason=info?.reason??null;lostSettled=!!info;}catch(error){errors.push(`deviceLost:${String(error?.message||error)}`);}
  const success=!!terminalReceipt&&queueFenceStatus==='fulfilled'&&destroyCalls===1&&lostSettled&&lostReason==='destroyed'&&errors.length===0;
  const deviceProof={status:success?'destroyed-loss-settled':'failed',drained:queueFenceStatus==='fulfilled',queueFenceCount:queueFenceStatus==='fulfilled'?1:0,queueFenceStatus,
    destroyCalled:destroyCalls===1,destroyCalls,lostSettled,lostReason,sameDevice:!!device,sameQueue:!!device?.queue,cleanupErrors:errors};
  return{status:deviceProof.status,terminalReceipt,device:deviceProof,cleanupErrors:errors};
}