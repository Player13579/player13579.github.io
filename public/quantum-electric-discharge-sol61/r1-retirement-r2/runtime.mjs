import { DURATION_MS, dischargeChannels } from './channels.mjs';

const GPU_FORMAT='rgba16float';
const SHADER=/* wgsl */`
struct U { size: vec2f, count: f32, sourceOn: f32, observerOn: f32, sourceX: f32, sourceY: f32, pad: f32 };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage,read> seg: array<vec4f>;
struct V { @builtin(position) p: vec4f, @location(0) local: vec2f, @location(1) power: f32, @location(2) width: f32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->V {
 let ends=seg[ii*2u]; let segmentMeta=seg[ii*2u+1u]; let d=ends.zw-ends.xy; let n=normalize(vec2f(-d.y,d.x));
 let side=select(-1.0,1.0,(vi&1u)==1u); let end=select(0.0,1.0,(vi&2u)!=0u);
 let pos=mix(ends.xy,ends.zw,end)+n*side*max(segmentMeta.x,0.3)*2.4;
 var o:V; o.p=vec4f(pos.x/u.size.x*2.0-1.0,1.0-pos.y/u.size.y*2.0,0.0,1.0);
 o.local=vec2f(end,side); o.power=segmentMeta.y; o.width=segmentMeta.x; return o;
}
@fragment fn fs(i:V)->@location(0) vec4f {
 let edge=abs(i.local.y); let sheath=exp(-edge*edge*2.2); let core=exp(-edge*edge*22.0);
 let radiance=(vec3f(0.22,0.16,1.0)*sheath*0.46+vec3f(1.0,0.96,0.86)*core)*i.power*u.sourceOn;
 return vec4f(radiance,max(max(radiance.r,radiance.g),radiance.b));
}
struct Display { observerOn:f32, pad0:f32, pad1:f32, pad2:f32 };
@group(1) @binding(0) var<uniform> display:Display;
@group(1) @binding(1) var emission: texture_2d<f32>;
@group(1) @binding(2) var emissionSampler: sampler;
@vertex fn screenVs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(p[i],0,1);
}
@fragment fn screenFs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let dims=vec2f(textureDimensions(emission)); let uv=p.xy/dims; let texel=vec2f(1.0)/dims;
 let direct=textureSampleLevel(emission,emissionSampler,uv,0.0).rgb;
 let a3=textureSampleLevel(emission,emissionSampler,uv+vec2f(3.0,0.0)*texel,0.0).rgb;
 let b3=textureSampleLevel(emission,emissionSampler,uv-vec2f(3.0,0.0)*texel,0.0).rgb;
 let c3=textureSampleLevel(emission,emissionSampler,uv+vec2f(0.0,3.0)*texel,0.0).rgb;
 let d3=textureSampleLevel(emission,emissionSampler,uv-vec2f(0.0,3.0)*texel,0.0).rgb;
 let a7=textureSampleLevel(emission,emissionSampler,uv+vec2f(7.0,0.0)*texel,0.0).rgb;
 let b7=textureSampleLevel(emission,emissionSampler,uv-vec2f(7.0,0.0)*texel,0.0).rgb;
 let c7=textureSampleLevel(emission,emissionSampler,uv+vec2f(0.0,7.0)*texel,0.0).rgb;
 let d7=textureSampleLevel(emission,emissionSampler,uv-vec2f(0.0,7.0)*texel,0.0).rgb;
 let localScatter=(a3+b3+c3+d3)*0.075+(a7+b7+c7+d7)*0.035;
 let x=max(direct+localScatter*display.observerOn,vec3f(0.0)); let mapped=x/(vec3f(1.0)+x);
 let encoded=select(12.92*mapped,1.055*pow(mapped,vec3f(1.0/2.4))-0.055,mapped>vec3f(0.0031308));
 return vec4f(encoded,1.0);
}`;

