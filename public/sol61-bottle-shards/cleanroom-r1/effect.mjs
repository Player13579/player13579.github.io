export const VERSION_ID='bottle-shards-cleanroom-sol61-r1';
export const DURATION_MS=1700;
export const SFX_OFFSET_MS=0;
export const SFX_DURATION_MS=1050;
export const UNIFORM_FLOATS=16;
export const SHARD_COUNT=5;
export const GRAVITY=430;
export const VARIANTS=Object.freeze(['mercury','lead','mineral-water','seawater','antidote','molotov','ice','heated-water'].map((id,index)=>Object.freeze({index,id,label:id,durationMs:DURATION_MS})));
export const MODEL=Object.freeze({
 starts:Object.freeze([[-3,0,4],[0,1,7],[3,-2,8],[-1,2,5],[2,-1,3]].map(Object.freeze)),
 velocities:Object.freeze([[-92,-12,105],[-45,30,138],[20,-34,92],[62,22,120],[87,-8,76]].map(Object.freeze)),
 sizes:Object.freeze([[7,8],[8,10],[6,9],[7,7],[5,8]].map(Object.freeze)),
 angles:Object.freeze([-.7,.4,1.8,-1.1,2.3]),spins:Object.freeze([5.2,-4.1,6.3,-5.7,4.4])
});
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(x,k)=>{if(!Number.isFinite(x))throw new TypeError(k+' finite required');return x;};
function validateVariant(v){if(!Number.isInteger(v)||v<0||v>=8)throw new RangeError('variantIndex0..7 required');return v;}
export function durationForVariant(v=0){validateVariant(v);return DURATION_MS;}
export function phaseAt(ageMs,v=0){
 finite(ageMs,'ageMs');durationForVariant(v);
 if(ageMs<0)return 'before';if(ageMs>=DURATION_MS)return 'expired';
 if(ageMs<85)return 'fracture';if(ageMs<760)return 'flight-contact';if(ageMs<1000)return 'settle';
 if(ageMs<1350)return 'rest';return 'fade';
}
function physicalDefinition(index,v){
 if(!Number.isInteger(index)||index<0||index>=SHARD_COUNT)throw new RangeError('shardIndex');
 validateVariant(v);const mass=1+.035*(v-3.5);
 const velocity=MODEL.velocities[index].map(x=>x/Math.sqrt(mass));
 const start=MODEL.starts[index];
 const first=(velocity[2]+Math.sqrt(velocity[2]**2+2*GRAVITY*start[2]))/GRAVITY;
 const incoming=GRAVITY*first-velocity[2],up=incoming*.26,second=first+2*up/GRAVITY;
 return{mass,velocity,start,first,second,up};
}
function localVertex(i,k){
 const[w,h]=MODEL.sizes[i];
 const points=i===1?[[-.35*w,-.8*h],[.35*w,-.8*h],[.70*w,.65*h],[-.62*w,.60*h]]:
 [[-.70*w,-.45*h],[.65*w,-.60*h],[.50*w,.55*h],[-.35*w,.70*h]];
 return points[k];
}
function rotateVertex([x,y],yaw,tilt){return[Math.cos(yaw)*x-Math.sin(yaw)*Math.cos(tilt)*y,Math.sin(yaw)*x+Math.cos(yaw)*Math.cos(tilt)*y,Math.sin(tilt)*y];}
export function shardStateAt(ageMs,index,v=0,reducedMotion=false){
 finite(ageMs,'ageMs');const d=physicalDefinition(index,v),t=Math.max(0,Math.min(DURATION_MS/1000,ageMs/1000));
 const{start,velocity,first,second,up}=d;
 let x=start[0]+velocity[0]*t,y=start[1]+velocity[1]*t,z=start[2]+velocity[2]*t-.5*GRAVITY*t*t;
 let vx=velocity[0],vy=velocity[1],vz=velocity[2]-GRAVITY*t,contactPhase='first-flight';
 if(t>=first){
  const dt=t-first,p0=[start[0]+velocity[0]*first,start[1]+velocity[1]*first];
  if(t<second){x=p0[0]+velocity[0]*.62*dt;y=p0[1]+velocity[1]*.62*dt;z=up*dt-.5*GRAVITY*dt*dt;vx*=.62;vy*=.62;vz=up-GRAVITY*dt;contactPhase='bounce';}
  else{const slide=t-second,travel=(1-Math.exp(-7*slide))/7;
   x=p0[0]+velocity[0]*.62*(second-first)+velocity[0]*.31*travel;
   y=p0[1]+velocity[1]*.62*(second-first)+velocity[1]*.31*travel;z=0;
   vx=velocity[0]*.31*Math.exp(-7*slide);vy=velocity[1]*.31*Math.exp(-7*slide);vz=0;contactPhase='slide-rest';}
 }
 const yaw=MODEL.angles[index]+v*.071+(reducedMotion?0:MODEL.spins[index]*Math.min(t,second));
 const laid=clamp((t-first)/(second-first+.07));
 const tilt=(.72+index*.19+(reducedMotion?0:Math.sin(t*MODEL.spins[index])*.48))*(1-laid);
 const local=Array.from({length:4},(_,k)=>rotateVertex(localVertex(index,k),yaw,tilt));
 const minZ=Math.min(...local.map(p=>p[2]));
 const center=[x,y,z-minZ];
 const vertices=local.map(p=>p.map((n,j)=>n+center[j]));
 return{position:[x,y,z],center,velocity:[vx,vy,vz],yaw,tilt,vertices,contactPhase,firstContactMs:first*1000,secondContactMs:second*1000,mass:d.mass};
}
export function contactPlan(v=0){
 validateVariant(v);const events=[];
 for(let i=0;i<SHARD_COUNT;i++){const d=physicalDefinition(i,v),frequency=3300*d.mass*(7/MODEL.sizes[i][0])**2;
  events.push({shardIndex:i,order:1,timeMs:d.first*1000,frequency,amplitude:.047});
  events.push({shardIndex:i,order:2,timeMs:d.second*1000,frequency:frequency*1.07,amplitude:.023});}
 return events.sort((a,b)=>a.timeMs-b.timeMs);
}
export function frameState(input={},actorAspect=134/222){
 const{width,height,dpr=1,impactCenterCss=[610,342],actorCenterCss=[490,310],actorHeightCss=64,
 ageMs=0,variantIndex=0,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}=input;
 durationForVariant(variantIndex);
 for(const[k,v]of Object.entries({width,height,dpr,actorHeightCss,actorAspect,ageMs}))finite(v,k);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||dpr<=0||actorHeightCss<=0||actorAspect<=0)throw new RangeError('positive backing dimensions and scales');
 for(const[k,p]of Object.entries({impactCenterCss,actorCenterCss})){if(!Array.isArray(p)||p.length!==2)throw new TypeError(k+' pair');p.forEach(x=>finite(x,k));}
 for(const[k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))if(typeof v!=='boolean')throw new TypeError(k+' boolean');
 const active=sourceOn&&mainOn&&ageMs>=0&&ageMs<DURATION_MS;
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...impactCenterCss,...actorCenterCss,actorHeightCss,actorAspect,
 +active,+(active&&observerOn),+showActor,+reducedMotion,variantIndex,DURATION_MS/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return{active,phase:phaseAt(ageMs,variantIndex),variantIndex,durationMs:DURATION_MS,uniforms};
}

