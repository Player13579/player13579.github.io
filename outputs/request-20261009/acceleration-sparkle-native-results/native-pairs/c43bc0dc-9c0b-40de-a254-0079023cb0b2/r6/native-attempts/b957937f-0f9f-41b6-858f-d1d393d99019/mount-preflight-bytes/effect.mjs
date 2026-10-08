// R6 finite accelerating energy-carrier transfer. No generated textures.
export const DURATION_MS=1000;
export const VERSION='acceleration-benefit-zero-sol61-r6';
export const B_SOURCE=Object.freeze({commit:'22d3fcfd617f42b1a967de767906204c0221ec64',baseBlob:'8f1286e12402fe7b19650ad44bcddb38ad227a08',extensionBlob:'f35b61661d0209c0329d4a501a760d35b451d52e'});
export const COMPRESSION_STARTS=Object.freeze([.04,.30,.56]);
export const PACKET_TRAVEL_TIMES=Object.freeze([.38,.32,.26]);
export const RECEIPT_TIMES=Object.freeze([.42,.62,.82]);
export const SOURCE_ANCHOR_FRACTIONS=Object.freeze([-.45,-.10,.25,.60]);
export const SOURCE_COUNT=32;
export const SOURCE_STARTS=Object.freeze([
  ...Array.from({length:24},(_,i)=>{
    const carrier=Math.floor(i/4),packet=Math.floor(carrier/2),anchor=i%4;
    return COMPRESSION_STARTS[packet]+PACKET_TRAVEL_TIMES[packet]*(.12+.13*anchor);
  }),
  ...Array.from({length:8},(_,i)=>.60+.035*i)
]);
export const SOURCE_LIVES=Object.freeze(Array.from({length:SOURCE_COUNT},(_,i)=>i<24?.12+(.04/3)*(i%4):.12+.01*((i-24)%4)));
export const OPTICAL_MODEL=Object.freeze({axisDegrees:17.5,crossWidthH:.0018,rayDecayH:.018,sourceRadiusH:.0024,cutoffDecays:6});
const smooth=(a,b,x)=>{const s=Math.max(0,Math.min(1,(x-a)/(b-a)));return s*s*(3-2*s);};
export function sampleTimeline(elapsedMs){
  const active=Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<DURATION_MS,t=active?elapsedMs/1000:0;
  return Object.freeze({active,progress:active?t:elapsedMs>=1000?1:0,phase:!active?'inactive':t<.1?'formation':t<.82?'transport':t<.94?'receiving':'release',envelope:active?smooth(0,.08,t)*(1-smooth(.94,1,t)):0});
}
export function packetFrame(index,elapsedMs,{side=1,reducedMotion=false,receiverX=-.16,direction=1}={}){
  if(!Number.isInteger(index)||index<0||index>2)throw new TypeError('Invalid packet index');
  if(!Number.isFinite(receiverX))throw new TypeError('Finite receiver edge required');
  const frame=sampleTimeline(elapsedMs),age=(frame.progress-COMPRESSION_STARTS[index])/PACKET_TRAVEL_TIMES[index];
  const q=Math.max(0,Math.min(1,age)),s=q*q,compression=smooth(.58,1,q),lane=Math.sign(side||1),dir=direction<0?-1:1;
  const start=reducedMotion?-.43:-.62,contactY=.045+lane*.105;
  const y=contactY+lane*(reducedMotion?.065:.105)*(1-s),x=start+(receiverX-start)*s;
  const dx=receiverX-start,dy=-lane*(reducedMotion?.065:.105),norm=Math.hypot(dx,dy);
  const halfLength=.18*(1-.08*index)*(1-.68*compression),halfWidth=.045*(1-.28*compression),halfDepth=.038*(1-.25*compression);
  const gate=frame.active&&age>=0&&age<1?smooth(0,.08,age)*(1-smooth(.91,1,age)):0;
  return Object.freeze({age,s,compression,x:x*dir,y,contactY,tangent:Object.freeze([dx/norm*dir,dy/norm]),normal:Object.freeze([-dy/norm*dir,dx/norm]),halfLength,halfWidth,halfDepth,gate,volumeProxy:halfLength*halfWidth*halfDepth});
}
export function receiptState(index,elapsedMs){
  if(!Number.isInteger(index)||index<0||index>2)throw new TypeError('Invalid receipt index');
  const frame=sampleTimeline(elapsedMs),age=frame.progress-RECEIPT_TIMES[index],gate=frame.active&&age>=0?smooth(0,.010,age)*(1-smooth(.12,.17,age)):0;
  return Object.freeze({age,gate,frontX:-.16+.32*smooth(0,.12,age),exitGate:gate*smooth(.07,.12,age),settled:0});
}
function sourcePulse(index,elapsedMs){
  const frame=sampleTimeline(elapsedMs);if(!frame.active)return 0;
  const age=(frame.progress-SOURCE_STARTS[index])/SOURCE_LIVES[index];
  if(age<=0||age>=1)return 0;
  let carrierGate=1;
  if(index<24){
    const carrier=Math.floor(index/4),lane=carrier%2===1?1:-1;
    carrierGate=packetFrame(Math.floor(carrier/2),elapsedMs,{side:lane}).gate;
    if(carrierGate<=0)return 0;
  }
  return Math.sin(Math.PI*age)**2*frame.envelope*carrierGate;
}
export function sourceState(index,elapsedMs,{direction=1,receiverX=-.16}={}){
  if(!Number.isInteger(index)||index<0||index>=SOURCE_COUNT)throw new TypeError('Invalid source index');
  const age=(sampleTimeline(elapsedMs).progress-SOURCE_STARTS[index])/SOURCE_LIVES[index];
  if(index>=24){
    const receiver=index-24,rimY=-.18+.46*receiver/7;
    return Object.freeze({index,kind:'receiver-rim',age,life:SOURCE_LIVES[index],start:SOURCE_STARTS[index],flux:sourcePulse(index,elapsedMs),active:sourcePulse(index,elapsedMs)>0,attached:true,receiverRimY:rimY,position:null});
  }
  const carrier=Math.floor(index/4),packetIndex=Math.floor(carrier/2),side=carrier%2===1?1:-1,anchor=index%4;
  const packet=packetFrame(packetIndex,elapsedMs,{side,direction,receiverX});
  const along=SOURCE_ANCHOR_FRACTIONS[anchor]*packet.halfLength,normal=(anchor%2===0?-.25:.25)*packet.halfWidth;
  const position=Object.freeze([packet.x+packet.tangent[0]*along+packet.normal[0]*normal,packet.y+packet.tangent[1]*along+packet.normal[1]*normal]);
  const flux=sourcePulse(index,elapsedMs);
  return Object.freeze({index,kind:'carrier',age,life:SOURCE_LIVES[index],start:SOURCE_STARTS[index],flux,active:flux>0,attached:packet.gate>0,carrier,packetIndex,side,anchor,alongFraction:SOURCE_ANCHOR_FRACTIONS[anchor],normalFraction:anchor%2===0?-.25:.25,packetGate:packet.gate,packetCenter:Object.freeze([packet.x,packet.y]),position});
}
export function inspectTransport(elapsedMs){const frame=sampleTimeline(elapsedMs);return Object.freeze({active:frame.active,packets:Object.freeze(COMPRESSION_STARTS.map((_,i)=>packetFrame(i,elapsedMs))),receipts:Object.freeze(RECEIPT_TIMES.map((_,i)=>receiptState(i,elapsedMs))),sources:Object.freeze(SOURCE_STARTS.map((_,i)=>sourcePulse(i,elapsedMs))),sourceDetails:Object.freeze(SOURCE_STARTS.map((_,i)=>sourceState(i,elapsedMs)))});}

