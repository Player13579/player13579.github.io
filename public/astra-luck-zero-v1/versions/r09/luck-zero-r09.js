// Astra Luck zero r09: connected light volume, consumed into a recipient front.
export const EDITION='astra-luck-zero-r09';
const sat=x=>Math.min(1,Math.max(0,x));
const smooth=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
export function state(elapsed,duration=1450){const p=elapsed/duration;return {p,active:p>0&&p<1,stage:p<=0?'pending':p<.23?'forming':p<.44?'arriving':p<.80?'settled':p<1?'consuming':'ended'};}
export function canStart(r){return Boolean(r&&r.id&&r.type==='gain-luckBoost'&&r.effectKind==='luckBoost'&&Number.isFinite(r.durationMs)&&r.durationMs>=900);}
export function synth(sampleRate=48000,duration=1450){const out=new Float32Array(Math.ceil(sampleRate*duration/1000));for(let i=0;i<out.length;i++){
 const t=i/sampleRate,p=t/(duration/1000),a=smooth(.02,.18,p)*(1-smooth(.43,.59,p));
 const rise=Math.sin(2*Math.PI*(261.63*t+120*t*t))+.26*Math.sin(2*Math.PI*(523.26*t+240*t*t));
 const d=p-.44,hit=d>0?(1-Math.exp(-d*85))*Math.exp(-d*4):0;
 const chord=Math.sin(2*Math.PI*698.46*t)+.34*Math.sin(2*Math.PI*1047.69*t)+.17*Math.sin(2*Math.PI*1746.15*t);
 const body=smooth(.57,.64,p)*(1-smooth(.78,.98,p))*(Math.sin(2*Math.PI*349.23*t)+.2*Math.sin(2*Math.PI*1396.92*t));
 out[i]=(.018*a*rise+.035*hit*chord+.016*body)*(1-smooth(.89,1,p));
}if(out.length){out[0]=0;out[out.length-1]=0;}return out;}
let topology;
export function geometry(p){if(p<=0||p>=1)return new Float32Array();if(topology)return topology;const out=[],nu=30,na=32;
 const put=(s,a)=>out.push(s,a,0,0,0,1,s,a,0,1);
 for(let i=0;i<nu;i++)for(let j=0;j<na;j++){
  const a=i/nu,b=(i+1)/nu,c=j/na*Math.PI*2,d=(j+1)/na*Math.PI*2;
  for(const q of[[a,c],[a,d],[b,c],[a,d],[b,d],[b,c]])put(...q);
 }return topology=new Float32Array(out);
}
function curve(t,p,reduced){const a=1-t,arrival=smooth(.13,.47,p),turn=reduced?.25+.75*arrival:arrival,spent=smooth(.52,.80,p);return[a*a*a*-46+3*a*a*t*-17+3*a*t*t*(-28+2*spent)+t*t*t*(-24+8*turn),a*a*a*-32+3*a*a*t*-34+3*a*t*t*(31-8*spent)+t*t*t*(9-14*turn)];}
export const SPARKLE_ANGLE=Math.PI/6;
export function focusPoint(id,p,reduced=false){if(id!==0)return[15,-15];const cut=smooth(.40,.80,p),s=.74,t=cut+(1-cut)*s,q=curve(t,p,reduced),born=smooth(.02,.25,p),arrival=smooth(.13,.47,p),z=20*Math.pow(Math.max(0,Math.sin(Math.PI*s)),.65)*(1-.2*t)*(1-cut);
 return[-46+(q[0]+46)*(.55+.45*born)-8*(1-arrival)*(reduced?.70:1)+.25*z,-31+(q[1]+31)*(.18+.82*born)+.16*z];}
