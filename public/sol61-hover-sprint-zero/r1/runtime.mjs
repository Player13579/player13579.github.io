import * as Plan from './source/plan.mjs';
import { WORLD_WGSL, POST_WGSL } from './source/shader.mjs';

const FORMAT='rgba16float';
const align=n=>(n+255)&~255;
const assert=(v,m)=>{if(!v)throw new Error(m)};
export class HoverSprintZeroRuntime {
  constructor(canvas,{onFailure=()=>{}}={}) { this.canvas=canvas;this.onFailure=onFailure;this.device=null;this.context=null;this.resources=null;this.frameId=0;this.completed=0;this.disposed=false;this.generation=1;this.failure=null;this.last=null;this.audioVoices=new Set(); }
  async initialize(){
    let device=null, ownsDevice=false;
    try {
      assert(this.canvas&&typeof navigator!=='undefined'&&navigator.gpu,'WebGPU unavailable');
      const adapter=await navigator.gpu.requestAdapter();assert(adapter,'No WebGPU adapter');
      device=await adapter.requestDevice();ownsDevice=true;this.device=device;
      const context=this.canvas.getContext('webgpu');assert(context,'Canvas WebGPU context unavailable');this.context=context;
      const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'premultiplied'});
      const worldModule=device.createShaderModule({code:WORLD_WGSL,label:'HS zero world'}),postModule=device.createShaderModule({code:POST_WGSL,label:'HS zero post'});
      const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},{binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}}]});
      const pipeLayout=device.createPipelineLayout({bindGroupLayouts:[layout]});
      const world=device.createRenderPipeline({layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:FORMAT},{format:FORMAT}]},primitive:{topology:'triangle-list'}});
      const post=device.createRenderPipeline({layout:pipeLayout,vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});
      for(const module of [worldModule,postModule]){const info=await module.getCompilationInfo();const errs=info.messages.filter(x=>x.type==='error');if(errs.length)throw new Error(errs.map(x=>x.message).join('\n'));}
      if(this.disposed||this.device!==device)throw new Error('Runtime retired during initialization');
      const sampler=device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
      const uniform=device.createBuffer({size:align(160),usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      const resources={format,world,post,layout,sampler,uniform,width:0,height:0,worldTexture:null,keyTexture:null,worldView:null,keyView:null,postGroup:null,canvasFormat:format};this.resources=resources;
      this.resize();
      device.lost.then(info=>{if(this.device===device&&!this.disposed){const error=new Error('WebGPU device lost: '+info.message);this.failure=error;this.onFailure(error);}});
      return this;
    } catch(error){if(ownsDevice){try{device?.destroy();}catch{}if(this.device===device)this.device=null;}this.failure=error;throw error;}
  }
  resize(){const dpr=Math.max(1,Number(devicePixelRatio)||1),w=Math.max(1,Math.round(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.round(this.canvas.clientHeight*dpr));
    if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;
    const r=this.resources;if(!r||r.width===w&&r.height===h)return false;
    r.worldTexture?.destroy();r.keyTexture?.destroy();r.width=w;r.height=h;
    const desc={size:{width:w,height:h},format:FORMAT,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING};
    r.worldTexture=this.device.createTexture({...desc,label:'HS zero radiance'});r.keyTexture=this.device.createTexture({...desc,label:'HS zero emitters'});r.worldView=r.worldTexture.createView();r.keyView=r.keyTexture.createView();
    r.postGroup=this.device.createBindGroup({layout:r.layout,entries:[{binding:0,resource:{buffer:r.uniform,size:160}},{binding:1,resource:r.worldView},{binding:2,resource:r.keyView},{binding:3,resource:r.sampler}]});return true;
  }
  async draw({input,variant='normal',controls={},view}={}){
    assert(!this.disposed&&this.device&&this.resources,'Renderer not ready');
    const r=this.resources;this.resize();
    const scale=view?.scale??Math.min(r.width/384,r.height/256),fit=Math.min(r.width/384,r.height/256),origin=view?.origin??{x:(r.width-384*fit)/2,y:(r.height-256*fit)/2};
    const uniforms=Plan.packUniforms({...input,reducedMotion:variant==='reduced'},{width:r.width,height:r.height,scale,camera:view?.camera??{x:0,y:0},origin},{bodyOn:controls.bodyOn!==false,emitterOn:controls.emitterOn!==false,nearOn:controls.nearOn!==false,postOn:controls.postOn!==false});
    this.device.queue.writeBuffer(r.uniform,0,uniforms);
    const encoder=this.device.createCommandEncoder({label:'HS zero frame'});
    const world=encoder.beginRenderPass({colorAttachments:[{view:r.worldView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},{view:r.keyView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});world.setPipeline(r.world);world.setBindGroup(0,this.device.createBindGroup({layout:r.world.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:r.uniform,size:160}}]}));world.draw(3);world.end();
    const post=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});post.setPipeline(r.post);post.setBindGroup(0,r.postGroup);post.draw(3);post.end();
    const id=++this.frameId;this.device.queue.submit([encoder.finish()]);const done=this.device.queue.onSubmittedWorkDone();await done;
    assert(!this.disposed,'Frame completed after disposal');this.completed=id;
    const proof=Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:this.canvas.isConnected===true,passes:2,viewportWidth:this.canvas.getBoundingClientRect().width,viewportHeight:this.canvas.getBoundingClientRect().height,backingWidth:r.width,backingHeight:r.height,frameId:id,submittedCommands:2,eventId:input.cause.causeId,effectAgeMs:input.clock.flowAgeMs});
    this.last=Object.freeze({input,uniforms:Array.from(uniforms),variant,controls:{...controls},view:{width:r.width,height:r.height,scale,origin},proof});return this.last;
  }
  snapshot(){return Object.freeze({version:Plan.VERSION,disposed:this.disposed,frameId:this.frameId,completedFrameId:this.completed,deviceGeneration:this.generation,failure:this.failure?.message||null,last:this.last,shader:{world:WORLD_WGSL,post:POST_WGSL},audioVoices:this.audioVoices.size});}
  dispose(){if(this.disposed)return;this.disposed=true;this.generation++;for(const v of this.audioVoices){try{v.stop();}catch{}}this.audioVoices.clear();const r=this.resources;this.resources=null;try{r?.worldTexture?.destroy();r?.keyTexture?.destroy();r?.uniform?.destroy();}catch{}try{this.context?.unconfigure?.();}catch{}try{this.device?.destroy();}catch{}this.device=null;this.context=null;}
}
export const __test={align};

