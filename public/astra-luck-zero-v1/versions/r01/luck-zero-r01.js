// Astra Luck zero r01. Independent procedural design; no prior E source imported.
export const EDITION='astra-luck-zero-r01';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export function state(elapsed,duration=1450){
 const p=elapsed/duration;
 return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.17?'opening':p<.39?'converging':p<.48?'coalescing':p<.69?'arriving':p<.90?'receiving':p<1?'dissolving':'ended'};
}
export function canStart(receipt){return Boolean(receipt&&receipt.id&&receipt.type==='gain-luckBoost'&&receipt.effectKind==='luckBoost'&&Number.isFinite(receipt.durationMs)&&receipt.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000);
  const gather=ease(.035,.12,p)*(1-ease(.33,.47,p));
  const impact=ease(.645,.655,p)*Math.exp(-Math.max(0,p-.655)*16);
  const tail=ease(.655,.68,p)*(1-ease(.81,.98,p));
  const chirp=2*Math.PI*(310*t+170*t*t);
  const shiver=(Math.sin(chirp)+.29*Math.sin(chirp*1.417)+.16*Math.sin(chirp*2.071));
  const strike=Math.sin(2*Math.PI*1468*t)+.35*Math.sin(2*Math.PI*2237*t);
  const bloom=Math.sin(2*Math.PI*293.66*t)+.28*Math.sin(2*Math.PI*739.99*t);
  out[i]=(.033*gather*shiver+.048*impact*strike+.027*tail*bloom)*ease(0,.018,p)*(1-ease(.95,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
// Projected native mesh; each triangle has actual depth and a geometric normal.
function transform(q,angle,tilt,center,scale){
 const c=Math.cos(angle),s=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);
 const y=q[1]*ct-q[2]*st,z=q[1]*st+q[2]*ct;
 return [center[0]+scale*(q[0]*c-y*s),center[1]+scale*(q[0]*s+y*c),center[2]+scale*z];
}
function normal(a,b,c){const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(x=>x/l);}
function tri(out,a,b,c,color,amp){const n=normal(a,b,c);for(const p of[a,b,c])out.push(...p,...n,...color,amp);}
export function geometry(p,reduced=false){
 const vertices=[];if(p<=0||p>=1)return new Float32Array();
 const emerge=ease(0,.13,p),converge=ease(.17,.43,p),arrival=ease(.48,.69,p);
 const live=emerge*(1-ease(.66,.73,p));
 const base=[mix(-31,-8,arrival),mix(19,3,arrival)+9*Math.sin(arrival*Math.PI),mix(-8,5,arrival)];
 for(let j=0;j<3;j++){
  const sep=(1-converge)*(reduced?.7:1),a=(j-1)*.67*sep-.33;
  const center=[base[0]+(j-1)*11*sep,base[1]+(j===1?-7:6)*sep,base[2]+(j-1)*12*sep];
  const scale=emerge*mix(1,.22,arrival)*(j===1?1:mix(.83,.94,converge));
  const amp=live*(j===1?1:1-ease(.38,.48,p));if(amp<.001)continue;
  // A thick, open, asymmetric optical cup: inflated cross-section and a clear mouth.
  const pos=(u,v)=>{
   const angle=-2.31+4.18*u;
   const radius=14+4*Math.sin(u*Math.PI)+2.4*Math.sin(u*2*Math.PI);
   const width=4.8*Math.pow(Math.sin(u*Math.PI),.65)+.35;
   const r=radius+width*Math.cos(v);
   return transform([r*Math.cos(angle),r*Math.sin(angle)*.83,5.2*Math.sin(v)*(0.45+.55*Math.sin(u*Math.PI))],a,.51+(j-1)*.19,center,scale);
  };
  for(let i=0;i<32;i++)for(let k=0;k<12;k++){
   const u=i/32,uu=(i+1)/32,v=k/12*Math.PI*2,vv=(k+1)/12*Math.PI*2;
   const col=[mix(.67,1.30,converge),mix(.43,.86,converge),mix(.96,.28,converge)];
   const A=pos(u,v),B=pos(uu,v),C=pos(u,vv),D=pos(uu,vv);
   tri(vertices,A,B,C,col,amp);tri(vertices,C,B,D,col,amp);
  }
 }
 return new Float32Array(vertices);
}
export function glints(p){
 const out=[];
 const events=[[-35,23,.25,.16,-.48],[-22,28,.34,.18,-.82],[-22,15,.48,.16,-.50],[-11,5,.64,.15,-1.05],[-14,-8,.73,.16,-1.36],[13,-9,.79,.15,-1.86]];
 let eventIndex=0;
 for(const [x,y,start,life,theta]of events){
  const index=eventIndex++,t=(p-start)/life;if(t<=0||t>=1)continue;
  let gx=x,gy=y,angle=theta;
  if(index<3){
   const conv=ease(.17,.43,p),arrive=ease(.48,.69,p),emerge=ease(0,.13,p);
   const center=[mix(-31,-8,arrive),mix(19,3,arrive)+9*Math.sin(arrive*Math.PI)-7*(1-conv),mix(-8,5,arrive)];
   const u=[.90,.69,.84][index],a=-2.31+4.18*u,r=14+4*Math.sin(u*Math.PI)+2.4*Math.sin(u*2*Math.PI)+4.8*Math.pow(Math.sin(u*Math.PI),.65)+.35;
   const q=transform([r*Math.cos(a),r*Math.sin(a)*.83,0],-.33,.51,center,emerge*mix(1,.22,arrive));
   gx=q[0]+.25*q[2];gy=q[1]+.12*q[2];angle=Math.atan2(3-gy,-8-gx);
  }
  const amp=ease(0,.18,t)*(1-ease(.61,1,t));out.push({x:gx,y:gy,theta:angle,amp,r:mix(5.6,8.8,amp)});
 }
 return out;
}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,light:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(p:vec3f)->vec4f{return vec4f(vec2f(p.x+.25*p.z,p.y+.12*p.z)*u.height/64.*2./u.size,.5-p.z/256.,1.);}`;
const meshShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)n:vec3f,@location(1)c:vec3f,@location(2)a:f32};
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{var o:O;o.p=project(p);o.n=n;o.c=c;o.a=a;return o;}
@fragment fn fs(o:O,@builtin(front_facing)front:bool)->@location(0)vec4f{
 let n=normalize(o.n);let facing=abs(dot(n,normalize(vec3f(.25,.12,1.))));
 let rim=pow(1.-facing,2.0);let spot=pow(max(0.,dot(n,normalize(vec3f(-.35,.5,.85)))),10.);
 let body=o.c*(.28+.54*facing);let emission=o.c*(.34+.8*rim)+vec3f(1.4,1.17,.70)*spot*1.7;
 let alpha=o.a*(.18+.25*rim+.13*facing);return vec4f((body+emission)*o.a*.50,alpha);
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
 let receive=smoothstep(.65,.70,u.p)*(1.-smoothstep(.88,1.,u.p));
 let y=mix(4.,-18.,smoothstep(.66,.89,u.p));let wave=exp(-pow((o.local.y-y)/7.,2.));
 let sides=smoothstep(4.,13.,abs(o.local.x));let arrival=exp(-dot(o.local-vec2f(-8.,3.),o.local-vec2f(-8.,3.))/65.)*(1.-smoothstep(.70,.78,u.p));
 let light=vec3f(1.40,.72,.15)*receive*(.65*wave*sides+arrival*.7);
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
 let audio=null,raf=0,alive=true,epoch=performance.now(),last=null,lastCycle=-1;const soundNodes=new Set();
 function unlock(){if(verify||audio||!alive)return;audio=new AudioContext();metrics.audioCreated=true;audio.resume().catch(()=>{});}
 window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
 function sound(){if(!audio||verify)return;const pcm=synth(audio.sampleRate,duration),buffer=audio.createBuffer(1,pcm.length,audio.sampleRate);buffer.copyToChannel(pcm,0);const source=audio.createBufferSource();source.buffer=buffer;source.connect(audio.destination);source.start();metrics.soundStarts++;soundNodes.add(source);source.onended=()=>soundNodes.delete(source);}
 function draw(elapsed,sparkles=true){
  const p=elapsed/duration,verts=geometry(p,options.reduced),gs=[];
  for(const g of sparkles?glints(p):[]){for(const q of[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])gs.push(g.x,g.y,...q,g.theta,g.amp,g.r);}
  device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,options.height||64,p,sparkles?1:0,0,0,0]));
  if(verts.length)device.queue.writeBuffer(vb,0,verts);if(gs.length)device.queue.writeBuffer(gb,0,new Float32Array(gs));
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
