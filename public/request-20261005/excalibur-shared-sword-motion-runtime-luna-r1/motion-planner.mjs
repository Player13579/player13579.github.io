/** Pure Excalibur sword motion plan from the primary-authored semantic landmarks. */
export const MOTION_CONTRACT = Object.freeze({
  version: 'dva-excalibur-authored-sword-motion/v1',
  assetSha256: 'a75177d081271240026f63b4d36beec2979fe276f048e9ddcc9ed50e6a89eaf6',
  assetWidth: 1254,
  assetHeight: 1254,
  landmarks: Object.freeze({ gripPx: Object.freeze([220, 1050]), bladeBasePx: Object.freeze([365, 915]), tipPx: Object.freeze([1174, 115]) }),
  timingMs: Object.freeze({ gatherStart: 0, gatherEnd: 240, swingStart: 240, swingEnd: 410, recoverEnd: 650, peakAge: 350.5 }),
});

const DEG = Math.PI / 180;
const PEAK_U = 0.65;
const smooth = u => 3*u*u - 2*u*u*u;
const rotate = ([x,y],a) => [Math.cos(a)*x-Math.sin(a)*y, Math.sin(a)*x+Math.cos(a)*y];
const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
const finitePair = v => Array.isArray(v) && v.length===2 && v.every(Number.isFinite);
const nonempty = v => typeof v==='string' && v.length>0;

function validateInput(input) {
  if(!input || typeof input!=='object') throw new TypeError('motion sample required');
  const {causeId,clock,asset,gripWorld,gripVelocityWorld,aimRadians,worldUnitsPerSourcePx,mirrorAnatomy}=input;
  if(!nonempty(causeId)) throw new TypeError('causeId required');
  if(!clock || !['actor','fixture'].includes(clock.kind) || clock.causeId!==causeId || !nonempty(clock.sourceId) ||
     !Number.isFinite(clock.nowMs) || !Number.isFinite(clock.startedAtMs)) throw new TypeError('cause-bound source clock required');
  if(clock.kind==='actor' && clock.synthetic!==false) throw new TypeError('actor clock must be explicitly non-synthetic');
  if(clock.kind==='fixture' && clock.synthetic!==true) throw new TypeError('fixture clock must be explicitly synthetic');
  if(!asset || asset.sha256!==MOTION_CONTRACT.assetSha256 || asset.width!==MOTION_CONTRACT.assetWidth || asset.height!==MOTION_CONTRACT.assetHeight)
    throw new TypeError('exact pinned Excalibur source texture required');
  if(!finitePair(gripWorld)) throw new TypeError('explicit gripWorld required; no body-center fallback');
  if(!finitePair(gripVelocityWorld)) throw new TypeError('finite gripVelocityWorld required');
  if(!Number.isFinite(aimRadians)) throw new TypeError('finite authoritative aimRadians required');
  if(!Number.isFinite(worldUnitsPerSourcePx) || worldUnitsPerSourcePx<=0) throw new TypeError('positive shared physical scale required');
  if(typeof mirrorAnatomy!=='boolean') throw new TypeError('mirrorAnatomy must be explicit and independent of aim');
}

/**
 * Return one cause/clock-bound affine transform shared by every sword landmark.
 * Image coordinates use origin top-left and +Y down. World aim angles use +X right,
 * positive toward +Y. Expired (age >= 650 ms) samples return null for owner clearing.
 */
