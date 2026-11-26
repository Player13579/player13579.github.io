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

// Design pixels. y increases down the section, z goes into the stone.
// Screen projection is (x, y-cLift*z); the front cut is z=0.
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

fn cDisplay(cLinear: vec3f) -> vec4f {
  let cV = clamp(cLinear,vec3f(0.0),vec3f(1.0));
  let cUpper = 1.055*pow(cV,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(cUpper,12.92*cV,cV<=vec3f(0.0031308)),1.0);
}
fn cCover(cDist: f32,cAa: f32) -> f32 { return smoothstep(-cAa,cAa,cDist); }
fn cSq(cV: f32) -> f32 { return cV*cV; }
fn cRoof(cX: f32) -> f32 { return cFace.y+1.7*clamp(cX-cFace.x,-5.0,5.0); }
fn cCrown(cX: f32) -> f32 { return -19.5+2.7*sin(0.030*cX+0.6); }
fn cSpan(cZ: f32) -> f32 {
  return smoothstep(6.0,10.0,cZ)*(1.0-smoothstep(38.0,42.0,cZ));
}

// A compact hump rolls over once into a returning depression. The
// center may still advance at the turn; amplitude crosses zero there.
fn cJourney(cT: f32,cMotion: f32) -> vec2f {
  let cGo = smoothstep(52.0,853.0,cT);
  let cBack = smoothstep(865.0,1640.0,cT);
  let cTurn = smoothstep(820.0,990.0,cT);
  let cH = mix(-6.6*smoothstep(38.0,245.0,cT),4.7,cTurn)*(1.0-smoothstep(1500.0,1650.0,cT));
  return vec2f(mix(mix(-62.0,68.0,cGo),-55.0,cBack),cH*cMotion);
}
fn cSurface(cX: f32,cJ: vec2f) -> vec2f {
  let cU = (cX-cJ.x)/34.0;
  let cM = max(0.0,1.0-cU*cU);
  return vec2f(cLevel+cJ.y*cM*cM*cM,(-6.0/34.0)*cJ.y*cU*cM*cM);
}

// Each fan ray stays at its source z. Bisect in vertical travel units;
// the possible surface heights are bracketed even at maximum motion.
// Return x on the shelf plane, x on the bed plane (before blocking).
fn cIntercepts(cAim: f32,cJ: vec2f,cIndex: f32) -> vec2f {
  var cLo = cLevel-cFace.y-7.0;
  var cHi = cLevel-cFace.y+7.0;
  for (var cIt: i32=0; cIt<8; cIt=cIt+1) {
    let cD = 0.5*(cLo+cHi);
    let cAt = cFace+vec2f(cAim,1.0)*cD;
    if (cAt.y<cSurface(cAt.x,cJ).x) { cLo=cD; } else { cHi=cD; }
  }
  let cEntry = cFace+vec2f(cAim,1.0)*(0.5*(cLo+cHi));
  let cN = normalize(vec2f(cSurface(cEntry.x,cJ).y,-1.0));
  let cDir = refract(normalize(vec2f(cAim,1.0)),cN,1.0/cIndex);
  return vec2f(cEntry.x)+(vec2f(cShelfY,cBedY)-vec2f(cEntry.y))*(cDir.x/max(cDir.y,0.08));
}

// A deposit is the integral of a soft finite kernel between two
// marginal landings. Adjacent deposits join instead of drawing lines.
fn cDeposit(cX: f32,cA: f32,cB: f32,cAmount: f32,cSoft: f32) -> f32 {
  let cMid = 0.5*(cA+cB);
  let cW = max(abs(cB-cA),0.8);
  let cL = cX-(cMid-0.5*cW);
  let cR = cX-(cMid+0.5*cW);
  return (cAmount/cW)*(cCover(cL,cSoft)-cCover(cR,cSoft));
}
fn cFlux(cP: vec3f,cLowBed: bool,cJ: vec2f,cIndex: f32,cAa: f32) -> f32 {
  let cDepthMask = cSpan(cP.z);
  if (cDepthMask<=0.0 || cP.x< -62.0 || cP.x>75.0) { return 0.0; }
  let cDa = (2.38-0.76)/12.0;
  var cA = cIntercepts(0.76,cJ,cIndex);
  var cSum = 0.0;
  for (var cCell: i32=0; cCell<12; cCell=cCell+1) {
    let cB = cIntercepts(0.76+f32(cCell+1)*cDa,cJ,cIndex);
    let cU = (f32(cCell)+0.5)/12.0;
    let cShare = cDa*(0.90+0.10*(1.0-cSq(2.0*cU-1.0)));
    if (!cLowBed) {
      // Only evaluated on actual tread material, up to the lip.
      cSum += cDeposit(cP.x,cA.x,cB.x,38.0*cShare,1.5+cAa);
    } else {
      let cThroughA = cA.x>cLipX;
      let cThroughB = cB.x>cLipX;
      if (cThroughA || cThroughB) {
        var cStart = 0.0;
        var cStop = 1.0;
        if (cThroughA!=cThroughB) {
          let cSplit = clamp((cLipX-cA.x)/(cB.x-cA.x),0.0,1.0);
          if (cThroughA) { cStop=cSplit; } else { cStart=cSplit; }
        }
        cSum += cDeposit(cP.x,mix(cA.y,cB.y,cStart),mix(cA.y,cB.y,cStop),38.0*cShare*(cStop-cStart),2.0+cAa);
      }
    }
    cA=cB;
  }
  return cDepthMask*min(1.24,max(0.0,cSum));
}

