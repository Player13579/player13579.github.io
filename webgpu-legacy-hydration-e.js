/* Limited technical port of the last non-stub implementation at 741b115f.
 * NOT a new hydration design, adoption or proof of historical visible gameplay.
 * Source geometry/order/mask equations are preserved. Canvas filter/shadowBlur
 * is an explicitly finite 13-tap Gaussian compatibility approximation; native
 * compilation, pixel fidelity, visible recovery and performance are unverified.
 * No culling: the public support is the entire current MAIN viewport. */
(function(root){
'use strict';
const finite=Number.isFinite,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const SOURCE=Object.freeze({commit:'741b115f673d313f4d554285480b596a3e80d46b',
 path:'assets/generated/object-effect-stamina-v327.png',gitBlob:'780170fe0a936502926f24df997aacc96e400871',
 sha256:'fe1edee70fadc94d16ce67923edcb20542f80507db318b687a54d71b12bd377a',width:1254,height:1254});
const TARGET=Object.freeze({type:'object-mineralWaterBar',objectId:'v302-cafeteria-hydration-2',effectKind:'stamina',x:1827,y:2661});
const TARGETS=Object.freeze([TARGET,Object.freeze({type:'object-mineralWaterBar',objectId:'v302-atrium-hydration-2',effectKind:'stamina',x:2838,y:1314})]);
function targetFor(effect){return effect?TARGETS.find(target=>effect.type===target.type&&effect.objectId===target.objectId&&effect.effectKind===target.effectKind)||null:null;}
const plans=new WeakSet(),IDs=x=>(typeof x==='string'&&x.trim()!=='')||(typeof x==='number'&&finite(x));
const ease=x=>1-Math.pow(1-clamp(x),3),noise=x=>{const n=Math.sin(x*12.9898+78.233)*43758.5453;return n-Math.floor(n);};
const stale=message=>Object.assign(new Error(message),{code:'DVA_WEBGPU_STALE_SCENE'});
const incomplete=message=>Object.assign(new Error(message),{code:'DVA_WEBGPU_INCOMPLETE_SCENE'});
function supported(effect){return targetFor(effect)!==null;}
function support(v){if(v?.kind!=='main'||![v.width,v.height].every(x=>finite(x)&&x>0)||![v.pixelWidth,v.pixelHeight].every(x=>Number.isSafeInteger(x)&&x>0))throw new TypeError('Hydration needs the committed MAIN viewport');return Object.freeze({kind:'full-main-viewport',x:0,y:0,width:v.pixelWidth,height:v.pixelHeight});}
function imageStatus(image){
 if(!image)return 'missing';const src=String(image.currentSrc||image.src||'');
 if(!src)return 'no-src';if(!image.complete)return 'pending';
 if(!(image.naturalWidth>0&&image.naturalHeight>0))return 'failed';
 if(image.naturalWidth!==SOURCE.width||image.naturalHeight!==SOURCE.height)return 'dimensions';
 if(!src.split(/[?#]/)[0].endsWith(SOURCE.path))return 'source-path';return 'ready';
}
function regionFor(op,view,zoom){
 const dx=view.pixelWidth/view.width,dy=view.pixelHeight/view.height;
 let hx,hy;
 if(op.kind===2){const c=Math.cos(op.rotation),s=Math.sin(op.rotation);hx=op.size*Math.max(Math.abs(s),Math.abs(c)*.42);hy=op.size*Math.max(Math.abs(c),Math.abs(s)*.42);}
 else {hx=op.size*op.scaleX*.5;hy=op.size*op.scaleY*.5;}
 // Two independent separable stages, each with +/-3 sigma plus bilinear/AA
 // allowance. These are bounds of THIS finite shader, never legacy Canvas bounds.
 const px=Math.ceil(3*op.auraSigma*dx)+Math.ceil(3*op.shadowSigma*dx)+10;
 const py=Math.ceil(3*op.auraSigma*dy)+Math.ceil(3*op.shadowSigma*dy)+10;
 const x=Math.floor(op.cx*dx-hx*zoom*dx)-px,y=Math.floor(op.cy*dy-hy*zoom*dy)-py;
 const right=Math.ceil(op.cx*dx+hx*zoom*dx)+px,bottom=Math.ceil(op.cy*dy+hy*zoom*dy)+py;
 return Object.freeze({x,y,width:right-x,height:bottom-y});
}
function scratchSize(view,zoom){
 const dx=view.pixelWidth/view.width,dy=view.pixelHeight/view.height;
 const aura=13.83,outer=16*1.72*1.012*.72*.46*.5;
 const glyphSize=112*.053*1.2,glyphSigma=(7+glyphSize*1.4)*.5;
 const axis=d=>Math.ceil(Math.max(112*1.1*1.04*zoom*d+2*(Math.ceil(3*aura*d)+Math.ceil(3*outer*d)+12),
   2*glyphSize*zoom*d+2*(Math.ceil(3*glyphSigma*d)+12))/64)*64;
 return Object.freeze({width:axis(dx),height:axis(dy)});
}
function plan({effect,now,wallNow=now,camera,zoom,viewport,reducedMotion=false}={}){
 const bounds=support(viewport),target=targetFor(effect);
 if(!target||!IDs(effect.id)||!IDs(effect.playerId)||!Object.prototype.hasOwnProperty.call(effect,'variant')||effect.variant!==''||effect.x!==target.x||effect.y!==target.y||effect.radius!==100||
  ![effect.startedAt,effect.duration,now,wallNow,camera?.x,camera?.y,zoom].every(finite)||effect.duration<=0||zoom<=0)throw new TypeError('Hydration source invalid');
 const age=now-effect.startedAt;if(age<0||age>=effect.duration)return null;
 const p=age/effect.duration,reveal=ease(p/.28),fade=p<=.7?1:1-(()=>{const t=clamp((p-.7)/.3);return t*t*(3-2*t);})(),
  baseSize=112*(.7+reveal*.3),rise=(1-reveal)*18-p*9,
  rawTime=wallNow/1000,sampledTime=reducedMotion?0:Math.floor(rawTime*60)/60,
  appearanceTime=Math.floor(rawTime*60)/60,dx=viewport.pixelWidth/viewport.width,dy=viewport.pixelHeight/viewport.height,
  cx=(effect.x-camera.x)*zoom,cy=(effect.y-camera.y)*zoom,ops=[],layers=[];
 const strength=clamp(fade*.72,.12,1.6),pulse=reducedMotion?1:1+Math.sin(sampledTime*(2.1+.2*2.4)+p*Math.PI*2)*.2,
  auraSigma=Number(Math.max(6,16*pulse*strength).toFixed(2)),shadowSigma=Math.max(8,16*1.72*(.94+pulse*.06)*strength)*.46*.5,
  clock=sampledTime*.58+p*.9;
 const plumes=[];
 if(!reducedMotion)for(let i=0;i<3;i++){
  const travel=((clock*(.19+i*.025)+i*.31)%1+1)%1,alpha=Math.sin(travel*Math.PI)*.42;
  if(alpha<=.004)continue;
  plumes.push(Object.freeze({cx:(-.24+i*.24)+.5,cy:.24-travel*.58+travel*.035+.5,
   rx:(.16+i*.015)*.5,ry:.28*.5,alpha:clamp(alpha*fade*.72*.96)}));
 }
 function add(op){
  op=Object.freeze({...op,region:regionFor(op,viewport,zoom)});
  if(![...Object.values(op.region),op.cx,op.cy,op.size,op.alpha].every(finite)||op.region.width<1||op.region.height<1)throw new RangeError('Hydration finite plan overflow');ops.push(op);
 }
 for(let i=0;i<2;i++){
  const size=baseSize*(i===0?1.1:1),alpha=fade*(i===0?.2:.84),offsetY=rise+(i===0?7:0),
   scaleX=i===0?1.04:.96+Math.sin(p*Math.PI)*.04,scaleY=i===0?.92:.94+reveal*.06;
  const row=Object.freeze({layer:i,size,alpha,offsetY,scaleX,scaleY,auraSigma,shadowSigma,sampledTime,clock});layers.push(row);
  const common={cx,cy:cy+offsetY*zoom,size,alpha,scaleX,scaleY,rotation:0,auraSigma,shadowSigma,
   color:Object.freeze([1,1,1,1]),aura:Object.freeze([74/255,222/255,128/255,.42]),shadow:Object.freeze([250/255,204/255,21/255,.24])};
  if(alpha>0){add({...common,kind:0,blend:'screen',layer:i});if(!reducedMotion&&fade*.72*.82>.001)add({...common,kind:1,blend:'lighter',layer:i});}
 }
 const shards=[];
 if(p<.68){
  const appearanceAlpha=ease(p/.12)*(1-ease(Math.max(0,p-.4)/.28));
  const effectSeed=[...`${effect.type}:${effect.effectKind}:${Math.round(effect.x)}:${Math.round(effect.y)}`].reduce((sum,c,i)=>sum+c.charCodeAt(0)*(i+3),0);
  const palette=[[52/255,211/255,153/255,1],[167/255,243/255,208/255,1],[253/255,224/255,71/255,1],[1,1,1,1]];
  for(let i=0;i<13;i++){
   const seed=effectSeed+i*17.37,a=noise(seed),b=noise(seed+9.71),delay=i%5*.018;if(p<delay)continue;
   const local=clamp((p-delay)/Math.max(.2,.62-delay)),life=Math.sin(local*Math.PI),
    x=(a-.5)*baseSize*.66+Math.sin(appearanceTime*3+seed)*baseSize*.035,y=baseSize*.35-local*baseSize*(.58+b*.18),
    rotation=(a*Math.PI*2+appearanceTime*(.7+b*1.1))*.45,size=baseSize*(.025+b*.028)*(.78+life*.42),
    alpha=clamp(appearanceAlpha*(.34+life*.66),0,.9);
   const shard=Object.freeze({index:i,x,y,size,rotation,alpha,shadowBlur:7+size*1.4,color:Object.freeze(palette[i%4])});shards.push(shard);
   if(alpha>0)add({kind:2,blend:'lighter',layer:2,cx:cx+x*zoom,cy:cy+y*zoom,size,rotation,alpha,scaleX:1,scaleY:1,
    color:shard.color,aura:Object.freeze([0,0,0,0]),shadow:shard.color,auraSigma:0,shadowSigma:shard.shadowBlur*.5});
  }
 }
 const size=scratchSize(viewport,zoom);
 if(ops.some(op=>op.region.width>size.width||op.region.height>size.height))throw new RangeError('Hydration finite sampling footprint exceeds declared scratch');
 const result=Object.freeze({effectId:String(effect.id),type:effect.type,objectId:effect.objectId,effectKind:effect.effectKind,
  variant:'',progress:p,duration:effect.duration,now,wallNow,zoom,support:bounds,viewport:Object.freeze({kind:'main',width:viewport.width,height:viewport.height,pixelWidth:viewport.pixelWidth,pixelHeight:viewport.pixelHeight}),
  source:SOURCE,layers:Object.freeze(layers),plumes:Object.freeze(plumes),shards:Object.freeze(shards),operations:Object.freeze(ops),scratch:size,dx,dy,reducedMotion:!!reducedMotion});
 plans.add(result);return result;
}
const rawShader=/* wgsl */`
struct P{rect:vec4f,vp:vec4f,center:vec4f,geom:vec4f,color:vec4f,aura:vec4f,shadow:vec4f,state:vec4f,plume:array<vec4f,3>,pa:vec4f};
@group(0) @binding(0) var<uniform> p:P;
@group(0) @binding(1) var image:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);}
fn imageAt(uv:vec2f)->vec4f{if(any(uv<vec2f(0))||any(uv>vec2f(1))){return vec4f(0);}return textureSampleLevel(image,smp,uv,0.0);}
fn maskCell(cell:vec2f)->vec4f{
 if(any(cell<vec2f(0))||any(cell>=vec2f(256))){return vec4f(0);}
 let uv=(cell+vec2f(.5))/256.0;var a=0.0;
 for(var i=0;i<3;i=i+1){let plume=p.plume[i];if(plume.z<=0.0||plume.w<=0.0){continue;}
  let d=(uv-plume.xy)/plume.zw;let r=length(d);var f=0.0;
  if(all(abs(d)<=vec2f(1))&&r<1.0){if(r<.45){f=1.0-r*.2/.45;}else{f=(1.0-r)*.8/.55;}}
  let s=f*p.pa[i];a=s+a*(1.0-s);
 }return imageAt(uv)*a;
}
@fragment fn fs(@builtin(position) at:vec4f)->@location(0) vec4f{
 let d=(at.xy-p.center.xy)/p.center.zw;let c=cos(p.geom.w);let s=sin(p.geom.w);
 let q=vec2f(c*d.x+s*d.y,-s*d.x+c*d.y);
 if(p.state.y>1.5){let distance=abs(q.x)/(p.geom.x*.42)+abs(q.y)/p.geom.x;let aa=max(fwidth(distance),.00001);let a=1.0-smoothstep(1.0-aa*.5,1.0+aa*.5,distance);return vec4f(p.color.rgb*p.color.a,p.color.a)*a;}
 let uv=q/(p.geom.x*p.geom.yz)+vec2f(.5);
 if(p.state.y<.5){return imageAt(uv);}
 let xy=uv*256.0-vec2f(.5);let cell=floor(xy);let f=fract(xy);
 return mix(mix(maskCell(cell),maskCell(cell+vec2f(1,0)),f.x),mix(maskCell(cell+vec2f(0,1)),maskCell(cell+vec2f(1,1)),f.x),f.y);
}`;
const blurShader=/* wgsl */`
struct B{sizeDirection:vec4f,sigma:vec4f};
@group(0) @binding(0) var<uniform> b:B;
@group(0) @binding(1) var image:texture_2d<f32>;
@group(0) @binding(2) var smp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);}
@fragment fn fs(@builtin(position) at:vec4f)->@location(0) vec4f{
 var c=vec4f(0);var total=0.0;
 for(var i=-6;i<=6;i=i+1){let n=f32(i);let w=exp(-n*n*.125);let q=at.xy+b.sizeDirection.zw*n*.5*b.sigma.xy;
  if(all(q>=vec2f(0))&&all(q<b.sigma.zw)){c+=textureSampleLevel(image,smp,q/b.sizeDirection.xy,0.0)*w;}total+=w;
 }return c/total;
}`;
const composeShader=/* wgsl */`
struct P{rect:vec4f,vp:vec4f,center:vec4f,geom:vec4f,color:vec4f,aura:vec4f,shadow:vec4f,state:vec4f,plume:array<vec4f,3>,pa:vec4f};
@group(0) @binding(0) var raw:texture_2d<f32>;
@group(0) @binding(1) var aura:texture_2d<f32>;
@group(0) @binding(2) var outer:texture_2d<f32>;
@group(0) @binding(3) var<uniform> p:P;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);}
@fragment fn filtered(@builtin(position) at:vec4f)->@location(0) vec4f{
 let r=textureLoad(raw,vec2i(at.xy),0);if(p.aura.a<=0.0){return r;}
 let a=textureLoad(aura,vec2i(at.xy),0).a*p.aura.a;return r+vec4f(p.aura.rgb*a,a)*(1.0-r.a);
}
struct V{@builtin(position) position:vec4f,@location(0) uv:vec2f};
@vertex fn finalVs(@builtin(vertex_index) i:u32)->V{
 let v=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));let q=v[i];var o:V;
 let at=p.rect.xy+q*p.rect.zw;o.position=vec4f(at.x/p.vp.x*2.0-1.0,1.0-at.y/p.vp.y*2.0,0,1);o.uv=q*p.rect.zw;return o;
}
@fragment fn finalFs(v:V)->@location(0) vec4f{
 let at=vec2i(v.uv);let r=textureLoad(raw,at,0)*p.state.x;let a=textureLoad(outer,at,0).a*p.shadow.a*p.state.x;let sh=vec4f(p.shadow.rgb*a,a);
 if(p.state.z>.5){return r+sh;}
 // Canvas paints shadow before source with the same GCO. Screen is associative
 // on premultiplied color; alpha still uses source-over, not color-screen.
 return vec4f(r.rgb+sh.rgb-r.rgb*sh.rgb,r.a+sh.a-r.a*sh.a);
}`;
// Conservative support of the CURRENT provider's final quads, not Canvas E.
// Only a bounded exact-f32 integer regime is certified. Outside it, draw all.
// For that regime, 128*2^-23*(|origin|+extent+viewport+1) bounds propagated
// f32 +/-/* and 2.5-ULP division error including reassociation; one additional
// physical pixel covers raster boundary rounding. Never infer zero from alpha.
function finalQuadSupport(planned, viewport=planned?.viewport) {
 if(!plans.has(planned)||!viewport||Object.keys(planned.viewport).some(k=>planned.viewport[k]!==viewport[k]))throw new TypeError('Hydration quad support needs exact current plan/viewport');
 const W=viewport.pixelWidth,H=viewport.pixelHeight,LIMIT=65536;
 const integer=x=>Number.isSafeInteger(x)&&Math.fround(x)===x&&Math.abs(x)<=LIMIT;
 const cuts=planned.operations.map((op,index)=>{
  const r=op.region,right=r.x+r.width,bottom=r.y+r.height;
  const certified=[r.x,r.y,r.width,r.height,right,bottom,W,H].every(integer)&&r.width>0&&r.height>0&&W>0&&H>0;
  if(!certified)return Object.freeze({index,certified:false,empty:false,guardX:null,guardY:null,clip:Object.freeze({x:0,y:0,width:W,height:H})});
  const factor=128*2**-23,guardX=Math.ceil(factor*(Math.abs(r.x)+r.width+W+1))+1,guardY=Math.ceil(factor*(Math.abs(r.y)+r.height+H+1))+1;
  const x0=clamp(r.x-guardX,0,W),y0=clamp(r.y-guardY,0,H),x1=clamp(right+guardX,0,W),y1=clamp(bottom+guardY,0,H);
  return Object.freeze({index,certified:true,empty:x1<=x0||y1<=y0,guardX,guardY,clip:Object.freeze({x:x0,y:y0,width:Math.max(0,x1-x0),height:Math.max(0,y1-y0)})});
 });
 return Object.freeze({kind:'conservative-current-final-quads',pixelWidth:W,pixelHeight:H,cuts:Object.freeze(cuts),allEmpty:cuts.every(c=>c.certified&&c.empty)});
}
function hydrationUniformValues(viewport,planned,op) {
 const r=op.region;
 const values=new Float32Array([r.x,r.y,r.width,r.height,viewport.pixelWidth,viewport.pixelHeight,planned.scratch.width,planned.scratch.height,
  op.cx*planned.dx-r.x,op.cy*planned.dy-r.y,planned.zoom*planned.dx,planned.zoom*planned.dy,op.size,op.scaleX,op.scaleY,op.rotation,
  ...op.color,...op.aura,...op.shadow,op.alpha,op.kind,op.blend==='lighter'?1:0,0,
  ...[0,1,2].flatMap(i=>{const q=planned.plumes[i];return q?[q.cx,q.cy,q.rx,q.ry]:[0,0,0,0];}),
  ...[0,1,2].map(i=>planned.plumes[i]?.alpha||0),0]);
 if(!values.every(finite)||r.width>planned.scratch.width||r.height>planned.scratch.height)throw new RangeError('Hydration uniform/footprint invalid');
 return values;
}

function create({frameOwner}={}){
 if(frameOwner?.state!=='ready'||!frameOwner.device?.createTexture||!frameOwner.own||!frameOwner.release)throw new TypeError('Hydration requires shared frame owner');
 const device=frameOwner.device,format=frameOwner.format,owned=new Set(),slots=[],frameRows=new WeakMap(),outsideReceipts=new WeakMap();
 let destroyed=false,material=null,scratch=null,pipelinePromise=null,pipes=null;
 const own=x=>{frameOwner.own(x);owned.add(x);return x;};
 function release(x){if(!owned.delete(x))return;if(frameOwner.release(x))x.destroy();}
 const current=()=>{if(destroyed||frameOwner.state!=='ready')throw new Error('Hydration shared owner unavailable');};
 async function initialize(){
  current();if(pipes)return pipes;if(pipelinePromise)return pipelinePromise;
  pipelinePromise=(async()=>{
   const raw=device.createShaderModule({label:'DVA hydration source 741b',code:rawShader}),blur=device.createShaderModule({label:'DVA hydration finite Gaussian',code:blurShader}),compose=device.createShaderModule({label:'DVA hydration composition',code:composeShader});
   for(const module of [raw,blur,compose])if(typeof module.getCompilationInfo==='function'){const info=await module.getCompilationInfo();const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(errors.map(x=>x.message).join('; '));current();}
   const build=d=>typeof device.createRenderPipelineAsync==='function'?device.createRenderPipelineAsync(d):device.createRenderPipeline(d);
   const descriptor=(module,entryPoint,format,blend,vertex='vs')=>({layout:'auto',vertex:{module,entryPoint:vertex},fragment:{module,entryPoint,targets:[{format,...(blend?{blend}:{})}]},primitive:{topology:'triangle-list'}});
   const additive={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one',operation:'add'}};
   const screen={color:{srcFactor:'one',dstFactor:'one-minus-src',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
   const result={raw:await build(descriptor(raw,'fs','rgba16float')),blur:await build(descriptor(blur,'fs','rgba16float')),filtered:await build(descriptor(compose,'filtered','rgba16float')),
    screen:await build(descriptor(compose,'finalFs',format,screen,'finalVs')),lighter:await build(descriptor(compose,'finalFs',format,additive,'finalVs')),sampler:device.createSampler({magFilter:'linear',minFilter:'linear'})};
   current();pipes=result;return result;
  })();return pipelinePromise;
 }
 async function prepare({source,generation}={}){
  current();if(!Number.isSafeInteger(generation)||generation<0)throw new TypeError('Hydration material generation invalid');
  const ensureImage=()=>{const status=imageStatus(source);if(status==='ready')return;if(['missing','no-src','pending'].includes(status))throw incomplete(`Hydration original image ${status}`);throw new TypeError(`Hydration original image invalid: ${status}`);};
  ensureImage();await initialize();current();ensureImage();
  const src=String(source.currentSrc||source.src);
  if(material?.source===source&&material.generation===generation&&material.src===src)return material;
  const texture=own(device.createTexture({label:'DVA original hydration stamina v327',size:[SOURCE.width,SOURCE.height],format:'rgba8unorm',usage:0x02|0x04|0x10}));
  try{device.queue.copyExternalImageToTexture({source},{texture,premultipliedAlpha:true,colorSpace:'srgb'},[SOURCE.width,SOURCE.height]);}catch(e){release(texture);throw e;}
  if(material)release(material.texture);material=Object.freeze({device,source,src,generation,texture});return material;
 }
 function claimFrame(frame,planned){
  const key=[planned.viewport.width,planned.viewport.height,planned.viewport.pixelWidth,planned.viewport.pixelHeight,planned.zoom].join(':');
  let row=frameRows.get(frame);if(row&&row.key!==key)throw stale('Hydration viewport/zoom changed inside shared frame');
  if(!row){row={key,index:0};frameRows.set(frame,row);}
  return row;
 }
 function allocate(frame,planned){
  const row=claimFrame(frame,planned),key=row.key;
  if(!scratch||scratch.key!==key){
   if(scratch)for(const x of scratch.textures)release(x);
   const {width,height}=planned.scratch,limit=device.limits?.maxTextureDimension2D||8192;
   if(width>limit||height>limit)throw new RangeError('Hydration finite scratch exceeds shared device limit');
   const textures=[];try{for(let i=0;i<5;i++)textures.push(own(device.createTexture({label:`DVA hydration shared scratch ${i}`,size:[width,height],format:'rgba16float',usage:0x04|0x10})));}catch(e){for(const x of textures)release(x);throw e;}
   scratch={key,width,height,textures};
  }
  return row;
 }
 function validOutsideOutcome(outcome,{frame,target,viewport,planned,prepared}={}) {
  const row=outsideReceipts.get(outcome);
  return !!row&&!destroyed&&frameOwner.state==='ready'&&row.frame===frame&&row.target===target&&row.planned===planned&&row.prepared===prepared&&
   prepared===material&&prepared.device===device&&imageStatus(prepared.source)==='ready'&&String(prepared.source.currentSrc||prepared.source.src)===prepared.src&&
   plans.has(planned)&&Object.keys(planned.viewport).every(k=>planned.viewport[k]===viewport?.[k])&&
   outcome.proof===row.support&&row.support.allEmpty===true&&outcome.drawn===false&&outcome.nonvisual===true&&row.phase!=='failed';
 }
 function outsideStatus(outcome) {
  const row=outsideReceipts.get(outcome);
  if(!row)return null;
  const retired=destroyed||frameOwner.state!=='ready';
  return Object.freeze({phase:retired?'retired':row.phase,frameId:row.frameId??null,error:row.error??(retired?'Shared owner unavailable':null),nonvisual:true,gpuDraw:false,submissionObserved:false,gpuCompletionObserved:false});
 }
 function recordOutside({frame,target,viewport,planned,prepared,bounds,support}) {
  const outcome=Object.freeze({effectId:planned.effectId,type:planned.type,objectId:planned.objectId,effectKind:planned.effectKind,drawn:false,nonvisual:true,
   reason:'legacy-hydration-outside-current-final-quads',operations:0,support:bounds,proof:support});
  const row={frame,target,planned,prepared,support,phase:'queued',frameId:null,encoder:null,error:null};outsideReceipts.set(outcome,row);
  const failed=e=>{row.phase='failed';row.error=String(e?.message||e||'Hydration no-draw proof unavailable');};
  frame.stage(`world:legacy-hydration-outside:${planned.effectId}`);
  frame.addEncoder({label:`DVA hydration outside validation ${planned.effectId}`,reads:[],writes:[target],encode(encoder,info){
   if(!validOutsideOutcome(outcome,{frame,target,viewport,planned,prepared}))throw stale('Hydration outside ownership changed before encode');
   if(info.device!==device||info.format!==format||info.size(target).width!==bounds.width||info.size(target).height!==bounds.height)throw stale('Hydration shared target changed');
   if(!Number.isSafeInteger(info.frameId)||info.frameId<1||info.encoder!==encoder)throw new TypeError('Hydration outside needs exact shared encoder identity');
   row.frameId=info.frameId;row.encoder=encoder;row.phase='encoded-nonvisual';
  },onAbandon:()=>failed('Hydration outside frame abandoned')});
  return outcome;
 }

 function record({frame,target,viewport,planned,prepared}={}){
  current();const bounds=support(viewport);
  if(!frame?.addEncoder||!frame?.stage||!target||!plans.has(planned)||planned.source!==SOURCE||!pipes||prepared!==material||prepared?.device!==device||
   Object.keys(planned.viewport).some(k=>planned.viewport[k]!==viewport[k]))throw new TypeError('Hydration requires exact current shared plan/material/viewport');
  const status=imageStatus(prepared.source);if(['missing','no-src','pending'].includes(status))throw incomplete('Hydration source became pending after prepare');
  if(status!=='ready'||String(prepared.source.currentSrc||prepared.source.src)!==prepared.src)throw new TypeError('Hydration source invalid or changed after prepare');
  claimFrame(frame,planned);
  const limit=device.limits?.maxTextureDimension2D||8192;
  if(planned.scratch.width>limit||planned.scratch.height>limit)throw new RangeError('Hydration finite scratch exceeds shared device limit');
  const uniforms=planned.operations.map(op=>hydrationUniformValues(viewport,planned,op)),quadSupport=finalQuadSupport(planned,viewport);
  if(quadSupport.allEmpty)return recordOutside({frame,target,viewport,planned,prepared,bounds,support:quadSupport});
  const row=allocate(frame,planned),tex=scratch.textures.map(x=>x.createView()),scratchWidth=scratch.width,scratchHeight=scratch.height;
  for(const [opIndex,op] of planned.operations.entries()){
   const index=row.index++;let slot=slots[index];
   if(!slot){const resources=[];try{const buffer=own(device.createBuffer({size:192,usage:0x40|0x08}));resources.push(buffer);const blurBuffers=[];for(let i=0;i<4;i++){const b=own(device.createBuffer({size:32,usage:0x40|0x08}));blurBuffers.push(b);resources.push(b);}slot={buffer,blurBuffers};slots[index]=slot;}catch(e){for(const x of resources)release(x);throw e;}}
   const r=op.region,values=uniforms[opIndex];
   device.queue.writeBuffer(slot.buffer,0,values);
   const rawGroup=device.createBindGroup({layout:pipes.raw.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:slot.buffer}},{binding:1,resource:prepared.texture.createView()},{binding:2,resource:pipes.sampler}]});
   const jobs=[];
   for(const [job,sigma] of [[0,op.auraSigma],[1,op.shadowSigma]]){
    if(job===0&&sigma===0)continue;
    for(let axis=0;axis<2;axis++){
     const b=slot.blurBuffers[job*2+axis],v=new Float32Array([scratchWidth,scratchHeight,axis===0?1:0,axis===1?1:0,sigma*planned.dx,sigma*planned.dy,r.width,r.height]);device.queue.writeBuffer(b,0,v);
     const source=axis===0?(job===0?tex[0]:tex[3]):tex[1],dest=axis===0?tex[1]:job===0?tex[2]:tex[4];
     const group=device.createBindGroup({layout:pipes.blur.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:b}},{binding:1,resource:source},{binding:2,resource:pipes.sampler}]});jobs.push({job,group,dest});
    }
   }
   const filtered=device.createBindGroup({layout:pipes.filtered.getBindGroupLayout(0),entries:[{binding:0,resource:tex[0]},{binding:1,resource:tex[2]},{binding:3,resource:{buffer:slot.buffer}}]});
   const finalPipe=pipes[op.blend],final=device.createBindGroup({layout:finalPipe.getBindGroupLayout(0),entries:[{binding:0,resource:tex[3]},{binding:2,resource:tex[4]},{binding:3,resource:{buffer:slot.buffer}}]});
   frame.stage(`world:legacy-hydration:${planned.effectId}:${index}`);
   frame.addEncoder({label:`DVA hydration ${planned.effectId}/${index}`,reads:[],writes:[target],encode(encoder,info){
    if(info.device!==device||info.format!==format||info.size(target).width!==bounds.width||info.size(target).height!==bounds.height)throw stale('Hydration shared target changed');
    const clear=view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}});
    const draw=(pipeline,group,attachment,label,count=3,local=true)=>{const pass=encoder.beginRenderPass({label,colorAttachments:[attachment]});try{pass.setPipeline(pipeline);pass.setBindGroup(0,group);if(local){pass.setViewport(0,0,r.width,r.height,0,1);pass.setScissorRect(0,0,r.width,r.height);}pass.draw(count);}finally{pass.end();}};
    draw(pipes.raw,rawGroup,clear(tex[0]),'Hydration raw source');
    for(const j of jobs.filter(j=>j.job===0))draw(pipes.blur,j.group,clear(j.dest),'Hydration aura finite blur');
    draw(pipes.filtered,filtered,clear(tex[3]),'Hydration filtered source');
    for(const j of jobs.filter(j=>j.job===1))draw(pipes.blur,j.group,clear(j.dest),'Hydration shadow finite blur');
    draw(finalPipe,final,{view:info.view(target),loadOp:'load',storeOp:'store'},`Hydration ${op.blend}`,6,false);
   }});
  }
  return Object.freeze({effectId:planned.effectId,type:planned.type,objectId:planned.objectId,effectKind:planned.effectKind,drawn:true,support:bounds,operations:planned.operations.length});
 }
 return Object.freeze({device,plan,prepare,record,validOutsideOutcome,outsideStatus,destroy(){if(destroyed)return;destroyed=true;const errors=[];for(const x of [...owned])try{release(x);}catch(e){errors.push(e);}slots.length=0;material=null;scratch=null;pipes=null;if(errors.length)throw new AggregateError(errors,'Hydration cleanup failed');}});
}
const api=Object.freeze({SOURCE,TARGET,TARGETS,targetFor,supported,support,imageStatus,regionFor,scratchSize,plan,finalQuadSupport,create,rawShader,blurShader,composeShader});root.DvaWebGPULegacyHydrationE=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
