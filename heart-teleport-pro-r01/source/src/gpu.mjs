import {MAX_ACTIVE} from './contract.mjs';
/** 同じpipelineをbrowser swapchain / 検査用attachmentの両方に使う。 */
export class HeartGPU {
  #device;#pipeline;#buffer;#bind;#dead=false;#errors=[];#lost=false;
  static async create(device,format,shaderCode){
    const self=new HeartGPU();self.#device=device;
    self.errorHandler=e=>self.#errors.push(String(e.error?.message||'GPU error'));
    device.addEventListener?.('uncapturederror',self.errorHandler);
    device.lost.then(info=>{self.#lost=true;self.#errors.push(`device_lost:${info.reason}`);});
    device.pushErrorScope('validation');
    try{
      const module=device.createShaderModule({label:'heart / PH1 PH2 OBS1 OBS2',code:shaderCode});
      const info=await module.getCompilationInfo();
      for(const m of info.messages)self.#errors.push(`${m.type}:${m.lineNum}:${m.message}`);
      if(info.messages.some(m=>m.type==='error'))throw new Error('WGSL compilation failed');
      const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform',hasDynamicOffset:true,minBindingSize:48}}]});
      self.#pipeline=await device.createRenderPipelineAsync({label:'heart premultiplied pipeline',layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
      self.#buffer=device.createBuffer({label:'caster-only uniforms',size:256*MAX_ACTIVE,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      self.#bind=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:self.#buffer,offset:0,size:48}}]});
      const err=await device.popErrorScope();if(err)throw new Error(err.message);
      return self;
    }catch(e){try{await device.popErrorScope();}catch{}self.dispose();throw e;}
  }
  get ready(){return !this.#dead&&!this.#lost;}
  errors(){return [...this.#errors];}
  /** centers / clipRectはprojectCasterの出力だけ。targetを引数に持たない。 */
  render(view,{width,height,items=[],clear={r:0,g:0,b:0,a:0},reducedMotion=false,glow=true,layer=0}){
    if(!this.ready)return false;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new RangeError('viewport');
    const clean=items.slice(0,MAX_ACTIVE).filter(i=>[i.x,i.y,i.h,i.ageMs].every(Number.isFinite)&&i.h>0&&i.ageMs>=0&&i.ageMs<1800);
    const data=new Float32Array(MAX_ACTIVE*64);
    clean.forEach((i,n)=>data.set([width,height,i.x,i.y,i.ageMs/1000,reducedMotion?1:0,i.h,i.dpr||1,glow?1:0,1/Math.max(1,clean.length),layer,0],n*64));
    this.#device.queue.writeBuffer(this.#buffer,0,data);
    const encoder=this.#device.createCommandEncoder({label:'heart frame'});
    const pass=encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',storeOp:'store',clearValue:clear}]});
    pass.setPipeline(this.#pipeline);
    clean.forEach((i,n)=>{
      const c=i.clipRect||{x:0,y:0,width,height};
      const x=Math.min(width,Math.max(0,Math.ceil(c.x))),y=Math.min(height,Math.max(0,Math.ceil(c.y)));
      const w=Math.max(0,Math.min(width-x,Math.floor(c.x+c.width)-x));
      const h=Math.max(0,Math.min(height-y,Math.floor(c.y+c.height)-y));
      if(!w||!h)return;
      pass.setScissorRect(x,y,w,h);pass.setBindGroup(0,this.#bind,[256*n]);pass.draw(6);
    });
    pass.end();this.#device.queue.submit([encoder.finish()]);return true;
  }
  async settled(){if(!this.#dead)await this.#device.queue.onSubmittedWorkDone();}
  dispose(){if(this.#dead)return;this.#dead=true;this.#buffer?.destroy();this.#device?.removeEventListener?.('uncapturederror',this.errorHandler);this.#bind=null;this.#pipeline=null;}
}
export async function createCanvasRenderer(canvas){
  if(!globalThis.navigator?.gpu)throw new Error('WebGPU unavailable: no fallback masquerading as WebGPU');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
  if(!adapter)throw new Error('No WebGPU adapter');
  const device=await adapter.requestDevice();let context;
  try{
    context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas unavailable');
    const format=navigator.gpu.getPreferredCanvasFormat();
    const viewFormat=format+'-srgb';
    context.configure({device,format,viewFormats:[viewFormat],alphaMode:'premultiplied',colorSpace:'srgb'});
    const response=await fetch(new URL('../shaders/heart.wgsl',import.meta.url));if(!response.ok)throw new Error('shader load failed');
    const gpu=await HeartGPU.create(device,viewFormat,await response.text());let dead=false;
    return {gpu,device,adapterInfo:adapter.info,draw(options){if(!dead&&gpu.ready)gpu.render(context.getCurrentTexture().createView({format:viewFormat}),{width:canvas.width,height:canvas.height,...options});},dispose(){if(dead)return;dead=true;gpu.dispose();context.unconfigure();device.destroy();}};
  }catch(e){context?.unconfigure();device.destroy();throw e;}
}
