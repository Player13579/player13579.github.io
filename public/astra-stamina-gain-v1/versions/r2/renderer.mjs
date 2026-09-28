export async function createRenderer(canvas){
 if(!navigator.gpu)throw new Error('WebGPU unavailable');
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No GPU adapter');
 const device=await adapter.requestDevice(),context=canvas.getContext('webgpu');
 const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const code=await(await fetch(new URL('./effect.wgsl',import.meta.url))).text();
 const module=device.createShaderModule({code});const info=await module.getCompilationInfo();
 const compilation=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));
 if(compilation.some(m=>m.type==='error'))throw new Error(JSON.stringify(compilation));
 const groupLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:48}}]});
 const layout=device.createPipelineLayout({bindGroupLayouts:[groupLayout]});
 const pipeline=await device.createRenderPipelineAsync({layout,vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const background=await device.createRenderPipelineAsync({layout,vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fsBackground',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const slots=Array.from({length:24},()=>{const buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});return{buffer,group:device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]})};});
 let submissions=0,dead=false;device.lost.then(i=>{if(!dead)errors.push(`device-lost:${i.reason}`);});
 return {device,compilation,errors,get submissions(){return submissions;},adapterInfo:adapter.info,
  async render(panels){
   if(dead)throw new Error('Disposed');if(panels.length>slots.length)throw new Error('Panel capacity');
   const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:.035,g:.04,b:.05,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);
   panels.forEach((p,i)=>{const scale=p.bodyHeight/64;device.queue.writeBuffer(slots[i].buffer,0,new Float32Array([p.width,p.height,p.elapsedMs/1000,p.light?.42:.006,p.footX,p.footY,scale,0,0,p.reducedMotion?1:0,p.layers??15,0]));pass.setViewport(p.x,p.y,p.width,p.height,0,1);pass.setScissorRect(p.x,p.y,p.width,p.height);pass.setBindGroup(0,slots[i].group);pass.setPipeline(background);pass.draw(3);
    const x=Math.max(p.x,Math.floor(p.footX-54*scale)),y=Math.max(p.y,Math.floor(p.footY-72*scale));const right=Math.min(p.x+p.width,Math.ceil(p.footX+44*scale)),bottom=Math.min(p.y+p.height,Math.ceil(p.footY+32*scale));
    if(p.elapsedMs>=0&&p.elapsedMs<1380&&right>x&&bottom>y){pass.setPipeline(pipeline);pass.setScissorRect(x,y,right-x,bottom-y);pass.draw(3);}
   });
   pass.end();device.queue.submit([encoder.finish()]);submissions++;await device.queue.onSubmittedWorkDone();return errors.length===0;
  },dispose(){dead=true;for(const s of slots)s.buffer.destroy();device.destroy();}
 };
}
