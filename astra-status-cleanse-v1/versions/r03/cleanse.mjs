// GPT-6-Astra original status cleanse, revision r0.3. No raster assets.
export const VERSION='astra-status-cleanse-r0.3';
export const DURATION_MS=1740;
export const shader=/* wgsl */`
struct Uniforms { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Uniforms;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn envelope(p:f32)->f32 {return ease(0.,.09,p)*(1.-ease(.76,1.,p));}
fn bandCenter(p:f32)->f32 {return mix(-.46,-.28,u.reduced)+mix(1.05,.64,u.reduced)*ease(.02,.78,p);}
fn radiusAt(y:f32,p:f32)->f32 {
 let h=clamp((y-bandCenter(p)+.42)/.84,0.,1.);
 let release=ease(.45,.84,p);
 return .30+.045*sin(h*3.14159265)+.12*release;
}
fn shell(q:vec3f,p:f32)->f32 {
 let h=clamp((q.y-bandCenter(p)+.42)/.84,0.,1.);
 let theta=atan2(q.z,q.x);
 let flute=.028*cos(3.*theta+.3)*h*h;
 return length(q.xz)-radiusAt(q.y,p)-flute;
}fn normal(q:vec3f,p:f32)->vec3f {
 let e=.002;return normalize(vec3f(shell(q+vec3f(e,0.,0.),p)-shell(q-vec3f(e,0.,0.),p),shell(q+vec3f(0.,e,0.),p)-shell(q-vec3f(0.,e,0.),p),shell(q+vec3f(0.,0.,e),p)-shell(q-vec3f(0.,0.,e),p)));
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;
 let p=u.phase;let env=envelope(p);
 if(p<=0.||p>=1.||abs(uv.x)>.94||abs(uv.y)>1.30){return vec4f(bg,1.);}
 var col=bg;
 // PH1: finite ascending conical interface. Orthographic view, 19.3deg down.
 let origin=vec3f(uv.x,-uv.y-.50,1.50);let ray=normalize(vec3f(0.,.34,-1.));
 var distance=0.;var accum=vec3f(0.);var trans=1.;
 var previous=shell(origin,p);
 for(var i=1;i<=104;i++){
  distance=f32(i)*.034;
  let q0=origin+ray*distance;let current=shell(q0,p);
  if(previous*current<0.){
   let crossing=distance-.034+.034*previous/(previous-current);
   let q=origin+ray*crossing;
   let theta=atan2(q.z,q.x);
   let angle=fract((theta+.28*ease(.1,.8,p)*(1.-u.reduced))/6.2831853+.5);
   let top=-.30+.95*angle;
   let local=q.y-bandCenter(p);
   let h=clamp((local-top+.29)/.29,0.,1.);
   let aa=1.0/u.height;
   let ends=ease(0.,.08,angle)*(1.-ease(.92,1.,angle));
   let bounds=ease(top-.29,top-.23,local)*(1.-ease(top-aa,top+aa,local))*ends;
   let opening=1.;
   let rim=exp(-pow((local-top+.018)/.034,2.));
   let n=normal(q,p);let edge=pow(1.-abs(dot(n,ray)),2.);
   let front=select(.67,1.,q.z>0.);
   let fold=pow(.5+.5*cos(3.*theta+.3),4.)*.19;
   let tint=mix(vec3f(.025,.32,.37),vec3f(.10,.73,.55),ease(.12,.92,h));
   let crest=mix(vec3f(.57,.99,.82),vec3f(1.,.96,.77),rim);
   let opacity=clamp((.32+edge*.30+rim*.39+fold)*env*front*bounds*opening,0.,.84);
   let radiance=tint*(.68+.72*edge)+crest*(rim*2.85+fold*.42);
   accum+=trans*opacity*radiance;
   trans*=1.-opacity;
  }
  previous=current;
 } col=col*trans+accum;
 // PH2: compact basal response, strongest only as the sleeve lifts off.
 let basal=exp(-pow((length(vec2f(uv.x,uv.y/.27))-.27)/.055,2.))*ease(0.,.08,p)*(1.-ease(.18,.40,p));
 col=mix(col,vec3f(.10,.38,.36),basal*.26);
 col+=vec3f(.11,.40,.31)*basal*.24;
 // OBS1: source-bound small halo, does not construct the silhouette.
 let cy=-bandCenter(p);let oval=length(vec2f(uv.x/.53,(uv.y-cy)/.22));
 let bloom=exp(-pow((oval-1.)/.22,2.))*env*.055;
 col+=vec3f(.32,.78,.61)*bloom;
 return vec4f(col,1.);
}`;

