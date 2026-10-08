import {WORLD_WGSL,OBSERVER_WGSL} from './shaders.mjs';

const scalarMessages = info => Array.from(info.messages,m=>({message:m.message,type:m.type,
  lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));

export async function createRenderer(canvas) {
  if (!navigator.gpu) throw new Error('WebGPU is required');
  const adapter=await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  const device=await adapter.requestDevice(), context=canvas.getContext('webgpu');
  if(!context) {device.destroy(); throw new Error('WebGPU presentation surface unavailable');}
  const format=navigator.gpu.getPreferredCanvasFormat();
  if(format.endsWith('-srgb')) {device.destroy(); throw new Error('Preview expects one display encode into non-sRGB presentation');}
  const diagnostics={compilation:[],submissions:[],uncaptured:[],deviceLost:null};
  let disposed=false, lost=false, target=null, targetSize='',serial=0,tail=Promise.resolve();
  device.addEventListener('uncapturederror',event=>diagnostics.uncaptured.push({name:event.error.name,message:event.error.message}));
  device.lost.then(info=>{lost=true;diagnostics.deviceLost={reason:info.reason,message:info.message};});
  const uniform=device.createBuffer({label:'head-contact-params',size:48,
    usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const modules=[];
  for(const [label,code] of [['contact-world',WORLD_WGSL],['contact-observer',OBSERVER_WGSL]]) {
    const module=device.createShaderModule({label,code});
    const info=await module.getCompilationInfo();
    const messages=scalarMessages(info);diagnostics.compilation.push({label,messages});
    if(messages.some(m=>m.type==='error')) {uniform.destroy();device.destroy();throw new Error(JSON.stringify({label,messages}));}
    modules.push(module);
  }
  device.pushErrorScope('validation');
  let worldPipeline,observerPipeline,pipelineError;
  try {
    worldPipeline=await device.createRenderPipelineAsync({label:'head-contact-world',layout:'auto',
      vertex:{module:modules[0],entryPoint:'vertexMain'},
      fragment:{module:modules[0],entryPoint:'worldMain',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    observerPipeline=await device.createRenderPipelineAsync({label:'head-contact-observer',layout:'auto',
      vertex:{module:modules[1],entryPoint:'vertexMain'},
      fragment:{module:modules[1],entryPoint:'observerMain',targets:[{format}]},primitive:{topology:'triangle-list'}});
  } catch(error) {pipelineError=error;}
  const actualScope=await device.popErrorScope();
  diagnostics.pipelineScope=actualScope?{name:actualScope.name,message:actualScope.message}:null;
  if(pipelineError||actualScope) {uniform.destroy();device.destroy();throw pipelineError??new Error(actualScope.message);}
  const worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});

  function draw(projected,geometry,{observer=true,sourceGain=1,layer=0,clearFor=null}={}) {
    // One serialized owner prevents uniform writes and target destruction racing
    // an earlier in-flight command; each receipt describes its actual submit.
    const work=tail.then(async()=>{
      if(disposed||lost) throw new Error('Renderer is retired or device lost');
      if(!Number.isInteger(geometry.pixelWidth)||!Number.isInteger(geometry.pixelHeight)||
         geometry.pixelWidth<1||geometry.pixelHeight<1||!Number.isFinite(geometry.pixelsPerWorldUnit)||
         geometry.pixelsPerWorldUnit<=0||!Number.isInteger(geometry.generation)||!geometry.targetId)
        throw new TypeError('Exact backing geometry required');
      if(projected&&(projected.pixelWidth!==geometry.pixelWidth||projected.pixelHeight!==geometry.pixelHeight||
          projected.targetSurfaceId!==geometry.targetId||projected.generation!==geometry.generation))
        throw new Error('Projected event and target geometry differ');
      if(!Number.isFinite(sourceGain)||sourceGain<0||sourceGain>4||![0,1,2].includes(layer))
        throw new TypeError('Invalid optical controls');
      const size=`${geometry.pixelWidth}:${geometry.pixelHeight}:${geometry.generation}`;
      if(size!==targetSize) {
        target?.destroy();canvas.width=geometry.pixelWidth;canvas.height=geometry.pixelHeight;
        context.configure({device,format,alphaMode:'opaque'});
        target=device.createTexture({label:'head-contact-linear-hdr',size:[canvas.width,canvas.height],
          format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
        targetSize=size;
      }
      const observerBind=device.createBindGroup({layout:observerPipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:{buffer:uniform}},{binding:1,resource:target.createView()}]});
      const age=projected?.ageMs??420;
      const values=new Float32Array([canvas.width,canvas.height,age,projected?1:0,
        projected?.point.x??0,projected?.point.y??0,geometry.pixelsPerWorldUnit,projected?.reducedMotion?1:0,
        observer?1:0,sourceGain,layer,0]);
      const scopes=['validation','out-of-memory','internal'];for(const scope of scopes)device.pushErrorScope(scope);
      const source=projected??clearFor;
      const receipt={submitSerial:++serial,eventId:source?.id??null,playerId:source?.playerId??null,
        targetId:source?.targetId??null,variant:source?.variant??null,startedAt:source?.startedAt??null,
        contactOnly:true,killOutcomeUnknown:true,ageMs:age,active:Boolean(projected),clear:!projected,
        targetSurfaceId:geometry.targetId,generation:geometry.generation,
        backingWidth:canvas.width,backingHeight:canvas.height,uniforms:Array.from(values),
        completion:'pending',actualErrorScopes:[],submittedAt:performance.now()};
      diagnostics.submissions.push(receipt);
      // Diagnostics are bounded across repeated preview runs.
      if(diagnostics.submissions.length>160)diagnostics.submissions.shift();
      let commandFailure=null;
      try {
        device.queue.writeBuffer(uniform,0,values);
        const encoder=device.createCommandEncoder({label:`contact-${serial}`});
        const world=encoder.beginRenderPass({colorAttachments:[{view:target.createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,0]}]});
        if(projected) {world.setPipeline(worldPipeline);world.setBindGroup(0,worldBind);world.draw(3);}
        world.end();
        const present=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:[0,0,0,1]}]});
        present.setPipeline(observerPipeline);present.setBindGroup(0,observerBind);present.draw(3);present.end();
        device.queue.submit([encoder.finish()]);
        receipt.fenceAcquiredAt=performance.now();
        await device.queue.onSubmittedWorkDone();
        receipt.completion='fulfilled';receipt.fulfilledAt=performance.now();
      }catch(error){commandFailure=error;receipt.completion='rejected';receipt.error={name:error.name,message:error.message};}
      for(const filter of scopes.toReversed()) {
        try {const error=await device.popErrorScope();receipt.actualErrorScopes.push({filter,error:error?{name:error.name,message:error.message}:null});}
        catch(error){receipt.actualErrorScopes.push({filter,popRejected:{name:error.name,message:error.message}});commandFailure??=error;}
      }
      if(receipt.actualErrorScopes.some(s=>s.error||s.popRejected))commandFailure??=new Error('Actual GPU error scope rejected frame');
      if(commandFailure)throw commandFailure;
      return receipt;
    });
    tail=work.catch(()=>{});return work;
  }
  async function dispose() {await tail;if(disposed)return;disposed=true;target?.destroy();uniform.destroy();context.unconfigure();device.destroy();}
  return {draw,dispose,diagnostics};
}
