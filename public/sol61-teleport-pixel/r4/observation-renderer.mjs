// R4 world receiver and observation operations share only current emitted source.
import {RADIANCE} from './teleport-pixel.mjs';
const vertex=`struct V { @builtin(position) p:vec4f,@location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index)i:u32)->V {
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];var v:V;
 v.p=vec4f(q,0,1);v.uv=q*vec2f(.5,-.5)+vec2f(.5);return v;
}`;
export const BLUR_WGSL=vertex+`
struct Params { size:vec2f,axis:vec2f,radius:f32,gateFirst:f32,pad:vec2f };
@group(0) @binding(0) var src:texture_2d<f32>;
@group(0) @binding(1) var samp:sampler;
@group(0) @binding(2) var<uniform> u:Params;
fn sourceResponse(c:vec3f)->vec3f {
 let luminance=dot(c,vec3f(.2126,.7152,.0722));
 return c*select(1.,smoothstep(.02,.08,luminance),u.gateFirst>0.);
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let pixel=1./u.size;let delta=u.axis*pixel*u.radius;
 let weights=array<f32,5>(.227027,.194595,.121622,.054054,.016216);
 var radiance=sourceResponse(textureSampleLevel(src,samp,clamp(v.uv,pixel*.5,1.-pixel*.5),0).rgb)*weights[0];
 for(var i=1;i<5;i++) {let offset=delta*f32(i);
 radiance+=weights[i]*(sourceResponse(textureSampleLevel(src,samp,clamp(v.uv+offset,pixel*.5,1.-pixel*.5),0).rgb)+
 sourceResponse(textureSampleLevel(src,samp,clamp(v.uv-offset,pixel*.5,1.-pixel*.5),0).rgb));}
 return vec4f(radiance,0);
}`;
export const COMPOSITE_WGSL=vertex+`
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var receiver:texture_2d<f32>;
@group(0) @binding(2) var observer:texture_2d<f32>;
@group(0) @binding(3) var samp:sampler;
@group(0) @binding(4) var<uniform> gain:vec4f;
fn encode(c:vec3f)->vec3f {let x=max(c,vec3f(0));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));}
@fragment fn fs(v:V)->@location(0) vec4f {
 let body=textureSampleLevel(scene,samp,v.uv,0).rgb;
 let nearby=textureSampleLevel(receiver,samp,v.uv,0).rgb*gain.x;
 let display=textureSampleLevel(observer,samp,v.uv,0).rgb*gain.y;
 return vec4f(encode(body+nearby+display),1);
}`;
export function createObservationRenderer(device,format) {
 const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 const pipeline=(code,out,label)=>{const module=device.createShaderModule({code,label});return device.createRenderPipeline({label,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:out}]},primitive:{topology:'triangle-list'}});};
 const blurPipeline=pipeline(BLUR_WGSL,'rgba16float','Teleport r4 current source transport');
 const compositePipeline=pipeline(COMPOSITE_WGSL,format,'Teleport r4 local receiver and observer final encoding');
 const uniforms=Array.from({length:4},()=>device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
 const uniformGain=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 let targets=null,disposed=false;const retired=[];
 function retire(old){if(!old)return;const done=Promise.resolve(device.queue.onSubmittedWorkDone()).catch(()=>{}).then(()=>old.textures.forEach(t=>t.destroy()));retired.push(done);}
 function ensure(width,height){
  if(disposed)throw Error('Released teleport observer');
  if(targets?.width===width&&targets.height===height)return;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw RangeError('Positive device-pixel target size required');
  retire(targets);
  const make=label=>device.createTexture({label,size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  const [scene,source,nearX,nearY,obsX,obsY]=['linear scene','current pixel source','nearby horizontal','nearby vertical','observer horizontal','observer vertical'].map(s=>make('Teleport r4 '+s));
  targets={width,height,scene,source,nearX,nearY,obsX,obsY,textures:[scene,source,nearX,nearY,obsX,obsY]};
 }
 const attachment=(texture,clearValue={r:0,g:0,b:0,a:0})=>({view:texture.createView(),loadOp:'clear',storeOp:'store',clearValue});
 const group=(texture,buffer)=>device.createBindGroup({layout:blurPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:texture.createView()},{binding:1,resource:sampler},{binding:2,resource:{buffer}}]});
 return Object.freeze({
  begin(encoder,width,height,light=false){ensure(width,height);return encoder.beginRenderPass({label:'Teleport r4 exact pixels and current source MRT',colorAttachments:[attachment(targets.scene,light?{r:.64,g:.70,b:.76,a:1}:{r:.035,g:.05,b:.065,a:1}),attachment(targets.source)]});},
  finish(encoder,output,observerOn=true,{cssWidth=targets?.width,cssHeight=targets?.height,receiverOn=true}={}){
   if(disposed||!targets)throw Error('Teleport r4 observer not prepared');
   if(![cssWidth,cssHeight].every(x=>Number.isFinite(x)&&x>0))throw RangeError('Positive CSS source footprint required');
   const {width,height}=targets,scaleX=width/cssWidth,scaleY=height/cssHeight;
   const stages=[[targets.source,targets.nearX,1,0,RADIANCE.receiverRadiusCss*scaleX,1],
    [targets.nearX,targets.nearY,0,1,RADIANCE.receiverRadiusCss*scaleY,0],
    [targets.source,targets.obsX,1,0,RADIANCE.observerRadiusCss*scaleX,1],
    [targets.obsX,targets.obsY,0,1,RADIANCE.observerRadiusCss*scaleY,0]];
   stages.forEach(([src,dst,x,y,radius,gateFirst],index)=>{
    const uniform=uniforms[index];device.queue.writeBuffer(uniform,0,new Float32Array([width,height,x,y,radius,gateFirst,0,0]));
    const pass=encoder.beginRenderPass({label:index<2?'Teleport r4 local diffuse receiver':'Teleport r4 source-bound display spread',colorAttachments:[attachment(dst)]});
    pass.setPipeline(blurPipeline);pass.setBindGroup(0,group(src,uniform));pass.draw(3);pass.end();
   });
   device.queue.writeBuffer(uniformGain,0,new Float32Array([receiverOn?RADIANCE.receiverGain:0,observerOn?RADIANCE.observerGain:0,0,0]));
   const bind=device.createBindGroup({layout:compositePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:targets.scene.createView()},{binding:1,resource:targets.nearY.createView()},{binding:2,resource:targets.obsY.createView()},{binding:3,resource:sampler},{binding:4,resource:{buffer:uniformGain}}]});
   const pass=encoder.beginRenderPass({label:'Teleport r4 final canvas encoding',colorAttachments:[attachment(output,{r:0,g:0,b:0,a:1})]});
   pass.setPipeline(compositePipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
  },
  async destroy(){if(disposed)return;disposed=true;retire(targets);targets=null;await Promise.allSettled(retired);uniforms.forEach(u=>u.destroy());uniformGain.destroy();}
 });
}
