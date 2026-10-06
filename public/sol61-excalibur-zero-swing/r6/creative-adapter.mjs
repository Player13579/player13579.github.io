import {WORLD_WGSL,PROBE_WGSL,OBS_WGSL} from './creative-shader.mjs';
import {EDITION,planCreativeFrame,encodeFrameUniforms} from './creative-plan.mjs';

export class ExcaliburCreativeAdapter {
 static async create(device,{presentationFormat,lease=null,onConstructing=()=>{},record=()=>{}}={}){
  if(!device||!['bgra8unorm','rgba8unorm'].includes(presentationFormat))throw new TypeError('Actual non-sRGB bgra8unorm or rgba8unorm presentation format required; R6 encodes sRGB once');
  const adapter=new ExcaliburCreativeAdapter(device,presentationFormat,{lease,record});onConstructing(adapter);try{await adapter.initialize();adapter.check();return adapter;}catch(error){try{await lease?.cleanupBarrier;}catch{}try{await adapter.dispose();}catch{}throw error;}
 }
 constructor(device,format,{lease=null,record=()=>{}}={}){this.device=device;this.format=format;this.lease=lease;this.record=record;this.version='excalibur-creative-adapter/v6';this.closed=false;this.bind=null;this.lastPlan=null;this.viewport=null;this.resources=new Set();this.disposePromise=null;}
 check(){if(this.closed||this.lease?.isCurrent&&!this.lease.isCurrent())throw Object.assign(new Error('Excalibur creative startup retired'),{code:'EXCALIBUR_STARTUP_RETIRED'});}
 own(resource){if(this.closed||this.lease?.isCurrent&&!this.lease.isCurrent()){resource?.destroy?.();this.check();}this.resources.add(resource);return resource;}
 async initialize(){
  this.check();this.uniform=this.own(this.device.createBuffer({label:`${EDITION} uniforms`,size:1280,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
  this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
  const worldModule=this.device.createShaderModule({label:`${EDITION} world HDR shader`,code:WORLD_WGSL});
  const obsModule=this.device.createShaderModule({label:`${EDITION} source-bound optical shader`,code:OBS_WGSL});
  const probeModule=this.device.createShaderModule({label:`${EDITION} same-frame optical source probe`,code:PROBE_WGSL});
  this.probeTexture=this.own(this.device.createTexture({label:`${EDITION} flux + centroid2x1`,size:{width:2,height:1},format:'rgba32float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
  this.probeView=this.probeTexture.createView();
  this.compilation=[];
  for(const [kind,module] of [['world',worldModule],['probe',probeModule],['observer',obsModule]]){
   this.check();this.record(`creative-${kind}-compile`,'enter');let info;try{info=await module.getCompilationInfo();}catch(e){this.record(`creative-${kind}-compile`,'error',e);throw e;}this.check();this.record(`creative-${kind}-compile`,'exit');this.compilation.push({kind,messages:info.messages});
   const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(`${kind}: ${errors.map(x=>x.message).join('; ')}`);
  }
  this.record('creative-world-pipeline','enter');let worldPipeline;try{worldPipeline=await this.device.createRenderPipelineAsync({label:`${EDITION} main + emission MRT`,layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});}catch(e){this.record('creative-world-pipeline','error',e);throw e;}if(this.closed||this.lease?.isCurrent&&!this.lease.isCurrent()){try{worldPipeline?.destroy?.();}catch{}this.check();}this.worldPipeline=worldPipeline;this.record('creative-world-pipeline','exit');
  this.record('creative-probe-pipeline','enter');let probePipeline;try{probePipeline=await this.device.createRenderPipelineAsync({label:`${EDITION} same-frame flux and centroid`,layout:'auto',vertex:{module:probeModule,entryPoint:'vs'},fragment:{module:probeModule,entryPoint:'fs',targets:[{format:'rgba32float'}]},primitive:{topology:'triangle-list'}});}catch(e){this.record('creative-probe-pipeline','error',e);throw e;}if(this.closed||this.lease?.isCurrent&&!this.lease.isCurrent()){try{probePipeline?.destroy?.();}catch{}this.check();}this.probePipeline=probePipeline;this.record('creative-probe-pipeline','exit');
  const obsLayout=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}}]});
  this.obsLayout=this.device.createPipelineLayout({bindGroupLayouts:[obsLayout]});
  this.record('creative-observer-pipeline','enter');let obsPipeline;try{obsPipeline=await this.device.createRenderPipelineAsync({label:`${EDITION} optical response + presentation once`,layout:this.obsLayout,vertex:{module:obsModule,entryPoint:'vs'},fragment:{module:obsModule,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});}catch(e){this.record('creative-observer-pipeline','error',e);throw e;}if(this.closed||this.lease?.isCurrent&&!this.lease.isCurrent()){try{obsPipeline?.destroy?.();}catch{}this.check();}this.obsPipeline=obsPipeline;this.record('creative-observer-pipeline','exit');
 }
 resize({physicalViewport,worldView,emissionView}){this.viewport=physicalViewport;this.worldView=worldView;this.emissionView=emissionView;this.obsBind=this.device.createBindGroup({layout:this.obsPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:worldView},{binding:2,resource:emissionView},{binding:3,resource:this.sampler},{binding:4,resource:this.probeView}]});this.probeBind=this.device.createBindGroup({layout:this.probePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:2,resource:emissionView},{binding:3,resource:this.sampler}]});}
 render({encoder,motion,releaseMotion=null,sourceEpoch,releaseEpoch,sourceTexture,physicalViewport,camera2D,worldView,emissionView,targetView,sourceOn,mainOn,obsOn,supply=1,material={},observer={},reducedMotion=false}){
  if(this.closed)throw new Error('Creative adapter disposed');
  if(this.worldView!==worldView||this.emissionView!==emissionView)this.resize({physicalViewport,worldView,emissionView});
  const plan=planCreativeFrame({motion,releaseMotion,sourceEpoch,releaseEpoch,physicalViewport,camera2D,sourceOn,mainOn,obsOn,supply,material,observer,reducedMotion});
  this.device.queue.writeBuffer(this.uniform,0,encodeFrameUniforms(plan,physicalViewport,camera2D));
  const texture=sourceTexture.texture||sourceTexture;
  if(this.boundSource!==texture){this.boundSource=texture;this.bind=this.device.createBindGroup({layout:this.worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:this.sampler}]});}
  const clear={r:0,g:0,b:0,a:0};
  const worldPass=encoder.beginRenderPass({label:`${EDITION} ${plan.clear?'finite-clear':'world-and-source-radiance'}`,colorAttachments:[{view:worldView,clearValue:clear,loadOp:'clear',storeOp:'store'},{view:emissionView,clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  worldPass.setPipeline(this.worldPipeline);worldPass.setBindGroup(0,this.bind);worldPass.draw(3);worldPass.end();
  const probePass=encoder.beginRenderPass({label:`${EDITION} optical-source-probe`,colorAttachments:[{view:this.probeView,clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  probePass.setPipeline(this.probePipeline);probePass.setBindGroup(0,this.probeBind);probePass.draw(3);probePass.end();
  const postPass=encoder.beginRenderPass({label:`${EDITION} ${plan.clear?'transparent-clear':'lens-and-presentation'}`,colorAttachments:[{view:targetView,clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  postPass.setPipeline(this.obsPipeline);postPass.setBindGroup(0,this.obsBind);postPass.draw(3);postPass.end();
  this.lastPlan=plan;
  return Object.freeze({edition:EDITION,passes:3,active:plan.active,emitting:plan.emitting,clear:plan.clear,peakStatus:plan.peakStatus||'expired',plan});
 }
 dispose(){if(this.disposePromise)return this.disposePromise;this.closed=true;this.disposePromise=Promise.resolve().then(()=>{for(const resource of this.resources){try{resource?.destroy?.();}catch{}}this.resources.clear();this.probeBind=null;this.probeView=null;this.bind=null;this.obsBind=null;this.lastPlan=null;});return this.disposePromise;}
}
