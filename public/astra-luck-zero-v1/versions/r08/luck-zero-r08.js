// Astra Luck zero r08: new thick overturning luminous crest.
export const EDITION='astra-luck-zero-r08';
const sat=x=>Math.min(1,Math.max(0,x));
const smooth=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
export function state(elapsed,duration=1450){const p=elapsed/duration;return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.23?'forming':p<.48?'arriving':p<.80?'settled':p<1?'consuming':'ended'};}
export function canStart(r){return Boolean(r&&r.id&&r.type==='gain-luckBoost'&&r.effectKind==='luckBoost'&&Number.isFinite(r.durationMs)&&r.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){
 const out=new Float32Array(Math.ceil(sampleRate*duration/1000));
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,p=t/(duration/1000),a=smooth(.02,.18,p)*(1-smooth(.42,.58,p));
  const rise=Math.sin(2*Math.PI*(261.63*t+120*t*t))+.26*Math.sin(2*Math.PI*(523.26*t+240*t*t));
  const d=p-.43,hit=d>0?(1-Math.exp(-d*85))*Math.exp(-d*4):0;
  const chord=Math.sin(2*Math.PI*698.46*t)+.34*Math.sin(2*Math.PI*1047.69*t)+.17*Math.sin(2*Math.PI*1746.15*t);
  out[i]=(.018*a*rise+.039*hit*chord)*(1-smooth(.87,1,p));
 }
 if(out.length){out[0]=0;out[out.length-1]=0;}return out;
}
let topology;
export function geometry(p){
 if(p<=0||p>=1)return new Float32Array();if(topology)return topology;
 const out=[],nu=28,nv=14;const put=(u,v,l)=>out.push(u,v,l,0,0,1,u,v,l,1);
 // Three optical layers with finite normal separation; fixed topology, GPU deformation.
 for(const l of[-1,0,1])for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
  const a=i/nu,b=(i+1)/nu,c=j/nv*2-1,d=(j+1)/nv*2-1;
  for(const q of[[a,c],[b,c],[a,d],[a,d],[b,c],[b,d]])put(q[0],q[1],l);
 }
 return topology=new Float32Array(out);
}
export const SPARKLE_ANGLE=Math.PI/6;
export function focusPoint(id,p,reduced=false){if(id!==0)return[15,-15];const t=.10+.81*smooth(.04,.58,p),a=1-t,born=smooth(.02,.25,p),arrive=smooth(.13,.47,p),v=.5;
 const turn=reduced?.25+.75*arrive:arrive,spent=smooth(.52,.80,p);
 const x=a*a*a*-46+3*a*a*t*-17+3*a*t*t*(-28+2*spent)+t*t*t*(-24+8*turn),y=a*a*a*-32+3*a*a*t*-34+3*a*t*t*(31-8*spent)+t*t*t*(9-14*turn),z=v*(22-10*t);
 return[-46+(x+46)*(.55+.45*born)-8*(1-arrive)*(reduced?.7:1)+2.8*v*v*t+.25*z,-31+(y+31)*(.18+.82*born)+3*v*t+1.3*Math.sin(v*2+t*1.2)+.16*z];}
