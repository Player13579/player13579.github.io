export const WGSL="\nstruct Uniforms { viewport: vec4f, actor: vec4f, gates: vec4f, field: vec4f };\n@group(0) @binding(0) var<uniform> u: Uniforms;\n@group(0) @binding(1) var actorTex: texture_2d<f32>;\n@group(0) @binding(2) var actorSampler: sampler;\nstruct VSOut { @builtin(position) p: vec4f };\n@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {\n  var p = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n  var out: VSOut; out.p=vec4f(p[i],0.0,1.0); return out;\n}\nfn decode(c: vec3f) -> vec3f {\n return select(c/12.92,pow((c+vec3f(0.055))/1.055,vec3f(2.4)),c>vec3f(0.04045));\n}\nfn encode(c: vec3f) -> vec3f {\n let x=max(c,vec3f(0.0));\n return select(x*12.92,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));\n}\nfn segment(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a; return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),0.0001),0.0,1.0));\n}\nfn over(f:vec4f,b:vec4f)->vec4f { return f+b*(1.0-f.a); }\nfn lightLayer(coverage:f32, color:vec3f, radiance:f32)->vec4f{\n let a=clamp(coverage,0.0,1.0);\n return vec4f((vec3f(1.0)-exp(-color*radiance))*a,a);\n}\n// Graded finite radial-squared shell: both physical surfaces have zero density.\n// Fixed-radius total density mass matches the old uniform shell; no temporal/flux theorem.\nfn gradedShellNormalization(R:f32)->f32{\n let q=(1.45*1.45)/(R*R);\n return (2.+(2./3.)*q)/((4./3.)+(8./15.)*q-(4./105.)*(q*q));\n}\n// Positive3GL is exact in real arithmetic for the ray's quartic density.\nfn gradedShellInterval(point:vec3f,direction:vec3f,R:f32,lo:f32,hi:f32)->f32{\n if(hi<=lo){return 0.;}\n let midpoint=(lo+hi)*.5;let intervalHalf=(hi-lo)*.5;\n let center=point+direction*midpoint;let denominator=2.*R*1.45;\n let u0=(dot(center,center)-(R*R+1.45*1.45))/denominator;\n let slope=2.*intervalHalf*dot(center,direction)/denominator;\n let curvature=intervalHalf*intervalHalf/denominator;\n let um=u0-slope*.7745966692414834+curvature*.6;\n let up=u0+slope*.7745966692414834+curvature*.6;\n let sum=(5./9.)*max(0.,1.-um*um)+(8./9.)*max(0.,1.-u0*u0)+(5./9.)*max(0.,1.-up*up);\n return intervalHalf*gradedShellNormalization(R)*sum;\n}\nfn gradedShellPath(point:vec3f,direction:vec3f,R:f32,limit:f32)->f32{\n let b=dot(point,direction);let q=dot(point,point);\n let outer=R+1.45;let inner=R-1.45;\n let h=b*b+outer*outer-q;if(h<=0.){return 0.;}\n let root=sqrt(h);let lo=max(0.,-b-root);var hi=-b+root;\n if(limit>=0.){hi=min(hi,limit);}if(hi<=lo){return 0.;}\n let cavity=b*b+inner*inner-q;\n if(cavity<=0.){return gradedShellInterval(point,direction,R,lo,hi);}\n let c=sqrt(cavity);\n return gradedShellInterval(point,direction,R,lo,min(hi,-b-c))\n       +gradedShellInterval(point,direction,R,max(lo,-b+c),hi);\n}\n// Finite graded spherical shell: integrated density in one camera-side layer.\nfn cameraHalfPath(r:f32,R:f32)->f32 {\n let outer=R+1.45;let inner=R-1.45;\n let lo=sqrt(max(inner*inner-r*r,0.));let hi=sqrt(max(outer*outer-r*r,0.));\n return gradedShellInterval(vec3f(r,0.,0.),vec3f(0.,0.,1.),R,lo,hi);\n}\nfn shellLayer(path:f32,energy:f32,color:vec3f)->vec4f {\n let a=1.0-exp(-.018*path*energy);\n return vec4f(color*1.4*a,a);\n}\n// Complete integrated density in the same finite shell, including cavity/material/outside origins.\nfn shellRayPath(point:vec3f,direction:vec3f,R:f32)->f32 {return gradedShellPath(point,direction,R,-1.);}\nfn shellReflection(point:vec2f,R:f32,energy:f32)->f32 {\n var irradiance=0.0;\n // Eight equal-solid-angle hemisphere nodes; +Z is the declared flat receiver normal.\n for(var k=0u;k<2u;k=k+1u){for(var j=0u;j<4u;j=j+1u){\n  let mu=.25+.5*f32(k);let a=(f32(j)+.5)*1.5707963268;\n  let q=sqrt(1.0-mu*mu);let direction=vec3f(q*cos(a),q*sin(a),mu);\n  let distance=shellRayPath(vec3f(point,0.0),direction,R);\n  let radiance=1.4*(1.0-exp(-.018*distance*energy));\n  irradiance+=radiance*mu*.7853981634;\n }}\n return irradiance/3.1415926536;\n}\n\nfn phaseCore(p:vec2f,R:f32,angle:f32)->f32 {\n let r=length(p);let theta=atan2(p.y,p.x);var core=0.;\n for(var j=0u;j<8u;j++){let a=f32(j)*.78539816339;let v=vec2f(cos(a),sin(a));let d=segment(p,v*(R-18.),v*(R-9.));core=max(core,(1.-smoothstep(1.4,2.2,d))*.72);}\n let v=vec2f(cos(angle),sin(angle));core=max(core,(1.-smoothstep(2.1,2.9,segment(p,v*(R*.55),v*(R-12.))))*.94);\n for(var j=0u;j<3u;j++){let a=angle+1.6+f32(j)*1.83;let t=abs(atan2(sin(theta-a),cos(theta-a)));let band=1.-smoothstep(2.4,3.2,abs(r-R*.73));core=max(core,band*(1.-smoothstep(.12,.23,t))*.82);}return core;\n}\nfn phaseHue(p:vec2f,R:f32)->vec3f {return mix(vec3f(1.,.53,.105),vec3f(1.,.88,.48),clamp((length(p)/R-.65)/.35,0.,1.));}\nfn phaseRadiance(p:vec2f,R:f32,angle:f32,energy:f32)->vec3f {return (vec3f(1.)-exp(-phaseHue(p,R)*3.2))*phaseCore(p,R,angle)*energy*.86;}\nstruct PhaseDomain {axis:vec2f,angle:f32,center:f32,half:f32,radius:f32,lo:f32,hi:f32,area:f32,kind:u32};\nfn phaseDomain(index:u32,R:f32,angle:f32)->PhaseDomain {\n var d:PhaseDomain;d.angle=angle;d.kind=0u;\n if(index<8u){d.angle=f32(index)*.78539816339;d.center=R-13.5;d.half=6.7;d.radius=2.2;d.area=13.4*4.4;}\n else if(index==8u){d.center=.775*R-6.;d.half=(.45*R-12.)*.5+2.9;d.radius=2.9;d.area=d.half*2.*5.8;}\n else {d.kind=1u;d.angle=angle+1.6+f32(index-9u)*1.83;d.lo=R*.73-3.2;d.hi=R*.73+3.2;d.area=.5*(d.hi*d.hi-d.lo*d.lo)*.46;}\n d.axis=vec2f(cos(d.angle),sin(d.angle));return d;\n}\nfn phaseInside(p:vec2f,d:PhaseDomain)->bool {\n if(d.kind==0u){return abs(dot(p,d.axis)-d.center)<=d.half&&abs(p.y*d.axis.x-p.x*d.axis.y)<=d.radius;}\n let r=length(p);let a=abs(atan2(p.y*d.axis.x-p.x*d.axis.y,dot(p,d.axis)));return r>=d.lo&&r<=d.hi&&a<=.23;\n}\nfn phaseSample(d:PhaseDomain,u:f32,v:f32)->vec2f {\n if(d.kind==0u){let x=d.center+(2.*u-1.)*d.half;let y=(2.*v-1.)*d.radius;return vec2f(d.axis.x*x-d.axis.y*y,d.axis.y*x+d.axis.x*y);}\n let r=sqrt(mix(d.lo*d.lo,d.hi*d.hi,v));let a=d.angle+(2.*u-1.)*.23;return vec2f(cos(a),sin(a))*r;\n}\nfn shellSegmentPath(point:vec3f,direction:vec3f,R:f32,limit:f32)->f32 {return gradedShellPath(point,direction,R,limit);}\n// Continuous positive partition uses the actual finite source component, not proposal membership.\nfn phaseComponent(index:u32,p:vec2f,R:f32,angle:f32)->f32 {\n if(index<8u){let a=f32(index)*.78539816339;let v=vec2f(cos(a),sin(a));let d=segment(p,v*(R-18.),v*(R-9.));return (1.-smoothstep(1.4,2.2,d))*.72;}\n if(index==8u){let v=vec2f(cos(angle),sin(angle));return (1.-smoothstep(2.1,2.9,segment(p,v*(R*.55),v*(R-12.))))*.94;}\n let r=length(p);let theta=atan2(p.y,p.x);let a=angle+1.6+f32(index-9u)*1.83;\n let t=abs(atan2(sin(theta-a),cos(theta-a)));let band=1.-smoothstep(2.4,3.2,abs(r-R*.73));return band*(1.-smoothstep(.12,.23,t))*.82;\n}\nfn phaseReflection(point:vec2f,R:f32,energy:f32,angle:f32)->vec3f {\n if(energy<=0.){return vec3f(0.);}var domains:array<PhaseDomain,12>;for(var k=0u;k<12u;k++){domains[k]=phaseDomain(k,R,angle);}\n let nodes=array<f32,4>(.069431844203,.330009478208,.669990521792,.930568155797);let weights=array<f32,4>(.173927422569,.326072577431,.326072577431,.173927422569);\n let outer=R+1.45;var reflected=vec3f(0.);\n for(var k=0u;k<12u;k++){for(var a=0u;a<4u;a++){for(var b=0u;b<4u;b++){\n  let p=phaseSample(domains[k],nodes[a],nodes[b]);var pdfSum=0.;var ownComponent=0.;\n  for(var j=0u;j<12u;j++){let c=phaseComponent(j,p,R,angle);pdfSum+=c/domains[j].area;if(j==k){ownComponent=c;}}\n  if(pdfSum<=0.){continue;}\n  let z=sqrt(max(0.,outer*outer-dot(p,p)));if(z<=0.){continue;}\n  let source=vec3f(p,z);let delta=source-vec3f(point,0.);let distanceSquared=dot(delta,delta);let distance=sqrt(distanceSquared);let direction=delta/distance;\n  let sourceCosine=abs(dot(source/outer,direction));let receiverCosine=max(direction.z,0.);let areaJacobian=outer/z;\n  let path=shellSegmentPath(vec3f(point,0.),direction,R,distance);let transmission=exp(-.018*energy*path);let weight=weights[a]*weights[b]*ownComponent/pdfSum;\n  reflected+=phaseRadiance(p,R,angle,energy)*(sourceCosine*receiverCosine*areaJacobian*transmission*weight/(distanceSquared*3.1415926536));\n }}}return reflected;\n}\n\n@fragment fn fs(in:VSOut)->@location(0) vec4f{\n let css=in.p.xy/u.viewport.z;\n let p=css-u.actor.xy;\n let r=length(p); let aa=max(0.65,0.8/u.viewport.z);\n let age=u.viewport.w; let on=u.gates.x; let energy=u.field.z*on;\n let R=u.field.x; let angle=u.field.y;\n let theta=atan2(p.y,p.x);\n // PH1: finite-thickness source, analytic optical path and Beer attenuation.\n let halfPath=cameraHalfPath(r,R);\n let seam=1.0; // Release is density decay, with no disconnected screen-space aperture.\n let core=phaseCore(p,R,angle);\n let v=vec2f(cos(angle),sin(angle));\n let amber=vec3f(1.0,0.53,0.105);\n let cream=vec3f(1.0,0.88,0.48);\n let hue=phaseHue(p,R);\n let shellHalf=shellLayer(halfPath,energy,amber);\n var field=lightLayer(core*energy*0.86,hue,3.2);\n // OBS1 retains the same mass-matched Gaussian line opticalspread approximation.\n // Same geometry/clock; not an exact new graded-Beer PSF or conserved emitted flux.\n let glow=exp(-pow(abs(r-R)/7.0,2.0))*seam*0.30\n        +exp(-pow(segment(p,v*(R*0.55),v*(R-12.0))/6.0,2.0))*0.22;\n let obs=lightLayer(glow*energy*u.gates.y,amber,2.0);\n field=over(field,obs);\n let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(0.5);\n // Always sample with defined derivatives, then mask support. Straight sRGB input is decoded once.\n let texel=textureSample(actorTex,actorSampler,clamp(uv,vec2f(0.0),vec2f(1.0)));\n let support=select(0.0,1.0,all(uv>=vec2f(0.0))&&all(uv<=vec2f(1.0)));\n let actorA=texel.a*support*u.gates.z;\n var actorRGB=decode(texel.rgb);\n // PH2: Lambert reflection of the same shell source, restricted to actual actor alpha.\n // Registered plane at z=0 with +Z normal; no invented character-specific normal map.\n var phaseResponse=vec3f(0.);var shellResponse=0.;\n // Actor texture is sampled before this effect-local zero-domain work guard.\n if(actorA>0.&&energy>0.){phaseResponse=phaseReflection(p,R,energy,angle);shellResponse=shellReflection(p,R,energy);}\n actorRGB=actorRGB*(vec3f(1.0)+amber*shellResponse+phaseResponse);\n let actor=vec4f(actorRGB*actorA,actorA);\n let behind=over(actor,shellHalf);\n let front=over(field,shellHalf);\n var result=over(front,behind);\n if(result.a<=0.000001){ return vec4f(0.0); }\n let straight=result.rgb/result.a;\n // Host supplies target format. Non-sRGB target needs display encoding here.\n if(u.field.w>0.5){ return vec4f(encode(straight)*result.a,result.a); }\n return result;\n}\n";
export const VERSION_ID='timekeeper-activation-cleanroom-sol61-r5';
export const DURATION_MS=5000;
export const SFX_OFFSET_MS=0;
export const SFX_DURATION_MS=920;
export const UNIFORM_FLOATS=16;
export const WORLD_RADIUS=155;
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(v,name)=>{if(!Number.isFinite(v))throw new TypeError(name+' must be finite');return v;};
export function phaseAt(ageMs){
 finite(ageMs,'ageMs');
 if(ageMs<0)return 'before';
 if(ageMs>=DURATION_MS)return 'expired';
 if(ageMs<460)return 'propagate';
 if(ageMs<650)return 'arrest';
 if(ageMs<4560)return 'held';
 return 'release';
}
export function geometryAt(ageMs,reducedMotion=false){
 finite(ageMs,'ageMs');
 const age=clamp(ageMs/DURATION_MS)*DURATION_MS;
 const expansion=1-Math.pow(1-clamp(age/460),3);
 const brake=1-Math.pow(1-clamp(age/650),3);
 return {radius:reducedMotion?155:38+117*expansion,
  angle:reducedMotion?0.45:-2.30+2.75*brake,
  energy:ageMs<0||ageMs>=5000?0:
   Math.min(clamp(age/75),1-clamp((age-4560)/440)),
  angularVelocity:reducedMotion||age>=650?0:2.75*3*Math.pow(1-age/650,2)/650,
  radialVelocity:reducedMotion||age>=460?0:117*3*Math.pow(1-age/460,2)/460};
}
export function frameState(input={},actorAspect=134/222,targetSrgb=false){
 const {width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,
  sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false,direction=0}=input;
 finite(width,'width');finite(height,'height');finite(dpr,'dpr');finite(actorHeightCss,'actorHeightCss');
 finite(actorAspect,'actorAspect');finite(direction,'direction');finite(ageMs,'ageMs');
 if(width<=0||height<=0||!Number.isInteger(width)||!Number.isInteger(height)||dpr<=0||actorHeightCss<=0||actorAspect<=0)
  throw new RangeError('positive integer backing dimensions and positive scale required');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('actorCenterCss needs two CSS coordinates');
 actorCenterCss.forEach((x,i)=>finite(x,'actorCenterCss'+i));
 for(const [k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))
  if(typeof v!=='boolean')throw new TypeError(k+' must be boolean');
 const phase=phaseAt(ageMs),active=sourceOn&&mainOn&&ageMs>=0&&ageMs<DURATION_MS;
 const g=geometryAt(ageMs,reducedMotion);
 const uniforms=new Float32Array([width,height,dpr,ageMs,...actorCenterCss,actorHeightCss,actorAspect,
  +active,+(active&&observerOn),+showActor,+reducedMotion,g.radius,g.angle,active?g.energy:0,+!targetSrgb]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('uniform values must remain finite float32');
 return {phase,active,geometry:g,uniforms,actorVisible:showActor,observerActive:active&&observerOn};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||typeof format!=='string')throw new TypeError('device, format and actorTexture required');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))
  throw new TypeError('unsupported target format');
 finite(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const targetSrgb=format.endsWith('-srgb')||format==='rgba16float';
 const shader=device.createShaderModule({label:VERSION_ID+' shader',code:WGSL});
 const diagnostics={compilation:'PENDING',messages:[],error:null};
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{
  diagnostics.messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,
   linePos:m.linePos,offset:m.offset,length:m.length}));
  diagnostics.compilation=diagnostics.messages.some(m=>m.type==='error')?'FAILED':'COMPILATION_INFO_RECEIVED';
  return diagnostics;
 }).catch(error=>{diagnostics.compilation='FAILED';diagnostics.error=String(error);return diagnostics;});
 const uniform=device.createBuffer({label:VERSION_ID+' uniforms',size:64,usage:0x40|0x08});
 let pipeline,bind;
 try{
  pipeline=device.createRenderPipeline({label:VERSION_ID+' pipeline',layout:'auto',
   vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format,
    blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
     alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
   primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
   {binding:0,resource:{buffer:uniform}},{binding:1,resource:actorTexture.createView()},
   {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){uniform.destroy();throw error;}
 let disposing=false,disposed=false,disposePromise=null,frames=0;
 return {diagnostics,diagnosticsReady,
  render(encoder,targetView,input){
   if(disposing||disposed)throw new Error('renderer disposed');
   if(!encoder||!targetView)throw new TypeError('host encoder and targetView required');
   const state=frameState(input,actorAspect,targetSrgb);
   device.queue.writeBuffer(uniform,0,state.uniforms);
   const pass=encoder.beginRenderPass({label:VERSION_ID+' load composite',
    colorAttachments:[{view:targetView,loadOp:'load',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
   return {versionId:VERSION_ID,active:state.active,phase:state.phase,activePhase:state.phase,
    renderPasses:1,uniformBytes:64,framesRecorded:frames,submitted:false,
    gpuCompletion:'HOST_OWNED_NOT_OBSERVED',actorVisible:state.actorVisible,observerActive:state.observerActive};
  },
  dispose(){
   if(disposePromise)return disposePromise;
   disposing=true;
   disposePromise=(async()=>{
    try{await device.queue.onSubmittedWorkDone();}
    catch(error){if(!device.lost)throw error;await device.lost;}
    uniform.destroy();disposed=true;
    return {disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};
   })();
   return disposePromise;
  }
 };
}
// One deterministic synthesized cue, no AudioContext and no playback side effects.
// Boundary transport causes friction; 650ms phase arrest causes the short detent.
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate 8000..192000 integer');
 const pcm=new Float32Array(Math.round(sampleRate*SFX_DURATION_MS/1000));
 let seed=0x5a17c9e1,low=0,previous=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;
  low+=0.095*(noise-low);
  const grain=low-previous;previous=low;
  const arrest=clamp(t/0.65);
  const friction=Math.pow(1-arrest,0.5)*(1-Math.exp(-t/0.008))*Math.exp(-t/1.1);
  // Contact roughness slows as the phase front approaches its fixed bearing.
  const rough=(0.56+0.44*Math.sin(2*Math.PI*(71*t-44*t*t)));
  const drag=(0.50*grain+0.24*low)*friction*rough;
  const dt=t-0.65;
  const latch=dt>=0?(0.21*Math.exp(-dt/0.014)*noise+
   0.18*Math.sin(2*Math.PI*187*dt)*Math.exp(-dt/0.048)+
   0.08*Math.sin(2*Math.PI*431*dt)*Math.exp(-dt/0.025)):0;
  const end=clamp((pcm.length-1-i)/(sampleRate*0.06));
  pcm[i]=(drag+latch)*end;
 }
 return pcm;
}