export function glints(p,reduced=false){const out=[];for(const [i,at]of[.16,.37,.49,.63,.78].entries()){
 const t=(p-at)/.17;if(t<=0||t>=1||i<2&&p>=.78)continue;const q=i<2?focusPoint(0,p,reduced):[[-15,-5],[6,-12],[-5,-27]][i-2];
 out.push({x:q[0],y:q[1],theta:SPARKLE_ANGLE,amp:smooth(0,.18,t)*(1-smooth(.68,1,t)),r:8.2});
}return out;}
const common=`struct U{size:vec2f,height:f32,p:f32,spark:f32,reduced:f32,pad:vec2f};@group(0)@binding(0)var<uniform>u:U;
fn project(w:vec3f)->vec4f{return vec4f(vec2f(w.x+.25*w.z,w.y+.16*w.z)*u.height/64.*2./u.size,.5-w.z/256.,1.);}
fn life()->f32{return smoothstep(.015,.17,u.p)*(1.-smoothstep(.80,1.,u.p));}
`;
const volumeShader=common+`
struct O{@builtin(position)p:vec4f,@location(0)w:vec3f,@location(1)t:f32,@location(2)n:vec3f};
fn curve(t:f32)->vec2f{let a=1.-t;let arrive=smoothstep(.13,.47,u.p);let turn=select(arrive,.25+.75*arrive,u.reduced>.5);let spent=smoothstep(.52,.80,u.p);
 return a*a*a*vec2f(-46.,-32.)+3.*a*a*t*vec2f(-17.,-34.)+3.*a*t*t*vec2f(-28.+2.*spent,31.-8.*spent)+t*t*t*vec2f(-24.+8.*turn,9.-14.*turn);
}
fn positionAt(s:f32,angle:f32)->vec3f{
 let cut=smoothstep(.40,.80,u.p);let t=cut+(1.-cut)*s;
 let q=curve(t);let delta=curve(min(1.,t+.002))-curve(max(0.,t-.002));let tangent=delta/max(length(delta),.0001);let normal=vec2f(tangent.y,-tangent.x);
 let crossSection=max(0.,sin(s*3.14159265));let rn=12.*sqrt(crossSection)*(1.-.45*t)*(1.-cut);let rz=20.*pow(crossSection,.65)*(1.-.2*t)*(1.-cut);
 let born=smoothstep(.02,.25,u.p);let arrive=smoothstep(.13,.47,u.p);let shift=select(1.,.70,u.reduced>.5);
 let center=vec2f(-46.+(q.x+46.)*(.55+.45*born)-8.*(1.-arrive)*shift,-31.+(q.y+31.)*(.18+.82*born));
 return vec3f(center+normal*rn*cos(angle),rz*sin(angle));
}
@vertex fn vs(@location(0)param:vec3f,@location(1)n:vec3f,@location(2)c:vec3f,@location(3)a:f32)->O{
 let s=param.x;let theta=param.y;let w=positionAt(s,theta);
 let ds=positionAt(min(1.,s+.003),theta)-positionAt(max(0.,s-.003),theta);let dt=positionAt(s,theta+.003)-positionAt(s,theta-.003);let normal=cross(dt,ds);
 var o:O;o.p=project(w);o.w=w;o.t=mix(s,1.,smoothstep(.40,.80,u.p));o.n=normal/max(length(normal),.00001);return o;
}
@fragment fn fs(o:O)->@location(0)vec4f{return vec4f(o.w.z,o.t,abs(o.n.z),1.);}
`;
const meshShader=common+`
@group(0)@binding(1)var nearTex:texture_2d<f32>;@group(0)@binding(2)var farTex:texture_2d<f32>;
@group(0)@binding(3)var tex:texture_2d<f32>;@group(0)@binding(4)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)xy:vec2f};struct F{@location(0)c:vec4f,@builtin(frag_depth)depth:f32};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{
 let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));var o:O;o.p=vec4f(q[i],.5,1.);o.xy=q[i]*u.size*.5*64./u.height;return o;
}
@fragment fn fs(o:O)->F{
 let a=textureLoad(nearTex,vec2i(o.p.xy),0);let b=textureLoad(farTex,vec2i(o.p.xy),0);if(a.w<.5||b.w<.5){discard;}
 let front=select(b,a,a.x>=b.x);let rear=select(a,b,a.x>=b.x);
 let pixel=vec2f(o.xy.x*225./64.+128.,240.-(o.xy.y+32.)*225./64.);var body=0.;
 if(all(pixel>=vec2f(0.))&&all(pixel<vec2f(256.))){body=textureSampleLevel(tex,smp,pixel/768.,0.).a;}
 let backZ=mix(rear.x,max(rear.x,0.),body);let thickness=max(0.,front.x-backZ);
 let filled=1.-exp(-thickness*.12);let current=mix(.10,.91,smoothstep(.04,.58,u.p));let at=(front.y+rear.y)*.5;
 let d=(at-current)/.24;let core=exp(-d*d);let rim=pow(1.-front.z,2.);
 let alpha=(.10+.12*rim)*filled*life();
 let bodyColor=mix(vec3f(.94,.31,.22),vec3f(.82,.79,.57),filled);
 let emission=bodyColor*(.30+.25*rim)+vec3f(1.60,1.21,.73)*core;
 var f:F;f.c=vec4f(bodyColor*alpha+emission*filled*life(),alpha);f.depth=.5-front.x/256.;return f;
}`;
const spriteShader=common+`
@group(0)@binding(1)var tex:texture_2d<f32>;@group(0)@binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f,@location(1)local:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let pixel=q[i]*256.;let local=vec2f((pixel.x-128.)*64./225.,(240.-pixel.y)*64./225.-32.);var o:O;o.p=project(vec3f(local,0.));o.uv=q[i]/3.;o.local=local;return o;}
@fragment fn fs(o:O)->@location(0)vec4f{
 let c=textureSample(tex,smp,o.uv);if(c.a<.04){discard;}
 let delivery=smoothstep(.40,.84,u.p);let arrival=length((o.local-vec2f(-15.,-5.))*vec2f(1.,.86));
 let progress=mix(0.,53.,delivery);let d=(arrival-progress)/10.;let front=exp(-d*d);
 let after=smoothstep(.55,.72,u.p)*(1.-smoothstep(.78,.99,u.p))*(.5+.5*clamp((o.local.y+32.)/52.,0.,1.));
 let faceProtect=1.-(1.-smoothstep(7.,10.,abs(o.local.x)))*smoothstep(7.,11.,o.local.y)*(1.-smoothstep(24.,28.,o.local.y));
 let live=smoothstep(.38,.46,u.p)*(1.-smoothstep(.86,1.,u.p));
 let response=(front*1.6+after*.48)*live*faceProtect;
 let material=.5+.5*dot(c.rgb,vec3f(.2126,.7152,.0722));
 let light=vec3f(1.18,.85,.42)*response*material;
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
 const volumeDepth=device.createTexture({size:[canvas.width,canvas.height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
 const volumeTargets=[0,1].map(()=>device.createTexture({size:[canvas.width,canvas.height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
 const bitmap=await createImageBitmap(await(await fetch('./philia-front-nine-v752.png')).blob());
 const tex=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture:tex},[bitmap.width,bitmap.height]);bitmap.close();
 const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
 const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}};
 async function pipeline(code,buffers,sprite=false,opt={}){const module=device.createShaderModule({code});const info=await module.getCompilationInfo();messages.push(...info.messages.map(m=>({type:m.type,line:m.lineNum,text:m.message})));if(info.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(messages));return await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs',buffers},fragment:{module,entryPoint:'fs',targets:[{format:opt.format||format,blend:opt.offscreen?undefined:blend}]},primitive:{topology:'triangle-list',cullMode:opt.cullMode||'none'},depthStencil:{format:'depth24plus',depthWriteEnabled:sprite||Boolean(opt.offscreen),depthCompare:opt.depthCompare||'less-equal'}});}
 const volumeBuffers=[{arrayStride:40,attributes:[{shaderLocation:0,offset:0,format:'float32x3'},{shaderLocation:1,offset:12,format:'float32x3'},{shaderLocation:2,offset:24,format:'float32x3'},{shaderLocation:3,offset:36,format:'float32'}]}];
 const volumeFront=await pipeline(volumeShader,volumeBuffers,false,{format:'rgba16float',offscreen:true,cullMode:'back',depthCompare:'less-equal'});
 const volumeBack=await pipeline(volumeShader,volumeBuffers,false,{format:'rgba16float',offscreen:true,cullMode:'front',depthCompare:'greater-equal'});
 const mesh=await pipeline(meshShader,[]);
 const sprite=await pipeline(spriteShader,[],true),glint=await pipeline(glintShader,[{arrayStride:28,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32x3'}]}]);
 const bindings=p=>device.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},...(p===sprite?[{binding:1,resource:tex.createView()},{binding:2,resource:sampler}]:p===mesh?[{binding:1,resource:volumeTargets[0].createView()},{binding:2,resource:volumeTargets[1].createView()},{binding:3,resource:tex.createView()},{binding:4,resource:sampler}]:[])]});
 const groups=[bindings(mesh),bindings(sprite),bindings(glint),bindings(volumeFront),bindings(volumeBack)],vb=device.createBuffer({size:500000,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),gb=device.createBuffer({size:10000,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});
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
  const encoder=device.createCommandEncoder();
  for(let layer=0;layer<2;layer++){
   const vp=encoder.beginRenderPass({colorAttachments:[{view:volumeTargets[layer].createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:volumeDepth.createView(),depthClearValue:layer===0?1:0,depthLoadOp:'clear',depthStoreOp:'store'}});
   if(verts.length){vp.setPipeline(layer===0?volumeFront:volumeBack);vp.setBindGroup(0,groups[3+layer]);vp.setVertexBuffer(0,vb);vp.draw(verts.length/10);}vp.end();
  }
  const pass=encoder.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:options.background==='light'?{r:.69,g:.73,b:.72,a:1}:{r:.031,g:.046,b:.065,a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'store'}});
  pass.setPipeline(sprite);pass.setBindGroup(0,groups[1]);pass.draw(6);
  if(verts.length){pass.setPipeline(mesh);pass.setBindGroup(0,groups[0]);pass.draw(6);}
  if(gs.length){pass.setPipeline(glint);pass.setBindGroup(0,groups[2]);pass.setVertexBuffer(0,gb);pass.draw(gs.length/7);}
  pass.end();device.queue.submit([encoder.finish()]);metrics.submissions++;
 }
 function loop(t){if(!alive)return;const cycle=Math.floor((t-epoch)/(duration+1000)),elapsed=(t-epoch)%(duration+1000);if(cycle!==lastCycle){lastCycle=cycle;metrics.cycles++;sound();}if(last!==null)metrics.intervals.push(t-last);last=t;metrics.frames++;draw(elapsed,options.sparkles!==false);raf=requestAnimationFrame(loop);}
 raf=requestAnimationFrame(loop);
 return {edition:EDITION,errors,messages,metrics,verify,adapter:adapter.info,async capture(ms,sparkles=true){cancelAnimationFrame(raf);draw(ms,sparkles);await device.queue.onSubmittedWorkDone();return state(ms,duration);},async destroy(){alive=false;cancelAnimationFrame(raf);window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);for(const n of soundNodes)n.stop();await audio?.close();vb.destroy();gb.destroy();uniform.destroy();depth.destroy();volumeDepth.destroy();for(const t of volumeTargets)t.destroy();tex.destroy();device.destroy();}};
}

