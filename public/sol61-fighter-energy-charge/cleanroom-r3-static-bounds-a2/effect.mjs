export const WGSL="\nstruct U { view:vec4f, actor:vec4f, gates:vec4f, state:vec4f };\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var img:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\nstruct Out { @builtin(position) p:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.p=vec4f(p[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{\n return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));\n}\nfn encode(c:vec3f)->vec3f{\n let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));\n}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn capsule(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.,1.));\n}\nfn emitter(cov:f32,col:vec3f,radiance:f32)->vec4f{\n let a=clamp(cov,0.,1.);return vec4f((vec3f(1.)-exp(-col*radiance))*a,a);\n}\nfn pulse(t:f32,a:f32,b:f32)->f32{\n let n=clamp((t-a)/(b-a),0.,1.);return sin(n*3.14159265);\n}\nfn circularChord(distance:f32,radius:f32)->f32 {return 2.*sqrt(max(radius*radius-distance*distance,0.));}\nfn conduitPoint(side:f32,progress:f32)->vec2f {\n let a=vec2f(side*28.,17.);let b=vec2f(side*23.,-5.);let c=vec2f(side*6.,-9.);\n let ab=length(b-a);let bc=length(c-b);let travel=clamp(progress,0.,1.)*(ab+bc);\n if(travel<=ab){return mix(a,b,travel/ab);}return mix(b,c,(travel-ab)/bc);\n}\nfn sphereRange(origin:vec3f,ray:vec3f,center:vec3f,radius:f32)->vec2f {\n let q=origin-center;let b=dot(q,ray);let h=b*b-dot(q,q)+radius*radius;\n if(h<0.){return vec2f(1e6,-1e6);}let root=sqrt(h);return vec2f(-b-root,-b+root);\n}\nfn capsuleRange(origin:vec3f,ray:vec3f,a:vec3f,b:vec3f,radius:f32)->vec2f {\n let ba=b-a;let oa=origin-a;let bb=dot(ba,ba);let bd=dot(ba,ray);let bo=dot(ba,oa);\n let A=bb-bd*bd;let B=bb*dot(ray,oa)-bo*bd;let C=bb*dot(oa,oa)-bo*bo-radius*radius*bb;\n let capA=sphereRange(origin,ray,a,radius);let capB=sphereRange(origin,ray,b,radius);\n var entry=1e6;var exit=-1e6;\n for(var k=0u;k<2u;k++){\n  let cap=select(capA,capB,k==1u);\n  if(cap.x>0.&&cap.x<1e5){entry=min(entry,cap.x);exit=max(exit,cap.x);}\n  if(cap.y>0.&&cap.y<1e5){entry=min(entry,cap.y);exit=max(exit,cap.y);}\n }\n let disc=B*B-A*C;\n if(A>.000001&&disc>=0.){let root=sqrt(disc);for(var k=0u;k<2u;k++){\n  let hit=(-B+select(-root,root,k==1u))/A;let axial=bo+hit*bd;\n  if(hit>0.&&axial>0.&&axial<bb){entry=min(entry,hit);exit=max(exit,hit);}\n }}\n if(exit<=entry){return vec2f(0.);}return vec2f(entry,exit);\n}\nfn intervalUnionLength(a:vec2f,b:vec2f)->f32 {\n return max(0.,a.y-a.x)+max(0.,b.y-b.x)-max(0.,min(a.y,b.y)-max(a.x,b.x));\n}\nstruct ReceiverCone {axis:vec3f,cosine:f32};\nfn accumulatorReflection(q:vec2f,t:f32,variant:f32,env:f32,color:vec3f)->vec3f {\n if(t<=.30||env<=0.){return vec3f(0.);}\n let origin=vec3f(q,0.);var cones:array<ReceiverCone,32>;var coneCount=0u;\n // Finite bounds select integration domain only; radiance intersects original volumes.\n for(var j=0u;j<4u;j++){\n  if(f32(j)>variant){continue;}\n  let y=-8.+f32(j)*6.;let width=10.+f32(j)*1.6;\n  let points=array<vec3f,3>(vec3f(-width,y-2.,-3.),vec3f(0.,y+2.,-3.),vec3f(width,y-2.,-3.));\n  for(var leg=0u;leg<2u;leg++){for(var piece=0u;piece<4u;piece++){\n   let a=mix(points[leg],points[leg+1u],f32(piece)/4.);let b=mix(points[leg],points[leg+1u],f32(piece+1u)/4.);\n   let delta=(a+b)*.5-origin;let distance=length(delta);let boundRadius=length(b-a)*.5+1.9;\n   cones[coneCount].axis=delta/distance;cones[coneCount].cosine=-1.;\n   if(distance>boundRadius){cones[coneCount].cosine=sqrt(max(0.,1.-boundRadius*boundRadius/(distance*distance)));}\n   coneCount+=1u;\n  }}\n }\n let nodes=array<f32,4>(.069431844203,.330009478208,.669990521792,.930568155797);\n let weights=array<f32,4>(.173927422569,.326072577431,.326072577431,.173927422569);\n var fraction=0.;\n // Positive Gauss rule in u=sin(theta)^2, whose measure is Lambert cosine/pi.\n for(var azimuth=0u;azimuth<32u;azimuth++){\n  let phi=6.28318530718*(f32(azimuth)+.5)/32.;let c=cos(phi);let s=sin(phi);var lo=1.;var hi=0.;\n  for(var k=0u;k<32u;k++){\n   if(k>=coneCount){break;}\n   let cone=cones[k];if(cone.cosine<0.){lo=0.;hi=1.;break;}\n   let A=cone.axis.x*c+cone.axis.y*s;let B=-cone.axis.z;let amplitude=sqrt(A*A+B*B);\n   if(amplitude<cone.cosine){continue;}\n   let beta=atan2(A,B);let halfAngle=acos(clamp(cone.cosine/amplitude,0.,1.));\n   let start=max(0.,beta-halfAngle);let end=min(1.57079632679,beta+halfAngle);\n   if(end<=start){continue;}\n   lo=min(lo,pow(sin(start),2.));hi=max(hi,pow(sin(end),2.));\n  }\n  if(hi<=lo){continue;}\n  for(var sampleIndex=0u;sampleIndex<4u;sampleIndex++){\n   let u1=mix(lo,hi,nodes[sampleIndex]);let weight=(hi-lo)*weights[sampleIndex]/32.;\n   let ray=vec3f(sqrt(u1)*c,sqrt(u1)*s,-sqrt(max(0.,1.-u1)));var tau=0.;\n   for(var j=0u;j<4u;j++){\n    let layer=select(0.,1.,f32(j)<=variant)*clamp((t-.30-f32(j)*.045)/.14,0.,1.);\n    if(layer<=0.){continue;}\n    let y=-8.+f32(j)*6.;let width=10.+f32(j)*1.6;\n    let a=vec3f(-width,y-2.,-3.);let b=vec3f(0.,y+2.,-3.);let c=vec3f(width,y-2.,-3.);\n    tau+=.48*layer*env*intervalUnionLength(capsuleRange(origin,ray,a,b,1.9),capsuleRange(origin,ray,b,c,1.9));\n   }\n   fraction+=(1.-exp(-tau))*weight;\n  }\n }\n return color*1.4*fraction;\n}\n@fragment fn fs(o:Out)->@location(0) vec4f{\n let css=o.p.xy/u.view.z;\n let p=css-u.actor.xy;\n let scale=u.actor.z/64.;\n let q=p/scale;\n let t=clamp(u.view.w/max(u.state.w,.001),0.,1.);\n let sourceEnabled=u.gates.x;\n let env=u.state.x*sourceEnabled;\n let variant=u.state.z;\n let aa=max(.6,.8/(u.view.z*scale));\n let transfer=select(1.-pow(1.-clamp((t-.08)/.22,0.,1.),3.),1.,u.gates.w>.5);\n let lock=smoothstep(.34,.52,t);\n let orange=vec3f(1.,.26,.045);\n let gold=vec3f(1.,.66,.13);\n let hot=vec3f(1.,.93,.65);\n var channelTau=0.;var broad=0.;\n // PH1: two folded finite energy conduits originate at the recipient's own flank.\n // Their bright transfer fronts physically approach the same torso accumulator.\n for(var side=-1.;side<=1.;side=side+2.){\n  let A=vec2f(side*28.,17.);\n  let B=vec2f(side*23.,-5.);\n  let C=vec2f(side*6.,-9.);\n  let d=min(capsule(q,A,B),capsule(q,B,C));\n  let support=pulse(t,0.,.63);\n  let tip=conduitPoint(side,transfer);\n  // Bright packet is a density modulation INSIDE the same finite circular tube.\n  let packet=exp(-dot(q-tip,q-tip)/9.)*(1.-smoothstep(.44,.56,t));\n  let density=.65*support+1.8*packet;\n  channelTau+=.48*env*density*circularChord(d,1.7);\n  broad=max(broad,exp(-d*d/24.)*density*.19);\n }\n // PH1 receiver: paired wedges meet at the sternum. Added locks denote threshold receipts,\n // never a projectile, sword or victim. Plate width is finite and leaves the actor readable.\n var receiverTau=0.;var receiverGlow=0.;\n for(var j=0u;j<4u;j=j+1u){\n  let enabled=select(0.,1.,f32(j)<=variant);\n  let y=-8.+f32(j)*6.;\n  let width=10.+f32(j)*1.6;\n  let dl=capsule(q,vec2f(-width,y-2.),vec2f(0.,y+2.));\n  let dr=capsule(q,vec2f(0.,y+2.),vec2f(width,y-2.));\n  let d=min(dl,dr);\n  let settle=clamp((t-.30-f32(j)*.045)/.14,0.,1.);\n  let layer=enabled*settle;\n  receiverTau+=.48*env*layer*circularChord(d,1.9);\n  receiverGlow=max(receiverGlow,exp(-d*d/18.)*layer*.23);\n }\n let coreColor=mix(gold,hot,lock);\n let worldAlpha=1.-exp(-channelTau);\n let world=vec4f(orange*1.4*worldAlpha,worldAlpha);\n // Correct raw actor baseline, independent of source/main/observer gates.\n let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(.5);\n let tex=textureSample(img,samp,clamp(uv,vec2f(0.),vec2f(1.)));\n let inActor=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n let actorA=tex.a*inActor*u.gates.z;\n // PH2 albedo-bound reflection of the SAME finite front accumulator volumes.\n var reflected=vec3f(0.);\n if(actorA>0.&&env>0.){reflected=accumulatorReflection(q,t,variant,env,coreColor);}\n let albedo=decode(tex.rgb);\n let actor=vec4f(albedo*(vec3f(1.)+reflected)*actorA,actorA);\n var result=over(actor,world);\n // Receiver plates sit in front of the body; their central gap and shoulders stay open.\n let frontAlpha=1.-exp(-receiverTau);\n let front=vec4f(coreColor*1.4*frontAlpha,frontAlpha);\n result=over(front,result);\n // Three sparse receipt glints: fixed25-degree cross topology, finite staggered contact windows.\n var spark=0.;\n let ca=.906307787; let sa=.422618262;\n for(var j=0u;j<3u;j=j+1u){\n  let pos=vec2f((f32(j)-1.)*19.,-18.+f32(j%2u)*31.);\n  let z=q-pos;\n  let v=vec2f(ca*z.x+sa*z.y,-sa*z.x+ca*z.y);\n  let a=.34+f32(j)*.07;\n  let life=pulse(t,a,a+.22);\n  let cross=min(capsule(v,vec2f(-4.8,0.),vec2f(4.8,0.)),capsule(v,vec2f(0.,-2.7),vec2f(0.,2.7)));\n  spark=max(spark,(1.-smoothstep(.72,.72+aa,cross))*life);\n }\n result=over(emitter(spark*env*.92,hot,4.0),result);\n // OBS1 is only local optical spread from the registered glowing channels/receiver.\n let obs=emitter((broad+receiverGlow)*env*u.gates.y,gold,2.2);\n result=over(obs,result);\n if(result.a<=.000001){return vec4f(0.);}\n if(u.state.y>.5){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";
export const VERSION_ID='fighter-energy-charge-cleanroom-sol61-r3';
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
 return {normalizedAge:t,transfer:reducedMotion?1:1-Math.pow(1-clamp((t-.08)/.22),3),
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
