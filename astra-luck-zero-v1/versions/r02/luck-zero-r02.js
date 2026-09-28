// Astra Luck zero r02. New staggered refractive routes; r01 crescent geometry discarded.
export const EDITION='astra-luck-zero-r02';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function state(elapsed,duration=1450){
 const p=elapsed/duration;
 return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.20?'route-emergence':p<.42?'redirecting':p<.56?'converging':p<.70?'arriving':p<.93?'receiving':p<1?'dissolving':'ended'};
}
export function canStart(receipt){return Boolean(receipt&&receipt.id&&receipt.type==='gain-luckBoost'&&receipt.effectKind==='luckBoost'&&Number.isFinite(receipt.durationMs)&&receipt.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000);
  const gather=ease(.035,.12,p)*(1-ease(.33,.47,p));
  const impact=ease(.565,.575,p)*Math.exp(-Math.max(0,p-.575)*16);
  const tail=ease(.575,.61,p)*(1-ease(.85,.98,p));
  const chirp=2*Math.PI*(310*t+170*t*t);
  const shiver=(Math.sin(chirp)+.29*Math.sin(chirp*1.417)+.16*Math.sin(chirp*2.071));
  const strike=Math.sin(2*Math.PI*1468*t)+.35*Math.sin(2*Math.PI*2237*t);
  const bloom=Math.sin(2*Math.PI*293.66*t)+.28*Math.sin(2*Math.PI*739.99*t);
  out[i]=(.033*gather*shiver+.048*impact*strike+.027*tail*bloom)*ease(0,.018,p)*(1-ease(.95,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
// Static topology; the vertex shader resolves the refracting routes and receipt front.
let topology;
export function geometry(p,reduced=false){
 if(p<=0||p>=1)return new Float32Array();if(topology)return topology;
 const v=[];for(let route=0;route<5;route++)for(let step=0;step<28;step++)for(let side=0;side<4;side++){
  const a=[step/28,side*Math.PI/2],b=[(step+1)/28,side*Math.PI/2],c=[step/28,(side+1)*Math.PI/2],d=[(step+1)/28,(side+1)*Math.PI/2];
  for(const q of[a,b,c,c,b,d])v.push(q[0],q[1],route,0,0,0,1,1,1,1);
 }return topology=new Float32Array(v);
}
function routePoint(t,id,p){
 const converge=ease(.23,.51,p);
 const A=[[-49,31,-10],[-57,-3,10],[-39,-28,-4]][id];
 const B=[[-27,29,-4],[-27,2,5],[-21,-20,9]][id];
 const prior=[[-10,29,4],[5,18,12],[5,-24,-8]][id];
 const C=prior.map((x,i)=>mix(x,[-9,3,4][i],converge));
 const v=t<.56?A.map((x,i)=>mix(x,B[i],t/.56)):B.map((x,i)=>mix(x,C[i],(t-.56)/.44));return v;
}
export function glints(p){
 const out=[],entries=[[.18,.17,0],[.30,.18,1],[.43,.16,2],[.575,.15,3],[.72,.15,4],[.83,.13,5]];
 for(const [start,life,id]of entries){const t=(p-start)/life;if(t<=0||t>=1)continue;let x,y,angle;
  if(id<3){const a=routePoint(.56,id,p),b=routePoint(.61,id,p);x=a[0]+a[2]*.25;y=a[1]+a[2]*.12;angle=Math.atan2(b[1]-a[1]+.12*(b[2]-a[2]),b[0]-a[0]+.25*(b[2]-a[2]));}
  else{[x,y,angle]=[[-10,3,-.85],[-18,-12,-1.9],[18,-18,-1.1]][id-3];}
  const amp=ease(0,.20,t)*(1-ease(.60,1,t));out.push({x,y,theta:angle,amp,r:mix(6,9.5,amp)});
 }return out;
}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,light:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(p:vec3f)->vec4f{return vec4f(vec2f(p.x+.25*p.z,p.y+.12*p.z)*u.height/64.*2./u.size,.5-p.z/256.,1.);}`;
const meshShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)n:vec3f,@location(1)c:vec3f,@location(2)a:f32,@location(3)edge:f32};
fn path(t:f32,id:u32)->vec3f{
 if(id<3u){
  let a=array<vec3f,3>(vec3f(-49.,31.,-10.),vec3f(-57.,-3.,10.),vec3f(-39.,-28.,-4.));
  let b=array<vec3f,3>(vec3f(-27.,29.,-4.),vec3f(-27.,2.,5.),vec3f(-21.,-20.,9.));
  let ends=array<vec3f,3>(vec3f(-10.,29.,4.),vec3f(5.,18.,12.),vec3f(5.,-24.,-8.));
  let c=mix(ends[id],vec3f(-9.,3.,4.),smoothstep(.23,.51,u.p));
  if(t<.56){return mix(a[id],b[id],t/.56);}return mix(b[id],c,(t-.56)/.44);
 }
 let start=vec3f(-9.,3.,4.);
 if(id==3u){if(t<.38){return mix(start,vec3f(-19.,-8.,9.),t/.38);}return mix(vec3f(-19.,-8.,9.),vec3f(-10.,-29.,4.),(t-.38)/.62);}
 if(t<.34){return mix(start,vec3f(14.,1.,-7.),t/.34);}if(t<.64){return mix(vec3f(14.,1.,-7.),vec3f(22.,-14.,7.),(t-.34)/.30);}return mix(vec3f(22.,-14.,7.),vec3f(10.,-29.,5.),(t-.64)/.36);
}
@vertex fn vs(@location(0)param:vec3f,@location(1)unused:vec3f,@location(2)unusedColor:vec3f,@location(3)unusedAmp:f32)->O{
 let t=param.x;let phi=param.y;let id=u32(param.z);
 let tangent=normalize(path(min(t+.004,1.),id)-path(max(t-.004,0.),id));
 let side=normalize(cross(tangent,vec3f(0.,0.,1.)));let deep=normalize(cross(tangent,side));
 var opacity=0.;var width=3.8;var color=vec3f(1.35,.75,.18);
 if(id<3u){
  let start=f32(id)*.078;let head=smoothstep(start,start+.20,u.p)*1.10;
  let tail=smoothstep(.49,.68,u.p)*1.12;
  opacity=smoothstep(t-.055,t+.025,head)*(1.-smoothstep(t-.045,t+.04,tail));
  opacity*=smoothstep(start,start+.038,u.p)*(1.-smoothstep(.67,.72,u.p));
  width=select(3.8,4.6,id==1u);
  color=mix(vec3f(.66,.47,1.18),vec3f(1.35,.85,.22),smoothstep(.23,.51,u.p));
 }else{
  let delay=select(.565,.615,id==4u);let head=smoothstep(delay,delay+.22,u.p)*1.1;
  let tail=smoothstep(.83,1.,u.p)*1.18;
  opacity=smoothstep(t-.05,t+.03,head)*(1.-smoothstep(t-.04,t+.05,tail));
  opacity*=smoothstep(delay,delay+.035,u.p)*(1.-smoothstep(.94,1.,u.p));
  width=mix(4.5,3.4,t);
 }
 let n=side*cos(phi)+deep*sin(phi);let world=path(t,id)+side*cos(phi)*width+deep*sin(phi)*width*.85;
 var o:O;o.p=project(world);o.n=n;o.c=color;o.a=opacity;o.edge=cos(phi);return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 if(o.a<.002){discard;}let n=normalize(o.n);let view=normalize(vec3f(.25,.12,1.));
 let rim=pow(1.-abs(dot(n,view)),2.);let lit=pow(max(0.,dot(n,normalize(vec3f(-.4,.6,1.)))),6.);
 let body=o.c*(.28+.35*abs(n.z));let radiation=o.c*(.52+rim*.95)+vec3f(1.5,1.24,.74)*lit*1.65;
 return vec4f((body+radiation)*o.a*.52,o.a*(.28+.17*rim));
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
 let receive=smoothstep(.57,.62,u.p)*(1.-smoothstep(.91,1.,u.p));
 let y=mix(4.,-18.,smoothstep(.59,.87,u.p));let wave=exp(-pow((o.local.y-y)/7.,2.));
 let sides=smoothstep(4.,13.,abs(o.local.x));let arrival=exp(-dot(o.local-vec2f(-8.,3.),o.local-vec2f(-8.,3.))/65.)*(1.-smoothstep(.65,.78,u.p));
 let light=vec3f(1.40,.72,.15)*receive*(1.1*wave*sides+arrival*1.3);
 return vec4f((c.rgb+light)*c.a,c.a);
}`;
const glintShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)a:f32};
@vertex fn vs(@location(0)center:vec2f,@location(1)uv:vec2f,@location(2)info:vec3f)->O{
 let axis=vec2f(cos(info.x),sin(info.x));let cross=vec2f(-axis.y,axis.x);
 var o:O;o.p=project(vec3f(center+(axis*uv.x+cross*uv.y*.74)*info.z,7.));o.uv=uv;o.a=info.y;return o;
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
  device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,options.height||64,p,sparkles?1:0,0,0,0]));
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
