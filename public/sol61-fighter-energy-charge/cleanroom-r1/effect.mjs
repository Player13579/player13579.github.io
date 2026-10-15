export const WGSL="\nstruct U { view:vec4f, actor:vec4f, gates:vec4f, state:vec4f };\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var img:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\nstruct Out { @builtin(position) p:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.p=vec4f(p[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{\n return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));\n}\nfn encode(c:vec3f)->vec3f{\n let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));\n}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn capsule(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.,1.));\n}\nfn emitter(cov:f32,col:vec3f,radiance:f32)->vec4f{\n let a=clamp(cov,0.,1.);return vec4f((vec3f(1.)-exp(-col*radiance))*a,a);\n}\nfn pulse(t:f32,a:f32,b:f32)->f32{\n let n=clamp((t-a)/(b-a),0.,1.);return sin(n*3.14159265);\n}\n@fragment fn fs(o:Out)->@location(0) vec4f{\n let css=o.p.xy/u.view.z;\n let p=css-u.actor.xy;\n let scale=u.actor.z/64.;\n let q=p/scale;\n let t=clamp(u.view.w/max(u.state.w,.001),0.,1.);\n let sourceEnabled=u.gates.x;\n let env=u.state.x*sourceEnabled;\n let variant=u.state.z;\n let aa=max(.6,.8/(u.view.z*scale));\n let transfer=select(1.-pow(1.-clamp((t-.08)/.40,0.,1.),3.),1.,u.gates.w>.5);\n let lock=smoothstep(.34,.52,t);\n let orange=vec3f(1.,.26,.045);\n let gold=vec3f(1.,.66,.13);\n let hot=vec3f(1.,.93,.65);\n var channels=0.;var broad=0.;\n // PH1: two folded finite energy conduits originate at the recipient's own flank.\n // Their bright transfer fronts physically approach the same torso accumulator.\n for(var side=-1.;side<=1.;side=side+2.){\n  let A=vec2f(side*28.,17.);\n  let B=vec2f(side*23.,-5.);\n  let C=vec2f(side*6.,-9.);\n  let d=min(capsule(q,A,B),capsule(q,B,C));\n  let throat=1.-smoothstep(1.7,1.7+aa,d);\n  let support=pulse(t,0.,.63);\n  channels=max(channels,throat*support*.65);\n  let front=mix(A,B,clamp(transfer*1.7,0.,1.));\n  let tip=mix(front,C,clamp((transfer-.58)/.42,0.,1.));\n  let df=length((q-tip)/vec2f(1.,1.8));\n  let moving=1.-smoothstep(2.3,2.3+aa,df);\n  channels=max(channels,moving*(1.-smoothstep(.44,.56,t)));\n  broad=max(broad,exp(-d*d/24.)*support*.19);\n }\n // PH1 receiver: paired wedges meet at the sternum. Added locks denote threshold receipts,\n // never a projectile, sword or victim. Plate width is finite and leaves the actor readable.\n var receiver=0.;var receiverGlow=0.;\n for(var j=0u;j<4u;j=j+1u){\n  let enabled=select(0.,1.,f32(j)<=variant);\n  let y=-8.+f32(j)*6.;\n  let width=10.+f32(j)*1.6;\n  let dl=capsule(q,vec2f(-width,y-2.),vec2f(0.,y+2.));\n  let dr=capsule(q,vec2f(0.,y+2.),vec2f(width,y-2.));\n  let d=min(dl,dr);\n  let settle=clamp((t-.30-f32(j)*.045)/.14,0.,1.);\n  let layer=enabled*settle;\n  receiver=max(receiver,(1.-smoothstep(1.9,1.9+aa,d))*layer);\n  receiverGlow=max(receiverGlow,exp(-d*d/18.)*layer*.23);\n }\n let coreColor=mix(gold,hot,lock);\n let world=emitter(channels*env*.84,orange,3.1);\n // Correct raw actor baseline, independent of source/main/observer gates.\n let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(.5);\n let tex=textureSample(img,samp,clamp(uv,vec2f(0.),vec2f(1.)));\n let inActor=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n let actorA=tex.a*inActor*u.gates.z;\n let chestFalloff=exp(-dot((q-vec2f(0.,-6.))/vec2f(14.,19.),(q-vec2f(0.,-6.))/vec2f(14.,19.)));\n // PH2 diffuse receiving response is restricted to actual actor alpha.\n let reflected=gold*env*lock*chestFalloff*.23;\n let actor=vec4f((decode(tex.rgb)+reflected)*actorA,actorA);\n var result=over(actor,world);\n // Receiver plates sit in front of the body; their central gap and shoulders stay open.\n let front=emitter(receiver*env*.82,coreColor,3.5);\n result=over(front,result);\n // Three sparse receipt glints: fixed25-degree cross topology, finite staggered contact windows.\n var spark=0.;\n let ca=.906307787; let sa=.422618262;\n for(var j=0u;j<3u;j=j+1u){\n  let pos=vec2f((f32(j)-1.)*19.,-18.+f32(j%2u)*31.);\n  let z=q-pos;\n  let v=vec2f(ca*z.x+sa*z.y,-sa*z.x+ca*z.y);\n  let a=.34+f32(j)*.07;\n  let life=pulse(t,a,a+.22);\n  let cross=min(capsule(v,vec2f(-4.8,0.),vec2f(4.8,0.)),capsule(v,vec2f(0.,-2.7),vec2f(0.,2.7)));\n  spark=max(spark,(1.-smoothstep(.72,.72+aa,cross))*life);\n }\n result=over(emitter(spark*env*.92,hot,4.0),result);\n // OBS1 is only local optical spread from the registered glowing channels/receiver.\n let obs=emitter((broad+receiverGlow)*env*u.gates.y,gold,2.2);\n result=over(obs,result);\n if(result.a<=.000001){return vec4f(0.);}\n if(u.state.y>.5){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";
export const VERSION_ID='fighter-energy-charge-cleanroom-sol61-r1';
export const DURATION_MS=1200;
export const SFX_OFFSET_MS=96;
export const SFX_DURATION_MS=660;
export const UNIFORM_FLOATS=16;
export const VARIANT_NAMES=Object.freeze(['ordinary-charge','cross100-resource-entitlement','cross500-iai-charge','cross1000-apex-perks']);
const clamp=x=>Math.max(0,Math.min(1,x));
const fin=(n,k)=>{if(!Number.isFinite(n))throw new TypeError(k+' finite required');return n;};
function variant(v){if(!Number.isInteger(v)||v<0||v>3)throw new RangeError('variantIndex 0..3 required');return v;}
export function durationForVariant(v=0){variant(v);return DURATION_MS;}
export function phaseAt(ageMs,v=0){
 fin(ageMs,'ageMs');const d=durationForVariant(v),t=ageMs/d;
 if(ageMs<0)return 'before';if(ageMs>=d)return 'expired';
 if(t<.08)return 'seed';if(t<.34)return 'transfer';if(t<.66)return 'lock';
 if(t<.80)return 'settled';return 'release';
}
export function motionState(ageMs,v=0,reducedMotion=false){
 fin(ageMs,'ageMs');const d=durationForVariant(v),t=clamp(ageMs/d);
 return {normalizedAge:t,transfer:reducedMotion?1:1-Math.pow(1-clamp((t-.08)/.40),3),
 lock:clamp((t-.34)/.18),energy:ageMs<0||ageMs>=d?0:Math.min(clamp(t/.08),1-clamp((t-.80)/.20)),
 lockCount:v+1,glintAngleRadians:25*Math.PI/180};
}
export function frameState(input={},actorAspect=134/222,targetLinear=false){
 const {width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,variantIndex=0,
 sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}=input;
 variant(variantIndex);
 for(const [n,v]of Object.entries({width,height,dpr,actorHeightCss,ageMs,actorAspect}))fin(v,n);
 if(width<=0||height<=0||!Number.isInteger(width)||!Number.isInteger(height)||dpr<=0||actorHeightCss<=0||actorAspect<=0)
  throw new RangeError('positive backing dimensions/scales required');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('CSS center pair required');
 actorCenterCss.forEach(x=>fin(x,'actor center'));
 for(const [n,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))
  if(typeof v!=='boolean')throw new TypeError(n+' boolean required');
 const d=durationForVariant(variantIndex),active=sourceOn&&mainOn&&ageMs>=0&&ageMs<d;
 const m=motionState(ageMs,variantIndex,reducedMotion),phase=phaseAt(ageMs,variantIndex);
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...actorCenterCss,actorHeightCss,actorAspect,
  +active,+(active&&observerOn),+showActor,+reducedMotion,active?m.energy:0,+!targetLinear,variantIndex,d/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return {active,phase,variantIndex,variantName:VARIANT_NAMES[variantIndex],durationMs:d,motion:m,uniforms};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture required');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw new TypeError('target format');
 fin(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const targetLinear=format.endsWith('-srgb')||format==='rgba16float';
 const shader=device.createShaderModule({label:VERSION_ID,code:WGSL});
 const buffer=device.createBuffer({label:VERSION_ID+' uniform64',size:64,usage:0x40|0x08});
 const diagnostics={status:'PENDING',messages:[],error:null};
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{
  diagnostics.messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));
  diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'FAILED':'COMPILATION_INFO_RECEIVED';return diagnostics;
 }).catch(error=>{diagnostics.status='FAILED';diagnostics.error=String(error);return diagnostics;});
 let pipeline,bind;
 try{
  pipeline=device.createRenderPipeline({label:VERSION_ID,layout:'auto',vertex:{module:shader,entryPoint:'vs'},
   fragment:{module:shader,entryPoint:'fs',targets:[{format,blend:{
    color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
    alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
   {binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},
   {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){buffer.destroy();throw error;}
 let disposing=false,disposePromise=null,frames=0;
 return {diagnostics,diagnosticsReady,
  render(input){
   if(disposing)throw new Error('disposed renderer');
   if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view required');
   const s=frameState(input,actorAspect,targetLinear);
   device.queue.writeBuffer(buffer,0,s.uniforms);
   const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
   return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,
    durationMs:s.durationMs,framesRecorded:frames,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
  },
  dispose(){
   if(disposePromise)return disposePromise;disposing=true;
   disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
    buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();
   return disposePromise;
  }
 };
}
// Deterministic synthesis, no playback. First pressure contact is SFX_OFFSET_MS after cause origin.
export function synthesizeSfx(sampleRate=48000,v=0){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const duration=durationForVariant(v),n=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(n);
 const lockAt=duration*.44/1000-SFX_OFFSET_MS/1000;
 let seed=(0x4ecba921+v*9817)>>>0,low=0,previous=0;
 for(let i=0;i<n;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;low+=.12*(noise-low);
  const edge=low-previous;previous=low;
  const intake=(1-Math.exp(-t/.005))*Math.exp(-t/.11);
  const gather=(.29*low+.44*edge)*intake;
  let contact=0;
  for(let j=0;j<=v;j++){
   const dt=t-lockAt-j*.045*duration/1000;
   if(dt>=0)contact+=(.13*Math.sin(2*Math.PI*(139+j*17)*dt)*Math.exp(-dt/.052)+
    .07*Math.sin(2*Math.PI*367*dt)*Math.exp(-dt/.024)+.12*noise*Math.exp(-dt/.007))/(1+v*.22);
  }
  const taper=clamp((n-1-i)/(sampleRate*.055));
  pcm[i]=(gather+contact)*taper;
 }
 return pcm;
}