export function planExcaliburSwordMotion(input) {
  validateInput(input);
  const {causeId,clock,gripWorld,gripVelocityWorld,aimRadians,worldUnitsPerSourcePx:scale,mirrorAnatomy}=input;
  const rawAgeMs=clock.nowMs-clock.startedAtMs;
  if(!Number.isFinite(rawAgeMs)) throw new TypeError('finite source-clock age required');
  const ageMs=Math.max(0,rawAgeMs);
  if(ageMs>=MOTION_CONTRACT.timingMs.recoverEnd) return null;

  const {gripPx,bladeBasePx,tipPx}=MOTION_CONTRACT.landmarks;
  const [dx,dy]=[tipPx[0]-gripPx[0],tipPx[1]-gripPx[1]];
  const assetForwardRadians=Math.atan2(dy,dx);
  const u=Math.max(0,Math.min(1,(ageMs-MOTION_CONTRACT.timingMs.swingStart)/
    (MOTION_CONTRACT.timingMs.swingEnd-MOTION_CONTRACT.timingMs.swingStart)));
  const thetaRadians=-Math.PI/2+(smooth(u)-smooth(PEAK_U))*100*DEG;
  const swingActive=ageMs>=MOTION_CONTRACT.timingMs.swingStart&&ageMs<=MOTION_CONTRACT.timingMs.swingEnd;
  const dSmoothDu=6*u*(1-u);
  const thetaVelocityRadPerMs=swingActive ? dSmoothDu/(MOTION_CONTRACT.timingMs.swingEnd-MOTION_CONTRACT.timingMs.swingStart)*100*DEG : 0;
  const mirrorY=mirrorAnatomy?-1:1;
  const worldBasisRadians=aimRadians+thetaRadians;
  const assetAlign=Math.cos(assetForwardRadians),assetSin=Math.sin(assetForwardRadians);
  const basisCos=Math.cos(worldBasisRadians),basisSin=Math.sin(worldBasisRadians);
  // A = scale * R(aim + theta) * M(anatomy) * R(-assetForward).
  const a=scale*(basisCos*assetAlign+mirrorY*basisSin*assetSin);
  const b=scale*(basisCos*assetSin-mirrorY*basisSin*assetAlign);
  const c=scale*(basisSin*assetAlign-mirrorY*basisCos*assetSin);
  const d=scale*(basisSin*assetSin+mirrorY*basisCos*assetAlign);
  const tx=gripWorld[0]-a*gripPx[0]-b*gripPx[1];
  const ty=gripWorld[1]-c*gripPx[0]-d*gripPx[1];
  const mapImagePoint=point=>{
    if(!finitePair(point)) throw new TypeError('finite source-image point required');
    if(point[0]===gripPx[0]&&point[1]===gripPx[1]) return [...gripWorld];
    return [a*point[0]+b*point[1]+tx,c*point[0]+d*point[1]+ty];
  };
  const landmarks=Object.freeze({
    gripWorld:Object.freeze([...gripWorld]),
    bladeBaseWorld:Object.freeze(mapImagePoint(bladeBasePx)),
    tipWorld:Object.freeze(mapImagePoint(tipPx)),
  });
  // Analytic swing-relative tip velocity: d(R(theta)*tip)/dt. Translation is kept separate.
  const tipLengthPx=Math.hypot(dx,dy);
  const tipRadiusWorld=tipLengthPx*scale;
  const swingRelativeVelocityWorld=[
    thetaVelocityRadPerMs*(-Math.sin(worldBasisRadians))*tipRadiusWorld,
    thetaVelocityRadPerMs*Math.cos(worldBasisRadians)*tipRadiusWorld,
  ];
  const worldTipVelocityWorld=add(gripVelocityWorld,swingRelativeVelocityWorld);
  const worldTipSpeed=Math.hypot(...worldTipVelocityWorld);
  const worldTipDirectionWorld=worldTipSpeed>0?worldTipVelocityWorld.map(v=>v/worldTipSpeed):null;
  const phase=ageMs<MOTION_CONTRACT.timingMs.gatherEnd?'gather':ageMs<MOTION_CONTRACT.timingMs.swingEnd?'swing':'recover';
  return Object.freeze({
    contractVersion:MOTION_CONTRACT.version,causeId,clockKind:clock.kind,sourceId:clock.sourceId,synthetic:clock.synthetic===true,
    ageMs,rawAgeMs,phase,active:true,mirrorAnatomy,aimRadians,thetaRadians,thetaVelocityRadPerMs,
    sharedScaleWorldPerSourcePx:scale,
    affine:Object.freeze({a,b,c,d,tx,ty,sourceOrigin:'top-left',sourcePositiveY:'down'}),
    mapImagePoint,landmarks:Object.freeze(landmarks),
    tipVelocity:Object.freeze({
      swingRelativeWorld:Object.freeze(swingRelativeVelocityWorld),
      gripWorld:Object.freeze([...gripVelocityWorld]),
      world:Object.freeze(worldTipVelocityWorld),
      worldSpeed:worldTipSpeed,
      worldDirection:worldTipDirectionWorld?Object.freeze(worldTipDirectionWorld):null,
      aimDirection:Object.freeze([Math.cos(aimRadians),Math.sin(aimRadians)]),
    }),
    releaseSample:Object.freeze({originWorld:Object.freeze([...landmarks.tipWorld]),velocityWorld:Object.freeze([...worldTipVelocityWorld]),directionWorld:worldTipDirectionWorld?Object.freeze([...worldTipDirectionWorld]):null}),
  });
}
