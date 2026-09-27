/** WebGPU-only reference renderer. No image decoding, CPU rasterization or 2D canvas. */
import {VERSION,BRANCHES,DURATIONS_MS,SHAPE,packUniforms,makeGridIndices} from './barrier-pro-sampler.mjs';
import {geometry,material} from './barrier-pro-kernel.mjs';
import {BACKGROUNDS,decodeHalf,measureFrame} from './barrier-pro-metrics.mjs';
const displayWGSL=`
struct D {size:vec4f,bg:vec4f};
@group(0) @binding(0) var inputImage:texture_2d<f32>;
@group(0) @binding(1) var<uniform> d:D;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {let c=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(c[i],0,1);}
fn srgb(c:vec3f)->vec3f{return select(12.92*c,1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn composite(@builtin(position) p:vec4f)->@location(0) vec4f {
 let f=textureLoad(inputImage,vec2i(p.xy),0);var bg=d.bg.xyz;
 if(d.bg.w>0.5){let parity=(i32(p.x)/4+i32(p.y)/4)%2;bg=select(vec3f(.025),vec3f(.65),parity==0);}
 var c=f.rgb+(1.-f.a)*bg;
 // Fixed unit-peak compression only above one. Background never changes the field.
 c=c/max(1.,max(c.r,max(c.g,c.b)));
 if(d.size.z>0.5){c=vec3f(dot(c,vec3f(.2126,.7152,.0722)));}
 return vec4f(srgb(max(c,vec3f(0))),1.);
}
@fragment fn present(@builtin(position) p:vec4f)->@location(0) vec4f {return textureLoad(inputImage,vec2i(p.xy),0);}
`;
async function checkedModule(device,code,label){const module=device.createShaderModule({code,label}),info=await module.getCompilationInfo();const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(label+': '+errors.map(x=>`L${x.lineNum} ${x.message}`).join('\n'));return {module,messages:info.messages.map(x=>({type:x.type,line:x.lineNum,message:x.message}))};}
export async function createBarrierRenderer(canvas,{width=256,height=192}={}){
 if(!navigator.gpu)throw new Error('WebGPU unavailable. No Canvas 2D fallback.');
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');
 const device=await adapter.requestDevice();const context=canvas.getContext('webgpu');if(!context)throw new Error('No WebGPU context');
 const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));device.lost.then(info=>errors.push(`device lost: ${info.message}`));
 const ai=adapter.info??{},metadata={version:VERSION,userAgent:navigator.userAgent,adapter:{vendor:ai.vendor,architecture:ai.architecture,device:ai.device,description:ai.description,isFallbackAdapter:ai.isFallbackAdapter??adapter.isFallbackAdapter??null},devicePixelRatio,hardwareAttestation:'unverified',qualityApproval:false};
 const format=navigator.gpu.getPreferredCanvasFormat();canvas.width=width;canvas.height=height;
 context.configure({device,format,alphaMode:'opaque',colorSpace:'srgb'});
 const resp=await fetch(new URL('./barrier-pro.wgsl',import.meta.url));if(!resp.ok)throw new Error(`WGSL HTTP ${resp.status}`);
 const code=await resp.text();const {module,messages}=await checkedModule(device,code,'barrier r0.2');metadata.shaderMessages=messages;
 const display=(await checkedModule(device,displayWGSL,'linear composite and presentation')).module;
 device.pushErrorScope('validation');
 const blend={color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float',blend}]},primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:4}});
 const cp=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'composite',targets:[{format:'rgba8unorm'}]}});
 const pp=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:display,entryPoint:'vs'},fragment:{module:display,entryPoint:'present',targets:[{format}]}});
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),du=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const bg=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 const topology=makeGridIndices(),indexBuffer=device.createBuffer({size:topology.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(indexBuffer,0,topology);
 const msaa=device.createTexture({size:[width,height],format:'rgba16float',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
 const effect=device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
 const out=device.createTexture({size:[width,height],format:'rgba8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
 const cb=device.createBindGroup({layout:cp.getBindGroupLayout(0),entries:[{binding:0,resource:effect.createView()},{binding:1,resource:{buffer:du}}]});
 const pb=device.createBindGroup({layout:pp.getBindGroupLayout(0),entries:[{binding:0,resource:out.createView()}]});
 const validation=await device.popErrorScope();if(validation)throw validation;
 let last;
 function draw(options={}){
  if(errors.length)throw new Error(errors.join('\n'));
  const branch=options.branch??'create',ageMs=options.ageMs??300;
  // Authority defaults here are EXPLICIT gallery fixtures, never production rules.
  last={branch,ageMs,authoritativeActive:options.authoritativeActive??['create','absorb','idle'].includes(branch),hPx:options.hPx??64,yawDeg:options.yawDeg??SHAPE.defaultYawDeg,pitchDeg:options.pitchDeg??SHAPE.defaultPitchDeg,impactUV:options.impactUV??null,coreEnabled:options.coreEnabled??true,background:options.background??0,faceMode:options.faceMode??'both',grayscale:options.grayscale??false,diagnostic:options.diagnostic??0,width,height};
  const params=packUniforms(last);device.queue.writeBuffer(uniform,0,params);
  const bgColor=BACKGROUNDS[last.background]?.linear;if(!bgColor)throw new RangeError('unknown background');
  device.queue.writeBuffer(du,0,new Float32Array([width,height,last.grayscale?1:0,0,...bgColor,last.background===5?1:0]));
  const enc=device.createCommandEncoder();let pass=enc.beginRenderPass({colorAttachments:[{view:msaa.createView(),resolveTarget:effect.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'discard'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,bg);pass.setIndexBuffer(indexBuffer,'uint32');
  if(last.faceMode!=='front')pass.drawIndexed(SHAPE.nu*SHAPE.nv*6,1,0,0,0); // rear hemisphere
  // Engine integration: existing unwarped TARGET must be inserted at its actual depth here.
  if(last.faceMode!=='back')pass.drawIndexed(SHAPE.nu*SHAPE.nv*6,1,0,0,1); // front hemisphere
  pass.end();
  pass=enc.beginRenderPass({colorAttachments:[{view:out.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(cp);pass.setBindGroup(0,cb);pass.draw(3);pass.end();
  pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pp);pass.setBindGroup(0,pb);pass.draw(3);pass.end();
  device.queue.submit([enc.finish()]);return {...last};
 }
 async function readTexture(texture,bpp){
  const row=Math.ceil(width*bpp/256)*256;const buffer=device.createBuffer({size:row*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  try{const enc=device.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer,bytesPerRow:row,rowsPerImage:height},[width,height]);device.queue.submit([enc.finish()]);await buffer.mapAsync(GPUMapMode.READ);const bytes=new Uint8Array(buffer.getMappedRange()).slice();buffer.unmap();return {bytes,row};}finally{buffer.destroy();}
 }
 async function inspect(){
  if(!last)draw();const settings={...last};await device.queue.onSubmittedWorkDone();const {bytes,row}=await readTexture(effect,8);const floats=decodeHalf(bytes,row,width,height);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  return {...metadata,createdAt:new Date().toISOString(),settings,canvasPhysicalRect:(()=>{const r=canvas.getBoundingClientRect();return {x:r.x*devicePixelRatio,y:r.y*devicePixelRatio,width:r.width*devicePixelRatio,height:r.height*devicePixelRatio};})(),gpuBufferSHA256:hash,readback:measureFrame(floats,settings),errors:[...errors],readbackStatus:'completed',humanQuality:'not_run',qualityApproval:false};
 }
 async function numericParity({count=4096}={}){
  if(!Number.isInteger(count)||count<1||count>65536)throw new RangeError('probe count 1..65536');
  const data=new Float32Array(count*12);let seed=19287;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){
   const kind=i%5-1,T=kind>=2?480:650,age=[0,T*.25,T*.5,T-1,T,T+1,rand()*T][i%7],auth=kind<2?1:0;
   data.set([kind,age,auth,i%2?100:64,rand()*1.90-.95,.02+rand()*.96,i%2,1,0,-1,(rand()*50-25)*Math.PI/180,(rand()*20-10)*Math.PI/180],i*12);
  }
  const input=device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  const output=device.createBuffer({size:count*48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
  const read=device.createBuffer({size:count*48,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  try{
   device.queue.writeBuffer(input,0,data);device.pushErrorScope('validation');
   const pipe=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'parity'}});
   const empty=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[]});
   const bind=device.createBindGroup({layout:pipe.getBindGroupLayout(1),entries:[{binding:0,resource:{buffer:input}},{binding:1,resource:{buffer:output}}]});
   const enc=device.createCommandEncoder(),pass=enc.beginComputePass();pass.setPipeline(pipe);pass.setBindGroup(0,empty);pass.setBindGroup(1,bind);pass.dispatchWorkgroups(Math.ceil(count/64));pass.end();enc.copyBufferToBuffer(output,0,read,0,count*48);device.queue.submit([enc.finish()]);
   const err=await device.popErrorScope();if(err)throw err;await read.mapAsync(GPUMapMode.READ);const got=new Float32Array(read.getMappedRange()).slice();read.unmap();
   const maxErrors=Array(12).fill(0),tolerances=[.0002,.0002,.0002,.004,.012,.012,.012,.004,.006,.012,.02,.02];let failures=0;const firstFailures=[];
   for(let i=0;i<count;i++){
    const [kind,age,auth,h,q,v,front,core,iq,iv,yaw,pitch]=data.subarray(i*12,i*12+12),g=geometry(q,v,kind,age,auth,iq,iv,front),f=material(q,v,kind,age,auth,iq,iv,front,h,core,yaw,pitch);
    const expected=[g.x,g.y,g.z,f.coverage,f.r,f.g,f.b,f.a,f.core,f.emissionY,f.normalX,f.normalY];
    for(let k=0;k<12;k++){const error=Math.abs(expected[k]-got[i*12+k]);maxErrors[k]=Math.max(maxErrors[k],error);if(!Number.isFinite(error)||error>tolerances[k]){failures++;if(firstFailures.length<8)firstFailures.push({probe:i,field:k,expected:expected[k],actual:got[i*12+k],error});}}
   }
   return {...metadata,test:'scalar compute parity; NOT raster fidelity or visual quality',count,maxErrors,tolerances,failures,firstFailures,status:failures?'fail':'pass',qualityApproval:false};
  }finally{input.destroy();output.destroy();read.destroy();}
 }
 async function exportSamples({branches=BRANCHES,heights=[64,100],cadences=[30,60,120],backgrounds=[0],offsets=[0,.5],maxFrames=20000,baseOptions={}}={}){
  const saved=last?{...last}:null,records=[];try{
   for(const hPx of heights)for(const background of backgrounds)for(const branch of branches)for(const fps of cadences)for(const offset of offsets){
    const T=DURATIONS_MS[branch];for(let n=0;(n+offset)*1000/fps<T;n++){
     if(records.length>=maxFrames)throw new RangeError('sample budget exceeded');
     const ageMs=(n+offset)*1000/fps;draw({...baseOptions,branch,hPx,background,ageMs,authoritativeActive:['create','absorb'].includes(branch)});const r=await inspect();records.push({branch,hPx,background,fps,offset,ageMs,readback:r.readback,gpuBufferSHA256:r.gpuBufferSHA256});
    }
    for(const ageMs of [T-1,T,T+50]){draw({...baseOptions,branch,hPx,background,ageMs,authoritativeActive:['create','absorb'].includes(branch)});const r=await inspect();records.push({branch,hPx,background,fps,offset,ageMs,readback:r.readback,gpuBufferSHA256:r.gpuBufferSHA256});}
   }
  }finally{if(saved)draw(saved);}
  return {...metadata,type:'prescribed-time GPU samples; not realtime cadence measurement',baseOptions,records,automaticRejectCount:records.filter(x=>x.readback.automaticHardReject).length,humanQuality:'not_run',qualityApproval:false};
 }
 function destroy(){msaa.destroy();effect.destroy();out.destroy();uniform.destroy();du.destroy();indexBuffer.destroy();context.unconfigure();device.destroy();}
 return {metadata,errors,draw,inspect,numericParity,exportSamples,destroy,device,get settings(){return last?{...last}:null;}};
}
