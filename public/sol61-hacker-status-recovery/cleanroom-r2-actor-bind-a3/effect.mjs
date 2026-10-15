export const WGSL="\nstruct U{view:vec4f,actor:vec4f,gates:vec4f,state:vec4f};\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var image:texture_2d<f32>;\n@group(0) @binding(2) var imageSampler:sampler;\nstruct Out{@builtin(position) p:vec4f};\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var points=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.p=vec4f(points[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn emitter(a:f32,c:vec3f,radiance:f32)->vec4f{\n let coverage=clamp(a,0.,1.);return vec4f((vec3f(1.)-exp(-c*radiance))*coverage,coverage);\n}\nfn bevelRect(p:vec2f,halfSize:vec2f)->f32{\n let q=abs(p);return max(max(q.x-halfSize.x,q.y-halfSize.y),(q.x+q.y-halfSize.x-halfSize.y+1.8)*.70710678118);\n}\nfn capsule(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.,1.));\n}\nfn actorAt(uv:vec2f)->vec4f{\n let t=textureSample(image,imageSampler,clamp(uv,vec2f(0.),vec2f(1.)));\n let support=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n return vec4f(t.rgb,t.a*support);\n}\n\n// Finite emitting edge strip; analytic line-width approximation, no point singularities.\nfn primitiveEven(x:f32,b:f32)->f32{return x/(2.*b*(x*x+b))+atan(x/sqrt(b))/(2.*b*sqrt(b));}\nfn edgeIntegral(receiver:vec3f,a:vec3f,b:vec3f,normal:vec3f)->f32{\n let delta=receiver-a;let v=b-a;let extent=length(v);let tangent=v/extent;\n let h=dot(delta,tangent);let perpendicular=delta-tangent*h;\n let distanceSquared=max(dot(perpendicular,perpendicular),1e-6);\n let lo=-h;let hi=extent-h;\n let even=primitiveEven(hi,distanceSquared)-primitiveEven(lo,distanceSquared);\n let odd=.5/(lo*lo+distanceSquared)-.5/(hi*hi+distanceSquared);\n let zIntercept=delta.z-tangent.z*h;\n return max(abs(dot(normal,delta))*(zIntercept*even-tangent.z*odd),0.);\n}\nfn edgeIrradiance(q:vec2f,center:vec2f,yaw:f32)->f32{\n let hw=26.45;let hh=3.85;let chamfer=1.47781746;\n let vertices=array<vec2f,8>(vec2f(hw-chamfer,hh),vec2f(hw,hh-chamfer),vec2f(hw,-hh+chamfer),vec2f(hw-chamfer,-hh),vec2f(-hw+chamfer,-hh),vec2f(-hw,-hh+chamfer),vec2f(-hw,hh-chamfer),vec2f(-hw+chamfer,hh));\n let cosine=cos(yaw);let sine=sin(yaw);let normal=vec3f(sine,0.,cosine);\n let baseDepth=-12.-abs(sine)*27.;var irradiance=0.;\n for(var k=0u;k<8u;k=k+1u){\n  let a=vertices[k];let b=vertices[(k+1u)%8u];\n  let va=vec3f(center.x+cosine*a.x,center.y+a.y,baseDepth-sine*a.x);\n  let vb=vec3f(center.x+cosine*b.x,center.y+b.y,baseDepth-sine*b.x);\n  irradiance+=edgeIntegral(vec3f(q,0.),va,vb,normal)*(.55*16./15.);\n }\n return irradiance;\n}\n@fragment fn fs(o:Out)->@location(0) vec4f{\n let css=o.p.xy/u.view.z;\n let p=css-u.actor.xy;\n let scale=u.actor.z/64.;\n let q=p/scale;\n let age=clamp(u.view.w*1000.,0.,1480.);\n let env=u.state.x*u.gates.x;\n let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(.5);\n let actorTexel=actorAt(uv);\n let aa=max(.65,.8/(u.view.z*scale));\n let violet=vec3f(.46,.26,1.);\n let pearl=vec3f(.86,.93,1.);\n var behind=vec4f(0.);var front=vec4f(0.);var received=vec3f(0.);var spread=0.;\n // PH1: one recipient-local program field, resolved as three strata rather than status counters.\n for(var j=0u;j<3u;j=j+1u){\n  let start=120.+f32(j)*100.;\n  let a=clamp((age-start)/240.,0.,1.);\n  let travel=select(1.-pow(1.-a,3.),1.,u.gates.w>.5);\n  let initial=select(select(-14.,18.,j==1u),-18.,j==0u);\n  let center=vec2f(initial*(1.-travel),-22.+f32(j)*22.);\n  let yaw=(-.62+f32(j)*.16)*(1.-travel)+.10*travel;\n  let cosine=cos(yaw);\n  let local=q-center;\n  // Orthographic projection of a finite plane yawed around the body's vertical axis.\n  let plane=vec2f(local.x/max(cosine,.25),local.y);\n  let d=bevelRect(plane,vec2f(27.,4.4));\n  let face=1.-smoothstep(-aa,aa,d);\n  let edgeDensity=max(1.-pow((d+.55)/.55,2.),0.);\n  let edge=edgeDensity*edgeDensity;\n  let prime=clamp((age-f32(j)*30.)/80.,0.,1.);\n  let settle=exp(-pow((age-(start+240.))/34.,2.));\n  let f0=pow((1.36-1.)/(1.36+1.),2.);\n  let fresnel=f0+(1.-f0)*pow(1.-abs(cosine),5.);\n  let tint=mix(violet,pearl,travel);\n  // Separate coverage, emission and a face-dependent dielectric-like optical weight.\n  let faceCoverage=face*prime*(.12+fresnel*.22);\n  behind=over(emitter(faceCoverage*env,tint,1.6),behind);\n  // Same edge source radiance drives the actual albedo receiver.\n  let edgeRadiance=vec3f(1.)-exp(-tint*(3.6+settle*1.2));\n  if(actorTexel.a>0.&&u.gates.z>.5){received+=edgeRadiance*prime*(.52+.28*settle)*env*edgeIrradiance(q,center,yaw);}\n  let edgeCoverage=edge*prime*(.52+.28*settle);\n  front=over(emitter(edgeCoverage*env,tint,3.6+settle*1.2),front);\n  spread=max(spread,exp(-pow(abs(d)/3.6,2.))*prime*(.13+.10*settle));\n }\n // The original actor remains the baseline between rear field and front receiving edge.\n let actorA=actorTexel.a*u.gates.z;\n let actor=vec4f(decode(actorTexel.rgb)*(vec3f(1.)+received/3.14159265359)*actorA,actorA);\n var result=over(actor,behind);result=over(front,result);\n // Registration pulse is carried by the same finite emitting edge, with no extra emitter.\n // OBS1 is only local sensor spread from the same planes, never the primary shape.\n let observation=emitter(spread*env*u.gates.y,pearl,1.9);\n result=over(observation,result);\n if(result.a<=.000001){return vec4f(0.);}\n if(u.state.y>.5){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";
export const VERSION_ID='hacker-status-recovery-cleanroom-sol61-r2';
export const EVENT_TYPE='hacker-status-recover';
export const DURATION_MS=1480;
export const SFX_OFFSET_MS=120;
export const SFX_DURATION_MS=720;
export const UNIFORM_FLOATS=16;
export const VARIANTS=Object.freeze([Object.freeze({index:0,id:'cleared',label:'Cleared',durationMs:DURATION_MS})]);
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(v,k)=>{if(!Number.isFinite(v))throw new TypeError(k+' finite required');return v;};
function validateVariant(v){if(v!==0)throw new RangeError('only cleared variantIndex0');return 0;}
export function durationForVariant(v=0){validateVariant(v);return DURATION_MS;}
export function phaseAt(ageMs,v=0){
 finite(ageMs,'ageMs');durationForVariant(v);
 if(ageMs<0)return 'before';if(ageMs>=DURATION_MS)return 'expired';
 if(ageMs<120)return 'prime';if(ageMs<560)return 'align';if(ageMs<1100)return 'restored';return 'release';
}
// Semantic admission helper only. Does not mutate game state or use producer at as local start.
export function admitReceipt(raw,recipient){
 const reject=reason=>({accepted:false,reason,sfxEligible:false});
 if(!raw||raw.type!==EVENT_TYPE)return reject('wrong-event');
 if(raw.variant!=='cleared')return reject('not-cleared');
 if(typeof raw.id!=='string'||!raw.id||!Number.isFinite(raw.at)||!Number.isFinite(raw.x)||!Number.isFinite(raw.y)||raw.radius!==145)return reject('invalid-receipt');
 if(typeof raw.playerId!=='string'||!raw.playerId||typeof raw.targetId!=='string'||!raw.targetId)return reject('missing-owner-or-recipient');
 if(!recipient||recipient.id!==raw.targetId||recipient.alive!==true||recipient.ejected===true||recipient.visible===false||recipient.invisible===true)return reject('invalid-recipient');
 return{accepted:true,reason:'cleared-recipient',sfxEligible:true,causeId:raw.id,casterId:raw.playerId,recipientId:raw.targetId,
 sourceAt:raw.at,localClock:'host receipt source-age; do not use sourceAt as local startedAt'};
}
export function alignmentAt(ageMs,index,reducedMotion=false){
 finite(ageMs,'ageMs');if(!Number.isInteger(index)||index<0||index>2)throw new RangeError('plane index0..2');
 const a=clamp((ageMs-(120+index*100))/240),travel=reducedMotion?1:1-Math.pow(1-a,3);
 const initial=[-18,18,-14][index];
 return{centerX:initial*(1-travel),centerY:-22+22*index,yaw:(-.62+index*.16)*(1-travel)+.10*travel,travel,
 lockAtMs:360+100*index,glintAngleRadians:12*Math.PI/180};
}
export function frameState(input={},actorAspect=134/222,targetLinear=false){
 const{width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,variantIndex=0,
 sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false,
 outcome='cleared',recipientAlive=true,recipientEjected=false,recipientVisible=true}=input;
 durationForVariant(variantIndex);
 for(const[k,v]of Object.entries({width,height,dpr,actorHeightCss,actorAspect,ageMs}))finite(v,k);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||dpr<=0||actorHeightCss<=0||actorAspect<=0)throw new RangeError('positive backing dimensions and scales');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('actorCenterCss pair');actorCenterCss.forEach(x=>finite(x,'actorCenterCss'));
 for(const[k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion,recipientAlive,recipientEjected,recipientVisible}))
 if(typeof v!=='boolean')throw new TypeError(k+' boolean');
 const eligible=outcome==='cleared'&&recipientAlive&&!recipientEjected&&recipientVisible;
 const active=eligible&&sourceOn&&mainOn&&ageMs>=0&&ageMs<DURATION_MS;
 const energy=Math.min(clamp(ageMs/80),1-clamp((ageMs-1100)/380));
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...actorCenterCss,actorHeightCss,actorAspect,
 +active,+(active&&observerOn),+showActor,+reducedMotion,active?energy:0,+!targetLinear,variantIndex,DURATION_MS/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return{eligible,active,sfxEligible:active,phase:eligible?phaseAt(ageMs,variantIndex):'omitted',variantIndex,durationMs:DURATION_MS,uniforms};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture');
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
 color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
 {binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){buffer.destroy();throw error;}
 let disposing=false,disposePromise=null,frames=0;
 const dispose=()=>{if(disposePromise)return disposePromise;disposing=true;
 disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
 buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();return disposePromise;};
 return{diagnostics,diagnosticsReady,render(input){
 if(disposing)throw new Error('renderer disposed');
 if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view');
 const s=frameState(input,actorAspect,linearTarget);device.queue.writeBuffer(buffer,0,s.uniforms);
 const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
 return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,durationMs:s.durationMs,sfxEligible:s.sfxEligible,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED',framesRecorded:frames};
 },dispose,destroy:dispose};
}
// Synthetic programme-field registration contacts, no playback side effects.
export function synthesizeSfx(sampleRate=48000,v=0,outcome='cleared'){
 validateVariant(v);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 if(outcome!=='cleared')return new Float32Array(0);
 const n=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(n);
 let seed=0x68e1a7d3,low=0,prior=0;
 for(let i=0;i<n;i++){
 const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
 const noise=(seed>>>0)/2147483648-1;low+=.11*(noise-low);const edge=low-prior;prior=low;
 let value=(.21*low+.31*edge)*(1-Math.exp(-t/.003))*Math.exp(-t/.10);
 for(let j=0;j<3;j++){const dt=t-(360+j*100-SFX_OFFSET_MS)/1000;
 if(dt>=0)value+=(.085*Math.sin(2*Math.PI*(1630+j*130)*dt)*Math.exp(-dt/.020)+
 .038*Math.sin(2*Math.PI*2910*dt)*Math.exp(-dt/.010)+.065*edge*Math.exp(-dt/.004));}
 pcm[i]=value*clamp((n-1-i)/(sampleRate*.065));
 }return pcm;
}
export function sfxForReceipt(raw,recipient,sampleRate=48000){
 return admitReceipt(raw,recipient).accepted?synthesizeSfx(sampleRate,0,'cleared'):new Float32Array(0);
}
