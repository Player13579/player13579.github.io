// GPT-6.1-Sol R5: connected broad smoke volume with height-phased rolling fold.
// This revises the gust trajectory, not body/source/clock/audio admission.
export const WIND = Object.freeze({
  baseSpeedHPerSecond:4.2, decayPerSecond:3.2, gustFraction:.48,
  gustPeriodSeconds:.21, heightShearPerH:.10,
  projectedHeightDifferentialPerH:.22,
  foldXAmplitudeH:.44, foldHeightAmplitudeH:.34,
  foldPhaseRadPerSecond:11.0, seedHeightPhasePerH:5.8,
  foldEnvelopeFadeStartSeconds:.42, foldEnvelopeFadeSeconds:.16,
  ellipsoidTiltAmplitude:.68, maxTransportH:2.2,
  supportPaddingH:.025, gradientSupportXH:.075, gradientSupportHeightH:.065
});
export const SEEDS=Object.freeze([
  [-.18,-.10,.18,.43,.30,.32,0], [.12,.08,.37,.44,.32,.42,.035],
  [-.13,.09,.65,.46,.35,.43,.07], [.08,-.08,.90,.40,.30,.40,.11],
  [-.10,-.03,1.13,.35,.28,.34,.16], [-.35,.02,.54,.44,.28,.34,.10],
  [.27,-.12,.70,.39,.30,.37,.18]
].map(Object.freeze));
const TAU=Math.PI*2;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function finite(t,p,h){if(![t,p,h].every(Number.isFinite)||t<0)throw TypeError('Finite gust inputs required');}
export function windVelocityHPerSecond(t,phase,heightH=0){
  finite(t,phase,heightH);
  return WIND.baseSpeedHPerSecond*Math.exp(-WIND.decayPerSecond*t)*
    (1+WIND.gustFraction*Math.sin(TAU*t/WIND.gustPeriodSeconds+phase))*
    (1+WIND.heightShearPerH*Math.max(0,heightH));
}
export function windDisplacementH(t,phase,heightH=0){
  finite(t,phase,heightH);
  const k=WIND.decayPerSecond,w=TAU/WIND.gustPeriodSeconds,den=k*k+w*w;
  const primitive=x=>Math.exp(-k*x)*(-k*Math.sin(w*x+phase)-w*Math.cos(w*x+phase))/den;
  const integral=(1-Math.exp(-k*t))/k+WIND.gustFraction*(primitive(t)-primitive(0));
  return WIND.baseSpeedHPerSecond*integral*(1+WIND.heightShearPerH*Math.max(0,heightH));
}
export function rollingFold(seedHeightH,t){
  finite(t,0,seedHeightH);
  const envelope=smooth(t/.02)*(1-smooth((t-.42)/.16));
  const phase0=WIND.seedHeightPhasePerH*(seedHeightH-.54);
  const phase=phase0+WIND.foldPhaseRadPerSecond*t;
  return Object.freeze({
    xH:WIND.foldXAmplitudeH*envelope*(Math.sin(phase)-Math.sin(phase0)),
    heightH:WIND.foldHeightAmplitudeH*envelope*(Math.cos(phase0)-Math.cos(phase)),
    tiltXZ:WIND.ellipsoidTiltAmplitude*envelope*Math.sin(phase),
    depthH:.04*envelope*Math.sin(phase+.5*Math.PI),envelope,phase
  });
}
export function buildSmokeLobes(ageEms,role,phaseAt){
  if(typeof phaseAt!=='function')throw TypeError('Pinned parent phase function required');
  const phase=phaseAt(ageEms,role);
  if(!phase.active)return Object.freeze([]);
  const elapsed=(ageEms-(role==='arrival'?180:0))/1000;
  return Object.freeze(SEEDS.map((s,i)=>{
    const t=Math.max(0,elapsed-s[6]*.13),gustPhase=s[6]*TAU+i*.73;
    const fold=rollingFold(s[2],t);
    const x=s[0]+windDisplacementH(t,gustPhase,s[2])+
      WIND.projectedHeightDifferentialPerH*(s[2]-.54)*fold.envelope+fold.xH;
    const height=s[2]+.28*t+fold.heightH;
    const radius=[s[3]*(1+.82*t)*(1+.13*(.5+.5*Math.sin(fold.phase))),
      s[4]*(1+.30*t),s[5]*(1+.22*t)*(1+.08*(.5+.5*Math.cos(fold.phase)))];
    const seedProduct=s[3]*s[4]*s[5],radiusProduct=radius[0]*radius[1]*radius[2];
    const density=phase.smokeEnvelope*(.83+.17*Math.cos(i*1.9))*seedProduct/radiusProduct;
    return Object.freeze({center:Object.freeze([x,s[1]+fold.depthH,height]),
      radius:Object.freeze(radius),tiltXZ:fold.tiltXZ,density});
  }));
}
