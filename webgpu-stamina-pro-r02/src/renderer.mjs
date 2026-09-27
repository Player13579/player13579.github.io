import {C} from './constants.mjs';
import {effectTriangles,fixtureGeometry,projectionMatrix,STRIDE_FLOATS} from './geometry.mjs';
export function classifyAdapter(info){
 const description=[info?.vendor,info?.architecture,info?.device,info?.description].filter(Boolean).join(' ');
 if(info?.isFallbackAdapter===true||/swiftshader|llvmpipe|lavapipe|software|basic render/i.test(description))return 'software_adapter';
 return description?'hardware_candidate_not_independently_verified':'unknown_adapter';
}
export async function createGPU(){
 if(!globalThis.isSecureContext)throw Error('WebGPU requires a secure context (localhost or HTTPS).');
 if(!navigator.gpu)throw Error('WebGPU is unavailable. No CPU/Canvas2D fallback is supplied.');
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
 if(!adapter)throw Error('No WebGPU adapter. No substitute renderer is used.');
 const device=await adapter.requestDevice();const errors=[];
 device.addEventListener('uncapturederror',e=>errors.push(String(e.error?.message??e.error)));
 device.lost.then(i=>errors.push(`device_lost: ${i.reason}: ${i.message}`));
 const responses=await Promise.all(['constants.wgsl','stamina.wgsl'].map(n=>fetch(new URL(`./shaders/${n}`,import.meta.url))));
 for(const r of responses)if(!r.ok)throw Error(`Shader load ${r.status}`);
 const code=(await Promise.all(responses.map(r=>r.text()))).join('\n');
 device.pushErrorScope('validation');
 const shader=device.createShaderModule({label:'RESERVE r0.2 — procedural geometry',code});
 const compilation=await shader.getCompilationInfo();
 const shaderError=await device.popErrorScope();
 const messages=[...compilation.messages].map(m=>({type:m.type,line:m.lineNum,column:m.linePos,message:m.message}));
 if(shaderError||messages.some(m=>m.type==='error'))throw Error(JSON.stringify({shaderError:shaderError?.message,messages}));
 const format=navigator.gpu.getPreferredCanvasFormat();const renderFormat=`${format}-srgb`;
 const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:80}}]});
 const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
 const buffers=[{arrayStride:STRIDE_FLOATS*4,attributes:[
  {shaderLocation:0,offset:0,format:'float32x3'}, {shaderLocation:1,offset:12,format:'float32x2'},
  {shaderLocation:2,offset:20,format:'float32x4'},{shaderLocation:3,offset:36,format:'float32x4'},
  {shaderLocation:4,offset:52,format:'float32x4'}]}];
 const base={layout:pipelineLayout,vertex:{module:shader,entryPoint:'vs',buffers},primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:1}};
 device.pushErrorScope('validation');
 const opaque=await device.createRenderPipelineAsync({...base,fragment:{module:shader,entryPoint:'fs',targets:[{format:renderFormat}]},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less-equal'}});
 const effect=await device.createRenderPipelineAsync({...base,fragment:{module:shader,entryPoint:'fs',targets:[{format:renderFormat,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'less-equal'}});
 const pipelineError=await device.popErrorScope();if(pipelineError)throw Error(pipelineError.message);
 const i=adapter.info??{};const info={vendor:i.vendor??'',architecture:i.architecture??'',device:i.device??'',description:i.description??'',isFallbackAdapter:i.isFallbackAdapter??null};
 return {adapter,device,format,renderFormat,shader,messages,layout,opaque,effect,errors,metadata:{adapter:info,classification:classifyAdapter(info),userAgent:navigator.userAgent,compilation:'pass',pipelineCreation:'pass',qualityReview:'not_run'}};
}
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export class StaminaRenderer {
 constructor(gpu,canvas){
  this.gpu=gpu;this.canvas=canvas;this.context=canvas.getContext('webgpu');if(!this.context)throw Error('Canvas WebGPU context unavailable');
  this.context.configure({device:gpu.device,format:gpu.format,viewFormats:[gpu.renderFormat],alphaMode:'opaque'});
  this.uniform=gpu.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.bind=gpu.device.createBindGroup({layout:gpu.layout,entries:[{binding:0,resource:{buffer:this.uniform}}]});
  this.buffers={};this.counts={fixture:0,effect:0};this.stats={frames:0,triangles:0};
  this.resize(canvas.width,canvas.height);
 }
 static async create(gpu,canvas){return new StaminaRenderer(gpu,canvas);}
 resize(w,h){if(!Number.isInteger(w)||w<1||!Number.isInteger(h)||h<1)throw Error('Invalid render size');this.canvas.width=w;this.canvas.height=h;this.depth?.destroy();this.depth=this.gpu.device.createTexture({size:[w,h],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});}
 #upload(name,data){
  let r=this.buffers[name];if(!r||r.size<data.byteLength){r?.buffer.destroy();const size=Math.max(256,2**Math.ceil(Math.log2(Math.max(data.byteLength,1))));r={size,buffer:this.gpu.device.createBuffer({size,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST})};this.buffers[name]=r;}
  if(data.byteLength)this.gpu.device.queue.writeBuffer(r.buffer,0,data);this.counts[name]=data.length/STRIDE_FLOATS;
 }
 prepare({samples=[],actors=[],scale=1,origin,showActor=true,crossArm=false,projection}={}){
  if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid scale');
  const matrix=projection??projectionMatrix(this.canvas.width,this.canvas.height,scale,origin);
  if(matrix.length!==16||[...matrix].some(x=>!Number.isFinite(x)))throw Error('Invalid projection');
  const data=new Float32Array(20);data.set(matrix);data.set([scale,this.canvas.width,this.canvas.height,0],16);
  this.gpu.device.queue.writeBuffer(this.uniform,0,data);
  this.#upload('fixture',showActor?fixtureGeometry(actors,{crossArm}):new Float32Array());
  this.#upload('effect',effectTriangles(samples));this.stats.triangles=(this.counts.fixture+this.counts.effect)/3;
 }
 #encode(pass,name,pipeline){if(!this.counts[name])return;pass.setPipeline(pipeline);pass.setBindGroup(0,this.bind);pass.setVertexBuffer(0,this.buffers[name].buffer);pass.draw(this.counts[name]);}
 encodeFixture(pass){this.#encode(pass,'fixture',this.gpu.opaque);}
 encodeEffect(pass){this.#encode(pass,'effect',this.gpu.effect);}
 render(options={}){
  this.prepare(options);const color=(options.light?C.lightBackground:C.darkBackground).map(linear);
  const encoder=this.gpu.device.createCommandEncoder();
  const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView({format:this.gpu.renderFormat}),clearValue:{r:color[0],g:color[1],b:color[2],a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  this.encodeFixture(pass);this.encodeEffect(pass);pass.end();this.gpu.device.queue.submit([encoder.finish()]);this.stats.frames++;
 }
 destroy(){this.depth?.destroy();this.uniform.destroy();for(const b of Object.values(this.buffers))b.buffer.destroy();this.context.unconfigure();}
}