export const WGSL="struct Params { viewport:vec4f, body:vec4f, toggles:vec4f, gates:vec4f };\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorImage:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\nstruct VertexOutput { @builtin(position) position:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->VertexOutput {\n  var xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n  var o:VertexOutput;o.position=vec4f(xy[i],0.,1.);return o;\n}\nfn actorAt(pixel:vec2f)->vec4f {\n  let uv=(pixel-u.viewport.zw)/vec2f(u.body.y,u.body.x)+vec2f(.5);\n  if(any(uv<vec2f(0.))||any(uv>vec2f(1.))) {return vec4f(0.);}\n  return textureSampleLevel(actorImage,actorSampler,uv,0.);\n}\nfn pixelAt(p:vec2f)->vec2f {return u.viewport.zw+vec2f(p.x*u.body.w,p.y)*u.body.x;}\nfn envelope(t:f32)->f32 {return smoothstep(0.,.08,t)*(1.-smoothstep(.94,1.,t));}\nfn actorRim(side:f32,y:f32)->vec2f {\n  // Same registered crop/alpha and direction transform as the actual actor.\n  // Find the outermost opaque support, then refine its next coarse interval.\n  var edge=.16;var found=false;\n  for(var j=0u;j<12u;j++) {\n    let x=.012+f32(j)*.029;\n    if(actorAt(pixelAt(vec2f(side*x,y))).a>.25) {edge=x;found=true;}\n  }\n  if(found) {\n    var lo=edge;var hi=edge+.029;\n    for(var j=0u;j<3u;j++) {\n      let mid=(lo+hi)*.5;\n      if(actorAt(pixelAt(vec2f(side*mid,y))).a>.25) {lo=mid;}else {hi=mid;}\n    }\n    edge=(lo+hi)*.5;\n  }\n  return vec2f(side*(edge+.008),y);\n}\nstruct Packet { center:vec2f, tangent:vec2f, normal:vec2f, halfSize:vec3f, compression:f32, gate:f32, depth:f32 };\nfn packetFrame(i:u32,side:f32,t:f32,receiverX:f32)->Packet {\n  let starts=array<f32,3>(.04,.30,.56);let lives=array<f32,3>(.38,.32,.26);\n  let age=(t-starts[i])/lives[i];let q=clamp(age,0.,1.);let s=q*q;\n  let compression=smoothstep(.58,1.,q);\n  let start=mix(-.62,-.43,u.toggles.w);let rise=mix(.105,.065,u.toggles.w);\n  let center=vec2f(mix(start,receiverX,s),.045+side*.105+side*rise*(1.-s));\n  let tangent=normalize(vec2f(receiverX-start,-side*rise));\n  let size=vec3f(.18*(1.-.08*f32(i))*(1.-.68*compression),.045*(1.-.28*compression),.038*(1.-.25*compression));\n  let gate=select(0.,smoothstep(0.,.08,age)*(1.-smoothstep(.91,1.,age)),age>=0.&&age<1.);\n  return Packet(center,tangent,vec2f(-tangent.y,tangent.x),size,compression,gate,.045-.085*s);\n}\nfn packetMedium(point:vec3f,packet:Packet,spreadScale:f32)->vec3f {\n  let delta=point.xy-packet.center;\n  let longitudinal=dot(delta,packet.tangent);let across=dot(delta,packet.normal);\n  let size=packet.halfSize*vec3f(1.,spreadScale,spreadScale);\n  let depth=point.z-packet.depth-.08*across;\n  let padding=2./u.body.x;\n  if(abs(longitudinal)>size.x+padding||abs(across)>size.y+padding||abs(depth)>size.z+padding||packet.gate<=0.) {return vec3f(0.);}\n  let q=vec3f(longitudinal,across,depth)/size;\n  // Finite rounded nose and narrowing rear. It has no square shoulder,\n  // flat luminous end cap, longitudinal wake or screen-space speed line.\n  let taper=.72+.28*clamp((q.x+1.)*.5,0.,1.);\n  let metric=q.x*q.x+q.y*q.y/(taper*taper)+q.z*q.z;\n  let aa=max(.075,1.25/(u.body.x*min(size.y,size.x)));\n  let support=1.-smoothstep(1.-aa*.5,1.+aa*.5,metric);\n  let nose=smoothstep(.15,.85,q.x);\n  let shell=exp(-pow((sqrt(max(metric,0.))-.84)/.105,2.))*nose;\n  let interior=exp(-pow((q.x+.18)/.35,2.))*(1.-smoothstep(.50,.95,metric));\n  let density=support*(.34+.54*nose)*(1.+.65*packet.compression)*packet.gate;\n  let bodyEmission=support*(.12+.60*interior)*packet.gate;\n  let hotEmission=support*shell*(1.+.55*packet.compression)*packet.gate;\n  return vec3f(density,bodyEmission,hotEmission);\n}\nstruct Volume { back:vec3f, front:vec3f, alpha:f32, glow:f32 };\nfn integratePackets(p:vec2f,t:f32)->Volume {\n  var packets:array<Packet,6>;\n  let upper=actorRim(-1.,-.06).x;let lower=actorRim(-1.,.15).x;\n  for(var i=0u;i<3u;i++) {\n    packets[i*2u]=packetFrame(i,-1.,t,upper);\n    packets[i*2u+1u]=packetFrame(i,1.,t,lower);\n  }\n  var transmission=vec3f(1.);var back=vec3f(0.);var front=vec3f(0.);var glow=0.;\n  let dz=.26/13.;\n  // Back-to-front ownership is separated below; participating-medium integral\n  // is not a dielectric/plastic surface shader or an arbitrary filled plate.\n  for(var z=0u;z<13u;z++) {\n    let zz=-.13+(f32(z)+.5)*dz;var field=vec3f(0.);\n    for(var j=0u;j<6u;j++) {\n      if(packets[j].gate<=0.) {continue;}\n      field+=packetMedium(vec3f(p,zz),packets[j],1.);\n      let nearSource=packetMedium(vec3f(p,zz),packets[j],1.25);\n      glow+=(nearSource.y+.8*nearSource.z)*dz;\n    }\n    let sigma=field.x*vec3f(9.,4.,2.2);\n    let emission=vec3f(.018,.52,.90)*field.y*30.+vec3f(.045,.90,1.)*field.z*60.;\n    let attenuation=exp(-sigma*dz);\n    let exact=(vec3f(1.)-attenuation)/max(sigma,vec3f(1e-5));\n    let integral=select(vec3f(dz)*(vec3f(1.)-.5*sigma*dz),exact,sigma>vec3f(.001));\n    let radiance=transmission*emission*integral;\n    if(zz<-.02) {front+=radiance;}else {back+=radiance;}\n    transmission*=attenuation;\n  }\n  return Volume(back,front,1.-min(min(transmission.x,transmission.y),transmission.z),glow);\n}\nfn bodyIllumination(p:vec2f,t:f32)->f32 {\n  let arrivals=array<f32,3>(.42,.62,.82);var response=0.;\n  for(var lane=0u;lane<2u;lane++) {\n    let y=select(-.06,.15,lane==1u);\n    let rear=actorRim(-1.,y).x;let leading=actorRim(1.,y).x;\n    for(var i=0u;i<3u;i++) {\n      let age=t-arrivals[i];\n      let gate=smoothstep(0.,.010,age)*(1.-smoothstep(.12,.17,age));\n      let frontX=mix(rear,leading,smoothstep(0.,.12,age));\n      let band=exp(-pow((p.x-frontX)/.031,2.))*exp(-pow((p.y-y)/.052,2.));\n      let contact=exp(-pow((p.x-rear)/.037,2.))*exp(-pow((p.y-y)/.046,2.))*(1.-smoothstep(.015,.055,age));\n      // No accumulated settled floor or uniform body glow. The same causal\n      // front migrates from the rear contact to the leading material edge.\n      response+=(1.45*band+1.15*contact)*gate;\n    }\n  }\n  return response*envelope(t)*u.gates.x;\n}\nfn sourceStart(i:u32)->f32 {\n  if(i<24u) {\n    let carrier=i/4u;let anchor=i%4u;let packet=carrier/2u;\n    let starts=array<f32,3>(.04,.30,.56);let lives=array<f32,3>(.38,.32,.26);\n    return starts[packet]+lives[packet]*(.12+.13*f32(anchor));\n  }\n  return .60+.035*f32(i-24u);\n}\nfn sourceLife(i:u32)->f32 {\n  if(i<24u) {return .12+(.04/3.)*f32(i%4u);}\n  return .12+.01*f32((i-24u)%4u);\n}\nfn sourceFlux(i:u32,t:f32)->f32 {\n  let age=(t-sourceStart(i))/sourceLife(i);\n  if(age<=0.||age>=1.) {return 0.;}\n  var carrierGate=1.;\n  if(i<24u) {\n    let carrier=i/4u;let packetIndex=carrier/2u;let side=select(-1.,1.,carrier%2u==1u);\n    let y=.045+side*.105;let receiver=actorRim(-1.,y);\n    let packet=packetFrame(packetIndex,side,t,receiver.x);\n    carrierGate=packet.gate;\n    if(carrierGate<=0.) {return 0.;}\n  }\n  return pow(sin(3.14159265*age),2.)*envelope(t)*u.gates.x*carrierGate;\n}\nfn sourcePosition(i:u32,t:f32)->vec2f {\n  if(i<24u) {\n    let carrier=i/4u;let packetIndex=carrier/2u;let anchor=i%4u;\n    let side=select(-1.,1.,carrier%2u==1u);let y=.045+side*.105;\n    let rear=actorRim(-1.,y);let packet=packetFrame(packetIndex,side,t,rear.x);\n    let alongs=array<f32,4>(-.45,-.10,.25,.60);\n    let normal=select(-.25,.25,anchor%2u==1u);\n    return packet.center+packet.tangent*(alongs[anchor]*packet.halfSize.x)+packet.normal*(normal*packet.halfSize.y);\n  }\n  let receiver=i-24u;let y=mix(-.18,.28,f32(receiver)/7.);\n  return actorRim(-1.,y);\n}\nfn crossPSF(delta:vec2f,footprint:f32)->f32 {\n  let angle=17.5*3.14159265/180.;\n  let q=vec2f(cos(angle)*delta.x+sin(angle)*delta.y,-sin(angle)*delta.x+cos(angle)*delta.y);\n  let width=sqrt(.0018*.0018+footprint*footprint/12.);let decay=.018;\n  let horizontal=exp(-.5*pow(q.y/width,2.))*exp(-abs(q.x)/decay);\n  let vertical=exp(-.5*pow(q.x/width,2.))*exp(-abs(q.y)/decay);\n  let tail=1.-smoothstep(5.*decay,6.*decay,max(abs(q.x),abs(q.y)));\n  return max(horizontal,vertical)*tail;\n}\n@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {\n  let actor=actorAt(pixel.xy);let included=actor*u.toggles.z;let t=u.body.z;\n  if(t<0.||t>=1.||u.gates.x<.5) {return vec4f(included.rgb*included.a,included.a);}\n  var p=(pixel.xy-u.viewport.zw)/u.body.x;p.x*=u.body.w;\n  let aaPadding=2./u.body.x;\n  if(p.x<-.98-aaPadding||p.x>.70+aaPadding||p.y<-.58-aaPadding||p.y>.71+aaPadding) {return vec4f(included.rgb*included.a,included.a);}\n  let env=envelope(t);var volume=Volume(vec3f(0.),vec3f(0.),0.,0.);\n  if(t<.82&&(u.gates.y>.5||u.toggles.x>.5)) {volume=integratePackets(p,t);}\n  let world=(volume.back*(1.-actor.a)+volume.front*(1.-actor.a*.92))*env*u.gates.y;\n  var rgb=world+included.rgb*included.a;var coverage=max(included.a,volume.alpha*env*u.gates.y);\n  var received=0.;\n  if(actor.a>0.&&u.gates.z>.5) {received=bodyIllumination(p,t)*actor.a;}\n  rgb+=actor.rgb*vec3f(.035,.54,.72)*received*.75;\n  coverage=max(coverage,received*.32);\n  let glow=volume.glow*env*.18*u.toggles.x*(1.-actor.a*.75);\n  rgb+=vec3f(.025,.68,.92)*glow;coverage=max(coverage,glow*.50);\n  for(var i=0u;i<32u;i++) {\n    let baseFlux=sourceFlux(i,t);if(baseFlux<=0.) {continue;}\n    let sourcePoint=sourcePosition(i,t);let visibility=1.-actorAt(pixelAt(sourcePoint)).a;\n    let flux=baseFlux*visibility;let delta=p-sourcePoint;let footprint=1./u.body.x;\n    let radius=sqrt(.0024*.0024+footprint*footprint/12.);\n    let coreTail=1.-smoothstep(4.*radius,5.*radius,length(delta));\n    let worldCore=exp(-dot(delta,delta)/(2.*radius*radius))*flux*coreTail;\n    let streak=crossPSF(delta,footprint)*flux*u.toggles.x*u.toggles.y;\n    rgb+=vec3f(.73,.97,1.)*worldCore*2.+vec3f(.65,.90,1.)*streak*.92;\n    coverage=max(coverage,max(worldCore,streak*.70));\n  }\n  return vec4f(rgb,clamp(coverage,0.,1.));\n}\n";

