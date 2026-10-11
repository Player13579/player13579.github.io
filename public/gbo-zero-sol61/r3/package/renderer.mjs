import {pack,VERSION} from './model.mjs';
export async function createGboLayer({device,format,shaders}){
 if(!device?.queue||!format||!shaders?.common||!shaders?.world||!shaders?.observer)throw new TypeError('device/format/exact shader source required');
 const diagnostics=[];const scopes=[];let uniform,worldTexture,worldBind,presentBind,worldPipeline,presentPipeline,busy=false,disposed=false,width=0,height=0,submitted=0,completed=0;
 const modules=[];
 try{
  for(const [name,body] of [['world',shaders.world],['observer',shaders.observer]]){
   const module=device.createShaderModule({label:`${VERSION}:${name}`,code:shaders.common+'\n'+body});modules.push(module);
   const info=await module.getCompilationInfo();diagnostics.push({name,messages:info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos}))});
   if(info.messages.some(m=>m.type==='error'))throw new Error(`${name} WGSL compilation failed: ${JSON.stringify(diagnostics)}`);
  }
  device.pushErrorScope('validation');
  try{
   worldPipeline=await device.createRenderPipelineAsync({label:VERSION+' world',layout:'auto',vertex:{module:modules[0],entryPoint:'vertex'},fragment:{module:modules[0],entryPoint:'fragment',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
   presentPipeline=await device.createRenderPipelineAsync({label:VERSION+' observer',layout:'auto',vertex:{module:modules[1],entryPoint:'vertex'},fragment:{module:modules[1],entryPoint:'fragment',targets:[{format}]},primitive:{topology:'triangle-list'}});
  }finally{const error=await device.popErrorScope();scopes.push({stage:'pipeline',filter:'validation',error:error?.message??null});if(error)throw error;}
  uniform=device.createBuffer({label:VERSION+' uniform',size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 }catch(error){uniform?.destroy();worldTexture?.destroy();throw error;}
 function targets(w,h){
  if(w===width&&h===height&&worldTexture)return;
  worldTexture?.destroy();width=w;height=h;
  worldTexture=device.createTexture({label:VERSION+' linear radiant field',size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  presentBind=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:worldTexture.createView()}]});
 }
 function record({encoder,targetView,frame,presentation='preview'}){
  if(disposed||busy)throw new Error('GBO layer disposed or previous frame not settled');
  const data=pack(frame);if(!encoder?.beginRenderPass||!['preview','world-only'].includes(presentation)||(presentation==='preview'&&!targetView))throw new TypeError('encoder/targetView/presentation');
  busy=true;const serial=++submitted;const pops=[];
  try{
   for(const filter of ['validation','internal','out-of-memory'])device.pushErrorScope(filter);
   targets(frame.width,frame.height);device.queue.writeBuffer(uniform,0,data);
   const world=encoder.beginRenderPass({label:VERSION+' PH',colorAttachments:[{view:worldTexture.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});world.setPipeline(worldPipeline);world.setBindGroup(0,worldBind);world.draw(3);world.end();
   if(presentation==='preview'){const present=encoder.beginRenderPass({label:VERSION+' OBS',colorAttachments:[{view:targetView,loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});present.setPipeline(presentPipeline);present.setBindGroup(0,presentBind);present.draw(3);present.end();}
  }catch(error){busy=false;throw error;}
  finally{for(let i=0;i<3;i++)pops.push(device.popErrorScope());}
  let settled=false;
  return Object.freeze({submission:serial,sourceTextureView:worldTexture.createView(),uniformBuffer:uniform,presentation,async settle(){
   if(settled)throw new Error('GBO frame already settled');settled=true;
   try{await device.queue.onSubmittedWorkDone();const errors=await Promise.all(pops);const actual=errors.map((e,i)=>({stage:'frame',submission:serial,filter:['out-of-memory','internal','validation'][i],error:e?.message??null}));scopes.push(...actual);if(errors.some(Boolean))throw new Error(errors.filter(Boolean).map(e=>e.message).join('; '));completed++;return Object.freeze({submission:serial,completed:true,ageMs:frame.ageMs,stage:frame.stage,cause:frame.cause,generation:frame.generation,source:frame.options.source,observer:frame.options.observer,width:frame.width,height:frame.height});}finally{busy=false;}
  }});
 }
 return Object.freeze({record,snapshot:()=>({versionId:VERSION,disposed,busy,width,height,submitted,completed,shaderDiagnostics:diagnostics,actualScopes:scopes}),async dispose(){if(disposed)return;disposed=true;await device.queue.onSubmittedWorkDone();uniform?.destroy();worldTexture?.destroy();busy=false;}});
}
