struct ScarfFrame {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> qFrame: ScarfFrame;

@vertex fn vs(@builtin(vertex_index) qIndex: u32) -> @builtin(position) vec4f {
  let qCorner = vec2f(f32((qIndex << 1u) & 2u), f32(qIndex & 2u));
  return vec4f(2.0*qCorner-vec2f(1.0),0.0,1.0);
}

fn qMatte() -> vec3f { return vec3f(0.016,0.027,0.032); }
fn qDisplay(qLin: vec3f) -> vec4f {
  let qV = clamp(qLin,vec3f(0.0),vec3f(1.0));
  let qHi = 1.055*pow(qV,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(qHi,12.92*qV,qV<=vec3f(0.0031308)),1.0);
}
fn qIn(qDist: f32,qAa: f32) -> f32 { return smoothstep(-qAa,qAa,qDist); }
fn qBell(qZ: f32) -> f32 { return exp(-qZ*qZ); }
fn qBed(qX: f32) -> f32 {
  let qL = clamp((-73.0-qX)/32.0,0.0,1.0);
  let qR = clamp((qX-31.0)/75.0,0.0,1.0);
  return 1.0-max(qL*qL,qR*qR*(2.0-qR));
}
fn qFloor(qX: f32) -> f32 { return -22.0+49.0*qBed(qX); }
fn qFoot(qX: f32) -> f32 {
  return smoothstep(-84.0,-73.0,qX)*(1.0-smoothstep(-34.0,-16.0,qX));
}
fn qSurface(qX: f32,qT: f32,qMotion: f32) -> f32 {
  let qB = qBed(qX);
  let qLeadX = mix(-55.0,86.0,smoothstep(0.055,0.838,qT));
  let qBackX = mix(87.0,-38.0,smoothstep(0.885,1.605,qT));
  let qLead = -8.2*qBell((qX-qLeadX)/17.0)+5.7*qBell((qX-qLeadX+23.0)/24.0);
  let qBack = -4.6*qBell((qX-qBackX)/21.0)+3.1*qBell((qX-qBackX-29.0)/27.0);
  let qPush = smoothstep(0.045,0.375,qT)*(1.0-smoothstep(0.824,1.023,qT));
  let qPull = smoothstep(0.876,1.078,qT)*(1.0-smoothstep(1.205,1.64,qT));
  return -22.0+0.65*qB+qMotion*smoothstep(0.0,0.50,qB)*(qPush*qLead+qPull*qBack);
}

// Drawing axes: +y down, +z away from the viewer. The luminous scarf is at z=0.
const qOrigin = vec2f(-53.0,27.2);
const qAlong = vec2f(0.9701425,0.2425356);
const qAcross = vec2f(-0.2425356,0.9701425);
const qSpectrum = vec3f(0.80,0.69,0.99);
const qRibZ: f32 = 14.0;
const qCheekZ: f32 = 22.0;
fn qElement(qU: f32) -> vec2f { return qOrigin+qAlong*qU; }
fn qPower(qT: f32) -> f32 {
  return smoothstep(0.032,0.132,qT)*(1.0-0.10*smoothstep(0.906,1.640,qT));
}
fn qRibV(qP: vec2f) -> f32 { return qP.y-(2.7-0.032*qP.x); }
fn qRibDist(qP: vec2f) -> f32 {
  let qV = qRibV(qP);
  let qEnds = min(qP.x+129.0,128.0-qP.x)-0.58*abs(qV-4.9);
  return min(qEnds,min(qV,9.8-qV));
}
fn qExit(qD: vec3f) -> f32 {
  let qAim = dot(qD,vec3f(0.58,-0.42,0.6977));
  return smoothstep(0.32,0.92,qAim)*smoothstep(0.16,0.46,qD.z);
}
// Two depths, not two copies of a screen glow. x is irradiance on the back
// tile; y is irradiance on the nearer, tipped cut of the opaque rib.
fn qRearElement(qP: vec2f,qU: f32) -> vec2f {
  let qS = qElement(qU);
  let qDelta = qP-qS;
  let qToTile = vec3f(qDelta,qCheekZ);
  let qToRib = vec3f(qDelta,qRibZ);
  let qT2 = dot(qToTile,qToTile);
  let qR2 = dot(qToRib,qToRib);
  let qDt = qToTile*inverseSqrt(qT2);
  let qDr = qToRib*inverseSqrt(qR2);
  let qCrossing = qS+qDelta*(qRibZ/qCheekZ);
  let qClear = 1.0-smoothstep(-1.0,1.0,qRibDist(qCrossing));
  let qTile = qClear*qExit(qDt)*qDt.z*800.0/(800.0+qT2);
  let qCut = qExit(qDr)*max(dot(qDr,vec3f(0.0,-0.78,0.626)),0.0)*640.0/(640.0+qR2);
  return vec2f(qTile,qCut);
}
fn qBacking(qP: vec2f,qAa: f32,qWash: f32,qDrive: f32) -> vec3f {
  let qFlux = (0.30*qRearElement(qP,-7.4)+0.40*qRearElement(qP,0.0)+0.30*qRearElement(qP,7.4))*(2.55*qDrive);
  let qWaterPath = qSpectrum*vec3f(0.91,0.98,0.99);
  // Clipped shoulders on the cheek. Its foot disappears into the bed.
  let qH = qP.y-(-12.0+0.035*(qP.x+45.0));
  let qSide = min(qP.x+88.0,46.0-qP.x)-max(0.0,6.0-qH)*0.85;
  let qCheek = qIn(min(min(qH,qSide),qFloor(qP.x)-qP.y),qAa);
  let qFront = smoothstep(0.7,3.0,min(qSide,qH));
  let qClay = vec3f(0.72,0.69,0.65);
  let qTileKey = (0.116+0.030*qFront)*qWash;
  let qTile = qClay*(vec3f(qTileKey)+qWaterPath*(qFront*qFlux.x));
  let qWall = mix(qMatte()*qWash,qTile,qCheek);
  let qV = qRibV(qP);
  let qUpper = vec3f(0.475,0.359,0.223);
  let qFlank = vec3f(0.179,0.130,0.092);
  let qLowCut = smoothstep(5.4,7.8,qV);
  let qCuts = mix(qUpper,qFlank,smoothstep(3.0-qAa,3.7+qAa,qV))+qLowCut*vec3f(0.063,0.045,0.030);
  let qKey = clamp(0.87-0.00135*qP.x,0.63,1.05);
  let qRib = qCuts*(qKey*qWash)+vec3f(0.72,0.52,0.34)*qWaterPath*(qLowCut*qFlux.y);
  return mix(qWall,qRib,qIn(qRibDist(qP),qAa));
}

// The return sits forward of the cut. Only the tilted landing sees it;
// the shoulder between the landing and the scarf stays in its own shade.
fn qReturnElement(qP: vec2f,qU: f32) -> f32 {
  let qD = qP-qElement(qU);
  let qD2 = dot(qD,qD)+36.0;
  let qFacing = max(0.0,(0.80*qD.y+3.60)*inverseSqrt(qD2));
  return qFacing*370.0/(370.0+qD2);
}
fn qClipped(qUv: vec2f,qHalf: vec2f,qClip: f32) -> f32 {
  let qRem = qHalf-abs(qUv);
  return min(min(qRem.x,qRem.y),(qRem.x+qRem.y-qClip)*0.7071068);
}
fn qWindow(qUnder: vec3f,qP: vec2f,qAa: f32,qDrive: f32) -> vec3f {
  let qD = qP-qOrigin;
  let qUv = vec2f(dot(qD,qAlong),dot(qD,qAcross));
  let qCollar = qIn(qClipped(qUv,vec2f(13.2,4.8),2.8),qAa);
  let qDist = qClipped(qUv,vec2f(10.6,2.85),2.1);
  let qFace = qIn(qDist,qAa);
  let qPolish = smoothstep(-1.9,0.8,qUv.y)*smoothstep(-0.25,1.25,qDist);
  let qEmit = mix(qSpectrum,vec3f(0.984,0.964,0.986),qPolish)*qDrive;
  let qSeat = mix(qUnder,vec3f(0.034,0.032,0.042),qCollar);
  return mix(qSeat,vec3f(0.009,0.010,0.010)+qEmit,qFace);
}

@fragment fn fs(@builtin(position) qPixel: vec4f) -> @location(0) vec4f {
  let qOk = all(qFrame.size>=vec2f(1.0)) && all(qFrame.size<=vec2f(32768.0)) && qFrame.scale>=0.000030517578125 && qFrame.scale<=256.0 && qFrame.reduced>=0.0 && qFrame.reduced<=1.0 && qFrame.live==1.0 && qFrame.ageMs>=0.0 && qFrame.ageMs<3080.0;
  if (!qOk) { return qDisplay(qMatte()); }
  let qFit = min(qFrame.scale,min(qFrame.size.x/292.0,qFrame.size.y/135.0));
  let qP = (qPixel.xy-0.5*qFrame.size)/qFit;
  if (any(abs(qP)>vec2f(139.0,54.0))) { return qDisplay(qMatte()); }
  let qX = qP.x;
  let qY = qP.y;
  let qAa = clamp(0.61/qFit,0.035,4.0);
  let qT = qFrame.ageMs*0.001;
  let qMotion = mix(1.0,0.34,qFrame.reduced);
  let qDrive = qPower(qT);
  let qB = qBed(qX);
  let qBase = qFloor(qX);
  let qGrade = (qFloor(qX+0.65)-qFloor(qX-0.65))/1.30;
  let qFloorAa = qAa*(1.0+abs(qGrade));
  let qTop = qSurface(qX,qT,qMotion);
  let qTilt = (qSurface(qX+0.65,qT,qMotion)-qSurface(qX-0.65,qT,qMotion))/1.30;
  let qTopAa = qAa*(1.0+abs(qTilt));
  let qLip = qTop+7.4*qB;
  let qSide = qIn(min(qX+105.0,106.0-qX),qAa);
  let qWet = qSide*qIn(qY-qTop,qTopAa)*qIn(qBase-qY,qFloorAa);
  let qHeight = clamp((qBase-qY)/max(1.0,qBase-qLip),0.0,1.0);
  let qDepth = 1.0-qHeight;
  let qAxis = qOrigin.x+23.0*qHeight;
  let qOff = (qX-qAxis)/(20.0+18.0*qHeight);
  let qArrival = 0.14+0.72*qHeight+0.08*min(abs(qOff),1.25);
  let qSet = smoothstep(qArrival,qArrival+0.65,qT);
  let qPath = smoothstep(0.0,0.63,qB)*smoothstep(0.0,0.23,qHeight)*smoothstep(0.0,0.19,qDepth);
  let qLens = 7.3*qSet*qBell(qOff)*qPath;
  let qRay = qP+vec2f(1.7*qPath,-1.15*qPath-qLens);
  let qKey = clamp(0.80-0.0020*qX,0.49,1.0);
  let qFrom = qX-(3.5+8.0*qDepth);
  let qLightTilt = (qSurface(qFrom+1.25,qT,qMotion)-qSurface(qFrom-1.25,qT,qMotion))/2.5;
  let qWash = clamp(1.0+0.71*qLightTilt*(1.0-0.66*qDepth),0.76,1.26);
  var qView = qMatte();
  if (qWet<1.0) { qView = qBacking(qP,qAa,1.0,qDrive); }
  if (qWet>0.0) {
    let qThrough = qBacking(qRay,qAa,qWash,qDrive);
    let qTrans = mix(vec3f(0.53,0.78,0.77),vec3f(0.37,0.64,0.70),qDepth);
    let qBody = mix(vec3f(0.029,0.132,0.143),vec3f(0.019,0.076,0.093),qDepth)*(0.84+0.16*qKey);
    let qFace = qThrough*qTrans+qBody*qWash;
    let qCatch = clamp(0.11+0.62*qKey+1.38*qTilt,0.05,1.0);
    let qStrip = clamp((qY-qTop)/max(0.85,qLip-qTop),0.0,1.0);
    let qSky = mix(vec3f(0.065,0.200,0.209),vec3f(0.355,0.545,0.498),qCatch*(1.0-0.34*qStrip));
    var qWater = mix(qSky,qFace,qIn(qY-qLip,qTopAa));
    let qRim = (1.0-smoothstep(0.32,1.0+qTopAa,abs(qY-qLip)))*smoothstep(0.0,0.21,qB);
    qWater = mix(qWater,vec3f(0.56,0.72,0.651),qRim*(0.28+0.61*qCatch));
    qView = mix(qView,qWater,qWet);
  }
  let qBelow = qY-qBase;
  let qShoe = qFoot(qX);
  let qSole = qSide*qIn(qBelow+0.25,qFloorAa)*qIn(2.0+12.4*qShoe-qBelow,qFloorAa);
  let qBevel = (1.0-smoothstep(0.15,2.7,qBelow))*clamp(0.66+0.17*qGrade+0.19*qKey,0.25,1.0);
  let qGlass = mix(vec3f(0.049,0.086,0.094),vec3f(0.237,0.326,0.306),qBevel);
  let qLand = smoothstep(5.6,8.0,qBelow)*(1.0-0.60*smoothstep(12.4,14.4,qBelow));
  let qCopperBase = mix(vec3f(0.120,0.062,0.041),vec3f(0.412,0.233,0.129),qBevel)+qLand*vec3f(0.066,0.035,0.014);
  let qPool = 0.30*qReturnElement(qP,-7.4)+0.40*qReturnElement(qP,0.0)+0.30*qReturnElement(qP,7.4);
  let qCopper = qCopperBase+vec3f(0.79,0.52,0.29)*qSpectrum*(1.45*qPool*qLand*qDrive);
  qView = mix(qView,mix(qGlass,qCopper,qShoe),qSole);
  qView = qWindow(qView,qP,qAa,qDrive);
  let qOpen = smoothstep(0.0,132.0,qFrame.ageMs)*(1.0-smoothstep(2670.0,3080.0,qFrame.ageMs));
  return qDisplay(mix(qMatte(),qView,qOpen));
}