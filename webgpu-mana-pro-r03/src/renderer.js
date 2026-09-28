import {sampleScene,packPrimitives} from './sampler.js';
const BUFFER_STRIDE=80;
const BLEND={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
async function moduleFrom(device,url,label){
  const r=await fetch(url);if(!r.ok)throw new Error(`${label}: HTTP ${r.status}`);
  const module=device.createShaderModule({label,code:await r.text()});
  const info=await module.getCompilationInfo();
  const errors=info.messages.filter(m=>m.type==='error');
  if(errors.length)throw new Error(errors.map(m=>`${label}:${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
  return {module,messages:info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}))};
}
export async function requestManaDevice(){
  if(!globalThis.navigator?.gpu)throw new Error('WebGPU is unavailable. Use a WebGPU-capable secure context; no Canvas fallback is substituted.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('No WebGPU adapter. GPU quality validation is not_run.');
  const device=await adapter.requestDevice();
  return {device,adapter,format:navigator.gpu.getPreferredCanvasFormat(),info:adapter.info};
}
export class ManaRenderer {
  static async create(options){const renderer=new ManaRenderer(options);try{await renderer._init();return renderer;}catch(e){renderer.dispose();throw e;}}
  constructor({device,format,workingColorSpace='linear',depthStencil,onDiagnostic=()=>{}}={}){
    if(!device||!format)throw new TypeError('GPUDevice and host target format are required');
    if(!['linear','display'].includes(workingColorSpace))throw new TypeError('workingColorSpace must be linear or display');
    Object.assign(this,{device,format,workingColorSpace,depthStencil,onDiagnostic});this.valid=false;this.disposed=false;this.lost=false;
    this.layers={back:{},front:{}};this.size=[0,0];this.counts={back:0,front:0};
    this.errorHandler=e=>{this.valid=false;this.onDiagnostic({type:'gpu-uncaptured-error',message:e.error.message});};
    device.addEventListener('uncapturederror',this.errorHandler);
    device.lost.then(info=>{this.lost=true;this.valid=false;this.onDiagnostic({type:'device-lost',reason:info.reason,message:info.message});});
  }
  async _init(){
    const d=this.device;d.pushErrorScope('validation');
    try{
      const [shape,composite]=await Promise.all([moduleFrom(d,new URL('../shaders/mana.wgsl?v=select-v3',import.meta.url),'mana-volume-r03'),moduleFrom(d,new URL('../shaders/composite.wgsl',import.meta.url),'mana-composite-r03')]);
      this.compilation={shape:shape.messages,composite:composite.messages};
      this.geometryLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'read-only-storage'}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:48}}]});
      this.shapePipeline=await d.createRenderPipelineAsync({label:'mana-procedural-coverage',layout:d.createPipelineLayout({bindGroupLayouts:[this.geometryLayout]}),vertex:{module:shape.module,entryPoint:'vs'},fragment:{module:shape.module,entryPoint:'fs',targets:[{format:'rgba16float',blend:BLEND}]},primitive:{topology:'triangle-list'}});
      this.compositeLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
      this.compositePipeline=await d.createRenderPipelineAsync({label:'mana-premultiplied-composite',layout:d.createPipelineLayout({bindGroupLayouts:[this.compositeLayout]}),vertex:{module:composite.module,entryPoint:'vs'},fragment:{module:composite.module,entryPoint:'fs',targets:[{format:this.format,blend:BLEND}]},primitive:{topology:'triangle-list'},...(this.depthStencil?{depthStencil:this.depthStencil}:{})});
      this.sampler=d.createSampler({label:'procedural-coverage-linear-clamp',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',lodMinClamp:0,lodMaxClamp:0,maxAnisotropy:1});
      this.uniform=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    }finally{const error=await d.popErrorScope();if(error)throw new Error(`WebGPU pipeline validation: ${error.message}`);}
  }
  _resize(width,height){
    if(this.size[0]===width&&this.size[1]===height)return;
    for(const layer of Object.values(this.layers)){
      layer.texture?.destroy();
      layer.texture=this.device.createTexture({label:'mana-procedural-layer',size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
      layer.view=layer.texture.createView();
      layer.compositeGroup=this.device.createBindGroup({layout:this.compositeLayout,entries:[{binding:0,resource:layer.view},{binding:1,resource:this.sampler}]});
    }
    this.size=[width,height];
  }
  prepare(items,view){
    if(this.disposed||this.lost)throw new Error('Renderer is not usable');
    const {width,height,scale=1,dpr=1,cameraX=0,cameraY=0,originX=width/2,originY=height*0.70}=view??{};
    if(![width,height,scale,dpr].every(v=>Number.isFinite(v)&&v>0)||![cameraX,cameraY,originX,originY].every(Number.isFinite))throw new RangeError('Invalid viewport');
    const pw=Math.max(1,Math.round(width*dpr)),ph=Math.max(1,Math.round(height*dpr));
    if(Math.max(pw,ph)>this.device.limits.maxTextureDimension2D)throw new RangeError('Viewport exceeds device texture limit');
    this._resize(pw,ph);
    const primitives=sampleScene(items);
    this.device.queue.writeBuffer(this.uniform,0,new Float32Array([width,height,scale,dpr,cameraX,cameraY,originX,originY,this.workingColorSpace==='linear'?1:0,0,0,0]));
    const encoder=this.device.createCommandEncoder({label:'mana-render-procedural-layers'});
    for(const name of ['back','front']){
      const layer=this.layers[name];const shapes=primitives.filter(p=>p.layer===name);const data=packPrimitives(shapes);this.counts[name]=shapes.length;
      const capacity=Math.max(BUFFER_STRIDE,data.byteLength);
      if(!layer.buffer||layer.capacity<capacity){
        layer.buffer?.destroy();layer.capacity=2**Math.ceil(Math.log2(capacity));
        layer.buffer=this.device.createBuffer({size:layer.capacity,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
        layer.geometryGroup=this.device.createBindGroup({layout:this.geometryLayout,entries:[{binding:0,resource:{buffer:layer.buffer}},{binding:1,resource:{buffer:this.uniform}}]});
      }
      if(data.length)this.device.queue.writeBuffer(layer.buffer,0,data);
      const pass=encoder.beginRenderPass({colorAttachments:[{view:layer.view,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
      if(shapes.length){pass.setPipeline(this.shapePipeline);pass.setBindGroup(0,layer.geometryGroup);pass.draw(6,shapes.length);}
      pass.end();
    }
    this.device.queue.submit([encoder.finish()]);this.valid=true;return {...this.counts};
  }
  drawBehindCharacters(pass){this._draw(pass,'back');}
  drawAboveCharacters(pass){this._draw(pass,'front');}
  _draw(pass,name){if(!this.valid||this.disposed||!this.counts[name])return;pass.setPipeline(this.compositePipeline);pass.setBindGroup(0,this.layers[name].compositeGroup);pass.draw(3);}
  invalidate(){this.valid=false;}
  dispose(){if(this.disposed)return;this.valid=false;this.disposed=true;for(const l of Object.values(this.layers)){l.texture?.destroy();l.buffer?.destroy();}this.uniform?.destroy();this.device.removeEventListener('uncapturederror',this.errorHandler);}
}
