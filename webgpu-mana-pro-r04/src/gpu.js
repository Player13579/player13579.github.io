import {sampleInstances,packMeshes} from './sampler.js';
const PREMULT={color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
const ADD={color:{operation:'add',srcFactor:'one',dstFactor:'one'},alpha:{operation:'add',srcFactor:'zero',dstFactor:'one'}};
export const GPU_CONTRACT=Object.freeze({vertexStride:64,workingFormat:'rgba16float',bloomStepGamePx:0.60,bloomGain:0.42,sourceIntensity:3.6});
async function hashText(code){if(!globalThis.crypto?.subtle)return null;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function loadWGSL(device,url,label){
  const response=await fetch(url);if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
  const code=await response.text();
  // Fail before API submission for the exact former class of failure. This is a lint, not a compiler substitute.
  const stripped=code.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  if(stripped.includes('?'))throw new SyntaxError(`${label}: WGSL cannot contain a question-mark operator`);
  const module=device.createShaderModule({label,code});
  const info=await module.getCompilationInfo();
  const messages=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum,column:m.linePos}));
  if(messages.some(m=>m.type==='error'))throw new Error(`${label}\n${messages.map(m=>`${m.line}:${m.column} ${m.message}`).join('\n')}`);
  return {module,report:{label,sha256:await hashText(code),compilationInfo:'completed',messages}};
}
export async function requestDevice(){
  if(!navigator.gpu)throw new Error('WebGPU is unavailable in this context. No CPU-image fallback is substituted.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('No WebGPU adapter. GPU render checks remain not_run.');
  const device=await adapter.requestDevice();
  return {device,adapter,format:navigator.gpu.getPreferredCanvasFormat(),info:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,description:adapter.info?.description,device:adapter.info?.device,isFallbackAdapter:adapter.info?.isFallbackAdapter}};
}
export class ManaGainRenderer {
  static async create(options){const r=new ManaGainRenderer(options);try{await r.init();return r;}catch(e){r.dispose();throw e;}}
  constructor({device,presentationFormat='bgra8unorm',onDiagnostic=()=>{}}){
    if(!device)throw new TypeError('host GPUDevice is required');
    if(!['bgra8unorm','rgba8unorm'].includes(presentationFormat))throw new TypeError('present writes sRGB-encoded output into an unorm, not an sRGB, canvas');
    Object.assign(this,{device,presentationFormat,onDiagnostic});this.valid=false;this.closed=false;this.lost=false;this.size=[0,0];this.layers={back:{count:0},front:{count:0}};
    this.errorHandler=e=>{this.valid=false;onDiagnostic({type:'gpu-error',message:e.error?.message??String(e)});};
    device.addEventListener('uncapturederror',this.errorHandler);
    device.lost.then(info=>{this.valid=false;this.lost=true;onDiagnostic({type:'device-lost',reason:info.reason,message:info.message});});
  }
  async init(){
    const d=this.device;d.pushErrorScope('validation');
    try{
      const shape=await loadWGSL(d,new URL('../shaders/mana.wgsl',import.meta.url),'mana-r04-original');
      const post=await loadWGSL(d,new URL('../shaders/post.wgsl',import.meta.url),'mana-r04-observation');
      this.compilation=[shape.report,post.report];
      this.meshLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'uniform',minBindingSize:32}}]});
      this.shape=await d.createRenderPipelineAsync({label:'r04-native-mesh',layout:d.createPipelineLayout({bindGroupLayouts:[this.meshLayout]}),vertex:{module:shape.module,entryPoint:'vs',buffers:[{arrayStride:64,stepMode:'vertex',attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32x4'},{shaderLocation:3,offset:32,format:'float32x4'},{shaderLocation:4,offset:48,format:'float32x4'}]}]},fragment:{module:shape.module,entryPoint:'fs',targets:[{format:'rgba16float',blend:PREMULT},{format:'rgba16float',blend:ADD}]},primitive:{topology:'triangle-list',cullMode:'none'}});
      this.postLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:32}}]});
      const pl=d.createPipelineLayout({bindGroupLayouts:[this.postLayout]});
      const pipeline=(entry,format,blend)=>d.createRenderPipelineAsync({label:`r04-${entry}`,layout:pl,vertex:{module:post.module,entryPoint:'vs'},fragment:{module:post.module,entryPoint:entry,targets:[{format,...(blend?{blend}:{})}]},primitive:{topology:'triangle-list'}});
      this.blur=await pipeline('fs_blur','rgba16float');this.surface=await pipeline('fs_surface','rgba16float',PREMULT);this.emission=await pipeline('fs_emission','rgba16float',ADD);this.presentation=await pipeline('fs_present',this.presentationFormat);
      this.sampler=d.createSampler({label:'r04-local-linear-clamp',minFilter:'linear',magFilter:'linear',mipmapFilter:'nearest',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge',addressModeW:'clamp-to-edge',lodMinClamp:0,lodMaxClamp:0,maxAnisotropy:1});
      const uniform=size=>d.createBuffer({size,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.viewBuffer=uniform(32);this.postBuffer=uniform(32);this.horizontal=uniform(32);this.vertical=uniform(32);
      this.viewGroup=d.createBindGroup({layout:this.meshLayout,entries:[{binding:0,resource:{buffer:this.viewBuffer}}]});
    }finally{const error=await d.popErrorScope();if(error)throw new Error(`r0.4 pipeline validation: ${error.message}`);}
  }
  texture(w,h,label){const texture=this.device.createTexture({label,size:[w,h],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});return {texture,view:texture.createView()};}
  group(src,aux,buffer=this.postBuffer){return this.device.createBindGroup({layout:this.postLayout,entries:[{binding:0,resource:src},{binding:1,resource:aux},{binding:2,resource:this.sampler},{binding:3,resource:{buffer}}]});}
  resize(w,h){
    if(this.size[0]===w&&this.size[1]===h)return;
    this.scratch?.texture.destroy();this.scratch=this.texture(w,h,'r04-horizontal-bloom');
    for(const [name,l] of Object.entries(this.layers)){
      for(const field of ['color','light','bloom'])l[field]?.texture.destroy();
      l.color=this.texture(w,h,`${name}-colored-surface`);l.light=this.texture(w,h,`${name}-HDR-emission`);l.bloom=this.texture(w,h,`${name}-source-bound-bloom`);
      l.blurH=this.group(l.light.view,l.light.view,this.horizontal);l.blurV=this.group(this.scratch.view,this.scratch.view,this.vertical);
      l.surfaceGroup=this.group(l.color.view,l.color.view);l.emissionGroup=this.group(l.light.view,l.bloom.view);
    }
    this.size=[w,h];
  }
  prepare(instances,view){
    if(this.closed||this.lost)throw new Error('renderer disposed or device lost');
    this.valid=false;
    const {width,height,scale=1,dpr=1,cameraX=0,cameraY=0,originX=width/2,originY=height/2,postEffects=true}=view;
    if(![width,height,scale,dpr].every(v=>Number.isFinite(v)&&v>0)||![cameraX,cameraY,originX,originY].every(Number.isFinite))throw new RangeError('invalid viewport');
    const owners=new Set(instances.map(v=>v.beneficiaryPlayerId));if(owners.size>1)throw new Error('Use one renderer slot per beneficiary for correct owner-specific occlusion');
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));if(Math.max(w,h)>this.device.limits.maxTextureDimension2D)throw new RangeError('texture limit exceeded');
    this.resize(w,h);
    const samples=sampleInstances(instances);let meshes=samples.flatMap(s=>s.meshes);
    if(view.debugLabels)meshes=meshes.filter(m=>view.debugLabels.some(label=>m.label.startsWith(label)));
    const q=this.device.queue;
    q.writeBuffer(this.viewBuffer,0,new Float32Array([w,h,scale,dpr,cameraX,cameraY,originX,originY]));
    q.writeBuffer(this.postBuffer,0,new Float32Array([0,0,postEffects?GPU_CONTRACT.bloomGain:0,0,0,0,0,0]));
    q.writeBuffer(this.horizontal,0,new Float32Array([GPU_CONTRACT.bloomStepGamePx*scale*dpr/w,0,0,0,0,0,0,0]));
    q.writeBuffer(this.vertical,0,new Float32Array([0,GPU_CONTRACT.bloomStepGamePx*scale*dpr/h,0,0,0,0,0,0]));
    const enc=this.device.createCommandEncoder({label:'r04-preparation'});
    for(const [name,l] of Object.entries(this.layers)){
      const data=packMeshes(meshes,name);l.count=data.length/16;
      if(!l.vertexBuffer||l.capacity<data.byteLength){l.vertexBuffer?.destroy();l.capacity=2**Math.ceil(Math.log2(Math.max(64,data.byteLength)));l.vertexBuffer=this.device.createBuffer({label:`r04-${name}-vertices`,size:l.capacity,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});}
      if(data.length)q.writeBuffer(l.vertexBuffer,0,data);
      const attachment=v=>({view:v,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'});
      const pass=enc.beginRenderPass({label:`r04-${name}-shape`,colorAttachments:[attachment(l.color.view),attachment(l.light.view)]});
      if(l.count){pass.setPipeline(this.shape);pass.setBindGroup(0,this.viewGroup);pass.setVertexBuffer(0,l.vertexBuffer);pass.draw(l.count);}pass.end();
      for(const [target,bind] of [[this.scratch.view,l.blurH],[l.bloom.view,l.blurV]]){const p=enc.beginRenderPass({colorAttachments:[attachment(target)]});if(l.count&&postEffects){p.setPipeline(this.blur);p.setBindGroup(0,bind);p.draw(3);}p.end();}
    }
    q.submit([enc.finish()]);this.valid=true;this.lastSamples=samples;
    return {owner:[...owners][0]??null,backVertices:this.layers.back.count,frontVertices:this.layers.front.count};
  }
  draw(pass,layer){const l=this.layers[layer];if(!l)throw new TypeError('layer must be back or front');if(!this.valid||this.closed||!l.count)return;
    pass.setPipeline(this.surface);pass.setBindGroup(0,l.surfaceGroup);pass.draw(3);
    pass.setPipeline(this.emission);pass.setBindGroup(0,l.emissionGroup);pass.draw(3);
  }
  // Scene must be linear HDR. Bloom/composition cannot silently target an sRGB framebuffer.
  present(encoder,sceneView,outputView){const group=this.group(sceneView,sceneView),p=encoder.beginRenderPass({colorAttachments:[{view:outputView,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});p.setPipeline(this.presentation);p.setBindGroup(0,group);p.draw(3);p.end();}
  invalidate(){this.valid=false;}
  dispose(){if(this.closed)return;this.closed=true;this.valid=false;for(const l of Object.values(this.layers)){l.vertexBuffer?.destroy();for(const f of ['color','light','bloom'])l[f]?.texture.destroy();}this.scratch?.texture.destroy();for(const b of ['viewBuffer','postBuffer','horizontal','vertical'])this[b]?.destroy();this.device.removeEventListener('uncapturederror',this.errorHandler);}
}
