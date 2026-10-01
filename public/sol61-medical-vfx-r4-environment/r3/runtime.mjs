import {WGSL,SIZE,PERIOD} from './source/effect.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify');
const canvas=document.querySelector('#scene');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={enabled:query.get('effect')!=='off',source:query.get('source')==='off'?0:1,world:query.get('world')==='off'?0:1,obs:query.get('obs')==='off'?0:1,fixedTime:query.has('t')?Number(query.get('t')):null};
const evidence={status:'initializing',verify,audioGain:0,sfx:'none_map_user_exception_20261001',format:null,frames:0,errors:[],originalSize:SIZE,fit:null,period:PERIOD,version:'r4-environment-r3',reducedMotion};
window.__medicalR3={state,evidence,setTime(t){state.fixedTime=t;},setEffect(on){state.enabled=!!on;},setLayer(name,value){if(['source','world','obs'].includes(name))state[name]=Math.max(0,Math.min(1,Number(value)));},resume(){state.fixedTime=null;},stop(){cancelAnimationFrame(raf);device?.destroy();}};
let device,raf,start;
async function init(){
 if(!navigator.gpu)throw new Error('WebGPU is required.');
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter.');device=await adapter.requestDevice();
 device.addEventListener('uncapturederror',e=>{evidence.errors.push(e.error.message);fail(e.error);});device.lost.then(info=>{if(info.reason!=='destroyed')fail(new Error(info.message));});
 const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();evidence.format=format;
 context.configure({device,format,alphaMode:'opaque',colorSpace:'srgb'});
 const response=await fetch('./medical-room-vfx-r4.png');if(!response.ok)throw new Error('Original fetch '+response.status);
 const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
 if(bitmap.width!==SIZE[0]||bitmap.height!==SIZE[1])throw new Error('Original dimensions changed.');
 const texture=device.createTexture({size:SIZE,format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
 device.queue.copyExternalImageToTexture({source:bitmap},{texture},SIZE);bitmap.close();
 device.pushErrorScope('validation');const module=device.createShaderModule({code:WGSL});const compilation=await module.getCompilationInfo();
 const compileErrors=compilation.messages.filter(x=>x.type==='error');evidence.shaderMessages=compilation.messages.map(x=>({type:x.type,message:x.message,line:x.lineNum}));
 if(compileErrors.length)throw new Error(compileErrors.map(x=>x.message).join('\n'));
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertexMain'},fragment:{module,entryPoint:'fragmentMain',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const error=await device.popErrorScope();if(error)throw new Error(error.message);
 const uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const sampler=device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler},{binding:2,resource:{buffer:uniform}}]});
 const values=new Float32Array(12);start=performance.now();evidence.status='ready';
 function frame(now){
  const w=Math.max(1,Math.round(canvas.clientWidth*devicePixelRatio)),h=Math.max(1,Math.round(canvas.clientHeight*devicePixelRatio));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const scale=Math.min(w/SIZE[0],h/SIZE[1]),fw=SIZE[0]*scale,fh=SIZE[1]*scale;
  const t=Number.isFinite(state.fixedTime)?state.fixedTime:(reducedMotion?6:Math.max(0,(now-start)/1000));
  values.set([w,h,t,state.enabled?1:0,(w-fw)/2,(h-fh)/2,fw,fh,state.source,state.world,state.obs,0]);evidence.fit=[values[4],values[5],fw,fh];
  device.queue.writeBuffer(uniform,0,values);const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:1,g:1,b:1,a:1},loadOp:'clear',storeOp:'store'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);evidence.frames++;evidence.sceneTime=t;evidence.effect=state.enabled;
  raf=requestAnimationFrame(frame);
 }raf=requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);device.destroy();},{once:true});
}
function fail(e){evidence.status='failed';evidence.errors.push(String(e.message||e));cancelAnimationFrame(raf);const error=document.querySelector('#error');error.style.display='block';error.textContent='WebGPU再生エラー: '+(e.message||e);}
init().catch(fail);
