export const WGSL="struct Uniforms {\n    viewport: vec4f,\n    actor: vec4f,\n    gates: vec4f,\n    field: vec4f,\n};\n\n@group(0) @binding(0) var<uniform> u: Uniforms;\n@group(0) @binding(1) var actorTex: texture_2d<f32>;\n@group(0) @binding(2) var actorSampler: sampler;\n\nconst TAU: f32 = 6.28318530718;\nconst SOURCE_RGB: vec3f = vec3f(1.0, 0.79, 0.43);\n\nfn coverage(sd: f32, aa: f32) -> f32 {\n    return 1.0 - smoothstep(-aa, aa, sd);\n}\n\nfn segmentDistance(p: vec2f, a: vec2f, b: vec2f) -> f32 {\n    let ab = b - a;\n    let along = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.000001), 0.0, 1.0);\n    return length(p - a - along * ab);\n}\n\nfn layer(rgb: vec3f, opacity: f32) -> vec4f {\n    let a = clamp(opacity, 0.0, 1.0);\n    return vec4f(max(rgb, vec3f(0.0)) * a, a);\n}\n\nfn over(front: vec4f, back: vec4f) -> vec4f {\n    return front + back * (1.0 - front.a);\n}\n\nfn clockwiseDirection(angle: f32) -> vec2f {\n    return vec2f(sin(angle), -cos(angle));\n}\n\n// A finite, shared display-space falloff, not a world-space lighting model.\nfn sourceFalloff(p: vec2f, sourcePos: vec2f, radius: f32, actorHeight: f32) -> f32 {\n    let delta = p - sourcePos;\n    let dist = length(delta);\n    let scale = max(radius * 0.96, 1.0);\n    let reach = radius * 1.95 + actorHeight * 0.80;\n    let bounded = 1.0 - smoothstep(reach * 0.76, reach, dist);\n    return bounded / (1.0 + dot(delta, delta) / (scale * scale));\n}\n\nfn sparkle(p: vec2f, center: vec2f, armLength: f32, drive: f32, aa: f32, dialBacking: f32) -> vec4f {\n    let delta = p - center;\n    // All eight stars use these same two diagonal axes.\n    let q = abs(vec2f(delta.x + delta.y, delta.y - delta.x) * 0.70710678118);\n    let armWidth = armLength * 0.255;\n    let divisor = sqrt(1.0 / (armLength * armLength) + 1.0 / (armWidth * armWidth));\n    let horizontal = (q.x / armLength + q.y / armWidth - 1.0) / divisor;\n    let vertical = (q.x / armWidth + q.y / armLength - 1.0) / divisor;\n    let sd = min(horizontal, vertical);\n    let body = coverage(sd, aa * 0.75);\n    let tipFraction = clamp(max(q.x, q.y) / armLength, 0.0, 1.0);\n    let centerGrade = pow(1.0 - tipFraction, 0.65);\n    let starColor = mix(vec3f(0.83, 0.48, 0.16), vec3f(1.0, 0.98, 0.83), centerGrade);\n    let glowScale = max(armLength * 0.25, aa);\n    let outside = max(sd, 0.0) / glowScale;\n    let finiteGlow = 1.0 - smoothstep(armLength + glowScale, armLength + 3.0 * glowScale, length(delta));\n    let glow = exp(-outside * outside) * finiteGlow;\n\n    // R9: a narrow dial-side separator reuses the minute-hand border palette.\n    // Clipping it to finiteGlow preserves the existing fitted star support.\n    // The original star body, glow, color and shared orientation are unchanged.\n    let keylineWidth = max(0.45, 0.10 * armLength);\n    let keylineMask = coverage(sd - keylineWidth, aa * 0.55) * finiteGlow;\n    var result = layer(vec3f(0.018, 0.12, 0.145), keylineMask * drive * dialBacking * 0.82);\n    result = over(layer(SOURCE_RGB, 0.19 * glow * drive), result);\n    result = over(layer(starColor, body * drive * (0.70 + 0.30 * centerGrade)), result);\n    return result;\n}\n\n// Shared R7 star geometry: fitting and drawing cannot disagree about placement.\nfn starOffset(starIndex: u32, radius: f32) -> vec2f {\n    let starNumber = f32(starIndex);\n    let placementAngle = 0.22 + starNumber * TAU / 8.0;\n    let orbitScale = 1.035 + 0.075 * cos(starNumber * 2.17);\n    return vec2f(cos(placementAngle), sin(placementAngle)) * radius * orbitScale;\n}\n\nfn starArmLength(starIndex: u32, actorHeight: f32) -> f32 {\n    let sizeVariation = 0.88 + 0.12 * cos(f32(starIndex) * 1.71);\n    return max(4.8, 0.075 * actorHeight) * sizeVariation;\n}\n\n// Conservative half-extent includes both the AA-expanded body and finite glow.\nfn starHalfExtent(armLength: f32, aa: f32) -> f32 {\n    let armWidth = armLength * 0.255;\n    let divisor = sqrt(1.0 / (armLength * armLength) + 1.0 / (armWidth * armWidth));\n    let bodyRadius = armLength * (1.0 + 0.75 * aa * divisor);\n    let glowRadius = armLength + 3.0 * max(armLength * 0.25, aa);\n    return max(bodyRadius, glowRadius);\n}\n\nfn encodeSrgb(rgb: vec3f) -> vec3f {\n    let c = max(rgb, vec3f(0.0));\n    let low = 12.92 * c;\n    let high = 1.055 * pow(c, vec3f(1.0 / 2.4)) - vec3f(0.055);\n    return select(low, high, c > vec3f(0.0031308));\n}\n\n@vertex\nfn vs(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {\n    let positions = array<vec2f, 3>(\n        vec2f(-1.0, -1.0),\n        vec2f(3.0, -1.0),\n        vec2f(-1.0, 3.0)\n    );\n    return vec4f(positions[vertexIndex], 0.0, 1.0);\n}\n\n@fragment\nfn fs(@builtin(position) fragmentPosition: vec4f) -> @location(0) vec4f {\n    let dpr = max(u.viewport.z, 0.001);\n    let p = fragmentPosition.xy / dpr - u.actor.xy;\n    let actorHeight = max(u.actor.z, 0.001);\n    let actorWidth = max(actorHeight * u.actor.w, 0.001);\n    let aa = max(0.60 / dpr, 0.20);\n\n    // Derivatives and texture sampling are unconditional, before any control flow.\n    let uv = p / vec2f(actorWidth, actorHeight) + vec2f(0.5);\n    let uvDx = dpdx(uv);\n    let uvDy = dpdy(uv);\n    let texSize = vec2f(textureDimensions(actorTex));\n    let halfTexel = vec2f(0.5) / max(texSize, vec2f(1.0));\n    let sampleUv = clamp(uv, halfTexel, vec2f(1.0) - halfTexel);\n    let actorSample = textureSampleGrad(actorTex, actorSampler, sampleUv, uvDx, uvDy);\n    let insideUv = select(0.0, 1.0, all(uv >= vec2f(0.0)) && all(uv <= vec2f(1.0)));\n\n    let radius = max(u.field.x, 0.001);\n    let hostAngle = u.field.y;\n    let energy = clamp(u.field.z, 0.0, 1.0);\n    let sourceGate = clamp(u.gates.x, 0.0, 1.0);\n    let observerGate = clamp(u.gates.y, 0.0, 1.0);\n    let actorGate = clamp(u.gates.z, 0.0, 1.0);\n\n    // No private lifetime or oscillator: host angle and energy are authoritative.\n    // This modulation freezes with the host angle, including during hold.\n    // There is no autonomous motion to suppress in reduced-motion mode.\n    let phaseGain = 0.92 + 0.08 * cos(2.0 * hostAngle);\n    let drive = energy * sourceGate * phaseGain;\n    let receiverDrive = drive * observerGate * actorGate;\n\n    // R8: translate the original composition only as far as its finite support\n    // requires. Bounds and margin are in CSS pixels, including on HiDPI targets.\n    let viewportCss = u.viewport.xy / dpr;\n    let margin = vec2f(10.0);\n    let sphereExtent = max(1.18 * radius, radius + aa);\n    var envelopeMin = vec2f(-sphereExtent);\n    var envelopeMax = vec2f(sphereExtent);\n    for (var fitIndex: u32 = 0u; fitIndex < 8u; fitIndex = fitIndex + 1u) {\n        let offset = starOffset(fitIndex, radius);\n        let extent = vec2f(starHalfExtent(starArmLength(fitIndex, actorHeight), aa));\n        envelopeMin = min(envelopeMin, offset - extent);\n        envelopeMax = max(envelopeMax, offset + extent);\n    }\n    let preferredCenterCss = u.actor.xy\n        + vec2f(-0.14 * radius, -0.82 * radius - 0.58 * actorHeight);\n    let minimumCenterCss = margin - envelopeMin;\n    let maximumCenterCss = viewportCss - margin - envelopeMax;\n    let fittedCenterCss = clamp(preferredCenterCss, minimumCenterCss,\n        max(minimumCenterCss, maximumCenterCss));\n    // An infeasible axis cannot fit without scaling; balance its overflow while\n    // retaining the host radius. The supplied 980x620 fixture is fully feasible.\n    let balancedCenterCss = 0.5 * (viewportCss - envelopeMin - envelopeMax);\n    let centerCss = select(balancedCenterCss, fittedCenterCss,\n        minimumCenterCss <= maximumCenterCss);\n    let sphereCenter = centerCss - u.actor.xy;\n    let sourcePos = sphereCenter;\n    let q = p - sphereCenter;\n    let dist = length(q);\n    let s = q / radius;\n    let radialSquared = dot(s, s);\n    let falloff = sourceFalloff(p, sourcePos, radius, actorHeight);\n    var scene = vec4f(0.0);\n\n    // A bounded, soft display-space veil joins the pearl to the receiver.\n    // It has no independently lit endpoint and is behind the clock and avatar.\n    let receiverAnchor = vec2f(0.0, -0.12 * actorHeight);\n    let bridgeVector = receiverAnchor - sourcePos;\n    let bridgeLength = max(length(bridgeVector), 1.0);\n    let bridgeAxis = bridgeVector / bridgeLength;\n    let bridgeNormal = vec2f(-bridgeAxis.y, bridgeAxis.x);\n    let bridgeAlong = dot(p - sourcePos, bridgeAxis);\n    let bridgeAcross = abs(dot(p - sourcePos, bridgeNormal));\n    let bridgeFraction = clamp(bridgeAlong / bridgeLength, 0.0, 1.0);\n    let bridgeWidth = mix(max(0.045 * radius, 1.0), 0.32 * actorHeight, bridgeFraction);\n    let bridgeSides = 1.0 - smoothstep(0.35 * bridgeWidth, bridgeWidth, bridgeAcross);\n    let bridgeEnds = smoothstep(0.0, max(0.08 * bridgeLength, aa), bridgeAlong)\n        * (1.0 - smoothstep(0.88 * bridgeLength, 1.10 * bridgeLength, bridgeAlong));\n    scene = over(layer(SOURCE_RGB, 0.19 * receiverDrive * falloff * bridgeSides * bridgeEnds), scene);\n\n    // Broad emissive opal, not merely a perimeter glow.\n    let outsideSphere = max(dist - radius, 0.0);\n    let glowWidth = max(0.095 * radius, aa);\n    let sphereBloom = exp(-outsideSphere * outsideSphere / (glowWidth * glowWidth))\n        * (1.0 - smoothstep(radius, radius * 1.18, dist));\n    scene = over(layer(vec3f(0.24, 0.64, 0.56), sphereBloom * drive * 0.105), scene);\n\n    let sphereMask = coverage(dist - radius, aa);\n    let dome = sqrt(max(0.0, 1.0 - min(radialSquared, 1.0)));\n    let warmCenter = exp(-2.0 * radialSquared);\n    let faceColor = mix(vec3f(0.075, 0.43, 0.47), vec3f(0.86, 0.65, 0.27), 0.68 * warmCenter)\n        + vec3f(0.08, 0.15, 0.13) * dome;\n    let faceOpacity = sphereMask * drive * (0.48 + 0.10 * dome);\n    scene = over(layer(faceColor, faceOpacity), scene);\n\n    // Glass perimeter and a closed dial ring; neither is a sweep arc or a hand.\n    let rimWidth = max(0.009 * radius, 0.65);\n    let rim = coverage(abs(dist - radius * 0.974) - rimWidth, aa) * sphereMask;\n    scene = over(layer(vec3f(0.43, 0.88, 0.76), rim * drive * 0.63), scene);\n    let dialRing = coverage(abs(dist - radius * 0.845) - max(0.0035 * radius, 0.40), aa);\n    scene = over(layer(vec3f(0.89, 0.75, 0.41), dialRing * drive * 0.29), scene);\n    let innerRing = coverage(abs(dist - radius * 0.765) - max(0.002 * radius, 0.28), aa);\n    scene = over(layer(vec3f(0.41, 0.76, 0.68), innerRing * drive * 0.19), scene);\n\n    for (var tickIndex: u32 = 0u; tickIndex < 12u; tickIndex = tickIndex + 1u) {\n        let tickAngle = f32(tickIndex) * TAU / 12.0;\n        let tickDirection = clockwiseDirection(tickAngle);\n        let cardinal = select(0.0, 1.0, tickIndex % 3u == 0u);\n        let tickInner = radius * mix(0.805, 0.785, cardinal);\n        let tickOuter = radius * 0.884;\n        let tickWidth = max(radius * mix(0.005, 0.008, cardinal), 0.48);\n        let tickMask = coverage(segmentDistance(q, tickDirection * tickInner, tickDirection * tickOuter) - tickWidth, aa);\n        let tickColor = mix(vec3f(0.62, 0.89, 0.76), vec3f(1.0, 0.83, 0.46), cardinal);\n        scene = over(layer(tickColor, tickMask * drive * 0.83), scene);\n    }\n\n    // Two actual hands, both derived from precisely the same host angle.\n    // With screen y downward, this convention makes positive angles clockwise.\n    let hourDirection = clockwiseDirection(hostAngle);\n    let minuteDirection = clockwiseDirection(12.0 * hostAngle);\n    let hourNormal = vec2f(-hourDirection.y, hourDirection.x);\n    let hourTip = hourDirection * (0.43 * radius);\n    let minuteTip = minuteDirection * (0.73 * radius);\n    let hourWidth = max(0.034 * radius, 1.50);\n    let minuteWidth = max(0.0115 * radius, 0.65);\n    let handBorder = max(0.008 * radius, 0.75);\n    let hourDistance = segmentDistance(q, vec2f(0.0), hourTip);\n    let hourBorderMask = coverage(hourDistance - hourWidth - handBorder, aa);\n    let hourBodyMask = coverage(hourDistance - hourWidth, aa);\n    scene = over(layer(vec3f(0.035, 0.105, 0.11), hourBorderMask * drive * 0.93), scene);\n    scene = over(layer(vec3f(1.0, 0.57, 0.12), hourBodyMask * drive * 0.98), scene);\n    let hourSpine = coverage(hourDistance - hourWidth * 0.23, aa * 0.8);\n    scene = over(layer(vec3f(1.0, 0.84, 0.40), hourSpine * drive * 0.70), scene);\n\n    // The short hand has broad terminal shoulders visible beside the long blade.\n    let capHalfSpan = max(0.052 * radius, hourWidth * 1.35);\n    let capWidth = max(0.009 * radius, 0.65);\n    let capDistance = segmentDistance(q, hourTip - hourNormal * capHalfSpan, hourTip + hourNormal * capHalfSpan);\n    scene = over(layer(vec3f(0.10, 0.18, 0.14), coverage(capDistance - capWidth - handBorder * 0.65, aa) * drive * 0.90), scene);\n    scene = over(layer(vec3f(1.0, 0.74, 0.25), coverage(capDistance - capWidth, aa) * drive), scene);\n\n    // Dark separation is drawn before the minute blade, keeping crossings legible.\n    let minuteDistance = segmentDistance(q, vec2f(0.0), minuteTip);\n    scene = over(layer(vec3f(0.018, 0.12, 0.145), coverage(minuteDistance - minuteWidth - handBorder, aa) * drive * 0.98), scene);\n    scene = over(layer(vec3f(0.72, 1.0, 0.94), coverage(minuteDistance - minuteWidth, aa * 0.80) * drive), scene);\n    scene = over(layer(vec3f(1.0, 1.0, 0.91), coverage(minuteDistance - minuteWidth * 0.30, aa * 0.65) * drive * 0.66), scene);\n\n    // The sole explicit source is a pearl at the common pivot, inside the sphere.\n    let pearlRadius = max(0.037 * radius, 1.85);\n    let pearlGlowRadius = max(0.13 * radius, pearlRadius * 2.5);\n    let pearlGlow = exp(-3.0 * dist * dist / (pearlGlowRadius * pearlGlowRadius))\n        * (1.0 - smoothstep(pearlGlowRadius * 0.85, pearlGlowRadius * 1.45, dist));\n    scene = over(layer(SOURCE_RGB, pearlGlow * drive * 0.34), scene);\n    scene = over(layer(SOURCE_RGB, coverage(dist - pearlRadius, aa) * drive), scene);\n    scene = over(layer(vec3f(1.0, 0.98, 0.83), coverage(dist - pearlRadius * 0.52, aa * 0.75) * drive), scene);\n\n    // Receiver lighting is evaluated in the same CSS/display coordinate system.\n    // No illumination can escape the texture's UV rectangle or its real alpha.\n    let toSource = sourcePos - p;\n    let toSourceDirection = toSource / max(length(toSource), 0.001);\n    let receiverOffset = (uv - vec2f(0.5)) * 2.0;\n    let screenFacing = clamp(0.5 + 0.5 * dot(receiverOffset, toSourceDirection), 0.0, 1.0);\n    let receiverGain = 0.94 * receiverDrive * falloff * (0.38 + 0.62 * screenFacing);\n    let baseRgb = clamp(actorSample.rgb, vec3f(0.0), vec3f(1.0));\n    let illuminatedRgb = baseRgb + (vec3f(1.0) - baseRgb) * SOURCE_RGB * clamp(receiverGain, 0.0, 1.0);\n    let actorAlpha = clamp(actorSample.a, 0.0, 1.0) * insideUv * actorGate;\n    scene = over(layer(illuminatedRgb, actorAlpha), scene);\n\n    // Stable, filled four-point stars persist while the host powers the source.\n    // Only their common host-phase/source gain varies; there is no private timer.\n    // R9 backing is restricted to the dial and suppressed over opaque avatar pixels.\n    let starDialBacking = sphereMask * (1.0 - actorAlpha);\n    for (var starIndex: u32 = 0u; starIndex < 8u; starIndex = starIndex + 1u) {\n        let starNumber = f32(starIndex);\n        let starCenter = sphereCenter + starOffset(starIndex, radius);\n        let armLength = starArmLength(starIndex, actorHeight);\n        let starGain = drive * (0.88 + 0.12 * cos(starNumber * 1.37));\n        scene = over(sparkle(p, starCenter, armLength, starGain, aa, starDialBacking), scene);\n    }\n\n    // Convert straight RGB, then restore premultiplication for the supplied blend.\n    let outAlpha = clamp(scene.a, 0.0, 1.0);\n    var straightRgb = clamp(scene.rgb / max(outAlpha, 0.000001), vec3f(0.0), vec3f(1.0));\n    if (u.field.w > 0.5) {\n        straightRgb = encodeSrgb(straightRgb);\n    }\n    return vec4f(straightRgb * outAlpha, outAlpha);\n}\n";
export const VERSION_ID='timekeeper-activation-cleanroom-sol61-r9';
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
