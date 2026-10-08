// Creative R4 from the sealed acceleration-benefit R3 only. No generated images.
export const DURATION_MS=1000;
export const VERSION='acceleration-benefit-zero-sol61-r4';
export const B_SOURCE=Object.freeze({commit:'22d3fcfd617f42b1a967de767906204c0221ec64',baseBlob:'8f1286e12402fe7b19650ad44bcddb38ad227a08',extensionBlob:'f35b61661d0209c0329d4a501a760d35b451d52e'});
export const COMPRESSION_STARTS=Object.freeze([.04,.30,.56]);
export const PACKET_TRAVEL_SECONDS=.38;
export const PACKET_TRAVEL_TIMES=Object.freeze([.38,.32,.26]);
export const RECEIPT_TIMES=Object.freeze([.42,.62,.82]);
export const SOURCE_STARTS=Object.freeze([.10,.12,.36,.38,.62,.64,.82,.86]);
export const SOURCE_LIVES=Object.freeze([.16,.16,.16,.16,.16,.16,.16,.12]);
export const OPTICAL_MODEL=Object.freeze({axisDegrees:17.5,crossWidthH:.0036,rayDecayH:.049,sourceRadiusH:.0045,cutoffDecays:6});
const smooth=(a,b,x)=>{const s=Math.max(0,Math.min(1,(x-a)/(b-a)));return s*s*(3-2*s);};
export function sampleTimeline(elapsedMs) {
  const active=Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<DURATION_MS,t=active?elapsedMs/1000:0;
  return Object.freeze({active,progress:active?t:elapsedMs>=1000?1:0,phase:!active?'inactive':t<.1?'formation':t<.82?'compression':t<.94?'settling':'release',envelope:active?smooth(0,.08,t)*(1-smooth(.94,1,t)):0});
}
export function packetFrame(index,elapsedMs,{side=1,reducedMotion=false}={}) {
  if(!Number.isInteger(index)||index<0||index>2)throw new TypeError('Invalid packet index');
  const frame=sampleTimeline(elapsedMs),t=frame.progress,age=(t-COMPRESSION_STARTS[index])/PACKET_TRAVEL_TIMES[index];
  const s=smooth(0,1,age),compression=smooth(.52,1,s);
  const spread=.14+(reducedMotion?.13:.19)*Math.sin(Math.PI*s)+.015*s;
  const x=.025*s+Math.sign(side||1)*spread,y=.47-.55*s;
  const dx=.025+Math.sign(side||1)*((reducedMotion?.13:.19)*Math.PI*Math.cos(Math.PI*s)+.015),dy=-.55,norm=Math.hypot(dx,dy);
  const halfLength=.105*(1-.10*index)*(1-.45*compression),ratio=Math.sqrt((.105*(1-.10*index))/halfLength);
  const halfWidth=.062*ratio,halfDepth=.052*ratio;
  const gate=frame.active&&age>=0&&age<1?smooth(0,.08,age)*(1-smooth(.84,1,age)):0;
  return Object.freeze({age,s,compression,x,y,tangent:Object.freeze([dx/norm,dy/norm]),normal:Object.freeze([-dy/norm,dx/norm]),halfLength,halfWidth,halfDepth,gate,volumeProxy:halfLength*halfWidth*halfDepth});
}
export function receiptState(index,elapsedMs) {
  if(!Number.isInteger(index)||index<0||index>2)throw new TypeError('Invalid receipt index');
  const frame=sampleTimeline(elapsedMs),age=frame.progress-RECEIPT_TIMES[index];
  const gate=frame.active&&age>=0?smooth(0,.018,age)*(1-smooth(.18,.30,age)):0;
  return Object.freeze({age,gate,frontY:-.04+.43*smooth(0,.18,age),settled:frame.active?smooth(.02,.09,age)*(1-smooth(.94,1,frame.progress)):0});
}
export function inspectTransport(elapsedMs) {
  const frame=sampleTimeline(elapsedMs);
  return Object.freeze({active:frame.active,packets:Object.freeze(COMPRESSION_STARTS.map((_,i)=>packetFrame(i,elapsedMs))),receipts:Object.freeze(RECEIPT_TIMES.map((_,i)=>receiptState(i,elapsedMs))),sources:Object.freeze(SOURCE_STARTS.map((start,i)=>{const age=(frame.progress-start)/SOURCE_LIVES[i];return frame.active&&age>0&&age<1?Math.sin(Math.PI*age)**2*frame.envelope:0;}))});
}

