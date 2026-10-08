// Original creative source, acceleration benefit r1; no image-generation input.
export const DURATION_MS = 1000;
export const VERSION = 'acceleration-benefit-zero-sol61-r1';
export const B_SOURCE = Object.freeze({commit:'22d3fcfd617f42b1a967de767906204c0221ec64',baseBlob:'8f1286e12402fe7b19650ad44bcddb38ad227a08',extensionBlob:'f35b61661d0209c0329d4a501a760d35b451d52e'});
const smooth = (a,b,x) => {const s=Math.max(0,Math.min(1,(x-a)/(b-a)));return s*s*(3-2*s);};
export function sampleTimeline(elapsedMs) {
  const active=Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<DURATION_MS;
  const t=active?elapsedMs/1000:0;
  return Object.freeze({active,progress:active?t:elapsedMs>=1000?1:0,phase:!active?'inactive':t<.1?'formation':t<.7?'compression':t<.92?'settling':'release',envelope:active?smooth(0,.1,t)*(1-smooth(.92,1,t)):0});
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
// PH2: finite asymmetric, open compression volumes. Coordinates are body-height units.
fn volumeAt(q:vec3f,t:f32)->f32 {
  let vertical=smoothstep(-.13,-.04,q.y)*(1.-smoothstep(.43,.53,q.y));
  let height=clamp((.47-q.y)/.58,0.,1.);
  let settling=smoothstep(.7,.93,t);
  let inward=1.-.22*settling;
  let forward=.15*height*(1.-.40*u.toggles.w);
  let spread=(.19+.10*(1.-height))*inward*(1.-.10*u.toggles.w);
  let broad=.087+.047*(1.-height);
  let left=(q.x-forward+spread)/broad;
  let right=(q.x-forward-spread)/(broad*.85);
  let depth=q.z/.105;
  let lobe=exp(-1.5*(left*left+depth*depth))+.80*exp(-1.5*(right*right+depth*depth));
  let wavePosition=(.47-q.y)/.60;
  var wave=.30;
  for(var i=0u;i<3u;i++) {
    let starts=array<f32,3>(.10,.34,.55);
    let travel=(t-starts[i])/.37;
    let delta=(wavePosition-travel)/.19;
    wave+=.65*exp(-delta*delta)*smoothstep(0.,.04,t-starts[i]);
  }
  return lobe*vertical*wave;
}
fn sourcePosition(i:u32)->vec2f {
  let points=array<vec2f,6>(vec2f(-.29,.39),vec2f(.28,.35),vec2f(-.19,.23),vec2f(.25,.15),vec2f(-.10,.01),vec2f(.24,-.04));
  return points[i];
}
fn sourceAt(i:u32,t:f32)->f32 {
  let starts=array<f32,6>(.10,.19,.34,.43,.59,.75);
  let lives=array<f32,6>(.16,.18,.17,.16,.18,.16);
  let age=(t-starts[i])/lives[i];
  if(age<=0.||age>=1.) {return 0.;}
  return pow(sin(3.14159265*age),2.)*envelope(t)*u.gates.x;
}
// OBS2: same 0/90-degree aperture axes at every emitter. No star polygon or diamond.
fn crossPSF(delta:vec2f,pixelFootprint:f32)->f32 {
  let coreWidth=max(.0059,pixelFootprint*.48);
  let acrossX=exp(-.5*pow(delta.x/coreWidth,2.));
  let acrossY=exp(-.5*pow(delta.y/coreWidth,2.));
  let horizontal=acrossY*exp(-abs(delta.x)/.034);
  let vertical=acrossX*exp(-abs(delta.y)/.034);
  return max(horizontal,vertical);
}
fn bodyIllumination(p:vec2f,t:f32)->f32 {
  let lower=smoothstep(-.13,.02,p.y)*(1.-smoothstep(.41,.50,p.y));
  let moving=(.44-p.y)/.52;
  var receipt=.16;
  for(var i=0u;i<3u;i++) {
    let starts=array<f32,3>(.10,.34,.55);
    let front=(t-starts[i])/.37;
    receipt+=.45*exp(-pow((moving-front)/.22,2.))*smoothstep(0.,.04,t-starts[i]);
  }
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
  var depthDensity=0.;
  var frontDensity=0.;
  for(var z=0u;z<9u;z++) {
    let zz=-.16+f32(z)*.04;
    let d=volumeAt(vec3f(p,zz),t)*.16;
    depthDensity+=d;
    if(zz<-.04) {frontDensity+=d;}
  }
  let density=depthDensity*env*u.gates.y;
  let backCoverage=(1.-exp(-density*1.7))*(1.-actor.a);
  let frontCoverage=(1.-exp(-frontDensity*env*.30))*actor.a*u.gates.y;
  let cyan=vec3f(.025,.68,.92);
  let coloredBody=cyan*backCoverage*(.72+.60*depthDensity);
  // Meso ridge stays in the world layer, even with observer response disabled.
  let ridge=pow(clamp(depthDensity*.70,0.,1.),2.)*env*u.gates.y;
  let world=coloredBody+vec3f(.48,.96,1.)*ridge*(1.-actor.a)*.46;
  var rgb=world+included.rgb*included.a;
  var coverage=max(backCoverage,included.a);
  let received=bodyIllumination(p,t)*actor.a*u.gates.z;
  rgb+=(actor.rgb*.45+cyan*.42)*received;
  coverage=max(coverage,received*.45);
  rgb+=cyan*frontCoverage*.75;
  coverage=max(coverage,frontCoverage);
  // Source-bound neighborhood response (OBS1), separate from the volume geometry.
  let distanceBand=exp(-pow((abs(p.x-.15*clamp((.47-p.y)/.58,0.,1.))-.22)/.14,2.));
  let localGlow=distanceBand*smoothstep(-.17,-.04,p.y)*(1.-smoothstep(.44,.58,p.y));
  let glow=localGlow*env*.18*u.toggles.x*(1.-actor.a*.75);
  rgb+=cyan*glow;
  coverage=max(coverage,glow*.50);
  for(var i=0u;i<6u;i++) {
    let sourcePoint=sourcePosition(i);
    let sourcePixel=u.viewport.zw+vec2f(sourcePoint.x*u.body.w,sourcePoint.y)*u.body.x;
    let visibility=1.-actorAt(sourcePixel).a;
    let flux=sourceAt(i,t)*visibility;
    let delta=p-sourcePoint;
    let footprint=1./u.body.x;
    let worldCore=exp(-dot(delta,delta)/(2.*pow(max(.006,footprint*.48),2.)))*flux;
    let streak=crossPSF(delta,footprint)*flux*u.toggles.x*u.toggles.y;
    rgb+=vec3f(.73,.97,1.)*worldCore*1.8+vec3f(.65,.90,1.)*streak*.45;
    coverage=max(coverage,max(worldCore,streak*.52));
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
