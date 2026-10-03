// Fresh GPT-6.1-Sol alchemy-railgun E r1. No legacy creative shader/audio input.
export const VERSION='alchemy-railgun-sol61-r1';
export const DURATION_MS=900;
export const MAX_EVENTS=8;
const finite=Number.isFinite;
const point=p=>p&&finite(p.x)&&finite(p.y);
export function planRailgun(receipt,frame){
  if(!receipt||receipt.type!=='alchemy-railgun'||typeof receipt.id!=='string'||!receipt.id.startsWith('magic_')) throw new Error('railgun-source-id');
  if(!frame||!finite(frame.nowMs)||!finite(receipt.startedAt)||!finite(frame.zoom)||frame.zoom<=0||!point(frame.camera)||!point(frame.viewport)||frame.viewport.x<=0||frame.viewport.y<=0) throw new Error('railgun-frame-clock-transform');
  const ageMs=frame.nowMs-receipt.startedAt;
  if(ageMs<0||ageMs>=DURATION_MS||receipt.cancelled||frame.visible===false) return null;
  if(!point(receipt.handWorld)||receipt.handSourceId!==receipt.id||receipt.handFrameId!==frame.id) throw new Error('railgun-event-bound-hand');
  if(!finite(receipt.targetX)||!finite(receipt.targetY)||!finite(receipt.radius)||receipt.radius<=0||!['normal','enhance','gbo'].includes(receipt.variant)) throw new Error('railgun-receipt-geometry');
  const dx=receipt.targetX-receipt.handWorld.x,dy=receipt.targetY-receipt.handWorld.y,length=Math.hypot(dx,dy);
  if(length<1) throw new Error('railgun-degenerate-collision-endpoint');
  const project=p=>({x:(p.x-frame.camera.x)*frame.zoom+frame.viewport.x/2,y:(p.y-frame.camera.y)*frame.zoom+frame.viewport.y/2});
  const origin=project(receipt.handWorld),end=project({x:receipt.targetX,y:receipt.targetY});
  const widthScale=Math.min(2.2,Math.max(.65,Math.sqrt(receipt.radius/100)));
  return Object.freeze({version:VERSION,sourceId:receipt.id,frameId:frame.id,clockMs:frame.nowMs,ageMs,origin,end,axis:{x:dx/length,y:dy/length},lengthPx:length*frame.zoom,zoom:frame.zoom,widthScale,reducedMotion:!!frame.reducedMotion,obs:frame.obs!==false,viewport:{...frame.viewport}});
}
export function planRailguns(receipts,frame){
  if(!Array.isArray(receipts)||receipts.length>MAX_EVENTS) throw new Error('railgun-event-capacity');
  const ids=new Set();return receipts.map(r=>{if(ids.has(r.id))throw new Error('railgun-duplicate-cause');ids.add(r.id);return planRailgun(r,frame)}).filter(Boolean);
}
export function releasePosition(ageMs){return Math.min(1,Math.max(0,(ageMs-150)/270));}
export const SOURCE_WGSL=String.raw`
struct U { screen:vec4f, origin:vec4f, axis:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn pulse(t:f32,a:f32,b:f32,c:f32)->f32 {return smoothstep(0.,a,t)*(1.-smoothstep(b,c,t));}
fn sq(x:f32)->f32 {return x*x;}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let age=u.screen.z;let z=u.screen.w;let scale=u.state.x;let len=u.origin.w;
 let d=(p.xy-u.origin.xy)/z;let along=dot(d,u.axis.xy);let side=dot(d,vec2f(-u.axis.y,u.axis.x));let L=len/z;
 let s=clamp(along/max(L,1.),0.,1.);let gate=smoothstep(-2.,0.,along)*(1.-smoothstep(L,L+2.,along));
 let body=pulse(age,12.,125.,440.);let memory=pulse(age,25.,430.,900.);
 let release=clamp((age-150.)/270.,0.,1.);let behind=1.-smoothstep(release-.055,release+.055,s);
 let alive=1.-behind*smoothstep(150.,190.,age);
 let half=(7.+4.*(1.-s))*scale*(.22+.78*alive);
 let sectionPhase=select(s*L/70.-age*.012,s*L/70.,u.state.y>.5);
 let section=pow(.5+.5*cos(sectionPhase*6.283185),8.);
 let core=exp(-sq(side/max(half*.25,1.))*2.)*gate*(body*alive+.17*memory);
 let field=exp(-sq(side/max(half,1.))*1.3)*gate*(body*alive*.72+memory*.16);
 let rims=exp(-sq((abs(side)-half*.85)/max(half*.13,1.)))*gate*body*alive;
 let cut=exp(-sq((s-release)/.045))*gate*pulse(age,150.,360.,500.);
 let terminal=exp(-sq((along-L)/max(7.*scale,1.))-sq(side/max(half,1.)))*pulse(age,25.,160.,340.);
 let apertureGate=pulse(age,5.,50.,180.);let apertureX=exp(-sq(sq((along-13.)/17.)));
 let apertureSides=exp(-sq((abs(side)-16.*scale)/(3.*scale)));
 let aperture=apertureX*apertureSides*apertureGate;
 let transverse=exp(-pow(abs(side/(21.*scale*(1.-.45*s))),6.))*section*gate*memory*(.06+.24*alive);
 let density=clamp(field*.7+aperture*.6+transverse*.3,0.,1.);
 let coverage=density*.28;
 let emission=vec3f(10.5,11.5,12.)*core+vec3f(.25,2.9,4.5)*(field+rims*.85+transverse)+vec3f(2.2,.72,.16)*(aperture+cut*field*.6)+vec3f(2.5,4.,4.5)*terminal;
 // RGB is independent emitted radiance, alpha is coverage. No emission alpha double multiplication.
 let finiteSupport=(1.-smoothstep(44.*scale,48.*scale,abs(side)))*smoothstep(-20.,-16.,along)*(1.-smoothstep(L+12.,L+16.,along));
 return vec4f(emission*finiteSupport,coverage*finiteSupport);
}`;
export const COMPOSITE_WGSL=String.raw`
struct C { screen:vec4f, control:vec4f };
@group(0) @binding(0) var source:texture_2d<f32>;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var<uniform> c:C;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn src(q:vec2i)->vec4f {let size=vec2i(textureDimensions(source));return textureLoad(source,clamp(q,vec2i(0),size-1),0);}
fn excess(q:vec2i)->vec3f {let v=src(q).rgb;return max(v-vec3f(.65),vec3f(0.));}
fn encode(v:vec3f)->vec3f {return select(v*12.92,1.055*pow(max(v,vec3f(0.)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let q=vec2i(p.xy);let base=textureLoad(scene,q,0);let v=src(q);let r=i32(max(1.,round(10.*c.screen.z)));
 var glow=excess(q)*.16;
 let offsets=array<vec2i,12>(vec2i(1,0),vec2i(-1,0),vec2i(0,1),vec2i(0,-1),vec2i(1,1),vec2i(1,-1),vec2i(-1,1),vec2i(-1,-1),vec2i(2,0),vec2i(-2,0),vec2i(0,2),vec2i(0,-2));
 for(var i=0u;i<12u;i++){glow+=excess(q+offsets[i]*r)*select(.025,.08,i<8u);}
 // Optional registered matte-plane receiver, not an automatic background brightness correction.
 let receiver=base.rgb*glow*c.control.z;
 let linear=base.rgb*(1.-v.a)+v.rgb+receiver+glow*.22*c.control.x;
 return vec4f(select(linear,encode(linear),c.control.y>.5),1.);
}`;
export async function createRailgunRenderer(device,{outputFormat='bgra8unorm',encodePresentation=true}={}){
  const module=code=>device.createShaderModule({code});
  const sourceModule=module(SOURCE_WGSL),compositeModule=module(COMPOSITE_WGSL);
  for(const m of [sourceModule,compositeModule]){const info=await m.getCompilationInfo();const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(errors.map(x=>x.message).join('\n'));}
  const sourcePipeline=device.createRenderPipeline({layout:'auto',vertex:{module:sourceModule,entryPoint:'vs'},fragment:{module:sourceModule,entryPoint:'fs',targets:[{format:'rgba16float',blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  const compositePipeline=device.createRenderPipeline({layout:'auto',vertex:{module:compositeModule,entryPoint:'vs'},fragment:{module:compositeModule,entryPoint:'fs',targets:[{format:outputFormat}]},primitive:{topology:'triangle-list'}});
  const slots=Array.from({length:MAX_EVENTS},()=>{const buffer=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});return {buffer,bind:device.createBindGroup({layout:sourcePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]})};});
  const compositeBuffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  return {sourceModule,compositeModule,
    recordSource(encoder,plans,targetView){
      if(plans.length>MAX_EVENTS)throw new Error('railgun-event-capacity');
      plans.forEach((p,i)=>device.queue.writeBuffer(slots[i].buffer,0,new Float32Array([p.viewport.x,p.viewport.y,p.ageMs,p.zoom,p.origin.x,p.origin.y,0,p.lengthPx,p.axis.x,p.axis.y,0,0,p.widthScale,+p.reducedMotion,0,0])));
      const pass=encoder.beginRenderPass({colorAttachments:[{view:targetView,clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(sourcePipeline);plans.forEach((p,i)=>{pass.setBindGroup(0,slots[i].bind);pass.draw(3)});pass.end();return plans.length;
    },
    recordComposite(encoder,{sourceView,sceneView,outputView,targetIdentities,width,height,pixelRatio=1,obs=true,registeredMattePlaneGain=0}){
      if(!targetIdentities||!targetIdentities.source||!targetIdentities.scene||!targetIdentities.output||new Set(Object.values(targetIdentities)).size!==3)throw new Error('railgun-target-lease-alias');
      if(sourceView===outputView||sceneView===outputView||sourceView===sceneView)throw new Error('railgun-target-alias');
      if(!finite(registeredMattePlaneGain)||registeredMattePlaneGain<0)throw new Error('railgun-receiver-contract');
      device.queue.writeBuffer(compositeBuffer,0,new Float32Array([width,height,pixelRatio,0,+obs,+encodePresentation,registeredMattePlaneGain,0]));
      const bind=device.createBindGroup({layout:compositePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:sourceView},{binding:1,resource:sceneView},{binding:2,resource:{buffer:compositeBuffer}}]});
      const pass=encoder.beginRenderPass({colorAttachments:[{view:outputView,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(compositePipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
    },dispose(){slots.forEach(s=>s.buffer.destroy());compositeBuffer.destroy();}
  };
}
