struct HeelFrame {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> hFrame: HeelFrame;

@vertex fn vs(@builtin(vertex_index) hI: u32) -> @builtin(position) vec4f {
  let hCorner = vec2f(f32((hI << 1u) & 2u), f32(hI & 2u));
  return vec4f(2.0*hCorner-vec2f(1.0), 0.0, 1.0);
}

fn hPaper() -> vec3f { return vec3f(0.016,0.027,0.032); }
fn hEncode(hRgb: vec3f) -> vec4f {
  let hV = clamp(hRgb,vec3f(0.0),vec3f(1.0));
  let hHi = 1.055*pow(hV,vec3f(1.0/2.4))-vec3f(0.055);
  return vec4f(select(hHi,12.92*hV,hV<=vec3f(0.0031308)),1.0);
}
fn hG(hZ: f32) -> f32 { return exp(-hZ*hZ); }
fn hInside(hDist: f32,hAa: f32) -> f32 { return smoothstep(-hAa,hAa,hDist); }
fn hBed(hX: f32) -> f32 {
  let hL = clamp((-73.0-hX)/32.0,0.0,1.0);
  let hR = clamp((hX-31.0)/75.0,0.0,1.0);
  return 1.0-max(hL*hL,hR*hR*(2.0-hR));
}
fn hShoe(hX: f32) -> f32 {
  return smoothstep(-77.0,-69.0,hX)*(1.0-smoothstep(-34.0,-22.0,hX));
}
fn hSurface(hX: f32,hT: f32,hMotion: f32) -> f32 {
  let hSection = hBed(hX);
  let hPin = smoothstep(0.0,0.50,hSection);
  let hC = mix(-56.0,86.0,smoothstep(0.055,0.838,hT));
  let hLoad = smoothstep(0.045,0.375,hT)*(1.0-smoothstep(0.824,1.023,hT));
  let hLead = -8.2*hG((hX-hC)/17.0)+5.7*hG((hX-hC+23.0)/24.0);
  let hB = mix(87.0,-38.0,smoothstep(0.885,1.605,hT));
  let hUnload = smoothstep(0.876,1.078,hT)*(1.0-smoothstep(1.205,1.64,hT));
  let hWake = -4.6*hG((hX-hB)/21.0)+3.1*hG((hX-hB-29.0)/27.0);
  return -22.0+0.65*hSection+hMotion*hPin*(hLoad*hLead+hUnload*hWake);
}

const hRootX: f32 = -52.0;
const hSeatDepth: f32 = 2.65;
fn hGap(hX: f32) -> f32 { return max(abs(hX-hRootX)-7.5,0.0); }
fn hTone() -> vec3f { return vec3f(0.56,0.58,0.96); }
fn hPower(hT: f32) -> f32 {
  return smoothstep(0.045,0.132,hT)*(1.0-0.14*smoothstep(0.906,1.640,hT));
}
// Upward path from the finite joint through the clear floor to the backing.
// Use backing coordinates here; wet projection happens to the entire lit cut.
fn hUpLight(hP: vec2f,hDrive: f32) -> vec3f {
  let hUp = max(27.0+hSeatDepth-hP.y,0.0);
  let hDx = hGap(hP.x);
  let hD2 = hDx*hDx+hUp*hUp;
  let hFacing = hUp/sqrt(64.0+hD2);
  return hTone()*(5.6*hDrive*hFacing*360.0/(360.0+hD2));
}
fn hStone(hP: vec2f,hAa: f32,hAmbient: f32,hIncident: vec3f) -> vec3f {
  let hV = hP.y-(2.7-0.032*hP.x);
  let hEnd = min(hP.x+129.0,128.0-hP.x)-0.58*abs(hV-4.6);
  let hMask = hInside(hEnd,hAa)*hInside(hV,hAa)*hInside(9.3-hV,hAa);
  let hKey = clamp(0.87-0.00135*hP.x,0.63,1.05);
  let hUpper = vec3f(0.452,0.358,0.230);
  let hLower = vec3f(0.203,0.153,0.105);
  var hCuts = mix(hUpper,hLower,smoothstep(3.1-hAa,3.7+hAa,hV));
  hCuts *= 1.0-0.18*smoothstep(7.2,9.2,hV);
  let hGraze = smoothstep(4.9,8.2,hV);
  let hLit = hCuts*(vec3f(hKey*hAmbient)+hIncident*hGraze);
  return mix(hPaper()*hAmbient,hLit,hMask);
}

@fragment fn fs(@builtin(position) hPix: vec4f) -> @location(0) vec4f {
  let hOk = all(hFrame.size>=vec2f(1.0)) && all(hFrame.size<=vec2f(32768.0)) && hFrame.scale>=0.000030517578125 && hFrame.scale<=256.0 && hFrame.reduced>=0.0 && hFrame.reduced<=1.0 && hFrame.live==1.0 && hFrame.ageMs>=0.0 && hFrame.ageMs<3080.0;
  if (!hOk) { return hEncode(hPaper()); }
  let hFit = min(hFrame.scale,min(hFrame.size.x/292.0,hFrame.size.y/135.0));
  let hP = (hPix.xy-0.5*hFrame.size)/hFit;
  let hX = hP.x;
  let hY = hP.y;
  let hAa = clamp(0.61/hFit,0.035,4.0);
  let hT = hFrame.ageMs*0.001;
  let hMotion = mix(1.0,0.34,hFrame.reduced);
  let hDrive = hPower(hT);
  let hS = hBed(hX);
  let hFloor = -22.0+49.0*hS;
  let hGrade = 49.0*(hBed(hX+0.65)-hBed(hX-0.65))/1.3;
  let hFloorAa = hAa*(1.0+abs(hGrade));
  let hTop = hSurface(hX,hT,hMotion);
  let hTilt = (hSurface(hX+0.65,hT,hMotion)-hSurface(hX-0.65,hT,hMotion))/1.3;
  let hTopAa = hAa*(1.0+abs(hTilt));
  let hLip = hTop+7.4*hS;
  let hSide = hInside(min(hX+105.0,106.0-hX),hAa);
  let hWet = hSide*hInside(hY-hTop,hTopAa)*hInside(hFloor-hY,hFloorAa);
  let hHeight = clamp((hFloor-hY)/max(1.0,hFloor-hLip),0.0,1.0);
  let hDepth = 1.0-hHeight;
  let hAxis = hRootX+23.0*hHeight;
  let hOffset = (hX-hAxis)/(20.0+18.0*hHeight);
  let hArrival = 0.14+0.72*hHeight+0.08*min(abs(hOffset),1.25);
  let hSet = smoothstep(hArrival,hArrival+0.65,hT);
  let hPath = smoothstep(0.0,0.63,hS)*smoothstep(0.0,0.23,hHeight)*smoothstep(0.0,0.19,hDepth);
  let hLens = 7.3*hSet*hG(hOffset)*hPath;
  let hRay = hP+vec2f(1.7*hPath,-1.15*hPath-hLens);
  let hDry = hStone(hP,hAa,1.0,vec3f(0.0));

  let hKey = clamp(0.80-0.0020*hX,0.49,1.0);
  let hThrow = 3.5+8.0*hDepth;
  let hFrom = hX-hThrow;
  let hLightTilt = (hSurface(hFrom+1.25,hT,hMotion)-hSurface(hFrom-1.25,hT,hMotion))/2.5;
  let hWash = clamp(1.0+0.71*hLightTilt*(1.0-0.66*hDepth),0.76,1.26);
  let hThrough = hStone(hRay,hAa,hWash,hUpLight(hRay,hDrive));
  let hFilter = mix(vec3f(0.49,0.77,0.73),vec3f(0.31,0.62,0.66),hDepth);
  let hFill = mix(vec3f(0.032,0.149,0.160),vec3f(0.020,0.088,0.109),hDepth)*(0.84+0.16*hKey);
  let hBounce = hShoe(hX)*hG((hFloor-hY)/5.0);
  let hFace = hThrough*hFilter+hFill*hWash+vec3f(0.041,0.020,0.006)*hBounce;
  let hCatch = clamp(0.11+0.62*hKey+1.38*hTilt,0.05,1.0);
  let hStrip = clamp((hY-hTop)/max(0.85,hLip-hTop),0.0,1.0);
  let hSky = mix(vec3f(0.065,0.200,0.209),vec3f(0.355,0.545,0.498),hCatch*(1.0-0.34*hStrip));
  var hWater = mix(hSky,hFace,hInside(hY-hLip,hTopAa));
  let hRim = (1.0-smoothstep(0.32,1.0+hTopAa,abs(hY-hLip)))*smoothstep(0.0,0.21,hS);
  hWater = mix(hWater,vec3f(0.56,0.72,0.651),hRim*(0.28+0.61*hCatch));

  let hFoot = hShoe(hX);
  let hBelow = hY-hFloor;
  let hSole = hSide*hInside(hBelow+0.25,hFloorAa)*hInside(2.0+9.8*hFoot-hBelow,hFloorAa);
  let hBevel = (1.0-smoothstep(0.15,2.7,hBelow))*clamp(0.66+0.17*hGrade+0.19*hKey,0.25,1.0);
  let hGlass = mix(vec3f(0.049,0.086,0.094),vec3f(0.237,0.326,0.306),hBevel);
  var hCopper = mix(vec3f(0.165,0.085,0.054),vec3f(0.419,0.254,0.147),hBevel);
  // The inclined landing sees the end; the upright lip immediately below it does not.
  let hDx = hGap(hX);
  let hDown = max(0.0,hBelow-hSeatDepth);
  let hLandD2 = hDx*hDx+hDown*hDown;
  let hLand = smoothstep(5.6,8.2,hBelow);
  let hLandFlux = hDrive*hLand*(hDown/sqrt(9.0+hLandD2))*196.0/(196.0+hLandD2);
  hCopper += hTone()*vec3f(0.77,0.59,0.49)*(1.15*hLandFlux);

  // A finite emitting end in a dark seat. Emitted radiance is independent of key and tilt.
  let hEndDist = length(vec2f(hDx,hBelow-hSeatDepth));
  let hSeat = hInside(3.3-hEndDist,hAa);
  let hEndFace = hInside(2.25-hEndDist,hAa);
  let hMilk = 1.0-smoothstep(0.65,2.25,hEndDist);
  let hEmission = mix(hTone(),vec3f(0.86,0.86,0.97),hMilk)*hDrive;
  let hSocket = mix(hCopper,vec3f(0.035,0.032,0.043),hSeat);
  let hJoint = mix(hSocket,vec3f(0.016,0.020,0.024)+hEmission,hEndFace);
  let hView = mix(mix(hDry,hWater,hWet),mix(hGlass,hJoint,hFoot),hSole);
  let hOpen = smoothstep(0.0,132.0,hFrame.ageMs)*(1.0-smoothstep(2670.0,3080.0,hFrame.ageMs));
  return hEncode(mix(hPaper(),hView,hOpen));
}