// Astra Luck zero r04 projection prototype. Continuous spatial caustic density; no objects or carried symbols.
export const EDITION='astra-luck-zero-r04';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function state(elapsed,duration=1450){
 const p=elapsed/duration;
 return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.19?'displaced-foci':p<.48?'focus-aligning':p<.625?'contact':p<.70?'arriving':p<.93?'receiving':p<1?'dissolving':'ended'};
}
export function canStart(receipt){return Boolean(receipt&&receipt.id&&receipt.type==='gain-luckBoost'&&receipt.effectKind==='luckBoost'&&Number.isFinite(receipt.durationMs)&&receipt.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000);
  const gather=ease(.05,.16,p)*(1-ease(.46,.58,p)),resolve=ease(.55,.575,p)*(1-ease(.81,.98,p));
  const detune=(1-ease(.17,.55,p))*19;
  const space=Math.sin(2*Math.PI*(416+detune)*t)+.32*Math.sin(2*Math.PI*(833-detune)*t);
  const contact=Math.sin(2*Math.PI*554.37*t)+.37*Math.sin(2*Math.PI*831.55*t)+.16*Math.sin(2*Math.PI*1385.93*t);
  out[i]=(.024*gather*space+.037*resolve*contact)*ease(0,.018,p)*(1-ease(.96,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
// The six vertices bound integration only; no field perimeter is rendered.
let topology;
export function geometry(p,reduced=false){
 if(p<=0||p>=1)return new Float32Array();if(topology)return topology;
 const out=[];for(const q of[[-67,-43],[54,-43],[-67,40],[-67,40],[54,-43],[54,40]])out.push(q[0],q[1],0,0,0,1,1,1,1,1);
 return topology=new Float32Array(out);
}
export const SPARKLE_ANGLE=Math.PI/6;
export function focusPoint(id,p){
 const a=ease(.17,.55,p);
 return id===0?[mix(-34,-13,a),mix(12,-6,a)]:[mix(30,15,a),mix(-27,-16,a)];
}
export function glints(p){
 const out=[],times=[.25,.37,.51,.63,.74,.85];
 for(let id=0;id<times.length;id++){
  const t=(p-times[id])/.15;if(t<=0||t>=1)continue;
  const [x,y]=id<3?focusPoint(id%2,p):[[-15,-7],[16,-16],[-11,-27]][id-3];
  out.push({x,y,theta:SPARKLE_ANGLE,amp:ease(0,.20,t)*(1-ease(.66,1,t)),r:8.6});
 }return out;
}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,light:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(p:vec3f)->vec4f{return vec4f(vec2f(p.x+.25*p.z,p.y+.12*p.z)*u.height/64.*2./u.size,.5-p.z/256.,1.);}`;
const meshShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)xy:vec2f};
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{
 var o:O;o.p=vec4f(p.xy*u.height/64.*2./u.size,.4,1.);o.xy=p.xy;return o;
}
fn density(w:vec3f,id:u32)->vec2f{
 let cohesion=smoothstep(.17,.55,u.p);
 var focus=vec2f(mix(-34.,-13.,cohesion),mix(12.,-6.,cohesion));
 var localX=(w.x-focus.x)/22.;var localY=(w.y-focus.y-.16*w.z)/18.;
 var envelope=exp(-pow((w.x+29.)/27.,4.)-pow((w.y+8.)/31.,4.)-pow(w.z/25.,4.));
 var born=smoothstep(.01,.16,u.p);
 if(id==1u){
  focus=vec2f(mix(30.,15.,cohesion),mix(-27.,-16.,cohesion));
  localX=(focus.x-w.x)/21.;localY=(w.y-focus.y+.20*w.z)/16.;
  envelope=exp(-pow((w.x-26.)/24.,4.)-pow((w.y+15.)/25.,4.)-pow((w.z-5.)/24.,4.));
  born=smoothstep(.10,.27,u.p);
 }
 // Cusp-fold density, a continuous spatial optical field, not a surface or ring.
 let spread=mix(.30,.56,cohesion);
 let curvature=.13+spread*pow(max(0.,-localX),1.5);
 let aberration=(1.-cohesion)*.18*sin(1.8*w.z/18.+localX*2.5+f32(id)*1.3);
 let d=abs(abs(localY+aberration)-curvature);
 let core=exp(-d*d/.014)*exp(-max(0.,localX)*max(0.,localX)*9.);
 let medium=exp(-d*d/.085)*.19;
 let depthWeight=.54+.46*smoothstep(-24.,20.,w.z);
 let spent=smoothstep(.56,.85,u.p);
 let distal=max(0.,-localX);
 let consumption=exp(-spent*spent*(2.2+distal*5.))*(1.-smoothstep(.80,.90,u.p));
 return vec2f((core+medium)*envelope*depthWeight*born*consumption,core*envelope*born*consumption);
}
@fragment fn fs(o:O)->@location(0)vec4f{
 if(u.p<=0.||u.p>=1.){discard;}if(abs(o.xy.x)<11.&&o.xy.y>6.){discard;}
 let pixel=vec2f(o.xy.x*225./64.+128.,240.-(o.xy.y+32.)*225./64.);
 var body=0.;if(all(pixel>=vec2f(0.))&&all(pixel<vec2f(256.))){body=textureSampleLevel(tex,smp,pixel/768.,0.).a;}
 var total=vec3f(0.);var opticalDepth=0.;let aligned=smoothstep(.17,.55,u.p);
 for(var k=0u;k<16u;k++){
  let z=-30.+f32(k)*4.;let w=vec3f(o.xy.x-.25*z,o.xy.y-.12*z,z);
  let a=density(w,0u);let b=density(w,1u);let visible=select(1.,1.-body,z<0.);
  let energy=(a.x+b.x)*visible;let focusEnergy=(a.y+b.y)*visible;
  let hue=mix(vec3f(.23,.45,.78),vec3f(1.12,.70,.14),aligned);
  total+=(hue*energy*.20+vec3f(1.35,1.08,.62)*focusEnergy*.115);
  opticalDepth+=energy*.018;
 }
 let alpha=1.-exp(-opticalDepth);return vec4f(total,alpha*.40);
}`;
const spriteShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)local:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{
 let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let pixel=q[i]*256.;let local=vec2f((pixel.x-128.)*64./225.,(240.-pixel.y)*64./225.-32.);
 var o:O;o.p=project(vec3f(local,0.));o.uv=q[i]/3.;o.local=local;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{let c=textureSample(tex,smp,o.uv);if(c.a<.04){discard;}
 let delivered=smoothstep(.55,.63,u.p)*(1.-smoothstep(.87,.99,u.p));
 let left=exp(-dot((o.local-vec2f(-11.,-6.))/vec2f(6.,9.),(o.local-vec2f(-11.,-6.))/vec2f(6.,9.)));
 let right=exp(-dot((o.local-vec2f(12.,-16.))/vec2f(7.,11.),(o.local-vec2f(12.,-16.))/vec2f(7.,11.)))*smoothstep(.63,.74,u.p);
 let down=exp(-dot((o.local-vec2f(-8.,-25.))/vec2f(7.,6.),(o.local-vec2f(-8.,-25.))/vec2f(7.,6.)))*smoothstep(.74,.84,u.p);
 let light=vec3f(1.02,.77,.25)*delivered*(left+right+down)*.80;
 return vec4f((c.rgb+light)*c.a,c.a);
}`;
const glintShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)a:f32};
@vertex fn vs(@location(0)center:vec2f,@location(1)uv:vec2f,@location(2)info:vec3f)->O{
 let axis=vec2f(cos(info.x),sin(info.x));let cross=vec2f(-axis.y,axis.x);
 var o:O;o.p=vec4f((center+(axis*uv.x+cross*uv.y*.74)*info.z)*u.height/64.*2./u.size,.5-7./256.,1.);o.uv=uv;o.a=info.y;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 let q=abs(o.uv);let a=pow(max(0.,1.-q.x),1.2)*exp(-q.y*q.y/0.005);let b=pow(max(0.,1.-q.y),1.4)*exp(-q.x*q.x/0.006);
 let core=exp(-dot(q,q)/.027);let halo=exp(-dot(q,q)/.17)*.10;
 return vec4f((vec3f(1.9,1.37,.52)*max(a,b)+vec3f(1.8,1.65,1.20)*core+vec3f(.8,.43,.07)*halo)*o.a,0.);
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
 const bindings=p=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},...(p!==glint?[{binding:1,resource:tex.createView()},{binding:2,resource:sampler}]:[])]});
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