export const WGSL="struct Params { viewport:vec4f, body:vec4f, toggles:vec4f, gates:vec4f };\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorImage:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\nstruct VertexOutput { @builtin(position) position:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->VertexOutput {\n  var xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n  var o:VertexOutput;o.position=vec4f(xy[i],0.,1.);return o;\n}\nfn actorAt(pixel:vec2f)->vec4f {\n  let uv=(pixel-u.viewport.zw)/vec2f(u.body.y,u.body.x)+vec2f(.5);\n  if(any(uv<vec2f(0.))||any(uv>vec2f(1.))) {return vec4f(0.);}\n  return textureSampleLevel(actorImage,actorSampler,uv,0.);\n}\nfn pixelAt(p:vec2f)->vec2f { return u.viewport.zw+vec2f(p.x*u.body.w,p.y)*u.body.x; }\nfn envelope(t:f32)->f32 { return smoothstep(0.,.08,t)*(1.-smoothstep(.94,1.,t)); }\nstruct Packet { center:vec2f, tangent:vec2f, normal:vec2f, halfSize:vec3f, compression:f32, gate:f32, depth:f32 };\nfn packetFrame(i:u32,side:f32,t:f32)->Packet {\n  let starts=array<f32,3>(.04,.30,.56);\n  let lives=array<f32,3>(.38,.32,.26);\n  let age=(t-starts[i])/lives[i];\n  let s=smoothstep(0.,1.,age);\n  let compression=smoothstep(.52,1.,s);\n  let excursion=mix(.19,.13,u.toggles.w);\n  let spread=.14+excursion*sin(3.14159265*s)+.015*s;\n  let center=vec2f(.025*s+side*spread,.47-.55*s);\n  let tangent=normalize(vec2f(.025+side*(excursion*3.14159265*cos(3.14159265*s)+.015),-.55));\n  let baseLength=.105*(1.-.10*f32(i));\n  let halfLength=baseLength*(1.-.45*compression);\n  let ratio=sqrt(baseLength/halfLength);\n  let gate=select(0.,smoothstep(0.,.08,age)*(1.-smoothstep(.84,1.,age)),age>=0.&&age<1.);\n  return Packet(center,tangent,vec2f(-tangent.y,tangent.x),vec3f(halfLength,.062*ratio,.052*ratio),compression,gate,.025*(1.-s));\n}\n// Closed local packet: a flat rounded front shoulder, finite body, short rear.\n// No longitudinal curve-wide floor and no Gaussian wake extending behind it.\nfn packetMedium(point:vec3f,packet:Packet,spreadScale:f32)->vec3f {\n  let delta=point.xy-packet.center;\n  let longitudinal=dot(delta,packet.tangent);\n  let across=dot(delta,packet.normal);\n  let size=packet.halfSize*vec3f(1.,spreadScale,spreadScale);\n  let depth=point.z-packet.depth-.10*across;\n  let padding=2./u.body.x;\n  if(abs(longitudinal)>size.x+padding||abs(across)>size.y+padding||abs(depth)>size.z+padding||packet.gate<=0.) {return vec3f(0.);}\n  let q=vec3f(longitudinal,across,depth)/size;\n  let metric=pow(abs(q.x),4.)+pow(abs(q.y),4.)+q.z*q.z;\n  let gradient=4.*q.x*q.x*q.x/size.x*packet.tangent+4.*q.y*q.y*q.y/size.y*packet.normal;\n  let aa=max(.10,.65*length(gradient)/u.body.x);\n  let support=1.-smoothstep(1.-aa*.5,1.+aa*.5,metric);\n  let shoulder=exp(-pow((q.x-.61)/.18,2.));\n  let rear=1.-smoothstep(-.80,-.22,q.x);\n  let density=support*(.70+.72*shoulder-.24*rear)*packet.gate;\n  // Emission is independent of density: the moving leading shoulder receives\n  // the pressure peak, while the finite rear keeps a colored material body.\n  let bodyEmission=support*(.40+.55*(1.-rear))*(1.+.35*packet.compression)*packet.gate;\n  let hotEmission=support*shoulder*(1.+.60*packet.compression)*packet.gate;\n  return vec3f(density,bodyEmission,hotEmission);\n}\nstruct Volume { back:vec3f, front:vec3f, alpha:f32, glow:f32 };\nfn integratePackets(p:vec2f,t:f32)->Volume {\n  var transmission=vec3f(1.);var back=vec3f(0.);var front=vec3f(0.);var glow=0.;\n  let dz=.26/13.;\n  for(var z=0u;z<13u;z++) {\n    let zz=-.13+(f32(z)+.5)*dz;\n    var field=vec3f(0.);\n    for(var i=0u;i<3u;i++) {\n      for(var lane=0u;lane<2u;lane++) {\n        let packet=packetFrame(i,select(-1.,1.,lane==1u),t);\n        field+=packetMedium(vec3f(p,zz),packet,1.);\n        // OBS1 expands the SAME finite packet, retaining its head/body split.\n        let nearSource=packetMedium(vec3f(p,zz),packet,1.25);\n        glow+=(nearSource.y+.8*nearSource.z)*dz;\n      }\n    }\n    let sigma=field.x*vec3f(10.,5.,3.);\n    let emission=vec3f(.025,.68,.92)*field.y*32.+vec3f(.83,.98,1.)*field.z*88.;\n    let attenuation=exp(-sigma*dz);\n    let exact=(vec3f(1.)-attenuation)/max(sigma,vec3f(1e-5));\n    let integral=select(vec3f(dz)*(vec3f(1.)-.5*sigma*dz),exact,sigma>vec3f(.001));\n    let radiance=transmission*emission*integral;\n    if(zz<-.02) {front+=radiance;}else {back+=radiance;}\n    transmission*=attenuation;\n  }\n  return Volume(back,front,1.-min(min(transmission.x,transmission.y),transmission.z),glow);\n}\nfn bodyIllumination(p:vec2f,t:f32)->f32 {\n  let arrivals=array<f32,3>(.42,.62,.82);\n  let lower=smoothstep(-.11,-.045,p.y)*(1.-smoothstep(.42,.49,p.y));\n  var response=0.;var settled=0.;\n  for(var i=0u;i<3u;i++) {\n    let age=t-arrivals[i];\n    let gate=smoothstep(0.,.018,age)*(1.-smoothstep(.18,.30,age));\n    let frontY=-.04+.43*smoothstep(0.,.18,age);\n    // Axial preload redistributes from the receiving waist into lower support.\n    // It is an optical state, not a body deformation or a gameplay force.\n    let band=exp(-pow((p.y-frontY)/.060,2.));\n    let contact=exp(-pow((abs(p.x)-.15)/.095,2.))*exp(-pow((p.y+.04)/.075,2.));\n    response+=(1.15*band+.85*contact)*gate;\n    settled+=smoothstep(.02,.09,age)*(1.-smoothstep(.94,1.,t));\n  }\n  let support=exp(-pow(p.x/.23,4.))*(.28+.35*smoothstep(.02,.38,p.y));\n  return lower*(response+support*min(settled,1.4))*.74*envelope(t)*u.gates.x;\n}\nfn sourceFlux(i:u32,t:f32)->f32 {\n  let starts=array<f32,8>(.10,.12,.36,.38,.62,.64,.82,.86);\n  let lives=array<f32,8>(.16,.16,.16,.16,.16,.16,.16,.12);\n  let age=(t-starts[i])/lives[i];\n  if(age<=0.||age>=1.) {return 0.;}\n  return pow(sin(3.14159265*age),2.)*envelope(t)*u.gates.x;\n}\nfn receiverRim(side:f32)->vec2f {\n  // Read the same registered alpha, not transparent RGB or a guessed garment.\n  let y=-.04;\n  var edge=.16;var found=false;\n  for(var j=0u;j<14u;j++) {\n    let x=.025+f32(j)*.023;\n    let a=actorAt(pixelAt(vec2f(side*x,y))).a;\n    if(a>.25) {edge=x;found=true;}\n  }\n  if(!found) {return vec2f(side*.16,y);}\n  return vec2f(side*(edge+.019),y);\n}\nfn sourcePosition(i:u32,t:f32)->vec2f {\n  let side=select(-1.,1.,i%2u==1u);\n  if(i>=6u) {return receiverRim(side);}\n  let packet=packetFrame(i/2u,side,t);\n  return packet.center+packet.tangent*(.61*packet.halfSize.x)+packet.normal*(side*.67*packet.halfSize.y);\n}\nfn crossPSF(delta:vec2f,footprint:f32)->f32 {\n  let angle=17.5*3.14159265/180.;\n  let q=vec2f(cos(angle)*delta.x+sin(angle)*delta.y,-sin(angle)*delta.x+cos(angle)*delta.y);\n  let width=sqrt(.0036*.0036+footprint*footprint/12.);\n  let decay=.049;\n  let horizontal=exp(-.5*pow(q.y/width,2.))*exp(-abs(q.x)/decay);\n  let vertical=exp(-.5*pow(q.x/width,2.))*exp(-abs(q.y)/decay);\n  // Smooth finite optical tail, no polygon mask or symbolic filled arm.\n  let tail=1.-smoothstep(5.*decay,6.*decay,max(abs(q.x),abs(q.y)));\n  return max(horizontal,vertical)*tail;\n}\n@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {\n  let actor=actorAt(pixel.xy);let included=actor*u.toggles.z;let t=u.body.z;\n  if(t<0.||t>=1.||u.gates.x<.5) {return vec4f(included.rgb*included.a,included.a);}\n  var p=(pixel.xy-u.viewport.zw)/u.body.x;p.x*=u.body.w;\n  // Includes transformed packet support, pixel AA and the full rotated 6-decay\n  // PSF. Body remains caller-registered even outside this finite E region.\n  let aaPadding=2./u.body.x;\n  if(abs(p.x)>.86+aaPadding||p.y<-.54-aaPadding||p.y>.86+aaPadding) {return vec4f(included.rgb*included.a,included.a);}\n  let env=envelope(t);\n  let volume=integratePackets(p,t);\n  let world=(volume.back*(1.-actor.a)+volume.front*(1.-actor.a*.80))*env*u.gates.y;\n  var rgb=world+included.rgb*included.a;\n  var coverage=max(included.a,volume.alpha*env*u.gates.y);\n  let received=bodyIllumination(p,t)*actor.a*u.gates.z;\n  rgb+=(actor.rgb*.45+vec3f(.025,.68,.92)*.42)*received;\n  coverage=max(coverage,received*.45);\n  let glow=volume.glow*env*.18*u.toggles.x*(1.-actor.a*.75);\n  rgb+=vec3f(.025,.68,.92)*glow;coverage=max(coverage,glow*.50);\n  for(var i=0u;i<8u;i++) {\n    let baseFlux=sourceFlux(i,t);\n    if(baseFlux<=0.) {continue;}\n    let sourcePoint=sourcePosition(i,t);\n    let visibility=1.-actorAt(pixelAt(sourcePoint)).a;\n    let flux=baseFlux*visibility;\n    let delta=p-sourcePoint;let footprint=1./u.body.x;\n    let radius=sqrt(.0045*.0045+footprint*footprint/12.);\n    let coreTail=1.-smoothstep(4.*radius,5.*radius,length(delta));\n    let worldCore=exp(-dot(delta,delta)/(2.*radius*radius))*flux*coreTail;\n    let streak=crossPSF(delta,footprint)*flux*u.toggles.x*u.toggles.y;\n    rgb+=vec3f(.73,.97,1.)*worldCore*2.+vec3f(.65,.90,1.)*streak*.92;\n    coverage=max(coverage,max(worldCore,streak*.70));\n  }\n  return vec4f(rgb,clamp(coverage,0.,1.));\n}\n";

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


