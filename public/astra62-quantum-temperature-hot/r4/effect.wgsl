struct BedFrame {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> bFrame: BedFrame;

@vertex fn vs(@builtin(vertex_index) bId: u32) -> @builtin(position) vec4f {
  let bCorner = vec2f(f32((bId << 1u) & 2u), f32(bId & 2u));
  return vec4f(2.0*bCorner-vec2f(1.0), 0.0, 1.0);
}

// World axes: x across the basin, y downward, z away from the viewer.
// A point projects to (x, y-k*z). Dimensions are in design pixels.
const bK: f32 = 0.64;
const bRear: f32 = 46.0;
const bBottom: f32 = 31.0;
const bWidth: f32 = 106.0;
const bSource = vec3f(-72.0,-26.0,36.0);
const bLamp = vec3f(0.99,0.85,0.53);
const bMatte = vec3f(0.016,0.027,0.032);

fn bDisplay(bLin: vec3f) -> vec4f {
  let bV = clamp(bLin,vec3f(0.0),vec3f(1.0));
  let bHi = 1.055*pow(bV,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(bHi,12.92*bV,bV<=vec3f(0.0031308)),1.0);
}
fn bInside(bD: f32,bAa: f32) -> f32 { return smoothstep(-bAa,bAa,bD); }
fn bSq(bV: f32) -> f32 { return bV*bV; }
fn bProject(bP: vec3f) -> vec2f { return vec2f(bP.x,bP.y-bK*bP.z); }
fn bRidge(bX: f32) -> f32 {
  return -16.0-23.0*exp(-bSq((bX+73.0)/25.0))+2.0*sin(0.034*bX);
}

// A compact displacement with a crest and compensating trough. The
// second component is the analytic slope, also zero at either end.
fn bStroke(bX: f32,bCenter: f32,bRadius: f32,bHeight: f32) -> vec2f {
  let bU = (bX-bCenter)/bRadius;
  let bU2 = bU*bU;
  let bM = max(1.0-bU2,0.0);
  return bHeight*vec2f(bU*bM*bM*bM,bM*bM*(1.0-7.0*bU2)/bRadius);
}
fn bJourney(bT: f32,bMotion: f32) -> vec4f {
  let bOut = smoothstep(65.0,846.0,bT);
  let bHome = smoothstep(849.0,1640.0,bT);
  let bPush = smoothstep(65.0,261.0,bT)*(1.0-smoothstep(810.0,976.0,bT));
  let bPull = smoothstep(846.0,992.0,bT)*(1.0-smoothstep(1410.0,1660.0,bT));
  return vec4f(mix(-57.0,78.0,bOut),19.0*bMotion*bPush,
               mix(78.0,-54.0,bHome),-13.0*bMotion*bPull);
}
fn bSurface(bX: f32,bJ: vec4f) -> vec2f {
  return vec2f(-7.0,0.0)+bStroke(bX,bJ.x,28.0,bJ.y)+bStroke(bX,bJ.z,28.0,bJ.w);
}

// Slope coordinates of an incident ray are dx/dy and dz/dy. Solve in
// vertical travel units, then turn the direction at the air/water cut.
fn bLanding(bAim: vec2f,bJ: vec4f,bIor: f32) -> vec2f {
  var bFall = -7.0-bSource.y;
  for (var bIt: i32 = 0; bIt<5; bIt=bIt+1) {
    let bS = bSurface(bSource.x+bFall*bAim.x,bJ);
    let bError = bSource.y+bFall-bS.x;
    bFall = clamp(bFall-bError/max(0.14,1.0-bS.y*bAim.x),10.0,28.0);
  }
  let bAt = bSource+vec3f(bAim.x,1.0,bAim.y)*bFall;
  let bSlope = bSurface(bAt.x,bJ).y;
  let bDir = refract(normalize(vec3f(bAim.x,1.0,bAim.y)),normalize(vec3f(bSlope,-1.0,0.0)),1.0/bIor);
  let bHit = bAt+bDir*((bBottom-bAt.y)/max(bDir.y,0.12));
  return bHit.xz;
}
fn bFloorFlux(bXZ: vec2f,bJ: vec4f,bIor: f32) -> f32 {
  let bAim = vec2f(1.03,-0.43);
  let bMid = bLanding(bAim,bJ,bIor);
  let bU = vec2f(0.32,0.0);
  let bV = vec2f(0.0,0.34);
  let bAx = 0.5*(bLanding(bAim+bU,bJ,bIor)-bLanding(bAim-bU,bJ,bIor));
  let bAz = 0.5*(bLanding(bAim+bV,bJ,bIor)-bLanding(bAim-bV,bJ,bIor));
  // Covariance includes finite face width, so no singular focusing.
  let bXX = bAx.x*bAx.x+bAz.x*bAz.x+19.0;
  let bZZ = bAx.y*bAx.y+bAz.y*bAz.y+6.0;
  let bXZc = bAx.x*bAx.y+bAz.x*bAz.y;
  let bDet = max(bXX*bZZ-bXZc*bXZc,1.0);
  let bD = bXZ-bMid;
  let bR2 = max(0.0,(bZZ*bD.x*bD.x-2.0*bXZc*bD.x*bD.y+bXX*bD.y*bD.y)/bDet);
  return min(1.32,222.0*inverseSqrt(bDet))*exp(-0.90*bR2)*(1.0-smoothstep(2.5,4.8,bR2));
}

// The same vein coordinate continues over the rear arris of the floor.
fn bVeinX(bY: f32,bZ: f32) -> f32 {
  return -47.0+0.68*(bY+7.0)+0.24*(bZ-bRear)+1.4*sin(0.073*bY+0.038*(bZ-bRear));
}
fn bStone(bP: vec3f,bFloor: bool,bAa: f32) -> vec3f {
  let bL = bP.x-bVeinX(bP.y,bP.z);
  let bBand = bInside(2.5-abs(bL),bAa);
  let bSelvage = bInside(1.3-abs(bL-3.0),bAa);
  let bMatrix = select(vec3f(0.40,0.45,0.42),vec3f(0.74,0.69,0.53),bFloor);
  let bGrade = 0.93+0.055*sin(0.046*bL)+0.025*cos(0.17*bL);
  return mix(bMatrix*bGrade*(1.0+0.14*bSelvage),vec3f(0.135,0.159,0.147),bBand);
}
fn bDryLobe(bP: vec3f,bOffset: f32) -> f32 {
  let bD = bP-(bSource+vec3f(bOffset,-0.19*bOffset,0.0));
  let bD2 = max(dot(bD,bD),1.0);
  let bUnit = bD*inverseSqrt(bD2);
  let bCone = smoothstep(0.54,0.95,dot(bUnit,vec3f(0.68,0.09,0.727)));
  return bCone*max(bUnit.z,0.0)*230.0/(110.0+bD2);
}
fn bShale(bP: vec3f,bAa: f32,bPower: f32) -> vec3f {
  let bLocal = 0.30*bDryLobe(bP,-5.0)+0.40*bDryLobe(bP,0.0)+0.30*bDryLobe(bP,5.0);
  let bDry = 1.0-smoothstep(-14.0,-10.0,bP.y);
  let bKey = 0.244+0.058*exp(-bSq((bP.y-bRidge(bP.x)-1.0)/3.2));
  return bStone(bP,false,bAa)*(vec3f(bKey)+1.55*bLamp*(bLocal*bDry*bPower));
}
fn bFracture(bUnder: vec3f,bPx: vec2f,bAa: f32,bPower: f32) -> vec3f {
  let bD = bPx-bProject(bSource);
  let bH = bD.y+0.19*bD.x;
  let bTaper = max(0.0,1.0-bSq(bD.x/9.7));
  let bCut = min(9.7-abs(bD.x),3.5*bTaper-abs(bH));
  let bTilt = smoothstep(-2.1,1.1,bH);
  let bRadiance = mix(0.82*bLamp,vec3f(0.998,0.96,0.79),bTilt)*bPower;
  return mix(bUnder,vec3f(0.013,0.012,0.009)+bRadiance,bInside(bCut,bAa));
}

// From either entry face, shade only the first solid the sightline hits.
fn bSight(bStart: vec3f,bDir: vec3f,bAa: f32,bJ: vec4f,bIor: f32,bPower: f32) -> vec3f {
  let bBedT = max(0.0,(bBottom-bStart.y)/max(0.001,bDir.y));
  let bWallT = max(0.0,(bRear-bStart.z)/max(0.001,bDir.z));
  let bSideX = select(-bWidth,bWidth,bDir.x>=0.0);
  let bSideT = abs(bSideX-bStart.x)/max(0.00001,abs(bDir.x));
  let bTravel = min(bSideT,min(bBedT,bWallT));
  let bHit = bStart+bTravel*bDir;
  var bSolid: vec3f;
  if (bSideT<min(bBedT,bWallT)) {
    bSolid = vec3f(0.070,0.088,0.083);
  } else if (bBedT<=bWallT) {
    let bFlux = bFloorFlux(bHit.xz,bJ,bIor)*bPower;
    let bArris = smoothstep(0.0,3.4,bRear-bHit.z);
    let bKey = 0.169+0.059*bArris;
    bSolid = bStone(bHit,true,bAa)*(vec3f(bKey)+bLamp*vec3f(0.91,0.98,0.99)*bFlux);
  } else {
    bSolid = bShale(bHit,bAa,bPower);
  }
  let bTr = exp(-vec3f(0.0105,0.0048,0.0041)*bTravel);
  // Ambient water return only. There is no emitter-colored view fog.
  return bSolid*bTr+vec3f(0.034,0.128,0.139)*(vec3f(1.0)-bTr);
}
fn bWetView(bPx: vec2f,bS: vec2f,bTopFace: bool,bAa: f32,bJ: vec4f,bIor: f32,bPower: f32) -> vec3f {
  let bAir = normalize(vec3f(0.0,bK,1.0));
  let bN = select(vec3f(0.0,0.0,-1.0),normalize(vec3f(bS.y,-1.0,0.0)),bTopFace);
  let bEntry = select(vec3f(bPx.x,clamp(bPx.y,bS.x,bBottom),0.0),vec3f(bPx.x,bS.x,clamp((bS.x-bPx.y)/bK,0.0,bRear)),bTopFace);
  let bDir = refract(bAir,bN,1.0/bIor);
  let bThrough = bSight(bEntry,bDir,bAa,bJ,bIor,bPower);
  let bF0 = bSq((bIor-1.0)/(bIor+1.0));
  let bF = bF0+(1.0-bF0)*pow(clamp(1.0+dot(bAir,bN),0.0,1.0),5.0);
  let bSky = select(vec3f(0.14,0.24,0.24),vec3f(0.56,0.74,0.72)*(0.88+0.12*bS.y),bTopFace);
  return mix(bThrough,bSky,bF);
}

@fragment fn fs(@builtin(position) bPixel: vec4f) -> @location(0) vec4f {
  let bOk = all(bFrame.size>=vec2f(1.0)) && all(bFrame.size<=vec2f(32768.0)) && bFrame.scale>=0.000030517578125 && bFrame.scale<=256.0 && bFrame.reduced>=0.0 && bFrame.reduced<=1.0 && bFrame.live==1.0 && bFrame.ageMs>=0.0 && bFrame.ageMs<3080.0;
  if (!bOk) { return bDisplay(bMatte); }
  let bFit = min(bFrame.scale,min(bFrame.size.x/292.0,bFrame.size.y/135.0));
  let bPx = (bPixel.xy-0.5*bFrame.size)/bFit-vec2f(0.0,9.0);
  if (abs(bPx.x)>119.0 || bPx.y< -72.0 || bPx.y>47.0) { return bDisplay(bMatte); }
  let bAa = clamp(0.62/bFit,0.035,4.0);
  let bT = bFrame.ageMs;
  let bJ = bJourney(bT,mix(1.0,0.28,bFrame.reduced));
  let bIor = mix(1.33,1.19,smoothstep(180.0,1570.0,bT));
  let bPower = smoothstep(24.0,132.0,bT);
  let bX = bPx.x;
  let bY = bPx.y;
  let bS = bSurface(bX,bJ);
  let bAcross = bInside(bWidth-abs(bX),bAa);
  let bBackY = bY+bK*bRear;
  let bBackD = min(bBackY-bRidge(bX),bBottom-bBackY);
  var bView = mix(bMatte,bShale(vec3f(bX,bBackY,bRear),bAa,bPower),bAcross*bInside(bBackD,bAa));

  let bSurfaceAa = bAa*(1.0+abs(bS.y));
  let bWet = bAcross*bInside(bBackY-bS.x,bSurfaceAa)*bInside(bBottom-bY,bAa);
  if (bWet>0.0) {
    let bFront = bInside(bY-bS.x,bSurfaceAa);
    var bSection = vec3f(0.0);
    if (bFront<1.0) { bSection = (1.0-bFront)*bWetView(bPx,bS,true,bAa,bJ,bIor,bPower); }
    if (bFront>0.0) { bSection += bFront*bWetView(bPx,bS,false,bAa,bJ,bIor,bPower); }
    // Narrow meniscus against the front cut, reflecting the scene key.
    let bEdge = 1.0-smoothstep(0.35,1.35+bSurfaceAa,abs(bY-bS.x));
    bSection = mix(bSection,vec3f(0.41,0.58,0.55),0.65*bEdge);
    bView = mix(bView,bSection,bWet);
  }
  let bCapD = min(min(abs(bX)-bWidth,bWidth+3.8-abs(bX)),min(bBackY-bRidge(bX),bBottom+4.6-bY));
  let bCap = mix(vec3f(0.070,0.081,0.076),vec3f(0.161,0.181,0.161),smoothstep(bWidth+3.4,bWidth+3.8,abs(bX)));
  bView = mix(bView,bCap,bInside(bCapD,bAa));
  let bBaseD = min(bWidth+3.8-abs(bX),min(bY-bBottom,bBottom+5.0-bY));
  let bBase = mix(vec3f(0.091,0.103,0.091),vec3f(0.235,0.242,0.195),1.0-smoothstep(0.1,2.0,bY-bBottom));
  bView = mix(bView,bBase,bInside(bBaseD,bAa));
  bView = bFracture(bView,bPx,bAa,bPower);
  let bOpen = smoothstep(0.0,132.0,bT)*(1.0-smoothstep(2670.0,3080.0,bT));
  return bDisplay(mix(bMatte,bView,bOpen));
}