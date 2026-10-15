export const VERSION_ID='special-ammo-cleanroom-sol61-r1';
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
fn stamp(p:vec2f,kind:u32,t:f32,stage:u32,isEndpoint:bool,confirmed:bool,reduced:bool)->vec4f {
 let engage=smoothstep(0.0,.15,t);
 let fade=1.0-smoothstep(.64,1.0,t);
 let contraction=select((1.0-engage)*8.0,0.0,reduced);
 let size=select(1.0,.62,isEndpoint);
 let q=p/size;
 var color=vec3f(0);var alpha=0.0;
 if(kind==0u){
  // A continuous perforated laminate: broad face, three clean voids, no weapon fragments.
  let offset=select(contraction,0.0,stage==2u);
  let fold=abs(q.x)-offset;
  let face=box(vec2f(fold,q.y),vec2f(23.0,14.0));
  var holes=1000.0;
  for(var j=0u;j<3u;j=j+1u){holes=min(holes,length(q-vec2f((f32(j)-1.0)*13.0,0.0))-3.8);}
  let material=coverage(max(face,-holes));
  let lip=coverage(abs(face)-1.5)*.4;
  let slope=clamp((q.y+14.0)/28.0,0.0,1.0);
  color=vec3f(.18,.47,.19)*material*(.45+.55*slope)+vec3f(.65,.92,.48)*lip;
  alpha=material*.8;
 }else if(kind==1u){
  // Solid tapered plate with two broad bevels, not a traveling projectile.
  let squeeze=select(contraction*.65,0.0,stage!=0u);
  let halfwidth=14.0+squeeze-(clamp(q.x,-23.0,23.0)+23.0)*.22;
  let face=max(abs(q.x)-23.0,abs(q.y)-halfwidth);
  let material=coverage(face);
  let bevel=1.0-smoothstep(0.0,4.0,abs(face));
  let seam=coverage(abs(q.y+halfwidth*.32)-1.0)*.28;
  color=vec3f(.23,.32,.45)*material+vec3f(.74,.86,1.0)*(bevel*.5+seam);
  alpha=material*.91;
 }else{
  // Opposed electrode lobes have solid area; only known shockSlowed permits a local gap bridge.
  let separation=12.0+contraction;
  let left=box(q-vec2f(-separation,0),vec2f(6.5,16.0));
  let right=box(q-vec2f(separation,0),vec2f(6.5,16.0));
  let material=coverage(min(left,right));
  let edge=coverage(abs(min(left,right))-1.0);
  var bridge=0.0;
  if(stage!=2u||confirmed){
   let a=vec2f(-separation+6.5,-3.0);let b=vec2f(-2.0,4.0);let c=vec2f(3.0,-4.0);let d=vec2f(separation-6.5,3.0);
   bridge=coverage(min(segment(q,a,b),min(segment(q,b,c),segment(q,c,d)))-1.1)*engage;
  }
  color=vec3f(.36,.19,.055)*material+vec3f(.95,.68,.2)*edge*.5+vec3f(1.0,.91,.56)*bridge;
  alpha=max(material*.85,bridge*.9);
 }
 let scale=engage*fade;
 return vec4f(color*alpha*scale,alpha*scale);
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
