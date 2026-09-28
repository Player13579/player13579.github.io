// Astra Luck zero r05: surface concentration and shared recipient reflection.
export const EDITION='astra-luck-zero-r05';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function state(elapsed,duration=1450){const p=elapsed/duration;return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.24?'forming':p<.58?'aligning':p<.84?'settled':p<1?'consuming':'ended'};}
export function canStart(r){return Boolean(r&&r.id&&r.type==='gain-luckBoost'&&r.effectKind==='luckBoost'&&Number.isFinite(r.durationMs)&&r.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000);let v=0;
  for(const [at,hz,amp]of[[.06,523.25,.018],[.18,659.25,.022],[.31,783.99,.018]]){
   const d=p-at;if(d>0)v+=amp*(1-Math.exp(-d*95))*Math.exp(-d*13)*Math.sin(2*Math.PI*hz*t);
  }
  const s=p-.50;if(s>0)v+=.035*(1-Math.exp(-s*70))*Math.exp(-s*4)*(Math.sin(2*Math.PI*1046.5*t)+.40*Math.sin(2*Math.PI*1569.75*t)+.12*Math.sin(2*Math.PI*2616.25*t));
  out[i]=v*ease(0,.018,p)*(1-ease(.86,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
let topology;
export function geometry(p){if(p<=0||p>=1)return new Float32Array();if(topology)return topology;const a=[];for(const q of[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])a.push(...q,0,0,0,1,1,1,1,1);return topology=new Float32Array(a);}
export const SPARKLE_ANGLE=Math.PI/6;
export function focusPoint(id,p){const a=ease(.18,.58,p);return id===0?[-35+15*a,-39+3*a]:[30-10*a,-23-4*a];}
export function glints(p){
 const out=[];for(const [id,at]of[.13,.29,.48,.58,.72].entries()){
  const t=(p-at)/.20;if(t<=0||t>=1)continue;
  const [x,y]=id<2?focusPoint(id,p):[[-16,-5],[15,-12],[-7,-28]][id-2];
  out.push({x,y,theta:SPARKLE_ANGLE,amp:ease(0,.2,t)*(1-ease(.7,1,t)),r:id<2?8.8:7.8});
 }return out;
}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,reduced:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(p:vec3f)->vec4f{return vec4f(vec2f(p.x+.22*p.z,p.y+.44*p.z)*u.height/64.*2./u.size,.5-p.z/256.,1.);}
fn live()->f32{return smoothstep(.015,.12,u.p)*(1.-smoothstep(.84,1.,u.p));}
// Geometric-optical concentration proxy from the Jacobian of a smooth phase screen.
// It is an emissive fantasy field, not a simulation of the actual game's background.
fn caustic(q:vec2f)->vec2f{
 let align=smoothstep(.18,.58,u.p);
 let travel=select(1.,.28,u.reduced>.5);
 let x=q.x+(1.-align)*13.*travel;let z=q.y-(1.-align)*9.*travel;
 let f=.095*x+.055*z+.38;let g=.055*x-.085*z-.72;
 let a=82.;let b=91.;let sf=sin(f);let cg=cos(g);
 let xx=-a*.009025*sf-b*.003025*cg;
 let xz=-a*.005225*sf+b*.004675*cg;
 let zz=-a*.003025*sf-b*.007225*cg;
 let det=(1.+xx)*(1.+zz)-xz*xz;
 let aperture=exp(-pow((q.x+6.)/43.,4.)-pow((q.y-2.)/35.,4.));
 let skew=.78+.22*sin(.047*q.x+.039*q.y);
 let ridge=.18/sqrt(det*det+.012);
 let shoulder=.13/sqrt(det*det+.16);
 return vec2f((ridge+shoulder)*aperture*skew,ridge*aperture)*live();
}
fn radiance(v:vec2f)->vec3f{return vec3f(.46,.66,.09)*v.x+vec3f(1.10,.88,.37)*v.y;}
`;
const meshShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)xy:vec2f};
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{
 var o:O;o.p=vec4f(p.xy,.62,1.);o.xy=p.xy*u.size*.5*64./u.height;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 if(u.p<=0.||u.p>=1.){discard;}
 let z=(o.xy.y+32.)/.44;let x=o.xy.x-.22*z;
 let v=caustic(vec2f(x,z));if(v.x<.00005){discard;}
 // Optical response on the support plane: no independent opaque surface.
 return vec4f(radiance(v)*.72,0.);
}`;
const spriteShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)local:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{
 let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let pixel=q[i]*256.;let local=vec2f((pixel.x-128.)*64./225.,(240.-pixel.y)*64./225.-32.);
 var o:O;o.p=project(vec3f(local,0.));o.uv=q[i]/3.;o.local=local;return o;
}
fn surfaceWeight(q:vec2f,c:vec2f,r:vec2f)->f32{let d=(q-c)/r;return exp(-dot(d,d)*2.);}
@fragment fn fs(o:O)->@location(0)vec4f{
 let c=textureSample(tex,smp,o.uv);if(c.a<.04){discard;}
 let leg=surfaceWeight(o.local,vec2f(-7.,-27.),vec2f(8.,7.))+surfaceWeight(o.local,vec2f(7.,-27.),vec2f(8.,7.));
 let sleeve=surfaceWeight(o.local,vec2f(-16.,-5.),vec2f(8.,10.))+surfaceWeight(o.local,vec2f(16.,-12.),vec2f(8.,10.));
 let received=smoothstep(.12,.38,u.p)*leg+smoothstep(.38,.58,u.p)*sleeve;
 let samplePoint=vec2f(o.local.x*1.25,(o.local.y+32.)*.72-10.);
 let v=caustic(samplePoint);
 let relief=.45+.55*clamp(abs(o.local.x)/20.,0.,1.);
 let light=radiance(v)*received*relief*.95;
 return vec4f((c.rgb+light)*c.a,c.a);
}`;
const glintShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)a:f32};
@vertex fn vs(@location(0)center:vec2f,@location(1)uv:vec2f,@location(2)info:vec3f)->O{
 let axis=vec2f(cos(info.x),sin(info.x));let cross=vec2f(-axis.y,axis.x);
 var o:O;o.p=vec4f((center+(axis*uv.x+cross*uv.y*.72)*info.z)*u.height/64.*2./u.size,.44,1.);o.uv=uv;o.a=info.y;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 let q=abs(o.uv);let arms=max(pow(max(0.,1.-q.x),1.3)*exp(-q.y*q.y/.006),pow(max(0.,1.-q.y),1.3)*exp(-q.x*q.x/.006));
 let core=exp(-dot(q,q)/.018);let spread=exp(-dot(q,q)/.13)*.13;
 return vec4f((vec3f(1.9,1.64,.72)*arms+vec3f(1.8,1.75,1.1)*core+vec3f(.66,.77,.16)*spread)*o.a,0.);
}`;
export async function create(canvas,options={}){
 const receipt=options.receipt;if(!canStart(receipt))throw Error('A canonical gain-luckBoost receipt is required');
 const duration=receipt.durationMs,verify=new URLSearchParams(location.search).has('verify');
 const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('WebGPU unavailable');const device=await adapter.requestDevice();
 const errors=[],messages=[],metrics={submissions:0,frames:0,intervals:[],soundStarts:0,audioCreated:false,cycles:0};
 device.addEventListener('uncapturederror',e=>errors.push(e.error.message));device.lost.then(x=>{if(x.reason!=='destroyed')errors.push(x.message);});
 const ctx=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();ctx.configure({device,format,alphaMode:'premultiplied'});
 const uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const depth=device.createTexture({size:[canvas.width,canvas.height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
 const bitmap=await createImageBitmap(await(await fetch('./philia-front-nine-v752.png')).blob());
 const tex=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture:tex},[bitmap.width,bitmap.height]);bitmap.close();
 const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
 const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
 async function pipeline(code,buffers,sprite=false){const module=device.createShaderModule({code});const info=await module.getCompilationInfo();messages.push(...info.messages.map(m=>({type:m.type,line:m.lineNum,text:m.message})));if(info.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(messages));return await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs',buffers},fragment:{module,entryPoint:'fs',targets:[{format,blend}]},primitive:{topology:'triangle-list',cullMode:'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:sprite,depthCompare:'less-equal'}});}
 const mesh=await pipeline(meshShader,[{arrayStride:40,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'},{shaderLocation:3,offset:36,format:'float32'}]}]);
 const sprite=await pipeline(spriteShader,[],true),glint=await pipeline(glintShader,[{arrayStride:28,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32x3'}]}]);
 const bindings=p=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},...(p===sprite?[{binding:1,resource:tex.createView()},{binding:2,resource:sampler}]:[])]});
 const groups=[bindings(mesh),bindings(sprite),bindings(glint)],vb=device.createBuffer({size:500000,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),gb=device.createBuffer({size:10000,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
 const staticGeometry=geometry(.5);device.queue.writeBuffer(vb,0,staticGeometry);
 let audio=null,raf=0,alive=true,epoch=performance.now(),last=null,lastCycle=-1;const soundNodes=new Set();
 function unlock(){if(verify||audio||!alive)return;audio=new AudioContext();metrics.audioCreated=true;audio.resume().catch(()=>{});}
 window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
 function sound(){if(!audio||verify)return;const pcm=synth(audio.sampleRate,duration),buffer=audio.createBuffer(1,pcm.length,audio.sampleRate);buffer.copyToChannel(pcm,0);const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.start();metrics.soundStarts++;soundNodes.add(source);source.onended=()=>soundNodes.delete(source);}
 function draw(elapsed,sparkles=true){
  const p=elapsed/duration,verts=p>0&&p<1?staticGeometry:new Float32Array(),gs=[];
  for(const g of sparkles?glints(p):[]){for(const q of[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])gs.push(g.x,g.y,...q,g.theta,g.amp,g.r);}
  device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,options.height||64,p,sparkles?1:0,options.reduced?1:0,0,0]));
  if(gs.length)device.queue.writeBuffer(gb,0,new Float32Array(gs));
  const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:options.background==='light'?{r:.69,g:.73,b:.72,a:1}:{r:.031,g:.046,b:.065,a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  pass.setPipeline(sprite);pass.setBindGroup(0,groups[1]);pass.draw(6);
  if(verts.length){pass.setPipeline(mesh);pass.setBindGroup(0,groups[0]);pass.setVertexBuffer(0,vb);pass.draw(verts.length/10);}
  if(gs.length){pass.setPipeline(glint);pass.setBindGroup(0,groups[2]);pass.setVertexBuffer(0,gb);pass.draw(gs.length/7);}
  pass.end();device.queue.submit([encoder.finish()]);metrics.submissions++;
 }
 function loop(t){if(!alive)return;const cycle=Math.floor((t-epoch)/(duration+1000)),elapsed=(t-epoch)%(duration+1000);if(cycle!==lastCycle){lastCycle=cycle;metrics.cycles++;sound();}if(last!==null)metrics.intervals.push(t-last);last=t;metrics.frames++;draw(elapsed,options.sparkles!==false);raf=requestAnimationFrame(loop);}
 raf=requestAnimationFrame(loop);
 return {edition:EDITION,errors,messages,metrics,verify,adapter:adapter.info,async capture(ms,sparkles=true){cancelAnimationFrame(raf);draw(ms,sparkles);await device.queue.onSubmittedWorkDone();return state(ms,duration);},async destroy(){alive=false;cancelAnimationFrame(raf);window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);for(const n of soundNodes)n.stop();await audio?.close();vb.destroy();gb.destroy();uniform.destroy();depth.destroy();tex.destroy();device.destroy();}};
}

