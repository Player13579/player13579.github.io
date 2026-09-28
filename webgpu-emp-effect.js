/* Astra EMP v1.8 WebGPU integration. The app owns event admission, ordering and legacy audio. */
(function(root){
  'use strict';
  const TYPES=Object.freeze({'emp-charge':0,emp:1,'emp-resonance':2,'emp-cancel':3,'emp-storage-lock':4});
  const DURATIONS=Object.freeze({'emp-charge':1200,emp:1200,'emp-resonance':1600,'emp-cancel':1600,'emp-storage-lock':7000});
  const finite=Number.isFinite;
  const shader=/* wgsl */ `
struct Params {viewport:vec4f, position:vec4f, phase:vec4f, state:vec4f, geometry:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
struct VOut {@builtin(position) position:vec4f,@location(0) q:vec2f};
@vertex fn vs(@builtin(vertex_index) v:u32)->VOut {
 let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let extent=max(100.,u.position.z*1.23);let local=corners[v]*extent;
 let pixel=u.position.xy+local*u.viewport.zw;var o:VOut;o.position=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);o.q=local;return o;
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
 // Transparent emitted field: coverage fades with source power. Fixed opaque
 // coverage on a extinguished face would create a dark wire on light backgrounds.
 return vec4f(energy,max(cov*.16,halo*.055)*sat(power));
}
fn add(a:vec4f,b:vec4f)->vec4f{return vec4f(a.rgb+b.rgb,1.-(1.-a.a)*(1.-b.a));}
fn capacitor(q:vec2f,t:f32,sign:f32,obs:f32,reduced:f32)->vec4f {
 let f=ease(t);let z=rot(q,sign*.09*(1.-reduced)*f);let h=70.+f*12.;
 // Opposed curved voltage sheets compress a luminous volume; no icon, radial spokes or orbiting ring.
 let interior=length(z/vec2f(35.+f*8.,h)) - 1.;
 var out=vec4f(vec3f(.03,.22,.55)*mask(interior*30.)*(.25+.45*f),mask(interior*30.)*.12);
 for(var side=-1.;side<=1.;side+=2.){
  let edge=side*(76.-f*49.+24.*pow(z.y/h,2.));
  let sheet=max(abs(z.x-edge)-(6.+f*4.),abs(z.y)-h);
  out=add(out,light(sheet,vec3f(.025,.45,.94),.9+1.6*f,6.,obs));
  let seam=max(abs(z.x-(edge-side*(5.+f*3.)))-1.6,abs(z.y)-h*.91);
  out=add(out,light(seam,vec3f(.60,.97,1.),1.8+2.5*f,4.,obs));
 }
 // Inward travelling cross-sections feed the source, with three unequal arrival times.
 for(var j=0;j<3;j++){
  let k=f32(j);let transport=fract(t*1.35+k*.34);let x=91.-transport*65.;
  let y=z.y/(68.-k*12.);let contour=abs(z.x)-(x+19.*y*y);
  let d=max(abs(contour)-(2.5+transport*3.),abs(z.y)-(68.-k*12.));
  out=add(out,light(d,vec3f(.05,.62,1.),sin(transport*3.14159)*(.55+k*.15),3.,obs));
 }
 // Two broad, moving equipotential folds transport charge into the central source.
 for(var j=0;j<2;j++){
  let level=(select(-1.,1.,j==1))*(37.-27.*f);
  let fold=level+8.*smoothstep(-26.,-12.,z.x)-12.*smoothstep(5.,18.,z.x);
  let d=max(abs(z.y-fold)-(2.+f*2.),abs(z.x)-(43.-f*16.));
  out=add(out,light(d,vec3f(.10,.70,1.),(.7+f)*.9,3.,obs));
 }
 let core=(length(z/vec2f(8.+14.*f,15.+17.*f))-1.)*12.;
 out=add(out,light(core,vec3f(.52,.94,1.),1.3+3.5*f,7.,obs));
 return out;
}
fn pulse(q:vec2f,t:f32,radius:f32,sign:f32,strength:f32,obs:f32,reduced:f32)->vec4f {
 let expansion=sat(t/.78);let r=14.+(radius-14.)*expansion;
 let tail=1.-ease((t-.51)/.48);var out=vec4f(0.);
 // Open voltage curtains move outward. Their bright face, thick trailing cross-section,
 // and slower secondary sheets encode propagation without a closed barrier silhouette.
 for(var j=0;j<3;j++){
  let k=f32(j);let localTime=t-k*.125;let front=14.+(radius-14.)*sat(localTime/(.78-k*.035));let h=37.+front*.63;
  let yn=q.y/h;let end=1.-smoothstep(.67,1.,abs(yn));
  let bend=front*(1.-.33*yn*yn);
  let fault=(smoothstep(-.32,-.21,yn)-smoothstep(.20,.31,yn))*front*.09*sign;
  let distance=abs(q.x)-bend-fault;
  let width=8.+front*(.13-k*.022);let body=mask(distance)*mask(-distance-width)*end;
  let born=ease(localTime/.045);let power=tail*strength*pow(.64,k)*born;
  out=add(out,vec4f(vec3f(.035,.33,.92)*body*power*(.55+.65*exp(distance/max(width*.35,1.))),body*.11*power));
  let face=max(abs(distance)-1.6,abs(q.y)-h*.96);
  out=add(out,light(face,vec3f(.55,.97,1.),(1.8-k*.28)*power*end,5.,obs));
  let inner=max(abs(distance+width*.78)-2.,abs(q.y)-h*.83);
  out=add(out,light(inner,vec3f(.02,.61,1.),.70*power*end,3.,obs));
 }
 // A retarded travelling disturbance binds the source to the leading face.
 // Three broad electric flux sections fan outward from the source, with a moving
 // kink and a chromatic wake rather than uniformly inflating horizontal bars.
 for(var j=0;j<3;j++){
  let row=f32(j)-1.;let x=abs(q.x);let behind=r-x;
  let envelope=mask(x-r)*mask(4.-x)*(1.-ease((t-.70)/.28));
  let kink=(smoothstep(0.,15.,behind)-smoothstep(36.,59.,behind))*sign*select(-1.,1.,j==1);
  let y=row*(9.+x*.37)+kink*(9.+x*.11);
  let width=2.5+4.*exp(-pow((behind-25.)/30.,2.));
  let band=max(abs(q.y-y)-width,x-r*.96);
  let transport=.23+.95*exp(-pow((behind-24.)/24.,2.));
  out=add(out,light(band,vec3f(.04,.54,1.),transport*tail*strength*envelope,4.,obs));
  let tip=max(abs(q.y-y)-1.1,abs(behind-21.)-13.);
  out=add(out,light(tip,vec3f(.56,.96,1.),.85*tail*strength*envelope,3.,obs));
 }
 let corePower=exp(-t*8.)*strength;
 out=add(out,light(poly(q,4.)-(8.-min(t*13.,6.)),vec3f(.75,1.,1.),6.*corePower,9.,obs));
 // Source-bound two-axis display flare. It disappears with source power, not with the wave tail.
 if(obs>.0){let h=exp(-abs(q.y)/1.6-abs(q.x)/(38.+40.*corePower));let v=exp(-abs(q.x)/2.-abs(q.y)/27.);out=add(out,vec4f(vec3f(.45,.85,1.)*(h+v)*corePower*1.5,(h+v)*corePower*.11));}
 return out;
}
@fragment fn fs(i:VOut)->@location(0) vec4f {
 let kind=i32(u.phase.x);let negative=u.phase.y;let axis=u.phase.z;let wall=u.phase.w;
 let duration=u.state.x;let reduced=u.state.y;let obs=u.state.z;let sourceHalfSpan=u.geometry.x;
 let q=i.q;let r=u.position.z;let age=u.position.w;let t=sat(age/duration);let sign=1.-negative*2.;
 var out=vec4f(0.);var fade=1.;
 if(kind==0) {
  // Charge remains a charged capacitor until an authoritative settlement or wall deadline.
  let fill=min(age/900.,1.);out=capacitor(q,fill,sign,obs,reduced);fade=ease(wall/70.);
 } else if(kind==1) {out=pulse(rot(q,sign*.05),t,r,sign,1.,obs,reduced);fade=ease(age/25.)*(1.-ease((t-.92)/.08));
 } else if(kind==2) {
  let z=rot(q,axis);let span=sourceHalfSpan;let waveT=t;
  let frontRadius=14.+(r*.72-14.)*sat(waveT/.78);
  out=add(pulse(z-vec2f(span,0.),waveT,r*.72,sign,.94,obs,reduced),pulse(z+vec2f(span,0.),waveT,r*.72,sign,.94,obs,reduced));
  // Interacting inward faces redirect energy across the collision axis into an open
  // saddle-shaped diffraction plume. This topology is absent from ordinary discharge.
  let contact=ease((frontRadius-span)/35.);let end=1.-ease((t-.58)/.39);
  let height=20.+sqrt(max(frontRadius*frontRadius-span*span,0.))*.92;
  let ny=abs(z.y)/height;let width=5.+contact*(9.+ny*ny*39.);
  let saddle=max(abs(z.x)-width,abs(z.y)-height);
  out=add(out,light(saddle,vec3f(.13,.57,1.),contact*end*1.1,6.,obs));
  let edge=max(abs(abs(z.x)-width)-2.,abs(z.y)-height*.95);
  out=add(out,light(edge,vec3f(.72,.97,1.),contact*end*2.8,7.,obs));
  let seam=max(abs(z.x)-3.-contact*3.,abs(z.y)-height*.78);out=add(out,light(seam,vec3f(.46,.94,1.),contact*end*1.6,5.,obs));
  fade=ease(age/35.)*(1.-ease((t-.94)/.06));
 } else if(kind==3) {
  let z=rot(q,axis);let collapse=ease(age/650.);let separation=max(38.,sourceHalfSpan)*(1.-collapse);
  let bankFade=1.-ease((age-530.)/250.);
  for(var side=-1.;side<=1.;side+=2.){
   let local=z-vec2f(side*separation,0.);let curved=local.x-side*local.y*local.y/180.;let slab=max(abs(curved)-(9.+(1.-collapse)*13.),abs(local.y)-(55.-collapse*15.));
   let colour=select(vec3f(.08,.7,1.),vec3f(.54,.25,1.),side>0.);
   out=add(out,light(slab,colour,2.*bankFade,4.,obs));
   let inward=max(abs(curved+side*(9.+(1.-collapse)*10.))-1.5,abs(local.y)-(52.-collapse*15.));
   out=add(out,light(inward,vec3f(.83,.96,1.),3.*bankFade,2.,obs));
  }
  let seamLife=ease(age/300.)*(1.-ease((age-600.)/650.));
  let seam=box(z,vec2f(3.5+9.*(1.-collapse),60.*(1.-ease((age-640.)/540.))));
  out=add(out,light(seam,vec3f(.85,.93,1.),4.*seamLife,5.,obs));
  fade=ease(age/40.)*(1.-ease((age-1250.)/300.));
 } else {
  // Receiver space becomes a sheared, broken field: three broad voltage bands lose
  // phase continuity across the centre, followed by a quiet persistent lock state.
  let reveal=ease(age/220.);let life=1.-ease((wall-(duration-180.))/180.);
  let shift=12.*(1.-reveal);let z=q;
  for(var row=0;row<3;row++){
   let y=(f32(row)-1.)*34.;let stagger=select(-11.,11.,row==1);let bend=z.x*.19+8.*smoothstep(-30.,-12.,z.x);
   let left=box(vec2f(z.x+36.+shift,z.y-y-bend),vec2f(29.,8.));
   let right=box(vec2f(z.x-36.-shift,z.y-y-bend-stagger),vec2f(29.,8.));
   out=add(out,light(min(left,right),vec3f(.1,.48,1.),1.05*life,2.5,obs));
   let endcap=min(box(vec2f(z.x+7.+shift,z.y-y-bend),vec2f(1.5,8.)),box(vec2f(z.x-7.-shift,z.y-y-bend-stagger),vec2f(1.5,8.)));
   out=add(out,light(endcap,vec3f(.72,.97,1.),1.85*life,1.8,obs));
  }
  let scanY=-49.+98.*ease(age/310.);let scanLife=1.-ease((age-250.)/170.);
  out=add(out,light(box(z-vec2f(0.,scanY),vec2f(59.,3.2)),vec3f(.42,.88,1.),3.*scanLife,5.,obs));
  fade=reveal*life;
 }
 if(negative>.5 && kind!=3){out=vec4f(out.b*.77+out.r*.23,out.g*.58,out.b,out.a);}
 // Exact finite mask: no nonzero radiance is allowed outside its coverage support.
 let bound=1.-smoothstep(r*1.12,r*1.23,length(q));out*=fade*bound;
 if(max(out.r,max(out.g,out.b))<.004){return vec4f(0.);}
 // RGBA8 quantization must not round coverage to zero while retaining radiance.
 return vec4f(out.rgb,clamp(max(1./255.,max(out.a,max(out.r,max(out.g,out.b))*.035)),0.,1.));
}`;
  const pulseOrigins=new Map();
  function trimOrigins(now){
    for(const [id,origin] of pulseOrigins)if(now-origin.seenAt>60000)pulseOrigins.delete(id);
    while(pulseOrigins.size>512)pulseOrigins.delete(pulseOrigins.keys().next().value);
  }
  function plan({effect,now,phase,camera,zoom,viewport,reducedMotion=false,alpha=1,
    storageActor=null,observation=true}={}){
    const mode=TYPES[effect?.type];
    if(mode===undefined||!['playing','meeting'].includes(phase)||!effect?.id||!camera||viewport?.kind!=='main')return null;
    const duration=Math.max(DURATIONS[effect.type],Number(effect.duration)||Number(effect.durationMs)||0);
    if(![effect.x,effect.y,effect.startedAt,now,camera.x,camera.y,zoom,alpha,
      viewport.width,viewport.height,viewport.pixelWidth,viewport.pixelHeight,duration].every(finite)||
      zoom<=0||alpha<=0||alpha>1||duration<=0||viewport.width<=0||viewport.height<=0||
      !Number.isInteger(viewport.pixelWidth)||!Number.isInteger(viewport.pixelHeight)||
      viewport.pixelWidth<=0||viewport.pixelHeight<=0)return null;
    const elapsed=finite(effect.visualMs)?effect.visualMs:now-effect.startedAt;
    const wallMs=finite(effect.wallMs)?effect.wallMs:now-effect.startedAt;
    const stateBound=effect.type==='emp-charge'||effect.type==='emp-storage-lock';
    const lifetime=stateBound?wallMs:elapsed,progress=elapsed/duration;
    if(lifetime<=0||lifetime>=duration||progress<=0||progress>=1)return null;
    let sourceX=effect.x,sourceY=effect.y;
    if(effect.type==='emp-storage-lock'&&storageActor){
      if(String(storageActor.id)!==String(effect.playerId)||storageActor.alive===false||storageActor.ejected===true)return null;
      const x=finite(storageActor.renderedX)?storageActor.renderedX:storageActor.x;
      const y=finite(storageActor.renderedY)?storageActor.renderedY:storageActor.y;
      if(finite(x)&&finite(y)){sourceX=x;sourceY=y;}
    }
    const radiusWorld=Math.max(16,Math.max(0,Number(effect.radius)||
      (effect.type==='emp-storage-lock'?105:effect.type==='emp-charge'?125:260)));
    const scaleX=zoom*viewport.pixelWidth/viewport.width,scaleY=zoom*viewport.pixelHeight/viewport.height;
    const x=(sourceX-camera.x)*scaleX,y=(sourceY-camera.y)*scaleY;
    let sourceHalfSpan=Number(effect.sourceHalfSpan);
    if(effect.type==='emp-charge'&&effect.empPulseId){
      pulseOrigins.set(String(effect.empPulseId),{x:effect.x,y:effect.y,seenAt:now});trimOrigins(now);
    }
    if(effect.type==='emp-resonance'||effect.type==='emp-cancel'){
      if(!finite(effect.empSourceAxis))return null;
      if(!finite(sourceHalfSpan)||sourceHalfSpan<=0){
        const pulseIds=Array.isArray(effect.resolvedEmpPulseIds)?effect.resolvedEmpPulseIds:[];
        const source=pulseIds.map(id=>pulseOrigins.get(String(id))).find(Boolean);
        if(source)sourceHalfSpan=Math.hypot(source.x-effect.x,source.y-effect.y);
        if(!finite(sourceHalfSpan)||sourceHalfSpan<=0)return null;
      }
    }
    if(!finite(sourceHalfSpan)||sourceHalfSpan<0)sourceHalfSpan=0;
    const negative=effect.variant==='negative';
    const values=new Float32Array([
      x,y,radiusWorld,elapsed,
      mode,negative?1:0,finite(effect.empSourceAxis)?effect.empSourceAxis:0,wallMs,
      duration,reducedMotion?1:0,observation?1:0,0,
      sourceHalfSpan,0,0,0
    ]);
    if(!values.every(finite))return null;
    return Object.freeze({effectId:String(effect.id),type:effect.type,mode,ownerId:String(effect.playerId||''),
      empPulseId:String(effect.empPulseId||''),resolvedEmpPulseIds:Object.freeze(Array.isArray(effect.resolvedEmpPulseIds)?effect.resolvedEmpPulseIds.map(String):[]),
      sourceX,sourceY,x,y,radiusWorld,scaleX,scaleY,elapsed,wallMs,duration,progress,negative,
      reducedMotion:Boolean(reducedMotion),sourceHalfSpan,values});
  }
  function create({renderer,frameOwner=renderer}={}){
    if(frameOwner?.state!=='ready'||!frameOwner.device?.createShaderModule||
      !frameOwner.device?.queue?.writeBuffer||typeof frameOwner.own!=='function'||typeof frameOwner.release!=='function')
      throw new TypeError('EMP effect requires the shared WebGPU frame owner');
    const device=frameOwner.device,format=frameOwner.format;
    const module=device.createShaderModule({label:'Astra EMP v1.8 WGSL',code:shader});
    const pipeline=device.createRenderPipeline({label:'Astra EMP v1.8 ordered field',layout:'auto',
      vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,
        blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
          alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
      primitive:{topology:'triangle-list'}});
    const slots=[],indices=new WeakMap();let destroyed=false;
    function slot(index){
      if(slots[index])return slots[index];
      const uniform=frameOwner.own(device.createBuffer({label:`Astra EMP v1.8 ${index}`,size:80,usage:0x40|0x08}));
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
      return(slots[index]={uniform,bindGroup});
    }
    function record({frame,target,viewport,planned}={}){
      if(destroyed||frameOwner.state!=='ready')throw new Error('EMP effect pass unavailable');
      if(typeof frame?.add!=='function'||typeof frame?.stage!=='function'||typeof target!=='string'||!target||
        !planned||planned.values?.length!==16||viewport?.pixelWidth<=0||viewport?.pixelHeight<=0)
        throw new TypeError('EMP effect needs a current shared frame, target, viewport and plan');
      const index=indices.get(frame)||0,{uniform,bindGroup}=slot(index);
      const packed=new Float32Array(20);
      packed.set([viewport.pixelWidth,viewport.pixelHeight,
        planned.scaleX||1,planned.scaleY||1]);
      packed.set(planned.values,4);device.queue.writeBuffer(uniform,0,packed);
      frame.stage(`world:emp:${planned.effectId}`);
      frame.add({target,label:`Astra EMP v1.8 ${planned.effectId}`,encode(pass,info){
        if(info.device!==device||info.format!==format||info.width!==viewport.pixelWidth||info.height!==viewport.pixelHeight)
          throw new Error('EMP pass target device, format or backing size mismatch');
        pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(6);
      }});
      indices.set(frame,index+1);return Object.freeze({effectId:planned.effectId,type:planned.type,drawn:true});
    }
    return Object.freeze({device,plan,record,shader,get state(){return destroyed?'destroyed':frameOwner.state;},
      destroy(){if(destroyed)return;destroyed=true;for(const item of slots)if(frameOwner.release(item.uniform))item.uniform.destroy();slots.length=0;}});
  }
  const api=Object.freeze({TYPES,DURATIONS,shader,plan,create});root.DvaWebGPUEmpEffect=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
