import {MAX_ACTIVE,validFrame} from './runtime.mjs';
export const ITEM_FLOATS=92;
/** 描画資源の所有者。hostから渡されたdeviceは破棄しない。 */
export class StaminaRenderer {
  static async create(canvas,{device=null,shaderSource=null}={}){
    if(!globalThis.navigator?.gpu&&!device)throw new Error('WebGPU unavailable: secure context and supported browser required');
    let adapter=null,ownsDevice=false;
    if(!device){adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');device=await adapter.requestDevice();ownsDevice=true;}
    const r=new StaminaRenderer(canvas,device,ownsDevice,adapter);
    try{await r.init(shaderSource);return r;}catch(e){r.dispose();throw e;}
  }
  constructor(canvas,device,ownsDevice,adapter){this.canvas=canvas;this.device=device;this.ownsDevice=ownsDevice;this.adapter=adapter;this.destroyed=false;this.errors=[];this.bufferCount=0;this.submissions=0;}
  async init(source){
    const d=this.device;this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('webgpu canvas context unavailable');
    this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:d,format:this.format,alphaMode:'premultiplied'});
    this.onError=e=>this.errors.push(String(e.error?.message||e));d.addEventListener('uncapturederror',this.onError);
    d.lost.then(info=>{if(!this.destroyed){this.errors.push(`device-lost: ${info.reason}: ${info.message}`);this.lost=true;}});
    if(source===null){const res=await fetch(new URL('./stamina.wgsl',import.meta.url));if(!res.ok)throw new Error(`WGSL HTTP ${res.status}`);source=await res.text();}
    this.shaderSource=source;const module=d.createShaderModule({label:'DVA Inward Reserve PH2 PH3 OBS',code:source});
    const ci=await module.getCompilationInfo();this.compilation=ci.messages.map(m=>({type:m.type,line:m.lineNum,message:m.message}));
    if(this.compilation.some(m=>m.type==='error'))throw new Error(JSON.stringify(this.compilation));
    d.pushErrorScope('validation');
    const blend={color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
    this.pipeline=await d.createRenderPipelineAsync({label:'stamina-only',layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:this.format,blend}]},primitive:{topology:'triangle-list'}});
    const error=await d.popErrorScope();if(error)throw new Error(error.message);
    this.uniform=d.createBuffer({label:'stamina frame',size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.bufferCount++;
    this.storage=d.createBuffer({label:'stamina instances',size:ITEM_FLOATS*4*MAX_ACTIVE,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.bufferCount++;
    this.bind=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:{buffer:this.storage}}]});
  }
  encodeItems(items){
    if(items.length>MAX_ACTIVE)throw new RangeError('renderer capacity; do not truncate causes');
    const data=new Float32Array(ITEM_FLOATS*Math.max(1,items.length));
    items.forEach((it,i)=>{
      if(!validFrame(it)||!Number.isFinite(it.phase)||!Number.isFinite(it.lane??0))throw new TypeError('invalid actor frame');
      const o=i*ITEM_FLOATS;data.set([...it.originPx,...it.axisXPx,...it.axisYPx,it.phase,Number(it.reducedMotion||false),it.lane??0,it.capsules.length,it.occluders?.length??0,it.fixtureBackground??0,0,0,0,0],o);
      it.capsules.forEach((c,n)=>{data.set(c.slice(0,4),o+16+4*n);data[o+64+n]=c[4];});
      (it.occluders||[]).forEach((r,n)=>data.set(r,o+76+4*n));
    });return data;
  }
  draw(items,{clear=[0,0,0,0],passKind=0,load=false}={}){
    if(this.destroyed||this.lost)throw new Error('renderer unavailable');
    const d=this.device,arr=this.encodeItems(items);if(items.length)d.queue.writeBuffer(this.storage,0,arr);
    const head=new ArrayBuffer(16);new Float32Array(head).set([this.canvas.width,this.canvas.height]);new Uint32Array(head).set([items.length,passKind],2);d.queue.writeBuffer(this.uniform,0,head);
    const encoder=d.createCommandEncoder();const view=this.context.getCurrentTexture().createView();
    const pass=encoder.beginRenderPass({colorAttachments:[{view,clearValue:{r:clear[0],g:clear[1],b:clear[2],a:clear[3]},loadOp:load?'load':'clear',storeOp:'store'}]});
    if(items.length){pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);pass.draw(6,items.length);}pass.end();d.queue.submit([encoder.finish()]);this.submissions++;
  }
  async settled(){if(this.device&&!this.destroyed)await this.device.queue.onSubmittedWorkDone();}
  dispose(){
    if(this.destroyed)return;this.destroyed=true;this.uniform?.destroy();this.storage?.destroy();this.bufferCount=0;
    this.context?.unconfigure();if(this.onError)this.device?.removeEventListener('uncapturederror',this.onError);
    if(this.ownsDevice)this.device?.destroy();this.bind=null;this.pipeline=null;this.uniform=null;this.storage=null;
  }
}
