import {buildGeometry,STRIDE} from './geometry.js';
import {point,finite} from './contract.js';
/** WebGPU only. Explicit texture/sampler layouts, MSAA resolve, premultiplied-alpha contract. */
export class EMPGPU{
 static async create(canvas,options={}){
  if(!globalThis.isSecureContext)throw new Error('localhost / HTTPS required. Run START or npm start; do not use file://.');
  if(!navigator.gpu)throw new Error('WebGPU unavailable. No Canvas/WebGL substitute is reported as GPU verification.');
  const adapter=options.device?null:await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!options.device&&!adapter)throw new Error('No WebGPU adapter. Runtime verification remains not_run.');
  const device=options.device??await adapter.requestDevice();const r=new EMPGPU(canvas,device,adapter,options);try{await r.init();return r;}catch(e){r.dispose();throw e;}
 }
 constructor(canvas,device,adapter,options){this.canvas=canvas;this.device=device;this.adapter=adapter;this.options=options;this.ownsDevice=!options.device;
  this.scale=1;this.center={x:0,y:0};this.quality=options.quality??'high';this.occlusion=[];this.background=[0,0,0,0];this.disposed=false;
  this.errors=[];this.compilation=[];this.maxBytes=32*1024*1024;this.stats={frames:0,triangles:0,deviceLost:false};
  this.listener=e=>{this.errors.push(e.error.message);options.onError?.(e.error.message);};device.addEventListener('uncapturederror',this.listener);
  device.lost.then(info=>{if(!this.disposed){this.stats.deviceLost=true;const m=`Device lost: ${info.reason} ${info.message}`;this.errors.push(m);options.onError?.(m);}});
 }
 async init(){const d=this.device;
  this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('WebGPU canvas context unavailable');this.format=navigator.gpu.getPreferredCanvasFormat();
  this.context.configure({device:d,format:this.format,alphaMode:'premultiplied',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  const codes=await Promise.all(['mesh','composite'].map(async n=>{const r=await fetch(new URL(`../shaders/${n}.wgsl`,import.meta.url));if(!r.ok)throw new Error(`Shader ${n}: HTTP ${r.status}`);return r.text();}));
  this.modules=codes.map((code,i)=>d.createShaderModule({code,label:['mesh','composite'][i]}));
  for(let i=0;i<this.modules.length;i++){const info=await this.modules[i].getCompilationInfo();this.compilation.push({shader:['mesh','composite'][i],messages:info.messages.map(m=>({type:m.type,line:m.lineNum,column:m.linePos,message:m.message}))});if(info.messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(this.compilation));}
  d.pushErrorScope('validation');
  try {
  this.camera=d.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.settings=d.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.vertex=d.createBuffer({size:this.maxBytes,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
  this.meshLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'uniform',minBindingSize:32}}]});
  this.postLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float',viewDimension:'2d',multisampled:false}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:48}}]});
  this.sampler=d.createSampler({label:'rgba16float linear clamp; no mipmaps',magFilter:'linear',minFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',lodMinClamp:0,lodMaxClamp:0});
  this.cameraGroup=d.createBindGroup({layout:this.meshLayout,entries:[{binding:0,resource:{buffer:this.camera}}]});
  this.pipelines={};
  for(const sampleCount of[1,4]){const common={layout:d.createPipelineLayout({bindGroupLayouts:[this.meshLayout]}),vertex:{module:this.modules[0],entryPoint:'vertex_main',buffers:[{arrayStride:STRIDE*4,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'},{shaderLocation:3,offset:36,format:'float32x3'},{shaderLocation:4,offset:48,format:'float32x2'}]}]},primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:sampleCount},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less-equal'},fragment:{module:this.modules[0],entryPoint:'fragment_main',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]}};
   this.pipelines[sampleCount]={effect:await d.createRenderPipelineAsync(common),opaque:await d.createRenderPipelineAsync({...common,depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'}})};
  }
  this.post=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[this.postLayout]}),vertex:{module:this.modules[1],entryPoint:'vertex_main'},fragment:{module:this.modules[1],entryPoint:'fragment_main',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
  } finally {const error=await d.popErrorScope();if(error)throw new Error(error.message);}
  this.resize(true);
 }
 resize(force=false){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(globalThis.devicePixelRatio||1,2),w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr)),samples=this.quality==='high'?4:1;
  if(w>this.device.limits.maxTextureDimension2D||h>this.device.limits.maxTextureDimension2D)throw new RangeError('Canvas exceeds GPU texture dimensions; resize display, not game coordinates');
  this.cssWidth=rect.width;this.cssHeight=rect.height;this.dpr=dpr;
  if(!force&&this.canvas.width===w&&this.canvas.height===h&&this.samples===samples&&this.hdr)return;
  this.canvas.width=w;this.canvas.height=h;this.samples=samples;this.hdr?.destroy();this.depth?.destroy();this.msaa?.destroy();
  this.hdr=this.device.createTexture({label:'resolved HDR',size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
  this.msaa=samples===4?this.device.createTexture({label:'4x HDR',size:[w,h],sampleCount:4,format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT}):null;
  this.depth=this.device.createTexture({label:'host silhouette depth',size:[w,h],sampleCount:samples,format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
  this.postGroup=this.device.createBindGroup({layout:this.postLayout,entries:[{binding:0,resource:this.hdr.createView()},{binding:1,resource:this.sampler},{binding:2,resource:{buffer:this.settings}}]});
 }
 setView({center=this.center,pixelsPerGamePixel=this.scale}={}){this.center=point(center);finite(pixelsPerGamePixel);if(pixelsPerGamePixel<=0)throw new RangeError('positive view scale');this.scale=pixelsPerGamePixel;}
 setQuality(q){if(!['high','low'].includes(q))throw new TypeError('quality high or low');this.quality=q;}
 setBackground(rgba){if(!Array.isArray(rgba)||rgba.length!==4||rgba.some(x=>!Number.isFinite(x)||x<0||x>1))throw new TypeError('background rgba 0..1');this.background=[...rgba];}
 render(samples,actorMs){if(this.disposed||this.stats.deviceLost)return;this.resize();const geo=buildGeometry(samples,{quality:this.quality,occlusion:this.occlusion});const bytes=geo.opaque.byteLength+geo.transparent.byteLength;if(bytes>this.maxBytes)throw new RangeError('Geometry capacity exceeded; host must cull offscreen effects');const d=this.device;
  if(geo.opaque.length)d.queue.writeBuffer(this.vertex,0,geo.opaque);if(geo.transparent.length)d.queue.writeBuffer(this.vertex,geo.opaque.byteLength,geo.transparent);
  d.queue.writeBuffer(this.camera,0,new Float32Array([this.canvas.width,this.canvas.height,this.center.x,-this.center.y,this.scale*this.dpr,actorMs/1000,0,0]));
  d.queue.writeBuffer(this.settings,0,new Float32Array([this.canvas.width,this.canvas.height,.085,1.04,...this.background,this.dpr,0,0,0]));
  const enc=d.createCommandEncoder(),resolved=this.hdr.createView();
  const pass=enc.beginRenderPass({colorAttachments:[{view:this.msaa?this.msaa.createView():resolved,...(this.msaa?{resolveTarget:resolved}:{}),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:this.msaa?'discard':'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  for(const[buffer,key,offset]of[[geo.opaque,'opaque',0],[geo.transparent,'effect',geo.opaque.byteLength]])if(buffer.length){pass.setPipeline(this.pipelines[this.samples][key]);pass.setBindGroup(0,this.cameraGroup);pass.setVertexBuffer(0,this.vertex,offset,buffer.byteLength);pass.draw(buffer.length/STRIDE);}pass.end();
  const final=enc.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});final.setPipeline(this.post);final.setBindGroup(0,this.postGroup);final.draw(3);final.end();d.queue.submit([enc.finish()]);
  this.stats={...this.stats,frames:this.stats.frames+1,triangles:geo.triangleCount,bytes,branches:geo.branches,sampleCount:this.samples,H64CssPx:64*this.scale,H64DevicePx:64*this.scale*this.dpr};
 }
 async frameCheck(samples,time){this.device.pushErrorScope('validation');try{this.render(samples,time);await this.device.queue.onSubmittedWorkDone();}finally{const err=await this.device.popErrorScope();if(err)this.errors.push(err.message);}return{gpuErrors:[...this.errors],stats:this.stats};}
 diagnostics(){const info=this.adapter?.info;return{adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,softwareClassification:'Inspect adapter description; requestAdapter does not prove hardware execution',compilation:this.compilation,errors:[...this.errors],...this.stats};}
 dispose(){if(this.disposed)return;this.disposed=true;this.device.removeEventListener('uncapturederror',this.listener);for(const k of['hdr','msaa','depth','camera','settings','vertex'])this[k]?.destroy();this.context?.unconfigure();if(this.ownsDevice)this.device.destroy();}
}
