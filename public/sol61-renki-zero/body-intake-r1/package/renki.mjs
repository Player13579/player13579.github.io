export const VERSION='renki-sol61-body-intake-r1',DURATION=1200;
export const ROUTES=Object.freeze([[-.83,-.10,.08,-.20,40,560],[.79,.28,-.16,-.13,165,740]]);
export const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
export function stateAt(t,tenfold=false,reduced=false){if(!Number.isFinite(t))throw TypeError('finite E time required');const fade=ease(t/65)*(1-ease((t-1080)/120));return {t,active:t>0&&t<DURATION,fade,core:ease((t-430)/400)*fade,packets:ROUTES.map(([x,y,bx,by,birth,end])=>{const p=ease((t-birth)/(end-birth)),m=reduced?.35:1;return{x:x*(1-p)+bx*Math.sin(Math.PI*p)*m,y:y*(1-p)+by*Math.sin(Math.PI*p)*m,p,coverage:ease((t-birth)/85)*(1-ease((t-end+5)/100))*fade}}),tenfold,reduced};}
export function plan({effect,now,phase,actor,viewerVisible=true,roomId,generation}={}){
 if(effect?.type!=='action-renki'||!['','tenfold'].includes(effect.variant||'')||!['playing','meeting'].includes(phase)||!viewerVisible||!actor||actor.id!==effect.playerId||actor.alive===false||actor.ejected||actor.inVent||!effect.id||!roomId||!Number.isSafeInteger(generation))return null;
 if(![now,effect.startedAt,actor.x,actor.y,actor.h,actor.abdomenX,actor.abdomenY].every(Number.isFinite)||actor.h<=0)return null;
 const age=now-effect.startedAt;if(age<=0||age>=DURATION)return null;
 return Object.freeze({id:String(effect.id),ownerId:actor.id,roomId,generation,age,tenfold:effect.variant==='tenfold',source:Object.freeze([actor.abdomenX,actor.abdomenY]),bodyH:actor.h});
}
export function sfxPCM(rate=48000,tenfold=false){if(!Number.isInteger(rate)||rate<8000||rate>192000)throw RangeError('sample rate');const n=Math.ceil(rate*.98),a=new Float32Array(n);let ph=0;for(let i=0;i<n;i++){const t=i/rate,arrival=[.560,.740].reduce((s,c)=>s+Math.exp(-(((t-c)/.036)**2)),0),g=ease(t/.045)*(1-ease((t-.84)/.14));ph+=2*Math.PI*(155+280*ease(t/.76)+(tenfold?38:0))/rate;const tone=Math.sin(ph)*.36+Math.sin(ph*1.503)*.19+Math.sin(ph*2.01)*.10;const sheen=Math.sin(2*Math.PI*1200*t)*Math.sin(2*Math.PI*37*t);a[i]=.058*g*(tone+arrival*.30*sheen);}return a;}
export function makeAudioGate(context,{verify=false,muted=false}={}){const ids=new Set(),nodes=new Set();return {play(id,tenfold=false){if(verify||muted||context.state!=='running'||ids.has(id)||nodes.size>=4)return false;ids.add(id);if(ids.size>256)ids.delete(ids.values().next().value);const pcm=sfxPCM(context.sampleRate,tenfold),buf=context.createBuffer(1,pcm.length,context.sampleRate);buf.copyToChannel(pcm,0);const node=context.createBufferSource();node.buffer=buf;node.connect(context.destination);nodes.add(node);node.onended=()=>{nodes.delete(node);node.disconnect()};node.start();return true},stop(){for(const n of nodes){n.stop();n.disconnect()}nodes.clear()}}}
export const SCENE_WGSL=`struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn sq(x:f32)->f32{return x*x;}
fn laneBirth(i:u32)->f32{return select(40.,165.,i==1u);}
fn laneArrival(i:u32)->f32{return select(560.,740.,i==1u);}
fn leadingFront(i:u32,t:f32)->f32{
 let p=clamp((t-laneBirth(i))/(laneArrival(i)-laneBirth(i)),0.,1.);
 let stage=min(floor(p*3.),2.);return (stage+e(p*3.-stage))/3.;
}
fn lanePoint(i:u32,s:f32,motion:f32)->vec3f{
 let begins=array<vec3f,2>(vec3f(-.86,-.20,.12),vec3f(.84,.24,.12));
 let control=array<vec3f,2>(vec3f(-.42,-.33,.16),vec3f(.40,.10,.16));
 let b=begins[i];let c=control[i];let endpoint=vec3f(0.,0.,-.08);
 let curved=b*sq(1.-s)+2.*c*s*(1.-s)+endpoint*s*s;
 let straight=mix(b,endpoint,s);return mix(straight,curved,motion);
}
struct Intake{density:f32,source:vec3f};
fn intakeAt(v:vec3f,t:f32,ten:f32,motion:f32)->Intake{
 var density=0.;var light=vec3f(0.);var weight=0.;
 for(var lane=0u;lane<2u;lane++){
  let front=leadingFront(lane,t);
  let drain=e((t-laneArrival(lane)+105.)/180.);
  let born=e((t-laneBirth(lane))/65.);
  if(born==0.||drain>=1.){continue;}
  var nearestDistance=100.;var pathS=0.;
  for(var j=0u;j<8u;j++){
   let sa=f32(j)/8.;let sb=f32(j+1u)/8.;
   let a=lanePoint(lane,sa,motion);let b=lanePoint(lane,sb,motion);let ab=b-a;
   let along=clamp(dot(v-a,ab)/max(dot(ab,ab),.00001),0.,1.);
   let separation=length(v-mix(a,b,along));
   if(separation<nearestDistance){nearestDistance=separation;pathS=mix(sa,sb,along);}
  }
  let radius=(.145-.105*pathS)*(1.+ten*.10);
  let radial=nearestDistance/radius;
  let bulk=1.-smoothstep(.62,1.,radial);
  // One connected path gets established then consumed; no closed parcel objects.
  let interval=e((front-pathS)/.065)*e((pathS-drain)/.085);
  let d=bulk*interval*born;
  let pressure=exp(-sq((pathS-front+.022)/.085));
  let depth=clamp((v.z+.24)/.48,0.,1.);
  let source=vec3f(.06,.95,2.30)*(.58+.38*depth)+vec3f(3.6,4.6,5.1)*pressure*.72;
  density=max(density,d);light+=source*d;weight+=d;
 }
 var out:Intake;out.density=density;out.source=light/max(weight,.00001);return out;
}
struct Field{front:vec3f,back:vec3f,alphaFront:f32,alphaBack:f32};
fn fieldAt(q:vec2f,t:f32,ten:f32,motion:f32)->Field{
 var out:Field;out.front=vec3f(0.);out.back=vec3f(0.);out.alphaFront=0.;out.alphaBack=0.;
 if(abs(q.x)>1.2||abs(q.y)>.7||t>=815.){return out;}
 var tf=1.;var tb=1.;let step=.48/12.;
 for(var k=0u;k<12u;k++){
  let z=.24-(f32(k)+.5)*step;let v=vec3f(q-vec2f(.44,-.28)*z,z);
  let m=intakeAt(v,t,ten,motion);let absorb=1.-exp(-m.density*step*14.);
  if(z>=0.){out.front+=tf*absorb*m.source;tf*=1.-absorb;}
  else{out.back+=tb*absorb*m.source;tb*=1.-absorb;}
 }
 out.alphaFront=1.-tf;out.alphaBack=1.-tb;return out;
}
fn receiptResponse(t:f32)->f32{
 let times=array<f32,2>(560.,740.);var signal=0.;
 for(var i=0u;i<2u;i++){signal+=e((t-times[i]+20.)/35.)*(1.-e((t-times[i]-30.)/200.));}
 return signal;
}
struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 let field=fieldAt(q,t,ten,motion);
 let radFront=field.front*live*u.flags.x;let radBack=field.back*live*u.flags.x;
 let coverFront=field.alphaFront*live*.28;let coverBack=field.alphaBack*live*.30;
 var received=vec3f(0.);
 for(var lane=0u;lane<2u;lane++){
  let s=leadingFront(lane,t);let centre3=lanePoint(lane,s,motion);let centre=centre3.xy+vec2f(.44,-.28)*centre3.z;
  let current=e((t-laneBirth(lane))/65.)*(1.-e((t-laneArrival(lane))/100.))*live;
  received+=vec3f(.16,1.10,2.25)*current*.013/(dot(q-centre,q-centre)+.16*.16+.06);
 }
 let response=receiptResponse(t)*live;
 let surfaceMask=exp(-dot(q/vec2f(.095,.078),q/vec2f(.095,.078))*1.7);
 // Receipt changes the actual registered material briefly, never an outside badge.
 let materialEmission=body.rgb*vec3f(5.4,6.5,7.2)*surfaceMask*response*u.flags.x;
 received+=vec3f(.32,1.55,2.55)*response*.029/(dot(q,q)+.075);
 received*=u.flags.x*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25)+materialEmission;let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront+materialEmission*body.a;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}
`;
export const POST_WGSL=`
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};@group(0) @binding(0)var<uniform>u:U;@group(0) @binding(1)var scene:texture_2d<f32>;@group(0) @binding(2)var source:texture_2d<f32>;@group(0) @binding(3)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(o:O)->@location(0)vec4f{let offsets=array<vec2f,9>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.),vec2f(1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(-1.,-1.));var glow=vec3f(0.);for(var i=0u;i<9u;i++){let a=textureSample(source,smp,clamp(o.uv+offsets[i]*3./u.view.xy,vec2f(0.),vec2f(1.))).rgb;let b=textureSample(source,smp,clamp(o.uv+offsets[i]*9./u.view.xy,vec2f(0.),vec2f(1.))).rgb;glow+=max(a-vec3f(.6),vec3f(0.))*.017+max(b-vec3f(.9),vec3f(0.))*.009;}let hdr=textureSample(scene,smp,o.uv).rgb+glow*u.flags.z;let mapped=hdr/(vec3f(1.)+hdr);return vec4f(pow(mapped,vec3f(1./2.2)),1.);}`;
export async function create({device,format='bgra8unorm',width,height,bodyTexture}={}){
 if(!device||!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||width>4096||height>4096||!bodyTexture)throw TypeError('shared WebGPU device/body/dimensions');
 const modules=[device.createShaderModule({code:SCENE_WGSL,label:VERSION+' PH'}),device.createShaderModule({code:POST_WGSL,label:VERSION+' OBS'})];
 const compilationDiagnostics=[];
 for(let index=0;index<modules.length;index++){
  const m=modules[index];const info=await m.getCompilationInfo();
  compilationDiagnostics.push({moduleLabel:m.label,moduleIndex:index,source:index===0?'scene.wgsl':'post.wgsl',messages:Array.from(info.messages,x=>({message:x.message,type:x.type,lineNum:x.lineNum,linePos:x.linePos,offset:x.offset,length:x.length}))});
 }
 if(compilationDiagnostics.some(x=>x.messages.some(m=>m.type==='error'))){const error=new Error(JSON.stringify(compilationDiagnostics));error.compilationDiagnostics=compilationDiagnostics;throw error;}
 const pipelines=await Promise.all([device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}}),device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}})]);
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),smp=device.createSampler({magFilter:'linear',minFilter:'linear'}),targets=[0,1].map(()=>device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
 const bindings=[device.createBindGroup({layout:pipelines[0].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:bodyTexture.createView()},{binding:2,resource:smp}]}),device.createBindGroup({layout:pipelines[1].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:targets[0].createView()},{binding:2,resource:targets[1].createView()},{binding:3,resource:smp}]})];let dead=false;
 return {modules,compilationDiagnostics,record({encoder,target,age,tenfold=false,reduced=false,sourceOn=true,receiverOn=true,postOn=true,foot=[width/2,height*.68],bodyH=64}={}){if(dead)throw Error('disposed');if(!encoder||!target||![age,...foot,bodyH].every(Number.isFinite)||bodyH<=0)throw TypeError('finite frame');device.queue.writeBuffer(uniform,0,new Float32Array([width,height,0,0,...foot,bodyH,0,age,+tenfold,+reduced,0,+sourceOn,+receiverOn,+postOn,0]));for(let i=0;i<2;i++){const attachments=i===0?targets.map(t=>({view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}})):[{view:target,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}];const pass=encoder.beginRenderPass({colorAttachments:attachments});pass.setPipeline(pipelines[i]);pass.setBindGroup(0,bindings[i]);pass.draw(3);pass.end();}return{version:VERSION,age,postApplied:postOn,passes:2}},destroy(){if(dead)return;dead=true;uniform.destroy();for(const t of targets)t.destroy()}};
}