export class DischargeRuntime {
  #canvas;#gpu;#now;#devicePromise;#device;#context;#queue;#target;#size='';#disposed=false;#lost=false;
  #generation=0;#cause=null;#sequence=0;#lastReceipt=null;#resources=[];#controlKey='';#renderChain=Promise.resolve();#disposePromise=null;#deviceLostPromise=Promise.resolve();
  #pipeline;#displayPipeline;#uniform;#storage;#displayUniform;#mainBindLayout;#displayBindLayout;
  constructor({canvas,gpu=globalThis.navigator?.gpu,now=()=>performance.now()}={}){this.#canvas=canvas;this.#gpu=gpu;this.#now=now}
  get ready(){return !!this.#device&&!this.#disposed&&!this.#lost}
  get durationMs(){return DURATION_MS}
  async #popScope(device,open){if(!open.value)return null;open.value=false;return await device.popErrorScope()}
  async #checkScope(device,open){const error=await this.#popScope(device,open);if(error)throw error}
  async #compilation(module,label){const info=await module.getCompilationInfo();const errors=(info.messages||[]).filter(m=>m.type==='error');if(errors.length)throw new Error(`${label} WGSL compilation failed: ${errors.map(m=>m.message).join('; ')}`)}
  async #init(){
    if(this.#disposed)throw new Error('runtime disposed');if(this.#lost)throw new Error('WebGPU device lost');if(this.#devicePromise)return this.#devicePromise;
    this.#devicePromise=(async()=>{
      let device=null,scope={value:false},scopeError=null;
      try{
        if(!this.#gpu||!this.#canvas)throw new Error('WebGPU canvas unavailable');
        const adapter=await this.#gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
        device=await adapter.requestDevice();this.#device=device;this.#queue=device.queue;
        this.#context=this.#canvas.getContext('webgpu');if(!this.#context)throw new Error('WebGPU context unavailable');
        if(device.lost?.then)this.#deviceLostPromise=device.lost.then(()=>{if(!this.#disposed){this.#lost=true;this.#generation++;this.#cause=null;this.#lastReceipt=null}});
        device.pushErrorScope('validation');scope.value=true;
        const code=device.createShaderModule({code:SHADER});await this.#compilation(code,'discharge');
        const mainTarget=GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT;
        this.#mainBindLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:mainTarget,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
        this.#displayBindLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float',viewDimension:'2d'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
        const mainLayout=device.createPipelineLayout({bindGroupLayouts:[this.#mainBindLayout]}),displayLayout=device.createPipelineLayout({bindGroupLayouts:[this.#mainBindLayout,this.#displayBindLayout]});
        this.#pipeline=device.createRenderPipeline({layout:mainLayout,vertex:{module:code,entryPoint:'vs'},fragment:{module:code,entryPoint:'fs',targets:[{format:GPU_FORMAT,blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'max'}}}]},primitive:{topology:'triangle-strip'}});
        this.#displayPipeline=device.createRenderPipeline({layout:displayLayout,vertex:{module:code,entryPoint:'screenVs'},fragment:{module:code,entryPoint:'screenFs',targets:[{format:this.#gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});
        this.#uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.#resources.push(this.#uniform);
        this.#storage=device.createBuffer({size:128*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.#resources.push(this.#storage);
        this.#displayUniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});this.#resources.push(this.#displayUniform);
        await this.#checkScope(device,scope);this.#context.configure({device,format:this.#gpu.getPreferredCanvasFormat(),alphaMode:'premultiplied'});return device;
      }catch(error){if(device&&scope.value){try{scopeError=await this.#popScope(device,scope)}catch{}}this.#releaseOwned(device);this.#devicePromise=null;throw scopeError||error}
    })();
    return this.#devicePromise;
  }
  #releaseOwned(device=this.#device){try{this.#context?.unconfigure?.()}catch{}this.#target?.destroy?.();for(const resource of this.#resources)resource.destroy?.();this.#resources=[];this.#target=null;this.#size='';device?.destroy?.();if(this.#device===device){this.#device=null;this.#queue=null;this.#context=null;this.#pipeline=null;this.#displayPipeline=null;this.#uniform=null;this.#storage=null;this.#displayUniform=null}}
  start(cause){if(this.#disposed)throw new Error('runtime disposed');if(!cause||cause.id==null)throw new TypeError('cause id required');this.#generation++;this.#cause={...cause,startedAt:this.#now()};this.#lastReceipt=null;return this.#generation}
  stop(){this.#generation++;this.#cause=null;this.#lastReceipt=null}
  render(options={}){const run=this.#renderChain.then(()=>this.#render(options));this.#renderChain=run.catch(()=>{});return run}
  get lastReceipt(){return this.#lastReceipt}
  async #render(options={}){
    const generation=this.#generation,cause=this.#cause,d=await this.#init();if(this.#disposed||this.#lost||generation!==this.#generation||cause!==this.#cause)return null;
    const sourceVisible=options.sourceVisible===true,targetVisible=options.targetVisible===true;
    const ageMs=options.ageMs;
    if(!cause||!sourceVisible||!targetVisible||!Number.isFinite(ageMs)||ageMs<0||ageMs>=DURATION_MS||options.sourceEmission===false||options.sourceEmission===0){this.#lastReceipt=null;await this.#clear(d);return null}
    const {source,target,seed=1,actorHeight=64,reducedMotion=false,sourceEmission=true,observerScatter=true,verify=false,view=1}=options;
    const width=Math.max(1,Math.round(this.#canvas.width)),height=Math.max(1,Math.round(this.#canvas.height));if(!Number.isFinite(view)||view<=0)throw new RangeError('view must be positive');
    const controls=Object.freeze({sourceVisible,targetVisible,sourceEmission:!!sourceEmission,observerScatter:!!observerScatter,verify:!!verify,view});
    const controlKey=JSON.stringify([controls,source,target,actorHeight,reducedMotion,width,height]);this.#controlKey=controlKey;
    const instances=dischargeChannels({ageMs,source,target,seed,actorHeight,reducedMotion,sourceVisible,targetVisible});
    if(!instances.length){this.#lastReceipt=null;await this.#clear(d);return null}
    const submission=++this.#sequence,submittedAt=this.#now(),size=`${width}x${height}`;let scope={value:false},newTarget=null,submitted=false;
    d.pushErrorScope('validation');scope.value=true;
    try{
      if(size!==this.#size){await this.#queue.onSubmittedWorkDone();if(this.#disposed||this.#lost||generation!==this.#generation)return null;
        newTarget=d.createTexture({size:[width,height],format:GPU_FORMAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});}
      const target=newTarget||this.#target;
      const floats=new Float32Array(128*8);floats.set(instances);this.#queue.writeBuffer(this.#storage,0,floats);
      this.#queue.writeBuffer(this.#uniform,0,new Float32Array([width,height,instances.length/8,sourceEmission?1:0,observerScatter?1:0,source[0],source[1],0]));
      this.#queue.writeBuffer(this.#displayUniform,0,new Float32Array([observerScatter?1:0,0,0,0]));
      const emissionView=target.createView(),encoder=d.createCommandEncoder();
      const pass=encoder.beginRenderPass({colorAttachments:[{view:emissionView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});
      const mainGroup=d.createBindGroup({layout:this.#mainBindLayout,entries:[{binding:0,resource:{buffer:this.#uniform}},{binding:1,resource:{buffer:this.#storage}}]});
      pass.setPipeline(this.#pipeline);pass.setBindGroup(0,mainGroup);pass.draw(4,instances.length/8);pass.end();
      const out=this.#context.getCurrentTexture().createView(),displayPass=encoder.beginRenderPass({colorAttachments:[{view:out,clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
      const displayGroup=d.createBindGroup({layout:this.#displayBindLayout,entries:[{binding:0,resource:{buffer:this.#displayUniform}},{binding:1,resource:emissionView},{binding:2,resource:d.createSampler({magFilter:'linear',minFilter:'linear'})}]});
      displayPass.setPipeline(this.#displayPipeline);displayPass.setBindGroup(0,mainGroup);displayPass.setBindGroup(1,displayGroup);displayPass.draw(3);displayPass.end();
      this.#queue.submit([encoder.finish()]);submitted=true;
      const fence=this.#queue.onSubmittedWorkDone(),scopeResult=this.#popScope(d,scope),results=await Promise.allSettled([fence,scopeResult]);
      const rejected=results.find(r=>r.status==='rejected');if(rejected){if(results[0].status==='rejected')await this.#deviceLostPromise;throw rejected.reason}
      const gpuError=results[1].value;if(gpuError)throw gpuError;
      if(this.#disposed||this.#lost||generation!==this.#generation||cause!==this.#cause||controlKey!==this.#controlKey)return null;
      if(newTarget){const old=this.#target;this.#target=newTarget;newTarget=null;this.#size=size;old?.destroy?.()}
      const receipt=Object.freeze({causeId:cause.id,generation,submission,submitted:true,completed:true,mainFrameVisible:true,drawn:true,visibleToListener:true,sourceTargetVisible:true,submittedAt,completedAt:this.#now(),ageMs,controls});this.#lastReceipt=receipt;return receipt;
    }catch(error){
      this.#lastReceipt=null;
      if(scope.value){try{await this.#popScope(d,scope)}catch{}}
      try{await this.#clear(d)}catch{}
      throw error;
    }finally{
      if(scope.value){try{await this.#popScope(d,scope)}catch{}}
      if(newTarget)newTarget.destroy?.();
      if(submitted&&this.#disposed)this.#lastReceipt=null;
    }
  }
  async #clear(device){
    if(this.#disposed||!this.#context)return;let scope={value:false};device.pushErrorScope('validation');scope.value=true;
    try{const texture=this.#context.getCurrentTexture(),encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.end();this.#queue.submit([encoder.finish()]);
      const results=await Promise.allSettled([this.#queue.onSubmittedWorkDone(),this.#popScope(device,scope)]);const rejected=results.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;if(results[1].value)throw results[1].value;
    }finally{if(scope.value){try{await this.#popScope(device,scope)}catch{}}}
  }
  async dispose(){if(this.#disposePromise)return this.#disposePromise;this.#disposed=true;this.#generation++;this.#cause=null;this.#lastReceipt=null;
    this.#disposePromise=(async()=>{try{await this.#renderChain;await this.#queue?.onSubmittedWorkDone()}catch{try{await this.#deviceLostPromise}catch{}}this.#releaseOwned(this.#device)})();return this.#disposePromise}
}
export function audioEligible(receipt,{verify=false,muted=false,played=new Set()}={}){if(verify||receipt?.controls?.verify||muted||!receipt?.completed||!receipt.sourceTargetVisible||!receipt.controls?.sourceEmission||!receipt.causeId||played.has(receipt.causeId))return false;played.add(receipt.causeId);return true}
