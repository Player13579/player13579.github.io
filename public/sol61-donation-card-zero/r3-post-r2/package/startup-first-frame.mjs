// Readiness is earned only by an actual accepted active record, submitted and completed.
export async function confirmDonationFirstFrame({renderer,frame,receipt,startup,isActive=()=>true}) {
  if(!renderer||!frame||!receipt||!renderer.frames.includes(frame)||frame.clear===true||
     frame.causeId!==receipt.id||frame.passes!==2||!Number.isSafeInteger(frame.submit)||
     frame.submit<1||renderer.submitCount<frame.submit)
    throw Object.assign(new Error('No complete two-pass active frame was recorded and submitted'),{code:'FIRST_FRAME_RECORD_INCOMPLETE'});
  await renderer.device.queue.onSubmittedWorkDone();
  if(!isActive()||!(startup?.isActive?.() ?? true)||renderer.disposed) return false;
  const fault=renderer.diagnostics.find(d=>d.module==='device-lost'||d.module==='device'||d.module==='pipeline-validation'||d.status==='failed');
  if(fault)throw Object.assign(new Error(fault.message||fault.reason||`WebGPU startup diagnostic: ${fault.module}`),
    {code:fault.module==='device-lost'?'WEBGPU_DEVICE_LOST':fault.module==='device'?'WEBGPU_UNCAPTURED_ERROR':'WEBGPU_VALIDATION_ERROR'});
  if(!renderer.ready)throw Object.assign(new Error('Renderer initialization did not remain ready through first-frame completion'),{code:'WEBGPU_RENDERER_NOT_READY'});
  if(!renderer.frames.includes(frame))throw Object.assign(new Error('Submitted first frame was no longer retained at completion'),{code:'FIRST_FRAME_RECORD_RETIRED'});
  const rect=renderer.canvas.getBoundingClientRect();
  const viewportWidth=Number(rect.width),viewportHeight=Number(rect.height);
  if(!renderer.canvas.isConnected||!(viewportWidth>0)||!(viewportHeight>0)||
     !(renderer.canvas.width>0)||!(renderer.canvas.height>0))
    throw Object.assign(new Error('Canvas is not connected with positive viewport and backing dimensions'),{code:'FIRST_FRAME_CANVAS_NOT_PRESENTABLE'});
  startup.advance('playing','ready',{firstFrame:{recorded:true,submitted:true,completed:true,canvasConnected:true,
    viewportWidth,viewportHeight,backingWidth:renderer.canvas.width,backingHeight:renderer.canvas.height,
    passes:2,submit:frame.submit,frameToken:frame.frameToken}});
  return true;
}
