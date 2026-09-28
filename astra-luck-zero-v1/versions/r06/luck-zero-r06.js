// Independent Luck zero r06 volumetric coincidence. No ground effect.
export const EDITION='astra-luck-zero-r06';
const sat=x=>Math.min(1,Math.max(0,x));
const smooth=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
export function state(elapsed,duration=1450){const p=elapsed/duration;return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.20?'forming':p<.62?'aligning':p<.84?'settled':p<1?'consuming':'ended'};}
export function canStart(r){return Boolean(r&&r.id&&r.type==='gain-luckBoost'&&r.effectKind==='luckBoost'&&Number.isFinite(r.durationMs)&&r.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000),co=smooth(.2,.62,p),life=smooth(.01,.08,p)*(1-smooth(.84,1,p));
  const pm=1.8*(1-co)*Math.sin(2*Math.PI*5.3*t);
  const gathered=Math.sin(2*Math.PI*587.33*t+pm)+.28*Math.sin(2*Math.PI*1174.66*t-pm*.7);
  const contact=smooth(.51,.58,p)*(Math.sin(2*Math.PI*880*t)+.31*Math.sin(2*Math.PI*1760*t));
  out[i]=(.027*gathered+.027*contact)*life;
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
let mesh;
export function geometry(p){if(p<=0||p>=1)return new Float32Array();if(mesh)return mesh;const out=[];for(const q of[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])out.push(...q,0,0,0,1,1,1,1,1);return mesh=new Float32Array(out);}
export const SPARKLE_ANGLE=Math.PI/6;
export function focusPoint(id,p){const a=smooth(.20,.62,p);return id===0?[-29+10*a,-8-4*a]:[32-13*a,-18+4*a];}
export function glints(p){const out=[];for(const [i,at]of[.22,.40,.54,.64,.74].entries()){
 const t=(p-at)/.18;if(t<=0||t>=1)continue;const q=i<2?focusPoint(i,p):[[-15,-5],[16,-12],[-7,-28]][i-2];
 out.push({x:q[0],y:q[1],theta:SPARKLE_ANGLE,amp:smooth(0,.16,t)*(1-smooth(.66,1,t)),r:8.4});
}return out;}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,reduced:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(w:vec3f)->vec4f{return vec4f(vec2f(w.x+.23*w.z,w.y+.16*w.z)*u.height/64.*2./u.size,.5-w.z/256.,1.);}
fn lifetime()->f32{return smoothstep(.015,.14,u.p)*(1.-smoothstep(.84,1.,u.p));}
fn packet(w:vec3f)->f32{
 let v=vec3f(w.x/34.,(w.y+12.)/24.,w.z/25.);
 let support=exp(-dot(v,v)*1.7);
 // Broad internal wave maxima, not an outer shell or drawn perimeter.
 let a=.13*w.x+.075*w.y+.10*w.z;
 let b=.045*w.x-.135*w.y+.065*w.z;
 let interior=pow(.5+.5*cos(a+.56*sin(b)),3.)*(.28+.72*pow(.5+.5*sin(b+.38*cos(a)),2.));
 return support*(interior+.045);
}
fn field(w:vec3f)->vec2f{
 let co=smoothstep(.20,.62,u.p);let excursion=select(1.,.30,u.reduced>.5);
 let d=(1.-co)*excursion;
 let q1=w-vec3f(-18.*d,6.*d,-12.*d);let q2=w-vec3f(20.*d,-8.*d,14.*d);
 let a=packet(q1);let b=packet(q2)*.82;
 let phase=(1.-co)*(1.9+.026*w.x-.023*w.y+.031*w.z);
 let basePower=a*a+b*b;let combinedPower=a*a+b*b+2.*a*b*cos(phase);
 let density=mix(basePower,max(0.,combinedPower),co);
 return vec2f(density,co*min(a,b))*lifetime();
}
fn radiance(f:vec2f)->vec3f{return vec3f(1.05,.54,.07)*f.x+vec3f(1.0,.91,.56)*f.y;}
`;
const meshShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)xy:vec2f};
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{
 var o:O;o.p=vec4f(p.xy,.4,1.);o.xy=p.xy*u.size*.5*64./u.height;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 if(u.p<=0.||u.p>=1.){discard;}if(abs(o.xy.x)<11.&&o.xy.y>6.){discard;}
 if(abs(o.xy.x)>100.||o.xy.y>70.||o.xy.y< -90.){discard;}
 let pixel=vec2f(o.xy.x*225./64.+128.,240.-(o.xy.y+32.)*225./64.);
 var body=0.;if(all(pixel>=vec2f(0.))&&all(pixel<vec2f(256.))){body=textureSampleLevel(tex,smp,pixel/768.,0.).a;}
 var total=vec2f(0.);
 for(var k=0u;k<18u;k++){
  let z=-42.+f32(k)*5.;let w=vec3f(o.xy.x-.23*z,o.xy.y-.16*z,z);
  let visible=select(1.-body*.90,1.-body,z<0.);
  total+=field(w)*visible*.14;
 }
 return vec4f(radiance(total),0.);
}`;
const spriteShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)local:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{
 let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let pixel=q[i]*256.;let local=vec2f((pixel.x-128.)*64./225.,(240.-pixel.y)*64./225.-32.);
 var o:O;o.p=project(vec3f(local,0.));o.uv=q[i]/3.;o.local=local;return o;
}
fn receiverWeight(q:vec2f,c:vec2f,r:vec2f)->f32{let d=(q-c)/r;return exp(-dot(d,d)*1.8);}
@fragment fn fs(o:O)->@location(0)vec4f{
 let c=textureSample(tex,smp,o.uv);if(c.a<.04){discard;}
 let received=smoothstep(.32,.62,u.p);
 let sleeve=receiverWeight(o.local,vec2f(-16.,-5.),vec2f(8.,10.))+receiverWeight(o.local,vec2f(16.,-12.),vec2f(8.,10.));
 let leg=receiverWeight(o.local,vec2f(0.,-28.),vec2f(12.,8.));
 let f=field(vec3f(o.local.x,o.local.y,7.));
 let facing=.50+.50*clamp(abs(o.local.x)/18.,0.,1.);
 let light=radiance(f)*(sleeve+leg)*received*facing*1.45;
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