const SHADER_BODY="\noverride TARGET_ENCODE:u32=1u;\nstruct U{view:vec4f,origins:vec4f,config:vec4f,state:vec4f};\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\nstruct VOut{@builtin(position) p:vec4f};\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{\n var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:VOut;o.p=vec4f(p[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn cross2(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}\nfn localVertex(i:u32,k:u32)->vec2f{\n let w=SIZES[i].x;let h=SIZES[i].y;\n var corners=array<vec2f,4>(vec2f(-.70*w,-.45*h),vec2f(.65*w,-.60*h),vec2f(.50*w,.55*h),vec2f(-.35*w,.70*h));\n if(i==1u){corners=array<vec2f,4>(vec2f(-.35*w,-.8*h),vec2f(.35*w,-.8*h),vec2f(.70*w,.65*h),vec2f(-.62*w,.60*h));}\n return corners[k];\n}\nstruct Piece{position:vec3f,yaw:f32,tilt:f32};\nfn pieceAt(t:f32,i:u32,variant:f32)->Piece{\n let mass=1.+.035*(variant-3.5);\n let velocity=VELOCITIES[i]/sqrt(mass);\n let start=STARTS[i];\n let tc=(velocity.z+sqrt(velocity.z*velocity.z+2.*430.*start.z))/430.;\n let incoming=430.*tc-velocity.z;\n let up=incoming*.26;\n let tb=2.*up/430.;\n var position=start+velocity*t+vec3f(0.,0.,-.5*430.*t*t);\n if(t>=tc){\n  let dt=t-tc;\n  let p0=start.xy+velocity.xy*tc;\n  if(dt<tb){position=vec3f(p0+velocity.xy*.62*dt,up*dt-.5*430.*dt*dt);}\n  else{\n   let slide=t-tc-tb;\n   position=vec3f(p0+velocity.xy*.62*tb+velocity.xy*.31*(1.-exp(-7.*slide))/7.,0.);\n  }\n }\n let spinTime=min(t,tc+tb);\n let yaw=ANGLES[i]+variant*.071+select(SPINS[i]*spinTime,0.,u.state.y>.5);\n let airborneTilt=.72+f32(i)*.19+sin(t*SPINS[i])*.48;\n let laid=clamp((t-tc)/(tb+.07),0.,1.);\n var tilt=airborneTilt*(1.-laid);\n if(u.state.y>.5){tilt=(.72+f32(i)*.19)*(1.-laid);}\n var out:Piece;out.position=position;out.yaw=yaw;out.tilt=tilt;return out;\n}\nfn rotated(v:vec2f,yaw:f32,tilt:f32)->vec3f{\n let c=cos(yaw);let s=sin(yaw);let ct=cos(tilt);\n return vec3f(c*v.x-s*ct*v.y,s*v.x+c*ct*v.y,sin(tilt)*v.y);\n}\nfn project(v:vec3f)->vec2f{return vec2f(v.x,.36*v.y-v.z);}\nfn quadMask(p:vec2f,v:array<vec2f,4>,aa:f32)->vec2f{\n let orientation=select(-1.,1.,cross2(v[1]-v[0],v[2]-v[1])>=0.);\n var distance=-100000.;var edge=100000.;\n for(var k=0u;k<4u;k=k+1u){\n  let a=v[k];let b=v[(k+1u)%4u];let d=-orientation*cross2(b-a,p-a)/max(length(b-a),.001);\n  distance=max(distance,d);edge=min(edge,abs(d));\n }\n let coverage=1.-smoothstep(-aa,aa,distance);\n return vec2f(coverage,exp(-edge*edge/1.8)*coverage);\n}\nfn glassColor(normal:vec3f,thickness:f32)->vec4f{\n let V=normalize(vec3f(0.,1.,.36));\n let N=select(normal,-normal,dot(normal,V)<0.);\n let L=normalize(vec3f(-.45,-.4,1.));\n let H=normalize(V+L);\n let nv=max(dot(N,V),.001);let nl=max(dot(N,L),0.);\n let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);\n let f0=pow((1.52-1.)/(1.52+1.),2.);\n let fresnel=f0+(1.-f0)*pow(1.-nv,5.);\n let alpha=.17*.17;\n let denom=nh*nh*(alpha*alpha-1.)+1.;\n let D=alpha*alpha/(3.14159265*denom*denom);\n let k=pow(.17+1.,2.)/8.;\n let G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));\n let F=f0+(1.-f0)*pow(1.-vh,5.);\n let spec=D*G*F/max(4.*nv*max(nl,.001),.001);\n let R=reflect(-V,N);\n let environment=mix(vec3f(.07,.09,.095),vec3f(.43,.56,.60),clamp(R.z*.5+.5,0.,1.));\n let transmit=exp(-vec3f(.035,.015,.023)*thickness/max(nv,.15));\n let interior=transmit*vec3f(.30,.43,.42)*.20;\n let radiance=environment*fresnel+vec3f(1.,.97,.87)*spec*nl*.32+interior*(1.-fresnel);\n let opacity=clamp(.10+fresnel*.70+(1.-dot(transmit,vec3f(.333333)))*.35,.10,.88);\n return vec4f(radiance,opacity);\n}\n@fragment fn fs(o:VOut)->@location(0) vec4f{\n let css=o.p.xy/u.view.z;\n let scale=u.config.x/64.;\n let p=(css-u.origins.xy)/scale;\n let t=clamp(u.view.w,0.,u.state.w);\n let sourceEnabled=u.config.z;\n let fade=(1.-smoothstep(u.state.w-.35,u.state.w,t))*sourceEnabled;\n let variant=u.state.z;\n let flash=exp(-t/.026)*(1.-smoothstep(.070,.105,t))*sourceEnabled;\n let aa=max(.65,.8/(u.view.z*scale));\n var pieces:array<Piece,5>;var order=array<u32,5>(0u,1u,2u,3u,4u);\n var depth:array<f32,5>;\n for(var i=0u;i<5u;i=i+1u){\n  pieces[i]=pieceAt(t,i,variant);\n  depth[i]=pieces[i].position.y+pieces[i].position.z*.36;\n }\n // Stable back-to-front transparent material order under the declared orthographic view.\n for(var a=0u;a<5u;a=a+1u){for(var b=a+1u;b<5u;b=b+1u){\n  if(depth[order[a]]>depth[order[b]]){let swap=order[a];order[a]=order[b];order[b]=swap;}\n }}\n var world=vec4f(0.);\n // Local ground contact shadows, not a new painted floor.\n for(var i=0u;i<5u;i=i+1u){\n  let center=project(vec3f(pieces[i].position.xy,0.));\n  let q=(p-center)/vec2f(SIZES[i].x*.8,SIZES[i].y*.25);\n  let shadow=exp(-dot(q,q))*exp(-max(pieces[i].position.z,0.)/12.)*.18*fade;\n  world=over(vec4f(vec3f(.025)*shadow,shadow),world);\n }\n // Finite fracture-edge emission required for this E; no flame or independent sparks.\n let contact=exp(-pow(p.x/6.,2.)-pow(p.y/1.4,2.))*flash;\n world=over(vec4f(vec3f(1.,.95,.76)*contact*.82,contact*.82),world);\n for(var n=0u;n<5u;n=n+1u){\n  let i=order[n];let part=pieces[i];\n  var local:array<vec3f,4>;var projected:array<vec2f,4>;\n  var minZ=10000.;\n  for(var k=0u;k<4u;k=k+1u){local[k]=rotated(localVertex(i,k),part.yaw,part.tilt);minZ=min(minZ,local[k].z);}\n  let center=part.position+vec3f(0.,0.,-minZ);\n  for(var k=0u;k<4u;k=k+1u){projected[k]=project(center+local[k]);}\n  let mask=quadMask(p,projected,aa);\n  let normal=vec3f(sin(part.yaw)*sin(part.tilt),-cos(part.yaw)*sin(part.tilt),cos(part.tilt));\n  let material=glassColor(normal,1.+.035*(variant-3.5));\n  let edgeTint=vec3f(.63,.84,.79);\n  let radiance=material.rgb+edgeTint*mask.y*.20+vec3f(1.,.94,.73)*flash*mask.y*2.4;\n  let color=vec3f(1.)-exp(-radiance);\n  let opacity=clamp(material.a+mask.y*.30+flash*mask.y*.35,0.,.96)*mask.x*fade;\n  world=over(vec4f(color*opacity,opacity),world);\n }\n // OBS1 source-bound local sensor spread, only during the fracture light.\n let bloom=exp(-pow(p.x/10.,2.)-pow(p.y/4.5,2.))*flash*u.config.w*.27;\n world=over(vec4f(vec3f(1.,.94,.76)*bloom,bloom),world);\n // Actor is a separate baseline scale reference, never a target or optical source.\n let actorP=css-u.origins.zw;\n let uv=actorP/vec2f(u.config.x*u.config.y,u.config.x)+vec2f(.5);\n let tex=textureSample(actorTex,actorSampler,clamp(uv,vec2f(0.),vec2f(1.)));\n let support=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n let actorA=tex.a*support*u.state.x;\n let actor=vec4f(decode(tex.rgb)*actorA,actorA);\n let result=over(actor,world);\n if(result.a<=.000001){return vec4f(0.);}\n if(TARGET_ENCODE==1u){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";

