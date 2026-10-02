import { BASIS_HASH, OBJECTS } from './object-fixture.mjs';

export const OBJECT_E_ID = 'medical-r9-object-e';
export const OBJECT_E_DURATION_MS = 1800;
export const OBJECT_E_AUDIO_GAIN = 0;
export const RIM = Object.freeze({ durationMs: 1800, coreHalfWidthPx: 1.7, shoulderWidthPx: 4.3,
  colorLinearRgb: Object.freeze([0.3,0.72,1.0]), peakLinearEmission: 4.8,
  envelopeMs: Object.freeze([0,105,1120,1800]), nearGlowRadiusPx: 11, nearGlowGain: 0.32,
  sweepStartMs: 95, sweepDurationMs: 540, sweepHalfWidth: 0.035 });
export const WATER = Object.freeze({ outletPx: Object.freeze([885,187]), contactPx: Object.freeze([885,234]),
  bodyHalfWidthPx: 4.2, coreHalfWidthPx: 1.8, riseMs: 95, holdEndMs: 1060, taperEndMs: 1370, durationMs: 1800,
  basinEllipsePx: Object.freeze([885,234,54,29]) });

function n(value) { return Number(value).toFixed(1); }
function wgslFloat(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('finite WGSL literal required');
  return Number.isInteger(number) ? `${number}.0` : String(number);
}
function wgslPoints(points) { return `array<vec2f,${points.length}>(${points.map(([x,y]) => `vec2f(${n(x)},${n(y)})`).join(',')})`; }
function distanceFunction(name, points) {
  return `fn dist${name}(p:vec2f)->f32 { let v=${wgslPoints(points)}; var d=1e9;\n` +
    points.map((_, i) => `  d=min(d,segmentDistance(p,v[${i}],v[${(i + 1) % points.length}]));`).join('\n') + '\n  return d;\n}';
}
function progressFunction(name, points) {
  const lengths = points.map((p, i) => Math.hypot(points[(i + 1) % points.length][0] - p[0], points[(i + 1) % points.length][1] - p[1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let acc = 0;
  const candidates = points.map((_, i) => {
    const j = (i + 1) % points.length, before = acc;
    acc += lengths[i];
    return `  { let a=v[${i}];let b=v[${j}];let edge=b-a;let t=clamp(dot(p-a,edge)/max(dot(edge,edge),1e-7),0.,1.);let d=distance(p,a+edge*t);if(d<best){best=d;progress=(${before.toFixed(3)}+t*${lengths[i].toFixed(3)})/${total.toFixed(3)};} }`;
  }).join('\n');
  return `fn progress${name}(p:vec2f)->f32 { let v=${wgslPoints(points)};var best=1e9;var progress=0.;\n${candidates}\nreturn progress;\n}`;
}
function insideFunction(name, points) {
  return `fn inside${name}(p:vec2f)->bool { let v=${wgslPoints(points)}; var inside=false;\n` +
    points.map((_, i) => {
      const j = (i + 1) % points.length;
      return `  if ((v[${i}].y>p.y)!=(v[${j}].y>p.y)) { let crossX=(v[${j}].x-v[${i}].x)*(p.y-v[${i}].y)/(v[${j}].y-v[${i}].y)+v[${i}].x; if(p.x<crossX){inside=!inside;} }`;
    }).join('\n') + '\n  return inside;\n}';
}

const [STRETCHER, CART, SINK] = OBJECTS;

export const shader = /* wgsl */ `
struct Params { view:vec4f, image:vec4f, controls:vec4f, actor:vec4f, stretcher:vec4f, cart:vec4f, sink:vec4f }
@group(0) @binding(0) var<uniform> params:Params;
@group(0) @binding(1) var baseScene:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct Vertex { @builtin(position) position:vec4f }
@vertex fn vertex(@builtin(vertex_index) i:u32)->Vertex {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(-1.,3.),vec2f(3.,-1.))[i];
  var o:Vertex;o.position=vec4f(p,0.,1.);return o;
}
fn segmentDistance(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let v=b-a;let q=clamp(dot(p-a,v)/max(dot(v,v),1e-7),0.,1.);return distance(p,a+v*q);
}
fn roundedRectSdf(p:vec2f,r:vec4f,corner:f32)->f32 {
  let center=(r.xy+r.zw)*0.5;let half=(r.zw-r.xy)*0.5-corner;
  let q=abs(p-center)-half;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.)-corner;
}
fn gate(age:f32,a:f32,b:f32,c:f32,d:f32)->f32 { return smoothstep(a,b,age)*(1.-smoothstep(c,d,age)); }
fn rimEnvelope(age:f32)->f32 { return gate(age,0.,105.,1120.,1800.); }
fn circularDistance(a:f32,b:f32)->f32 { let d=abs(a-b);return min(d,1.-d); }
fn rimSweep(age:f32,progress:f32)->f32 {
  let travel=clamp((age-95.)/540.,0.,1.);
  let sweepGate=gate(age,95.,125.,565.,635.);
  let d=circularDistance(progress,travel);
  return exp(-pow(d/0.035,2.))*sweepGate;
}
fn maskFade(p:vec2f,r:vec4f,corner:f32,fade:f32)->f32 { return 1.-smoothstep(-fade,0.,roundedRectSdf(p,r,corner)); }
fn sampleScene(screen:vec2f,offsetImagePx:vec2f)->vec4f {
  let backingOffset=offsetImagePx*(params.image.z/1164.);
  let uv=(screen+backingOffset)/params.view.xy;
  return textureSampleLevel(baseScene,linearSampler,uv,0.);
}
${distanceFunction('StretcherRim', STRETCHER.rimOutlinePx)}
${distanceFunction('CartRim', CART.rimOutlinePx)}
${distanceFunction('SinkRim', SINK.rimOutlinePx)}
${progressFunction('StretcherRim', STRETCHER.rimOutlinePx)}
${progressFunction('CartRim', CART.rimOutlinePx)}
${progressFunction('SinkRim', SINK.rimOutlinePx)}
${insideFunction('StretcherFootprint', STRETCHER.footprintPolygonPx)}
${insideFunction('CartFootprint', CART.footprintPolygonPx)}
${insideFunction('SinkFootprint', SINK.footprintPolygonPx)}
fn stretcherQ(ms:f32)->f32 {
  if(ms<0.||ms>=1800.){return 0.;}let after=max(0.,ms-220.);
  return 6.*(1.-exp(-ms/90.))*exp(-after/430.)*(0.75+0.25*cos(6.28318530718*after/520.));
}
fn cartQ(ms:f32)->f32 {
  if(ms<0.||ms>=1500.){return 0.;}
  if(ms<420.){return 6.*sin(3.14159265359*min(ms/420.,1.))*exp(-max(0.,ms-420.)/260.);}
  let after=ms-420.;return 3.*exp(-after/260.)*sin(6.28318530718*after/360.);
}
fn sinkWave(p:vec2f,ms:f32)->f32 {
  if(ms<0.||ms>=1800.){return 0.;}let a=ms/1000.;let contact=vec2f(885.,234.);
  let d=distance(p,contact);let radius=8.+45.*a;
  return 2.6*exp(-a/0.55)*sin(6.28318530718*(d-45.*a)/18.)*exp(-pow((d-radius)/12.,2.));
}
@fragment fn fragment(input:Vertex)->@location(0) vec4f {
  let screen=input.position.xy;let viewUv=screen/params.view.xy;
  let sourcePx=(screen-params.image.xy)/(params.image.z/1164.);
  if(sourcePx.x<0.||sourcePx.y<0.||sourcePx.x>=1164.||sourcePx.y>=1351.){
    return textureSampleLevel(baseScene,linearSampler,viewUv,0.);
  }
  var color=sampleScene(screen,vec2f(0.)).rgb;
  let sAge=params.stretcher.x;let sDelta=params.stretcher.y;
  let cAge=params.cart.x;let cDelta=params.cart.y;
  let wAge=params.sink.x;let wDelta=params.sink.y;
  let sRect=vec4f(354.,564.,565.,995.);let sMask=maskFade(sourcePx,sRect,14.,12.);
  let sUv=(sourcePx-sRect.xy)/(sRect.zw-sRect.xy);
  let sProfile=pow(sin(3.14159265359*sUv.x),2.)*pow(sin(3.14159265359*sUv.y),2.);
  let sWarp=stretcherQ(sAge)*sProfile*sMask*sDelta;
  if(sWarp!=0.){color=sampleScene(screen,vec2f(0.,sWarp)).rgb;}
  let cRect=vec4f(254.,156.,312.,229.);let cMask=maskFade(sourcePx,cRect,2.,4.);
  let cUv=(sourcePx-cRect.xy)/(cRect.zw-cRect.xy);
  let cProfile=pow(sin(3.14159265359*cUv.x),2.)*cUv.y*cUv.y;
  let cWarp=cartQ(cAge)*cProfile*cMask*cDelta;
  if(cWarp!=0.){color=sampleScene(screen,vec2f(0.,sWarp+cWarp)).rgb;}
  let wRect=vec4f(811.,190.,967.,273.);let wMask=maskFade(sourcePx,wRect,22.,6.);
  let basinCoord=(sourcePx-vec2f(${wgslFloat(WATER.basinEllipsePx[0])},${wgslFloat(WATER.basinEllipsePx[1])}))/vec2f(${wgslFloat(WATER.basinEllipsePx[2])},${wgslFloat(WATER.basinEllipsePx[3])});
  let basinMask=1.-smoothstep(0.92,1.04,length(basinCoord));
  let wWarp=sinkWave(sourcePx,wAge)*wMask*wDelta*basinMask;
  if(wWarp!=0.){let radialVector=sourcePx-vec2f(885.,234.);let radial=radialVector/max(length(radialVector),1e-3);color=sampleScene(screen,vec2f(0.,sWarp+cWarp)+wWarp*radial).rgb;}

  let sourceOn=params.controls.x>0.5;let obsOn=params.controls.y>0.5;
  // A successful positive sink receipt emits a short, water-shaped jet from the faucet outlet to the basin.
  let waterActive=(wAge>=0.&&wAge<${wgslFloat(WATER.durationMs)}&&wDelta>0.&&sourceOn);
  let waterProgress=clamp((sourcePx.y-${wgslFloat(WATER.outletPx[1])})/${wgslFloat(WATER.contactPx[1]-WATER.outletPx[1])},0.,1.);
  let waterCenter=${wgslFloat(WATER.outletPx[0])}+0.75*sin(waterProgress*3.14159265359);
  let waterDx=abs(sourcePx.x-waterCenter);
  let waterY=step(${wgslFloat(WATER.outletPx[1]-1)},sourcePx.y)*(1.-step(${wgslFloat(WATER.contactPx[1]+1)},sourcePx.y));
  let waterRise=smoothstep(0.,${wgslFloat(WATER.riseMs)},wAge);
  let waterHold=1.-smoothstep(${wgslFloat(WATER.holdEndMs)},${wgslFloat(WATER.taperEndMs)},wAge);
  let waterEnvelope=select(0.,waterRise*waterHold,waterActive)*waterY;
  let waterBody=(1.-smoothstep(${wgslFloat(WATER.bodyHalfWidthPx)},${wgslFloat(WATER.bodyHalfWidthPx+1.5)},waterDx))*waterEnvelope;
  let waterCore=(1.-smoothstep(${wgslFloat(WATER.coreHalfWidthPx)},${wgslFloat(WATER.coreHalfWidthPx+0.8)},waterDx))*waterEnvelope;
  let filament=0.72+0.28*sin(sourcePx.y*0.92-wAge*0.045);
  color+=vec3f(0.045,0.31,0.86)*(2.1*waterBody*filament)+vec3f(0.42,0.86,1.)*(4.6*waterCore);
  let basinAge=wAge-180.;let basinSeconds=max(0.,basinAge)/1000.;
  let impactDistance=length((sourcePx-vec2f(${wgslFloat(WATER.contactPx[0])},${wgslFloat(WATER.contactPx[1])}))*vec2f(1.,1.6));
  let ringOne=exp(-pow((impactDistance-(5.+18.*basinSeconds))/2.1,2.));
  let ringTwo=exp(-pow((impactDistance-(13.+14.*basinSeconds))/1.8,2.));
  let basinPulse=(ringOne*0.72+ringTwo*0.48)*exp(-max(0.,basinAge)/650.)*select(0.,1.,waterActive&&basinAge>=0.&&basinAge<1620.)*basinMask;
  let sprayDistance=min(min(segmentDistance(sourcePx,vec2f(882.,232.),vec2f(879.,227.)),segmentDistance(sourcePx,vec2f(884.,233.),vec2f(881.,228.))),min(min(segmentDistance(sourcePx,vec2f(886.,233.),vec2f(889.,228.)),segmentDistance(sourcePx,vec2f(888.,232.),vec2f(891.,227.))),segmentDistance(sourcePx,vec2f(885.,234.),vec2f(885.,228.))));
  let sprayEnvelope=select(0.,exp(-max(0.,wAge-150.)/120.),waterActive&&wAge>=150.&&wAge<610.);
  let impactSpray=exp(-pow(sprayDistance/1.15,2.))*sprayEnvelope;
  color+=vec3f(0.08,0.43,0.9)*(0.72*basinPulse)+vec3f(0.35,0.78,1.)*(1.05*impactSpray);
  let waterHalo=exp(-pow(waterDx/9.,2.))*waterY*waterEnvelope*select(0.,1.,obsOn);
  color+=vec3f(0.16,0.5,0.92)*(0.38*waterHalo);
  let sDist=distStretcherRim(sourcePx);let cDist=distCartRim(sourcePx);let wDist=distSinkRim(sourcePx);
  let sEnv=rimEnvelope(sAge);let cEnv=rimEnvelope(cAge);let wEnv=rimEnvelope(wAge);
  let sSweep=rimSweep(sAge,progressStretcherRim(sourcePx));let cSweep=rimSweep(cAge,progressCartRim(sourcePx));let wSweep=rimSweep(wAge,progressSinkRim(sourcePx));
  let sDistOut=max(0.,sDist-${wgslFloat(RIM.coreHalfWidthPx)});let cDistOut=max(0.,cDist-${wgslFloat(RIM.coreHalfWidthPx)});let wDistOut=max(0.,wDist-${wgslFloat(RIM.coreHalfWidthPx)});
  let sCore=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx)},${wgslFloat(RIM.coreHalfWidthPx+0.8)},sDist))*sEnv*select(0.,1.,sourceOn);
  let cCore=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx)},${wgslFloat(RIM.coreHalfWidthPx+0.8)},cDist))*cEnv*select(0.,1.,sourceOn);
  let wCore=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx)},${wgslFloat(RIM.coreHalfWidthPx+0.8)},wDist))*wEnv*select(0.,1.,sourceOn);
  let sShoulder=(1.-smoothstep(${wgslFloat(RIM.shoulderWidthPx)},${wgslFloat(RIM.shoulderWidthPx+1.1)},sDist))*sEnv*select(0.,1.,sourceOn);
  let cShoulder=(1.-smoothstep(${wgslFloat(RIM.shoulderWidthPx)},${wgslFloat(RIM.shoulderWidthPx+1.1)},cDist))*cEnv*select(0.,1.,sourceOn);
  let wShoulder=(1.-smoothstep(${wgslFloat(RIM.shoulderWidthPx)},${wgslFloat(RIM.shoulderWidthPx+1.1)},wDist))*wEnv*select(0.,1.,sourceOn);
  let sSweepLine=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx+1.)},${wgslFloat(RIM.coreHalfWidthPx+3.2)},sDist))*sSweep*select(0.,1.,sourceOn);
  let cSweepLine=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx+1.)},${wgslFloat(RIM.coreHalfWidthPx+3.2)},cDist))*cSweep*select(0.,1.,sourceOn);
  let wSweepLine=(1.-smoothstep(${wgslFloat(RIM.coreHalfWidthPx+1.)},${wgslFloat(RIM.coreHalfWidthPx+3.2)},wDist))*wSweep*select(0.,1.,sourceOn);
  let sReceiver=select(0.,1.,insideStretcherFootprint(sourcePx)&&sDist<=5.)*sEnv*select(0.,1.,sourceOn);
  let cReceiver=select(0.,1.,insideCartFootprint(sourcePx)&&cDist<=5.)*cEnv*select(0.,1.,sourceOn);
  let wReceiver=select(0.,1.,insideSinkFootprint(sourcePx)&&wDist<=5.)*wEnv*select(0.,1.,sourceOn);
  let sGlow=exp(-pow(sDistOut/${wgslFloat(RIM.nearGlowRadiusPx)},2.))*(1.-smoothstep(${wgslFloat(RIM.nearGlowRadiusPx)},${wgslFloat(RIM.nearGlowRadiusPx+1)},sDistOut))*sEnv*select(0.,1.,sourceOn&&obsOn);
  let cGlow=exp(-pow(cDistOut/${wgslFloat(RIM.nearGlowRadiusPx)},2.))*(1.-smoothstep(${wgslFloat(RIM.nearGlowRadiusPx)},${wgslFloat(RIM.nearGlowRadiusPx+1)},cDistOut))*cEnv*select(0.,1.,sourceOn&&obsOn);
  let wGlow=exp(-pow(wDistOut/${wgslFloat(RIM.nearGlowRadiusPx)},2.))*(1.-smoothstep(${wgslFloat(RIM.nearGlowRadiusPx)},${wgslFloat(RIM.nearGlowRadiusPx+1)},wDistOut))*wEnv*select(0.,1.,sourceOn&&obsOn);
  let rimRgb=vec3f(${RIM.colorLinearRgb[0]},${RIM.colorLinearRgb[1]},${RIM.colorLinearRgb[2]});
  color+=rimRgb*${RIM.peakLinearEmission}*(sCore+cCore+wCore)+rimRgb*${RIM.peakLinearEmission}*0.20*(sShoulder+cShoulder+wShoulder)+vec3f(0.55,0.9,1.)*${RIM.peakLinearEmission}*0.7*(sSweepLine+cSweepLine+wSweepLine);
  color+=rimRgb*${RIM.nearGlowGain}*(sReceiver+cReceiver+wReceiver)+rimRgb*${RIM.nearGlowGain}*(sGlow+cGlow+wGlow);

  if(params.actor.z>0.5&&distance(sourcePx,params.actor.xy)<11.){
    let d=distance(sourcePx,params.actor.xy);let body=1.-smoothstep(8.,11.,d);
    color=mix(color,vec3f(0.28,0.78,0.98),body);
    let ring=1.-smoothstep(12.,14.,abs(d-11.));color+=vec3f(0.68,0.94,1.)*ring*0.75;
  }
  return vec4f(color,1.);
}
`;

export const PARAMETER_BYTES = 112;
export function uniforms({ viewportPx, imageRectPx, sourceOn = true, obsOn = true, actorPx = [700,1070], actorVisible = true, receipts = [], nowMs = 0 } = {}) {
  if (!Array.isArray(viewportPx) || viewportPx.length !== 2 || !viewportPx.every(Number.isFinite) || viewportPx.some((x) => x <= 0) ||
    !Array.isArray(imageRectPx) || imageRectPx.length !== 4 || !imageRectPx.every(Number.isFinite) ||
    !Number.isFinite(nowMs) || nowMs < 0) throw new TypeError('finite viewport, uniform image fit and visible monotonic object E clock required');
  const fit = imageRectPx[2] / 1164;
  if (fit <= 0 || Math.abs(imageRectPx[3] / 1351 - fit) > 1e-5) throw new TypeError('object E requires the exact uniform original-image fit');
  const byObject = new Map();
  for (const receipt of receipts) {
    const object = OBJECTS.find((item) => item.id === receipt.objectId);
    if (!object || receipt.basisHash !== BASIS_HASH || receipt.success !== true || !Number.isFinite(receipt.acceptedAtMs) ||
      !Number.isFinite(receipt.benefitDelta) || receipt.benefitDelta < 0) throw new TypeError('invalid object E receipt');
    const age = nowMs - receipt.acceptedAtMs;
    if (age < 0 || age >= receipt.lifetimeMs) continue;
    byObject.set(receipt.objectId, { age, delta: receipt.benefitDelta > 0 ? 1 : 0 });
  }
  const event = (id) => { const r = byObject.get(id); return [r?.age ?? -1, r?.delta ?? 0, 0, 0]; };
  const params = new Float32Array(PARAMETER_BYTES / 4);
  params.set([viewportPx[0], viewportPx[1], 0, 0], 0);
  params.set(imageRectPx, 4);
  params.set([Number(!!sourceOn), Number(!!obsOn), 0, 0], 8);
  params.set([actorPx[0], actorPx[1], Number(!!actorVisible), 0], 12);
  params.set(event(OBJECTS[0].id), 16);
  params.set(event(OBJECTS[1].id), 20);
  params.set(event(OBJECTS[2].id), 24);
  return params;
}

export function responseChannels({ sourceOn = true, obsOn = true, positiveBenefit = true } = {}) {
  return Object.freeze({ materialAction: !!positiveBenefit, rimCore: !!sourceOn, rimReceiver: !!sourceOn, nearGlow: !!sourceOn && !!obsOn });
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function rectSdf([x, y], [x0, y0, x1, y1], radius) {
  const hx = (x1 - x0) / 2 - radius, hy = (y1 - y0) / 2 - radius;
  const qx = Math.abs(x - (x0 + x1) / 2) - hx, qy = Math.abs(y - (y0 + y1) / 2) - hy;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}
function insidePoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function segmentDist([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
}
function outlineDistance(point, object) {
  let d = Infinity;
  for (let i = 0; i < object.rimOutlinePx.length; i++) d = Math.min(d,
    segmentDist(point, object.rimOutlinePx[i], object.rimOutlinePx[(i + 1) % object.rimOutlinePx.length]));
  return d;
}
function outlineProgress(point, object) {
  let best = Infinity, bestProgress = 0, total = 0;
  const lengths = object.rimOutlinePx.map((a, i) => Math.hypot(object.rimOutlinePx[(i + 1) % object.rimOutlinePx.length][0] - a[0], object.rimOutlinePx[(i + 1) % object.rimOutlinePx.length][1] - a[1]));
  const perimeter = lengths.reduce((a,b) => a+b, 0);
  for (let i = 0; i < lengths.length; i++) {
    const a = object.rimOutlinePx[i], b = object.rimOutlinePx[(i + 1) % lengths.length];
    const dx = b[0]-a[0], dy=b[1]-a[1], t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    const d=segmentDist(point,a,b);
    if(d<best){best=d;bestProgress=(total+t*lengths[i])/perimeter;}
    total+=lengths[i];
  }
  return bestProgress;
}
export function rimEnvelope(ageMs) {
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < RIM.durationMs
    ? smoothstep(0,105,ageMs)*(1-smoothstep(1120,1800,ageMs)) : 0;
}
export function rimSweep(ageMs, progress) {
  if (!Number.isFinite(ageMs) || ageMs < RIM.sweepStartMs || ageMs >= RIM.sweepStartMs + RIM.sweepDurationMs + 80 || !Number.isFinite(progress)) return 0;
  const t=Math.max(0,Math.min(1,(ageMs-RIM.sweepStartMs)/RIM.sweepDurationMs));
  const d=Math.abs(progress-t), circular=Math.min(d,1-d);
  return Math.exp(-((circular/RIM.sweepHalfWidth)**2))*smoothstep(RIM.sweepStartMs,RIM.sweepStartMs+30,ageMs)*(1-smoothstep(RIM.sweepStartMs+RIM.sweepDurationMs-30,RIM.sweepStartMs+RIM.sweepDurationMs+70,ageMs));
}
export function evaluateWaterAt(point, ageMs, { positiveBenefit = true, sourceOn = true, obsOn = true } = {}) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) throw new TypeError('finite image pixel required');
  const valid = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < WATER.durationMs && positiveBenefit && sourceOn;
  if (!valid) return Object.freeze({ body:0, core:0, filament:0, basinRipple:0, impactSpray:0, halo:0 });
  const [x,y]=point,[ox,oy]=WATER.outletPx,[cx,cy]=WATER.contactPx;
  const t=Math.max(0,Math.min(1,(y-oy)/(cy-oy))), center=ox+0.75*Math.sin(Math.PI*t), dx=Math.abs(x-center);
  const vertical=y>=oy-1&&y<=cy+1?1:0;
  const rise=smoothstep(0,WATER.riseMs,ageMs), taper=1-smoothstep(WATER.holdEndMs,WATER.taperEndMs,ageMs);
  const env=rise*taper*vertical;
  const body=(1-smoothstep(WATER.bodyHalfWidthPx,WATER.bodyHalfWidthPx+1.5,dx))*env;
  const core=(1-smoothstep(WATER.coreHalfWidthPx,WATER.coreHalfWidthPx+0.8,dx))*env;
  const [bx,by,rx,ry]=WATER.basinEllipsePx;
  const basinCoord=Math.hypot((x-bx)/rx,(y-by)/ry), basinMask=1-smoothstep(.92,1.04,basinCoord);
  const ba=ageMs-180, basinSeconds=Math.max(0,ba)/1000;
  const impactDistance=Math.hypot((x-cx),(y-cy)*1.6);
  const ringOne=Math.exp(-(((impactDistance-(5+18*basinSeconds))/2.1)**2));
  const ringTwo=Math.exp(-(((impactDistance-(13+14*basinSeconds))/1.8)**2));
  const basinRipple=ba>=0&&ba<1620?(ringOne*.72+ringTwo*.48)*Math.exp(-ba/650)*basinMask:0;
  const spraySegments=[[[882,232],[879,227]],[[884,233],[881,228]],[[886,233],[889,228]],[[888,232],[891,227]],[[885,234],[885,228]]];
  const sprayDistance=Math.min(...spraySegments.map(([a,b])=>segmentDist(point,a,b)));
  const impactSpray=ageMs>=150&&ageMs<610?Math.exp(-((sprayDistance/1.15)**2))*Math.exp(-(ageMs-150)/120):0;
  const halo=obsOn?Math.exp(-((dx/9)**2))*vertical*env:0;
  return Object.freeze({ body, core, filament:body*(.72+.28*Math.sin(y*.92-ageMs*.045)), basinRipple, impactSpray, halo });
}
function actionQ(object, ageMs, point) {
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= object.durationMs) return 0;
  if (object.id === STRETCHER.id) {
    const after = Math.max(0, ageMs - 220);
    return 6 * (1 - Math.exp(-ageMs / 90)) * Math.exp(-after / 430) * (0.75 + 0.25 * Math.cos(2 * Math.PI * after / 520));
  }
  if (object.id === CART.id) {
    if (ageMs < 420) return 6 * Math.sin(Math.PI * Math.min(ageMs / 420, 1)) * Math.exp(-Math.max(0, ageMs - 420) / 260);
    const after = ageMs - 420;
    return 3 * Math.exp(-after / 260) * Math.sin(2 * Math.PI * after / 360);
  }
  const a = ageMs / 1000, contact = [885, 234], d = Math.hypot(point[0] - contact[0], point[1] - contact[1]);
  const radius = 8 + 45 * a;
  return 2.6 * Math.exp(-a / 0.55) * Math.sin(2 * Math.PI * (d - 45 * a) / 18) * Math.exp(-(((d - radius) / 12) ** 2));
}

/** Contract-level scalar reference for deterministic CPU qualification and masks. */
export function evaluateObjectAt(objectId, point, ageMs, { positiveBenefit = true, sourceOn = true, obsOn = true } = {}) {
  const object = OBJECTS.find((item) => item.id === objectId);
  if (!object || !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) throw new TypeError('known object and finite source pixel required');
  const material = object.materialMask;
  const mask = 1 - smoothstep(-material.insetBoundaryFadePx, 0,
    rectSdf(point, material.rectPx, material.roundRadiusPx));
  let displacement = 0;
  if (positiveBenefit) {
    if (object.id === STRETCHER.id) {
      const [x0,y0,x1,y1] = material.rectPx, u=(point[0]-x0)/(x1-x0),v=(point[1]-y0)/(y1-y0);
      displacement = actionQ(object, ageMs, point) * Math.sin(Math.PI*u)**2 * Math.sin(Math.PI*v)**2 * mask;
    } else if (object.id === CART.id) {
      const [x0,y0,x1,y1] = material.rectPx, u=(point[0]-x0)/(x1-x0),v=(point[1]-y0)/(y1-y0);
      displacement = actionQ(object, ageMs, point) * Math.sin(Math.PI*u)**2 * v*v * mask;
    } else {
      displacement = actionQ(object, ageMs, point) * mask;
    }
  }
  const age = ageMs >= 0 && ageMs < 1800 ? ageMs : -1;
  const envelope = rimEnvelope(age);
  const distance = outlineDistance(point, object);
  const core = sourceOn ? (1-smoothstep(RIM.coreHalfWidthPx,RIM.coreHalfWidthPx+1,distance))*envelope : 0;
  const receiver = sourceOn && insidePoly(point, object.footprintPolygonPx) && distance <= 5 ? envelope : 0;
  const glowRange = 1 - smoothstep(RIM.nearGlowRadiusPx,RIM.nearGlowRadiusPx+1,Math.max(0,distance-RIM.coreHalfWidthPx));
  const nearGlow = sourceOn && obsOn ? Math.exp(-((Math.max(0,distance-RIM.coreHalfWidthPx)/RIM.nearGlowRadiusPx)**2))*glowRange*envelope : 0;
  const progress=outlineProgress(point,object);
  const sweep=sourceOn?rimSweep(age,progress):0;
  const water=object.id===SINK.id?evaluateWaterAt(point,age,{positiveBenefit,sourceOn,obsOn}):null;
  return Object.freeze({ displacement, actionActive: !!positiveBenefit && displacement !== 0,
    rimCore: core, rimReceiver: receiver, nearGlow, rimSweep:sweep, water });
}

export const dependencies = Object.freeze(['runtime/object-e.mjs', 'runtime/object-fixture.mjs']);