// One bedding coordinate on every cut of the sandstone, including
// the dry control above the waterline and the unlit front fascia.
fn cStone(cP: vec3f,cAa: f32) -> vec3f {
  let cSeamX = 10.0+0.61*(cP.y-cBedY)+0.26*(cRear-cP.z)+1.1*sin(0.078*cP.y+0.045*cP.z);
  let cD = cP.x-cSeamX;
  let cSeam = cCover(2.45-abs(cD),cAa);
  let cSelvage = cCover(1.35-abs(cD-3.4),cAa);
  let cMatrix = vec3f(0.73,0.69,0.585)*(0.95+0.040*cos(0.065*cD)+0.13*cSelvage);
  return mix(cMatrix,vec3f(0.195,0.202,0.173),cSeam);
}
fn cWall(cP: vec3f,cAa: f32) -> vec3f {
  let cRim = 1.0-smoothstep(0.2,3.5,cP.y-cCrown(cP.x));
  return cStone(cP,cAa)*vec3f(0.215,0.247,0.249)*(1.0+0.24*cRim);
}
fn cReceiver(cP: vec3f,cLowBed: bool,cJ: vec2f,cIndex: f32,cPower: f32,cAa: f32) -> vec3f {
  let cFall = cFlux(cP,cLowBed,cJ,cIndex,cAa)*cPower;
  let cKey = select(0.222,0.184,cLowBed);
  let cRock = cStone(cP,cAa)*select(vec3f(0.92,0.96,0.94),vec3f(1.0),cLowBed);
  return cRock*(vec3f(cKey)+cGold*cFall*select(1.12,1.0,cLowBed));
}

// Independently intersect the observer ray with the solids. Kinds:
// 0 rear bedding, 1 lower bed, 2 shallow tread, 3 riser, 4 side.
fn cSight(cStart: vec3f,cDir: vec3f,cJ: vec2f,cIndex: f32,cSet: f32,cPower: f32,cAa: f32) -> vec3f {
  let cDy = max(0.001,cDir.y);
  var cRun = max(0.0,(cRear-cStart.z)/max(0.001,cDir.z));
  var cKind = 0;
  let cFloorT = (cBedY-cStart.y)/cDy;
  if (cFloorT>=0.0 && cFloorT<cRun) { cRun=cFloorT; cKind=1; }
  let cShelfT = (cShelfY-cStart.y)/cDy;
  if (cShelfT>=0.0 && cShelfT<=cRun && cStart.x+cShelfT*cDir.x<=cLipX) { cRun=cShelfT; cKind=2; }
  if (cDir.x< -0.0001 && cStart.x>=cLipX) {
    let cRiserT = (cLipX-cStart.x)/cDir.x;
    if (cRiserT<cRun && cStart.y+cRiserT*cDir.y>=cShelfY) { cRun=cRiserT; cKind=3; }
  }
  if (abs(cDir.x)>0.0001) {
    let cSideT = (select(cBankX,cHalf,cDir.x>0.0)-cStart.x)/cDir.x;
    if (cSideT>=0.0 && cSideT<cRun) { cRun=cSideT; cKind=4; }
  }
  let cHit = cStart+cRun*cDir;
  var cSolid = vec3f(0.0);
  if (cKind==1 || cKind==2) {
    cSolid=cReceiver(cHit,cKind==1,cJ,cIndex,cPower,cAa);
  } else if (cKind==0) {
    cSolid=cWall(cHit,cAa);
  } else {
    cSolid=cStone(cHit,cAa)*select(0.127,0.098,cKind==4);
  }
  let cLoss = mix(vec3f(0.0098,0.0050,0.0038),vec3f(0.0045,0.0060,0.0096),cSet);
  let cTr = exp(-cRun*cLoss);
  return cTr*cSolid+(vec3f(1.0)-cTr)*vec3f(0.036,0.109,0.121);
}
fn cWater(cPx: vec2f,cS: vec2f,cTop: bool,cDeckY: f32,cJ: vec2f,cIndex: f32,cSet: f32,cPower: f32,cAa: f32) -> vec3f {
  let cAir = normalize(vec3f(0.0,cLift,1.0));
  let cN = select(vec3f(0.0,0.0,-1.0),normalize(vec3f(cS.y,-1.0,0.0)),cTop);
  let cFrontAt = vec3f(cPx.x,clamp(cPx.y,cS.x,cDeckY),0.0);
  let cTopAt = vec3f(cPx.x,cS.x,clamp((cS.x-cPx.y)/cLift,0.0,cRear));
  let cDir = refract(cAir,cN,1.0/cIndex);
  let cUnder = cSight(select(cFrontAt,cTopAt,cTop),cDir,cJ,cIndex,cSet,cPower,cAa);
  let cF0 = cSq((cIndex-1.0)/(cIndex+1.0));
  let cF = cF0+(1.0-cF0)*pow(clamp(1.0+dot(cAir,cN),0.0,1.0),5.0);
  let cSky = select(vec3f(0.14,0.20,0.21),vec3f(0.53,0.70,0.72)*(0.97+0.20*cS.y),cTop);
  return mix(cUnder,cSky,cF);
}

