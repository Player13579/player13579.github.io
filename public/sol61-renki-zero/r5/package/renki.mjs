export const VERSION='renki-sol61-zero-r5',DURATION=1200;
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
export const SCENE_WGSL=`
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};
@group(0) @binding(0)var<uniform>u:U;
@group(0) @binding(1)var bodyTex:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
fn e(x:f32)->f32{let a=clamp(x,0.,1.);return a*a*(3.-2.*a);}
fn rect(q:vec2f,s:vec2f)->f32{return max(abs(q.x)-s.x,abs(q.y)-s.y);}
fn cover(d:f32)->f32{return 1.-smoothstep(-.006,.011,d);}
// Broad inward pressure faces. No long rounded finger or luminous outline.
fn gatherDensity(v:vec3f,len:f32,width:f32,phase:f32)->f32{
 let nx=v.x/len;let ny=(v.y+v.x*.18+v.z*.18)/width;let nz=v.z/.13;
 let shape=max(max(abs(nx)-1.,abs(ny)-(.78-.20*nx)),max(abs(nz)-1.,nx+.26*ny-.90));
 let bulk=1.-smoothstep(-.23,0.,shape);
 // A transverse partial seam, never a longitudinal split into two fingers.
 let seam=1.-.82*exp(-pow((nx+.28-.10*sin(phase))/.11,2.))*e((ny-.10)/.30);
 return bulk*seam;
}
fn gatherVolume(local:vec2f,p:f32,phase:f32,ten:f32)->vec4f{
 let compression=e((p-.40)/.60);let len=mix(.29,.14,compression);let width=mix(.22,.155,compression)*(1.+ten*.10);
 if(abs(local.x)>len*1.10||abs(local.y)>width*1.35){return vec4f(0.);}
 var light=vec3f(0.);var trans=1.;let step=.30/6.;
 for(var k=0u;k<6u;k++){
  let z=.15-(f32(k)+.5)*step;let d=gatherDensity(vec3f(local,z),len,width,phase);
  let absorb=1.-exp(-d*step*13.);let depth=(z+.15)/.30;
  let pressure=e((local.x/len+.08)/.62)*d;
  let carrier=vec3f(.06,.95,2.30)*(.58+.38*depth);
  let source=carrier+vec3f(3.6,4.6,5.1)*pressure*pressure;
  light+=trans*absorb*source;trans*=1.-absorb;
 }
 return vec4f(light,1.-trans);
}
fn chamberDensity(v:vec3f,rx:f32,ry:f32,settled:f32,phase:f32)->f32{
 let xx=v.x+.22*v.y+.18*v.z;let yy=v.y-.12*v.x;
 let nx=xx/rx;let ny=yy/ry;let nz=v.z/.16;
 let shape=max(max(abs(nx)+.32*abs(ny)-1.,abs(ny)-1.),max(abs(nz)-1.,.30*nx+.38*ny+.16*nz-.85));
 let bulk=1.-smoothstep(-.22,0.,shape);
 // The wide opening exposes the actor; stored field is not clipped into clothing.
 let gap=1.-.91*exp(-pow((xx+.32*yy-rx*.08*sin(phase))/(rx*.22),2.));
 let fold=.70+.30*e((ny+.20*nz+.14*sin(phase)*(1.-settled))/.45);
 return bulk*gap*fold;
}
struct Storage{front:vec4f,back:vec4f};
fn chamberVolume(q:vec2f,settled:f32,phase:f32,ten:f32)->Storage{
 let rx=mix(.31,.235,settled)*(1.+ten*.10);let ry=mix(.205,.158,settled);
 var out:Storage;out.front=vec4f(0.);out.back=vec4f(0.);
 if(abs(q.x)>.40||abs(q.y)>.30){return out;}
 var frontLight=vec3f(0.);var backLight=vec3f(0.);var frontTrans=1.;var backTrans=1.;let step=.36/8.;
 for(var k=0u;k<8u;k++){
  let z=.18-(f32(k)+.5)*step;let d=chamberDensity(vec3f(q,z),rx,ry,settled,phase);
  let absorb=1.-exp(-d*step*14.);let depth=(z+.18)/.36;
  let source=vec3f(.09,1.20,2.55)*(.65+.42*depth)+vec3f(.22,.90,1.25)*d*d;
  if(z>=0.){frontLight+=frontTrans*absorb*source;frontTrans*=1.-absorb;}
  else{backLight+=backTrans*absorb*source;backTrans*=1.-absorb;}
 }
 out.front=vec4f(frontLight,1.-frontTrans);out.back=vec4f(backLight,1.-backTrans);return out;
}

struct Out{@location(0)scene:vec4f,@location(1)emission:vec4f};
@fragment fn fs(o:O)->Out{
 let px=o.uv*u.view.xy;let h=u.body.z;let foot=u.body.xy;let q=(px-vec2f(foot.x,foot.y-.37*h))/h;
 let t=u.clock.x;let life=e(t/65.)*(1.-e((t-1080.)/120.));let live=select(0.,life,t>0.&&t<1200.);let ten=u.clock.y;let motion=mix(1.,.35,u.clock.z);
 let quadH=h*1024./839.;let quadW=quadH*.5;let uv=(px-vec2f(foot.x-quadW*238./512.,foot.y-938./1024.*quadH))/vec2f(quadW,quadH);
 let valid=all(uv>=vec2f(0.))&&all(uv<=vec2f(1.));let body=textureSample(bodyTex,smp,vec2f((2.+clamp(uv.x,0.,1.))/3.,clamp(uv.y,0.,1.)))*select(0.,1.,valid);
 var radFront=vec3f(0.);var radBack=vec3f(0.);var received=vec3f(0.);var coverFront=0.;var coverBack=0.;
 let starts=array<vec2f,2>(vec2f(-.83,-.10),vec2f(.79,.28));let bends=array<vec2f,2>(vec2f(.08,-.20),vec2f(-.16,-.13));let births=array<f32,2>(40.,165.);let ends=array<f32,2>(560.,740.);
 for(var i=0u;i<2u;i++){
  let progress=e((t-births[i])/(ends[i]-births[i]));let centre=starts[i]*(1.-progress)+bends[i]*sin(3.14159265*progress)*motion;
  let tangent=-starts[i]+bends[i]*3.14159265*cos(3.14159265*progress)*motion;let axis=normalize(tangent);
  let v=q-centre;let local=vec2f(dot(v,axis),dot(v,vec2f(-axis.y,axis.x)));
  let arrival=e((t-births[i])/85.)*(1.-e((t-ends[i]+5.)/100.))*live;
  let volume=gatherVolume(local,progress,(t-births[i])*.006*motion,ten);let ca=volume.a*arrival;let r=volume.rgb*arrival;
  if(i==0u){radBack+=r;coverBack=max(coverBack,ca*.30);}else{radFront+=r;coverFront=max(coverFront,ca*.36);}
  received+=vec3f(.16,1.10,2.25)*arrival*.013/(dot(q-centre,q-centre)+.16*.16+.06);
 }
 let lock=e((t-430.)/400.)*live;let settled=e((t-680.)/260.);let phase=min(t,920.)*.006*motion;
 let storage=chamberVolume(q,settled,phase,ten);
 // Far stored energy is occluded by the actual body. The foreground field is
 // an actual finite volume centred on the abdomen, not a clothing alpha patch.
 radBack+=storage.back.rgb*lock;coverBack=max(coverBack,storage.back.a*lock*.30);
 radFront+=storage.front.rgb*lock;coverFront=max(coverFront,storage.front.a*lock*.28);
 let arrivalPressure=exp(-pow((t-560.)/70.,2.))*.25+exp(-pow((t-740.)/75.,2.))*.24;
 let sourceSupport=exp(-dot(q/vec2f(.065,.052),q/vec2f(.065,.052))*1.7)*body.a;
 radFront+=vec3f(5.4,6.5,7.2)*sourceSupport*lock*(.78+arrivalPressure);
 received+=vec3f(.32,1.55,2.55)*lock*.029/(dot(q,q)+.075);
 let on=u.flags.x;radFront*=on;radBack*=on;received*=on*u.flags.y;
 let floor=vec3f(.070,.084,.110)+vec3f(.020)*smoothstep(foot.y-15.,foot.y+50.,px.y);let floorNormal=max(0.,.37/sqrt(dot(q,q)+.37*.37));let floorLight=received*floorNormal*.13*smoothstep(foot.y-3.,foot.y+14.,px.y);
 let receiverBody=body.rgb*(vec3f(1.)+received*.25);let base=floor+floorLight;
 let background=base*(1.-coverBack*.15)+radBack;let scene=mix(background,receiverBody,body.a)*(1.-coverFront*.10)+radFront;
 let emission=radBack*(1.-body.a)+radFront;var out:Out;out.scene=vec4f(scene,1.);out.emission=vec4f(emission,1.);return out;
}`;
export const POST_WGSL=`
struct U{view:vec4f,body:vec4f,clock:vec4f,flags:vec4f};@group(0) @binding(0)var<uniform>u:U;@group(0) @binding(1)var scene:texture_2d<f32>;@group(0) @binding(2)var source:texture_2d<f32>;@group(0) @binding(3)var smp:sampler;
struct O{@builtin(position)p:vec4f,@location(0)uv:vec2f};@vertex fn vs(@builtin(vertex_index)i:u32)->O{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:O;o.p=vec4f(p[i],0.,1.);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
@fragment fn fs(o:O)->@location(0)vec4f{let offsets=array<vec2f,9>(vec2f(0.),vec2f(1.,0.),vec2f(-1.,0.),vec2f(0.,1.),vec2f(0.,-1.),vec2f(1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(-1.,-1.));var glow=vec3f(0.);for(var i=0u;i<9u;i++){let a=textureSample(source,smp,clamp(o.uv+offsets[i]*3./u.view.xy,vec2f(0.),vec2f(1.))).rgb;let b=textureSample(source,smp,clamp(o.uv+offsets[i]*9./u.view.xy,vec2f(0.),vec2f(1.))).rgb;glow+=max(a-vec3f(.6),vec3f(0.))*.017+max(b-vec3f(.9),vec3f(0.))*.009;}let hdr=textureSample(scene,smp,o.uv).rgb+glow*u.flags.z;let mapped=hdr/(vec3f(1.)+hdr);return vec4f(pow(mapped,vec3f(1./2.2)),1.);}`;
export async function create({device,format='bgra8unorm',width,height,bodyTexture}={}){
 if(!device||!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||width>4096||height>4096||!bodyTexture)throw TypeError('shared WebGPU device/body/dimensions');
 const modules=[device.createShaderModule({code:SCENE_WGSL,label:VERSION+' PH'}),device.createShaderModule({code:POST_WGSL,label:VERSION+' OBS'})];
 for(const m of modules){const info=await m.getCompilationInfo();if(info.messages.some(x=>x.type==='error'))throw Error(JSON.stringify(info.messages));}
 const pipelines=await Promise.all([device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[0],entryPoint:'vs'},fragment:{module:modules[0],entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}}),device.createRenderPipelineAsync({layout:'auto',vertex:{module:modules[1],entryPoint:'vs'},fragment:{module:modules[1],entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}})]);
 const uniform=device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),smp=device.createSampler({magFilter:'linear',minFilter:'linear'}),targets=[0,1].map(()=>device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING}));
 const bindings=[device.createBindGroup({layout:pipelines[0].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:bodyTexture.createView()},{binding:2,resource:smp}]}),device.createBindGroup({layout:pipelines[1].getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:targets[0].createView()},{binding:2,resource:targets[1].createView()},{binding:3,resource:smp}]})];let dead=false;
 return {modules,record({encoder,target,age,tenfold=false,reduced=false,sourceOn=true,receiverOn=true,postOn=true,foot=[width/2,height*.68],bodyH=64}={}){if(dead)throw Error('disposed');if(!encoder||!target||![age,...foot,bodyH].every(Number.isFinite)||bodyH<=0)throw TypeError('finite frame');device.queue.writeBuffer(uniform,0,new Float32Array([width,height,0,0,...foot,bodyH,0,age,+tenfold,+reduced,0,+sourceOn,+receiverOn,+postOn,0]));for(let i=0;i<2;i++){const attachments=i===0?targets.map(t=>({view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}})):[{view:target,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}];const pass=encoder.beginRenderPass({colorAttachments:attachments});pass.setPipeline(pipelines[i]);pass.setBindGroup(0,bindings[i]);pass.draw(3);pass.end();}return{version:VERSION,age,postApplied:postOn,passes:2}},destroy(){if(dead)return;dead=true;uniform.destroy();for(const t of targets)t.destroy()}};
}
