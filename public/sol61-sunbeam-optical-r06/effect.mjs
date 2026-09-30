import {opticalWGSL,opticalGeometry} from './optics-contract.mjs';
export const VERSION='sunbeam-optical-sol61-r06';
export const AUTHORSHIP=Object.freeze({base:'GPT-6-Astra / adopted Sunbeam lens r05',opticalRevision:'GPT-6.1-Sol / r06',kind:'derived_optical_revision_not_reauthored_base'});
export const DURATION=1200;
export const shader=/* wgsl */`
struct U { viewport:vec4f, source:vec4f, end:vec4f, optics:vec4f, sprite:vec4f, crop:vec4f, bounds:vec4f, }; 
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var tex:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(v[i],0.,1.);
}
fn gauss(x:f32,w:f32)->f32{return exp(-x*x/(w*w));}
fn band(x:f32,a:f32,b:f32,w:f32)->f32{return smoothstep(a-w,a+w,x)*(1.-smoothstep(b-w,b+w,x));}
fn linear(c:vec3f)->vec3f{return pow(max(c,vec3f(0.)),vec3f(2.2));}
${opticalWGSL}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let size=u.viewport.xy;let t=u.viewport.z;let scale=u.viewport.w;
 let s=u.source.xy;let e=u.end.xy;let visible=u.source.z;let intensity=u.source.w;
 let pixel=p.xy;let dark=vec3f(.021,.029,.048);let light=vec3f(.64,.67,.70);
 var rgb=mix(linear(dark),linear(light),u.end.w);
 let uv=(pixel-u.sprite.xy)/u.sprite.zw;
 if all(uv>=vec2f(0.)) && all(uv<=vec2f(1.)) {
  let st=(u.crop.xy+uv*u.crop.zw)/vec2f(textureDimensions(tex));
  let c=textureSampleLevel(tex,samp,st,0.);rgb=mix(rgb,linear(c.rgb),c.a);
 }
 if any(pixel<u.bounds.xy) || any(pixel>u.bounds.zw) {return vec4f(pow(max(rgb,vec3f(0.)),vec3f(1./2.2)),1.);}
 let q=(pixel-s)/scale;let delta=(e-s)/scale;let len=length(delta);let axis=delta/max(len,.001);let normal=vec2f(-axis.y,axis.x);
 let x=dot(q,axis);let y=dot(q,normal);
 let charge=smoothstep(0.,.21,t);let shutdown=1.-smoothstep(.79,.94,t);
 let sourceEnergy=charge*shutdown*visible*intensity*select(0.,1.,t>=0. && t<1.2);
 let travel=smoothstep(.21,.39,t)*len;let tail=smoothstep(.80,1.12,t)*len;
 let envelope=smoothstep(.20,.245,t)*(1.-smoothstep(1.10,1.12,t));
 let section=sin(clamp(x/len,0.,1.)*3.14159);
 let tip=smoothstep(0.,12.,travel-x);let rear=smoothstep(-2.,10.,x-tail);
 let closure=sqrt(max(.008,tip*rear));
 let tubeWidth=(2.1+4.8*section*smoothstep(0.,25.,x))*closure;
 let axial=band(x,tail,travel,1.4);
 let density=gauss(y,tubeWidth);
 let core=gauss(y,(.9+1.2*section)*closure);
 let body=vec3f(1.0,.42,.065)*density*.68;
 let beam=(body+vec3f(1.,.91,.68)*core*2.8)*axial*envelope*intensity;
 rgb+=beam*visible;
 // PH1: only the supplied finite beam endpoint is shown, never a fabricated hit.
 let front=vec2f(travel,0.);let frontQ=vec2f(x,y)-front;
 rgb+=vec3f(1.,.72,.29)*gauss(length(frontQ/vec2f(2.2,1.3)),1.)*envelope*.65*visible*intensity;
 // OBS1: palm source bloom and optical streaks. Source is the radiance maximum.
 let radius=length(q);let sourceCore=gauss(radius,3.3)*21.;
 let sourceGlow=gauss(radius,10.5)*3.0+gauss(radius,27.)*.30;
 let streak=gauss(y,.72)*gauss(x,39.)*2.2+gauss(x,0.65)*gauss(y,22.)*.90;
 // The actual palm emission is world/source; bloom and streak are observer response.
 rgb+=(vec3f(1.,.91,.69)*sourceCore+(vec3f(1.,.56,.17)*sourceGlow+vec3f(1.,.78,.43)*streak)*u.optics.y)*sourceEnergy;
 // OBS2: paraxial ghost images on the source/image-centre optical axis.
 let center=u.optics.zw;let sourceOffset=(s-center)/scale;
 let offset=length(sourceOffset);var opticalAxis=vec2f(1.,0.);if(offset>.0001){opticalAxis=-sourceOffset/offset;}
 let side=vec2f(-opticalAxis.y,opticalAxis.x);
 let angleResponse=smoothstep(3.,35.,offset)*(1.-smoothstep(390.,560.,offset));
 let ghostEnergy=sourceEnergy*u.optics.x*u.optics.y*angleResponse;
 let ghostCenter=center+sourceOffset*.64*scale;
 let d=(pixel-ghostCenter)/scale;
 let gd=vec2f(dot(d,opticalAxis)/1.30,dot(d,side));
 let radial=length(gd);let direction=dot(d/max(length(d),.001),opticalAxis);
 let opening=arcAngularSupport(atan2(gd.y,gd.x));
 let apertureRadius=14.+offset*.12;
 let spectral=vec3f(gauss(radial-apertureRadius-3.2,7.8),gauss(radial-apertureRadius,6.0),gauss(radial-apertureRadius+3.0,4.8));
 let filmResponse=vec3f(.82,.58,.92)+vec3f(.18,.42,.08)*smoothstep(-.8,.8,direction);
 // Off-axis vignetting selects an inward-facing 130-degree arc; its complement is exactly zero.
 let componentMask=u32(u.end.z);
 rgb+=spectral*filmResponse*opening*.16*ghostEnergy*select(0.,1.,(componentMask&1u)!=0u);
 let discCenter=center-sourceOffset*.75*scale;
 let g=(pixel-discCenter)/scale;
 let discRadius=5.0+offset*.025;
 let disc=gauss(length(g)/discRadius,1.0)*(1.-smoothstep(discRadius*1.4,discRadius*2.,length(g)));
 rgb+=vec3f(.36,.24,.12)*disc*ghostEnergy*.075*select(0.,1.,(componentMask&2u)!=0u);
 // A separate reflected six-blade pupil image, camera-fixed aperture orientation.
 let hexCenter=center-sourceOffset*.30*scale;
 let h=(pixel-hexCenter)/scale;
 let foreshorten=1.+.12*clamp(offset/350.,0.,1.);
 let hp=h-opticalAxis*dot(h,opticalAxis)*(1.-1./foreshorten);
 let hex=sixBlade(hp,5.5+offset*.025);
 rgb+=vec3f(.20,.30,.42)*hex*ghostEnergy*.07*select(0.,1.,(componentMask&4u)!=0u);
 // Energy addition is independent of background. Display encoding occurs once.
 return vec4f(pow(max(rgb,vec3f(0.)),vec3f(1./2.2)),1.);
}`;

