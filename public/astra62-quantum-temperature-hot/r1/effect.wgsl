struct QFrame {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  live: f32,
  padding: vec2f,
}
@group(0) @binding(0) var<uniform> qU: QFrame;

@vertex fn vs(@builtin(vertex_index) qIndex: u32) -> @builtin(position) vec4f {
  let qV = array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  return vec4f(qV[qIndex],0.0,1.0);
}
fn qDisplay(qLin: vec3f) -> vec4f {
  let qC = clamp(qLin,vec3f(0.0),vec3f(1.0));
  let qD = select(1.055*pow(qC,vec3f(1.0/2.4))-vec3f(0.055),12.92*qC,qC<=vec3f(0.0031308));
  return vec4f(qD,1.0);
}
fn qBell(qZ: f32) -> f32 { return exp(-(qZ*qZ)); }
fn qSpan(qX: f32) -> f32 {
  let qK = min(abs(qX)/99.0,1.0);
  return 1.0-qK*qK*qK*qK;
}
fn qChord(qX: f32,qT: f32,qM: f32) -> f32 {
  let qGo = smoothstep(0.12,0.87,qT);
  let qC = mix(-77.0,80.0,qGo);
  let qA = smoothstep(0.12,0.33,qT)*(1.0-smoothstep(0.82,1.01,qT));
  let qF = -9.2*qBell((qX-qC)/19.0)+6.1*qBell((qX-qC+28.0)/27.0);
  let qJ = mix(78.0,-45.0,smoothstep(0.79,1.57,qT));
  let qB = smoothstep(0.77,0.95,qT)*(1.0-smoothstep(1.23,1.65,qT));
  let qR = -4.8*qBell((qX-qJ)/23.0)+3.4*qBell((qX-qJ-31.0)/29.0);
  return -14.0+qSpan(qX)*(0.85+qM*(qF*qA+qR*qB));
}

@fragment fn fs(@builtin(position) qPixel: vec4f) -> @location(0) vec4f {
  let qMatte = vec3f(0.014,0.027,0.035);
  let qValid = all(qU.size>=vec2f(1.0)) && all(qU.size<=vec2f(32768.0)) && qU.scale>=0.000030517578125 && qU.scale<=256.0 && qU.reduced>=0.0 && qU.reduced<=1.0 && qU.live==1.0 && qU.ageMs>=0.0 && qU.ageMs<3080.0;
  if (!qValid) { return qDisplay(qMatte); }
  let qFit = min(qU.scale,min(qU.size.x/292.0,qU.size.y/135.0));
  let qP = (qPixel.xy-0.5*qU.size)/qFit;
  let qX = qP.x;
  let qY = qP.y;
  let qT = qU.ageMs*0.001;
  let qAA = clamp(0.68/qFit,0.04,4.0);
  let qM = mix(1.0,0.43,qU.reduced);
  let qS = qSpan(qX);
  let qBack = qChord(qX,qT,qM);
  let qSlope = (qChord(qX+0.8,qT,qM)-qChord(qX-0.8,qT,qM))/1.6;
  let qFront = qBack+7.8*qS;
  let qBottom = -14.0+43.0*qS;
  let qFootAA = qAA*(1.0+0.72*(1.0-qS));
  let qWidth = 1.0-smoothstep(99.0-qAA,99.0+qAA,abs(qX));
  let qWet = qWidth*smoothstep(-qAA,qAA,qY-qBack)*(1.0-smoothstep(-qFootAA,qFootAA,qY-qBottom));
  let qDepth = clamp((qY-qFront)/max(1.0,qBottom-qFront),0.0,1.0);
  let qHeat = smoothstep(0.56,1.64,qT);
  let qDrift = smoothstep(0.78,2.90,qT)*mix(1.0,0.38,qU.reduced);
  let qLift = qBell((qX+42.0-24.0*qDrift)/22.5);
  let qReturn = qBell((qX-22.0-16.0*qDrift)/27.0);
  let qBend = qS*(0.42+0.58*sin(3.14159265*qDepth))*(10.8*qSlope+qHeat*(11.3*qLift-8.4*qReturn));
  let qRule = 7.6-0.051*qX+3.0*smoothstep(-46.0,-16.0,qX);
  let qAcross = qY+qBend-qRule;
  let qInlay = 1.0-smoothstep(1.65,3.05+qAA,abs(qAcross));
  let qWing = qBell((qAcross+2.8)/9.0);
  var qFace = mix(vec3f(0.052,0.244,0.248),vec3f(0.025,0.117,0.153),qDepth);
  qFace += vec3f(0.026,0.068,0.060)*qWing;
  qFace = mix(qFace,vec3f(0.264,0.506,0.455),qInlay*(0.90-0.22*qDepth));
  let qCatch = clamp(0.50-0.0025*qX+1.42*qSlope,0.0,1.0);
  let qDeckV = clamp((qY-qBack)/max(1.0,7.8*qS),0.0,1.0);
  let qDeck = mix(vec3f(0.079,0.223,0.240),vec3f(0.390,0.615,0.567),qCatch*(1.0-0.33*qDeckV));
  let qMeniscus = 1.0-smoothstep(0.38,1.05+qAA,abs(qY-qFront));
  var qLiquid = mix(qDeck,qFace,smoothstep(-qAA,qAA,qY-qFront));
  qLiquid = mix(qLiquid,vec3f(0.52,0.72,0.655),qMeniscus*(0.27+0.62*qCatch));
  let qSillY = qY-qBottom;
  let qSill = (1.0-smoothstep(100.0-qAA,100.0+qAA,abs(qX)))*smoothstep(-0.6-qFootAA,-0.6+qFootAA,qSillY)*(1.0-smoothstep(3.6-qFootAA,3.6+qFootAA,qSillY));
  let qBevel = (1.0-smoothstep(0.0,2.4,qSillY))*clamp(0.73-0.0028*qX,0.0,1.0);
  let qMetal = mix(vec3f(0.069,0.096,0.105),vec3f(0.292,0.370,0.363),qBevel);
  let qView = mix(mix(qMatte,qLiquid,qWet),qMetal,qSill);
  let qOpen = smoothstep(0.0,0.132,qT)*(1.0-smoothstep(2.67,3.08,qT));
  return qDisplay(mix(qMatte,qView,qOpen));
}
