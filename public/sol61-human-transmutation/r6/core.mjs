import {planHumanTransmutation,DEFAULT_DURATION_MS,VERSION_ID} from './cause.mjs';
import {WORLD_WGSL,BLOOM_WGSL,PRESENT_WGSL} from './shader.mjs';

export async function loadOriginalSprite(device,{url,sourceSha256,textureWidth,textureHeight}) {
  const response=await fetch(url); if(!response.ok) throw new Error(`Original sprite HTTP ${response.status}`);
  const bytes=await response.arrayBuffer();
  const actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(actual!==sourceSha256.toLowerCase()) throw new Error('Version-bound original sprite hash mismatch');
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  if(bitmap.width!==textureWidth || bitmap.height!==textureHeight) {bitmap.close();throw new Error('Original texture extent mismatch');}
  const texture=device.createTexture({label:'human-r6-original-verified',size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture,premultipliedAlpha:false,colorSpace:'srgb'},[bitmap.width,bitmap.height]);
  bitmap.close(); return {texture,sha256:actual};
}
export async function createHumanTransmutationRenderer({canvas,device,original,originalRegistration}={}) {
  if(!canvas || !device || !original || !originalRegistration) throw new TypeError('Explicit canvas, device and verified original required');
  const context=canvas.getContext('webgpu'); if(!context) throw new Error('WebGPU presentation surface unavailable');
  const format=navigator.gpu.getPreferredCanvasFormat();
  if(format.endsWith('-srgb')) throw new Error('Final encode requires a non-sRGB canvas target');
  context.configure({device,format,alphaMode:'opaque'});
  const modules=[WORLD_WGSL,BLOOM_WGSL,PRESENT_WGSL].map((code,i)=>device.createShaderModule({label:['human-world','human-bloom','human-present'][i],code}));
  const compiler=await Promise.all(modules.map(m=>m.getCompilationInfo()));
  const compilationMessages=compiler.flatMap((c,i)=>c.messages.map(m=>({module:i,type:m.type,line:m.lineNum,text:m.message})));
  if(compilationMessages.some(m=>m.type==='error')) throw new Error(JSON.stringify(compilationMessages));
  device.pushErrorScope('validation');
  const [worldPipeline,blurPipeline,presentPipeline]=await Promise.all([
    device.createRenderPipelineAsync({label:'human-world-mrt',layout:'auto',vertex:{module:modules[0],entryPoint:'fullscreen'},fragment:{module:modules[0],entryPoint:'reconstruct',targets:[{format:'rgba16float'},{format:'rgba16float'},{format:'rgba16float'}]}}),
    device.createRenderPipelineAsync({label:'human-observer-convolution',layout:'auto',vertex:{module:modules[1],entryPoint:'fullscreen'},fragment:{module:modules[1],entryPoint:'blur',targets:[{format:'rgba16float'}]}}),
    device.createRenderPipelineAsync({label:'human-single-encode',layout:'auto',vertex:{module:modules[2],entryPoint:'fullscreen'},fragment:{module:modules[2],entryPoint:'present',targets:[{format}]}}),
  ]);
  const pipelineError=await device.popErrorScope(); if(pipelineError) throw new Error(pipelineError.message);
  const params=device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const presentParams=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const blurX=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const blurY=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  const worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:params}},{binding:1,resource:original.createView()},{binding:2,resource:sampler}]});
  let attachments=[],extent='',disposed=false,inFlight=false,serial=0,completed=0,lastReceipt=null;
  function resize(width,height) {
    const key=`${width}x${height}`; if(extent===key)return;
    for(const t of attachments)t.destroy();
    attachments=Array.from({length:5},(_,i)=>device.createTexture({label:['scene','emission','bloom-x','bloom-y','fixation-glint-source'][i],size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}));
    extent=key;
  }
  function renderPass(encoder,pipeline,bind,outputs){
    const pass=encoder.beginRenderPass({colorAttachments:outputs.map(view=>({view,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});
    pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
  }
  async function render({input,elapsedMs,width,height,dpr=1,sourceEnabled=true,observerEnabled=true,glintsEnabled=true,reducedMotion=false,background=[.025,.035,.045]}={}) {
    if(disposed)throw new Error('Renderer disposed');
    if(inFlight)return {skipped:true,reason:'prior-frame-in-flight'};
    if(![width,height,dpr].every(Number.isFinite)||width<=0||height<=0||dpr<=0||!Number.isFinite(elapsedMs))throw new TypeError('Valid extent/DPR/cause elapsed required');
    if(input.sprite.sourceSha256.toLowerCase()!==originalRegistration.sourceSha256.toLowerCase() || input.sprite.textureWidth!==originalRegistration.textureWidth || input.sprite.textureHeight!==originalRegistration.textureHeight)throw new Error('Registration must refer to the verified texture');
    const cause=planHumanTransmutation({...input,visualElapsedMs:elapsedMs});
    // After the finite E lifetime, the current same-frame actor remains; hidden actors stay absent.
    const registered=planHumanTransmutation({...input,visualElapsedMs:0});
    const visible=registered.active;
    const rect=registered.spriteRect??{x:0,y:0,width:1,height:1};
    const uv=registered.spriteUvRect??[0,0,1,1]; const support=registered.alphaSupportUv??[0,0,1,1];
    const phaseMs=cause.active?cause.phaseMs:DEFAULT_DURATION_MS;
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    resize(w,h);
    const values=new Float32Array([w,h,dpr,registered.actualActorHeight??64,rect.x,rect.y,rect.width,rect.height,...uv,...support,phaseMs,+sourceEnabled,+observerEnabled,+reducedMotion,+visible,+cause.active,+glintsEnabled,0,...background,1]);
    device.queue.writeBuffer(params,0,values);device.queue.writeBuffer(presentParams,0,new Float32Array([+observerEnabled,+glintsEnabled,0,0,w,h,dpr,registered.actualActorHeight??64,rect.x,rect.y,rect.width,rect.height,...uv]));
    // Source-derived local PSF radius scales with body height, independent of background.
    const sigmaStep=dpr*(registered.actualActorHeight??64)/64;
    device.queue.writeBuffer(blurX,0,new Float32Array([sigmaStep,0,0,0]));device.queue.writeBuffer(blurY,0,new Float32Array([0,sigmaStep,0,0]));
    const views=attachments.map(t=>t.createView());
    const blurBind=(view,buffer)=>device.createBindGroup({layout:blurPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:view},{binding:1,resource:sampler},{binding:2,resource:{buffer}}]});
    const presentBind=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:views[0]},{binding:1,resource:views[1]},{binding:2,resource:views[3]},{binding:3,resource:sampler},{binding:4,resource:{buffer:presentParams}},{binding:5,resource:views[4]}]});
    device.pushErrorScope('validation');inFlight=true;
    try {
      const encoder=device.createCommandEncoder({label:`${VERSION_ID}:${input.event.id}:${elapsedMs}`});
      renderPass(encoder,worldPipeline,worldBind,[views[0],views[1],views[4]]);
      renderPass(encoder,blurPipeline,blurBind(views[1],blurX),[views[2]]);
      renderPass(encoder,blurPipeline,blurBind(views[2],blurY),[views[3]]);
      renderPass(encoder,presentPipeline,presentBind,[context.getCurrentTexture().createView()]);
      const submitted=++serial;device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();
      const validation=await device.popErrorScope();if(validation)throw new Error(validation.message);
      completed=submitted;
      lastReceipt={version:VERSION_ID,causeId:input.event.id,targetId:input.event.targetId,scopeId:input.scope.id,generation:input.scope.generation,elapsedMs,phaseMs,active:cause.active,actorVisible:visible,sourceEnabled,observerEnabled,glintsEnabled,reducedMotion,sourceSha256:input.sprite.sourceSha256,actualActorHeight:registered.actualActorHeight??null,spriteRect:visible?rect:null,physicalExtent:[w,h],cssExtent:[width,height],dpr,submitted,completed,passes:4,format,worldFormat:'rgba16float',materialTransport:'unsplit-row-sheet',glintSource:'actual-alpha-bound-fixation-MRT',glintRayAngleRadians:17*Math.PI/180,queueCompleted:true};
      return lastReceipt;
    } finally {inFlight=false;}
  }
  async function inspectAttachment(index){
    if(disposed||!lastReceipt||!attachments[index])throw new Error('A completed frame is required');
    const receipt={...lastReceipt}; const [width,height]=receipt.physicalExtent;
    const bytesPerRow=Math.ceil(width*8/256)*256;
    const buffer=device.createBuffer({size:bytesPerRow*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    try {
      const encoder=device.createCommandEncoder({label:'human-emission-readback'});
      encoder.copyTextureToBuffer({texture:attachments[index]},{buffer,bytesPerRow,rowsPerImage:height},[width,height]);
      device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();
      await buffer.mapAsync(GPUMapMode.READ);const data=new Uint16Array(buffer.getMappedRange());
      let nonzeroRGB=0,nonfiniteRGB=0;const stride=bytesPerRow/2;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<3;c++){
        const v=data[y*stride+x*4+c];if((v&0x7fff)!==0)nonzeroRGB++;if((v&0x7c00)===0x7c00)nonfiniteRGB++;
      }
      buffer.unmap();return {receipt,attachment:index===1?'actual-rgba16float-emission':'actual-rgba16float-glint-source',nonzeroRGB,nonfiniteRGB,rgbStrictZero:nonzeroRGB===0,queueCompleted:true};
    }finally{buffer.destroy();}
  }
  function dispose(){disposed=true;for(const t of attachments)t.destroy();for(const b of [params,presentParams,blurX,blurY])b.destroy();context.unconfigure();}
  return {render,dispose,inspectEmission:()=>inspectAttachment(1),inspectGlints:()=>inspectAttachment(4),compilationMessages,getReceipt:()=>lastReceipt,getEmissionTexture:()=>attachments[1],getState:()=>({submitted:serial,completed,inFlight,disposed,extent})};
}
