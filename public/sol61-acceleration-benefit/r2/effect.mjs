// Creative derivative r2 of frozen acceleration-benefit r1. No image-generation input.
export const DURATION_MS = 1000;
export const VERSION = 'acceleration-benefit-zero-sol61-r2';
export const B_SOURCE = Object.freeze({commit:'22d3fcfd617f42b1a967de767906204c0221ec64',baseBlob:'8f1286e12402fe7b19650ad44bcddb38ad227a08',extensionBlob:'f35b61661d0209c0329d4a501a760d35b451d52e'});
// One declared transport/source schedule feeds WGSL and CPU contract inspection.
export const COMPRESSION_STARTS = Object.freeze([.10,.34,.55]);
export const SOURCE_STARTS = Object.freeze([.10,.14,.34,.38,.55,.59,.75,.79]);
export const SOURCE_LIVES = Object.freeze([.18,.18,.18,.18,.18,.18,.17,.15]);
export const OPTICAL_MODEL = Object.freeze({axisDegrees:0,crossWidthH:.0046,rayDecayH:.078,sourceRadiusH:.0065});
const smooth = (a,b,x) => {const s=Math.max(0,Math.min(1,(x-a)/(b-a)));return s*s*(3-2*s);};
export function sampleTimeline(elapsedMs) {
  const active=Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<DURATION_MS;
  const t=active?elapsedMs/1000:0;
  return Object.freeze({active,progress:active?t:elapsedMs>=1000?1:0,phase:!active?'inactive':t<.1?'formation':t<.7?'compression':t<.92?'settling':'release',envelope:active?smooth(0,.1,t)*(1-smooth(.92,1,t)):0});
}
export function inspectTransport(elapsedMs) {
  const frame=sampleTimeline(elapsedMs),t=frame.progress;
  return Object.freeze({active:frame.active,settling:smooth(.7,.93,t),fronts:Object.freeze(COMPRESSION_STARTS.map(start=>(t-start)/.40)),sources:Object.freeze(SOURCE_STARTS.map((start,i)=>{
    const age=(t-start)/SOURCE_LIVES[i];
    return frame.active&&age>0&&age<1?Math.sin(Math.PI*age)**2*frame.envelope:0;
  }))});
}