// Original finite compression/friction synthesis, no recordings or pitched beep.
export function synthesizeSound(sampleRate=48000) {
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw new TypeError('Unsupported sample rate');
  const result=new Float32Array(Math.ceil(sampleRate*.98));let seed=0x29c17a3,slow=0,fast=0;
  const slowCoefficient=1-Math.exp(-2*Math.PI*250/sampleRate),fastCoefficient=1-Math.exp(-2*Math.PI*3500/sampleRate);
  for(let i=0;i<result.length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const white=(seed>>>0)/2147483648-1;
    slow+=slowCoefficient*(white-slow);fast+=fastCoefficient*(white-fast);
    const t=i/sampleRate;let rubbing=0,pressure=0,contact=0;
    for(let index=0;index<3;index++) {
      const q=(t-COMPRESSION_STARTS[index])/PACKET_TRAVEL_TIMES[index];
      if(q>0&&q<1) {
        const pulse=Math.sin(Math.PI*q)**1.6*[1,.90,.80][index];
        rubbing+=pulse;pressure+=pulse*(.35+.65*smooth(.45,1,q));
      }
      const a=t-RECEIPT_TIMES[index];
      // Finite rounded pressure contact, not a musical resonance.
      if(a>=0&&a<.075)pressure+=.40*Math.sin(Math.PI*a/.075)**2;
    }
    // A smooth 3 ms attack followed by broadband contact decay.
    for(const at of RECEIPT_TIMES) {const a=t-at;if(a>=0&&a<.075)contact+=smooth(0,.003,a)*Math.exp(-a*48);}
    result[i]=((fast-slow)*.30*rubbing+slow*.68*pressure+(white-fast)*.065*contact)*(1-smooth(.94,.98,t));
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
