import {contactGeometry,sourceState,CREATIVE_EDITION} from './geometry.mjs';
import {awaitQueueReceipt} from './terminal-link.mjs';
import {disposeWebGpuResources} from './retirement-adapter.mjs';
export {awaitQueueReceipt};
export async function createContactRenderer(canvas) {
  const rendererGenerationId=crypto.randomUUID(), deviceGenerationId=crypto.randomUUID();
  const adapter=await navigator.gpu?.requestAdapter(); if(!adapter) throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice(); const context=canvas.getContext('webgpu');
  let deviceLoss=null; const deviceLost=device.lost.then(info=>{deviceLoss=info; return info;});
  try {
  const format=navigator.gpu.getPreferredCanvasFormat(); context.configure({device,format,alphaMode:'opaque'});
  const response=await fetch(new URL('./taser.wgsl',import.meta.url)); if(!response.ok) throw Error(`Shader HTTP ${response.status}`);
  const code=await response.text();
  const module=device.createShaderModule({code}); const info=await module.getCompilationInfo();
  const errors=info.messages.filter(x=>x.type==='error'); if(errors.length) {device.destroy();throw Error(errors.map(x=>x.message).join('\n'));}
  const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const channels=device.createBuffer({size:128*32,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
  const paramsLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const sampledLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]});
  const params=device.createBindGroup({layout:paramsLayout,entries:[{binding:0,resource:{buffer:uniform}}]});
  const sourcePipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout]}),vertex:{module,entryPoint:'channelVertex',buffers:[{arrayStride:32,stepMode:'instance',attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32'},{shaderLocation:3,offset:20,format:'float32'},{shaderLocation:4,offset:24,format:'float32'}]}]},fragment:{module,entryPoint:'channelFragment',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]}});
  const blurXPipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout,sampledLayout]}),vertex:{module,entryPoint:'fullVertex'},fragment:{module,entryPoint:'blurHorizontalFragment',targets:[{format:'rgba16float'}]}});
  const blurYPipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout,sampledLayout]}),vertex:{module,entryPoint:'fullVertex'},fragment:{module,entryPoint:'blurVerticalFragment',targets:[{format:'rgba16float'}]}});
  const observerPipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout,sampledLayout,sampledLayout]}),vertex:{module,entryPoint:'fullVertex'},fragment:{module,entryPoint:'observerFragment',targets:[{format}]}});
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  let sourceTexture, horizontalTexture, verticalTexture, sourceBinding, horizontalBinding, verticalBinding, size='', disposed=false, inFlight=false, serial=0, submissionSerial=0, completion=null, disposal=null, drawSettlement=null, settleDraw=null;
  const makeTexture=()=>device.createTexture({size:[canvas.width,canvas.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const makeBinding=texture=>device.createBindGroup({layout:sampledLayout,entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler}]});
  return {
    device,
    rendererGenerationId, deviceGenerationId,
    nextSubmissionId(){return `${rendererGenerationId}:${++submissionSerial}`;},
    async draw({ageMs,seed=1,actorHeight=64,observer=true,source=true,near=true,receiverMaterial=0,reducedMotion=false,center=[canvas.width/2,canvas.height/2],submissionId=null}) {
      if(disposed||inFlight||canvas.width<1||canvas.height<1) return null;
      if(deviceLoss) throw Error(`WebGPU device lost: ${deviceLoss.reason}`);
      if(Math.max(canvas.width,canvas.height)>device.limits.maxTextureDimension2D) throw Error('Viewport exceeds WebGPU texture dimension limit');
      if(!Number.isFinite(actorHeight)||actorHeight<=0) throw Error('Invalid registered actor height');
      if(!center.every(Number.isFinite)) throw Error('Non-finite contact center');
      inFlight=true; drawSettlement=new Promise(resolve=>{settleDraw=resolve;}); const frame=++serial; submissionId??=`${rendererGenerationId}:${++submissionSerial}`; let scopes=false;
      try {
        device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');device.pushErrorScope('internal');scopes=true;
        const newSize=`${canvas.width}:${canvas.height}`;
        if(newSize!==size) {
          let nextSource,nextHorizontal,nextVertical;
          try {
            nextSource=makeTexture();nextHorizontal=makeTexture();nextVertical=makeTexture();
            const nextSourceBinding=makeBinding(nextSource), nextHorizontalBinding=makeBinding(nextHorizontal), nextVerticalBinding=makeBinding(nextVertical);
            sourceTexture?.destroy();horizontalTexture?.destroy();verticalTexture?.destroy();
            sourceTexture=nextSource;horizontalTexture=nextHorizontal;verticalTexture=nextVertical;
            sourceBinding=nextSourceBinding;horizontalBinding=nextHorizontalBinding;verticalBinding=nextVerticalBinding;size=newSize;
          } catch(error) {nextSource?.destroy();nextHorizontal?.destroy();nextVertical?.destroy();throw error;}
        }
        const rows=contactGeometry({ageMs,seed,actorHeight,reducedMotion,receiverMaterial});
        device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,...center,observer?1:0,source?1:0,actorHeight/64,ageMs,sourceState(ageMs).flux,receiverMaterial,sourceState(ageMs).pressure,near?1:0,CREATIVE_EDITION,0,0,0]));
        if(rows.length) device.queue.writeBuffer(channels,0,rows);
        const encoder=device.createCommandEncoder();
        const sourcePass=encoder.beginRenderPass({colorAttachments:[{view:sourceTexture.createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}]});
        sourcePass.setPipeline(sourcePipeline);sourcePass.setBindGroup(0,params);sourcePass.setVertexBuffer(0,channels);sourcePass.draw(6,rows.length/8);sourcePass.end();
        const horizontalPass=encoder.beginRenderPass({colorAttachments:[{view:horizontalTexture.createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}]});
        horizontalPass.setPipeline(blurXPipeline);horizontalPass.setBindGroup(0,params);horizontalPass.setBindGroup(1,sourceBinding);horizontalPass.draw(3);horizontalPass.end();
        const verticalPass=encoder.beginRenderPass({colorAttachments:[{view:verticalTexture.createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}]});
        verticalPass.setPipeline(blurYPipeline);verticalPass.setBindGroup(0,params);verticalPass.setBindGroup(1,horizontalBinding);verticalPass.draw(3);verticalPass.end();
        const displayPass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]});
        displayPass.setPipeline(observerPipeline);displayPass.setBindGroup(0,params);displayPass.setBindGroup(1,sourceBinding);displayPass.setBindGroup(2,verticalBinding);displayPass.draw(3);displayPass.end();
        completion=awaitQueueReceipt(device.queue,()=>device.queue.submit([encoder.finish()]),{rendererGenerationId,deviceGenerationId},submissionId,ageMs,rows.length/8);
        const queueReceipt=await completion;
        const scopeReads=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];scopes=false;
        const errors=await Promise.all(scopeReads);
        if(errors.some(Boolean)) throw Error(errors.filter(Boolean).map(e=>e.message).join('\n'));
        if(deviceLoss) throw Error(`WebGPU device lost: ${deviceLoss.reason}`);
        return disposed?null:{...queueReceipt,frame,ageMs,completed:true,errorScopesSettled:true,segments:rows.length/8,passes:4,receiverMaterial,sourceFlux:sourceState(ageMs).flux};
      } finally {if(scopes) await Promise.allSettled([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);completion=null;inFlight=false;settleDraw?.();settleDraw=null;drawSettlement=null;}
    },
    dispose(){
      if(disposal) return disposal;
      disposed=true;
      disposal=disposeWebGpuResources({drawSettlement,queue:device.queue,resources:[sourceTexture,horizontalTexture,verticalTexture,uniform,channels],context,device,deviceLost});
      return disposal;
    }
  };
  } catch(error) {context?.unconfigure();device.destroy();throw error;}
}