export const WGSL = /* wgsl */ `
struct Params { viewport:vec4f, body:vec4f, toggles:vec4f, gates:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorImage:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct VertexOutput { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VertexOutput {
  var xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:VertexOutput;o.position=vec4f(xy[i],0.,1.);return o;
}
fn actorAt(pixel:vec2f)->vec4f {
  let uv=(pixel-u.viewport.zw)/vec2f(u.body.y,u.body.x)+vec2f(.5);
  if(any(uv<vec2f(0.))||any(uv>vec2f(1.))) {return vec4f(0.);}
  return textureSampleLevel(actorImage,actorSampler,uv,0.);
}
fn envelope(t:f32)->f32 {
  return smoothstep(0.,.1,t)*(1.-smoothstep(.92,1.,t));
}
// PH2 longitudinal coordinate runs heel -> lower waist; screen-down is positive.
fn laneCenter(s:f32,side:f32,t:f32)->f32 {
  let settled=smoothstep(.7,.93,t);
  let bend=sin(3.14159265*s);
  let spread=(.30-.055*s+.030*bend)*(1.-.16*settled);
  let forward=.13*s*(1.-.25*u.toggles.w);
  return forward+side*spread;
}
// Three broad density fronts with a rounded compressed shoulder and a trailing body.
// Their travel changes both the longitudinal density and the actual cross section.
fn pressureAt(s:f32,t:f32)->f32 {
  var pressure=0.;
  for(var i=0u;i<3u;i++) {
    let starts=array<f32,3>(${COMPRESSION_STARTS.join(',')});
    let travel=(t-starts[i])/.40;
    let d=s-travel;
    let width=select(.155,.078,d>0.);
    pressure+=exp(-pow(d/width,2.))*smoothstep(0.,.04,t-starts[i]);
  }
  return pressure;
}
// x = optical density; y = independently shaped source emissivity.
// Compact rounded volumes give visible shoulders, not an unbounded Gaussian fog.
fn volumeAt(q:vec3f,t:f32,spreadScale:f32)->vec2f {
  let s=(.48-q.y)/.55;
  let ends=smoothstep(-.045,.07,s)*(1.-smoothstep(.91,1.045,s));
  let p=pressureAt(s,t);
  let settled=smoothstep(.7,.93,t);
  let shoulder=.068+.035*sin(3.14159265*clamp(s,0.,1.));
  let width=shoulder*(1.+.27*p*(1.-.65*u.toggles.w))*(1.-.12*settled)*spreadScale;
  var density=0.;var emission=0.;
  for(var lane=0u;lane<2u;lane++) {
    let side=select(-1.,1.,lane==1u);
    let cx=laneCenter(clamp(s,0.,1.),side,t);
    // A shallow depth bend and elliptical thickness distinguish the inner/outer face.
    let x=(q.x-cx-.12*q.z)/width;
    let z=(q.z+.025*side*sin(3.14159265*s))/.095;
    let rr=x*x+z*z;
    let support=1.-smoothstep(.48,1.35,rr);
    let interior=exp(-rr*1.4);
    density+=support*ends*(.32+.85*p);
    emission+=support*ends*(.18+.85*p*interior+.24*settled*exp(-pow((s-.82)/.22,2.)));
  }
  return vec2f(density,emission);
}
fn sourcePosition(i:u32,t:f32)->vec2f {
  let starts=array<f32,3>(${COMPRESSION_STARTS.join(',')});
  let side=select(-1.,1.,i%2u==1u);
  let waveIndex=min(i/2u,2u);
  let s=select(clamp((t-starts[waveIndex])/.40,.09,.89),.82,i>=6u);
  let shoulder=.068+.035*sin(3.14159265*s);
  // World knots on the outer compression shoulder, outside the receiving alpha.
  let x=laneCenter(s,side,t)+side*shoulder*.78;
  return vec2f(x,.48-.55*s);
}
fn sourceAt(i:u32,t:f32)->f32 {
  let starts=array<f32,8>(${SOURCE_STARTS.join(',')});
  let lives=array<f32,8>(${SOURCE_LIVES.join(',')});
  let age=(t-starts[i])/lives[i];
  if(age<=0.||age>=1.) {return 0.;}
  return pow(sin(3.14159265*age),2.)*envelope(t)*u.gates.x;
}
// OBS2: same 0/90-degree aperture axes at every emitter. No star polygon or diamond.
fn crossPSF(delta:vec2f,pixelFootprint:f32)->f32 {
  // Approximate pixel box integration: variances add; no solid polygon/star mask.
  let coreWidth=sqrt(pow(${OPTICAL_MODEL.crossWidthH},2.)+pixelFootprint*pixelFootprint/12.);
  let acrossX=exp(-.5*pow(delta.x/coreWidth,2.));
  let acrossY=exp(-.5*pow(delta.y/coreWidth,2.));
  let horizontal=acrossY*exp(-abs(delta.x)/${OPTICAL_MODEL.rayDecayH});
  let vertical=acrossX*exp(-abs(delta.y)/${OPTICAL_MODEL.rayDecayH});
  return max(horizontal,vertical);
}
fn bodyIllumination(p:vec2f,t:f32)->f32 {
  let lower=smoothstep(-.11,.01,p.y)*(1.-smoothstep(.43,.51,p.y));
  let s=(.48-p.y)/.55;
  let receipt=.12+.40*pressureAt(s,t)+.16*smoothstep(.7,.93,t);
  return lower*receipt*envelope(t)*u.gates.x;
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
  let actor=actorAt(pixel.xy);
  let included=actor*u.toggles.z;
  let t=u.body.z;
  if(t<0.||t>=1.) {return vec4f(included.rgb*included.a,included.a);}
  var p=(pixel.xy-u.viewport.zw)/u.body.x;
  p.x*=u.body.w;
  let env=envelope(t)*u.gates.x;
  var depthDensity=0.;var depthEmission=0.;
  var frontDensity=0.;
  for(var z=0u;z<9u;z++) {
    let zz=-.16+f32(z)*.04;
    let d=volumeAt(vec3f(p,zz),t,1.)*.19;
    depthDensity+=d.x;depthEmission+=d.y;
    if(zz<-.04) {frontDensity+=d.x;}
  }
  let density=depthDensity*env*u.gates.y;
  let backCoverage=(1.-exp(-density*1.7))*(1.-actor.a);
  let frontCoverage=(1.-exp(-frontDensity*env*.30))*actor.a*u.gates.y;
  let cyan=vec3f(.025,.68,.92);
  let coloredBody=cyan*backCoverage*(.72+.60*depthEmission);
  // Moving compression sheets remain in WORLD with OBS/sparkle disabled.
  let radiance=depthEmission*env*u.gates.y;
  let world=coloredBody+vec3f(.23,.87,1.)*radiance*(1.-actor.a)*.62;
  var rgb=world+included.rgb*included.a;
  var coverage=max(backCoverage,included.a);
  let received=bodyIllumination(p,t)*actor.a*u.gates.z;
  rgb+=(actor.rgb*.45+cyan*.42)*received;
  coverage=max(coverage,received*.45);
  rgb+=cyan*frontCoverage*.75;
  coverage=max(coverage,frontCoverage);
  // Source-bound neighborhood response (OBS1), separate from the volume geometry.
  let localGlow=volumeAt(vec3f(p,0.),t,1.62).y;
  let glow=localGlow*env*.18*u.toggles.x*(1.-actor.a*.75);
  rgb+=cyan*glow;
  coverage=max(coverage,glow*.50);
  for(var i=0u;i<8u;i++) {
    let sourcePoint=sourcePosition(i,t);
    let sourcePixel=u.viewport.zw+vec2f(sourcePoint.x*u.body.w,sourcePoint.y)*u.body.x;
    let visibility=1.-actorAt(sourcePixel).a;
    let flux=sourceAt(i,t)*visibility;
    let delta=p-sourcePoint;
    let footprint=1./u.body.x;
    let radius=sqrt(pow(${OPTICAL_MODEL.sourceRadiusH},2.)+footprint*footprint/12.);
    let worldCore=exp(-dot(delta,delta)/(2.*radius*radius))*flux;
    let streak=crossPSF(delta,footprint)*flux*u.toggles.x*u.toggles.y;
    rgb+=vec3f(.73,.97,1.)*worldCore*2.0+vec3f(.65,.90,1.)*streak*.92;
    coverage=max(coverage,max(worldCore,streak*.70));
  }
  // Straight-alpha output would double multiply edges; this is premultiplied.
  return vec4f(rgb,clamp(coverage,0.,1.));
}
`;

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

