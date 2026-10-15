export const WGSL="\nstruct Uniforms { viewport: vec4f, actor: vec4f, gates: vec4f, field: vec4f };\n@group(0) @binding(0) var<uniform> u: Uniforms;\n@group(0) @binding(1) var actorTex: texture_2d<f32>;\n@group(0) @binding(2) var actorSampler: sampler;\nstruct VSOut { @builtin(position) p: vec4f };\n@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {\n  var p = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));\n  var out: VSOut; out.p=vec4f(p[i],0.0,1.0); return out;\n}\nfn decode(c: vec3f) -> vec3f {\n return select(c/12.92,pow((c+vec3f(0.055))/1.055,vec3f(2.4)),c>vec3f(0.04045));\n}\nfn encode(c: vec3f) -> vec3f {\n let x=max(c,vec3f(0.0));\n return select(x*12.92,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));\n}\nfn segment(p:vec2f,a:vec2f,b:vec2f)->f32{\n let v=b-a; return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),0.0001),0.0,1.0));\n}\nfn over(f:vec4f,b:vec4f)->vec4f { return f+b*(1.0-f.a); }\nfn lightLayer(coverage:f32, color:vec3f, radiance:f32)->vec4f{\n let a=clamp(coverage,0.0,1.0);\n return vec4f((vec3f(1.0)-exp(-color*radiance))*a,a);\n}\n@fragment fn fs(in:VSOut)->@location(0) vec4f{\n let css=in.p.xy/u.viewport.z;\n let p=css-u.actor.xy;\n let r=length(p); let aa=max(0.65,0.8/u.viewport.z);\n let age=u.viewport.w; let on=u.gates.x; let energy=u.field.z*on;\n let R=u.field.x; let angle=u.field.y;\n let theta=atan2(p.y,p.x);\n // PH1: finite spherical time boundary, front silhouette in orthographic projection.\n // Density and radiance are independent. No texture or background sampling creates the field.\n let shell=1.0-smoothstep(1.45,1.45+aa,abs(r-R));\n let inner=1.0-smoothstep(0.65,0.65+aa,abs(r-(R-6.0)));\n let seamGap=clamp((age-4560.0)/440.0,0.0,1.0)*0.58;\n let seam=select(1.0,0.0,abs(sin(theta))<seamGap);\n var core=(shell*0.88+inner*0.30)*seam;\n // Eight finite phase markers belong to the boundary, not numbers or clock-face artwork.\n for(var j=0u;j<8u;j=j+1u){\n  let a=f32(j)*0.78539816339;\n  let v=vec2f(cos(a),sin(a));\n  let d=segment(p,v*(R-18.0),v*(R-9.0));\n  core=max(core,(1.0-smoothstep(1.4,1.4+aa,d))*0.72);\n }\n // PH1 internal transported phase front brakes to one fixed bearing by 650ms.\n let v=vec2f(cos(angle),sin(angle));\n let sweep=1.0-smoothstep(2.1,2.1+aa,segment(p,v*(R*0.55),v*(R-12.0)));\n core=max(core,sweep*0.94);\n // Three broad phase lamellae give angular motion a measurable, arrested history.\n for(var j=0u;j<3u;j=j+1u){\n  let a=angle+1.6+f32(j)*1.83;\n  let t=abs(atan2(sin(theta-a),cos(theta-a)));\n  let band=1.0-smoothstep(2.4,2.4+aa,abs(r-(R*0.73)));\n  core=max(core,band*(1.0-smoothstep(0.12,0.23,t))*0.82);\n }\n let amber=vec3f(1.0,0.53,0.105);\n let cream=vec3f(1.0,0.88,0.48);\n let hue=mix(amber,cream,clamp((r/R-0.65)/0.35,0.0,1.0));\n var field=lightLayer(core*energy*0.86,hue,3.2);\n // OBS1: chosen local sensor spread from the same source; not a second world rim.\n let glow=exp(-pow(abs(r-R)/7.0,2.0))*seam*0.30\n        +exp(-pow(segment(p,v*(R*0.55),v*(R-12.0))/6.0,2.0))*0.22;\n let obs=lightLayer(glow*energy*u.gates.y,amber,2.0);\n field=over(field,obs);\n let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(0.5);\n // Always sample with defined derivatives, then mask support. Straight sRGB input is decoded once.\n let texel=textureSample(actorTex,actorSampler,clamp(uv,vec2f(0.0),vec2f(1.0)));\n let support=select(0.0,1.0,all(uv>=vec2f(0.0))&&all(uv<=vec2f(1.0)));\n let actorA=texel.a*support*u.gates.z;\n var actorRGB=decode(texel.rgb);\n // PH2: weak source-facing diffuse response only where actual actor alpha exists.\n // A registered flat-body approximation; no invented reflective geometry or uniform rim.\n let side=pow(clamp(0.5+dot(uv-vec2f(0.5),v),0.0,1.0),2.0);\n actorRGB=actorRGB+amber*energy*0.17*side;\n let actor=vec4f(actorRGB*actorA,actorA);\n var result=over(actor,field);\n if(result.a<=0.000001){ return vec4f(0.0); }\n let straight=result.rgb/result.a;\n // Host supplies target format. Non-sRGB target needs display encoding here.\n if(u.field.w>0.5){ return vec4f(encode(straight)*result.a,result.a); }\n return result;\n}\n";
// Fresh TimeKeeper activation R1. No old creative source, image, shader or audio inputs.
export const VERSION_ID='timekeeper-activation-cleanroom-sol61-r1';
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
