export const VERSION = 'astra-emp-v1.3-reconstructed';
export const TYPES = Object.freeze({'emp-charge':0,emp:1,'emp-resonance':2,'emp-cancel':3,'emp-storage-lock':4});
export const DURATIONS = Object.freeze({'emp-charge':1200,emp:1300,'emp-resonance':1600,'emp-cancel':1600,'emp-storage-lock':7000});
const finite = (n, fallback=0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
const durationOf = r => Number(r.durationMs)>0 ? Number(r.durationMs) : DURATIONS[r.type];
export function effectiveRate(owner={}) {
  if (owner.movementAccEnabled !== false) {
    const active = owner.movementAccActive;
    if (active === true || (active == null && owner.movementAccMax===2 && owner.movementAcc===2 &&
      (owner.movementAccAvailable === true || finite(owner.accelerationMultiplier,1)+1e-6 >= Math.max(1,finite(owner.movementAccThreshold,2))))) return 2;
  }
  return Math.max(0,finite(owner.actorTimeScale,Math.min(12,Math.max(.15,finite(owner.accelerationMultiplier,1)))));
}
/** No gameplay inference. Interactions require the caller's authoritative ownerId; absent owner uses wall time. */
export class EmpTimeline {
  constructor(){ this.reset('standalone'); }
  reset(sessionId){this.sessionId=sessionId;this.events=new Map();this.seen=new Set();this.settled=new Set();this.pulseOrigins=new Map();this.diagnostics=[];this.lastWall=null;}
  ingest(receipt,wallNow,owner={}) {
    if (!(receipt.type in TYPES) || !receipt.id || !Number.isFinite(wallNow) || !Number.isFinite(receipt.x) || !Number.isFinite(receipt.y)) return false;
    let sourceHalfSpan=Number(receipt.sourceHalfSpan);
    if(receipt.type==='emp-resonance'||receipt.type==='emp-cancel'){
      const first=(receipt.resolvedEmpPulseIds||[]).map(id=>this.pulseOrigins.get(String(id))).find(Boolean);
      if(first)sourceHalfSpan=Math.hypot(first.x-receipt.x,first.y-receipt.y);
      if(!Number.isFinite(sourceHalfSpan)||sourceHalfSpan<0){this.diagnostics.push({id:receipt.id,reason:'missing_interaction_origin'});return false;}
    }
    for(const id of receipt.resolvedEmpPulseIds||[]) {this.settled.add(String(id)); for(const [key,e] of this.events) if(e.empPulseId===String(id)) this.events.delete(key);}
    if(receipt.type==='emp-charge' && this.settled.has(String(receipt.empPulseId))) return false;
    const cause=String(receipt.empCausalId||receipt.id);
    const key=`${cause}:${receipt.type}:${receipt.type==='emp-storage-lock'?String(receipt.playerId||''):''}`;
    if(this.seen.has(key)) return false;
    this.seen.add(key);
    if(receipt.type==='emp-charge')this.pulseOrigins.set(String(receipt.empPulseId),{x:receipt.x,y:receipt.y});
    if(receipt.type==='emp-storage-lock') {
      const existing=[...this.events.values()].find(e=>e.type===receipt.type&&e.playerId===receipt.playerId&&wallNow<e.start+e.duration);
      if(existing){existing.duration=Math.max(existing.duration,wallNow-existing.start+durationOf(receipt));return true;}
    }
    this.events.set(key,{...receipt,key,cause,empPulseId:String(receipt.empPulseId||''),ownerId:String(receipt.ownerId||receipt.playerId||''),
      sourceHalfSpan:Math.max(0,finite(sourceHalfSpan)),start:wallNow,last:wallNow,visualMs:0,wallMs:0,duration:durationOf(receipt),
      radius:Math.max(16,finite(receipt.radius,receipt.type==='emp-storage-lock'?105:260)),rate:effectiveRate(owner),sounded:false});
    return true;
  }
  advance(wallNow,owners=new Map()) {
    const active=[];
    for(const [key,e] of this.events) {
      const delta=Math.max(0,wallNow-e.last);e.last=Math.max(e.last,wallNow);
      const owner=owners.get(e.ownerId);
      if(owner?.removed===true || (e.type==='emp-storage-lock' && (owner?.visible===false || owner?.alive===false))) {this.events.delete(key);continue;}
      // A changed rate applies only to the following interval; no phase recomputation or rate squared.
      e.visualMs+=delta*e.rate;e.wallMs=Math.max(0,wallNow-e.start);e.rate=owner?effectiveRate(owner):e.rate;
      const stateBound=e.type==='emp-charge'||e.type==='emp-storage-lock';
      if((stateBound?e.wallMs:e.visualMs)>=e.duration){this.events.delete(key);continue;}
      if(e.type==='emp-storage-lock' && owner && Number.isFinite(owner.x)&&Number.isFinite(owner.y)){e.x=owner.x;e.y=owner.y;}
      active.push(e);
    }
    return active;
  }
  clearOwner(id){for(const [key,e] of this.events)if(e.ownerId===id)this.events.delete(key);}
}

export const SHADER = /* wgsl */`
struct Uniforms {viewport:vec4f};
struct Event {position:vec4f, phase:vec4f, state:vec4f, geometry:vec4f};
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var<storage,read> events:array<Event>;
struct VOut {@builtin(position) position:vec4f,@location(0) q:vec2f,@location(1) @interpolate(flat) index:u32};
@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->VOut {
 let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let e=events[instance];let extent=max(100.,e.position.z*1.23);let local=corners[v]*extent;
 let pixel=e.position.xy+local;var o:VOut;o.position=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);o.q=local;o.index=instance;return o;
}
fn sat(x:f32)->f32{return clamp(x,0.,1.);}
fn ease(x:f32)->f32{let a=sat(x);return a*a*(3.-2.*a);}
fn rot(q:vec2f,a:f32)->vec2f{let c=cos(a);let s=sin(a);return vec2f(c*q.x+s*q.y,-s*q.x+c*q.y);}
fn box(q:vec2f,b:vec2f)->f32{let d=abs(q)-b;return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.);}
fn segment(q:vec2f,a:vec2f,b:vec2f)->f32 {let d=b-a;return length(q-a-d*clamp(dot(q-a,d)/max(dot(d,d),.001),0.,1.));}
fn mask(d:f32)->f32{return 1.-smoothstep(-.6,.6,d);}
fn poly(q:vec2f,sides:f32)->f32 {let a=atan2(q.y,q.x);let wedge=6.2831853/sides;return cos(floor(.5+a/wedge)*wedge-a)*length(q);}
// Local optical spread is tied to the signed distance of an actual emissive face.
fn light(d:f32,colour:vec3f,power:f32,spread:f32,obs:f32)->vec4f {
 let cov=mask(d);let halo=exp(-max(d,0.)/spread)*obs*(1.-cov);
 let energy=colour*(cov*power+halo*.58*power);
 return vec4f(energy,max(cov*.74,halo*.28));
}
fn add(a:vec4f,b:vec4f)->vec4f{return vec4f(a.rgb+b.rgb,1.-(1.-a.a)*(1.-b.a));}
fn capacitor(q:vec2f,t:f32,sign:f32,obs:f32,reduced:f32)->vec4f {
 let f=ease(t);let core=poly(rot(q,sign*.20),4.)-(4.+f*5.);
 var out=light(core,vec3f(.52,.94,1.),2.1+2.8*f,4.,obs);
 for(var j=0;j<4;j++){
  let k=f32(j);let z=rot(q,k*1.5707963+sign*(.48-.2*f*(1.-reduced)));
  let offset=35.-f*17.;let fin=box(z-vec2f(offset,0.),vec2f(5.+f*2.,14.-f*4.));
  out=add(out,light(fin,vec3f(.025,.45,.94),.9+f*1.35,3.,obs));
  let inner=box(z-vec2f(offset-5.,0.),vec2f(1.,11.-f*3.));
  out=add(out,light(inner,vec3f(.60,.97,1.),1.8+f*2.,1.6,obs));
  let reach=mix(47.,12.,ease(clamp(t*1.2-k*.06,0.,1.)));
  let trace=segment(z,vec2f(reach,0.),vec2f(reach+7.,0.))-1.15;
  out=add(out,light(trace,vec3f(.10,.70,1.),1.2,2.,obs));
 }
 return out;
}
fn pulse(q:vec2f,t:f32,radius:f32,sign:f32,strength:f32,obs:f32,reduced:f32)->vec4f {
 let expansion=ease(t/.72);let r=12.+(radius-12.)*expansion;let wedge=1.04719755;
 let a=atan2(q.y,q.x)+sign*.12;let sector=floor((a+3.14159265)/wedge);let ang=sector*wedge-3.14159265+wedge*.5;let z=rot(q,ang);
 let half=r*.40;let edge=r-z.y*z.y/max(r,1.)*.38;let thickness=14.+.19*r;
 let stepWidth=max(6.,.55*half);let stepIndex=floor((z.y+half)/stepWidth);let fold=select(.52,1.12,i32(stepIndex)%2==0);
 let inner=edge-thickness*fold;let d=max(max(z.x-edge,inner-z.x),abs(z.y)-half);let tail=1.-ease((t-.48)/.48);
 let bodyColour=mix(vec3f(.035,.19,.61),vec3f(.035,.62,.99),sat((z.x-inner)/max(thickness,1.)));
 var out=light(d,bodyColour,1.1*tail*strength,6.,obs);
 let leading=max(abs(z.x-edge)-1.5,abs(z.y)-half*.99);out=add(out,light(leading,vec3f(.53,.96,1.),3.2*tail*strength,3.,obs));
 let folded=max(abs(z.x-inner)-1.,abs(z.y)-half);out=add(out,light(folded,vec3f(.02,.37,.93),.9*tail*strength,2.,obs));
 let elbow=vec2f(.57*inner,0.);let supply=min(segment(z,vec2f(8.,0.),elbow),segment(z,elbow,vec2f(inner,.34*half*sign)))-1.35;
 let supplyLife=ease(t/.05)*(1.-ease((t-.30)/.42));out=add(out,light(supply,vec3f(.04,.46,1.),.76*supplyLife*strength,2.,obs));
 let corePower=exp(-t*12.)*strength;
 out=add(out,light(poly(q,4.)-(8.-min(t*13.,6.)),vec3f(.75,1.,1.),6.*corePower,9.,obs));
 if(obs>.0){let h=exp(-abs(q.y)/1.6-abs(q.x)/(38.+40.*corePower));let v=exp(-abs(q.x)/2.-abs(q.y)/27.);out=add(out,vec4f(vec3f(.45,.85,1.)*(h+v)*corePower*1.5,(h+v)*corePower*.11));}
 return out;
}
@fragment fn fs(i:VOut)->@location(0) vec4f {
 let e=events[i.index];let kind=i32(e.phase.x);let negative=e.phase.y;let axis=e.phase.z;let wall=e.phase.w;
 let duration=e.state.x;let reduced=e.state.y;let obs=e.state.z;let scale=u.viewport.z;let sourceHalfSpan=e.geometry.x;
 let q=i.q/scale;let r=e.position.z/scale;let age=e.position.w;let t=sat(age/duration);let sign=1.-negative*2.;
 var out=vec4f(0.);var fade=1.;
 if(kind==0) {
  // Charge remains a charged capacitor until an authoritative settlement or wall deadline.
  let fill=min(age/900.,1.);out=capacitor(q,fill,sign,obs,reduced);fade=ease(wall/70.);
 } else if(kind==1) {out=pulse(rot(q,sign*.05),t,r,sign,1.,obs,reduced);fade=ease(age/25.)*(1.-ease((t-.92)/.08));
 } else if(kind==2) {
  let z=rot(q,axis);let merge=ease(age/360.);let separation=42.*(1.-merge);let pairFade=1.-ease((age-300.)/180.);
  out=add(capacitor(z-vec2f(separation,0.),merge,sign,obs,reduced),capacitor(z+vec2f(separation,0.),merge,sign,obs,reduced))*pairFade*.52;
  let bridge=box(z,vec2f(separation+3.,5.+merge*7.));out=add(out,light(bridge,vec3f(.6,.96,1.),3.*sin(merge*3.14159265)*pairFade,5.,obs));
  if(age>=300.){let waveT=(age-300.)/(duration-300.);let lobe=30.*ease(waveT/.25);let waveQ=vec2f(z.x-select(-1.,1.,z.x>=0.)*lobe,z.y*1.22);out=add(out,pulse(waveQ,waveT,r*.85,sign,1.6,obs,reduced));}
  fade=ease(age/35.)*(1.-ease((t-.94)/.06));
 } else if(kind==3) {
  let z=rot(q,axis);let collapse=ease(age/650.);let separation=52.*(1.-collapse);
  let bankFade=1.-ease((age-530.)/250.);
  for(var side=-1.;side<=1.;side+=2.){
   let local=z-vec2f(side*separation,0.);let curved=local.x;let slab=box(local,vec2f(5.+(1.-collapse)*12.,28.-collapse*10.));
   let colour=select(vec3f(.08,.7,1.),vec3f(.54,.25,1.),side>0.);
   out=add(out,light(slab,colour,2.*bankFade,4.,obs));
   let inward=box(local+vec2f(side*8.*(1.-collapse),0.),vec2f(1.4,24.-collapse*10.));
   out=add(out,light(inward,vec3f(.83,.96,1.),3.*bankFade,2.,obs));
  }
  let seamLife=ease(age/300.)*(1.-ease((age-600.)/650.));
  let seam=box(z,vec2f(1.8+4.*(1.-collapse),48.*(1.-ease((age-640.)/540.))));
  out=add(out,light(seam,vec3f(.85,.93,1.),4.*seamLife,5.,obs));
  fade=ease(age/40.)*(1.-ease((age-1250.)/300.));
 } else {
  // Three substantial interrupted storage buses; the gap and offset halves mean equipment disruption.
  let reveal=ease(age/220.);let life=1.-ease((wall-(duration-180.))/180.);
  let shift=6.*(1.-reveal);let z=q;
  for(var row=0;row<3;row++){
   let y=(f32(row)-1.)*14.;let stagger=select(-4.,4.,row==1);
   let left=box(z-vec2f(-15.-shift,y),vec2f(10.,4.8));
   let right=box(z-vec2f(15.+shift,y+stagger),vec2f(10.,4.8));
   out=add(out,light(min(left,right),vec3f(.1,.48,1.),1.05*life,2.5,obs));
   let endcap=min(box(z-vec2f(-5.-shift,y),vec2f(1.,4.8)),box(z-vec2f(5.+shift,y+stagger),vec2f(1.,4.8)));
   out=add(out,light(endcap,vec3f(.72,.97,1.),1.85*life,1.8,obs));
  }
  let scanY=-25.+52.*ease(age/310.);let scanLife=1.-ease((age-250.)/170.);
  out=add(out,light(box(z-vec2f(0.,scanY),vec2f(31.,2.2)),vec3f(.42,.88,1.),3.*scanLife,5.,obs));
  fade=reveal*life;
 }
 if(negative>.5 && kind!=3){out=vec4f(out.b*.77+out.r*.23,out.g*.58,out.b,out.a);}
 // Exact finite mask: no nonzero radiance is allowed outside its coverage support.
 let bound=1.-smoothstep(r*1.12,r*1.23,length(q));out*=fade*bound;
 if(max(out.r,max(out.g,out.b))<.004){return vec4f(0.);}
 // RGBA8 quantization must not round coverage to zero while retaining radiance.
 return vec4f(out.rgb,clamp(max(1./255.,max(out.a,max(out.r,max(out.g,out.b))*.035)),0.,1.));
}`;

export async function createEmpRenderer(canvas) {
  if(!navigator.gpu)throw new Error('WebGPU is required');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');
  const device=await adapter.requestDevice();const errors=[];
  device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  const module=device.createShaderModule({code:SHADER});const compilation=await module.getCompilationInfo();
  const failures=compilation.messages.filter(x=>x.type==='error');if(failures.length)throw new Error(failures.map(x=>`${x.lineNum}: ${x.message}`).join('\n'));
  const context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode:'premultiplied',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  const uniforms=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const buffer=device.createBuffer({size:64*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
  const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}},{binding:1,resource:{buffer}}]});
  let submits=0,lastTexture;const packed=new Float32Array(64*16);
  const adapterInfo=Object.fromEntries(['vendor','architecture','device','description'].map(key=>[key,adapter.info?.[key]||'unavailable']));
  return {device,errors,adapterInfo,compilation:compilation.messages,
    render(events,{scale=1,offsetX=0,offsetY=0,reducedMotion=false,observation=true,background=[.018,.025,.045,1]}={}){
      const visible=events.filter(e=>{const x=e.x*scale+offsetX,y=e.y*scale+offsetY,b=e.radius*scale*1.23;return x+b>=0&&y+b>=0&&x-b<canvas.width&&y-b<canvas.height;}).slice(0,64);
      device.queue.writeBuffer(uniforms,0,new Float32Array([canvas.width,canvas.height,scale,0]));
      visible.forEach((e,index)=>packed.set([e.x*scale+offsetX,e.y*scale+offsetY,e.radius*scale,e.visualMs,TYPES[e.type],e.variant==='negative'?1:0,finite(e.empSourceAxis),e.wallMs,e.duration,reducedMotion?1:0,observation?1:0,0,finite(e.sourceHalfSpan),0,0,0],index*16));
      if(visible.length)device.queue.writeBuffer(buffer,0,packed.subarray(0,visible.length*16));
      const texture=context.getCurrentTexture();lastTexture=texture;const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:background,loadOp:'clear',storeOp:'store'}]});
      pass.setPipeline(pipeline);pass.setBindGroup(0,group);if(visible.length)pass.draw(6,visible.length);pass.end();device.queue.submit([encoder.finish()]);submits++;
      return {submits,visible,texture};
    },
    async inspectPixels(){
      const stride=Math.ceil(canvas.width*4/256)*256,read=device.createBuffer({size:stride*canvas.height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const encoder=device.createCommandEncoder();encoder.copyTextureToBuffer({texture:lastTexture},{buffer:read,bytesPerRow:stride},{width:canvas.width,height:canvas.height});device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ);
      const bytes=new Uint8Array(read.getMappedRange());let active=0,transparentRGB=0,alphaTotal=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const n=y*stride+x*4,a=bytes[n+3];if(a)active++;else if(bytes[n]||bytes[n+1]||bytes[n+2])transparentRGB++;alphaTotal+=a;}
      read.unmap();read.destroy();return {active,transparentRGB,alphaTotal};
    },
    destroy(){uniforms.destroy();buffer.destroy();context.unconfigure();device.destroy();}
  };
}

