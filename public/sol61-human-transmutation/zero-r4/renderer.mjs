import { VERSION, phase, validateFrame } from './plan.mjs';
export async function createRenderer(canvas, { gpu = navigator.gpu, fetcher = fetch } = {}) {
  if (!gpu) throw Error('WebGPU required');
  const adapter=await gpu.requestAdapter(); if(!adapter) throw Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice();
  const context=canvas.getContext('webgpu'); if(!context) { device.destroy(); throw Error('webgpu canvas required'); }
  const format=gpu.getPreferredCanvasFormat();
  const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const diagnostics=[];
  async function module(name) {
    const response=await fetcher(new URL(name,import.meta.url)); if(!response.ok) throw Error(`${name}: HTTP ${response.status}`);
    const code=await response.text(), mod=device.createShaderModule({code,label:name});
    const messages=Array.from((await mod.getCompilationInfo()).messages,x=>({type:x.type,line:x.lineNum,position:x.linePos,message:x.message}));
    diagnostics.push({name,messages}); if(messages.some(x=>x.type==='error')) throw Error(`${name}: shader errors`); return mod;
  }
  let world,observe;
  try {
    const worldModule=await module('world.wgsl'), observeModule=await module('observe.wgsl');
    world=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    observe=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:observeModule,entryPoint:'vs'},fragment:{module:observeModule,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  } catch(error) { uniform.destroy(); device.destroy(); throw error; }
  const worldBind=device.createBindGroup({layout:world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
  let targets=[], observeBind, size='',closed=false,lost=null,submitted=0,completed=0,lastReceipt=null,inFlight=null;
  device.lost.then(info=>{if(!closed) lost={reason:info.reason,message:info.message};});
  async function render(input) {
    validateFrame(input); if(closed) throw Error('renderer disposed'); if(lost) throw Error(`device lost: ${lost.message}`);
    if(inFlight) throw Error('render is serial; await prior frame');
    const captured={version:VERSION,causeId:input.causeId,generation:input.generation ?? 0,ageMs:input.ageMs,phase:phase(input.ageMs),
      width:input.width,height:input.height,bodyHeight:input.bodyHeight,centerX:input.centerX,centerY:input.centerY,submission:submitted+1};
    inFlight=(async()=>{
      const key=`${input.width}:${input.height}`;
      if(key!==size) {
        // All preceding render/queue writes have completed before resources are replaced.
        await device.queue.onSubmittedWorkDone(); for(const t of targets) t.destroy();
        canvas.width=input.width; canvas.height=input.height;
        context.configure({device,format,alphaMode:'opaque'});
        targets=[0,1].map(()=>device.createTexture({size:[input.width,input.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
        observeBind=device.createBindGroup({layout:observe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:targets[0].createView()},{binding:2,resource:targets[1].createView()}]}); size=key;
      }
      for(const filter of ['out-of-memory','internal','validation']) device.pushErrorScope(filter);
      let scopes=[];
      try {
        device.queue.writeBuffer(uniform,0,new Float32Array([input.width,input.height,input.bodyHeight,1,
          input.centerX,input.centerY,input.background==='light'?1:0,input.reducedMotion?1:0,
          input.ageMs/1000,0,0,0,input.main===false?0:1,input.sparkles===false?0:1,input.observer===false?0:1,input.source===false?0:1]));
        const encoder=device.createCommandEncoder();
        const pass=encoder.beginRenderPass({colorAttachments:targets.map(t=>({view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}))});
        pass.setPipeline(world); pass.setBindGroup(0,worldBind); pass.draw(3); pass.end();
        const final=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
        final.setPipeline(observe); final.setBindGroup(0,observeBind); final.draw(3); final.end();
        device.queue.submit([encoder.finish()]); submitted++;
        await device.queue.onSubmittedWorkDone(); completed++;
      } finally { for(let i=0;i<3;i++) scopes.push(await device.popErrorScope()); }
      if(scopes.some(Boolean)) throw Error(scopes.filter(Boolean).map(x=>x.message).join('\n'));
      // Immutable receipt uses submission-time state, never post-await mutable preview settings.
      lastReceipt=Object.freeze({...captured,completed:true,errorScopes:scopes.map(x=>x?.message ?? null)});
      return lastReceipt;
    })();
    try{return await inFlight;}finally{inFlight=null;}
  }
  function snapshot(){return {version:VERSION,closed,lost,submitted,completed,lastReceipt,diagnostics};}
  async function dispose(){if(closed)return;closed=true;try{await inFlight;}catch{} try{await device.queue.onSubmittedWorkDone();}catch{await device.lost;} for(const t of targets)t.destroy();uniform.destroy();context.unconfigure();device.destroy();}
  return {render,snapshot,dispose};
}
