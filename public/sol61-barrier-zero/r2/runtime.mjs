import {DESIGN,fixtureState,makeShellMesh} from './design.mjs';
import {BarrierSfx} from './sfx.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify'),embed=query.has('embed');if(embed)document.body.classList.add('embed');
const sound=new BarrierSfx(verify);const hook=async o=>sound.setEnabled(typeof o==='boolean'?o:o?.enabled??o?.muted===false);hook.activateFromGesture=async()=>({enabled:await sound.setEnabled(true)});hook.setMuted=m=>sound.setEnabled(!m);hook.snapshot=()=>({audioGain:sound.enabled&&!verify?.65:0,audioState:sound.ctx?.state??'not-created',verify,enabled:sound.enabled});globalThis.__gallerySfx=hook;
const worldShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{ @builtin(position) clip:vec4f, @location(0) normal:vec3f, @location(1) position:vec3f, @location(2) layer:f32, @location(3) theta:f32 };
struct Out{ @location(0) scene:vec4f, @location(1) emission:vec4f };
fn ss(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn rotate(p:vec3f)->vec3f{
 let cy=cos(.4537856);let sy=sin(.4537856);let cx=cos(.2617994);let sx=sin(.2617994);
 let a=vec3f(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
 return vec3f(a.x,cx*a.y-sx*a.z,sx*a.y+cx*a.z);
}
fn center(instance:u32)->vec2f{if(u.options.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
@vertex fn meshVS(@location(0) data:vec4f,@builtin(instance_index) instance:u32)->V{
 let theta=data.x;let phi=data.y;let inner=data.z;let quadrant=data.w;
 let radii=vec3f(.9,1.17,.67)-vec3f(.07)*inner;
 let direction=vec3f(cos(theta)*sin(phi),cos(phi),sin(theta)*sin(phi));
 // Superellipsoid exponent 3: broad curved panels, with real rounded corner volume.
 let shaped=sign(direction)*pow(abs(direction),vec3f(2./3.));
 var position=shaped*radii;
 let t=u.time.x;let stage=u.time.y;var spread=1.;
 if(stage<.5){spread=1.13-.13*ss(0.,.24,t);}
 position*=spread;
 if(stage>1.5&&stage<2.5){let opened=ss(.08,.35,t);let axis=quadrant*1.5707963+.7853982;position+=vec3f(cos(axis),.08,sin(axis))*.43*opened;}
 let normal=normalize(rotate(sign(shaped)*pow(abs(shaped),vec3f(2.))/radii));let viewed=rotate(position+vec3f(0,.075,0));let scale=u.viewport.z/1.65;
 let pixel=center(instance)+vec2f(viewed.x,-viewed.y)*scale;
 var v:V;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5-viewed.z*.1,1.);v.normal=normal;v.position=position;v.layer=inner;v.theta=theta;return v;
}
@fragment fn meshFS(v:V)->Out{
 let t=u.time.x;let stage=u.time.y;let inner=v.layer;
 let n=normalize(v.normal);let facing=abs(n.z);let grazing=pow(1.-facing,1.6);let rear=select(1.,.44,n.z<0.);
 let phiY=v.position.y/1.17;
 var envelope=1.;var supply=1.;
 if(stage<.5){envelope=ss(0.,.13,t);supply=.6+1.15*exp(-pow((t-.24)/.12,2.));}
 if(stage>1.5&&stage<2.5){envelope=1.-ss(.18,.48,t);supply=1.+.7*exp(-pow((t-.09)/.07,2.));}
 let thickSide=ss(.28,.86,grazing);
 let window=(1.-ss(.32,.65,abs(v.position.x)))*(1.-ss(.55,.82,phiY));
 let faceProtection=ss(.46,.78,phiY)*(1.-ss(.2,.5,abs(v.position.x)));
 let layerWeight=select(1.,.54,inner>.5);
 let coverage=(.24+.32*thickSide+.1*abs(n.y))*(1.-.48*window)*(1.-.78*faceProtection)*envelope*layerWeight;
 let material=vec3f(.02,.3,.58)*(.58+.35*dot(n,normalize(vec3f(-.5,.8,1.))))+vec3f(.01,.09,.2)*thickSide;
 // 主面を横切る細格子を作らず、曲率と内外の有限厚に源を束縛する。
 let belt=exp(-pow((v.position.y+.45)/.2,2.));let rim=pow(grazing,2.1);
 let panelResponse=ss(.25,.72,abs(v.position.x))*(1.-ss(.5,.85,abs(phiY)));
 let cornerSource=ss(.4,.7,abs(v.position.x))*ss(.35,.65,abs(phiY));
 var source=(rim*.25+belt*.34+panelResponse*.22)*supply*envelope*rear*layerWeight;
 var core=pow(rim,2.)*(.3+cornerSource*.85)*envelope*rear*layerWeight;
 if(stage>2.5&&stage<3.5){
  let hit=vec3f(.72,.06,.37);let distance=length(v.position-hit);
  let localPeak=exp(-pow(distance/.18,2.))*exp(-pow((t-.06)/.06,2.));
  let wave=exp(-pow((distance-t*2.15)/.14,2.))*(1.-ss(.32,.65,t));
  let response=select((rim*.25+belt*.35)*exp(-pow((t-.1)/.1,2.)),localPeak*1.4+wave*.72,u.time.z>.5);
  source+=response*envelope*layerWeight;core+=localPeak*.9*envelope*layerWeight*select(0.,1.,u.time.z>.5);
 }
 source*=u.options.x;core*=u.options.x;
 let radiance=vec3f(.12,.8,1.7)*source+vec3f(2.2,2.25,2.3)*core;
 let alpha=coverage*u.options.z;var result:Out;result.scene=vec4f(material*alpha+radiance,alpha);result.emission=vec4f(radiance,alpha);return result;
}
@vertex fn fullVS(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn backgroundFS(@builtin(position) p:vec4f)->Out{var bg=vec3f(.012,.021,.036);if(u.options.w>.5&&p.x>u.viewport.x*.5){bg=vec3f(.68,.72,.76);}var r:Out;r.scene=vec4f(bg,1);r.emission=vec4f(0);return r;}
struct BodyV{@builtin(position) clip:vec4f,@location(0) uv:vec2f};
@vertex fn bodyVS(@builtin(vertex_index) i:u32,@builtin(instance_index) instance:u32)->BodyV{
 var pos=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));
 let a=pos[i];let pixel=center(instance)+a*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1);v.uv=vec2f((62.+(a.x+.5)*136.)/768.,(15.+(a.y+.5)*225.)/512.);return v;
}
@fragment fn bodyFS(v:BodyV)->Out{let b=textureSample(actor,samp,v.uv);let rgb=pow(b.rgb,vec3f(2.2));var r:Out;r.scene=vec4f(rgb*b.a,b.a);r.emission=vec4f(0,0,0,b.a);return r;}
`;
const postShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
fn blur(p:vec2i,axis:vec2i)->vec4f{let dimensions=vec2i(textureDimensions(source));var rgb=vec3f(0);var weights=0.;for(var i=-8;i<=8;i++){let weight=exp(-f32(i*i)/14.);let offset=axis*i;let q=clamp(p+offset,vec2i(0),dimensions-vec2i(1));rgb+=textureLoad(source,q,0).rgb*weight;weights+=weight;}return vec4f(rgb/weights,1);}
@fragment fn horizontal(@builtin(position) p:vec4f)->@location(0) vec4f{return blur(vec2i(p.xy),vec2i(1,0));}
@fragment fn vertical(@builtin(position) p:vec4f)->@location(0) vec4f{return blur(vec2i(p.xy),vec2i(0,1));}
@fragment fn composite(@builtin(position) p:vec4f)->@location(0) vec4f{let q=vec2i(p.xy);let c=textureLoad(scene,q,0).rgb+textureLoad(source,q,0).rgb*.32*u.options.y;return vec4f(pow(max(c,vec3f(0)),vec3f(1./2.2)),1);}
`;
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');const errors=[];let device,context,timer,frame=0,fixed=null,start=performance.now(),last=0,loop=-1;const intervals=[];
try{
 if(!navigator.gpu)throw Error('WebGPU unsupported');const adapter=await navigator.gpu.requestAdapter();device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
 const format=navigator.gpu.getPreferredCanvasFormat();context=canvas.getContext('webgpu');context.configure({device,format,alphaMode:'opaque'});
 const shader=device.createShaderModule({code:worldShader}),post=device.createShaderModule({code:postShader});for(const module of [shader,post]){const info=await module.getCompilationInfo();const failed=info.messages.filter(x=>x.type==='error');if(failed.length)throw Error(failed.map(m=>`${m.lineNum}:${m.message}`).join('\n'));}
 const blend={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
 const worldTargets=[{format:'rgba16float',blend},{format:'rgba16float',blend}];
 const worldLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]});const worldPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[worldLayout]});
 const pipelines={};
 for(const [name,cull] of [['back','front'],['front','back']])pipelines[name]=await device.createRenderPipelineAsync({layout:worldPipelineLayout,vertex:{module:shader,entryPoint:'meshVS',buffers:[{arrayStride:16,attributes:[{shaderLocation:0,offset:0,format:'float32x4'}]}]},fragment:{module:shader,entryPoint:'meshFS',targets:worldTargets},primitive:{topology:'triangle-list',cullMode:cull}});
 for(const [name,vs,fs] of [['background','fullVS','backgroundFS'],['body','bodyVS','bodyFS']])pipelines[name]=await device.createRenderPipelineAsync({layout:worldPipelineLayout,vertex:{module:shader,entryPoint:vs},fragment:{module:shader,entryPoint:fs,targets:worldTargets},primitive:{topology:'triangle-list'}});
 const postLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'unfilterable-float'}}]});const postPipelineLayout=device.createPipelineLayout({bindGroupLayouts:[postLayout]});
 for(const [name,entry,target] of [['horizontal','horizontal','rgba16float'],['vertical','vertical','rgba16float'],['composite','composite',format]])pipelines[name]=await device.createRenderPipelineAsync({layout:postPipelineLayout,vertex:{module:post,entryPoint:'vs'},fragment:{module:post,entryPoint:entry,targets:[{format:target}]},primitive:{topology:'triangle-list'}});
 const image=await createImageBitmap(await(await fetch('./body.png')).blob());const actor=device.createTexture({size:[image.width,image.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:image},{texture:actor},[image.width,image.height]);image.close();
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const bind=device.createBindGroup({layout:worldLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:actor.createView()},{binding:2,resource:device.createSampler({minFilter:'linear',magFilter:'linear'})}]});
 const mesh=makeShellMesh();const meshBuffer=device.createBuffer({size:mesh.vertices.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(meshBuffer,0,mesh.vertices);const settings={emit:true,obs:true,face:true,known:true,h:64,dual:query.has('audit'),front:true,back:true};let targets=[];let groups={};let size='';
 function resize(){const dpr=devicePixelRatio||1;const width=Math.round(canvas.clientWidth*dpr),height=Math.round(canvas.clientHeight*dpr);const next=`${width}:${height}`;if(next===size)return;size=next;canvas.width=width;canvas.height=height;for(const t of targets)t.destroy();targets=[];for(let i=0;i<4;i++)targets.push(device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));const [scene,emission,blurH,blurV]=targets;for(const [name,input] of [['horizontal',emission],['vertical',blurH],['composite',blurV]])groups[name]=device.createBindGroup({layout:postLayout,entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:input.createView()},{binding:2,resource:scene.createView()}]});}
 function draw(now){
  resize();const dpr=devicePixelRatio||1;const elapsed=fixed??((now-start)%4600);const state=fixtureState(elapsed);const cycle=Math.floor((now-start)/4600);if(fixed===null){if(last)intervals.push(now-last);last=now;if(intervals.length>1000)intervals.shift();loop=cycle;if(state.event)sound.play(state.event,`${cycle}:${state.event}`);}
  device.queue.writeBuffer(uniform,0,new Float32Array([canvas.width,canvas.height,settings.h*dpr,dpr,state.t,state.stage,Number(settings.known),Number(state.live),Number(settings.emit),Number(settings.obs),Number(settings.face),Number(settings.dual),Number(settings.front),Number(settings.back),0,0]));
  const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:targets.slice(0,2).map(t=>({view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});pass.setBindGroup(0,bind);pass.setPipeline(pipelines.background);pass.draw(3);const count=settings.dual?2:1;
  if(state.live&&settings.back){pass.setPipeline(pipelines.back);pass.setVertexBuffer(0,meshBuffer);pass.draw(mesh.surfaceVertexCount,count,0);pass.draw(mesh.surfaceVertexCount,count,mesh.surfaceVertexCount);}
  pass.setPipeline(pipelines.body);pass.draw(6,count);
  if(state.live&&settings.front){pass.setPipeline(pipelines.front);pass.setVertexBuffer(0,meshBuffer);pass.draw(mesh.surfaceVertexCount,count,mesh.surfaceVertexCount);pass.draw(mesh.surfaceVertexCount,count,0);}
  pass.end();
  for(const [name,target] of [['horizontal',targets[2]],['vertical',targets[3]],['composite',null]]){const p=encoder.beginRenderPass({colorAttachments:[{view:target?target.createView():context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});p.setPipeline(pipelines[name]);p.setBindGroup(0,groups[name]);p.draw(3);p.end();}
  device.queue.submit([encoder.finish()]);frame++;timer=requestAnimationFrame(draw);
 }
 globalThis.__barrier={ready:true,design:DESIGN.id,verify,compiled:true,adapter:{vendor:adapter.info?.vendor,architecture:adapter.info?.architecture,device:adapter.info?.device,description:adapter.info?.description,isFallbackAdapter:adapter.isFallbackAdapter},errors,settings,seek(ms){fixed=ms;},resume(){fixed=null;start=performance.now();last=0;loop=-1;intervals.length=0;},stats(){return{frame,intervals:[...intervals],loops:loop+1,verify,soundEnabled:sound.enabled,errors:[...errors],width:canvas.width,height:canvas.height,meshVertices:mesh.totalVertexCount,GPUOnlyPasses:4};},stop(){cancelAnimationFrame(timer);sound.dispose();for(const t of targets)t.destroy();device.destroy();}};
 status.textContent='Barrier r2 · WebGPU · H64';timer=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>globalThis.__barrier.stop(),{once:true});
}catch(error){errors.push(error.message);status.textContent=error.message;globalThis.__barrier={ready:false,errors};}