export function validateEvent(e,sessionId){
 return Boolean(e&&e.type==='gain-statusRecovery'&&typeof e.id==='string'&&e.id&&typeof e.playerId==='string'&&e.playerId&&e.sessionId===sessionId&&Number.isFinite(e.startedAt)&&Number.isFinite(e.durationMs)&&e.durationMs>=900&&e.durationMs<=6000);
}
export class Lifecycle {
 constructor(sessionId){this.sessionId=sessionId;this.events=new Map();this.seen=new Set();}
 enterSession(id){this.sessionId=id;this.events.clear();this.seen.clear();}
 admit(e){if(!validateEvent(e,this.sessionId)||this.seen.has(e.id))return false;this.seen.add(e.id);this.events.set(e.id,Object.freeze({...e}));return true;}
 plan(id,now,anchor){const e=this.events.get(id);if(!e)return null;const elapsed=now-e.startedAt;if(elapsed>=e.durationMs){this.events.delete(id);return null;}
  if(elapsed<0||!anchor||anchor.playerId!==e.playerId||anchor.visible!==true||![anchor.x,anchor.y,anchor.height].every(Number.isFinite)||anchor.height<=0)return null;
  return {id:e.id,playerId:e.playerId,sessionId:this.sessionId,phase:elapsed/e.durationMs,elapsedMs:elapsed,durationMs:e.durationMs,x:anchor.x,y:anchor.y,height:anchor.height};}
}
export async function createRenderer(canvas){
 if(!navigator.gpu)throw Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');
 const device=await adapter.requestDevice();const errors=[];device.addEventListener('uncapturederror',e=>errors.push(e.error.message));device.lost.then(x=>{if(x.reason!=='destroyed')errors.push('device lost: '+x.message);});
 const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 device.pushErrorScope('validation');const module=device.createShaderModule({code:shader});const compilation=await module.getCompilationInfo();const failures=compilation.messages.filter(x=>x.type==='error');if(failures.length)throw Error(failures.map(x=>x.message).join('\n'));
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const buffer=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});const error=await device.popErrorScope();if(error)throw Error(error.message);
 let submissions=0;let serial=0;let disposed=false;
 return {device,errors,adapter:adapter.info,version:VERSION,get submissions(){return submissions;},
  draw(plan,{light=false,reduced=false,height=64}={}){if(disposed)throw Error('Disposed renderer');const phase=plan?.phase??-1;
   device.queue.writeBuffer(buffer,0,new Float32Array([canvas.width,canvas.height,plan?.x??canvas.width/2,plan?.y??canvas.height/2,plan?.height??height,phase,Number(light),Number(reduced)]));
   const enc=device.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([enc.finish()]);submissions++;
   return plan?Object.freeze({submitted:true,visible:true,version:VERSION,frameToken:++serial,sessionId:plan.sessionId,causeId:plan.id,ownerId:plan.playerId,effectKind:'statusRecovery',elapsedMs:plan.elapsedMs,durationMs:plan.durationMs}):null;
  },async check(){await device.queue.onSubmittedWorkDone();return [...errors];},dispose(){if(disposed)return;disposed=true;buffer.destroy();context.unconfigure();device.destroy();}
 };
}