// Original synthesized pressure/friction sound: finite noise excitation, not a beep.
export function synthesizeSound(sampleRate=48000) {
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000) throw new TypeError('Unsupported sample rate');
  const result=new Float32Array(Math.ceil(sampleRate*.94));let seed=0x29c17a3;let slow=0,fast=0;
  const slowCoefficient=1-Math.exp(-2*Math.PI*250/sampleRate),fastCoefficient=1-Math.exp(-2*Math.PI*3500/sampleRate);
  for(let i=0;i<result.length;i++) {
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const white=(seed>>>0)/2147483648-1;
    slow+=slowCoefficient*(white-slow);fast+=fastCoefficient*(white-fast);
    const t=i/sampleRate;
    let amp=0;
    for(const [on,life,weight] of [[.10,.28,1],[.34,.25,.86],[.55,.28,.72]]) {
      const q=(t-on)/life;
      if(q>0&&q<1) amp+=Math.pow(Math.sin(Math.PI*q),1.6)*weight;
    }
    const contact=t>.06&&t<.17?Math.pow(Math.sin(Math.PI*(t-.06)/.11),2):0;
    const end=1-smooth(.86,.94,t);
    result[i]=((fast-slow)*.30*amp+slow*.68*amp+(white-fast)*.035*contact)*end;
  }
  return result;
}

export function createSound(context,{verify=false}={}) {
  const seen=new Set();let voice=null;let disposed=false;
  function stop(){if(voice){const held=voice;voice=null;try{held.source.stop();}catch{};held.source.disconnect();held.gain.disconnect();held.pan?.disconnect();}}
  return Object.freeze({
    triggerVisibleReceipt(receipt) {
      if(disposed||verify||!context||context.state!=='running'||receipt?.kind!=='accelerationBenefit'||!receipt.effectId||!receipt.playerId||!sampleTimeline(receipt.elapsedMs).active) return false;
      const key=`${receipt.playerId}:${receipt.effectId}`;if(seen.has(key)) return false;
      const rate=receipt.timeScale??1;if(!Number.isFinite(rate)||rate<=0) return false;
      const samples=synthesizeSound(context.sampleRate);const buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
      const source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
      const gain=context.createGain();gain.gain.value=.55*Math.max(0,Math.min(1,receipt.gain??1));
      const pan=context.createStereoPanner?.();if(pan) pan.pan.value=Math.max(-1,Math.min(1,receipt.pan??0));
      source.connect(gain);if(pan){gain.connect(pan);pan.connect(context.destination);}else gain.connect(context.destination);
      stop();voice={source,gain,pan,key};source.onended=()=>{if(voice?.source===source){voice=null;source.disconnect();gain.disconnect();pan?.disconnect();}};
      try {source.start(0,Math.min(.939,receipt.elapsedMs/1000));seen.add(key);return true;} catch {stop();return false;}
    },
    updateClock(elapsedMs,timeScale=1) {
      if(!sampleTimeline(elapsedMs).active||!Number.isFinite(timeScale)||timeScale<0){stop();return;}
      if(voice)voice.source.playbackRate.setValueAtTime(timeScale,context.currentTime);
    },
    dispose(){disposed=true;stop();seen.clear();},
    get active(){return Boolean(voice);}
  });
}
