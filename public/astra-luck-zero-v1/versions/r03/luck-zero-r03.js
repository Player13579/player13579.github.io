// Astra Luck zero r03 projection prototype. New four-leaf volumetric bloom; previous routes discarded.
export const EDITION='astra-luck-zero-r03';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function state(elapsed,duration=1450){
 const p=elapsed/duration;
 return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.19?'unfolding':p<.42?'blooming':p<.625?'transferring':p<.70?'arriving':p<.93?'receiving':p<1?'dissolving':'ended'};
}
export function canStart(receipt){return Boolean(receipt&&receipt.id&&receipt.type==='gain-luckBoost'&&receipt.effectKind==='luckBoost'&&Number.isFinite(receipt.durationMs)&&receipt.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000);
  let petals=0;
  for(let j=0;j<4;j++){const at=.065+j*.055,age=p-at;if(age>0){const e=ease(0,.018,age)*Math.exp(-age*23);const frequency=[824,1038,1235,1649][j];petals+=e*(Math.sin(2*Math.PI*frequency*t)+.24*Math.sin(2*Math.PI*frequency*2.23*t));}}
  const age=Math.max(0,p-.625),contact=ease(.625,.638,p)*Math.exp(-age*13),body=ease(.64,.67,p)*(1-ease(.86,.99,p));
  const touch=Math.sin(2*Math.PI*987.77*t)+.31*Math.sin(2*Math.PI*1975.54*t);
  const warm=Math.sin(2*Math.PI*329.63*t)+.25*Math.sin(2*Math.PI*493.88*t);
  out[i]=(.025*petals+.047*contact*touch+.022*body*warm)*ease(0,.02,p)*(1-ease(.97,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
// Four inflated heart-shaped leaves, authored from a new parametric surface.
let topology;
function triangle(out,a,b,c,id){
 const x=b.map((v,i)=>v-a[i]),y=c.map((v,i)=>v-a[i]),n=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],len=Math.hypot(...n)||1;
 for(const v of[a,b,c])out.push(...v,...n.map(x=>x/len),id,v[1]/30,0,1);
}
export function geometry(p,reduced=false){
 if(p<=0||p>=1)return new Float32Array();if(topology)return topology;
 const result=[];
 const point=(theta,r,face)=>{
  const x=16*Math.pow(Math.sin(theta),3),y=13*Math.cos(theta)-5*Math.cos(2*theta)-2*Math.cos(3*theta)-Math.cos(4*theta)+17;
  return [x*r,14+(y-14)*r,face*4.1*Math.sqrt(Math.max(0,1-r*r))];
 };
 for(let id=0;id<4;id++)for(const face of[-1,1])for(let i=0;i<40;i++)for(let j=0;j<5;j++){
  const a=point(i/40*Math.PI*2,j/5,face),b=point((i+1)/40*Math.PI*2,j/5,face),c=point(i/40*Math.PI*2,(j+1)/5,face),d=point((i+1)/40*Math.PI*2,(j+1)/5,face);
  if(face===1){triangle(result,a,b,c,id);triangle(result,c,b,d,id);}else{triangle(result,a,c,b,id);triangle(result,c,d,b,id);}
 }return topology=new Float32Array(result);
}
export function leafPoint(v,id,p){
 const born=ease(id*.044,id*.044+.19,p),tilt=(1-born)*1.20+[.25,-.40,.60,-.25][id];
 const angle=id*Math.PI/2+Math.PI/4+mix(-.2,.18,ease(.12,.45,p));
 const q=[v[0]*.56,(v[1]+2.8)*.56,v[2]*.56];
 const y=q[1]*Math.cos(tilt)-q[2]*Math.sin(tilt),z=q[1]*Math.sin(tilt)+q[2]*Math.cos(tilt);
 return [-25+2*ease(.35,.57,p)+q[0]*Math.cos(angle)-y*Math.sin(angle),-15+q[0]*Math.sin(angle)+y*Math.cos(angle),5+z];
}
export const SPARKLE_ANGLE=Math.PI/6;
export function glints(p){
 const out=[],times=[.17,.24,.31,.38,.66,.75,.84];
 for(let id=0;id<times.length;id++){
  const t=(p-times[id])/.14;if(t<=0||t>=1)continue;let x,y;
  if(id<4){const a=leafPoint([5,27,1.5],id,p);x=a[0]+.25*a[2];y=a[1]+.12*a[2];}
  else{[x,y]=[[-15,-7],[16,-10],[-10,-26]][id-4];}
  out.push({x,y,theta:SPARKLE_ANGLE,amp:ease(0,.19,t)*(1-ease(.64,1,t)),r:7.8});
 }return out;
}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,light:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(p:vec3f)->vec4f{return vec4f(vec2f(p.x+.25*p.z,p.y+.12*p.z)*u.height/64.*2./u.size,.5-p.z/256.,1.);}`;
const meshShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)n:vec3f,@location(1)world:vec3f,@location(2)born:f32,@location(3)leafHeight:f32};
fn rotate(p:vec3f,angle:f32,tilt:f32)->vec3f{
 let y=p.y*cos(tilt)-p.z*sin(tilt);let z=p.y*sin(tilt)+p.z*cos(tilt);
 return vec3f(p.x*cos(angle)-y*sin(angle),p.x*sin(angle)+y*cos(angle),z);
}
@vertex fn vs(@location(0)local:vec3f,@location(1)normal:vec3f,@location(2)info:vec3f,@location(3)unused:f32)->O{
 let id=u32(info.x);let born=smoothstep(f32(id)*.044,f32(id)*.044+.19,u.p);
 let angles=array<f32,4>(.25,-.40,.60,-.25);
 let motionScale=mix(1.,.35,u.light);
 let tilt=(1.-born)*1.20*motionScale+angles[id];
 let angle=f32(id)*1.5707963+.78539816+mix(-.2,.18,smoothstep(.12,.45,u.p))*motionScale;
 let center=vec3f(-25.+2.*smoothstep(.35,.57,u.p),-15.,5.);
 let world=rotate((local+vec3f(0.,2.8,0.))*.56,angle,tilt)+center;
 var o:O;o.p=project(world);o.n=rotate(normal,angle,tilt);o.world=world;o.born=born;o.leafHeight=info.y;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 let front=mix(-52.,0.,smoothstep(.42,.73,u.p));
 let survival=smoothstep(front-2.7,front+2.7,o.world.x)*(1.-smoothstep(.76,.80,u.p));
 let amp=o.born*survival;if(amp<.003){discard;}
 let n=normalize(o.n);let facing=abs(dot(n,normalize(vec3f(.25,.12,1.))));let rim=pow(1.-facing,2.);
 let light=pow(max(0.,dot(n,normalize(vec3f(-.45,.68,.6)))),5.);
 let transferGlow=exp(-pow((o.world.x-front)/3.7,2.))*smoothstep(.40,.47,u.p);
 let color=mix(vec3f(.08,.60,.24),vec3f(.35,1.1,.67),clamp(o.leafHeight,0.,1.));
 let radiance=color*(.30+.55*rim)+vec3f(.70,1.22,.61)*light*.9+vec3f(1.9,1.35,.42)*transferGlow;
 let surface=color*(.22+.25*facing);return vec4f((surface+radiance)*amp*.67,amp*(.32+.18*rim));
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
 let receive=smoothstep(.625,.67,u.p)*(1.-smoothstep(.91,1.,u.p));
 let progress=smoothstep(.64,.88,u.p);let center=mix(vec2f(-11.,-5.),vec2f(9.,-21.),progress);
 let localWave=exp(-dot((o.local-center)/vec2f(13.,14.),(o.local-center)/vec2f(13.,14.)));
 let contact=exp(-dot(o.local-vec2f(-10.,-6.),o.local-vec2f(-10.,-6.))/42.)*(1.-smoothstep(.69,.80,u.p));
 let outside=smoothstep(3.,12.,abs(o.local.x));
 let light=vec3f(.64,1.14,.42)*receive*(.60*localWave+.32*outside*localWave)+vec3f(1.15,.95,.34)*receive*contact;
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