fn cBank(cPx: vec2f,cAa: f32,cPower: f32) -> vec3f {
  let cRoofY = cRoof(cPx.x);
  let cZ = clamp((cRoofY-cPx.y)/cLift,0.0,cRear);
  let cBevel = cCover(5.0-abs(cPx.x-cFace.x),cAa);
  let cFrameRock = mix(vec3f(0.202,0.222,0.202),vec3f(0.118,0.125,0.108),cBevel);
  let cD = min(3.45-abs(cPx.x-cFace.x),cLift*min(cZ-6.0,42.0-cZ));
  let cRadiance = mix(vec3f(0.90,0.56,0.232),vec3f(0.997,0.902,0.633),smoothstep(-3.4,2.6,cPx.x-cFace.x));
  let cBevelView = mix(cFrameRock,vec3f(0.009)+cRadiance*cPower,cCover(cD,cAa));
  let cFront = vec3f(0.092,0.104,0.098)*(0.96+0.06*cos(0.095*cPx.y));
  return mix(cBevelView,cFront,cCover(cPx.y-cRoofY,cAa));
}

@fragment fn fs(@builtin(position) cPixel: vec4f) -> @location(0) vec4f {
  let cOk = all(cFrame.size>=vec2f(1.0)) && all(cFrame.size<=vec2f(32768.0)) && cFrame.scale>=0.000030517578125 && cFrame.scale<=256.0 && cFrame.live==1.0 && cFrame.reduced>=0.0 && cFrame.reduced<=1.0 && cFrame.ageMs>=0.0 && cFrame.ageMs<3080.0;
  if (!cOk || !all(cPixel.xy>=vec2f(0.0)) || !all(cPixel.xy<cFrame.size)) { return cDisplay(cMatte); }
  let cFit = min(cFrame.scale,min(cFrame.size.x/292.0,cFrame.size.y/135.0));
  let cPx = (cPixel.xy-0.5*cFrame.size)/cFit-vec2f(0.0,8.0);
  if (abs(cPx.x)>112.0 || cPx.y< -74.0 || cPx.y>54.0) { return cDisplay(cMatte); }
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
  var cView = mix(cMatte,cWall(vec3f(cX,cRearY,cRear),cAa),cAcross*cCover(cBackD,cAa));

  let cS = cSurface(cX,cJ);
  let cDeckY = select(cBedY,cShelfY,cX<=cLipX);
  let cSa = cAa*(1.0+abs(cS.y));
  let cWet = cAcross*cCover(cX-cBankX,cAa)*cCover(cRearY-cS.x,cSa)*cCover(cDeckY-cY,cAa);
  if (cWet>0.0) {
    let cFront = cCover(cY-cS.x,cSa);
    var cSection = vec3f(0.0);
    if (cFront<1.0) { cSection=(1.0-cFront)*cWater(cPx,cS,true,cDeckY,cJ,cIndex,cSet,cPower,cAa); }
    if (cFront>0.0) { cSection+=cFront*cWater(cPx,cS,false,cDeckY,cJ,cIndex,cSet,cPower,cAa); }
    let cMeniscus = 1.0-smoothstep(0.22,1.10+cSa,abs(cY-cS.x));
    cSection=mix(cSection,vec3f(0.36,0.50,0.50),0.68*cMeniscus);
    cView=mix(cView,cSection,cWet);
  }
  // Front stone ends the water column; do not project fan light onto it.
  let cToe = cAcross*cCover(min(cY-cDeckY,cBedY+4.5-cY),cAa);
  let cCutKey = 0.146+0.073*(1.0-smoothstep(0.1,2.3,cY-cDeckY));
  cView=mix(cView,cCutKey*cStone(vec3f(cX,cY,0.0),cAa),cToe);
  let cBankD = min(min(cX+cHalf,cBankX-cX),min(cRearY-cRoof(cX),cBedY+4.5-cY));
  cView=mix(cView,cBank(cPx,cAa,cPower),cCover(cBankD,cAa));
  let cOpen = smoothstep(0.0,132.0,cT)*(1.0-smoothstep(2670.0,3080.0,cT));
  return cDisplay(mix(cMatte,cView,cOpen));
}