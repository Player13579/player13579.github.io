import {VERSION,DURATION,SOURCE,RECEIVER} from './contract.mjs';
export async function createRenderer(canvas,{single=false}={}){
 if(!navigator.gpu)throw Error('WebGPU required');
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No adapter');
 const timed=adapter.features.has('timestamp-query');
 const device=await adapter.requestDevice({requiredFeatures:timed?['timestamp-query']:[]});
 const errors=[],messages=[],state={version:VERSION,frames:0,errors,messages,gpuMs:[],cpuSubmitMs:[],timed,disposed:false,adapterInfo:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,description:adapter.info?.description}};
 device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 device.lost.then(info=>{if(!state.disposed)errors.push(`device lost: ${info.message}`);});
 const context=canvas.getContext('webgpu');
 try{
 const code=await(await fetch(new URL('./mana.wgsl',import.meta.url))).text(),module=device.createShaderModule({label:VERSION,code});
 const info=await module.getCompilationInfo();messages.push(...info.messages.map(x=>({type:x.type,line:x.lineNum,message:x.message})));if(messages.some(x=>x.type==='error'))throw Error(JSON.stringify(messages));
 const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const bgl=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
 const layout=device.createPipelineLayout({bindGroupLayouts:[bgl]});
 device.pushErrorScope('validation');
 const [background,scene]=await Promise.all([['vsBackground','fsBackground'],['vs','fs']].map(([vertex,fragment])=>device.createRenderPipelineAsync({layout,vertex:{module,entryPoint:vertex},fragment:{module,entryPoint:fragment,targets:[{format}]},primitive:{topology:'triangle-list'}})));
 const bitmap=await createImageBitmap(await(await fetch(new URL('./actor-fixture.png',import.meta.url))).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
 const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture,premultipliedAlpha:false},[bitmap.width,bitmap.height]);bitmap.close();
 const buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'}),bind=device.createBindGroup({layout:bgl,entries:[{binding:0,resource:{buffer}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler}]});
 const pipelineError=await device.popErrorScope();if(pipelineError)throw pipelineError;
 const query=timed?device.createQuerySet({type:'timestamp',count:2}):null;
 const resolve=timed?device.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}):null;
 const read=timed?device.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}):null;
 const uniforms=new Float32Array(12);let reading=false;
 return {state,
  draw(t,{stars=true,glow=true,reduced=false,source=SOURCE,receiver=RECEIVER}={}){
   if(state.disposed)throw Error('disposed');if(!Number.isFinite(t)||![...source,...receiver].every(Number.isFinite))throw TypeError('finite anchors/time required');
   const started=performance.now();uniforms.set([t,+stars,+glow,+reduced,canvas.width,canvas.height,+single,0,...source,...receiver]);device.queue.writeBuffer(buffer,0,uniforms);
   const measure=timed&&!reading&&state.frames%15===0;
   const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}],...(measure?{timestampWrites:{querySet:query,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{})});
   pass.setBindGroup(0,bind);pass.setPipeline(background);pass.draw(3);pass.setPipeline(scene);pass.draw(6,single?2:4);pass.end();
   if(measure){encoder.resolveQuerySet(query,0,2,resolve,0);encoder.copyBufferToBuffer(resolve,0,read,0,16);}
   device.queue.submit([encoder.finish()]);state.frames++;state.lastTime=t;state.active=t>=0&&t<DURATION;state.cpuSubmitMs.push(performance.now()-started);if(state.cpuSubmitMs.length>1200)state.cpuSubmitMs.shift();
   if(measure){reading=true;read.mapAsync(GPUMapMode.READ).then(()=>{const a=new BigUint64Array(read.getMappedRange());state.gpuMs.push(Number(a[1]-a[0])/1e6);read.unmap();}).catch(e=>{if(!state.disposed)errors.push('timestamp '+e.message);}).finally(()=>{reading=false;});}
  },async settled(){await device.queue.onSubmittedWorkDone();},
  dispose(){if(state.disposed)return;state.disposed=true;context.unconfigure();query?.destroy();resolve?.destroy();read?.destroy();buffer.destroy();texture.destroy();device.destroy();}
 };
 }catch(e){state.disposed=true;context?.unconfigure();device.destroy();throw e;}
}
