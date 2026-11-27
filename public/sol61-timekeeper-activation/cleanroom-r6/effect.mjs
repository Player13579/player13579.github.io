export const WGSL="struct Uniforms {\n  viewport: vec4f,\n  actor: vec4f,\n  gates: vec4f,\n  field: vec4f,\n};\n\n@group(0) @binding(0) var<uniform> u: Uniforms;\n@group(0) @binding(1) var actorTex: texture_2d<f32>;\n@group(0) @binding(2) var actorSampler: sampler;\n\nstruct VSOut {\n  @builtin(position) position: vec4f,\n};\n\nconst PI: f32 = 3.141592653589793;\nconst TAU: f32 = 6.283185307179586;\n\n@vertex\nfn vs(@builtin(vertex_index) index: u32) -> VSOut {\n  let v = vec2f(f32((index << 1u) & 2u), f32(index & 2u));\n  var out: VSOut;\n  out.position = vec4f(v * 2.0 - vec2f(1.0), 0.0, 1.0);\n  return out;\n}\n\nfn layer(rgb: vec3f, alpha: f32) -> vec4f {\n  let a = clamp(alpha, 0.0, 1.0);\n  return vec4f(rgb * a, a);\n}\n\nfn over(front: vec4f, back: vec4f) -> vec4f {\n  return front + back * (1.0 - front.a);\n}\n\nfn coverage(distance: f32, halfWidth: f32, aa: f32) -> f32 {\n  return 1.0 - smoothstep(halfWidth, halfWidth + aa, distance);\n}\n\nfn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {\n  let ab = b - a;\n  let t = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.00001), 0.0, 1.0);\n  return length(p - a - t * ab);\n}\n\nfn direction(angle: f32) -> vec2f {\n  return vec2f(cos(angle), sin(angle));\n}\n\nfn sparkle(p: vec2f, center: vec2f, size: f32, aa: f32) -> f32 {\n  let d = abs(p - center);\n  let horizontal = coverage(d.y, 0.28, aa * 0.75)\n    * (1.0 - smoothstep(size * 0.20, size, d.x));\n  let vertical = coverage(d.x, 0.28, aa * 0.75)\n    * (1.0 - smoothstep(size * 0.20, size, d.y));\n  let diamondDistance = d.x + d.y;\n  let core = coverage(diamondDistance, 0.85, aa * 0.70);\n  return max(core, max(horizontal, vertical));\n}\n\nfn sourceFalloff(delta: vec3f) -> f32 {\n  return 1.0 / (1.0 + 2.8 * dot(delta, delta));\n}\n\nfn encodeSrgb(linear: vec3f) -> vec3f {\n  let c = max(linear, vec3f(0.0));\n  let low = 12.92 * c;\n  let high = 1.055 * pow(c, vec3f(1.0 / 2.4)) - vec3f(0.055);\n  return select(low, high, c > vec3f(0.0031308));\n}\n\n@fragment\nfn fs(in: VSOut) -> @location(0) vec4f {\n  let dpr = max(u.viewport.z, 0.001);\n  let aa = max(0.4, 1.0 / dpr);\n  let p = in.position.xy / dpr - u.actor.xy;\n  let actorHeight = max(u.actor.z, 1.0);\n  let actorSize = vec2f(max(actorHeight * max(u.actor.w, 0.001), 1.0), actorHeight);\n  let actorUV = p / actorSize + vec2f(0.5);\n\n  // Derivatives are evaluated unconditionally, before any conditional output encoding.\n  let uvDx = dpdx(actorUV);\n  let uvDy = dpdy(actorUV);\n  let textureSize = max(vec2f(textureDimensions(actorTex, 0)), vec2f(1.0));\n  let halfTexel = vec2f(0.5) / textureSize;\n  let safeUV = clamp(actorUV, halfTexel, vec2f(1.0) - halfTexel);\n  let actorSample = textureSampleGrad(actorTex, actorSampler, safeUV, uvDx, uvDy);\n  let insideUV = select(0.0, 1.0,\n    all(actorUV >= vec2f(0.0)) && all(actorUV <= vec2f(1.0)));\n  let actorAlpha = clamp(actorSample.a, 0.0, 1.0)\n    * insideUV * clamp(u.gates.z, 0.0, 1.0);\n\n  let mainGate = clamp(u.gates.x, 0.0, 1.0);\n  let observerGate = clamp(u.gates.y, 0.0, 1.0);\n  let reducedMotion = clamp(u.gates.w, 0.0, 1.0);\n  let energy = clamp(u.field.z, 0.0, 1.0) * mainGate;\n  let radius = max(u.field.x, 1.0);\n  let age = max(u.viewport.w, 0.0);\n\n  // Host geometry and host energy are authoritative; no lifetime or phase state is created here.\n  let rho = length(p);\n  let q = p / radius;\n  let depth = sqrt(max(0.0, 1.0 - dot(q, q)));\n  let sphereMask = 1.0 - smoothstep(radius - aa, radius + aa, rho);\n  let sourceUnit = vec3f(-0.48, -0.64, 0.60);\n  let sourcePosition = sourceUnit * radius;\n  let shellPoint = vec3f(q, depth);\n  let shellFlux = sourceFalloff(shellPoint - sourceUnit);\n  let facing = clamp(dot(shellPoint, sourceUnit), 0.0, 1.0);\n  let thickness = 0.30 + 0.70 * sqrt(max(0.0, 1.0 - depth));\n  let shade = 0.38 + 0.42 * depth + 0.20 * facing;\n  let latitudeDistance = (q.y + 0.20 * (1.0 - q.x * q.x)) / 0.14;\n  let latitude = exp(-latitudeDistance * latitudeDistance);\n  let rimDistance = (rho - 0.96 * radius) / (1.3 + 0.018 * radius);\n  let rim = exp(-rimDistance * rimDistance);\n\n  let shellRgb = vec3f(0.025, 0.18, 0.28) * shade\n    + vec3f(0.05, 0.50, 0.78) * (0.28 + 0.65 * shellFlux)\n    + vec3f(0.015, 0.07, 0.11) * latitude;\n  let shellAlpha = energy * sphereMask\n    * (0.20 + 0.16 * thickness + 0.08 * shellFlux);\n  var scene = layer(shellRgb, shellAlpha);\n\n  let meridianDistance = abs(length(vec2f(p.x / 0.58, p.y)) - radius) * 0.58;\n  let meridian = coverage(meridianDistance, 0.55, aa);\n  scene = over(layer(vec3f(0.035, 0.48, 0.66),\n    energy * sphereMask * (0.095 * meridian + 0.045 * latitude)), scene);\n\n  let dialRadius = radius * 0.81;\n  let faceMask = 1.0 - smoothstep(dialRadius - aa, dialRadius + aa, rho);\n  scene = over(layer(vec3f(0.035, 0.23, 0.34),\n    energy * faceMask * 0.075), scene);\n\n  // These envelopes shape ornaments only. Release and expiry remain host-driven.\n  let launch = smoothstep(0.0, 100.0, age);\n  let arrivedA = smoothstep(145.0, 400.0, age);\n  let arrivedB = smoothstep(250.0, 460.0, age);\n  let arrivedActor = smoothstep(160.0, 455.0, age);\n  let brakePulse = smoothstep(430.0, 485.0, age)\n    * (1.0 - smoothstep(570.0, 650.0, age)) * (1.0 - reducedMotion);\n  let ornamentStrength = mix(1.0, 0.68, reducedMotion);\n  let sourceSparkStrength = launch * mix(\n    0.32 + 0.50 * (1.0 - smoothstep(100.0, 360.0, age)),\n    0.38, reducedMotion);\n  let sparkStrengthA = ornamentStrength * (0.58 * arrivedA + 0.22 * brakePulse);\n  let sparkStrengthB = ornamentStrength * (0.50 * arrivedB + 0.18 * brakePulse);\n  let actorSparkStrength = ornamentStrength * (0.62 * arrivedActor + 0.18 * brakePulse);\n\n  // UI-space reception from exactly the same shell source, never a second light.\n  let receiverPosition = vec3f(p, actorHeight * 0.06);\n  let receiverFlux = sourceFalloff((receiverPosition - sourcePosition) / radius);\n  let received = energy * observerGate * sphereMask * receiverFlux;\n  let baseActorRgb = max(actorSample.rgb, vec3f(0.0));\n  let actorLuminance = clamp(dot(baseActorRgb, vec3f(0.2126, 0.7152, 0.0722)), 0.0, 1.0);\n  let receiverSpark = sparkle(p, vec2f(-0.12, -0.13) * actorHeight, 3.3, aa);\n  let actorRgb = baseActorRgb\n    + vec3f(0.07, 0.52, 0.80) * received * (0.45 + 0.55 * actorLuminance)\n    + vec3f(0.30, 0.83, 1.0) * received * receiverSpark * actorSparkStrength * 2.1;\n  scene = over(layer(actorRgb, actorAlpha), scene);\n\n  // A low-opacity front surface leaves the sprite and mineral contrast readable.\n  scene = over(layer(vec3f(0.04, 0.40, 0.57),\n    energy * sphereMask * (0.020 + 0.035 * meridian)), scene);\n  scene = over(layer(vec3f(0.06, 0.65, 0.83),\n    energy * sphereMask * rim * (0.12 + 0.18 * shellFlux)), scene);\n\n  let dialRing = coverage(abs(rho - dialRadius), 0.60, aa);\n  let innerRing = coverage(abs(rho - radius * 0.675), 0.35, aa);\n  scene = over(layer(vec3f(0.07, 0.65, 0.79),\n    energy * sphereMask * (0.58 * dialRing + 0.12 * innerRing)), scene);\n\n  // Twelve engraved marks, with four longer cardinal marks.\n  let angularPosition = atan2(p.y, p.x);\n  let tickStep = TAU / 12.0;\n  let tickIndex = floor((angularPosition + PI * 0.5) / tickStep + 0.5);\n  let tickAngle = -PI * 0.5 + tickIndex * tickStep;\n  let tickDirection = direction(tickAngle);\n  let cardinal = 1.0 - smoothstep(0.05, 0.15, abs(sin(tickIndex * (PI / 3.0))));\n  let tickStart = radius * mix(0.716, 0.674, cardinal);\n  let tickEnd = radius * 0.782;\n  let tickDistance = segmentDistance(p, tickDirection * tickStart, tickDirection * tickEnd);\n  let tickMask = coverage(tickDistance, mix(0.42, 0.65, cardinal), aa);\n  scene = over(layer(vec3f(0.16, 0.76, 0.86),\n    energy * sphereMask * tickMask * 0.79), scene);\n\n  // Common initial phase and common host progression; derivative ratio is exactly 12:1.\n  // Positive angles rotate clockwise because CSS screen y increases downward.\n  let initialAngle = -2.30;\n  let angularProgress = u.field.y - initialAngle;\n  let hourAngle = initialAngle + angularProgress;\n  let minuteAngle = initialAngle + 12.0 * angularProgress;\n  let hourDirection = direction(hourAngle);\n  let minuteDirection = direction(minuteAngle);\n  let hourDistance = segmentDistance(p,\n    -hourDirection * radius * 0.065, hourDirection * radius * 0.40);\n  let minuteDistance = segmentDistance(p,\n    -minuteDirection * radius * 0.075, minuteDirection * radius * 0.64);\n  let hourWidth = clamp(radius * 0.009, 0.95, 1.65);\n  let minuteWidth = clamp(radius * 0.006, 0.65, 1.15);\n  let hourMask = coverage(hourDistance, hourWidth, aa);\n  let minuteMask = coverage(minuteDistance, minuteWidth, aa);\n  let handHalo = max(coverage(hourDistance, hourWidth + 1.8, aa),\n    coverage(minuteDistance, minuteWidth + 1.8, aa));\n  scene = over(layer(vec3f(0.035, 0.49, 0.69),\n    energy * sphereMask * handHalo * 0.13), scene);\n  scene = over(layer(vec3f(0.10, 0.66, 0.84),\n    energy * sphereMask * hourMask * 0.86), scene);\n  scene = over(layer(vec3f(0.29, 0.88, 0.96),\n    energy * sphereMask * minuteMask * 0.94), scene);\n  let hubRadius = clamp(radius * 0.025, 1.4, 3.2);\n  let hub = coverage(rho, hubRadius, aa);\n  scene = over(layer(vec3f(0.16, 0.77, 0.90),\n    energy * sphereMask * hub * 0.93), scene);\n\n  // The sole emitter is an embedded finite patch on the same shell.\n  let sourceDelta = p - sourcePosition.xy;\n  let sourceFootprint = clamp(radius * 0.035, 1.8, 4.6);\n  let sourceLocal = sourceDelta / (vec2f(1.5, 0.65) * sourceFootprint);\n  let sourceCore = 1.0 - smoothstep(0.48, 1.0, length(sourceLocal));\n  let sourceHalo = exp(-dot(sourceDelta, sourceDelta)\n    / max(1.0, sourceFootprint * sourceFootprint * 7.0));\n  scene = over(layer(vec3f(0.055, 0.62, 0.87),\n    energy * sphereMask * sourceHalo * 0.34), scene);\n  scene = over(layer(vec3f(0.28, 0.91, 1.0),\n    energy * sphereMask * sourceCore * 0.95), scene);\n\n  let sourceSpark = sparkle(p, sourcePosition.xy, 4.6, aa);\n  let shellSparkA = sparkle(p, direction(0.30) * radius * 0.77, 3.6, aa);\n  let shellSparkB = sparkle(p, direction(2.10) * radius * 0.76, 3.1, aa);\n  let shellSpark = max(sourceSpark * sourceSparkStrength,\n    max(shellSparkA * sparkStrengthA, shellSparkB * sparkStrengthB));\n  scene = over(layer(vec3f(0.34, 0.91, 1.0),\n    energy * sphereMask * shellSpark * 0.94), scene);\n\n  // Work in the sampled linear space; encode final straight RGB only for the requested target.\n  var finalRgb = scene.rgb;\n  if (u.field.w > 0.5) {\n    let straightRgb = scene.rgb / max(scene.a, 0.000001);\n    finalRgb = encodeSrgb(straightRgb) * scene.a;\n  }\n  return vec4f(finalRgb, scene.a);\n}\n";
export const VERSION_ID='timekeeper-activation-cleanroom-sol61-r6';
export const DURATION_MS=5000;
export const SFX_OFFSET_MS=0;
export const SFX_DURATION_MS=920;
export const UNIFORM_FLOATS=16;
export const WORLD_RADIUS=155;
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(v,name)=>{if(!Number.isFinite(v))throw new TypeError(name+' must be finite');return v;};
export function phaseAt(ageMs){
 finite(ageMs,'ageMs');
 if(ageMs<0)return 'before';
 if(ageMs>=DURATION_MS)return 'expired';
 if(ageMs<460)return 'propagate';
 if(ageMs<650)return 'arrest';
 if(ageMs<4560)return 'held';
 return 'release';
}
export function geometryAt(ageMs,reducedMotion=false){
 finite(ageMs,'ageMs');
 const age=clamp(ageMs/DURATION_MS)*DURATION_MS;
 const expansion=1-Math.pow(1-clamp(age/460),3);
 const brake=1-Math.pow(1-clamp(age/650),3);
 return {radius:reducedMotion?155:38+117*expansion,
  angle:reducedMotion?0.45:-2.30+2.75*brake,
  energy:ageMs<0||ageMs>=5000?0:
   Math.min(clamp(age/75),1-clamp((age-4560)/440)),
  angularVelocity:reducedMotion||age>=650?0:2.75*3*Math.pow(1-age/650,2)/650,
  radialVelocity:reducedMotion||age>=460?0:117*3*Math.pow(1-age/460,2)/460};
}
export function frameState(input={},actorAspect=134/222,targetSrgb=false){
 const {width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,
  sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false,direction=0}=input;
 finite(width,'width');finite(height,'height');finite(dpr,'dpr');finite(actorHeightCss,'actorHeightCss');
 finite(actorAspect,'actorAspect');finite(direction,'direction');finite(ageMs,'ageMs');
 if(width<=0||height<=0||!Number.isInteger(width)||!Number.isInteger(height)||dpr<=0||actorHeightCss<=0||actorAspect<=0)
  throw new RangeError('positive integer backing dimensions and positive scale required');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('actorCenterCss needs two CSS coordinates');
 actorCenterCss.forEach((x,i)=>finite(x,'actorCenterCss'+i));
 for(const [k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))
  if(typeof v!=='boolean')throw new TypeError(k+' must be boolean');
 const phase=phaseAt(ageMs),active=sourceOn&&mainOn&&ageMs>=0&&ageMs<DURATION_MS;
 const g=geometryAt(ageMs,reducedMotion);
 const uniforms=new Float32Array([width,height,dpr,ageMs,...actorCenterCss,actorHeightCss,actorAspect,
  +active,+(active&&observerOn),+showActor,+reducedMotion,g.radius,g.angle,active?g.energy:0,+!targetSrgb]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('uniform values must remain finite float32');
 return {phase,active,geometry:g,uniforms,actorVisible:showActor,observerActive:active&&observerOn};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||typeof format!=='string')throw new TypeError('device, format and actorTexture required');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))
  throw new TypeError('unsupported target format');
 finite(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const targetSrgb=format.endsWith('-srgb')||format==='rgba16float';
 const shader=device.createShaderModule({label:VERSION_ID+' shader',code:WGSL});
 const diagnostics={compilation:'PENDING',messages:[],error:null};
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{
  diagnostics.messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,
   linePos:m.linePos,offset:m.offset,length:m.length}));
  diagnostics.compilation=diagnostics.messages.some(m=>m.type==='error')?'FAILED':'COMPILATION_INFO_RECEIVED';
  return diagnostics;
 }).catch(error=>{diagnostics.compilation='FAILED';diagnostics.error=String(error);return diagnostics;});
 const uniform=device.createBuffer({label:VERSION_ID+' uniforms',size:64,usage:0x40|0x08});
 let pipeline,bind;
 try{
  pipeline=device.createRenderPipeline({label:VERSION_ID+' pipeline',layout:'auto',
   vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format,
    blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
     alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
   primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
   {binding:0,resource:{buffer:uniform}},{binding:1,resource:actorTexture.createView()},
   {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){uniform.destroy();throw error;}
 let disposing=false,disposed=false,disposePromise=null,frames=0;
 return {diagnostics,diagnosticsReady,
  render(encoder,targetView,input){
   if(disposing||disposed)throw new Error('renderer disposed');
   if(!encoder||!targetView)throw new TypeError('host encoder and targetView required');
   const state=frameState(input,actorAspect,targetSrgb);
   device.queue.writeBuffer(uniform,0,state.uniforms);
   const pass=encoder.beginRenderPass({label:VERSION_ID+' load composite',
    colorAttachments:[{view:targetView,loadOp:'load',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
   return {versionId:VERSION_ID,active:state.active,phase:state.phase,activePhase:state.phase,
    renderPasses:1,uniformBytes:64,framesRecorded:frames,submitted:false,
    gpuCompletion:'HOST_OWNED_NOT_OBSERVED',actorVisible:state.actorVisible,observerActive:state.observerActive};
  },
  dispose(){
   if(disposePromise)return disposePromise;
   disposing=true;
   disposePromise=(async()=>{
    try{await device.queue.onSubmittedWorkDone();}
    catch(error){if(!device.lost)throw error;await device.lost;}
    uniform.destroy();disposed=true;
    return {disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};
   })();
   return disposePromise;
  }
 };
}
// One deterministic synthesized cue, no AudioContext and no playback side effects.
// Boundary transport causes friction; 650ms phase arrest causes the short detent.
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate 8000..192000 integer');
 const pcm=new Float32Array(Math.round(sampleRate*SFX_DURATION_MS/1000));
 let seed=0x5a17c9e1,low=0,previous=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/sampleRate;
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;
  low+=0.095*(noise-low);
  const grain=low-previous;previous=low;
  const arrest=clamp(t/0.65);
  const friction=Math.pow(1-arrest,0.5)*(1-Math.exp(-t/0.008))*Math.exp(-t/1.1);
  // Contact roughness slows as the phase front approaches its fixed bearing.
  const rough=(0.56+0.44*Math.sin(2*Math.PI*(71*t-44*t*t)));
  const drag=(0.50*grain+0.24*low)*friction*rough;
  const dt=t-0.65;
  const latch=dt>=0?(0.21*Math.exp(-dt/0.014)*noise+
   0.18*Math.sin(2*Math.PI*187*dt)*Math.exp(-dt/0.048)+
   0.08*Math.sin(2*Math.PI*431*dt)*Math.exp(-dt/0.025)):0;
  const end=clamp((pcm.length-1-i)/(sampleRate*0.06));
  pcm[i]=(drag+latch)*end;
 }
 return pcm;
}
