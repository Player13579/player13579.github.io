export const VERSION_ID='idea-progression-cleanroom-sol61-r5';
export const DURATION_MS=5200, SFX_OFFSET_MS=180, SFX_DURATION_MS=1100, UNIFORM_FLOATS=16;
export const VARIANTS=Object.freeze([{index:0,event:'idea-truth',radius:135},{index:1,event:'idea-beauty',radius:145},{index:2,event:'idea-good',radius:185},{index:3,event:'idea-ascension',radius:260}]);
export function durationForVariant(variantIndex=0){if(!Number.isInteger(variantIndex)||variantIndex<0||variantIndex>3)throw Error('variantIndex0..3 required');return variantIndex===3?5200:1800;}
export function phaseAt(ageMs,variantIndex=0){const limit=durationForVariant(variantIndex);ageMs=ageMs*5000/limit;return ageMs<0||ageMs>=5000?'idle':ageMs<700?'formation':ageMs<1800?'organization':ageMs<4000?'held-confirmation':'settle';}
export function frameState({width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false,direction=1,variantIndex=0}={}){
 if(![width,height,dpr,actorHeightCss,...actorCenterCss,ageMs].every(Number.isFinite)||width<=0||height<=0||dpr<=0||actorHeightCss<=0)throw Error('Invalid viewport, actor registration or age');
 if(!Number.isInteger(variantIndex)||variantIndex<0||variantIndex>3)throw Error('variantIndex must match a real Idea event 0..3');
 const durationMs=durationForVariant(variantIndex);const active=sourceOn&&mainOn&&ageMs>=0&&ageMs<durationMs;
 return{active,phase:active?phaseAt(ageMs,variantIndex):'idle',data:new Float32Array([width,height,dpr,ageMs/1000,actorCenterCss[0],actorCenterCss[1],actorHeightCss,active?1:0,observerOn?1:0,showActor?1:0,reducedMotion?1:0,direction<0?-1:1,0,0,variantIndex,durationMs/1000])};
}
export const WGSL=String.raw`
struct U {viewport:vec4f,actor:vec4f,flags:vec4f,config:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn encode(c:vec3f)->vec3f{let v=max(c,vec3f(0.));return select(12.92*v,1.055*pow(v,vec3f(1./2.4))-.055,v>vec3f(.0031308));}
fn actorAt(q:vec2f)->vec4f{let uv=vec2f(q.x*u.flags.w/u.config.x+.5,q.y+.5);if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(actorTex,actorSampler,uv,0.);}
fn bell(x:f32)->f32{return exp(-x*x);}
fn smoothCurve(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn spectrum(v:f32)->vec3f{if(v<.5){return vec3f(.16,.76,1.30);}if(v<1.5){return vec3f(1.05,.28,.82);}if(v<2.5){return vec3f(1.32,.87,.20);}return vec3f(1.4,1.18,.68);}
fn radiusScale(v:f32)->f32{let radii=array<f32,4>(135.,145.,185.,260.);return sqrt(radii[u32(v)]/135.);}
fn front(t:f32,v:f32)->f32{return mix(.43,-.46,smoothCurve(.08,1.48,t))*radiusScale(v);}
fn sheetMid(y:f32,z:f32,t:f32,v:f32)->f32{
 let alignment=smoothCurve(.24,1.60,t);let settle=smoothCurve(3.9,5.,t);
 let bend=select(.20,.12,v<.5);let motionScale=select(1.,.25,u.flags.z>.5);
 return bend*sin(y*5.2+z*7.5)*(1.-.44*alignment)*(1.-.7*settle)+.055*sin(z*12.)*(1.-alignment)*motionScale;
}
fn sheetNormal(y:f32,z:f32,t:f32,v:f32)->vec3f{let alignment=smoothCurve(.24,1.60,t);let settle=smoothCurve(3.9,5.,t);let bend=select(.20,.12,v<.5);let motionScale=select(1.,.25,u.flags.z>.5);let slopeTerm=bend*cos(y*5.2+z*7.5)*(1.-.44*alignment)*(1.-.7*settle);return normalize(vec3f(1.,-slopeTerm*5.2,-slopeTerm*7.5-.66*cos(z*12.)*(1.-alignment)*motionScale));}
// Same existing4.12..5 release, stable near5; physical extinction and emissivity share density.
fn mediumPresence(t:f32)->f32{return smoothCurve(0.,.88,5.-t);}
fn field(p:vec3f,t:f32,v:f32)->f32{
 let extent=.39*radiusScale(v);let settle=smoothCurve(3.9,5.,t);let y=p.y/(extent*(1.-.24*settle));let z=p.z/.22;
 let edge=max(0.,1.-y*y-z*z);let thickness=.052+.032*(1.-smoothCurve(.24,1.6,t));
 // First-order signed normal distance, rather than projection-dependent x thickness.
 let normalScale=1./max(sheetNormal(p.y,p.z,t,v).x,.05);
 let x=(p.x-sheetMid(p.y,p.z,t,v))/(thickness*normalScale);let ribbon=max(0.,1.-x*x);
 let filled=smoothCurve(front(t,v)-.045,front(t,v)+.07,p.y);
 return edge*edge*ribbon*ribbon*filled*mediumPresence(t);
}
fn mediumSource(p:vec3f,t:f32,v:f32,strength:f32,d:f32)->vec3f {
 let boundary=bell((p.y-front(t,v))/.085);
 // Isotropic emission source function: independent of observer direction.
 return (spectrum(v)*(1.6+2.5*d)+vec3f(1.1,1.2,1.18)*boundary*2.)*strength;
}
fn formedRayInterval(origin:vec3f,ray:vec3f,t:f32,v:f32)->vec2f {
 // Exact compact yz-ellipse support; x ribbon remains evaluated by unchanged field.
 let extent=.39*radiusScale(v)*(1.-.24*smoothCurve(3.9,5.,t));
 let yy=origin.y/extent;let ry=ray.y/extent;let rz=ray.z/.22;
 let aa=ry*ry+rz*rz;let bb=yy*ry;let cc=yy*yy-1.;let discriminant=bb*bb-aa*cc;
 if(aa<=0. || discriminant<=0.){return vec2f(1.,0.);}
 let root=sqrt(discriminant);var start=max(0.,(-bb-root)/aa);var end=(-bb+root)/aa;
 let lower=max(-extent,front(t,v)-.045);if(lower>=extent){return vec2f(1.,0.);}
 let lo=vec3f(-.60,lower,-.22);let hi=vec3f(.60,extent,0.);
 for(var axis=0u;axis<3u;axis=axis+1u){
  if(abs(ray[axis])<.000001){if(origin[axis]<lo[axis]||origin[axis]>hi[axis]){return vec2f(1.,0.);}}
  else {let a=(lo[axis]-origin[axis])/ray[axis];let b=(hi[axis]-origin[axis])/ray[axis];start=max(start,min(a,b));end=min(end,max(a,b));}
 }return vec2f(start,end);
}
fn receiverIrradiance(q:vec2f,t:f32,v:f32,strength:f32)->vec3f {
 let receiver=vec3f(q,0.);var light=vec3f(0.);
 // E = pi integral_0^1 mean_phi L(xi,phi) dxi; all angular weights positive.
 let radial=array<f32,8>(0.019855071751231856,0.10166676129318658,0.23723379504183550,0.40828267875217511,0.59171732124782483,0.76276620495816450,0.89833323870681348,0.98014492824876820);
 let weights=array<f32,8>(0.050614268145188393,0.11119051722668723,0.15685332293894369,0.18134189168918100,0.18134189168918100,0.15685332293894369,0.11119051722668723,0.050614268145188393);
 let depthNodes=array<f32,2>(.21132486540518713,.7886751345948129);
 for(var ring=0u;ring<8u;ring=ring+1u){
  let xi=radial[ring];let rotation=fract(f32(ring)*.61803398875);
  for(var j=0u;j<32u;j=j+1u){
   let phi=6.28318530718*((f32(j)+.5+rotation)/32.);
   let ray=vec3f(sqrt(xi)*cos(phi),sqrt(xi)*sin(phi),-sqrt(1.-xi));
   let interval=formedRayInterval(receiver,ray,t,v);
   if(interval.y>interval.x){
    let ds=(interval.y-interval.x)/12.;var transmission=1.;var incoming=vec3f(0.);
    for(var k=0u;k<12u;k=k+1u){for(var node=0u;node<2u;node=node+1u){
     let p=receiver+ray*(interval.x+(f32(k)+depthNodes[node])*ds);let density=field(p,t,v);
     // Positive ordered exponential substeps; exact for homogeneous source/density, approximate otherwise.
     let localTrans=exp(-density*14.*ds*.5);
     incoming+=transmission*(1.-localTrans)*mediumSource(p,t,v,strength,density);transmission*=localTrans;
    }}light+=incoming*(3.14159265359*weights[ring]/32.);
   }
  }
 }return light;
}
fn glint(q:vec2f,c:vec2f,s:f32)->f32{let a=.314159265;let d=q-c;let p=vec2f(cos(a)*d.x+sin(a)*d.y,-sin(a)*d.x+cos(a)*d.y);return exp(-dot(p,p)/.000026)+.7*max(exp(-abs(p.x)/(s*.30)-p.y*p.y/.000006),exp(-abs(p.y)/(s*.20)-p.x*p.x/.000006));}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let q=(pixel.xy/u.viewport.z-u.actor.xy)/u.actor.z;let actor=actorAt(q);let a=actor.a*u.flags.y;let albedo=decode(actor.rgb);var rgb=albedo*a;var coverage=a;
 if(u.actor.w>.5 && abs(q.x)<.65 && abs(q.y)<.72){
  let t=u.viewport.w*5./u.config.w;let v=u.config.z;let col=spectrum(v);let rise=smoothCurve(0.,.18,t);let end=1.-smoothCurve(4.12,5.,t);
  let held=.78+.42*bell((t-.92)/.46);let strength=rise*end*held;let sourceStrength=rise*held;
  var frontRadiance=vec3f(0.);var rearRadiance=vec3f(0.);var frontTrans=1.;var rearTrans=1.;
  for(var i=0u;i<28u;i++){
   let z=-.26+(f32(i)+.5)*(.52/28.);let p=vec3f(q,z);let d=field(p,t,v);
   let localTrans=exp(-d*14.*.52/28.);let emission=(1.-localTrans)*mediumSource(p,t,v,sourceStrength,d);
   if(z<0.){frontRadiance+=frontTrans*emission;frontTrans*=localTrans;}
   else {rearRadiance+=rearTrans*emission;rearTrans*=localTrans;}
  }
  var received=vec3f(0.);if(a>0.){received=receiverIrradiance(q,t,v,sourceStrength);}
  // One planar alpha receiver, between independently self-absorbed rear/front medium.
  rgb=(rgb+albedo*a*received/3.14159265+(1.-a)*rearRadiance)*frontTrans+frontRadiance;
  coverage=1.-(1.-a)*frontTrans*rearTrans;
  for(var k=0u;k<6u;k++){
   let f=f32(k);let onset=.32+f*.21;let age=t-onset;let life=smoothCurve(0.,.055,age)*(1.-smoothCurve(.15,.37,age));
   let c=vec2f(.115*sin(f*2.3),.27-f*.09);let support=actorAt(c).a*u.flags.y;
   rgb+=(col*.65+vec3f(.42))*glint(q,c,.038+f*.002)*life*support*1.7;
   if(u.flags.x>.5){rgb+=col*bell(length(q-c)/.037)*life*support*.19;}
  }
  if(u.flags.x>.5){
   let c=vec2f(sheetMid(front(t,v),-.06,t,v),front(t,v));let movingPeak=bell(length((q-c)/vec2f(.105,.12)));
   let formPSF=bell(length(q/vec2f(.27,.48)))*smoothCurve(.3,1.4,t);
   rgb+=col*(movingPeak*.16+formPSF*.065)*strength;
  }
  coverage=max(coverage,clamp(max(max(rgb.r,rgb.g),rgb.b),0.,1.));
 }
 if(coverage<.00001){return vec4f(0.);}let straight=rgb/coverage;return vec4f(select(encode(straight),straight,u.config.y>.5)*coverage,coverage);
}`;
export async function createRenderer({device,format,actorTexture,actorAspect}){
 if(!device||!actorTexture||!Number.isFinite(actorAspect)||actorAspect<=0)throw Error('Device/actorTexture/positive actorAspect required');
 const module=device.createShaderModule({label:VERSION_ID,code:WGSL});const info=await module.getCompilationInfo();const diagnostics=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));if(diagnostics.some(m=>m.type==='error'))throw Error(JSON.stringify(diagnostics));
 const pipeline=await device.createRenderPipelineAsync({label:VERSION_ID,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:VERSION_ID+' uniform'});const sampler=device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:sampler}]});let disposed=false;const resources={buffers:1,textures:0,samplers:1,pipelines:1};
 return{diagnostics,resources,render(input){if(disposed)throw Error('Renderer disposed');const state=frameState(input);state.data[12]=actorAspect;state.data[13]=format.endsWith('-srgb')?1:0;device.queue.writeBuffer(uniform,0,state.data);const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();return{passes:1,active:state.active,phase:state.phase};},dispose(){if(disposed)return;disposed=true;uniform.destroy();resources.buffers=0;resources.samplers=0;resources.pipelines=0;}};
}
export function synthesizeSfx(sampleRate=48000,variantIndex=0){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('sampleRate integer8000..192000 required');if(!Number.isInteger(variantIndex)||variantIndex<0||variantIndex>3)throw Error('variantIndex0..3 required');
 const pcm=new Float32Array(Math.round(sampleRate*1.1));let seed=0x51f0c241,low=0,mid=0;const band=[.065,.095,.045,.075][variantIndex];
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const n=(seed>>>0)/2147483648-1;low+=.025*(n-low);mid+=band*(n-mid);
  const opening=(1-Math.exp(-t/.055))*Math.exp(-t/.24);const alignment=Math.exp(-(((t-.38)/.17)**2));const contact=(1-Math.exp(-t/.013))*Math.exp(-t/.085);
  const material=Math.sin(2*Math.PI*183*t)*Math.exp(-t/.10)+.43*Math.sin(2*Math.PI*311*t)*Math.exp(-t/.065)+.19*Math.sin(2*Math.PI*527*t)*Math.exp(-t/.035);
  const trailing=Math.max(0,t-.61);const settle=t>.61?(1-Math.exp(-trailing/.014))*Math.exp(-trailing/.12):0;
  const fade=Math.min(1,t/.009)*Math.min(1,(1.1-t)/.035);
  pcm[i]=((mid-low)*opening*.9+low*alignment*.75+material*contact*.16+(mid-low)*settle*.26)*fade;
 }
 pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
}
