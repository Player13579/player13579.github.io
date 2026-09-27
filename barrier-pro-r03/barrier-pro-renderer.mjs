/** WebGPU reference path, r0.3. Real per-pixel depth peeling; no image or Canvas 2D fallback.
 * Quality-first single-instance G1 fixture, NOT a certified production performance path.
 */
import {VERSION,SHAPE,BRANCHES,DURATIONS_MS,packUniforms,makePatchMesh} from './barrier-pro-sampler.mjs';
import {geometry,material,MODEL_SHA256} from './barrier-pro-kernel.mjs';
import {BACKGROUNDS,decodeHalf,measureFrame} from './barrier-pro-metrics.mjs';
async function shader(device,url,label){const res=await fetch(url);if(!res.ok)throw new Error(`${label}: HTTP ${res.status}`);const code=await res.text(),module=device.createShaderModule({code,label});const info=await module.getCompilationInfo();const messages=info.messages.map(m=>({type:m.type,line:m.lineNum,message:m.message}));if(messages.some(m=>m.type==='error'))throw new Error(label+'\n'+JSON.stringify(messages));return {module,messages};}
export async function createBarrierRenderer(canvas,{width=384,height=288,ss=2,device:sharedDevice=null,adapter:sharedAdapter=null}={}){
 if(![1,2].includes(ss))throw new RangeError('ss must be 1 or 2');if(!navigator.gpu&&!sharedDevice)throw new Error('WebGPU unavailable. No fallback.');
 const adapter=sharedAdapter??(sharedDevice?null:await navigator.gpu.requestAdapter());if(!adapter&&!sharedDevice)throw new Error('No adapter');const device=sharedDevice??await adapter.requestDevice();const context=canvas.getContext('webgpu');if(!context)throw new Error('No WebGPU context');
 const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));device.lost.then(i=>errors.push(`Device lost: ${i.message}`));
 const ai=adapter?.info??{};const metadata={version:VERSION,modelSHA256:MODEL_SHA256,userAgent:navigator.userAgent,adapter:{vendor:ai.vendor,architecture:ai.architecture,device:ai.device,description:ai.description,isFallbackAdapter:ai.isFallbackAdapter??adapter?.isFallbackAdapter??null},hardwareAttestation:'not_verified',qualityApproval:false,sampling:{native:[width,height],internal:[width*ss,height*ss],ss,peels:SHAPE.peels,overflowSentinel:1}};
 const format=navigator.gpu.getPreferredCanvasFormat();canvas.width=width;canvas.height=height;context.configure({device,format,alphaMode:'opaque',colorSpace:'srgb'});
 const {module,messages}=await shader(device,new URL('./barrier-pro.wgsl',import.meta.url),'field r0.3');metadata.fieldShaderMessages=messages;
 const comp=await shader(device,new URL('./barrier-pro-composite.wgsl',import.meta.url),'peel resolve/display');metadata.compositeShaderMessages=comp.messages;
 device.pushErrorScope('validation');
 const pipe=await device.createRenderPipelineAsync({label:'nearest eligible transparent layer; NOT one shared depth write',layout:'auto',
  vertex:{module,entryPoint:'vs',buffers:[{arrayStride:16,attributes:[{shaderLocation:0,format:'float32x4',offset:0}]}]},
  fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'r32float'}]},
  primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth32float',depthWriteEnabled:true,depthCompare:'less'},multisample:{count:1}});
 // r32float depth-value texture is unfilterable without an optional device feature.
 const resolveLayout=device.createBindGroupLayout({entries:[
  {binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float',viewDimension:'2d-array'}},
  {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float',viewDimension:'2d-array'}},
  {binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform',minBindingSize:48}}]});
 const resolve=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[resolveLayout]}),vertex:{module:comp.module,entryPoint:'vsFull'},fragment:{module:comp.module,entryPoint:'resolve',targets:[{format:'rgba16float'},{format:'rgba16float'}]}});
 const display=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:comp.module,entryPoint:'vsFull'},fragment:{module:comp.module,entryPoint:'display',targets:[{format:'rgba8unorm'}]}});
 const present=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:comp.module,entryPoint:'vsFull'},fragment:{module:comp.module,entryPoint:'present',targets:[{format}]}});
 const makeBuffer=(size,usage)=>device.createBuffer({size,usage});
 const params=makeBuffer(64,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST),displayParams=makeBuffer(48,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);
 const mesh=makePatchMesh(),vb=makeBuffer(mesh.vertices.byteLength,GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST),ib=makeBuffer(mesh.indices.byteLength,GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST);
 device.queue.writeBuffer(vb,0,mesh.vertices);device.queue.writeBuffer(ib,0,mesh.indices);
 const num=SHAPE.peels+1,W=width*ss,H=height*ss,texUsage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC;
 const colors=device.createTexture({label:'peeled radiance and alpha',size:[W,H,num],format:'rgba16float',usage:texUsage});
 const distances=device.createTexture({label:'peeled normalized depths',size:[W,H,num],format:'r32float',usage:texUsage});
 const depth=Array.from({length:num},()=>device.createTexture({size:[W,H],format:'depth32float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
 const cv=Array.from({length:num},(_,i)=>colors.createView({dimension:'2d',baseArrayLayer:i,arrayLayerCount:1})),zv=Array.from({length:num},(_,i)=>distances.createView({dimension:'2d',baseArrayLayer:i,arrayLayerCount:1})),dv=depth.map(t=>t.createView());
 const layerParams=Array.from({length:num},(_,i)=>{const b=makeBuffer(16,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);device.queue.writeBuffer(b,0,new Uint32Array([i,0,0,0]));return b;});
 const fieldBind=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:params}}]});
 const depthBinds=Array.from({length:num},(_,i)=>device.createBindGroup({layout:pipe.getBindGroupLayout(1),entries:[{binding:0,resource:dv[i===0?num-1:i-1]},{binding:1,resource:{buffer:layerParams[i]}}]}));
 const field=device.createTexture({size:[width,height],format:'rgba16float',usage:texUsage}),info=device.createTexture({size:[width,height],format:'rgba16float',usage:texUsage}),out=device.createTexture({size:[width,height],format:'rgba8unorm',usage:texUsage});
 const fv=field.createView(),iv=info.createView(),ov=out.createView();
 const resolveBind=device.createBindGroup({layout:resolve.getBindGroupLayout(0),entries:[{binding:0,resource:colors.createView({dimension:'2d-array'})},{binding:1,resource:distances.createView({dimension:'2d-array'})},{binding:2,resource:{buffer:displayParams}}]});
 const displayBind0=device.createBindGroup({layout:display.getBindGroupLayout(0),entries:[{binding:2,resource:{buffer:displayParams}}]});
 const displayBind1=device.createBindGroup({layout:display.getBindGroupLayout(1),entries:[{binding:0,resource:fv}]});
 const presentEmpty0=device.createBindGroup({layout:present.getBindGroupLayout(0),entries:[]}),presentEmpty1=device.createBindGroup({layout:present.getBindGroupLayout(1),entries:[]});
 const presentBind=device.createBindGroup({layout:present.getBindGroupLayout(2),entries:[{binding:0,resource:ov}]});
 const validation=await device.popErrorScope();if(validation)throw validation;
 metadata.mesh={vertices:mesh.vertices.length/4,triangles:mesh.indices.length/3};
 metadata.attachmentMemoryBytes=W*H*num*(8+4+4)+width*height*(8+8+4);
 let last=null;
 const attachment=(view,clear={r:0,g:0,b:0,a:0})=>({view,loadOp:'clear',storeOp:'store',clearValue:clear});
 function draw(options={}){
  if(errors.length)throw new Error(errors.join('\n'));
  // Defaults are named gallery fixtures, NEVER gameplay inference.
  const branch=options.branch??'create';last={width,height,ss,branch,ageMs:options.ageMs??300,hPx:options.hPx??64,
   authoritativeActive:options.authoritativeActive??['create','absorb','idle'].includes(branch),background:options.background??0,
   coreEnabled:options.coreEnabled??true,diagnostic:options.diagnostic??0,bandMask:options.bandMask??31,
   yawDeg:options.yawDeg??SHAPE.defaultYawDeg,pitchDeg:options.pitchDeg??SHAPE.defaultPitchDeg,grayscale:options.grayscale??false};
  const color=BACKGROUNDS[last.background];if(!color)throw new RangeError('Unknown background');
  device.queue.writeBuffer(params,0,packUniforms({...last,width:W,height:H,hPx:last.hPx*ss,centerPx:[W/2,H/2]}));
  device.queue.writeBuffer(displayParams,0,new Float32Array([width,height,ss,0,...color.linear,last.background===5?1:0,last.grayscale?1:0,0,0,0]));
  const enc=device.createCommandEncoder();
  for(let i=0;i<num;i++){
   const rp=enc.beginRenderPass({label:`peel ${i}${i===8?' overflow probe':''}`,colorAttachments:[attachment(cv[i]),attachment(zv[i],{r:1,g:0,b:0,a:0})],depthStencilAttachment:{view:dv[i],depthLoadOp:'clear',depthStoreOp:'store',depthClearValue:1}});
   rp.setPipeline(pipe);rp.setBindGroup(0,fieldBind);rp.setBindGroup(1,depthBinds[i]);rp.setVertexBuffer(0,vb);rp.setIndexBuffer(ib,'uint32');rp.drawIndexed(mesh.indices.length);rp.end();
  }
  let rp=enc.beginRenderPass({colorAttachments:[attachment(fv),attachment(iv)]});rp.setPipeline(resolve);rp.setBindGroup(0,resolveBind);rp.draw(3);rp.end();
  rp=enc.beginRenderPass({colorAttachments:[attachment(ov,{r:0,g:0,b:0,a:1})]});rp.setPipeline(display);rp.setBindGroup(0,displayBind0);rp.setBindGroup(1,displayBind1);rp.draw(3);rp.end();
  rp=enc.beginRenderPass({colorAttachments:[attachment(context.getCurrentTexture().createView(),{r:0,g:0,b:0,a:1})]});rp.setPipeline(present);rp.setBindGroup(0,presentEmpty0);rp.setBindGroup(1,presentEmpty1);rp.setBindGroup(2,presentBind);rp.draw(3);rp.end();device.queue.submit([enc.finish()]);
  return {...last};
 }
 async function readTexture(texture,bpp=8){const row=Math.ceil(width*bpp/256)*256,b=makeBuffer(row*height,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);try{const enc=device.createCommandEncoder();enc.copyTextureToBuffer({texture},{buffer:b,bytesPerRow:row,rowsPerImage:height},[width,height]);device.queue.submit([enc.finish()]);await b.mapAsync(GPUMapMode.READ);const bytes=new Uint8Array(b.getMappedRange()).slice();b.unmap();return {bytes,row};}finally{b.destroy();}}
 async function inspect(){if(!last)draw();const settings={...last};await device.queue.onSubmittedWorkDone();const a=await readTexture(field),b=await readTexture(info),rect=canvas.getBoundingClientRect();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
  return {...metadata,createdAt:new Date().toISOString(),settings,canvasPhysicalSize:[rect.width*devicePixelRatio,rect.height*devicePixelRatio],nativePixelScaleOK:Math.abs(rect.width*devicePixelRatio-width)<.6&&Math.abs(rect.height*devicePixelRatio-height)<.6,
   gpuBufferSHA256:hash,readbackStatus:'completed',readback:measureFrame(decodeHalf(a.bytes,a.row,width,height),settings,decodeHalf(b.bytes,b.row,width,height)),errors:[...errors],humanG1:'not_run',qualityApproval:false};}
 async function numericParity({count=2048}={}){
  if(!Number.isInteger(count)||count<1||count>65536)throw new RangeError('probe count1..65536');
  const data=new Float32Array(count*12);let seed=19287;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const k=i%5-1,T=k>=2?480:650;data.set([k,[0,T*.5,T-1,T,T+1,rand()*T][i%6],k<2?1:0,i%2?100:64,.01+rand()*.98,.02+rand()*.96,i%8,i%5,1,-18*Math.PI/180,12*Math.PI/180,0],i*12);}
  const input=makeBuffer(data.byteLength,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),output=makeBuffer(count*48,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),read=makeBuffer(count*48,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);
  try{device.queue.writeBuffer(input,0,data);const cp=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'parity'}}),e0=device.createBindGroup({layout:cp.getBindGroupLayout(0),entries:[]}),e1=device.createBindGroup({layout:cp.getBindGroupLayout(1),entries:[]}),bind=device.createBindGroup({layout:cp.getBindGroupLayout(2),entries:[{binding:0,resource:{buffer:input}},{binding:1,resource:{buffer:output}}]});
   const enc=device.createCommandEncoder(),p=enc.beginComputePass();p.setPipeline(cp);p.setBindGroup(0,e0);p.setBindGroup(1,e1);p.setBindGroup(2,bind);p.dispatchWorkgroups(Math.ceil(count/64));p.end();enc.copyBufferToBuffer(output,0,read,0,count*48);device.queue.submit([enc.finish()]);await read.mapAsync(GPUMapMode.READ);const actual=new Float32Array(read.getMappedRange()).slice();read.unmap();
   const maxErrors=Array(12).fill(0),tolerance=[.0003,.0003,.0003,.006,.014,.014,.014,.004,.012,.014,.025,.025];let failures=0;const firstFailures=[];
   for(let i=0;i<count;i++){const [k,age,auth,h,u,v,s,b,core,yaw,pitch]=data.subarray(i*12,i*12+12),g=geometry(u,v,s,b,k,age,auth),f=material(u,v,s,b,k,age,auth,h,core,yaw,pitch),want=[g.x,g.y,g.z,f.coverage,f.r,f.g,f.b,f.a,f.core,f.emissionY,f.normalX,f.normalY];for(let j=0;j<12;j++){const diff=Math.abs(actual[i*12+j]-want[j]);maxErrors[j]=Math.max(maxErrors[j],diff);if(!Number.isFinite(diff)||diff>tolerance[j]){failures++;if(firstFailures.length<12)firstFailures.push({probe:i,field:j,expected:want[j],actual:actual[i*12+j],diff});}}}
   return {...metadata,scope:'scalar compute only; NOT depth/coverage/G1',count,tolerance,maxErrors,failures,firstFailures,status:failures?'fail':'pass',qualityApproval:false};
  }finally{input.destroy();output.destroy();read.destroy();}
 }
 async function prescribedSweep({heights=[64,100],backgrounds=[0,1],cadence=60,maxFrames=1000}={}){
  const saved=last?{...last}:null,records=[];try{for(const hPx of heights)for(const background of backgrounds)for(const branch of BRANCHES){const T=DURATIONS_MS[branch],times=[];for(let t=0;t<T;t+=1000/cadence)times.push(t);times.push(T-1,T,T+50);for(const ageMs of times){if(records.length>=maxFrames)throw new RangeError('prescribed sweep budget exceeded');draw({hPx,background,branch,ageMs});const r=await inspect();records.push({settings:r.settings,readback:r.readback,hash:r.gpuBufferSHA256});}}}finally{if(saved)draw(saved);}
  return {...metadata,type:'prescribed timestamps, NOT realtime performance evidence',cadence,records,qualityApproval:false};
 }
 /** Engine receives depth-resolved layers. Insert EXISTING unmodified target/scene by its real depth;
  * do not paste a target above the final already-composited barrier. See ENGINE-INTEGRATION.md.
  */
 function engineLayers(){return {colors,distances,layerCount:8,overflowLayer:8,internalSize:[W,H],nativeSize:[width,height],normalizedDepthMapping:'0.5-0.15*cameraSpaceZ/h',noTargetCreated:true};}
 function destroy(){for(const t of [colors,distances,...depth,field,info,out])t.destroy();for(const b of [params,displayParams,vb,ib,...layerParams])b.destroy();context.unconfigure();if(!sharedDevice)device.destroy();}
 return {draw,inspect,numericParity,prescribedSweep,engineLayers,destroy,metadata,errors,device,get settings(){return last?{...last}:null;}};
}
