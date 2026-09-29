export const version='sol61-cooldown-zero-r4';
export const durationMs=1500;
export const semantics=Object.freeze({eventKind:'gain-cooldownReduction',recipient:'playerId',numericTimerAssertion:false,ownerClock:'finite receipt elapsed wall time',bodyAnchor:'receiving forearm',sparkleAngleDeg:22});
const clamp=x=>Math.max(0,Math.min(1,x));const smooth=(a,b,x)=>{const n=clamp((x-a)/(b-a));return n*n*(3-2*n)};
export function phasePath(elapsedMs,reduced=false){const t=Math.max(0,elapsedMs)/1000,compression=smooth(.28,.92,t),length=(reduced?30:36)+(22.5-(reduced?30:36))*compression;const out=new Float32Array(65*4);for(let i=0;i<=64;i++){const f=i/64,theta=f*Math.PI*6,radius=6.2;out.set([f*length,radius*Math.sin(theta),radius*Math.cos(theta),2.9],i*4)}return out;}
export function acceptReceipt(e){return !!e&&e.kind===semantics.eventKind&&typeof e.id==='string'&&e.id.length>0&&typeof e.playerId==='string'&&Number.isFinite(e.elapsedMs)&&e.elapsedMs>=0&&e.elapsedMs<durationMs;}
export async function createRenderer(canvas,diagnostic={}){
 if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');
 const device=await adapter.requestDevice();diagnostic.gpuErrors=[];device.addEventListener('uncapturederror',e=>diagnostic.gpuErrors.push(String(e.error)));device.lost.then(info=>{if(info.reason!=='destroyed')diagnostic.gpuErrors.push(info.message)});
 const code=await fetch(new URL('./effect.wgsl?revision=sol61-cooldown-zero-r4',import.meta.url)).then(r=>{if(!r.ok)throw Error('Shader HTTP '+r.status);return r.text()});
 const shader=device.createShaderModule({label:version,code});const info=await shader.getCompilationInfo();diagnostic.compilation=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));if(info.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(diagnostic.compilation));
 const format=navigator.gpu.getPreferredCanvasFormat();const context=canvas.getContext('webgpu');context.configure({device,format,alphaMode:'opaque'});
 device.pushErrorScope('validation');const pipeline=device.createRenderPipeline({label:version,layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});const pipelineError=await device.popErrorScope();if(pipelineError)throw pipelineError;
 const bitmap=await createImageBitmap(await fetch(new URL('./assets/sophia-front-five-v753.png',import.meta.url)).then(r=>r.blob()),{premultiplyAlpha:'none'});const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);bitmap.close();
 const buffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const pathBuffer=device.createBuffer({size:1040,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:pathBuffer}}]});let destroyed=false;
 function render(elapsedMs,options={}){if(destroyed)return;const vals=new Float32Array([canvas.width,canvas.height,Math.max(0,elapsedMs)/1000,options.stars===false?0:1,options.obs===false?0:1,options.actor===false?0:1,options.background==='light'?1:0,options.reducedMotion?1:0]);device.queue.writeBuffer(buffer,0,vals);device.queue.writeBuffer(pathBuffer,0,phasePath(elapsedMs,options.reducedMotion));const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);diagnostic.submits=(diagnostic.submits||0)+1;}
 return {render,done:()=>device.queue.onSubmittedWorkDone(),destroy(){destroyed=true;texture.destroy();buffer.destroy();pathBuffer.destroy();context.unconfigure();device.destroy()},device};
}




