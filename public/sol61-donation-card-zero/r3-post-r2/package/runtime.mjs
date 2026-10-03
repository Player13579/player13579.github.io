import {VERSION,DURATION_MS,WORLD_WGSL,PRESENT_WGSL,DonationSound,ReceiptGate,phase,validateReceipt} from './creative.mjs';
import {postUniforms} from './observer.mjs';
const scalar=m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length});
export class DonationRenderer {
  static async create(canvas){const r=new DonationRenderer(canvas);await r.init();return r;}
  constructor(canvas){this.canvas=canvas;this.diagnostics=[];this.submitCount=0;this.frames=[];this.ready=false;this.disposed=false;this.targetGeneration=0;this.deviceGeneration=1;this.frameToken=0;this.expectedReceipt=null;this.retirements=new Set();this.materialTexture=null;this.sourceTexture=null;this.postBind=null;this.disposePromise=null;}
  async init(){
    if(!navigator.gpu)throw Error('WebGPU is required.');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable.');
    this.device=await adapter.requestDevice();this.context=this.canvas.getContext('webgpu');if(!this.context)throw Error('WebGPU canvas context unavailable.');
    this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format:this.format,alphaMode:'premultiplied'});
    this.device.addEventListener('uncapturederror',e=>{this.diagnostics.push({module:'device',message:e.error.message,type:e.error.name});});
    void this.device.lost?.then(info=>{if(this.disposed)return;this.deviceGeneration++;this.targetGeneration++;this.ready=false;this.diagnostics.push({module:'device-lost',reason:info?.reason,message:info?.message||'WebGPU device lost'});});
    const modules=[];for(const [name,code] of [['world',WORLD_WGSL],['present-observer',PRESENT_WGSL]]){const module=this.device.createShaderModule({label:VERSION+'/'+name,code});const info=await module.getCompilationInfo();const messages=info.messages.map(scalar);const failed=messages.some(m=>m.type==='error');this.diagnostics.push({module:name,messages,status:failed?'failed':'pass'});if(failed)throw Error(`${name} WGSL compilation failed: ${JSON.stringify(messages.filter(m=>m.type==='error'))}`);modules.push(module);}
    this.device.pushErrorScope('validation');
    try{
      this.world=await this.device.createRenderPipelineAsync({label:VERSION+'/world MRT',layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
      this.present=await this.device.createRenderPipelineAsync({label:VERSION+'/source-fed observer present',layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
      this.worldUniform=this.device.createBuffer({label:VERSION+'/world Params 48B',size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.observerUniform=this.device.createBuffer({label:VERSION+'/Observation 48B',size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.sampler=this.device.createSampler({addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',minFilter:'linear',magFilter:'linear'});
      this.worldBind=this.device.createBindGroup({layout:this.world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.worldUniform}}]});
    }catch(e){const error=await this.device.popErrorScope();if(error)this.diagnostics.push({module:'pipeline-validation',type:error.name,message:error.message});throw e;}
    const error=await this.device.popErrorScope();if(error){this.diagnostics.push({module:'pipeline-validation',type:error.name,message:error.message});throw error;}
    this.ready=true;this.resize();this.render(-1,{id:'idle'});
  }
  dimensions(){
    const scale=Math.min(2,globalThis.devicePixelRatio||1),width=Math.max(1,Math.round(this.canvas.clientWidth*scale)),height=Math.max(1,Math.round(this.canvas.clientHeight*scale));
    const max=this.device?.limits?.maxTextureDimension2D;if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||!Number.isSafeInteger(max)||width>max||height>max)throw new RangeError(`Donation canvas extent ${width}x${height} exceeds device limit ${max}`);
    return{width,height};
  }
  retirePair(material,source){
    if(!material&&!source)return;
    let done;try{done=this.device.queue.onSubmittedWorkDone();}catch(e){done=Promise.reject(e);}
    const retirement=Promise.resolve(done).catch(error=>{this.diagnostics.push({module:'retire-queue',message:String(error?.message||error)});}).then(()=>{try{material?.destroy();}finally{source?.destroy();}}).finally(()=>this.retirements.delete(retirement));
    this.retirements.add(retirement);
  }
  resize(){
    if(!this.ready||this.disposed)return false;const {width,height}=this.dimensions();
    if(this.materialTexture&&this.sourceTexture&&this.canvas.width===width&&this.canvas.height===height)return false;
    const material=this.device.createTexture({label:VERSION+'/material HDR',size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    let source,postBind;
    try{
      source=this.device.createTexture({label:VERSION+'/optical source HDR',size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
      this.canvas.width=width;this.canvas.height=height;
      postBind=this.device.createBindGroup({layout:this.present.getBindGroupLayout(0),entries:[{binding:0,resource:material.createView()},{binding:1,resource:source.createView()},{binding:2,resource:this.sampler},{binding:3,resource:{buffer:this.observerUniform}}]});
    }catch(e){material.destroy();source?.destroy();throw e;}
    const oldMaterial=this.materialTexture,oldSource=this.sourceTexture;
    // Publish the complete new target pair atomically before retiring the old pair.
    this.materialTexture=material;this.sourceTexture=source;this.postBind=postBind;
    this.canvas.width=width;this.canvas.height=height;this.targetGeneration++;
    this.retirePair(oldMaterial,oldSource);return true;
  }
  isCurrent(s){
    const required=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
    return !this.disposed&&this.ready&&this.device===s.device&&this.context===s.context&&this.expectedReceipt===s.receipt&&this.deviceGeneration===s.deviceGeneration&&this.targetGeneration===s.targetGeneration&&this.materialTexture===s.materialTexture&&this.sourceTexture===s.sourceTexture&&this.postBind===s.postBind&&this.sampler===s.sampler&&this.worldUniform===s.worldUniform&&this.observerUniform===s.observerUniform&&this.canvas.width===s.width&&this.canvas.height===s.height&&this.frameToken===s.frameToken&&s.materialTexture!==s.sourceTexture&&s.materialTexture.width===s.width&&s.materialTexture.height===s.height&&s.sourceTexture.width===s.width&&s.sourceTexture.height===s.height&&s.materialTexture.format==='rgba16float'&&s.sourceTexture.format==='rgba16float'&&(s.materialTexture.usage&required)===required&&(s.sourceTexture.usage&required)===required&&s.outputTexture!==s.materialTexture&&s.outputTexture!==s.sourceTexture&&s.outputTexture.width===s.width&&s.outputTexture.height===s.height&&s.outputTexture.format===s.format&&(s.outputTexture.usage&GPUTextureUsage.RENDER_ATTACHMENT)===GPUTextureUsage.RENDER_ATTACHMENT&&s.receipt?.id===s.causeId&&validateReceipt(s.receipt);
  }
  clear(ms,receipt,source,obs,intensity){
    const output=this.context.getCurrentTexture(),encoder=this.device.createCommandEncoder({label:VERSION+'/idle clear'}),pass=encoder.beginRenderPass({colorAttachments:[{view:output.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.end();this.device.queue.submit([encoder.finish()]);this.submitCount++;this.frames.push({submit:this.submitCount,ms,causeId:receipt?.id||'idle',phase:phase(ms),source,obs,intensity,clear:true});if(this.frames.length>180)this.frames.shift();return true;
  }
  render(ms,receipt,{source=true,obs=true,intensity=1}={}){
    if(!this.ready||this.disposed)return false;if(!Number.isFinite(ms)||typeof source!=='boolean'||typeof obs!=='boolean'||!Number.isFinite(intensity)||intensity<0||intensity>2)throw TypeError('Finite age and supported source/observer controls required');
    this.resize();if(ms<0||ms>=DURATION_MS)return this.clear(ms,receipt,source,obs,intensity);
    // Validate actual active cause geometry before honoring source-off diagnostics.
    if(!validateReceipt(receipt))throw new TypeError('Active donation render requires an accepted successful receipt with finite route geometry');
    if(this.expectedReceipt!==receipt)throw new Error('Donation receipt ownership changed before frame capture');
    const outputTexture=this.context.getCurrentTexture(),outputView=outputTexture.createView();
    const snapshot=Object.freeze({device:this.device,deviceGeneration:this.deviceGeneration,context:this.context,receipt,causeId:receipt.id,ms,source,obs,intensity,width:this.canvas.width,height:this.canvas.height,format:this.format,targetGeneration:this.targetGeneration,materialTexture:this.materialTexture,sourceTexture:this.sourceTexture,postBind:this.postBind,sampler:this.sampler,worldUniform:this.worldUniform,observerUniform:this.observerUniform,outputTexture,outputView,frameToken:++this.frameToken});
    if(!snapshot.materialTexture||!snapshot.sourceTexture||snapshot.materialTexture===snapshot.sourceTexture||snapshot.materialTexture===outputTexture||snapshot.sourceTexture===outputTexture)throw new Error('Donation HDR targets must be distinct current nonalias textures');
    const worldValues=new Float32Array([snapshot.width,snapshot.height,snapshot.ms,snapshot.source?1:0,0,0,snapshot.receipt.source.x,snapshot.receipt.source.y,snapshot.receipt.recipient.x,snapshot.receipt.recipient.y,0,0]);
    const observerValues=postUniforms({width:snapshot.width,height:snapshot.height,ms:snapshot.ms,origin:snapshot.receipt.source,recipient:snapshot.receipt.recipient,source:snapshot.source,obs:snapshot.obs,intensity:snapshot.intensity});
    if(worldValues.byteLength!==48||observerValues.byteLength!==48||this.worldUniform.size!==48||this.observerUniform.size!==48)throw new Error('Donation shader uniform ABI must remain exactly 48 bytes');
    this.device.queue.writeBuffer(this.worldUniform,0,worldValues);this.device.queue.writeBuffer(this.observerUniform,0,observerValues);
    const encoder=this.device.createCommandEncoder({label:VERSION+'/one-frame PH plus source-fed OBS'});
    let pass=encoder.beginRenderPass({label:'Donation world PH MRT',colorAttachments:[{view:snapshot.materialTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},{view:snapshot.sourceTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(this.world);pass.setBindGroup(0,this.worldBind);pass.draw(3);pass.end();
    pass=encoder.beginRenderPass({label:'Donation actual source-fed observer post',colorAttachments:[{view:snapshot.outputView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(this.present);pass.setBindGroup(0,snapshot.postBind);pass.draw(3);pass.end();
    const commandBuffer=encoder.finish();
    // No await between snapshot capture, writes, recording and submit. A stale
    // generation/texture/receipt never reaches queue.submit; the caller's next
    // RAF samples a fresh state and current target.
    if(!this.isCurrent(snapshot)){this.diagnostics.push({module:'frame-guard',message:'stale/disposed donation frame rejected before submit',frameToken:snapshot.frameToken});return false;}
    this.device.queue.submit([commandBuffer]);this.submitCount++;this.frames.push({submit:this.submitCount,ms:snapshot.ms,causeId:snapshot.causeId,phase:phase(snapshot.ms),source:snapshot.source,obs:snapshot.obs,intensity:snapshot.intensity,frameToken:snapshot.frameToken,targetGeneration:snapshot.targetGeneration});if(this.frames.length>180)this.frames.shift();return true;
  }
  async dispose(){
    if(this.disposePromise)return this.disposePromise;this.disposed=true;this.ready=false;this.targetGeneration++;this.frameToken++;
    this.disposePromise=(async()=>{try{await this.device?.queue?.onSubmittedWorkDone();}catch(e){this.diagnostics.push({module:'dispose-queue',message:String(e?.message||e)});}await Promise.allSettled([...this.retirements]);const material=this.materialTexture,source=this.sourceTexture;this.materialTexture=null;this.sourceTexture=null;try{material?.destroy();}finally{source?.destroy();}this.postBind=null;this.worldBind=null;this.sampler=null;this.worldUniform?.destroy();this.observerUniform?.destroy();this.worldUniform=null;this.observerUniform=null;this.context?.unconfigure();this.device?.destroy();})();return this.disposePromise;
  }
}
export class DonationPlayback {
  constructor(renderers,{verify=false}={}){this.renderers=renderers;this.gate=new ReceiptGate();this.sound=new DonationSound({verify});this.generation=0;this.running=false;this.receipt=null;this.options={source:true,obs:true,intensity:1};this.raf=0;this.timeMs=-1;}
  receive(input,{audio=true}={}){const receipt=this.gate.accept(input);if(!receipt)return false;this.cancel();this.receipt=receipt;this.running=true;this.started=performance.now();const token=this.generation;
    if(audio)void this.sound.play();const frame=now=>{if(token!==this.generation||!this.running)return;this.timeMs=now-this.started;
      this.draw(Math.min(DURATION_MS,this.timeMs));if(this.timeMs<DURATION_MS)this.raf=requestAnimationFrame(frame);else{this.running=false;this.sound.stop();this.raf=0;}};
    this.raf=requestAnimationFrame(frame);return true;
  }
  draw(ms){this.timeMs=ms;for(const r of this.renderers){r.expectedReceipt=this.receipt;r.render(ms,this.receipt||{id:'idle'},this.options);}}
  hold(ms){this.cancel(false);this.draw(ms);}
  cancel(clear=true){this.generation++;this.running=false;cancelAnimationFrame(this.raf);this.raf=0;this.sound.stop();if(clear)this.draw(-1);}
  async dispose(){this.cancel();await this.sound.dispose();await Promise.all(this.renderers.map(r=>r.dispose()));}
  snapshot(){return {version:VERSION,ready:this.renderers.length>0&&this.renderers.every(r=>r.ready&&!r.disposed),verify:this.sound.verify,running:this.running,timeMs:this.timeMs,phase:phase(this.timeMs),causeId:this.receipt?.id,generation:this.generation,audioNodes:this.sound.nodes.size,renderers:this.renderers.map(r=>({ready:r.ready&&!r.disposed,submitCount:r.submitCount,diagnostics:r.diagnostics,frames:r.frames,canvas:[r.canvas.width,r.canvas.height]}))};}
}
