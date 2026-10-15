export const VERSION_ID='overheal-benefit-cleanroom-sol61-r2';
export const DURATION_MS=1250, SFX_OFFSET_MS=100, SFX_DURATION_MS=700, UNIFORM_FLOATS=16;
export function phaseAt(t){return t<0||t>=1250?'idle':t<260?'intake':t<760?'storage':'settle';}
export function frameState({width,height,dpr=1,actorCenterCss=[490,380],actorHeightCss=64,ageMs=0,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false,direction=1}={}){
 if(![width,height,dpr,actorHeightCss,...actorCenterCss,ageMs].every(Number.isFinite)||width<=0||height<=0||dpr<=0||actorHeightCss<=0)throw Error('Invalid frame dimensions/time');
 const active=sourceOn&&mainOn&&ageMs>=0&&ageMs<1250;
 return {active,phase:active?phaseAt(ageMs):'idle',data:new Float32Array([width,height,dpr,ageMs/1000,...actorCenterCss,actorHeightCss,active?1:0,observerOn?1:0,showActor?1:0,reducedMotion?1:0,direction<0?-1:1,0,0,0,0])};
}
export const WGSL=String.raw`
struct U {viewport:vec4f, actor:vec4f, flags:vec4f, config:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);}
fn decode(c:vec3f)->vec3f {return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn encode(c:vec3f)->vec3f {let v=max(c,vec3f(0.));return select(12.92*v,1.055*pow(v,vec3f(1./2.4))-.055,v>vec3f(.0031308));}
fn actorAt(q:vec2f)->vec4f {let uv=vec2f(q.x*u.flags.w/u.config.x+.5,q.y+.5);if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec4f(0.);}return textureSampleLevel(actorTex,actorSampler,uv,0.);}
fn bell(x:f32)->f32 {return exp(-x*x);}
fn center(side:f32,t:f32)->vec3f {let i=smoothstep(0.,.30,t);let s=smoothstep(.76,1.25,t);let travel=select(1.,.28,u.flags.z>.5);return vec3f(side*(.13+.26*(1.-i)*travel)*(1.-.34*s),.03+side*.055-.035*i,.035+side*.07);}
fn radius(t:f32)->vec3f {return mix(vec3f(.145,.085,.115),vec3f(.10,.205,.105),smoothstep(0.,.30,t))*(1.-.64*smoothstep(.76,1.25,t));}
fn density(p:vec3f,c:vec3f,r:vec3f)->f32 {let n=(p-c)/r;let v=max(0.,1.-dot(n,n));return v*v;}
fn power(t:f32)->f32 {return smoothstep(0.,.085,t)*(1.-smoothstep(.93,1.25,t))*(1.1+.7*bell((t-.30)/.17));}
fn star(q:vec2f,c:vec2f,size:f32)->f32 {let a=.383972435;let v=q-c;let p=vec2f(cos(a)*v.x+sin(a)*v.y,-sin(a)*v.x+cos(a)*v.y);let core=exp(-dot(p,p)/.000035);let x=exp(-abs(p.x)/(size*.27)-p.y*p.y/.000008);let y=exp(-abs(p.y)/(size*.19)-p.x*p.x/.000008);return core+max(x,y)*.65;}

// A normalized participating medium. Both the camera and receiver integrate this same source.
fn sourceColor(t:f32)->vec3f {return mix(vec3f(.025,.75,.44),vec3f(.28,1.25,1.42),smoothstep(.13,.45,t)*.7);}
fn emissivity(d:f32,t:f32)->vec3f {return sourceColor(t)*power(t)*5.8*(.8*d+1.6*d*d);}
fn volumeTransmission(a:vec3f,b:vec3f,t:f32)->f32 {
 let stepLength=length(b-a)/6.;var opticalDepth=0.;let r=radius(t);
 for(var s=0u;s<6u;s++){let p=mix(a,b,(f32(s)+.5)/6.);opticalDepth+=(density(p,center(-1.,t),r)+density(p,center(1.,t),r))*5.8*stepLength;}
 return exp(-opticalDepth);
}
fn actorTransmission(a:vec3f,b:vec3f)->f32 {
 if(u.flags.y<.5||a.z*b.z>=0.){return 1.;}
 let intersection=mix(a,b,-a.z/(b.z-a.z));return 1.-actorAt(intersection.xy).a;
}
fn receivedIrradiance(q:vec2f,t:f32)->vec3f {
 // Front of the sprite is a Lambert receiver at z=0, facing the camera (-z).
 // 7-point volume cubature per ellipsoid; 6 extinction samples per light segment.
 let receiver=vec3f(q,-.001);let r=radius(t);let totalVolume=4.188790205*r.x*r.y*r.z;var irradiance=vec3f(0.);
 var offsets=array<vec3f,7>(vec3f(0.),vec3f(0.780584090995,0.,0.),vec3f(-0.780584090995,0.,0.),vec3f(0.,0.780584090995,0.),vec3f(0.,-0.780584090995,0.),vec3f(0.,0.,0.780584090995),vec3f(0.,0.,-0.780584090995));
 for(var emitter=0u;emitter<2u;emitter++){
  let c=center(select(-1.,1.,emitter==1u),t);
  for(var point=0u;point<7u;point++){
   let cellVolume=totalVolume*select(0.151731315043,0.089612109745,point==0u);let cellRadiusSquared=pow(cellVolume*.2387324146,.666666667);
   let location=c+offsets[point]*r;let delta=location-receiver;let distanceSquared=dot(delta,delta);let receiverCosine=max(0.,-delta.z*inverseSqrt(max(distanceSquared,.000001)));
   if(receiverCosine>0.){let d=density(location,c,r);let transmission=volumeTransmission(location,receiver,t)*actorTransmission(location,receiver);
    // finite cell footprint regularizes the coincident-sample quadrature singularity.
    irradiance+=emissivity(d,t)*cellVolume*receiverCosine*transmission/((distanceSquared+cellRadiusSquared));}
  }
 }
 return irradiance;
}

@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
 let q=(frag.xy/u.viewport.z-u.actor.xy)/u.actor.z;let a=actorAt(q);let alpha=a.a*u.flags.y;let albedo=decode(a.rgb);var rgb=albedo*alpha;var coverage=alpha;let t=u.viewport.w;
 if(u.actor.w>.5 && abs(q.x)<.72 && abs(q.y)<.72){
  let pw=power(t);let r=radius(t);let c0=center(-1.,t);let c1=center(1.,t);var light=vec3f(0.);var tr=1.;var absorbed=0.;var frontTransmission=1.;
  for(var j=0u;j<24u;j++){
   if(j==12u){frontTransmission=tr;}
   let z=-.25+(f32(j)+.5)*(.5/24.);let p=vec3f(q,z);let d0=density(p,c0,r);let d1=density(p,c1,r);let d=d0+d1;
   let visible=select(1.,1.-alpha,z>0.);let sa=1.-exp(-d*5.8*.5/24.);
   let emission=select(vec3f(0.),(emissivity(d0,t)+emissivity(d1,t))/max(d*5.8,.000001),d>0.);
   light+=tr*sa*emission*visible;absorbed+=tr*sa;tr*=1.-sa;
  }
  var deposited=vec3f(0.);if(alpha>.001){deposited=albedo*receivedIrradiance(q,t)*(alpha/3.141592654);}
  // Background actor and deposited light are behind front volume, never behind itself twice.
  rgb=(rgb+deposited)*frontTransmission+light;coverage=coverage+(1.-coverage)*absorbed;
  for(var k=0u;k<6u;k++){
   let f=f32(k);let side=select(-1.,1.,(k%2u)==1u);let onset=.21+f*.072;let life=smoothstep(onset,onset+.04,t)*(1.-smoothstep(onset+.10,onset+.25,t));
   let shift=select(.025,.006,u.flags.z>.5)*smoothstep(onset,onset+.24,t);let c=vec2f(side*(.12+.018*sin(f*2.)),.18-f*.058-shift);let support=actorAt(c).a*u.flags.y;
   rgb+=vec3f(.48,1.3,.93)*star(q,c,.042+f*.002)*life*support*1.8;
   if(u.flags.x>.5){rgb+=vec3f(.14,.65,.48)*bell(length(q-c)/.043)*life*support*.34;}
  }
  if(u.flags.x>.5){let blur=bell(length((q-c0.xy)/vec2f(.19,.25)))+bell(length((q-c1.xy)/vec2f(.19,.25)));rgb+=vec3f(.03,.65,.46)*blur*pw*.095;}
  coverage=max(coverage,clamp(max(max(rgb.r,rgb.g),rgb.b),0.,1.));
 }
 if(coverage<.00001){return vec4f(0.);}let straight=rgb/coverage;let output=select(encode(straight),straight,u.config.y>.5);return vec4f(output*coverage,coverage);
}`;
export async function createRenderer({device,format,actorTexture,actorAspect}){
 if(!device||!actorTexture||!Number.isFinite(actorAspect)||actorAspect<=0)throw Error('Device, actor texture and positive actorAspect required');
 const module=device.createShaderModule({label:VERSION_ID,code:WGSL});const info=await module.getCompilationInfo();const diagnostics=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));
 if(diagnostics.some(m=>m.type==='error'))throw Error(JSON.stringify(diagnostics));
 const pipeline=await device.createRenderPipelineAsync({label:VERSION_ID,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
 const buffer=device.createBuffer({label:VERSION_ID+' uniform',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const sampler=device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
 const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:sampler}]});let disposed=false;
 const resources={buffers:1,textures:0,samplers:1,pipelines:1};
 return {diagnostics,resources,render(input){if(disposed)throw Error('Renderer disposed');const state=frameState(input);state.data[12]=actorAspect;state.data[13]=format.endsWith('-srgb')?1:0;device.queue.writeBuffer(buffer,0,state.data);const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();return {passes:1,active:state.active,phase:state.phase};},dispose(){if(disposed)return;disposed=true;buffer.destroy();resources.buffers=0;resources.samplers=0;resources.pipelines=0;}};
}
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('sampleRate integer 8000..192000 required');
 const pcm=new Float32Array(Math.round(sampleRate*.7));let seed=0x5f217b19,lp=0,prev=0;
 for(let i=0;i<pcm.length;i++){const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const noise=(seed>>>0)/2147483648-1;lp+=.12*(noise-lp);const friction=lp-prev;prev=lp;
 const pressure=(1-Math.exp(-t/.016))*Math.exp(-t/.105);const rub=Math.sin(Math.PI*Math.min(1,t/.27))**2*Math.exp(-t/.18);
 const mode=Math.sin(2*Math.PI*132*t)*Math.exp(-t/.12)+.37*Math.sin(2*Math.PI*221*t)*Math.exp(-t/.075)+.17*Math.sin(2*Math.PI*347*t)*Math.exp(-t/.05);
 const s=Math.max(0,t-.24);const settle=t>.24?(1-Math.exp(-s/.007))*Math.exp(-s/.06):0;const fade=Math.min(1,t/.006)*Math.min(1,(.7-t)/.025);
 pcm[i]=(lp*pressure*.65+friction*rub*.8+mode*pressure*.16+lp*settle*.18)*fade;
 }pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
}
