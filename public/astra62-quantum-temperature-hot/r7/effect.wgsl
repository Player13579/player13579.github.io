// Quantum Hot Water — creative edition R7
// Based on the exact public R6 standalone shader.
// Standalone optical preview; no gameplay connection.
// R7: source-led thermal spread, broad internal circulation,
// warm water-volume response, and coordinated wet-surface color.

struct CutFrame {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> cFrame: CutFrame;

@vertex fn vs(@builtin(vertex_index) cId: u32) -> @builtin(position) vec4f {
  let cUv = vec2f(f32((cId << 1u) & 2u), f32(cId & 2u));
  return vec4f(2.0*cUv-vec2f(1.0), 0.0, 1.0);
}

// Original design coordinates and projection.
const cLift: f32 = 0.64;
const cRear: f32 = 48.0;
const cHalf: f32 = 106.0;
const cBankX: f32 = -64.0;
const cLipX: f32 = -22.0;
const cShelfY: f32 = 13.0;
const cBedY: f32 = 43.0;
const cLevel: f32 = -4.0;
const cFace = vec2f(-69.0,-29.0);
const cGold = vec3f(1.0,0.695,0.323);
const cMatte = vec3f(0.015,0.024,0.029);

// Shared scattering loss for the submerged fan and receivers.
const cScatter: f32 = 0.004;

fn cDisplay(cLinear: vec3f) -> vec4f {
  let cV = clamp(cLinear,vec3f(0.0),vec3f(1.0));
  let cUpper = 1.055*pow(cV,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(cUpper,12.92*cV,cV<=vec3f(0.0031308)),1.0);
}
fn cCover(cDist: f32,cAa: f32) -> f32 {
  return smoothstep(-cAa,cAa,cDist);
}
fn cSq(cV: f32) -> f32 {
  return cV*cV;
}
fn cRoof(cX: f32) -> f32 {
  return cFace.y+1.7*clamp(cX-cFace.x,-5.0,5.0);
}
fn cCrown(cX: f32) -> f32 {
  return -19.5+2.7*sin(0.030*cX+0.6);
}
fn cSpan(cZ: f32) -> f32 {
  return smoothstep(6.0,10.0,cZ)*(1.0-smoothstep(38.0,42.0,cZ));
}

// Original finite outward hump, turn, returning depression, and settling.
fn cJourney(cT: f32,cMotion: f32) -> vec2f {
  let cGo = smoothstep(52.0,853.0,cT);
  let cBack = smoothstep(865.0,1640.0,cT);
  let cTurn = smoothstep(820.0,990.0,cT);
  let cH = mix(-6.6*smoothstep(38.0,245.0,cT),4.7,cTurn)
    *(1.0-smoothstep(1500.0,1650.0,cT));
  return vec2f(mix(mix(-62.0,68.0,cGo),-55.0,cBack),cH*cMotion);
}
fn cSurface(cX: f32,cJ: vec2f) -> vec2f {
  let cU = (cX-cJ.x)/34.0;
  let cM = max(0.0,1.0-cU*cU);
  return vec2f(
    cLevel+cJ.y*cM*cM*cM,
    (-6.0/34.0)*cJ.y*cU*cM*cM
  );
}

// xy: surface entry; zw: refracted direction.
// Original bounded intersection and Snell refraction.
fn cRay(cAim: f32,cJ: vec2f,cIndex: f32) -> vec4f {
  var cLo = cLevel-cFace.y-7.0;
  var cHi = cLevel-cFace.y+7.0;
  for (var cIt: i32=0; cIt<8; cIt=cIt+1) {
    let cD = 0.5*(cLo+cHi);
    let cAt = cFace+vec2f(cAim,1.0)*cD;
    if (cAt.y<cSurface(cAt.x,cJ).x) {
      cLo=cD;
    } else {
      cHi=cD;
    }
  }
  let cEntry = cFace+vec2f(cAim,1.0)*(0.5*(cLo+cHi));
  let cN = normalize(vec2f(cSurface(cEntry.x,cJ).y,-1.0));
  let cDir = refract(normalize(vec2f(cAim,1.0)),cN,1.0/cIndex);
  return vec4f(cEntry,cDir);
}
fn cLandings(cR: vec4f) -> vec2f {
  return vec2f(cR.x)
    +(vec2f(cShelfY,cBedY)-vec2f(cR.y))
    *(cR.z/max(cR.w,0.08));
}
fn cIntercepts(cAim: f32,cJ: vec2f,cIndex: f32) -> vec2f {
  return cLandings(cRay(cAim,cJ,cIndex));
}
fn cTransmission(cR: vec4f,cY: f32) -> f32 {
  let cDistance = max(0.0,(cY-cR.y)/max(cR.w,0.08));
  return exp(-cScatter*cDistance);
}

// Finite deposits integrate neighboring marginal rays.
// No independent animated receiver mask.
fn cDeposit(
  cX: f32,cA: f32,cB: f32,cAmount: f32,cSoft: f32
) -> f32 {
  let cMid = 0.5*(cA+cB);
  let cW = max(abs(cB-cA),0.8);
  let cL = cX-(cMid-0.5*cW);
  let cR = cX-(cMid+0.5*cW);
  return (cAmount/cW)*(cCover(cL,cSoft)-cCover(cR,cSoft));
}
fn cFlux(
  cP: vec3f,cLowBed: bool,cJ: vec2f,cIndex: f32,cAa: f32
) -> f32 {
  let cDepthMask = cSpan(cP.z);
  if (cDepthMask<=0.0 || cP.x< -62.0 || cP.x>75.0) {
    return 0.0;
  }

  let cDa = (2.38-0.76)/12.0;
  var cRayA = cRay(0.76,cJ,cIndex);
  var cA = cLandings(cRayA);
  var cSum = 0.0;

  for (var cCell: i32=0; cCell<12; cCell=cCell+1) {
    let cRayB = cRay(0.76+f32(cCell+1)*cDa,cJ,cIndex);
    let cB = cLandings(cRayB);
    let cU = (f32(cCell)+0.5)/12.0;
    let cShare = cDa*(0.90+0.10*(1.0-cSq(2.0*cU-1.0)));

    if (!cLowBed) {
      let cTr = 0.5*(
        cTransmission(cRayA,cShelfY)+cTransmission(cRayB,cShelfY)
      );
      cSum += cDeposit(
        cP.x,cA.x,cB.x,38.0*cShare*cTr,1.5+cAa
      );
    } else {
      let cThroughA = cA.x>cLipX;
      let cThroughB = cB.x>cLipX;
      if (cThroughA || cThroughB) {
        var cStart = 0.0;
        var cStop = 1.0;
        if (cThroughA!=cThroughB) {
          let cSplit = clamp((cLipX-cA.x)/(cB.x-cA.x),0.0,1.0);
          if (cThroughA) {
            cStop=cSplit;
          } else {
            cStart=cSplit;
          }
        }
        let cTrA = cTransmission(cRayA,cBedY);
        let cTrB = cTransmission(cRayB,cBedY);
        let cTr = mix(cTrA,cTrB,0.5*(cStart+cStop));
        cSum += cDeposit(
          cP.x,
          mix(cA.y,cB.y,cStart),
          mix(cA.y,cB.y,cStop),
          38.0*cShare*(cStop-cStart)*cTr,
          2.0+cAa
        );
      }
    }
    cRayA=cRayB;
    cA=cB;
  }
  return cDepthMask*min(1.24,max(0.0,cSum));
}

// Low-order single scattering inside the same finite ray fan.
// The fixed shelf lip blocks its lower part.
fn cBeam(
  cP: vec3f,cJ: vec2f,cIndex: f32,cAa: f32
) -> f32 {
  let cDepth = cSpan(cP.z);
  if (cDepth<=0.0 || cP.y<cSurface(cP.x,cJ).x || cP.y>cBedY) {
    return 0.0;
  }

  let cA = cRay(0.76,cJ,cIndex);
  let cB = cRay(2.38,cJ,cIndex);
  let cSlopeA = cA.z/max(cA.w,0.08);
  let cSlopeB = cB.z/max(cB.w,0.08);
  var cMinX = cA.x+(cP.y-cA.y)*cSlopeA;
  let cMaxX = cB.x+(cP.y-cB.y)*cSlopeB;

  if (cP.y>cShelfY) {
    let cShelfA = cA.x+(cShelfY-cA.y)*cSlopeA;
    let cShelfB = cB.x+(cShelfY-cB.y)*cSlopeB;
    if (max(cShelfA,cShelfB)<=cLipX) {
      return 0.0;
    }
    if (cShelfA<cLipX && cShelfB>cLipX) {
      let cSplit = clamp(
        (cLipX-cShelfA)/max(cShelfB-cShelfA,0.001),0.0,1.0
      );
      cMinX=mix(cMinX,cMaxX,cSplit);
    }
  }

  let cWidth = max(cMaxX-cMinX,1.0);
  let cInside = cCover(cP.x-cMinX,1.5+cAa)
    *cCover(cMaxX-cP.x,1.5+cAa);
  let cMidRay = 0.5*(cA+cB);
  let cTr = cTransmission(cMidRay,cP.y);
  let cDensity = min(1.24,38.0*(2.38-0.76)*0.96/cWidth);
  return cDepth*cInside*cDensity*cTr;
}

// Continuous sandstone bedding, shared by wet and dry material.
fn cStone(cP: vec3f,cAa: f32) -> vec3f {
  let cSeamX = 10.0+0.61*(cP.y-cBedY)
    +0.26*(cRear-cP.z)
    +1.1*sin(0.078*cP.y+0.045*cP.z);
  let cD = cP.x-cSeamX;
  let cSeam = cCover(2.45-abs(cD),cAa);
  let cSelvage = cCover(1.35-abs(cD-3.4),cAa);
  let cBedding = 0.045*cos(0.065*cD)
    +0.035*sin(0.19*cP.y+0.085*cP.z+0.025*cP.x);
  let cMatrix = vec3f(0.72,0.595,0.425)
    *(0.95+cBedding+0.13*cSelvage);
  return mix(cMatrix,vec3f(0.115,0.139,0.132),cSeam);
}
fn cWall(cP: vec3f,cAa: f32) -> vec3f {
  let cRim = 1.0-smoothstep(0.2,3.5,cP.y-cCrown(cP.x));
  return cStone(cP,cAa)*vec3f(0.245,0.260,0.270)
    *(1.0+0.24*cRim);
}

// Shared water-temperature and circulation field.
// x: accumulated warmth; y: a broad folded current ribbon.
// The origin is an existing ray's water contact, not a new emitter.
// Progress and advection use only the established settling and journey.
// There is no additional clock, lifetime phase, noise, or particle layer.
fn cThermal(
  cP: vec3f,cJ: vec2f,cSet: f32,cPower: f32
) -> vec2f {
  let cContact = cRay(1.25,cJ,1.355).xy;
  let cSurfaceY = cSurface(cP.x,cJ).x;
  let cDepth = max(0.0,cP.y-cSurfaceY);
  let cLocalBed = mix(
    cShelfY,cBedY,smoothstep(cLipX-2.0,cLipX+8.0,cP.x)
  );
  let cDepthUnit = clamp(
    cDepth/max(8.0,cLocalBed-cSurfaceY),0.0,1.0
  );

  // A broad front travels rightward and downward from source contact.
  // The shallow shelf responds before the deeper lower bed.
  let cTravel = max(0.0,cP.x-cContact.x)
    +0.74*cDepth
    +0.10*abs(cP.z-24.0)
    +0.55*max(0.0,cContact.x-cP.x);
  let cReach = mix(0.0,194.0,cSet);
  let cArrival = 1.0-smoothstep(cReach-19.0,cReach+23.0,cTravel);
  let cHeat = cPower*(0.16+0.84*cSet)*cArrival;

  let cMotion = mix(1.0,0.24,cFrame.reduced);
  let cPhase = cMotion*(4.8*cSet+0.009*(cJ.x+62.0));
  let cBend = sin(
    0.052*(cP.x-cContact.x)-cPhase+0.018*(cP.z-24.0)
  );
  let cFold = 6.2831853*cDepthUnit
    +1.55*cBend
    +0.020*(cP.x-cContact.x)
    -0.65*cPhase;
  let cRibbon = smoothstep(0.20,0.90,0.5+0.5*cos(cFold));
  return vec2f(cHeat,cRibbon);
}

fn cReceiver(
  cP: vec3f,cLowBed: bool,cJ: vec2f,cIndex: f32,
  cPower: f32,cAa: f32
) -> vec3f {
  let cFall = cFlux(cP,cLowBed,cJ,cIndex,cAa)*cPower;
  let cKey = select(0.270,0.225,cLowBed);
  let cRock = cStone(cP,cAa)
    *select(vec3f(0.92,0.96,0.94),vec3f(1.0),cLowBed);
  let cSet = smoothstep(154.0,1600.0,cFrame.ageMs);
  let cHeat = cThermal(cP,cJ,cSet,cPower).x;

  // Deposits retain the original ray integration and mineral contrast.
  // Only their optical color follows the shared water-temperature field.
  let cLight = mix(
    vec3f(1.0,0.80,0.49),
    vec3f(1.0,0.61,0.25),
    0.65*cHeat
  );
  let cWetKey = vec3f(cKey)*mix(
    vec3f(1.0),vec3f(1.13,1.015,0.87),cHeat
  );
  return cRock*(cWetKey+cLight*cFall*0.94);
}

// Independent observer/solid intersections.
// 0 rear bedding, 1 lower bed, 2 shelf tread, 3 riser, 4 side.
fn cSight(
  cStart: vec3f,cDir: vec3f,cJ: vec2f,cIndex: f32,
  cSet: f32,cPower: f32,cAa: f32
) -> vec3f {
  let cDy = max(0.001,cDir.y);
  var cRun = max(0.0,(cRear-cStart.z)/max(0.001,cDir.z));
  var cKind = 0;

  let cFloorT = (cBedY-cStart.y)/cDy;
  if (cFloorT>=0.0 && cFloorT<cRun) {
    cRun=cFloorT;
    cKind=1;
  }
  let cShelfT = (cShelfY-cStart.y)/cDy;
  if (
    cShelfT>=0.0 && cShelfT<=cRun
    && cStart.x+cShelfT*cDir.x<=cLipX
  ) {
    cRun=cShelfT;
    cKind=2;
  }
  if (cDir.x< -0.0001 && cStart.x>=cLipX) {
    let cRiserT = (cLipX-cStart.x)/cDir.x;
    if (cRiserT<cRun && cStart.y+cRiserT*cDir.y>=cShelfY) {
      cRun=cRiserT;
      cKind=3;
    }
  }
  if (abs(cDir.x)>0.0001) {
    let cSideT = (
      select(cBankX,cHalf,cDir.x>0.0)-cStart.x
    )/cDir.x;
    if (cSideT>=0.0 && cSideT<cRun) {
      cRun=cSideT;
      cKind=4;
    }
  }

  let cHit = cStart+cRun*cDir;
  var cSolid = vec3f(0.0);
  if (cKind==1 || cKind==2) {
    cSolid=cReceiver(cHit,cKind==1,cJ,cIndex,cPower,cAa);
  } else if (cKind==0) {
    cSolid=cWall(cHit,cAa);
  } else {
    cSolid=cStone(cHit,cAa)*select(0.155,0.115,cKind==4);
  }

  // Two bounded samples keep the broad folds volumetric rather than
  // drawing a flat pattern over the chamber or its receiving surfaces.
  let cNear = cThermal(
    cStart+0.24*cRun*cDir,cJ,cSet,cPower
  );
  let cFar = cThermal(
    cStart+0.72*cRun*cDir,cJ,cSet,cPower
  );
  let cHeat = 0.52*cNear.x+0.48*cFar.x;
  let cCurrent = 0.58*cNear.x*cNear.y+0.42*cFar.x*cFar.y;

  let cLoss = mix(
    vec3f(0.0098,0.0050,0.0038),
    vec3f(0.0045,0.0060,0.0096),
    cHeat
  );
  let cExt = cLoss+vec3f(cScatter);
  let cTr = exp(-cRun*cExt);
  let cWaterColor = mix(
    vec3f(0.023,0.082,0.099),
    vec3f(0.30,0.105,0.022),
    cHeat
  );
  let cAmbient = (vec3f(1.0)-cTr)*(cLoss/cExt)*cWaterColor;

  let cMid = cStart+0.5*cRun*cDir;
  let cIncident = cBeam(cMid,cJ,cIndex,cAa)*cPower;
  let cScattered = (vec3f(1.0)-cTr)
    *(vec3f(cScatter)/cExt)*cGold*cIncident*0.50;

  // Restrained illustrative warm-body response, confined to the
  // traversed water. This is not a new light source or blackbody model.
  let cBodyDepth = 1.0-exp(-0.035*cRun);
  let cBody = cBodyDepth*(
    cHeat*vec3f(0.125,0.043,0.007)
    +cCurrent*vec3f(0.085,0.041,0.010)
  );
  let cCurrentShade = 1.0-0.12*cHeat+0.12*cCurrent;

  return cTr*cSolid*cCurrentShade+cAmbient+cScattered+cBody;
}
fn cWater(
  cPx: vec2f,cS: vec2f,cTop: bool,cDeckY: f32,
  cJ: vec2f,cIndex: f32,cSet: f32,cPower: f32,cAa: f32
) -> vec3f {
  let cAir = normalize(vec3f(0.0,cLift,1.0));
  let cN = select(
    vec3f(0.0,0.0,-1.0),
    normalize(vec3f(cS.y,-1.0,0.0)),
    cTop
  );
  let cFrontAt = vec3f(
    cPx.x,clamp(cPx.y,cS.x,cDeckY),0.0
  );
  let cTopAt = vec3f(
    cPx.x,cS.x,clamp((cS.x-cPx.y)/cLift,0.0,cRear)
  );
  let cDir = refract(cAir,cN,1.0/cIndex);
  let cUnder = cSight(
    select(cFrontAt,cTopAt,cTop),
    cDir,cJ,cIndex,cSet,cPower,cAa
  );
  let cF0 = cSq((cIndex-1.0)/(cIndex+1.0));
  let cF = cF0+(1.0-cF0)
    *pow(clamp(1.0+dot(cAir,cN),0.0,1.0),5.0);
  let cSky = select(
    vec3f(0.14,0.20,0.21),
    vec3f(0.53,0.70,0.72)*(0.97+0.20*cS.y),
    cTop
  );

  var cResult = mix(cUnder,cSky,cF);
  if (cTop) {
    // A broad, quiet surface sheen follows the same circulation field.
    // It does not perturb the original surface or refracted trajectories.
    let cTherm = cThermal(cTopAt,cJ,cSet,cPower);
    let cSheen = cTherm.x*cTherm.y*0.075;
    cResult=mix(cResult,vec3f(0.56,0.46,0.25),cSheen);
  }
  return cResult;
}

fn cBank(cPx: vec2f,cAa: f32,cPower: f32) -> vec3f {
  let cRoofY = cRoof(cPx.x);
  let cZ = clamp((cRoofY-cPx.y)/cLift,0.0,cRear);
  let cBevel = cCover(5.0-abs(cPx.x-cFace.x),cAa);
  let cFrameRock = mix(
    vec3f(0.250,0.211,0.157),
    vec3f(0.075,0.083,0.077),
    cBevel
  );
  let cD = min(
    3.45-abs(cPx.x-cFace.x),
    cLift*min(cZ-6.0,42.0-cZ)
  );
  let cAcrossCut = smoothstep(-3.4,2.6,cPx.x-cFace.x);
  let cRadiance = mix(
    vec3f(0.98,0.395,0.095),
    vec3f(1.0,0.945,0.755),
    cAcrossCut
  );
  let cBevelView = mix(
    cFrameRock,
    vec3f(0.009)+cRadiance*cPower,
    cCover(cD,cAa)
  );
  let cFront = vec3f(0.134,0.118,0.090)
    *(0.96+0.06*cos(0.095*cPx.y));
  return mix(cBevelView,cFront,cCover(cPx.y-cRoofY,cAa));
}

@fragment fn fs(
  @builtin(position) cPixel: vec4f
) -> @location(0) vec4f {
  let cOk = all(cFrame.size>=vec2f(1.0))
    && all(cFrame.size<=vec2f(32768.0))
    && cFrame.scale>=0.000030517578125
    && cFrame.scale<=256.0
    && cFrame.live==1.0
    && cFrame.reduced>=0.0
    && cFrame.reduced<=1.0
    && cFrame.ageMs>=0.0
    && cFrame.ageMs<3080.0;

  if (
    !cOk || !all(cPixel.xy>=vec2f(0.0))
    || !all(cPixel.xy<cFrame.size)
  ) {
    return cDisplay(cMatte);
  }

  let cFit = min(
    cFrame.scale,min(cFrame.size.x/292.0,cFrame.size.y/135.0)
  );
  let cPx = (cPixel.xy-0.5*cFrame.size)/cFit-vec2f(0.0,8.0);
  if (abs(cPx.x)>112.0 || cPx.y< -74.0 || cPx.y>54.0) {
    return cDisplay(cMatte);
  }

  let cAa = clamp(0.62/cFit,0.035,4.0);
  let cT = cFrame.ageMs;
  let cPower = smoothstep(18.0,132.0,cT);
  let cSet = smoothstep(154.0,1600.0,cT);
  let cIndex = mix(1.355,1.185,cSet);
  let cJ = cJourney(cT,mix(1.0,0.24,cFrame.reduced));
  let cX = cPx.x;
  let cY = cPx.y;
  let cAcross = cCover(cHalf-abs(cX),cAa);
  let cRearY = cY+cLift*cRear;
  let cBackD = min(cRearY-cCrown(cX),cBedY-cRearY);

  var cView = mix(
    cMatte,
    cWall(vec3f(cX,cRearY,cRear),cAa),
    cAcross*cCover(cBackD,cAa)
  );

  let cS = cSurface(cX,cJ);
  let cDeckY = select(cBedY,cShelfY,cX<=cLipX);
  let cSa = cAa*(1.0+abs(cS.y));
  let cWet = cAcross
    *cCover(cX-cBankX,cAa)
    *cCover(cRearY-cS.x,cSa)
    *cCover(cDeckY-cY,cAa);

  if (cWet>0.0) {
    let cFront = cCover(cY-cS.x,cSa);
    var cSection = vec3f(0.0);
    if (cFront<1.0) {
      cSection=(1.0-cFront)*cWater(
        cPx,cS,true,cDeckY,cJ,cIndex,cSet,cPower,cAa
      );
    }
    if (cFront>0.0) {
      cSection+=cFront*cWater(
        cPx,cS,false,cDeckY,cJ,cIndex,cSet,cPower,cAa
      );
    }

    // The original traveling boundary remains the only geometric crest.
    // A cool outer reflection and a warm inner shoulder keep the liquid
    // edge legible against both the warm body and the fixed apparatus.
    let cMeniscus = 1.0-smoothstep(
      0.22,1.10+cSa,abs(cY-cS.x)
    );
    let cSlopeLight = clamp(0.79+0.65*cS.y,0.52,1.0);
    let cEdgeReflection = vec3f(0.43,0.66,0.69)*cSlopeLight;
    let cEdgeHeat = cThermal(
      vec3f(cX,cS.x+1.5,0.0),cJ,cSet,cPower
    ).x;
    let cInnerEdge = cCover(cY-cS.x-0.65,cSa)
      *(1.0-smoothstep(2.0,4.8+cSa,cY-cS.x));
    cSection+=vec3f(0.080,0.035,0.006)*cInnerEdge*cEdgeHeat;
    cSection=mix(cSection,cEdgeReflection,0.80*cMeniscus);
    cView=mix(cView,cSection,cWet);
  }

  // Original opaque front fascia occludes water and fan light.
  let cToe = cAcross*cCover(
    min(cY-cDeckY,cBedY+4.5-cY),cAa
  );
  let cCutKey = 0.170
    +0.083*(1.0-smoothstep(0.1,2.3,cY-cDeckY));
  cView=mix(
    cView,cCutKey*cStone(vec3f(cX,cY,0.0),cAa),cToe
  );

  let cBankD = min(
    min(cX+cHalf,cBankX-cX),
    min(cRearY-cRoof(cX),cBedY+4.5-cY)
  );
  cView=mix(
    cView,cBank(cPx,cAa,cPower),cCover(cBankD,cAa)
  );

  let cOpen = smoothstep(0.0,132.0,cT)
    *(1.0-smoothstep(2670.0,3080.0,cT));
  return cDisplay(mix(cMatte,cView,cOpen));
}
