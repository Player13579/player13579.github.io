import {VERSION,DURATION_MS,WORLD_WGSL,PRESENT_WGSL,DonationSound,ReceiptGate,phase} from './creative.mjs';
const scalar=m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length});
export class DonationRenderer {
  static async create(canvas){const r=new DonationRenderer(canvas);await r.init();return r;}
  constructor(canvas){this.canvas=canvas;this.diagnostics=[];this.submitCount=0;this.frames=[];this.ready=false;this.disposed=false;}
  async init(){
    if(!navigator.gpu)throw Error('WebGPU is required.');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable.');
    this.device=await adapter.requestDevice();this.context=this.canvas.getContext('webgpu');
    this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:this.device,format:this.format,alphaMode:'premultiplied'});
    this.device.addEventListener('uncapturederror',e=>{this.diagnostics.push({module:'device',message:e.error.message,type:e.error.name});});
    const modules=[];
    for(const [name,code] of [['world',WORLD_WGSL],['present',PRESENT_WGSL]]){const module=this.device.createShaderModule({label:VERSION+'/'+name,code});const info=await module.getCompilationInfo();
      this.diagnostics.push({module:name,messages:info.messages.map(scalar),status:info.messages.some(m=>m.type==='error')?'failed':'pass'});modules.push(module);}
    if(this.diagnostics.some(d=>d.status==='failed'))throw Error(JSON.stringify(this.diagnostics));
    this.device.pushErrorScope('validation');
    this.world=await this.device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
    this.present=await this.device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    this.uniform=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.worldBind=this.device.createBindGroup({layout:this.world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}}]});
    const error=await this.device.popErrorScope();if(error){this.diagnostics.push({module:'pipelines',type:error.name,message:error.message});throw error;}
    this.ready=true;this.resize();this.render(-1,{id:'idle'});
  }
  resize(){if(!this.ready||this.disposed)return;const scale=Math.min(2,globalThis.devicePixelRatio||1);
    const w=Math.max(1,Math.round(this.canvas.clientWidth*scale)),h=Math.max(1,Math.round(this.canvas.clientHeight*scale));
    if(this.texture&&this.canvas.width===w&&this.canvas.height===h)return;
    const old=this.texture;this.canvas.width=w;this.canvas.height=h;
    this.texture=this.device.createTexture({size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    this.presentBind=this.device.createBindGroup({layout:this.present.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()}]});
    if(old)this.device.queue.onSubmittedWorkDone().then(()=>old.destroy());
  }
  render(ms,receipt,{source=true,obs=true}={}){
    if(!this.ready||this.disposed)return;this.resize();const s=receipt.source||{x:82,y:82},target=receipt.recipient||{x:242,y:82};
    const u=new Float32Array([this.canvas.width,this.canvas.height,ms,source?1:0,obs?1:0,0,s.x,s.y,target.x,target.y,0,0]);
    this.device.queue.writeBuffer(this.uniform,0,u);
    const e=this.device.createCommandEncoder();
    let pass=e.beginRenderPass({colorAttachments:[{view:this.texture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(this.world);pass.setBindGroup(0,this.worldBind);pass.draw(3);pass.end();
    pass=e.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(this.present);pass.setBindGroup(0,this.presentBind);pass.draw(3);pass.end();this.device.queue.submit([e.finish()]);this.submitCount++;
    this.frames.push({submit:this.submitCount,ms,causeId:receipt.id,phase:phase(ms),source,obs});if(this.frames.length>180)this.frames.shift();
  }
  async dispose(){this.disposed=true;await this.device?.queue.onSubmittedWorkDone();this.texture?.destroy();this.uniform?.destroy();this.context?.unconfigure();this.device?.destroy();}
}
export class DonationPlayback {
  constructor(renderers,{verify=false}={}){this.renderers=renderers;this.gate=new ReceiptGate();this.sound=new DonationSound({verify});this.generation=0;this.running=false;this.receipt=null;this.options={source:true,obs:true};this.raf=0;this.timeMs=-1;}
  receive(input,{audio=true}={}){const receipt=this.gate.accept(input);if(!receipt)return false;this.cancel();this.receipt=receipt;this.running=true;this.started=performance.now();const token=this.generation;
    if(audio)void this.sound.play();const frame=now=>{if(token!==this.generation||!this.running)return;this.timeMs=now-this.started;
      this.draw(Math.min(DURATION_MS,this.timeMs));if(this.timeMs<DURATION_MS)this.raf=requestAnimationFrame(frame);else{this.running=false;this.sound.stop();this.raf=0;}};
    this.raf=requestAnimationFrame(frame);return true;
  }
  draw(ms){this.timeMs=ms;for(const r of this.renderers)r.render(ms,this.receipt||{id:'idle'},this.options);}
  hold(ms){this.cancel(false);this.draw(ms);}
  cancel(clear=true){this.generation++;this.running=false;cancelAnimationFrame(this.raf);this.raf=0;this.sound.stop();if(clear)this.draw(-1);}
  async dispose(){this.cancel();await this.sound.dispose();await Promise.all(this.renderers.map(r=>r.dispose()));}
  snapshot(){return {version:VERSION,ready:true,verify:this.sound.verify,running:this.running,timeMs:this.timeMs,phase:phase(this.timeMs),causeId:this.receipt?.id,generation:this.generation,audioNodes:this.sound.nodes.size,renderers:this.renderers.map(r=>({submitCount:r.submitCount,diagnostics:r.diagnostics,frames:r.frames,canvas:[r.canvas.width,r.canvas.height]}))};}
}
