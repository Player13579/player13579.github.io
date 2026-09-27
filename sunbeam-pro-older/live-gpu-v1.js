import * as effect from './sunbeam-pro-live-gpu-v1.mjs';
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
const service=await effect.create({device,format,maxEvents:1});
let frameId=0,started=performance.now(),running=true,busy=false;
const viewport={widthCss:980,heightCss:620,dpr:1};
function makePlan(age){const twoPalms=false;return effect.plan({eventId:'sunbeam-pro-live-gpu-v1',actorNowMs:age,startActorMs:0,
  characterElapsedMs:Math.min(age,820),actorRate:1,rangeWorld:950,alive:true,visible:true,cancelled:false,twoPalms,
  reducedMotion:false,quality:'full',viewport,camera:{zoom:1.65,cssPxPerWorld:1},
  rays:[{palmCss:[110,310],endCss:[852.5,310],directionCss:[1,0]}]});}
async function tick(now){if(!running)return;if(busy){requestAnimationFrame(tick);return;}busy=true;
 try{const texture=context.getCurrentTexture(),encoder=device.createCommandEncoder({label:'Sunbeam Pro live preview'});
  const view=texture.createView(),pass=encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',clearValue:{r:.008,g:.014,b:.024,a:1},storeOp:'store'}]});pass.end();
  const age=Math.max(0,now-started)%1200,frame={id:++frameId,encoder,colorView:view,width:980,height:620};
  service.record(frame,[makePlan(age)]);await service.submit(frame);window.__previewProof.frames++;
  if(status.textContent!=='Playing silently on WebGPU')status.textContent='Playing silently on WebGPU';
 }catch(error){running=false;status.textContent='Preview failed: '+String(error?.message||error);console.error(error);}
 finally{busy=false;if(running)requestAnimationFrame(tick);}}
window.addEventListener('pagehide',()=>{running=false;context.unconfigure();void service.destroy();device.destroy();},{once:true});
requestAnimationFrame(tick);


