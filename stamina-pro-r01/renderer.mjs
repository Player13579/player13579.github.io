import {C,orderedSegments} from './math.mjs';
import {createMannequin} from './fixture.mjs';
export async function createGPU(){
  if(!globalThis.isSecureContext)throw new Error('WebGPU requires localhost or HTTPS. Use the included local server.');
  if(!navigator.gpu)throw new Error('WebGPU unavailable. No CPU/Canvas2D fallback is substituted.');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter)throw new Error('No WebGPU adapter available. Hardware quality remains NotRun.');
  const device=await adapter.requestDevice();
  const info=adapter.info??{};
  const metadata={vendor:info.vendor??'',architecture:info.architecture??'',device:info.device??'',
    description:info.description??'',isFallbackAdapter:info.isFallbackAdapter??adapter.isFallbackAdapter??null};
  const text=Object.values(metadata).join(' ');
  metadata.classification=/swiftshader|llvmpipe|lavapipe|software/i.test(text)||metadata.isFallbackAdapter===true?'software-adapter':'unverified-adapter';
  const errors=[];device.addEventListener('uncapturederror',e=>errors.push(String(e.error.message)));
  device.lost.then(lost=>errors.push(`DEVICE LOST: ${lost.reason}: ${lost.message}`));
  let source=await fetch(new URL('./shaders/stamina.wgsl',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Shader fetch failed');return r.text();});
  for(const[token,key]of Object.entries({PACKET_START:'packetStart',LANE_DELAY:'laneDelay',PACKET_SPACING:'packetSpacing',PACKET_TRAVEL:'packetTravel'}))source=source.replaceAll(`{{${token}}}`,`${C[key]}`);
  const shader=device.createShaderModule({label:'INWARD original WGSL',code:source});
  const compilation=await shader.getCompilationInfo();
  const messages=compilation.messages.map(m=>({type:m.type,line:m.lineNum,message:m.message}));
  if(messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(messages));
  const format=navigator.gpu.getPreferredCanvasFormat();
  const renderFormat=format.endsWith("-srgb")?format:`${format}-srgb`;
  return {adapter,device,metadata,shader,format,renderFormat,errors,messages};
}
export class StaminaRenderer {
  static async create(gpu,canvas){const r=new StaminaRenderer(gpu,canvas);await r.initialize();return r;}
  constructor(gpu,canvas){this.gpu=gpu;this.canvas=canvas;this.depth=null;this.destroyed=false;this.lastRadius=null;}
  async initialize(){
    const {device,format,renderFormat,shader}=this.gpu;
    this.context=this.canvas.getContext('webgpu');if(!this.context)throw new Error('Canvas WebGPU context unavailable');
    this.context.configure({device,format,alphaMode:'opaque',viewFormats:[renderFormat],usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
    this.uniform=device.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    this.instances=device.createBuffer({size:(C.laneCount*C.segmentsPerLane+24)*16,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
    const mesh=createMannequin();this.actorVertexCount=mesh.length/9;
    this.actorBuffer=device.createBuffer({size:mesh.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(this.actorBuffer,0,mesh);
    const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}]});
    const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
    this.bindGroup=device.createBindGroup({layout,entries:[{binding:0,resource:{buffer:this.uniform}}]});
    device.pushErrorScope('validation');
    this.ribbonPipeline=await device.createRenderPipelineAsync({label:'Textureless six intake lanes and body charge',layout:pipelineLayout,
      vertex:{module:shader,entryPoint:'ribbon_vertex',buffers:[{arrayStride:16,stepMode:'instance',attributes:[{shaderLocation:0,offset:0,format:'float32x4'}]}]},
      fragment:{module:shader,entryPoint:'ribbon_fragment',targets:[{format:renderFormat,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
      primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less-equal'}});
    this.actorPipeline=await device.createRenderPipelineAsync({label:'H64 geometric receiver / depth fixture',layout:pipelineLayout,
      vertex:{module:shader,entryPoint:'actor_vertex',buffers:[{arrayStride:36,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'}]}]},
      fragment:{module:shader,entryPoint:'actor_fragment',targets:[{format:renderFormat}]},primitive:{topology:'triangle-list',cullMode:'none'},
      depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}});
    const error=await device.popErrorScope();if(error)throw new Error(error.message);
  }
  resize(width,height){
    if(this.canvas.width===width&&this.canvas.height===height&&this.depth)return;
    this.canvas.width=width;this.canvas.height=height;this.depth?.destroy();
    this.depth=this.gpu.device.createTexture({size:[width,height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
  }
  /** Prepare uniforms. scale is physical framebuffer pixels per game pixel, NOT CSS zoom. */
  prepare({sample=null,scale=1,origin=[this.canvas.width/2,this.canvas.height*.7],light=false,showActor=true,glow=1}={}){
    if(!Number.isFinite(scale)||scale<=0||origin.some(v=>!Number.isFinite(v)))throw new TypeError('Invalid render transform');
    const p=sample?.progress??-1, radius=sample?.radius??C.referenceRadius;
    const data=new Float32Array(32);
    data.set([this.canvas.width,this.canvas.height,scale,0],0);data.set([origin[0],origin[1],0,0],4);
    data.set([p,radius,sample?.opacity??0,sample?.charge??0],8);data.set([light?1:0,showActor?1:0,glow,1],12);
    data.set([sample?.flux??0,sample?.ageMs??0,0,0],16);data.set([.965925826,.258819045,0,0],20);
    if(!data.every(Number.isFinite))throw new RangeError("Render uniforms exceed finite f32 range");
    this.gpu.device.queue.writeBuffer(this.uniform,0,data);
    if(radius!==this.lastRadius){this.gpu.device.queue.writeBuffer(this.instances,0,orderedSegments(radius));this.lastRadius=radius;}
    this.current={sample,showActor,light};
  }
  /** Optional verification fixture. Production hosts draw their own actor to the SAME depth attachment. */
  encodeFixture(pass){pass.setPipeline(this.actorPipeline);pass.setBindGroup(0,this.bindGroup);pass.setVertexBuffer(0,this.actorBuffer);pass.draw(this.actorVertexCount);}
  /** Host draws opaque geometry first. Keep the same projection / depth mapping. See integration docs. */
  encodeEffect(pass){
    if(!this.current?.sample?.active||this.current.sample.opacity<=0)return;
    pass.setPipeline(this.ribbonPipeline);pass.setBindGroup(0,this.bindGroup);pass.setVertexBuffer(0,this.instances);
    pass.draw(6,C.laneCount*C.segmentsPerLane+24);
  }
  render(options={}){
    if(this.destroyed)return;this.prepare(options);
    if(!this.depth)this.resize(this.canvas.width,this.canvas.height);
    const d=this.gpu.device;const encoder=d.createCommandEncoder();
    const bg=options.light?{r:.88,g:.89,b:.875,a:1}:{r:.035,g:.045,b:.065,a:1};
    const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView({format:this.gpu.renderFormat}),clearValue:bg,loadOp:'clear',storeOp:'store'}],
      depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
    if(options.showActor!==false)this.encodeFixture(pass);this.encodeEffect(pass);pass.end();d.queue.submit([encoder.finish()]);
  }
  destroy(){this.destroyed=true;this.depth?.destroy();this.uniform.destroy();this.instances.destroy();this.actorBuffer.destroy();this.context.unconfigure();}
}
