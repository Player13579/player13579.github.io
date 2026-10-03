import {VFX_WGSL} from './physical/rpg-e.mjs';
export const VERSION='sol-rpg-heavy-quality-r9-observer';
// R11 PH is sampled directly. Historical R9R2 OBS equations/lifecycle remain unchanged.
export const SOURCE_WGSL=VFX_WGSL.replace('@fragment fn fs(o:Out)->@location(0) vec4f','fn r8Field(o:Out)->vec4f')+`
@group(0) @binding(2)var transmission:texture_2d_array<f32>;
@fragment fn sourceFS(o:Out)->@location(0)vec4f{
 let kind=u32(fields[o.index].centerKind.z);
 if(kind==3u){return vec4f(0.);}
 let raw=r8Field(o);let xy=vec2i(o.position.xy);
 let visible=clamp(textureLoad(transmission,xy,i32(o.index),0).r,0.,1.);
 // Optical sensor responds to radiant hot cores; smoke material is not a source.
 let radiant=max(raw.rgb-vec3f(.9),vec3f(0.));
 return vec4f(radiant*visible,raw.a*visible);
}`;
export const OBS_WGSL=`
struct U{frame:vec4f,response:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var scene:texture_2d<f32>;
@group(0) @binding(2)var source:texture_2d<f32>;
@group(0) @binding(3)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(o:O)->@location(0)vec4f{
 let taps=array<vec2f,9>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.),vec2f(1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(-1.,-1.));
 var scatter=vec3f(0.);for(var i=0u;i<9u;i++){
  let weight=select(select(.045,.115,i<5u),.36,i==0u);
  let a=textureSample(source,smp,clamp(o.uv+taps[i]*1.4/u.frame.xy,vec2f(0.),vec2f(1.))).rgb;
  let b=textureSample(source,smp,clamp(o.uv+taps[i]*6.5/u.frame.xy,vec2f(0.),vec2f(1.))).rgb;
  scatter+=weight*(a*.14+b*.055);
 }
 let base=textureLoad(scene,vec2i(o.p.xy),0);
 return vec4f(base.rgb+scatter*u.response.x*u.response.y,base.a);
}`;
const finite=Number.isFinite;
export function responseCPU({radiance,transmission=1,sourceOn=true,observerOn=true,age,intensity=1}={}){
 if(!Array.isArray(radiance)||radiance.length!==3||!radiance.every(x=>finite(x)&&x>=0)||![transmission,age,intensity].every(finite)||transmission<0||transmission>1||intensity<0||intensity>2)throw TypeError('actual finite observer input');
 const on=sourceOn&&observerOn&&age>0&&age<1200;return radiance.map(x=>on?Math.max(0,x-.9)*transmission*intensity*.195:0);
}
export async function createObserverPass({device,format='rgba16float',isSubmitted}={}){
 if(!device?.createShaderModule||!device?.createRenderPipelineAsync||typeof isSubmitted!=='function')throw TypeError('actual shared device + branded physical submission predicate');
 const compile=async(code,label)=>{const m=device.createShaderModule({code,label});if(m.getCompilationInfo){const info=await m.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw Object.assign(Error(label+' shader failed'),{shaderDiagnostics:info.messages});}return m};
 const [src,obs]=await Promise.all([compile(SOURCE_WGSL,VERSION+' source'),compile(OBS_WGSL,VERSION+' OBS')]);
 const [srcPipeline,obsPipeline]=await Promise.all([device.createRenderPipelineAsync({layout:'auto',vertex:{module:src,entryPoint:'vs'},fragment:{module:src,entryPoint:'sourceFS',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}}),device.createRenderPipelineAsync({layout:'auto',vertex:{module:obs,entryPoint:'vs'},fragment:{module:obs,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}})]);
 const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});const active=new Set();let dead=false;
 return Object.freeze({version:VERSION,prepare(plan,{viewport,camera,sourceCurrent,frameToken}={}){
  if(dead||!frameToken||typeof frameToken!=='object'||plan?.status!=='planned'||!finite(plan.age)||plan.age<0||plan.age>=1200||!Array.isArray(plan.fields)||plan.fields.length===0||plan.fields.length>130||typeof sourceCurrent!=='function'||!sourceCurrent()||![viewport?.width,viewport?.height,camera?.x,camera?.y,camera?.zoom].every(finite)||!Number.isInteger(viewport.width)||!Number.isInteger(viewport.height)||viewport.width<=0||viewport.height<=0||viewport.width>4096||viewport.height>4096||camera.zoom<=0)throw TypeError('actual current positive bounded plan');
  if(plan.fields.some(f=>![f.center?.x,f.center?.y,f.kind,f.axis?.x,f.axis?.y,f.sx,f.sy,f.age,f.enhance,f.reduced].every(finite)||![0,1,2,3].includes(f.kind)||f.sx<=0||f.sy<=0||f.age!==plan.age||![0,1].includes(f.enhance)||![0,1].includes(f.reduced)))throw TypeError('malformed actual source geometry');
  const buffers=[];const buffer=(data,usage)=>{const b=device.createBuffer({size:Math.max(16,data.byteLength),usage,mappedAtCreation:true});new Float32Array(b.getMappedRange()).set(data);b.unmap();buffers.push(b);return b};
  const view=buffer(new Float32Array([viewport.width,viewport.height,camera.x,camera.y,camera.zoom,0,0,0]),GPUBufferUsage.UNIFORM);
  const fields=buffer(new Float32Array(plan.fields.flatMap(f=>[f.center.x,f.center.y,f.kind,0,f.axis.x,f.axis.y,f.sx,f.sy,f.age,f.enhance,f.reduced,0])),GPUBufferUsage.STORAGE);
  const uniform=buffer(new Float32Array([viewport.width,viewport.height,plan.age,0,1,1,0,0]),GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);
  const emission=device.createTexture({label:VERSION+' visible source HDR',size:[viewport.width,viewport.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  let released=false,recorded=false,actualSubmission=null;const token={release:null};active.add(token);const release=()=>{if(released)return;released=true;const dispose=()=>{for(const b of buffers)b.destroy();emission.destroy();active.delete(token)};if(actualSubmission)Promise.resolve(actualSubmission.completion).then(dispose,dispose);else dispose()};token.release=release;
  return Object.freeze({record(encoder,targetView,{observerLease,observerSourceOn=true,observerOn=true,intensity=1}={}){
   const l=observerLease;if(dead||released||recorded||!sourceCurrent()||!l||l.scope!=='actual-source-observer-inputs'||l.device!==device||l.frameToken!==frameToken||l.causeId!==plan.causeId||l.sourceEffectId!==plan.sourceEffectId||l.plan!==plan||l.width!==viewport.width||l.height!==viewport.height||l.fieldLayers!==plan.fields.length||!l.isCurrent?.()||!l.sceneRadiance||!l.transmission||!l.sceneTexture||!l.transmissionTexture||!l.outputTexture||l.sceneTexture===l.outputTexture||l.transmissionTexture===l.outputTexture||l.sceneTexture===l.transmissionTexture||l.sceneRadiance===targetView||l.transmission===targetView||!finite(intensity)||intensity<0||intensity>2)throw Error('exact nonaliased current scene/source transmission lease required');
   device.queue.writeBuffer(uniform,0,new Float32Array([viewport.width,viewport.height,plan.age,0,+observerOn*intensity,+observerSourceOn,0,0]));
   const s=device.createBindGroup({layout:srcPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:view}},{binding:1,resource:{buffer:fields}},{binding:2,resource:l.transmission}]});
   const sourcePass=encoder.beginRenderPass({colorAttachments:[{view:emission.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});sourcePass.setPipeline(srcPipeline);sourcePass.setBindGroup(0,s);sourcePass.draw(6,plan.fields.length);sourcePass.end();
   const b=device.createBindGroup({layout:obsPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:l.sceneRadiance},{binding:2,resource:emission.createView()},{binding:3,resource:sampler}]});
   const pass=encoder.beginRenderPass({colorAttachments:[{view:targetView,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});pass.setPipeline(obsPipeline);pass.setBindGroup(0,b);pass.draw(3);pass.end();recorded=true;
   return Object.freeze({version:VERSION,causeId:plan.causeId,sourceEffectId:plan.sourceEffectId,observerRecorded:true,observerEnabled:observerOn,observerSourceEnabled:observerSourceOn,intensity,submissionRequired:true});
  },bindSubmission(receipt){if(released||!recorded||actualSubmission||!isSubmitted(receipt)||!receipt?.submitted||receipt.causeId!==plan.causeId||receipt.sourceEffectId!==plan.sourceEffectId||!receipt.completion?.then)throw Error('actual matching one-shot physical submission required');actualSubmission=receipt;},release});
 },destroy(){dead=true;for(const x of active)x.release()}});
}