const f32=x=>Number.isInteger(x)?x.toFixed(1):String(x);
const vectors=(name,rows)=>'const '+name+'=array<vec'+rows[0].length+'f,'+rows.length+'>('+rows.map(a=>'vec'+a.length+'f('+a.map(f32).join(',')+')').join(',')+');\n';
const scalarArray=(name,items)=>'const '+name+'=array<f32,'+items.length+'>('+items.map(f32).join(',')+');\n';
export const WGSL=vectors('STARTS',MODEL.starts)+vectors('VELOCITIES',MODEL.velocities)+vectors('SIZES',MODEL.sizes)+scalarArray('ANGLES',MODEL.angles)+scalarArray('SPINS',MODEL.spins)+SHADER_BODY;

export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw new TypeError('target format');
 finite(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
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
 fragment:{module:shader,entryPoint:'fs',constants:{TARGET_ENCODE:format.endsWith('-srgb')||format==='rgba16float'?0:1},targets:[{format,blend:{
 color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
 {binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},
 {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){buffer.destroy();throw error;}
 let disposing=false,disposePromise=null,frames=0;
 const dispose=()=>{
 if(disposePromise)return disposePromise;disposing=true;
 disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
 buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();return disposePromise;
 };
 return{diagnostics,diagnosticsReady,render(input){
 if(disposing)throw new Error('renderer disposed');
 if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view');
 const s=frameState(input,actorAspect);device.queue.writeBuffer(buffer,0,s.uniforms);
 const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
 return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,durationMs:s.durationMs,framesRecorded:frames,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
 },dispose,destroy:dispose};
}
export function synthesizeSfx(sampleRate=48000,v=0){
 validateVariant(v);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const n=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(n),contacts=contactPlan(v);
 let seed=(0x16bc9a37+v*0x129f)>>>0,low=0;
 const thickness=1+.035*(v-3.5);
 for(let i=0;i<n;i++){
 const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
 const noise=(seed>>>0)/2147483648-1;low+=.085*(noise-low);const high=noise-low;
 let value=.29*high*Math.exp(-t/.012)+.14*Math.sin(2*Math.PI*2850*thickness*t)*Math.exp(-t/.028)+
 .09*Math.sin(2*Math.PI*4630*thickness*t)*Math.exp(-t/.016);
 for(const c of contacts){const dt=t-c.timeMs/1000;
 if(dt>=0)value+=c.amplitude*(Math.sin(2*Math.PI*c.frequency*dt)*Math.exp(-dt/.032)+
 .34*Math.sin(2*Math.PI*c.frequency*1.71*dt)*Math.exp(-dt/.014)+.42*high*Math.exp(-dt/.003));}
 pcm[i]=value*clamp((n-1-i)/(sampleRate*.065));
 }return pcm;
}
