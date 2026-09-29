import {DESIGN} from './design.mjs';
import {BarrierSfx} from './sfx.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify'),embed=params.has('embed');
if(embed)document.body.classList.add('embed');
const sfx=new BarrierSfx(verify);globalThis.__gallerySfx=async option=>sfx.setEnabled(typeof option==='boolean'?option:option?.enabled??option?.muted===false);
globalThis.__gallerySfx.activateFromGesture=async()=>({enabled:await sfx.setEnabled(true)});
globalThis.__gallerySfx.setMuted=muted=>sfx.setEnabled(!muted);
globalThis.__gallerySfx.snapshot=()=>({audioGain:sfx.enabled&&!verify?.65:0,audioState:sfx.ctx?.state??'not-created',verify,enabled:sfx.enabled});
const shader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var body:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
fn soft(a:f32,b:f32,v:f32)->f32{return smoothstep(a,b,v);}
fn gauss(d:f32,r:f32)->f32{return exp(-d*d/(r*r));}
fn over(dst:vec3f,color:vec3f,a:f32)->vec3f{return color*a+dst*(1-a);}
fn character(p:vec2f,h:f32)->vec4f{let uv=vec2f(p.x/(h*.604)+.5,(p.y+h*.5)/h);if(any(uv<vec2f(0))||any(uv>vec2f(1))){return vec4f(0);}let atlasUV=vec2f((62.+uv.x*136.)/768.,(15.+uv.y*225.)/512.);return textureSampleLevel(body,samp,atlasUV,0);}
fn shell(p:vec2f,h:f32,t:f32,back:bool,emitOn:bool,obsOn:bool,faceOn:bool,impactKnown:bool)->vec4f{
 let scale=h/64.;let stage=u.time.y;
 var formed=1.;var spread=1.;var opacity=1.;
 if(stage<.5){formed=soft(0.,.36,t);spread=1.18-.18*formed;opacity=soft(0.,.07,t);}
 if(stage>1.5&&stage<2.5){let released=soft(.08,.36,t);spread=1.+.28*released;opacity=1.-soft(.12,.48,t);}
 let c=vec2f(0,-3.)*scale;let q=(p-c)/(vec2f(34.,45.)*scale*spread);
 let angle=atan2(q.y,q.x);let sector=3.14159265/4.;let local=abs((angle+3.14159265)-floor((angle+3.14159265+sector*.5)/sector)*sector);
 let radius=.93/cos(local);let r=length(q)/radius;let inside=1.-soft(.985,1.016,r);
 let z=sqrt(max(0.,1.-r*r));let depth=select(z,-z,back);
 let nx=q.x;let ny=q.y;let phi=atan2(nx,depth);let phase=(phi+3.14159265)/1.5707963;
 let seamDistance=abs(fract(phase+.5)-.5)*1.5707963*max(.18,z)*34.*scale;
 let surfaceY=(p.y-c.y)/(45.*scale*spread);let diagonal=abs(surfaceY-(-.28+.14*nx*depth))*45.*scale;
 let diagonal2=abs(surfaceY-(.38-.18*nx*depth))*45.*scale;
 let seam=max(gauss(seamDistance,.65*scale),max(gauss(diagonal,.65*scale),gauss(diagonal2,.65*scale)));
 let rim=gauss((r-1.)*34.*scale,1.*scale);
 let narrowRim=gauss((r-1.)*34.*scale,.36*scale);
 let opening=1.-soft(.43,.63,abs(q.x));let window=opening*(1.-soft(.38,.61,abs(q.y)));
 let cutBottom=1.-soft(.78,.99,q.y);let cutFace=1.-.88*window;
 let facet=floor(phase);let facetLight=.66+.2*cos(facet*1.7)+.3*abs(nx);
 let facetBody=.23+.18*abs(nx)+.14*abs(ny);
 let faceAlpha=facetBody*(1.-.52*window)*inside*cutBottom*opacity;
 var peak=(rim*.7+seam*.28*inside)*cutBottom;
 if(stage<.5){let closeFront=soft(0.,.3,t);peak*=.55+.9*gauss(t-.23,.13);peak*=soft((1.-closeFront)*.62,(1.-closeFront)*.62+.14,abs(q.x));}
 if(stage>1.5&&stage<2.5){peak*=1.+.85*gauss(t-.12,.08);}
 if(stage>2.5&&stage<3.5){
  let hit=vec2f(.77,-.02);let dist=length((q-hit)*vec2f(1.,1.2));let pulse=gauss(dist-t*1.75,.085)*(.8*(1.-soft(.32,.65,t)));
  let known=select(seam*.34*gauss(t-.12,.1),pulse+gauss(dist,.13)*gauss(t-.065,.08)*1.4,impactKnown);
  peak+=known*inside;
 }
 let rear=select(1.,.35,back);let emitted=select(0.,peak*opacity*rear,emitOn);
 let surfaceColor=vec3f(.075,.49,.8)*facetLight;
 var rgb=surfaceColor*select(0.,faceAlpha,faceOn)*rear;
 let alpha=select(0.,faceAlpha*rear,faceOn);
 rgb+=vec3f(.2,.78,1.35)*emitted+vec3f(1.8,1.9,2.)*narrowRim*opacity*rear*select(0.,1.,emitOn)*cutBottom;
 if(obsOn&&emitOn){
  let glow=gauss((r-1.)*34.*scale,3.1*scale)*.29*opacity*rear*cutBottom;
  rgb+=vec3f(.08,.35,.58)*glow;
  // 同じ境界上の結合ピークだけから生じる局所光条。装飾物ではない。
  let source=vec2f(26.,-22.)*scale*spread;let d=p-source;let cs=cos(.392699);let sn=sin(.392699);let v=vec2f(d.x*cs+d.y*sn,-d.x*sn+d.y*cs);
  let event=select(.16,gauss(t-.23,.13),stage<.5);let star=(gauss(v.x,.65*scale)*gauss(v.y,4.6*scale)+gauss(v.y,.65*scale)*gauss(v.x,3.4*scale))*event*opacity*rear;
  rgb+=vec3f(.8,1.1,1.5)*star;
 }
 return vec4f(rgb,alpha);
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f{
 let w=u.viewport.x;let h=u.viewport.y;let dual=u.options.w>.5;
 let light=dual&&frag.x>w*.5;var bg=vec3f(.045,.065,.095);if(light){bg=vec3f(.84,.86,.88);}
 let center=vec2f(select(w*.5,select(w*.25,w*.75,light),dual),h*.5);
 let p=frag.xy-center;let actorH=u.viewport.z;let t=u.time.x;let live=u.time.w>.5;
 let b=character(p,actorH);var color=bg;
 if(live){let back=shell(p,actorH,t,true,u.options.x>.5,u.options.y>.5,u.options.z>.5,u.time.z>.5);color=color*(1.-back.a)+back.rgb;}
 color=over(color,b.rgb,b.a);
 if(live){let front=shell(p,actorH,t,false,u.options.x>.5,u.options.y>.5,u.options.z>.5,u.time.z>.5);color=color*(1.-front.a)+front.rgb;}
 return vec4f(color,1);
}`;
export function stateAt(ms){
 if(ms<650)return{stage:0,time:ms/1000,live:true,event:'create'};
 if(ms<1800)return{stage:1,time:(ms-650)/1000,live:true,event:null};
 if(ms<2450)return{stage:3,time:(ms-1800)/1000,live:true,event:'hit'};
 if(ms<3400)return{stage:1,time:(ms-2450)/1000,live:true,event:null};
 if(ms<3880)return{stage:2,time:(ms-3400)/1000,live:true,event:'break'};
 return{stage:4,time:0,live:false,event:null};
}
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
let device,context,pipeline,uniform,bindGroup,timer,frame=0,start=performance.now(),fixed=null,lastCycle=-1;const intervals=[],errors=[];
try{
 if(!navigator.gpu)throw Error('WebGPU unsupported');const adapter=await navigator.gpu.requestAdapter();device=await adapter.requestDevice();
 device.addEventListener('uncapturederror',e=>errors.push(e.error.message));context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const module=device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const shaderErrors=compilation.messages.filter(m=>m.type==='error');if(shaderErrors.length)throw Error(shaderErrors.map(m=>`${m.lineNum}:${m.message}`).join('\n'));
 pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const image=await createImageBitmap(await(await fetch('./body.png')).blob());const texture=device.createTexture({size:[image.width,image.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:image},{texture},[image.width,image.height]);image.close();
 uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:device.createSampler({minFilter:'linear',magFilter:'linear'})}]});
 const settings={emit:true,obs:true,face:true,known:true,h:64,dual:params.has('audit')};let last=0;
 function draw(now){
  const dpr=devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);
  const elapsed=fixed??((now-start)%4600),state=stateAt(elapsed),cycle=Math.floor((now-start)/4600);
  if(fixed===null){if(last)intervals.push(now-last);last=now;if(intervals.length>900)intervals.shift();if(cycle!==lastCycle){lastCycle=cycle;}if(state.event)sfx.play(state.event,`${cycle}:${state.event}`);}
  const data=new Float32Array([canvas.width,canvas.height,settings.h*dpr,dpr,state.time,state.stage,Number(settings.known),Number(state.live),Number(settings.emit),Number(settings.obs),Number(settings.face),Number(settings.dual)]);device.queue.writeBuffer(uniform,0,data);
  const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);frame++;timer=requestAnimationFrame(draw);
 }
 globalThis.__barrier={ready:true,design:DESIGN.id,verify,compiled:true,adapter:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description,isFallbackAdapter:adapter.isFallbackAdapter},errors,settings,seek(ms){fixed=ms;},resume(){fixed=null;start=performance.now();last=0;lastCycle=-1;intervals.length=0;},stats(){return{frame,intervals:[...intervals],loops:lastCycle+1,verify,soundEnabled:sfx.enabled,errors:[...errors],width:canvas.width,height:canvas.height};},stop(){cancelAnimationFrame(timer);sfx.dispose();device.destroy();}};
 status.textContent='Barrier r1 · WebGPU · H64';timer=requestAnimationFrame(draw);
 window.addEventListener('pagehide',()=>globalThis.__barrier.stop(),{once:true});
}catch(error){errors.push(error.message);status.textContent=error.message;globalThis.__barrier={ready:false,errors};}
