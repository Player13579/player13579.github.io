export async function createRenderer(canvas) {
  if(!navigator.gpu) throw new Error('WebGPU is required');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice();const context=canvas.getContext('webgpu');
  const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const sources=await Promise.all(['mana.wgsl','post.wgsl'].map(async p=>{const r=await fetch(new URL(p,import.meta.url));if(!r.ok)throw new Error(p);return r.text();}));
  const modules=sources.map(code=>device.createShaderModule({code}));
  for(const module of modules){const info=await module.getCompilationInfo();for(const m of info.messages)if(m.type==='error')errors.push(m.message);}
  if(errors.length)throw new Error(errors.join('\n'));
  const world=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const post=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  let capacity=16,storage=device.createBuffer({size:16*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  const spriteResponse=await fetch(new URL('assets/player-walk-60.webp',import.meta.url));if(!spriteResponse.ok)throw new Error('character sprite unavailable');
  const bitmap=await createImageBitmap(await spriteResponse.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
  const spriteTexture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture:spriteTexture},[bitmap.width,bitmap.height]);bitmap.close();
  const spriteSampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
  const makeWorldGroup=()=>device.createBindGroup({layout:world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:{buffer:storage}},{binding:2,resource:spriteTexture.createView()},{binding:3,resource:spriteSampler}]});
  let worldGroup=makeWorldGroup();
  let targets=[],postGroup,lastSize='',frames=0;
  function render(active,{scale=1,guide=true,obs=true}={}) {
    const dpr=Math.min(devicePixelRatio||1,2),width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);
    if(!width||!height)return;
    if(active.length>capacity){
      capacity=2**Math.ceil(Math.log2(active.length));storage.destroy();
      storage=device.createBuffer({size:capacity*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});worldGroup=makeWorldGroup();lastSize='';
    }
    if(`${width}:${height}`!==lastSize){
      targets.forEach(t=>t.destroy());canvas.width=width;canvas.height=height;
      targets=[0,1].map(()=>device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
      postGroup=device.createBindGroup({layout:post.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:targets[0].createView()},{binding:2,resource:targets[1].createView()},{binding:3,resource:{buffer:storage}}]});lastSize=`${width}:${height}`;
    }
    device.queue.writeBuffer(uniform,0,new Float32Array([width,height,scale*dpr,active.length,+guide,+obs,0,0]));
    const data=new Float32Array(capacity*8);active.forEach((e,i)=>data.set([e.sourceWorld.x,e.sourceWorld.y,e.world.x,e.world.y,e.age,+e.reducedMotion,0,0],i*8));device.queue.writeBuffer(storage,0,data);
    const command=device.createCommandEncoder();
    const pass=command.beginRenderPass({colorAttachments:targets.map(t=>({view:t.createView(),clearValue:[0,0,0,0],loadOp:'clear',storeOp:'store'}))});pass.setPipeline(world);pass.setBindGroup(0,worldGroup);pass.draw(3);pass.end();
    const p=command.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]});p.setPipeline(post);p.setBindGroup(0,postGroup);p.draw(3);p.end();device.queue.submit([command.finish()]);frames++;
  }
  return {render,errors,get frames(){return frames;},device,async close(){await device.queue.onSubmittedWorkDone();targets.forEach(t=>t.destroy());uniform.destroy();storage.destroy();spriteTexture.destroy();device.destroy();}};
}
