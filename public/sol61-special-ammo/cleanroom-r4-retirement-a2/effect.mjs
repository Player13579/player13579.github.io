export const VERSION_ID='special-ammo-cleanroom-sol61-r4';
export const DURATION_MS=1450,SFX_OFFSET_MS=0,SFX_DURATION_MS=600,UNIFORM_FLOATS=16;
const stages=['load','shot','contact'],ammoKinds=['weak','penetrate','shock'],weapons=['handgun','smg','assault','sniper','taser'];
export const VARIANTS=Object.freeze(stages.flatMap((stage,s)=>ammoKinds.map((ammo,a)=>Object.freeze({id:stage+':'+ammo,stage,ammo,index:s*3+a,durationMs:[1450,620,1050][s],sfxDurationMs:[600,320,480][s]}))));
function profile(i){if(!Number.isInteger(i)||i<0||i>8)throw RangeError('variantIndex');return VARIANTS[i]}
export function durationForVariant(i=0){return profile(i).durationMs}
export function sfxDurationForVariant(i=0){return profile(i).sfxDurationMs}
export function phaseAt(age,i=0){const d=durationForVariant(i);if(!Number.isFinite(age)||age<0||age>=d)return 'off';return age<d*.22?'engage':age<d*.65?'material':'release'}
const admitted=new WeakSet(),finite=Number.isFinite,pair=v=>Array.isArray(v)&&v.length===2&&v.every(finite);
export function createReceiptClock(){
 const records=new Map();let closed=false;
 return {admit(receipt,{receivedAtMs,visibleEligible}={}){
  if(closed)throw Error('clock disposed');
  if(visibleEligible!==true||!receipt||!finite(receivedAtMs)||receivedAtMs<0||receivedAtMs>=1e12)return null;
  const eventStage={'action-special-ammo-load':0,'action-special-ammo-shot':1,'action-special-ammo-impact':2}[receipt.type];
  if(eventStage===undefined||!(typeof receipt.id==='string'&&receipt.id.length>0||finite(receipt.id)&&Number.isInteger(receipt.id))||typeof receipt.playerId!=='string'||!receipt.playerId||![receipt.x,receipt.y].every(finite)||typeof receipt.variant!=='string')return null;
  const split=receipt.variant.indexOf(':'),kind=receipt.variant.slice(0,split),suffix=receipt.variant.slice(split+1),a=ammoKinds.indexOf(kind);
  if(split<0||a<0||!suffix||eventStage<2&&!weapons.includes(suffix))return null;
  if(eventStage===1&&![receipt.targetX,receipt.targetY].every(finite))return null;
  const key=typeof receipt.id+':'+receipt.id;
  if(records.has(key)){const old=records.get(key);const m=old.metadata;if(m.type!==receipt.type||m.variant!==receipt.variant||m.playerId!==receipt.playerId||m.x!==receipt.x||m.y!==receipt.y||m.targetX!==(finite(receipt.targetX)?receipt.targetX:null)||m.targetY!==(finite(receipt.targetY)?receipt.targetY:null)||m.targetId!==(typeof receipt.targetId==='string'?receipt.targetId:null))return null;return old;}
  if(records.size>=4096)throw RangeError('receipt clock capacity; create a new bounded session');
  const metadata=Object.freeze({id:receipt.id,type:receipt.type,variant:receipt.variant,playerId:receipt.playerId,targetId:typeof receipt.targetId==='string'?receipt.targetId:null,x:receipt.x,y:receipt.y,targetX:finite(receipt.targetX)?receipt.targetX:null,targetY:finite(receipt.targetY)?receipt.targetY:null,serverAt:finite(receipt.at)?receipt.at:null});
  const packet=Object.freeze({causalId:key,receivedAtMs,variantIndex:eventStage*3+a,metadata});records.set(key,packet);admitted.add(packet);return packet;
 },dispose(){if(closed)return;closed=true;for(const packet of records.values())admitted.delete(packet);records.clear()},get size(){return records.size}};
}
export function frameState(input={}){
 const {width,height,dpr=1,nowMs,packet,sourceCenterCss,endpointCss,actorCenterCss,actorHeightCss=64}=input;
 if(![width,height,dpr,nowMs,actorHeightCss].every(finite)||width<=0||height<=0||width>32768||height>32768||dpr<=0||dpr>8||nowMs<0||nowMs>=1e12||actorHeightCss<=0||actorHeightCss>2048||!pair(actorCenterCss)||!pair(sourceCenterCss))throw RangeError('finite monotonic/viewport/CSS coordinates');
 const valid=!!packet&&admitted.has(packet),i=valid?packet.variantIndex:0,p=profile(i),stage=Math.floor(i/3);
 if(valid&&stage===1&&!pair(endpointCss))throw RangeError('shot endpointCss is required and separately bound');
 const end=valid&&stage===1?endpointCss:sourceCenterCss;
 const age=valid?nowMs-packet.receivedAtMs:0,gate=valid&&age>=0&&age<p.durationMs&&input.sourceOn!==false&&input.mainOn!==false;
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0)+(valid&&packet.metadata.variant==='shock:shockSlowed'?8:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(p.durationMs,age))/1000,...sourceCenterCss,64,+gate,...end,stage,i%3,...actorCenterCss,actorHeightCss,flags]);
 if(![...uniforms].every(finite))throw RangeError('Float32 overflow');
 return {uniforms,active:!!gate,phase:gate?phaseAt(age,i):'off',variantIndex:i,ageMs:age,causalId:valid?packet.causalId:null,bodyResponse:false};
}
export const WGSL=`
struct Params { viewport:vec4f, source:vec4f, endpoint:vec4f, actor:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
override ENCODE_TARGET:bool=false;
override ACTOR_ASPECT:f32=.6036036;
struct VOut { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(pts[i],0,1);return o;}
fn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}
fn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-.055,c*12.92,c<=vec3f(.0031308));}
fn box(p:vec2f,halfsize:vec2f)->f32 {let q=abs(p)-halfsize;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0);}
fn coverage(d:f32)->f32{return 1.0-smoothstep(-.6,.9,d);}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32 {let q=p-a;let d=b-a;return length(q-d*clamp(dot(q,d)/dot(d,d),0.0,1.0));}
fn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.0-a.a);}

fn sdBox3(p:vec3f,b:vec3f,r:f32)->f32 {let q=abs(p)-b+vec3f(r);return length(max(q,vec3f(0)))+min(max(q.x,max(q.y,q.z)),0.0)-r;}
fn capsule3(p:vec3f,a:vec3f,b:vec3f,r:f32)->f32 {let d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.0,1.0))-r;}
fn bendAmount(t:f32,reduced:bool)->f32 {return select(4.5*sin(t*3.14159265)*(1.0-t*.45),0.0,reduced);}
fn localSolid(p:vec3f,kind:u32,t:f32,stage:u32,reduced:bool)->f32 {
 if(kind==0u){
  // One connected plate with finite thickness. Deformation bends its midsurface, including its void walls.
  let bend=bendAmount(t,reduced);let midsurface=bend*(p.x*p.x/529.0-1.0);
  let w=vec3f(p.xy,p.z-midsurface);
  var d=sdBox3(w,vec3f(23,14,1.8),.7);
  for(var j=0u;j<3u;j=j+1u){let hole=length(w.xy-vec2f((f32(j)-1.0)*13.0,0))-3.8;d=max(d,-hole);}
  return d;
 }
 if(kind==1u){
  // Tapered, finite solid wedge; rounded plane intersections form broad real bevel normals.
  let halfwidth=14.0-(clamp(p.x,-23.0,23.0)+23.0)*.22;
  let lateral=(abs(p.y)-halfwidth)/sqrt(1.0+.22*.22);
  let d=vec3f(abs(p.x)-22.0,lateral+1.0,abs(p.z)-3.4);
  return length(max(d,vec3f(0)))+min(max(d.x,max(d.y,d.z)),0.0)-1.0;
 }
 let spread=12.0+select((1.0-smoothstep(0.0,.15,t))*8.0,0.0,reduced);
 return min(sdBox3(p-vec3f(-spread,0,0),vec3f(6.5,16,3.2),1.7),sdBox3(p-vec3f(spread,0,0),vec3f(6.5,16,3.2),1.7));
}
fn gapOn(stage:u32,confirmed:bool)->bool {return stage!=2u||confirmed;}
const GAP_RADIUS:f32=.85;
fn gapPoint(i:u32,t:f32,reduced:bool)->vec3f {
 let spread=12.0+select((1.0-smoothstep(0.0,.15,t))*8.0,0.0,reduced);
 if(i==0u){return vec3f(-spread+6.5,-3,3.5);}
 if(i==1u){return vec3f(-2,4,3.5);}
 if(i==2u){return vec3f(3,-4,3.5);}
 return vec3f(spread-6.5,3,3.5);
}
fn gapShape(p:vec3f,t:f32,reduced:bool)->f32 {
 var d=1e6;
 for(var j=0u;j<3u;j=j+1u){d=min(d,capsule3(p,gapPoint(j,t,reduced),gapPoint(j+1u,t,reduced),GAP_RADIUS));}
 return d;
}
fn sceneDistance(p:vec3f,kind:u32,t:f32,stage:u32,confirmed:bool,reduced:bool)->f32 {
 var d=localSolid(p,kind,t,stage,reduced);
 if(kind==2u&&gapOn(stage,confirmed)){d=min(d,gapShape(p,t,reduced));}
 return d;
}
fn surfaceNormal(p:vec3f,kind:u32,t:f32,stage:u32,confirmed:bool,reduced:bool)->vec3f {
 let e=.06;let x=vec3f(e,0,0);let y=vec3f(0,e,0);let z=vec3f(0,0,e);
 return normalize(vec3f(sceneDistance(p+x,kind,t,stage,confirmed,reduced)-sceneDistance(p-x,kind,t,stage,confirmed,reduced),sceneDistance(p+y,kind,t,stage,confirmed,reduced)-sceneDistance(p-y,kind,t,stage,confirmed,reduced),sceneDistance(p+z,kind,t,stage,confirmed,reduced)-sceneDistance(p-z,kind,t,stage,confirmed,reduced)));
}
fn materialBRDF(n:vec3f,v:vec3f,l:vec3f,base:vec3f,metal:f32,rough:f32)->vec3f {
 let h=normalize(v+l);let nv=max(dot(n,v),.001);let nl=max(dot(n,l),0.0);let nh=max(dot(n,h),0.0);let vh=max(dot(v,h),0.0);
 let f0=mix(vec3f(.04),base,metal);let fresnel=f0+(vec3f(1)-f0)*pow(1.0-vh,5.0);
 let a2=pow(rough,4.0);let denom=nh*nh*(a2-1.0)+1.0;let distr=a2/(3.14159265*denom*denom);
 let k=(rough+1.0)*(rough+1.0)/8.0;let geom=nv/(nv*(1.0-k)+k)*nl/(nl*(1.0-k)+k);
 return ((vec3f(1)-fresnel)*base*((1.0-metal)/3.14159265)+fresnel*distr*geom/max(4.0*nv*max(nl,.001),.001))*nl;
}
// R4 integrates incoming directions, never point-area / squared-range samples.
fn firstSphere(origin:vec3f,ray:vec3f,center:vec3f,r:f32)->f32 {
 let q=origin-center;let b=dot(q,ray);let h=b*b-dot(q,q)+r*r;
 if(h<=0.0){return 1e6;}let root=sqrt(h);let near=-b-root;let far=-b+root;
 return select(select(1e6,far,far>.0001),near,near>.0001);
}
fn firstCapsule(origin:vec3f,ray:vec3f,a:vec3f,b:vec3f)->f32 {
 let ba=b-a;let oa=origin-a;let bb=dot(ba,ba);let bd=dot(ba,ray);let bo=dot(ba,oa);
 let A=bb-bd*bd;let B=bb*dot(ray,oa)-bo*bd;let C=bb*dot(oa,oa)-bo*bo-GAP_RADIUS*GAP_RADIUS*bb;
 var distance=min(firstSphere(origin,ray,a,GAP_RADIUS),firstSphere(origin,ray,b,GAP_RADIUS));
 let disc=B*B-A*C;
 if(A>.000001&&disc>=0.0){
  let root=sqrt(disc);
  for(var k=0u;k<2u;k=k+1u){let hit=(-B+select(-root,root,k==1u))/A;let axial=bo+hit*bd;
   if(hit>.0001&&axial>0.0&&axial<bb){distance=min(distance,hit);}
  }
 }
 return distance;
}
fn firstGap(origin:vec3f,ray:vec3f,t:f32,reduced:bool)->f32 {
 var nearest=1e6;
 for(var j=0u;j<3u;j=j+1u){nearest=min(nearest,firstCapsule(origin,ray,gapPoint(j,t,reduced),gapPoint(j+1u,t,reduced)));}
 return nearest;
}
fn electrodeVisible(origin:vec3f,ray:vec3f,distance:f32,t:f32,stage:u32,reduced:bool)->bool {
 var travel=.02;
 for(var j=0u;j<40u;j=j+1u){
  if(travel>=distance){return true;}
  let d=localSolid(origin+ray*travel,2u,t,stage,reduced);
  if(d<.015){return false;}travel+=max(d*.65,.03);
 }
 return travel>=distance; // Budget exhaustion is not proof of visibility.
}
fn gapRadiance(t:f32)->vec3f {return vec3f(5.5,3.9,1.25)*smoothstep(0.0,.15,t);}
fn incomingGap(origin:vec3f,ray:vec3f,t:f32,stage:u32,reduced:bool)->vec3f {
 let distance=firstGap(origin,ray,t,reduced);
 if(distance>=1e5||!electrodeVisible(origin,ray,distance,t,stage,reduced)){return vec3f(0);}
 return gapRadiance(t); // Nearest opaque capsule-union hit: no cap/joint double counting.
}
fn smithG1(cosine:f32,alpha:f32)->f32 {
 if(cosine<=0.0){return 0.0;}
 return 2.0*cosine/(cosine+sqrt(alpha*alpha+(1.0-alpha*alpha)*cosine*cosine));
}
fn schlickF(f0:vec3f,vh:f32)->vec3f {return f0+(vec3f(1)-f0)*pow(1.0-clamp(vh,0.0,1.0),5.0);}
fn sampleVNDF(view:vec3f,alpha:f32,xi:vec2f)->vec3f {
 // Spherical-cap GGX visible-normal transform; Dupuy/Benyoub2023, author reference in DESIGN.
 let stretched=normalize(vec3f(alpha*view.xy,view.z));
 let z=1.0-xi.x*(1.0+stretched.z);let phi=6.28318530718*xi.y;let r=sqrt(max(0.0,1.0-z*z));
 let halfVector=vec3f(r*cos(phi),r*sin(phi),z)+stretched;
 return normalize(vec3f(alpha*halfVector.xy,max(0.0,halfVector.z)));
}
fn gapAngularTransport(p:vec3f,n:vec3f,v:vec3f,base:vec3f,metal:f32,rough:f32,t:f32,stage:u32,reduced:bool)->vec3f {
 let helper=select(vec3f(0,0,1),vec3f(0,1,0),abs(n.z)>.95);
 let tangent=normalize(cross(helper,n));let bitangent=cross(n,tangent);
 let localView=vec3f(dot(v,tangent),dot(v,bitangent),max(dot(v,n),.0001));
 let origin=p+n*.02;let alpha=rough*rough;let f0=mix(vec3f(.04),base,metal);
 var outgoing=vec3f(0);
 // Cosine-hemisphere diffuse: each sample has geometric weight pi/32, hence total <= pi.
 for(var j=0u;j<32u;j=j+1u){
  let u1=(f32(j)+.5)/32.0;let phi=6.28318530718*fract(f32(j)*.61803398875+.37);
  let local=vec3f(sqrt(u1)*cos(phi),sqrt(u1)*sin(phi),sqrt(1.0-u1));
  let ray=tangent*local.x+bitangent*local.y+n*local.z;
  let h=normalize(v+ray);let fresnel=schlickF(f0,max(dot(v,h),0.0));
  outgoing+=incomingGap(origin,ray,t,stage,reduced)*(vec3f(1)-fresnel)*base*(1.0-metal)/32.0;
 }
 // Visible-normal specular: f*cos/pdf = Fresnel*G1(light), bounded componentwise by1.
 for(var j=0u;j<64u;j=j+1u){
  let xi=vec2f((f32(j)+.5)/64.0,fract(f32(j)*.61803398875+.13));
  let h=sampleVNDF(localView,alpha,xi);let localRay=2.0*dot(localView,h)*h-localView;
  if(localRay.z>0.0){
   let ray=tangent*localRay.x+bitangent*localRay.y+n*localRay.z;
   let fresnel=schlickF(f0,max(dot(localView,h),0.0));
   outgoing+=incomingGap(origin,ray,t,stage,reduced)*fresnel*smithG1(localRay.z,alpha)/64.0;
  }
 }
 return outgoing;
}
fn stamp(p:vec2f,kind:u32,t:f32,stage:u32,isEndpoint:bool,confirmed:bool,reduced:bool)->vec4f {
 let engage=smoothstep(0.0,.15,t);let fade=1.0-smoothstep(.64,1.0,t);let size=select(1.0,.62,isEndpoint);let q=p/size;
 if(abs(q.x)>38.0||abs(q.y)>34.0||engage*fade<=0.0){return vec4f(0);}
 // Orthographic oblique projection exposes front, bevel, void wall and finite side thickness.
 let tilt=select(.30+.15*sin(t*3.14159265),.30,reduced);let cs=cos(tilt);let sn=sin(tilt);
 let ray=vec3f(0,-sn,-cs);let origin=vec3f(q.x,q.y*cs+70.0*sn,70.0*cs-q.y*sn);
 var travel=0.0;var hit=false;var location=origin;
 for(var j=0u;j<72u;j=j+1u){location=origin+ray*travel;let d=sceneDistance(location,kind,t,stage,confirmed,reduced);if(d<.075){hit=true;break;}travel+=max(d*.60,.05);if(travel>105.0){break;}}
 if(!hit){return vec4f(0);}
 let n=surfaceNormal(location,kind,t,stage,confirmed,reduced);let view=-ray;
 var base=vec3f(.12,.42,.13);var metal=0.0;var rough=.43;
 if(kind==1u){base=select(vec3f(.30,.42,.57),vec3f(.11,.17,.25),abs(location.z)<1.0);metal=.92;rough=.27;}
 if(kind==2u){base=vec3f(.68,.36,.10);metal=.96;rough=.30;}
 let key=normalize(vec3f(-.5,-.65,1));
 var radiance=base*.09+materialBRDF(n,view,key,base,metal,rough)*vec3f(3.2,3.0,2.7);
 if(kind==2u&&gapOn(stage,confirmed)){
  let gapDistance=gapShape(location,t,reduced);
  if(gapDistance<.12){radiance=gapRadiance(t);}
  else {radiance+=gapAngularTransport(location,n,view,base,metal,rough,t,stage,reduced);}
 }
 let alpha=engage*fade;return vec4f(radiance*alpha,alpha);
}
@fragment fn fs(v:VOut)->@location(0) vec4f {
 let p=v.position.xy/u.viewport.z;let stage=u32(u.endpoint.z);let kind=u32(u.endpoint.w);let bits=u32(u.actor.w);
 let duration=select(select(1.45,.62,stage==1u),1.05,stage==2u);
 let t=clamp(u.viewport.w/duration,0.0,1.0);
 let delta=u.endpoint.xy-u.source.xy;
 let axis=select(vec2f(1,0),delta/max(length(delta),.001),stage==1u&&length(delta)>.001);
 let sideways=vec2f(-axis.y,axis.x);
 let q=p-u.source.xy;
 var effect=stamp(vec2f(dot(q,axis),dot(q,sideways)),kind,t,stage,false,(bits&8u)!=0u,(bits&4u)!=0u);
 if(stage==1u){
  let eq=p-u.endpoint.xy;
  effect=over(stamp(vec2f(dot(eq,axis),dot(eq,sideways)),kind,t,stage,true,false,(bits&4u)!=0u),effect);
 }
 effect*=u.source.w;
 let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);
 var body=vec4f(0);
 if((bits&1u)!=0u&&all(uv>=vec2f(0))&&all(uv<=vec2f(1))){let tex=textureSampleLevel(actorTex,actorSampler,uv,0.0);body=vec4f(decode(tex.rgb)*tex.a,tex.a);}
 // Receipt stamps are source-local material manifestations, never target outcome/body modulation.
 var composed=over(effect,body);
 if(ENCODE_TARGET&&composed.a>.00001){composed=vec4f(encode(composed.rgb/composed.a)*composed.a,composed.a);}
 return composed;
}
`;
export function synthesizeSfx(sampleRate=48000,variant=0){
 const p=profile(variant);if(!finite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*p.sfxDurationMs/1000)),kind=variant%3,stage=Math.floor(variant/3),duration=p.sfxDurationMs/1000;let seed=0x13d5f791+variant;
 for(let i=0;i<out.length;i++){const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/4294967296*2-1,env=Math.sin(Math.PI*t/duration)**1.1*Math.exp(-t*(3+stage*2));
 const weak=Math.sin(2*Math.PI*348*t)*.55*Math.exp(-t*8)+Math.sin(2*Math.PI*615*t)*.22*Math.exp(-t*12)+n*.17*Math.exp(-t*20);
 const penetrate=Math.sin(2*Math.PI*410*t)*Math.exp(-t*5)+Math.sin(2*Math.PI*713*t)*.25;
 const shock=(Math.sin(2*Math.PI*96*t)+Math.sin(2*Math.PI*193*t)*.3)*.5+n*.12*Math.exp(-t*12);
 out[i]=.32*env*[weak,penetrate,shock][kind];}return out;
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||!finite(actorAspect)||actorAspect<=0)throw TypeError('device/texture/aspect');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw RangeError('format');
 const diagnostics={status:'PENDING',messages:[],error:null},shader=device.createShaderModule({code:WGSL,label:VERSION_ID});
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{diagnostics.messages=info.messages.map(m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos}));diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'ERROR':'COMPLETE';return diagnostics},err=>{diagnostics.status='ERROR';diagnostics.error=String(err);return diagnostics});
 const buffer=device.createBuffer({size:64,usage:72,label:VERSION_ID+' uniform'});let pipeline,bind;
 try{pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',constants:{ACTOR_ASPECT:actorAspect,ENCODE_TARGET:!format.endsWith('-srgb')&&format!=='rgba16float'},targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]})}catch(e){buffer.destroy();throw e}
 let closed=false,disposal;
 function render(input){if(closed)throw Error('disposed');const s=frameState(input);if(!input.encoder||!input.view)throw TypeError('encoder/view');device.queue.writeBuffer(buffer,0,s.uniforms);const p=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});p.setPipeline(pipeline);p.setBindGroup(0,bind);p.draw(3);p.end();return {passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,ageMs:s.ageMs,causalId:s.causalId,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'}}
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
