export const VERSION='stamina-sparkle-sol61-r3';
export const AUTHOR='GPT-6.1-Sol';
export const DURATION_MS=1320;
export const CROSS_AXES_DEGREES=Object.freeze([22.5,112.5]);
export const CROSS_COUNT=12;
export const FIXTURE=Object.freeze({path:'./body.png',crop:[62,15,136,225],sourceSha256:'cf3df51d88129ad51e175dd894ef2c269626a2d60fec912289789e099d8fcb8f'});
const finite=Number.isFinite,clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function plan({causeId,receiverId,ageMs,anchor,heightPx=64,reducedMotion=false,source=true,receiver=true,cross=true,post=true,body=true}){
  if(typeof causeId!=='string'||!causeId||typeof receiverId!=='string'||!receiverId||![ageMs,anchor?.x,anchor?.y,heightPx].every(finite)||heightPx<=0||ageMs<0||ageMs>=DURATION_MS)return null;
  return Object.freeze({causeId,receiverId,ageMs,anchor:Object.freeze({...anchor}),heightPx,reducedMotion:Boolean(reducedMotion),source:Boolean(source),receiver:Boolean(receiver),cross:Boolean(cross),post:Boolean(post),body:Boolean(body)});
}
export function phaseAt(ageMs){const p=clamp(ageMs/DURATION_MS,0,1);return p<.114?'供給':p<.515?'到達':p<.773?'定着':p<1?'消散':'終了';}
export const WORLD_WGSL=String.raw`
struct U { screen:vec4f, actor:vec4f, flags:vec4f, crop:vec4f, debug:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var person:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
struct V { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V{
 let pts=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var v:V;v.pos=vec4f(pts[i],0.,1.);v.uv=vec2f((pts[i].x+1.)*.5,(1.-pts[i].y)*.5);return v;
}
fn soft(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn rot(p:vec2f,a:f32)->vec2f{return vec2f(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y);}
fn ell(p:vec2f,r:vec2f)->f32{return length(p/r)-1.;}
fn fold(p:vec2f,open:f32)->vec2f {
 let outer=ell(p,vec2f(.125+open*.037,.245));
 let hollow=ell(p-vec2f(.079+open*.023,-.018),vec2f(.099,.214));
 let d=max(outer,-hollow);let coverage=1.-soft(-.03,.04,d);
 let ridge=exp(-pow((p.x+.025)/.029,2.))*exp(-pow(p.y/.18,2.));
 return vec2f(coverage,coverage*(.52+ridge*1.85));
}
fn crossLight(q:vec2f,arm:f32)->f32 {
 // Exact selected axes, clockwise from vertical: 22.5deg and 112.5deg.
 let dir=vec2f(.3826834324,-.9238795325);let side=vec2f(.9238795325,.3826834324);
 let p=vec2f(dot(q,dir),dot(q,side));
 let thin=.016;let a=exp(-pow(p.y/thin,2.))*pow(max(0.,1.-abs(p.x)/arm),1.);
 let b=exp(-pow(p.x/thin,2.))*pow(max(0.,1.-abs(p.y)/(arm*.85)),1.);
 return a+b+exp(-dot(q,q)/.00016)*2.2;
}
struct O{@location(0) scene:vec4f,@location(1) emission:vec4f};
@fragment fn fs(v:V)->O{
 let px=v.uv*u.screen.xy;let q=(px-u.actor.xy)/u.screen.w;
 let t=clamp(u.screen.z/1320.,0.,1.);let live=select(0.,1.,u.screen.z>=0.&&u.screen.z<1320.);
 let onset=soft(0.,.10,t);let end=1.-soft(.80,1.,t);
 let travelScale=select(1.,.56,u.flags.w>.5);
 let bodyUV=vec2f((q.x+.30222222)/.60444444,q.y+1.);
 var personColor=vec4f(0.);
 if(all(bodyUV>=vec2f(0.))&&all(bodyUV<=vec2f(1.))&&u.flags.z>.5){
  let uv=(u.crop.xy+bodyUV*u.crop.zw)/vec2f(textureDimensions(person));
  personColor=textureSampleLevel(person,smp,uv,0.);
  personColor=vec4f(pow(max(personColor.rgb,vec3f(0.)),vec3f(2.2)),personColor.a);
 }
 var rear=vec3f(0.);var front=vec3f(0.);
 // R3: finite ascending ribbons convey a receipt into the body, not rigid crescent objects.
 for(var i=0;i<3;i++){
  let fi=f32(i);let delay=fi*.075;
  let progress=clamp((t-delay)/.64,0.,1.);
  let ribbonEnvelope=soft(0.,.065,t-delay)*(1.-soft(.69,.89,t-delay))*live*u.actor.z;
  let pathY=clamp((-q.y-.08)/.58,0.,1.);
  let theta=pathY*6.2831853+fi*2.0943951;
  let radius=mix(.30,.17,pathY)*travelScale;
  let centerX=sin(theta)*radius;
  let frontPart=soft(-.18,.18,cos(theta));
  let width=.014+.012*(1.-pathY);
  let profile=exp(-pow((q.x-centerX)/width,2.));
  let vertical=soft(.01,.06,pathY)*(1.-soft(.91,1.,pathY));
  let head=exp(-pow((pathY-progress)/.085,2.));
  let wake=soft(progress-.34,progress-.07,pathY)*(1.-soft(progress,progress+.045,pathY));
  let arrival=exp(-pow((pathY-.88)/.07,2.))*soft(.65,.88,progress);
  let col=mix(vec3f(1.,.49,.10),vec3f(1.,.90,.48),pathY);
  let energy=col*profile*vertical*(head*4.8+wake*1.35+arrival*1.8)*ribbonEnvelope;
  rear+=energy*(1.-frontPart);front+=energy*frontPart;
 }
 let receive=soft(.27,.60,t)*(1.-soft(.77,1.,t))*live*u.actor.w;
 let lower=exp(-pow((abs(q.x)-.11)/.075,2.)-pow((q.y+.24)/.25,2.));
 let upper=exp(-pow(q.x/.18,2.)-pow((q.y+.46)/.12,2.));
 let receiverMask=max(lower,upper*.58);
 let settleWave=exp(-pow((q.y+.19+.43*soft(.32,.69,t))/.105,2.));
 let received=vec3f(1.,.73,.26)*(receiverMask*.70+settleWave*.95)*receive*personColor.a*1.7;
 var stars=vec3f(0.);
 if(u.flags.x>.5){for(var i=0;i<12;i++){
  let fi=f32(i);let side=select(-1.,1.,i%2==1);let born=(75.+fi*90.)/1320.;
  let a=(t-born)/(.255*1000./1320.);let sparkle=sin(clamp(a,0.,1.)*3.14159265);let gate=select(0.,1.,a>0.&&a<1.);
  let arm=(.165+.012*f32(i%3))*(.80+.20*sparkle);
  let k=soft(.10,.60,t);let sourcePos=vec2f(side*(.29+.08*(1.-k)*travelScale),-.10-.50*k+sin(fi*2.3)*.07);
  let receiverPos=vec2f(side*(.36+f32(i%3)*.025),-.25-f32(i%3)*.16);
  let pos=select(sourcePos,receiverPos,i>=6);
  let sourceBound=select(u.actor.z,u.actor.w,i>=6);
  stars+=mix(vec3f(1.,.68,.24),vec3f(1.,.95,.74),sparkle)*crossLight(q-pos,max(.001,arm))*sparkle*gate*sourceBound*live*2.5;
 }}
 let bg=mix(vec3f(.012,.020,.029),vec3f(.82,.82,.82),u.debug.x);
 let behind=bg+rear;let actorRGB=personColor.rgb+received;
 let scene=mix(behind,actorRGB,personColor.a)+front+stars;
 let emission=rear*(1.-personColor.a)+front+stars+received;
 var o:O;o.scene=vec4f(scene,1.);o.emission=vec4f(emission,1.);return o;
}`;
export const POST_WGSL=String.raw`
struct U { screen:vec4f, actor:vec4f, flags:vec4f, crop:vec4f, debug:vec4f };
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var emission:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
@group(0) @binding(3) var<uniform> u:U;
struct V{@builtin(position) pos:vec4f,@location(0) uv:vec2f};
@vertex fn vs(@builtin(vertex_index) i:u32)->V{let pts=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var v:V;v.pos=vec4f(pts[i],0.,1.);v.uv=vec2f((pts[i].x+1.)*.5,(1.-pts[i].y)*.5);return v;}
@fragment fn fs(v:V)->@location(0) vec4f{
 let pixel=1./u.screen.xy;let radius=u.screen.w*.042;
 var spread=textureSampleLevel(emission,smp,v.uv,0.).rgb*.20;
 for(var i=0;i<8;i++){let a=f32(i)*.7853981634;let d=vec2f(cos(a),sin(a))*pixel*radius;spread+=textureSampleLevel(emission,smp,v.uv+d,0.).rgb*.0625;spread+=textureSampleLevel(emission,smp,v.uv+d*2.,0.).rgb*.0375;}
 let hdr=textureSampleLevel(scene,smp,v.uv,0.).rgb+spread*u.flags.y*.27;
 // Fixed display response; no background-dependent intensity adaptation.
 return vec4f(pow(max(hdr,vec3f(0.)),vec3f(1./2.2)),1.);
}`;
export async function createRenderer(canvas,image,{onDiagnostic=()=>{}}={}){
  if(!navigator.gpu)throw Error('WebGPUが必要です');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapterを取得できません');
  const device=await adapter.requestDevice();const context=canvas.getContext('webgpu');if(!context){device.destroy();throw Error('webgpu canvas contextを取得できません');}const format=navigator.gpu.getPreferredCanvasFormat();
  const errors=[];device.addEventListener('uncapturederror',e=>{errors.push(e.error.message);if(errors.length>16)errors.shift();onDiagnostic({stage:'uncaptured',message:e.error.message});});
  device.lost.then(info=>onDiagnostic({stage:'device-lost',message:info.message,reason:info.reason}));
  const compile=async(code,label)=>{const module=device.createShaderModule({code,label});const info=await module.getCompilationInfo();const messages=info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));onDiagnostic({stage:'shader',label,messages});if(messages.some(m=>m.type==='error'))throw Error(JSON.stringify({label,messages}));return module;};
  try {
  device.pushErrorScope('validation');const world=await compile(WORLD_WGSL,'stamina-world-r3'),post=await compile(POST_WGSL,'stamina-post-r3');
  const worldPipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:world,entryPoint:'vs'},fragment:{module:world,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const postPipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:post,entryPoint:'vs'},fragment:{module:post,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  const creationError=await device.popErrorScope();if(creationError)throw Error(creationError.message);
  const texture=device.createTexture({size:[image.width,image.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:image},{texture},[image.width,image.height]);
  const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'}),uniform=device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const bindWorld=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:sampler}]});
  let targets=[],bindPost=null,width=0,height=0,disposed=false,submissions=0;
  function resize(w,h){if(w===width&&h===height)return;for(const t of targets)t.destroy();width=w;height=h;canvas.width=w;canvas.height=h;context.configure({device,format,alphaMode:'opaque'});targets=[0,1].map(()=>device.createTexture({size:[w,h],format:'rgba16float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT}));bindPost=device.createBindGroup({layout:postPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:targets[0].createView()},{binding:1,resource:targets[1].createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:uniform}}]});}
  function render(input){if(disposed)throw Error('renderer disposed');const rect=canvas.getBoundingClientRect();const dpr=window.devicePixelRatio||1;if(![rect.width,rect.height,dpr,input?.ageMs,input?.anchor?.x,input?.anchor?.y,input?.heightPx].every(finite)||rect.width<=0||rect.height<=0||dpr<=0||input.ageMs<0||input.heightPx<=0||typeof input.causeId!=='string'||!input.causeId||typeof input.receiverId!=='string'||!input.receiverId)throw Error('invalid stamina render input');if(input.ageMs<DURATION_MS&&!plan(input))throw Error('invalid stamina plan');resize(Math.max(1,Math.round(rect.width*dpr)),Math.max(1,Math.round(rect.height*dpr)));const p=input;
   const values=new Float32Array([width,height,p?.ageMs??DURATION_MS,(p?.heightPx??64)*dpr,(p?.anchor.x??rect.width*.5)*dpr,(p?.anchor.y??rect.height*.65)*dpr,Number(p?.source),Number(p?.receiver),Number(p?.cross),Number(p?.post),Number(p?.body),Number(p?.reducedMotion),...FIXTURE.crop,Number(p?.lightBackground),0,0,0]);
   if(!values.every(finite))throw Error('nonfinite stamina uniform');device.queue.writeBuffer(uniform,0,values);const encoder=device.createCommandEncoder({label:VERSION});const a=encoder.beginRenderPass({colorAttachments:targets.map(t=>({view:t.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}))});a.setPipeline(worldPipeline);a.setBindGroup(0,bindWorld);a.draw(3);a.end();const b=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});b.setPipeline(postPipeline);b.setBindGroup(0,bindPost);b.draw(3);b.end();device.queue.submit([encoder.finish()]);submissions++;return {submissions,width,height,bodyProjectedHeight:p?.heightPx??64,postEnabled:Boolean(p?.post),causeId:p?.causeId??null,ageMs:p?.ageMs??DURATION_MS};
  }
  return {render,device,get submissions(){return submissions},errors,dispose(){if(disposed)return;disposed=true;for(const t of targets)t.destroy();texture.destroy();uniform.destroy();context.unconfigure();device.destroy();}};
  } catch(error){context.unconfigure();device.destroy();throw error;}
}