export class SunbeamRenderer {
 static async create(canvas,characterUrl){
  if(!navigator.gpu)throw Error('WebGPU unavailable');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('GPU adapter unavailable');
  const device=await adapter.requestDevice();const context=canvas.getContext('webgpu');
  const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const module=device.createShaderModule({code:shader});const info=await module.getCompilationInfo();
  if(info.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(info.messages));
  const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  const bitmap=await createImageBitmap(await(await fetch(characterUrl)).blob());
  const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);bitmap.close();
  const uniform=device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
  return new SunbeamRenderer({canvas,adapter,device,context,pipeline,uniform,bind,texture,errors});
 }
 constructor(parts){Object.assign(this,parts);this.frames=0;this.options={height:64,ghosts:1,ghostComponent:'all',observation:1,observerCentre:[this.canvas.width/2,this.canvas.height/2],sourceVisibility:1,intensity:1,background:0,shift:[0,0]};}
 render(elapsedMs,options={}){
  if(!Number.isFinite(elapsedMs))throw TypeError('finite actor elapsedMs required');
  const o={...this.options,...options};
  if(!Number.isFinite(o.height)||o.height<=0||!Array.isArray(o.shift)||o.shift.length!==2||!o.shift.every(Number.isFinite)||!Array.isArray(o.observerCentre)||o.observerCentre.length!==2||!o.observerCentre.every(Number.isFinite)||!Number.isFinite(o.intensity)||o.intensity<0||![o.ghosts,o.observation,o.sourceVisibility,o.background].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw TypeError('finite supported rendering options required');
  const componentMask={none:0,arc:1,round:2,hex:4,all:7}[o.ghostComponent];if(componentMask===undefined)throw TypeError('known optical component required');
  Object.assign(this.options,o);const k=o.height/64;const sc=o.height/589;
  const sprite=[325+o.shift[0]-155*(k-1),280+o.shift[1]-32*(k-1),473*sc,589*sc];
  // Current game's right release crop/hand registration, referenced only as spatial input.
  const source=[sprite[0]+425*sc,sprite[1]+215*sc];
  const end=[source[0]+300*k,source[1]-26*k];
  const center=o.observerCentre;const geometry=opticalGeometry(source,center,k);const offset=geometry.offset;const radius=geometry.arcRadius;
  const ghost1=[center[0]+offset[0]*.64*k,center[1]+offset[1]*.64*k],ghost2=[center[0]-offset[0]*.75*k,center[1]-offset[1]*.75*k];
  const roundExtent=geometry.roundRadius*2+2,hexExtent=geometry.hexRadius*geometry.hexForeshorten*1.16+3;
  const bounds=[Math.min(source[0]-130*k,ghost1[0]-(radius*1.3+26)*k,ghost2[0]-roundExtent*k,geometry.hex[0]-hexExtent*k),Math.min(source[1]-100*k,end[1]-30*k,ghost1[1]-(radius*1.3+26)*k,ghost2[1]-roundExtent*k,geometry.hex[1]-hexExtent*k),Math.max(end[0]+30*k,source[0]+130*k,ghost1[0]+(radius*1.3+26)*k,ghost2[0]+roundExtent*k,geometry.hex[0]+hexExtent*k),Math.max(source[1]+100*k,end[1]+30*k,ghost1[1]+(radius*1.3+26)*k,ghost2[1]+roundExtent*k,geometry.hex[1]+hexExtent*k)];
  const data=new Float32Array([this.canvas.width,this.canvas.height,elapsedMs/1000,k,...source,o.sourceVisibility,o.intensity,...end,componentMask,o.background,o.ghosts,o.observation,...center,...sprite,100,640,473,589,...bounds]);
  this.device.queue.writeBuffer(this.uniform,0,data);const encoder=this.device.createCommandEncoder();
  const background=o.background?[.64,.67,.70,1]:[.021,.029,.048,1];
  const pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:background}]});
  const bx=Math.max(0,Math.floor(Math.min(bounds[0],sprite[0]))),by=Math.max(0,Math.floor(Math.min(bounds[1],sprite[1])));
  const br=Math.min(this.canvas.width,Math.ceil(Math.max(bounds[2],sprite[0]+sprite[2]))),bb=Math.min(this.canvas.height,Math.ceil(Math.max(bounds[3],sprite[1]+sprite[3])));
  pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.bind);if(br>bx&&bb>by){pass.setScissorRect(bx,by,br-bx,bb-by);pass.draw(3);}pass.end();this.device.queue.submit([encoder.finish()]);this.frames++;
  this.last={elapsedMs,source,end,opticalGeometry:geometry,uniforms:Array.from(data),bounds,options:{...o},frames:this.frames};return this.last;
 }
 destroy(){this.uniform.destroy();this.texture.destroy();this.device.destroy();}
}