export async function createAccelerationBenefitRenderer(device,format) {
  if(!device||!format) throw new TypeError('WebGPU device and presentation format are required');
  const module=device.createShaderModule({label:VERSION,code:WGSL});
  if(module.getCompilationInfo) {
    const info=await module.getCompilationInfo();
    const errors=info.messages.filter(m=>m.type==='error');
    if(errors.length) throw new Error(errors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join('\n'));
  }
  const pipeline=await device.createRenderPipelineAsync({label:VERSION,layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  const buffer=device.createBuffer({label:VERSION+' uniforms',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const sampler=device.createSampler({minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  const bindings=new WeakMap();let retired=false;
  return Object.freeze({
    draw(pass,options) {
      if(retired) throw new Error('Renderer is retired');
      const {width,height,centerX,centerY,bodyHeight=64,bodyWidth=bodyHeight*136/225,elapsedMs,direction=1,obs=true,sparkle=true,reducedMotion=false,includeActor=true,actorTexture,source=true,main=true,bodyResponse=true}=options;
      if(![width,height,centerX,centerY,bodyHeight,bodyWidth,elapsedMs].every(Number.isFinite)||width<=0||height<=0||bodyHeight<=0||bodyWidth<=0||!actorTexture) throw new TypeError('Finite viewport/body/clock and cropped actorTexture are required');
      let binding=bindings.get(actorTexture);
      if(!binding) {binding=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:sampler}]});bindings.set(actorTexture,binding);}
      const values=new Float32Array([width,height,centerX,centerY,bodyHeight,bodyWidth,elapsedMs/1000,direction<0?-1:1,+obs,+sparkle,+includeActor,+reducedMotion,+source,+main,+bodyResponse,0]);
      device.queue.writeBuffer(buffer,0,values);pass.setPipeline(pipeline);pass.setBindGroup(0,binding);pass.draw(3);
      return Object.freeze({version:VERSION,elapsedMs,active:sampleTimeline(elapsedMs).active,includeActor,obs,sparkle});
    },
    destroy(){if(!retired){retired=true;buffer.destroy();}}
  });
}



// Synthetic air displacement / cloth-contact pressure, not recordings or beeps.
export function synthesizeSound(sampleRate=48000){
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new TypeError('Unsupported sample rate');
  const result=new Float32Array(Math.ceil(sampleRate*.98));let seed=0x29c17a3,low=0,mid=0,high=0;
  const coefficients=[180,1350,5200].map(f=>1-Math.exp(-2*Math.PI*f/sampleRate));
  for(let i=0;i<result.length;i++){
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const white=(seed>>>0)/2147483648-1;
    low+=coefficients[0]*(white-low);mid+=coefficients[1]*(white-mid);high+=coefficients[2]*(white-high);
    const t=i/sampleRate;let flow=0,compression=0,contact=0,release=0;
    for(let k=0;k<3;k++){
      const q=(t-COMPRESSION_STARTS[k])/PACKET_TRAVEL_TIMES[k];
      if(q>0&&q<1){const pulse=Math.sin(Math.PI*q)**.8;flow+=pulse*(.24+.76*q*q)*[1,.92,.84][k];compression+=pulse*smooth(.58,1,q);}
      const a=t-RECEIPT_TIMES[k];
      // Soft textile/air contact at the SAME actor-clock arrival. Short,
      // broadband pressure, followed by a finite forward displacement tail.
      if(a>=0&&a<.070)contact+=smooth(0,.004,a)*Math.exp(-a*58)*(1-smooth(.05,.07,a));
      if(a>=.025&&a<.15)release+=smooth(.025,.045,a)*(1-smooth(.07,.15,a));
    }
    result[i]=((high-mid)*.25*flow+(mid-low)*.19*compression+low*.95*contact+(mid-low)*.12*release)*(1-smooth(.94,.98,t));
  }
  return result;
}

export function createSound(context,{verify=false}={}) {
  const seen=new Map();let voice=null;let disposed=false;let retainedKey=null;
  const dedupCapacity=128;
  function prune(){const now=context?.currentTime??0;for(const [key,expires] of seen)if(now>=expires&&retainedKey!==key)seen.delete(key);}
  function stop(){if(voice){const held=voice;voice=null;try{held.source.stop();}catch{};held.source.disconnect();held.gain.disconnect();held.pan?.disconnect();}}
  return Object.freeze({
    triggerVisibleReceipt(receipt) {
      if(disposed||verify||!context||context.state!=='running'||receipt?.kind!=='accelerationBenefit'||!receipt.effectId||!receipt.playerId||!sampleTimeline(receipt.elapsedMs).active) return false;
      prune();const key=JSON.stringify([receipt.playerId,receipt.effectId]);if(seen.has(key)||seen.size>=dedupCapacity)return false;
      const rate=receipt.timeScale??1;if(!Number.isFinite(rate)||rate<=0) return false;
      if(!Number.isFinite(receipt.gain??1)||!Number.isFinite(receipt.pan??0)) return false;
      const samples=synthesizeSound(context.sampleRate);const buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
      const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
      const gain=context.createGain();gain.gain.value=.55*Math.max(0,Math.min(1,receipt.gain??1));
      const pan=context.createStereoPanner?.();if(pan) pan.pan.value=Math.max(-1,Math.min(1,receipt.pan??0));
      source.connect(gain);if(pan){gain.connect(pan);pan.connect(context.destination);}else gain.connect(context.destination);
      stop();voice={source,gain,pan,key};source.onended=()=>{if(voice?.source===source){voice=null;source.disconnect();gain.disconnect();pan?.disconnect();}};
      try {source.start(0,Math.min(.979,receipt.elapsedMs/1000));seen.set(key,Math.min(Number.MAX_VALUE,context.currentTime+2/rate));retainedKey=key;return true;} catch {stop();return false;}
    },
    updateClock(elapsedMs,timeScale=1) {
      if(!sampleTimeline(elapsedMs).active||!Number.isFinite(timeScale)||timeScale<0){if(Number.isFinite(elapsedMs)&&elapsedMs>=DURATION_MS)retainedKey=null;stop();return;}
      if(voice)voice.source.playbackRate.setValueAtTime(timeScale,context.currentTime);
    },
    dispose(){disposed=true;retainedKey=null;stop();seen.clear();},
    get active(){return Boolean(voice);},
    get dedupSize(){prune();return seen.size;},
    get dedupCapacity(){return dedupCapacity;}
  });
}
