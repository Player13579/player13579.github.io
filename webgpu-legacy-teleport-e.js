/* Limited v749 legacy action-teleport migration. NOT teleport-smoke-gust-r5.
 * The provider support is the entire current MAIN viewport: no event is culled.
 * Fixed old texture and equations; Canvas shadow/filter is a declared finite
 * separable Gaussian approximation (13 taps, +/-3 sigma). Native comparison
 * remains required. No adapter/device/context/RAF/audio owner is created here. */
(function(root){
'use strict';
const validId=x=>(typeof x==='string'&&x.trim()!=='')||(typeof x==='number'&&Number.isFinite(x));
const finite=Number.isFinite, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// Fixed padding includes every finite blur tap, including a source just beyond the visible edge.
const PAD_LOGICAL=Math.ceil(3*Math.hypot(19*1.24*.86,Math.max(8,19*1.72*(.94+1.24*.06)*.86)*.46*.5))+2;
const SOURCE=Object.freeze({commit:'71572ea29e79d02928a15ba6d9e86c5106340036',
 path:'assets/generated/action-effect-teleport-v311.png',gitBlob:'8bfeaa53275a7ed7525730c6db2fcc850bb29e43',width:1254,height:1254});
function support(viewport){
 if(viewport?.kind!=='main'||![viewport.width,viewport.height].every(finite)||viewport.width<=0||viewport.height<=0||
 ![viewport.pixelWidth,viewport.pixelHeight].every(x=>Number.isInteger(x)&&x>0))throw new TypeError('Legacy teleport requires current MAIN viewport');
 return Object.freeze({kind:'full-main-viewport',x:0,y:0,width:viewport.pixelWidth,height:viewport.pixelHeight});
}
function plan({effect,now,wallNow=now,camera,zoom,viewport,reducedMotion=false}={}){
 const bounds=support(viewport);
 if(!effect||effect.type!=='action-teleport'||!validId(effect.id)||![effect.x,effect.y,effect.startedAt,effect.duration,now,wallNow,camera?.x,camera?.y,zoom].every(finite)||
 effect.duration<=0||zoom<=0||!['','arrival'].includes(String(effect.variant||''))||
 (effect.radius!=null&&(!finite(effect.radius)||effect.radius<=0)))throw new TypeError('Legacy teleport source invalid');
 const elapsed=now-effect.startedAt;
 if(elapsed<0||elapsed>=effect.duration)return null;
 const p=elapsed/effect.duration, radius=Math.max(80,Number(effect.radius)||110), size=radius*(1.15+p*1.25+Math.sin(Math.min(1,p)*Math.PI)*.2);
 const ease=x=>1-Math.pow(1-clamp(x),3);
 const inherited=(1-p*.42)*(1-ease((p-.58)/.42));
 const sampledTime=reducedMotion?0:Math.floor(wallNow/1000*60)/60;
 const dprX=viewport.pixelWidth/viewport.width,dprY=viewport.pixelHeight/viewport.height;
 const layers=[0,1].map(layer=>{
  const phase=layer*.43, rotation=reducedMotion?0:-(p*.28+layer*.08), layerSize=size*(.88+layer*.16),
   pulse=reducedMotion?1:1+Math.sin(sampledTime*(2.1+.24*2.4)+(phase+p)*Math.PI*2)*.24,
   aura=Math.max(6,19*pulse*.86), outer=Math.max(8,19*1.72*(.94+pulse*.06)*.86)*.46;
  // Canvas shadowBlur has implementation-dependent kernel semantics. sigma=.5*shadowBlur
  // is an explicit candidate approximation, NOT a source-defined finite bound.
  return Object.freeze({layer,phase,progress:p,rotation,size:layerSize,
   x:(effect.x-camera.x)*zoom,y:(effect.y-camera.y)*zoom,offsetY:-p*(8+layer*5),
   alpha:inherited*(.78-layer*.26),sampledTime,
   clock:sampledTime*1.12+phase*1.1+p*1.2,auraSigma:aura,outerSigma:outer*.5,
   glyphSigma:Math.max(4,19*.42*(.86*.82))*.5,
   values:new Float32Array([viewport.pixelWidth,viewport.pixelHeight,dprX,dprY,
    (effect.x-camera.x)*zoom,(effect.y-camera.y)*zoom,zoom,layerSize,
    rotation,-p*(8+layer*5),inherited*(.78-layer*.26),p,
    sampledTime,phase,reducedMotion?1:0,0])});
 });
 return Object.freeze({effectId:String(effect.id),type:effect.type,variant:String(effect.variant||''),progress:p,
  duration:effect.duration,support:bounds,layers:Object.freeze(layers),source:SOURCE});
}
const shader=/* wgsl */`
struct P { vp:vec4f, world:vec4f, state:vec4f, time:vec4f };
@group(0) @binding(0) var<uniform> p:P;
@group(0) @binding(1) var image:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);
}
fn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.0-a.a);}
fn pixelSource(uv:vec2f)->vec4f{
 if(any(uv<vec2f(0))||any(uv>vec2f(1))){return vec4f(0);}
 return textureSampleLevel(image,samp,uv,0.0);
}
fn filtered(c:vec4f)->vec4f{
 if(c.a<=0.0){return vec4f(0);}
 var rgb=c.rgb/c.a;rgb=rgb*1.14;rgb=(rgb-vec3f(.5))*1.1+vec3f(.5);
 let l=dot(rgb,vec3f(.2126,.7152,.0722));rgb=mix(vec3f(l),rgb,1.12);
 return vec4f(clamp(rgb,vec3f(0),vec3f(1))*c.a,c.a);
}
fn feather(x:f32)->f32{
 if(x<0.0||x>1.0){return 0.0;}
 if(x<.3){return x/.3*.8;}if(x<.5){return .8+(x-.3);}
 if(x<.7){return 1.0-(x-.5);}return (1.0-x)/.3*.8;
}
fn maskAt(uv:vec2f)->f32{
 // v749 sourceOffsetY argument is unused by its Canvas helper. Keep bands fixed.
 let q=uv-vec2f(.5);
 var alpha=0.0;
 for(var i=0;i<6;i=i+1){
  let fi=f32(i);let left=-.42+fi*.14;
  if(abs(q.y)<=.42){let a=feather((q.x-left)/.095)*clamp((.28+fi*.025)*.86*3.0,0.0,1.0);alpha=a+alpha*(1.0-a);}
 }return alpha;
}
fn maskPixel(cell:vec2f)->vec4f{
 let uv=(cell+vec2f(.5))/256.0;return pixelSource(uv)*maskAt(uv);
}
fn masked(uv:vec2f)->vec4f{
 // The historical overlay was rasterized onto a 256-square mask before resizing.
 let xy=uv*256.0-vec2f(.5);let cell=floor(xy);let f=fract(xy);
 return mix(mix(maskPixel(cell),maskPixel(cell+vec2f(1,0)),f.x),mix(maskPixel(cell+vec2f(0,1)),maskPixel(cell+vec2f(1,1)),f.x),f.y);
}
fn local(pixel:vec2f)->vec2f{
 let delta=(pixel/p.vp.zw-p.world.xy)/p.world.z;let c=cos(p.state.x);let s=sin(p.state.x);
 return vec2f(c*delta.x+s*delta.y,-s*delta.x+c*delta.y)-vec2f(0,p.state.y);
}
struct Raw { @location(0) textureColor:vec4f, @location(1) glyphColor:vec4f };
@fragment fn raw(@builtin(position) pos:vec4f)->Raw{
 let q=local(pos.xy);let uv=q/p.world.w+vec2f(.5);var o:Raw;
 var color=filtered(pixelSource(uv))*.42;
 if(p.time.z<.5){color+=filtered(masked(uv));}
 o.textureColor=color*p.state.z;o.glyphColor=vec4f(0);
 if(p.time.z>.5){return o;}
 let w=p.world.w;let t=p.time.x;let phase=p.time.y+p.state.w;let strength=.86*.82;
 for(var i=0;i<5;i=i+1){
  let fi=f32(i);let seed=phase*7.13+fi*1.917;let cycle=fract(t*(.34+fi*.013)+seed);
  let angle=t*(.9+fi*.04)+seed;let x=cos(angle)*w*(.25+f32(i%2)*.06);
  let y=sin(angle)*w*(.2+f32(i%3)*.025)+(cycle-.5)*w*.24;
  let rot=angle+.78539816339;let d=q-vec2f(x,y);let c=cos(rot);let s=sin(rot);
  let v=vec2f(c*d.x+s*d.y,-s*d.x+c*d.y);let sw=max(2.0,w*(.018+f32(i%3)*.005));let sh=sw*(1.6+f32(i%2)*.7);
  let aa=max(1.0/(p.world.z*min(p.vp.z,p.vp.w)),.01);
  let cover=(1.0-smoothstep(sw*.5-aa,sw*.5+aa,abs(v.x)))*(1.0-smoothstep(sh*.5-aa,sh*.5+aa,abs(v.y)));
  let a=clamp((.16+sin(cycle*3.14159265359)*.5)*strength,0.0,.82)*cover*p.state.z;
  let col=select(vec4f(139.0/255.0,92.0/255.0,246.0/255.0,.44),vec4f(245.0/255.0,243.0/255.0,1,.54),i%2==1);
  o.glyphColor+=vec4f(col.rgb*col.a,col.a)*a;
 }return o;
}
`;
const blurShader=/* wgsl */`
struct B { sizeDirection:vec4f, sigma:vec4f };
@group(0) @binding(0) var<uniform> b:B;
@group(0) @binding(1) var src:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 var c=vec4f(0);var w=0.0;
 for(var i=-6;i<=6;i=i+1){let f=f32(i);let weight=exp(-f*f*.125);let xy=p.xy+b.sizeDirection.zw*f*.5*b.sigma.xy;
  if(all(xy>=vec2f(0))&&all(xy<b.sizeDirection.xy)){c+=textureSampleLevel(src,smp,xy/b.sizeDirection.xy,0.0)*weight;}
  w+=weight;
 }return c/w;
}`;
const finalShader=/* wgsl */`
@group(0) @binding(0) var raw:texture_2d<f32>;
@group(0) @binding(1) var aura:texture_2d<f32>;
@group(0) @binding(2) var outer:texture_2d<f32>;
@group(0) @binding(3) var combined:texture_2d<f32>;
@group(0) @binding(4) var glyph:texture_2d<f32>;
@group(0) @binding(5) var glyphBlur:texture_2d<f32>;
@group(0) @binding(6) var<uniform> offset:vec4f;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let at=vec2i(p.xy+offset.xy);let r=textureLoad(raw,at,0);let a=textureLoad(aura,at,0).a*.44;
 let o=(textureLoad(outer,at,0).a+textureLoad(combined,at,0).a*.44)*.27;
 let g=textureLoad(glyph,at,0);let gb=textureLoad(glyphBlur,at,0).a*.44;
 // Additive legacy source order; finite Gaussian replaces implementation-defined Canvas shadows.
 return r+vec4f(vec3f(139.0/255.0,92.0/255.0,246.0/255.0)*a,a)+
  vec4f(vec3f(34.0/255.0,211.0/255.0,238.0/255.0)*o,o)+g+
  vec4f(vec3f(139.0/255.0,92.0/255.0,246.0/255.0)*gb,gb);
}`;
// Internal texture-only scissors. Public support, glyph/AA and final remain full MAIN.
// The radius encloses the texture square and its pre-rotation offset. For normal
// f32 ranges, 1% inverse-rotation allowance plus8 physical pixels covers arithmetic
// and WGSL's sin/cos error bound. Unsupported ranges fall back to full backing.
function textureScissor(values,width,height){
 const full=()=>[0,0,width,height],dx=values[2],dy=values[3],z=values[6],size=values[7],rot=values[8],off=values[9];
 if(![...values,width,height].every(finite)||width<=0||height<=0||width>8192||height>8192||dx<.5||dx>4||dy<.5||dy>4||z<.125||z>8||size<=0||Math.abs(rot)>Math.PI)return full();
 const cx=values[4]*dx,cy=values[5]*dy,r=(size/Math.SQRT2+Math.abs(off))*1.01,rx=r*z*dx+8,ry=r*z*dy+8;
 if(![cx,cy,rx,ry].every(finite)||Math.max(Math.abs(cx),Math.abs(cy),rx,ry)>32768)return full();
 const x=Math.max(0,Math.min(width,Math.floor(cx-rx))),y=Math.max(0,Math.min(height,Math.floor(cy-ry))),right=Math.max(0,Math.min(width,Math.ceil(cx+rx))),bottom=Math.max(0,Math.min(height,Math.ceil(cy+ry)));
 return [x,y,Math.max(0,right-x),Math.max(0,bottom-y)];
}
function expandScissor(rect,x,y,width,height){
 if(![x,y].every(finite)||x<0||y<0)return [0,0,width,height];
 if(!rect[2]||!rect[3])return [0,0,0,0];
 const left=Math.max(0,rect[0]-x),top=Math.max(0,rect[1]-y),right=Math.min(width,rect[0]+rect[2]+x),bottom=Math.min(height,rect[1]+rect[3]+y);
 return [left,top,Math.max(0,right-left),Math.max(0,bottom-top)];
}
function create({frameOwner}={}){
 if(frameOwner?.state!=='ready'||!frameOwner.device?.createTexture||!frameOwner.own||!frameOwner.release)throw new TypeError('Legacy teleport needs shared frame owner');
 const device=frameOwner.device,format=frameOwner.format,owned=[],slots=[],indices=new WeakMap();let destroyed=false,material=null,scratch=null;
 const own=x=>{frameOwner.own(x);owned.push(x);return x;};
 const release=x=>{const i=owned.indexOf(x);if(i>=0)owned.splice(i,1);if(frameOwner.release(x))x.destroy();};
 const rawModule=device.createShaderModule({label:'DVA legacy teleport raw v749',code:shader});
 const rawPipe=device.createRenderPipeline({layout:'auto',vertex:{module:rawModule,entryPoint:'vs'},fragment:{module:rawModule,entryPoint:'raw',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
 const blurModule=device.createShaderModule({label:'DVA finite legacy Gaussian',code:blurShader});
 const blurPipe=device.createRenderPipeline({layout:'auto',vertex:{module:blurModule,entryPoint:'vs'},fragment:{module:blurModule,entryPoint:'fs',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
 const finalModule=device.createShaderModule({label:'DVA legacy teleport composition',code:finalShader});
 const finalPipe=device.createRenderPipeline({layout:'auto',vertex:{module:finalModule,entryPoint:'vs'},fragment:{module:finalModule,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 const sampler=device.createSampler({magFilter:'linear',minFilter:'linear'});
 function prepare({source,generation}={}){
  if(destroyed||frameOwner.state!=='ready')throw new Error('Legacy teleport unavailable');
  if(!Number.isSafeInteger(generation)||generation<0||!source?.complete||source.naturalWidth!==SOURCE.width||source.naturalHeight!==SOURCE.height)throw new Error('Legacy teleport original image pending or invalid');
  if(material?.source===source&&material.generation===generation)return material;
  if(material)release(material.texture);
  const texture=own(device.createTexture({label:'DVA original teleport v311',size:[SOURCE.width,SOURCE.height],format:'rgba8unorm',usage:0x02|0x04|0x10}));
  try{device.queue.copyExternalImageToTexture({source},{texture,premultipliedAlpha:true},[SOURCE.width,SOURCE.height]);}
  catch(e){release(texture);material=null;throw e;}
  material=Object.freeze({source,generation,texture,device});return material;
 }
 function allocate(index,viewport){
  const padX=Math.ceil(PAD_LOGICAL*viewport.pixelWidth/viewport.width),padY=Math.ceil(PAD_LOGICAL*viewport.pixelHeight/viewport.height);
  const width=viewport.pixelWidth+padX*2,height=viewport.pixelHeight+padY*2;
  if(width>(device.limits?.maxTextureDimension2D||8192)||height>(device.limits?.maxTextureDimension2D||8192))throw new RangeError("Legacy teleport padded viewport exceeds shared device limits");
  let row=slots[index];if(row&&row.width===viewport.pixelWidth&&row.height===viewport.pixelHeight&&row.textures===scratch?.textures)return row;
  if(row)for(const x of row.resources)release(x);
  const resources=[],o=x=>{resources.push(own(x));return x;};
  if(!scratch||scratch.width!==width||scratch.height!==height){
   if(scratch)for(const x of scratch.textures)release(x);
   scratch={width,height,textures:Array.from({length:7},(_,i)=>own(device.createTexture({label:`DVA legacy teleport shared scratch ${i}`,size:[width,height],format:'rgba16float',usage:0x04|0x10})))};
  }
  const textures=scratch.textures;
  const uniform=o(device.createBuffer({size:64,usage:0x40|0x08}));
  const finalOffset=o(device.createBuffer({size:16,usage:0x40|0x08}));
  const blurBuffers=Array.from({length:8},()=>o(device.createBuffer({size:32,usage:0x40|0x08})));
  row={width:viewport.pixelWidth,height:viewport.pixelHeight,resources,textures,uniform,blurBuffers,finalOffset,padX,padY,backingWidth:width,backingHeight:height};slots[index]=row;return row;
 }
 function record({frame,target,viewport,planned,prepared}={}){
  if(destroyed||frameOwner.state!=='ready'||!frame?.addEncoder||!frame?.stage||!target)throw new Error('Legacy teleport current shared frame required');
  const bounds=support(viewport);
  if(!planned||planned.type!=='action-teleport'||planned.source!==SOURCE||planned.support.width!==bounds.width||planned.support.height!==bounds.height||planned.layers?.length!==2||prepared!==material||prepared?.device!==device)throw new Error('Legacy teleport current exact plan and source required');
  for(const layer of planned.layers){
   if(!(layer.values instanceof Float32Array)||layer.values.length!==16||!layer.values.every(finite)||layer.values[0]!==bounds.width||layer.values[1]!==bounds.height)throw new Error('Legacy teleport invalid layer');
   const index=indices.get(frame)||0,row=allocate(index,viewport);indices.set(frame,index+1);
   const tex=row.textures.map(t=>t.createView());
   const values=new Float32Array(layer.values);values[0]=row.backingWidth;values[1]=row.backingHeight;values[4]+=row.padX/values[2];values[5]+=row.padY/values[3];
   device.queue.writeBuffer(row.uniform,0,values);device.queue.writeBuffer(row.finalOffset,0,new Float32Array([row.padX,row.padY,0,0]));
   const rawGroup=device.createBindGroup({layout:rawPipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:row.uniform}},{binding:1,resource:prepared.texture.createView()},{binding:2,resource:sampler}]});
   const sigmas=[layer.auraSigma,layer.outerSigma,Math.hypot(layer.auraSigma,layer.outerSigma),layer.glyphSigma];
   const blurred=[2,3,4,5];const jobs=[],textureClip=textureScissor(values,row.backingWidth,row.backingHeight);
   sigmas.forEach((sigma,j)=>{let horizontalClip=null;for(let axis=0;axis<2;axis++){
    const buffer=row.blurBuffers[j*2+axis],blurValues=new Float32Array([row.backingWidth,row.backingHeight,axis===0?1:0,axis===1?1:0,sigma*viewport.pixelWidth/viewport.width,sigma*viewport.pixelHeight/viewport.height,0,0]);device.queue.writeBuffer(buffer,0,blurValues);
    const clip=j===3?null:axis===0?expandScissor(textureClip,Math.ceil(3*Math.abs(blurValues[4]))+2,2,row.backingWidth,row.backingHeight):expandScissor(horizontalClip,2,Math.ceil(3*Math.abs(blurValues[5]))+2,row.backingWidth,row.backingHeight);if(axis===0)horizontalClip=clip;
    const source=axis===0?(j===3?tex[1]:tex[0]):tex[6];const dest=axis===0?tex[6]:tex[blurred[j]];
    const group=device.createBindGroup({layout:blurPipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:source},{binding:2,resource:sampler}]});jobs.push({group,dest,clip});
   }});
   const finalGroup=device.createBindGroup({layout:finalPipe.getBindGroupLayout(0),entries:[...[0,2,3,4,1,5].map((n,binding)=>({binding,resource:tex[n]})),{binding:6,resource:{buffer:row.finalOffset}}]});
   frame.stage(`world:legacy-teleport:${planned.effectId}:${layer.layer}`);
   frame.addEncoder({label:`DVA legacy teleport ${planned.effectId}/${layer.layer}`,reads:[],writes:[target],encode(encoder,info){
    if(info.device!==device||info.format!==format||info.size(target).width!==bounds.width||info.size(target).height!==bounds.height)throw new Error('Legacy teleport stale target');
    const draw=(pipeline,group,attachments,label,clip=null)=>{const pass=encoder.beginRenderPass({label,colorAttachments:attachments});try{pass.setPipeline(pipeline);pass.setBindGroup(0,group);if(clip)pass.setScissorRect(...clip);pass.draw(3);}finally{pass.end();}};
    const clear=view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}});
    draw(rawPipe,rawGroup,[clear(tex[0]),clear(tex[1])],'Legacy teleport source + glyph');
    for(const job of jobs)draw(blurPipe,job.group,[clear(job.dest)],'Legacy finite Gaussian',job.clip);
    draw(finalPipe,finalGroup,[{view:info.view(target),loadOp:'load',storeOp:'store'}],'Legacy teleport additive');
   }});
  }
  return Object.freeze({effectId:planned.effectId,type:planned.type,variant:planned.variant,drawn:true,support:bounds});
 }
 return Object.freeze({device,plan,prepare,record,destroy(){if(destroyed)return;destroyed=true;for(const x of [...owned])release(x);slots.length=0;material=null;scratch=null;}});
}
const api=Object.freeze({SOURCE,PAD_LOGICAL,support,plan,create,shader,blurShader,finalShader});root.DvaWebGPULegacyTeleportE=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
