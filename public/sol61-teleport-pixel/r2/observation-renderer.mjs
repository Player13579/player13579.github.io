// Teleport r2: a finite display response to its own visible pixel radiance.
// This module owns only linear scene/source targets, observer spread, and output encoding.
const vertex=`struct V { @builtin(position) p:vec4f,@location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index)i:u32)->V {
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];var v:V;
 v.p=vec4f(q,0,1);v.uv=q*vec2f(.5,-.5)+vec2f(.5);return v;
}`;
const blur=vertex+`
struct Params { size:vec2f,axis:vec2f,radius:f32,gain:f32,pad:vec2f };
@group(0) @binding(0) var src:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
@group(0) @binding(2) var<uniform> u:Params;
@fragment fn fs(v:V)->@location(0) vec4f {
 let pixel=1./u.size;let delta=u.axis*pixel*u.radius;
 let weights=array<f32,5>(.227027,.194595,.121622,.054054,.016216);
 var radiance=textureSampleLevel(src,samp,clamp(v.uv,pixel*.5,1.-pixel*.5),0).rgb*weights[0];
 for(var i=1;i<5;i++) {let offset=delta*f32(i);
 radiance+=weights[i]*(textureSampleLevel(src,samp,clamp(v.uv+offset,pixel*.5,1.-pixel*.5),0).rgb+
 textureSampleLevel(src,samp,clamp(v.uv-offset,pixel*.5,1.-pixel*.5),0).rgb);}
 return vec4f(radiance,0);
}`;
const composite=vertex+`
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var glow:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@group(0) @binding(3) var<uniform> gain:vec4f;
fn encode(c:vec3f)->vec3f {let x=max(c,vec3f(0));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));}
@fragment fn fs(v:V)->@location(0) vec4f {
 let radiance=textureSampleLevel(scene,samp,v.uv,0).rgb+textureSampleLevel(glow,samp,v.uv,0).rgb*gain.x;
 return vec4f(encode(radiance),1);
}`;
export function createObservationRenderer(device,format) {
 const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 const pipeline=(code,out,label)=>{const module=device.createShaderModule({code,label});return device.createRenderPipeline({label,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:out}]},primitive:{topology:'triangle-list'}});};
 const blurPipeline=pipeline(blur,'rgba16float','Teleport r2 source-bound retinal spread');
 const compositePipeline=pipeline(composite,format,'Teleport r2 linear composite and final encoding');
 const uniformX=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const uniformY=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const uniformGain=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 let targets=null;let disposed=false;const retired=[];
 function retire(old){if(!old)return;const done=Promise.resolve(device.queue.onSubmittedWorkDone()).catch(()=>{}).then(()=>old.textures.forEach(t=>t.destroy()));retired.push(done);}
 function ensure(width,height){
  if(disposed)throw Error('Released teleport observer');
  if(targets?.width===width&&targets.height===height)return;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw RangeError('Positive device-pixel target size required');
  retire(targets);
  const make=label=>device.createTexture({label,size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const scene=make('Teleport r2 linear scene'),source=make('Teleport r2 current pixel source'),spreadX=make('Teleport r2 horizontal spread'),spreadY=make('Teleport r2 vertical spread');
  targets={width,height,scene,source,spreadX,spreadY,textures:[scene,source,spreadX,spreadY]};
 }
 const attachment=(texture,clearValue={r:0,g:0,b:0,a:0})=>({view:texture.createView(),loadOp:'clear',storeOp:'store',clearValue});
 const group=(texture,buffer)=>device.createBindGroup({layout:blurPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler},{binding:2,resource:{buffer}}]});
 return Object.freeze({
  begin(encoder,width,height,light=false){ensure(width,height);return encoder.beginRenderPass({label:'Teleport r2 pixels and same-source MRT',colorAttachments:[attachment(targets.scene,light?{r:.64,g:.70,b:.76,a:1}:{r:.035,g:.05,b:.065,a:1}),attachment(targets.source)]});},
  finish(encoder,output,observerOn=true){
   if(disposed||!targets)throw Error('Teleport r2 observer not prepared');
   const {width,height}=targets;const radius=2.2*Math.max(1,Math.min(2,globalThis.devicePixelRatio||1));
   device.queue.writeBuffer(uniformX,0,new Float32Array([width,height,1,0,radius,0,0,0]));
   device.queue.writeBuffer(uniformY,0,new Float32Array([width,height,0,1,radius,0,0,0]));
   device.queue.writeBuffer(uniformGain,0,new Float32Array([observerOn?.34:0,0,0,0]));
   for(const [src,dst,uniform] of [[targets.source,targets.spreadX,uniformX],[targets.spreadX,targets.spreadY,uniformY]]){
    const pass=encoder.beginRenderPass({label:'Teleport r2 finite separable observer spread',colorAttachments:[attachment(dst)]});
    pass.setPipeline(blurPipeline);pass.setBindGroup(0,group(src,uniform));pass.draw(3);pass.end();
   }
   const bind=device.createBindGroup({layout:compositePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:targets.scene.createView()},{binding:1,resource:targets.spreadY.createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:uniformGain}}]});
   const pass=encoder.beginRenderPass({label:'Teleport r2 final canvas encoding',colorAttachments:[attachment(output,{r:0,g:0,b:0,a:1})]});
   pass.setPipeline(compositePipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
  },
  async destroy(){if(disposed)return;disposed=true;retire(targets);targets=null;await Promise.allSettled(retired);uniformX.destroy();uniformY.destroy();uniformGain.destroy();}
 });
}
