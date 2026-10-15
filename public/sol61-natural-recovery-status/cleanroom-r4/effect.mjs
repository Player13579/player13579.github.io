export const WGSL="\nstruct U { view:vec4f, actor:vec4f, gates:vec4f, state:vec4f };\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var image:texture_2d<f32>;\n@group(0) @binding(2) var imageSampler:sampler;\nstruct VOut { @builtin(position) p:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:VOut;o.p=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{\n let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));\n}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn texAt(uv:vec2f)->vec4f{\n let v=textureSample(image,imageSampler,clamp(uv,vec2f(0.),vec2f(1.)));\n let mask=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n return vec4f(v.rgb,v.a*mask);\n}\nfn capsule(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.,1.));\n}\nfn emitter(coverage:f32,color:vec3f,radiance:f32)->vec4f{\n let a=clamp(coverage,0.,1.);return vec4f((vec3f(1.)-exp(-color*radiance))*a,a);\n}\n// Intrinsic material relaxation is causal: no local activation before arrival.\nfn clearMaterialState(y:f32,age:f32)->f32 {\n let arrival=100.+(1.-clamp(y,0.,1.))*640.;\n let elapsed=age-arrival;\n if(elapsed<=0.){return 0.;}\n let x=elapsed/95.;let relaxation=x*exp(1.-x);\n let balanced=.15*smoothstep(0.,95.,elapsed);\n return balanced+.64*relaxation;\n}\nfn coating(uv:vec2f,size:vec2f,scale:f32,density:f32,env:f32,color:vec3f,rebound:f32,glintRadiance:f32)->vec4f {\n // Author-declared shallow alpha extrusion, not inferred anatomical normals.\n let dx=vec2f(scale/size.x,0.);let dy=vec2f(0.,scale/size.y);\n let gradient=vec2f(materialTexAt(uv+dx,size,scale,rebound).a-materialTexAt(uv-dx,size,scale,rebound).a,materialTexAt(uv+dy,size,scale,rebound).a-materialTexAt(uv-dy,size,scale,rebound).a)/(2.*scale);\n let thickness=(1.1+.55*rebound)*scale;\n let normalZ=1./sqrt(1.+thickness*thickness*dot(gradient,gradient));\n let path=thickness/max(normalZ,.25);\n let alpha=1.-exp(-(.9/scale)*max(density,0.)*max(env,0.)*path);\n // Homogeneous isotropic source function, shared outgoing layer and body attenuation.\n return vec4f((color*1.4+vec3f(1.,.91,.71)*glintRadiance)*alpha,alpha);\n}\n\n// Selected PRIMARY homogeneous coating source component; existing glint source function is excluded.\n// Same full coating density, local clock, source colour and shared Beer attenuation at each source site.\n// Current gallery actor texture has one mip level. Explicit level0 is safe under nonuniform finite support control.\n// Shallow finite deposition terminates over its physical thickness; actor unchanged.\nfn materialTexAt(uv:vec2f,size:vec2f,scale:f32,coatRebound:f32)->vec4f{\n let v=textureSampleLevel(image,imageSampler,clamp(uv,vec2f(0.),vec2f(1.)),0.);\n let edgeX=min(uv.x,1.-uv.x)*size.x/scale;\n let edgeY=min(uv.y,1.-uv.y)*size.y/scale;\n let deposition=smoothstep(0.,1.1+.55*coatRebound,min(edgeX,edgeY));\n return vec4f(v.rgb,v.a*deposition);\n}\n\nfn primaryCoatingSource(uv:vec2f,size:vec2f,scale:f32,radius:f32,age:f32,clear:bool,rebound:f32,wave:f32,env:f32)->vec4f{\n let tex=materialTexAt(uv,size,scale,select(rebound,0.,clear));var nearA=tex.a;\n for(var j=0u;j<8u;j++){let a=f32(j)*.78539816339;let n=vec2f(cos(a),sin(a));nearA=max(nearA,materialTexAt(uv+n*radius/size,size,scale,select(rebound,0.,clear)).a);}\n let outer=max(nearA-tex.a,0.);let state=select(.83,clearMaterialState(uv.y,age),clear);\n let response=select(tex.a*(.23+.35*rebound),tex.a*state,clear);\n let density=response*.68+outer*clamp(state*1.2,0.,1.);\n if(density<=0.||env<=0.){return vec4f(0.);}\n let front=1.-wave;let passed=smoothstep(front-.09,front+.09,uv.y);\n let color=mix(vec3f(.88,.46,.43),vec3f(1.,.91,.71),select(.72,.30+.70*passed,clear));\n let dx=vec2f(scale/size.x,0.);let dy=vec2f(0.,scale/size.y);\n let gradient=vec2f(materialTexAt(uv+dx,size,scale,select(rebound,0.,clear)).a-materialTexAt(uv-dx,size,scale,select(rebound,0.,clear)).a,materialTexAt(uv+dy,size,scale,select(rebound,0.,clear)).a-materialTexAt(uv-dy,size,scale,select(rebound,0.,clear)).a)/(2.*scale);\n let thickness=(1.1+.55*select(rebound,0.,clear))*scale;\n let normalZ=1./sqrt(1.+thickness*thickness*dot(gradient,gradient));let path=thickness/max(normalZ,.25);\n let alpha=1.-exp(-(.9/scale)*max(density,0.)*max(env,0.)*path);\n return vec4f(color*1.4*alpha,alpha);\n}\nfn sourceDrivenHalo(uv:vec2f,size:vec2f,scale:f32,radius:f32,age:f32,clear:bool,rebound:f32,wave:f32,env:f32)->vec4f{\n if(env<=0.){return vec4f(0.);}\n // Finite material radius plus2H64px compact observer support.\n let margin=vec2f(radius+2.*scale)/size;\n if(any(uv < -margin)||any(uv > vec2f(1.)+margin)){return vec4f(0.);}\n let nodes=array<f32,8>(.019855071751232,.101666761293187,.237233795041836,.408282678752175,.591717321247825,.762766204958164,.898333238706813,.980144928248768);\n let weights=array<f32,8>(.050614268145188,.111190517226687,.156853322938944,.181341891689181,.181341891689181,.156853322938944,.111190517226687,.050614268145188);\n var halo=vec4f(0.);\n for(var i=0u;i<8u;i++){\n  let y=-2.+4.*nodes[i];let cap=sqrt(max(0.,4.-y*y));\n  for(var j=0u;j<8u;j++){\n   let x=-cap+(2.*cap)*nodes[j];let radial2=x*x+y*y;\n   let v=max(0.,1.-radial2/4.);let kernel=(3./(3.14159265359*4.))*v*v;\n   let weight=4.*(2.*cap)*weights[i]*weights[j]*kernel;\n   let point=uv+vec2f(x,y)*scale/size;\n   halo+=primaryCoatingSource(point,size,scale,radius,age,clear,rebound,wave,env)*weight;\n  }\n }\n return halo*.30;\n}\n\n@fragment fn fs(o:VOut)->@location(0) vec4f{\n let p=o.p.xy/u.view.z-u.actor.xy;\n let size=vec2f(u.actor.z*u.actor.w,u.actor.z);\n let uv=p/size+vec2f(.5);\n let tex=texAt(uv);\n let age=u.view.w*1000.;\n let clear=u.state.z<.5;\n let env=u.state.x*u.gates.x;\n let scale=u.actor.z/64.;\n let wave=clamp((age-100.)/640.,0.,1.);\n let rebound=sin(clamp((age-100.)/340.,0.,1.)*3.14159265);\n let radialWidth=select(1.35+2.4*rebound,1.6,clear);\n let radius=select(radialWidth,1.6,u.gates.w>.5)*scale;\n let materialA=materialTexAt(uv,size,scale,select(rebound,0.,clear)).a;\n var nearA=materialA;\n // Alpha-derived material support: eight actual texture taps, not a substitute body drawing.\n for(var j=0u;j<8u;j=j+1u){\n  let a=f32(j)*.78539816339;\n  let n=vec2f(cos(a),sin(a));\n  nearA=max(nearA,materialTexAt(uv+n*radius/size,size,scale,select(rebound,0.,clear)).a);\n }\n let outer=max(nearA-materialA,0.);\n let front=1.-wave;\n let passed=smoothstep(front-.09,front+.09,uv.y);\n let clearResponse=materialA*clearMaterialState(uv.y,age);\n let blockedResponse=materialA*(.23+.35*rebound);\n let response=select(blockedResponse,clearResponse,clear);\n let localState=select(.83,clearMaterialState(uv.y,age),clear);\n let contour=outer*clamp(localState*1.2,0.,1.);\n let ivory=vec3f(1.,.91,.71);\n let rose=vec3f(.88,.46,.43);\n let localColor=mix(rose,ivory,select(.72,.30+.70*passed,clear));\n // PH1: intrinsic material response. Nothing incoming and no adverse-status carrier is drawn.\n // Finite registration is emission within the same coating, not an independent overlay.\n let q=p/scale;\n let ca=.951056516;let sa=-.309016994;\n var glints=0.;\n for(var j=0u;j<3u;j=j+1u){\n  let gx=select(select(-5.,8.,j==1u),-8.,j==0u);\n  let gy=select(select(19.,2.,j==1u),-12.,j==0u);\n  let pos=vec2f(gx,gy);\n  let glintUV=pos/vec2f(64.*u.actor.w,64.)+vec2f(.5);\n  let sourceA=materialTexAt(glintUV,size,scale,select(rebound,0.,clear)).a;\n  let clearAt=100.+(1.-clamp(uv.y,0.,1.))*640.;\n  let start=select(100.+f32(j)*50.,clearAt,clear);\n  let life=sin(clamp((age-start)/180.,0.,1.)*3.14159265);\n  let z=q-pos;let r=vec2f(ca*z.x+sa*z.y,-sa*z.x+ca*z.y);\n  let d=min(capsule(r,vec2f(-4.9,0.),vec2f(4.9,0.)),capsule(r,vec2f(0.,-2.6),vec2f(0.,2.6)));\n  let aa=max(.6,.8/(u.view.z*scale));\n  glints=max(glints,(1.-smoothstep(.68,.68+aa,d))*life*sourceA);\n }\n glints*=materialA;\n let skinLight=coating(uv,size,scale,response*.68+contour,env,localColor,select(rebound,0.,clear),3.2*glints);\n var sourceGlow=vec4f(0.);\n if(u.gates.y>.5){sourceGlow=sourceDrivenHalo(uv,size,scale,radius,age,clear,rebound,wave,env);}\n // Host actor remains exactly baseline when every source contribution is zero.\n let actorA=tex.a*u.gates.z;\n let actor=vec4f(decode(tex.rgb)*actorA,actorA);\n var result=over(actor,sourceGlow);\n result=over(skinLight,result);\n if(result.a<=.000001){return vec4f(0.);}\n if(u.state.y>.5){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";
export const VERSION_ID='natural-recovery-status-cleanroom-sol61-r4';
export const DURATION_MS=1350;
export const SFX_OFFSET_MS=100;
export const SFX_DURATION_MS=700;
export const UNIFORM_FLOATS=16;
export const VARIANTS=Object.freeze([
 Object.freeze({index:0,id:'cleared',label:'Cleared',durationMs:1350}),
 Object.freeze({index:1,id:'blocked',label:'Blocked',durationMs:1150})
]);
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(v,k)=>{if(!Number.isFinite(v))throw new TypeError(k+' finite required');return v;};
function validVariant(v){if(!Number.isInteger(v)||v<0||v>1)throw new RangeError('variantIndex0..1 required');return v;}
export function durationForVariant(v=0){return VARIANTS[validVariant(v)].durationMs;}
export function phaseAt(ageMs,v=0){
 finite(ageMs,'ageMs');const d=durationForVariant(v);
 if(ageMs<0)return 'before';if(ageMs>=d)return 'expired';
 if(ageMs<100)return v===0?'gather':'brace';
 if(ageMs<(v===0?740:440))return v===0?'redistribute':'rebound';
 if(ageMs<d-320)return 'balanced';
 return 'release';
}
export function responseState(ageMs,v=0,reducedMotion=false){
 finite(ageMs,'ageMs');const d=durationForVariant(v);
 return{energy:ageMs<0||ageMs>=d?0:Math.min(clamp(ageMs/100),1-clamp((ageMs-(d-320))/320)),
 wave:clamp((ageMs-100)/640),
 rebound:Math.sin(clamp((ageMs-100)/340)*Math.PI),
 radiusCss:v===0||reducedMotion?1.6:1.35+2.4*Math.sin(clamp((ageMs-100)/340)*Math.PI),
 glintAngleRadians:-18*Math.PI/180};
}
export function frameState(input={},actorAspect=134/222,targetLinear=false){
 const {width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,variantIndex=0,
 sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}=input;
 const durationMs=durationForVariant(variantIndex);
 for(const [k,v]of Object.entries({width,height,dpr,actorHeightCss,actorAspect,ageMs}))finite(v,k);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||dpr<=0||actorHeightCss<=0||actorAspect<=0)
  throw new RangeError('positive backing dimensions and scales required');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('actorCenterCss pair required');
 actorCenterCss.forEach(x=>finite(x,'actorCenterCss'));
 for(const [k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))
  if(typeof v!=='boolean')throw new TypeError(k+' boolean required');
 const active=sourceOn&&mainOn&&ageMs>=0&&ageMs<durationMs;
 const response=responseState(ageMs,variantIndex,reducedMotion);
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...actorCenterCss,actorHeightCss,actorAspect,
 +active,+(active&&observerOn),+showActor,+reducedMotion,active?response.energy:0,+!targetLinear,variantIndex,durationMs/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return{active,phase:phaseAt(ageMs,variantIndex),variantIndex,variantId:VARIANTS[variantIndex].id,durationMs,response,uniforms};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture required');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw new TypeError('target format');
 finite(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const linearTarget=format.endsWith('-srgb')||format==='rgba16float';
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
 return{diagnostics,diagnosticsReady,
 render(input){
  if(disposing)throw new Error('renderer disposed');
  if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view required');
  const s=frameState(input,actorAspect,linearTarget);
  device.queue.writeBuffer(buffer,0,s.uniforms);
  const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
  return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,durationMs:s.durationMs,
  framesRecorded:frames,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
 },
 dispose(){
  if(disposePromise)return disposePromise;disposing=true;
  disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
  buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();
  return disposePromise;
 }};
}
// Body-local pressure/elastic relaxation synthesis. No AudioContext or playback side effect.
export function synthesizeSfx(sampleRate=48000,v=0){
 validVariant(v);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const count=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(count);
 const contactMs=v===0?[230,400,540]:[100,150,200];
 let seed=(0x37cd9b01+v*0x1967)>>>0,low=0,prior=0;
 for(let i=0;i<count;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;low+=.07*(noise-low);const edge=low-prior;prior=low;
  const soft=(.22*low+.30*edge)*(1-Math.exp(-t/.004))*Math.exp(-t/.14);
  let pressure=0;
  for(let j=0;j<contactMs.length;j++){
   const dt=t-(contactMs[j]-SFX_OFFSET_MS)/1000;
   if(dt>=0)pressure+=(.085*Math.sin(2*Math.PI*(116+13*j)*dt)*Math.exp(-dt/.052)+
   .045*Math.sin(2*Math.PI*193*dt)*Math.exp(-dt/.031)+.07*noise*Math.exp(-dt/.008))*(v===0?.88:1.);
  }
  pcm[i]=(soft+pressure)*clamp((count-1-i)/(sampleRate*.065));
 }
 return pcm;
}
