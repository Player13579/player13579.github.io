import { VERSION, DURATION, SOURCE, RECEIVER } from './contract.mjs';
export async function createRenderer(canvas) {
  if(!navigator.gpu) throw new Error('WebGPU required');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter) throw new Error('No WebGPU adapter');
  const device=await adapter.requestDevice(), context=canvas.getContext('webgpu');
  const errors=[]; device.addEventListener('uncapturederror',e=>errors.push(String(e.error.message)));
  const code=await (await fetch(new URL('./mana.wgsl',import.meta.url))).text();
  const module=device.createShaderModule({label:VERSION,code});
  const info=await module.getCompilationInfo();
  const messages=[...info.messages].map(m=>({type:m.type,message:m.message,line:m.lineNum}));
  const fatal=messages.filter(m=>m.type==='error');if(fatal.length){device.destroy();throw new Error(JSON.stringify(fatal));}
  const format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'opaque'});
  device.pushErrorScope('validation');
  const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  const bitmap=await createImageBitmap(await (await fetch(new URL('./actor-fixture.png',import.meta.url))).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
  const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture,premultipliedAlpha:false},[bitmap.width,bitmap.height]);bitmap.close();
  const buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});
  const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler}]});
  const pipelineError=await device.popErrorScope();if(pipelineError){device.destroy();throw pipelineError;}
  const state={version:VERSION,frames:0,errors,messages,adapterInfo:adapter.info?{vendor:adapter.info.vendor,device:adapter.info.device,description:adapter.info.description,architecture:adapter.info.architecture}:null,disposed:false};
  device.lost.then(info=>{if(!state.disposed)errors.push(`device lost: ${info.reason} ${info.message}`);});
  const uniforms=new Float32Array(12);
  return {
    state,
    draw(t,{stars=true,glow=true,reduced=false,source=SOURCE,receiver=RECEIVER}={}) {
      if(state.disposed) throw new Error('Renderer disposed');
      if(!Number.isFinite(t)||![...source,...receiver].every(Number.isFinite)) throw new TypeError('Finite time and anchors required');
      uniforms.set([t,Number(stars),Number(glow),Number(reduced),canvas.width,canvas.height,Number(new URLSearchParams(location.search).has('single')),0,...source,...receiver]);
      device.queue.writeBuffer(buffer,0,uniforms);
      const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);state.frames++;
      state.lastTime=t;state.active=t>=0&&t<DURATION;
    },
    async settled(){await device.queue.onSubmittedWorkDone();},
    dispose(){if(state.disposed)return;state.disposed=true;context.unconfigure();buffer.destroy();texture.destroy();device.destroy();}
  };
}