export function synthesizeSunbeam(sampleRate=48000){
 const n=Math.ceil(sampleRate*1.2);const pcm=new Float32Array(n);let seed=20260929;let low=0;
 for(let i=0;i<n;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;low+=.085*(white-low);
  const charge=Math.sin(Math.PI*Math.min(1,t/.23))**2*(t<.23?1:0);
  const attack=t>=.21?Math.exp(-(t-.21)*22):0;
  const hold=t>=.21&&t<.94?Math.min(1,(t-.21)/.035)*(1-Math.max(0,(t-.79)/.15)):0;
  const ring=t>=.21?Math.exp(-(t-.21)*7):0;
  const chirp=Math.sin(2*Math.PI*(220*t+800*t*t));
  const tone=.72*Math.sin(2*Math.PI*220*t)+.38*Math.sin(2*Math.PI*439.6*t)+.16*Math.sin(2*Math.PI*881*t);
  const air=(white-low)*.15+low*.55;
  const tail=Math.max(0,Math.min(1,(1.16-t)/.1));
  pcm[i]=(.07*charge*chirp+.19*attack*air+.105*hold*tone+.020*hold*air+.018*ring*Math.sin(2*Math.PI*2350*t))*tail;
 }
 return pcm;
}
export class SunbeamSound {
 constructor({verify=false}={}){Object.defineProperty(this,'verify',{value:!!verify,enumerable:true,writable:false});this.seen=new Set();this.active=new Map();this.context=null;this.timeScale=1;}
 async unlock(){if(this.verify)return false;this.context??=new AudioContext();await this.context.resume();return this.context.state==='running';}
 async trigger(causeId,{ageEms=0,submitted=false}={}){
  if(!causeId||this.seen.has(causeId)||!submitted||!Number.isFinite(ageEms)||ageEms<0||ageEms>=1200||this.timeScale<=0)return false;
  if(this.verify)return false;
  if(!this.context||this.context.state!=='running')return false;
  this.seen.add(causeId);
  const pcm=synthesizeSunbeam(this.context.sampleRate);const buffer=this.context.createBuffer(1,pcm.length,this.context.sampleRate);buffer.copyToChannel(pcm,0);
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=this.timeScale;gain.gain.value=1;source.connect(gain);gain.connect(this.context.destination);source.onended=()=>{source.disconnect();gain.disconnect();this.active.delete(causeId);};this.active.set(causeId,{source,gain});source.start(this.context.currentTime,ageEms/1000);return true;
 }
 cancel(causeId){const v=this.active.get(causeId);if(v){v.gain.gain.cancelScheduledValues(this.context.currentTime);v.gain.gain.setValueAtTime(v.gain.gain.value,this.context.currentTime);v.gain.gain.linearRampToValueAtTime(0,this.context.currentTime+.008);v.source.stop(this.context.currentTime+.012);this.active.delete(causeId);}}
 stopAll(){for(const id of [...this.active.keys()])this.cancel(id);}
 setTimeScale(scale){if(!Number.isFinite(scale)||scale<0)throw TypeError('nonnegative actor time scale required');if(scale!==this.timeScale)this.stopAll();this.timeScale=scale;}
 async destroy(){this.stopAll();await this.context?.close();}
}
