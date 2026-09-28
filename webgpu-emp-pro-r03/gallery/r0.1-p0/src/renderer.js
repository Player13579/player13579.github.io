import {buildEffects,STRIDE} from './geometry.js';
/** Transparent WebGPU surface. Diagnostics/background belong to the caller, not this renderer. */
export class EMPGPU {
  static async create(canvas,options={}){
    if(!globalThis.isSecureContext)throw new Error('WebGPU requires localhost or HTTPS. Run the included launcher, not file://.');
    if(!navigator.gpu)throw new Error('This browser exposes no WebGPU. Use a WebGPU-capable browser and enabled GPU acceleration.');
    const adapter=options.device?null:await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!options.device&&!adapter)throw new Error('No WebGPU adapter available. This is not replaced by a Canvas/WebGL imitation.');
    const device=options.device??await adapter.requestDevice();
    const r=new EMPGPU(canvas,device,adapter,options);await r.init();return r;
  }
  constructor(canvas,device,adapter,options){
    this.canvas=canvas;this.device=device;this.adapter=adapter;this.ownsDevice=!options.device;
    this.options=options;this.errors=[];this.stats={triangles:0,vertices:0,frames:0,deviceLost:false};
    this.center={x:0,y:0};this.scale=1;this.draft=options.draft??false;this.occluders=[];
    this.onError=options.onError??(()=>{});this.maxBytes=32*1024*1024;
    this.errorListener=e=>{this.errors.push(e.error.message);this.onError(e.error.message);};
    device.addEventListener('uncapturederror',this.errorListener);
    device.lost.then(info=>{this.stats.deviceLost=true;this.onError(`GPU device lost: ${info.reason} ${info.message}`);});
  }
  async init(){
    const d=this.device;
    const urls=[new URL('../shaders/mesh.wgsl',import.meta.url),new URL('../shaders/composite.wgsl',import.meta.url)];
    const code=await Promise.all(urls.map(async u=>{const r=await fetch(u);if(!r.ok)throw new Error(`Shader fetch ${r.status}: ${u}`);return r.text();}));
    const modules=code.map((c,i)=>d.createShaderModule({label:urls[i].pathname,code:c}));
    for(const mod of modules){const info=await mod.getCompilationInfo();const errs=info.messages.filter(m=>m.type==='error');if(errs.length)throw new Error(errs.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));}
    d.pushErrorScope('validation');
    this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('Cannot obtain GPU canvas context');
    this.format=navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({device:d,format:this.format,alphaMode:'premultiplied'});
    this.camera=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.settings=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.vertex=d.createBuffer({size:this.maxBytes,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
    const buffers=[{arrayStride:STRIDE*4,attributes:[
      {shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},
      {shaderLocation:2,offset:24,format:'float32x4'},{shaderLocation:3,offset:40,format:'float32x2'}]}];
    const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
    const desc={layout:'auto',vertex:{module:modules[0],entryPoint:'vertex_main',buffers},
      fragment:{module:modules[0],entryPoint:'fragment_main',targets:[{format:'rgba16float',blend}]},
      primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less-equal'}};
    this.pipeline=await d.createRenderPipelineAsync(desc);
    this.opaquePipeline=await d.createRenderPipelineAsync({...desc,depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'}});
    this.composite=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vertex_main'},
      fragment:{module:modules[1],entryPoint:'fragment_main',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
    this.cameraGroup=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.camera}}]});
    this.opaqueGroup=d.createBindGroup({layout:this.opaquePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.camera}}]});
    this.sampler=d.createSampler({magFilter:'linear',minFilter:'linear'});
    const err=await d.popErrorScope();if(err)throw new Error(err.message);
    this.resize();
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,this.options.maxDpr??2);
    const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
    this.cssWidth=rect.width;this.cssHeight=rect.height;this.dpr=dpr;
    if(this.canvas.width===w&&this.canvas.height===h&&this.hdr)return;
    this.canvas.width=w;this.canvas.height=h;this.hdr?.destroy();this.depth?.destroy();
    this.hdr=this.device.createTexture({size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
    this.depth=this.device.createTexture({size:[w,h],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
    this.compositeGroup=this.device.createBindGroup({layout:this.composite.getBindGroupLayout(0),entries:[
      {binding:0,resource:this.hdr.createView()},{binding:1,resource:this.sampler},{binding:2,resource:{buffer:this.settings}}]});
  }
  setView({center=this.center,pixelsPerGamePixel=this.scale}={}){this.center={...center};this.scale=pixelsPerGamePixel;}
  render(events,actorMs){
    if(this.stats.deviceLost)return;
    this.resize();
    const geo=buildEffects(events,actorMs,{draft:this.draft,occluders:this.occluders});
    if(geo.opaque.byteLength+geo.transparent.byteLength>this.maxBytes)throw new Error('Geometry capacity exceeded; reduce concurrent visible events');
    const d=this.device;
    if(geo.opaque.byteLength)d.queue.writeBuffer(this.vertex,0,geo.opaque);
    if(geo.transparent.byteLength)d.queue.writeBuffer(this.vertex,geo.opaque.byteLength,geo.transparent);
    d.queue.writeBuffer(this.camera,0,new Float32Array([this.canvas.width,this.canvas.height,this.center.x,-this.center.y,this.scale*this.dpr,actorMs/1000,this.draft?1:0,0]));
    d.queue.writeBuffer(this.settings,0,new Float32Array([this.canvas.width,this.canvas.height,this.draft?0:.11,1.1,1,0,0,0]));
    const enc=d.createCommandEncoder();
    const pass=enc.beginRenderPass({colorAttachments:[{view:this.hdr.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}],
      depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
    if(geo.opaque.length){pass.setPipeline(this.opaquePipeline);pass.setBindGroup(0,this.opaqueGroup);pass.setVertexBuffer(0,this.vertex,0,geo.opaque.byteLength);pass.draw(geo.opaque.length/STRIDE);}
    if(geo.transparent.length){pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.cameraGroup);pass.setVertexBuffer(0,this.vertex,geo.opaque.byteLength,geo.transparent.byteLength);pass.draw(geo.transparent.length/STRIDE);}
    pass.end();
    const final=enc.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
    final.setPipeline(this.composite);final.setBindGroup(0,this.compositeGroup);final.draw(3);final.end();d.queue.submit([enc.finish()]);
    this.stats={...this.stats,frames:this.stats.frames+1,triangles:geo.triangleCount,vertices:(geo.opaque.length+geo.transparent.length)/STRIDE};
  }
  dispose(){this.device.removeEventListener('uncapturederror',this.errorListener);this.hdr?.destroy();this.depth?.destroy();this.vertex?.destroy();this.camera?.destroy();this.settings?.destroy();this.context?.unconfigure();if(this.ownsDevice)this.device.destroy();}
}
