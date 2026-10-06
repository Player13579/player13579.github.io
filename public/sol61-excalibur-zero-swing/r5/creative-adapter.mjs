import {WORLD_WGSL,OBS_WGSL} from './creative-shader.mjs';
import {EDITION,planCreativeFrame,encodeFrameUniforms} from './creative-plan.mjs';

export class ExcaliburCreativeAdapter {
 static async create(device,{presentationFormat}={}){
  if(!device||!presentationFormat)throw new TypeError('device and actual presentationFormat required');
  const adapter=new ExcaliburCreativeAdapter(device,presentationFormat);await adapter.initialize();return adapter;
 }
 constructor(device,format){this.device=device;this.format=format;this.version='excalibur-creative-adapter/v5';this.closed=false;this.bind=null;this.lastPlan=null;this.viewport=null;}
 async initialize(){
  this.uniform=this.device.createBuffer({label:`${EDITION} uniforms`,size:1280,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  this.sampler=this.device.createSampler({magFilter:'linear',minFilter:'linear'});
  const worldModule=this.device.createShaderModule({label:`${EDITION} world HDR shader`,code:WORLD_WGSL});
  const obsModule=this.device.createShaderModule({label:`${EDITION} source-bound optical shader`,code:OBS_WGSL});
  this.compilation=[];
  for(const [kind,module] of [['world',worldModule],['observer',obsModule]]){
   const info=await module.getCompilationInfo();this.compilation.push({kind,messages:info.messages});
   const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(`${kind}: ${errors.map(x=>x.message).join('; ')}`);
  }
  this.worldPipeline=await this.device.createRenderPipelineAsync({label:`${EDITION} main + emission MRT`,layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  this.obsPipeline=await this.device.createRenderPipelineAsync({label:`${EDITION} optical response + presentation once`,layout:'auto',vertex:{module:obsModule,entryPoint:'vs'},fragment:{module:obsModule,entryPoint:'fs',targets:[{format:this.format}]},primitive:{topology:'triangle-list'}});
 }
 resize({physicalViewport,worldView,emissionView}){this.viewport=physicalViewport;this.worldView=worldView;this.emissionView=emissionView;this.obsBind=this.device.createBindGroup({layout:this.obsPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniform}},{binding:1,resource:worldView},{binding:2,resource:emissionView},{binding:3,resource:this.sampler}]});}
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
  const postPass=encoder.beginRenderPass({label:`${EDITION} ${plan.clear?'transparent-clear':'lens-and-presentation'}`,colorAttachments:[{view:targetView,clearValue:clear,loadOp:'clear',storeOp:'store'}]});
  postPass.setPipeline(this.obsPipeline);postPass.setBindGroup(0,this.obsBind);postPass.draw(3);postPass.end();
  this.lastPlan=plan;
  return Object.freeze({edition:EDITION,passes:2,active:plan.active,emitting:plan.emitting,clear:plan.clear,peakStatus:plan.peakStatus||'expired',plan});
 }
 dispose(){if(this.closed)return;this.closed=true;this.uniform?.destroy();this.bind=null;this.obsBind=null;this.lastPlan=null;}
}