export function glints(p,reduced=false){const out=[];for(const [i,at]of[.16,.38,.49,.62,.75].entries()){
 const t=(p-at)/.18;if(t<=0||t>=1)continue;const q=i<2?focusPoint(0,p,reduced):[[-16,-5],[15,-15],[-7,-27]][i-2];
 out.push({x:q[0],y:q[1],theta:SPARKLE_ANGLE,amp:smooth(0,.18,t)*(1-smooth(.68,1,t)),r:8.2});
}return out;}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,reduced:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(w:vec3f)->vec4f{return vec4f(vec2f(w.x+.25*w.z,w.y+.16*w.z)*u.height/64.*2./u.size,.5-w.z/256.,1.);}
fn life()->f32{return smoothstep(.015,.17,u.p)*(1.-smoothstep(.80,1.,u.p));}
fn received()->f32{return smoothstep(.40,.58,u.p)*(1.-smoothstep(.80,1.,u.p));}
`;
const meshShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)param:vec3f,@location(1)n:vec3f,@location(2)local:vec3f};
fn curve(t:f32)->vec2f{
 let a=1.-t;
 let arrive=smoothstep(.13,.47,u.p);let turn=select(arrive,.25+.75*arrive,u.reduced>.5);let spent=smoothstep(.52,.80,u.p);
 return a*a*a*vec2f(-46.,-32.)+3.*a*a*t*vec2f(-17.,-34.)+3.*a*t*t*vec2f(-28.+2.*spent,31.-8.*spent)+t*t*t*vec2f(-24.+8.*turn,9.-14.*turn);
}
fn positionAt(t:f32,v:f32,l:f32)->vec3f{
 let born=smoothstep(.02,.25,u.p);let arrive=smoothstep(.13,.47,u.p);
 let q=curve(t);let tangent=normalize(curve(min(1.,t+.002))-curve(max(0.,t-.002)));
 let normal=vec2f(tangent.y,-tangent.x);
 let thickness=(3.8+2.8*sin(t*3.14159265))*(1.-.45*smoothstep(.7,1.,t));
 let flatten=select(1.,.70,u.reduced>.5);
 var xy=vec2f(-46.+(q.x+46.)*(.55+.45*born)-8.*(1.-arrive)*flatten,-31.+(q.y+31.)*(.18+.82*born));
 let width=mix(22.,12.,t);let z=v*width;
 xy+=normal*l*thickness;
 xy.x+=2.8*v*v*t;xy.y+=3.*v*t+1.3*sin(v*2.0+t*1.2);
 return vec3f(xy,z);
}
@vertex fn vs(@location(0)param:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{
 let t=param.x;let v=param.y;let l=param.z;
 let w=positionAt(t,v,l);let du=positionAt(min(1.,t+.003),v,l)-positionAt(max(0.,t-.003),v,l);let dv=positionAt(t,v+.003,l)-positionAt(t,v-.003,l);
 var o:O;o.p=project(w);o.param=param;o.n=normalize(cross(du,dv));o.local=w;return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{
 if(u.p<=0.||u.p>=1.){discard;}
 let t=o.param.x;let v=o.param.y;let l=o.param.z;
 let edge=smoothstep(0.,.06,t)*(1.-smoothstep(.96,1.,t))*(1.-smoothstep(.77,1.,abs(v)));
 let envelope=life()*edge;
 let current=mix(.10,.91,smoothstep(.04,.58,u.p));
 let d=(t-current)/.23;let core=exp(-d*d);
 let forwardFacing=abs(dot(normalize(o.n),normalize(vec3f(-.16,.22,1.))));
 let rim=pow(1.-forwardFacing,2.);
 let inner=1.-abs(l);let near=smoothstep(-.8,.7,v);
 let skin=mix(vec3f(.90,.32,.25),vec3f(.57,.89,.98),clamp(.30*near+.35*(l+1.),0.,1.));
 let source=vec3f(1.55,1.14,.64)*core*(.45+inner*.65);
 let emission=skin*(.40+.32*rim)+source;
 let alpha=(.10+.13*rim)*(1.-inner*.65)*envelope;
 return vec4f(skin*alpha+emission*envelope*.67,alpha);
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
 let left=receiverWeight(o.local,vec2f(-15.,-5.),vec2f(8.,11.));
 let down=receiverWeight(o.local,vec2f(-5.,-26.),vec2f(11.,8.))*smoothstep(.52,.67,u.p);
 let right=receiverWeight(o.local,vec2f(15.,-15.),vec2f(7.,10.))*smoothstep(.58,.73,u.p);
 let surfaceResponse=.40+.60*dot(c.rgb,vec3f(.2126,.7152,.0722));
 let light=vec3f(1.10,.72,.36)*received()*(left+down+right)*surfaceResponse*1.30;
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
  for(const g of sparkles?glints(p,options.reduced):[]){for(const q of[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])gs.push(g.x,g.y,...q,g.theta,g.amp,g.r);}
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

