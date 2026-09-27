import * as effect from './sunbeam-pro-file-v1.mjs';
const status=document.querySelector('#status'),canvas=document.querySelector('#preview');
const query=new URLSearchParams(location.search);
window.__previewProof={verify:query.has('verify'),audioMuted:true,canvas2dAcquisitions:0,canvasWebgpuAcquisitions:0,frames:0};
const nativeGetContext=canvas.getContext.bind(canvas);canvas.getContext=function(kind,...args){if(kind==='2d')window.__previewProof.canvas2dAcquisitions++;if(kind==='webgpu')window.__previewProof.canvasWebgpuAcquisitions++;return nativeGetContext(kind,...args);};
document.documentElement.dataset.embed=query.has('embed')?'1':'0';
if(!navigator.gpu)throw new Error('WebGPU unavailable');
const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
const device=await adapter.requestDevice(),format=navigator.gpu.getPreferredCanvasFormat();
const context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas unavailable');
context.configure({device,format,alphaMode:'opaque'});
const driver=await effect.create({device,format});
let frameId=0,started=performance.now(),running=true,busy=false;
async function tick(now){if(!running)return;if(busy){requestAnimationFrame(tick);return;}busy=true;
 try{const texture=context.getCurrentTexture(),encoder=device.createCommandEncoder({label:'Sunbeam Pro file preview'});
  const view=texture.createView(),pass=encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',clearValue:{r:.008,g:.014,b:.024,a:1},storeOp:'store'}]});pass.end();
  const age=Math.max(0,now-started)%1200,input=effect.testInput(age,true);input.eventId='sunbeam-pro-file-v1';
  const plan=effect.plan(input),frame={id:++frameId,encoder,colorView:view,width:980,height:620,sampledAtMs:performance.now()};
  device.pushErrorScope('out-of-memory');device.pushErrorScope('internal');device.pushErrorScope('validation');
  const receipt=driver.record(frame,[plan]),commands=encoder.finish();device.queue.submit([commands]);
  const errors=Promise.all([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]).then(values=>values.find(Boolean)||null);
  await driver.driver.submitted(receipt,{frameId:frame.id,encoder,validation:errors,done:device.queue.onSubmittedWorkDone()});window.__previewProof.frames++;
  if(status.textContent!=='Playing silently on WebGPU')status.textContent='Playing silently on WebGPU';
 }catch(error){running=false;status.textContent='Preview failed: '+String(error?.message||error);console.error(error);}
 finally{busy=false;if(running)requestAnimationFrame(tick);}}
window.addEventListener('pagehide',()=>{running=false;context.unconfigure();void driver.destroy();device.destroy();},{once:true});
requestAnimationFrame(tick);


