import {contactGeometry} from './geometry.mjs';
export async function createContactRenderer(canvas) {
  const adapter=await navigator.gpu?.requestAdapter(); if(!adapter) throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice(); const context=canvas.getContext('webgpu');
  let deviceLoss=null; device.lost.then(info=>{deviceLoss=info;});
  try {
  const format=navigator.gpu.getPreferredCanvasFormat(); context.configure({device,format,alphaMode:'opaque'});
  const response=await fetch(new URL('./taser.wgsl',import.meta.url)); if(!response.ok) throw Error(`Shader HTTP ${response.status}`);
  const code=await response.text();
  const module=device.createShaderModule({code}); const info=await module.getCompilationInfo();
  const errors=info.messages.filter(x=>x.type==='error'); if(errors.length) {device.destroy();throw Error(errors.map(x=>x.message).join('\n'));}
  const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const channels=device.createBuffer({size:128*32,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
  const paramsLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
  const emissionLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]});
  const params=device.createBindGroup({layout:paramsLayout,entries:[{binding:0,resource:{buffer:uniform}}]});
  const sourcePipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout]}),vertex:{module,entryPoint:'channelVertex',buffers:[{arrayStride:32,stepMode:'instance',attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32'},{shaderLocation:3,offset:20,format:'float32'}]}]},fragment:{module,entryPoint:'channelFragment',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]}});
  const observerPipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[paramsLayout,emissionLayout]}),vertex:{module,entryPoint:'fullVertex'},fragment:{module,entryPoint:'observerFragment',targets:[{format}]}});
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  let texture, binding, size='', disposed=false, inFlight=false, serial=0, completion=null, disposal=null, drawSettlement=null, settleDraw=null;
  return {
    device,
    async draw({ageMs,seed=1,actorHeight=64,observer=true,source=true,reducedMotion=false,center=[canvas.width/2,canvas.height/2]}) {
      if(disposed||inFlight||canvas.width<1||canvas.height<1) return null;
      if(deviceLoss) throw Error(`WebGPU device lost: ${deviceLoss.reason}`);
      if(Math.max(canvas.width,canvas.height)>device.limits.maxTextureDimension2D) throw Error('Viewport exceeds WebGPU texture dimension limit');
      if(!center.every(Number.isFinite)) throw Error('Non-finite contact center');
      inFlight=true; drawSettlement=new Promise(resolve=>{settleDraw=resolve;}); const frame=++serial; let scopes=false;
      try {
        device.pushErrorScope('validation');device.pushErrorScope('out-of-memory');device.pushErrorScope('internal');scopes=true;
        const newSize=`${canvas.width}:${canvas.height}`;
        if(newSize!==size) {
          const replacement=device.createTexture({size:[canvas.width,canvas.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
          let nextBinding;
          try {nextBinding=device.createBindGroup({layout:emissionLayout,entries:[{binding:0,resource:replacement.createView()},{binding:1,resource:sampler}]});}
          catch(error) {replacement.destroy();throw error;}
          texture?.destroy();texture=replacement;binding=nextBinding;size=newSize;
        }
        const rows=contactGeometry({ageMs,seed,actorHeight,reducedMotion});
        device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,...center,observer?1:0,source?1:0,0,0]));
        if(rows.length) device.queue.writeBuffer(channels,0,rows);
        const encoder=device.createCommandEncoder();
        const sourcePass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}]});
        sourcePass.setPipeline(sourcePipeline);sourcePass.setBindGroup(0,params);sourcePass.setVertexBuffer(0,channels);sourcePass.draw(6,rows.length/8);sourcePass.end();
        const displayPass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]});
        displayPass.setPipeline(observerPipeline);displayPass.setBindGroup(0,params);displayPass.setBindGroup(1,binding);displayPass.draw(3);displayPass.end();
        device.queue.submit([encoder.finish()]); completion=device.queue.onSubmittedWorkDone(); await completion;
        const scopeReads=[device.popErrorScope(),device.popErrorScope(),device.popErrorScope()];scopes=false;
        const errors=await Promise.all(scopeReads);
        if(errors.some(Boolean)) throw Error(errors.filter(Boolean).map(e=>e.message).join('\n'));
        if(deviceLoss) throw Error(`WebGPU device lost: ${deviceLoss.reason}`);
        return disposed?null:{frame,ageMs,completed:true,errorScopesSettled:true,segments:rows.length/8};
      } finally {if(scopes) await Promise.allSettled([device.popErrorScope(),device.popErrorScope(),device.popErrorScope()]);completion=null;inFlight=false;settleDraw?.();settleDraw=null;drawSettlement=null;}
    },
    dispose(){
      if(disposal) return disposal;
      disposed=true;
      disposal=(async()=>{if(drawSettlement) await drawSettlement;texture?.destroy();uniform.destroy();channels.destroy();context.unconfigure();device.destroy();})();
      return disposal;
    }
  };
  } catch(error) {context?.unconfigure();device.destroy();throw error;}
}
