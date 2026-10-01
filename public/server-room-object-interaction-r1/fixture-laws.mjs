export const ORIGINAL = Object.freeze({ width: 1340, height: 1174,
  sha256: 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64' });
export const ACTOR_BASIS = Object.freeze({ identity: 'white-hood', basisId: 'white-hood/front-idle/v752/a18/v1',
  assetPath: 'assets/philia-front-nine-v752.png', assetSha256: '4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3',
  crop: Object.freeze([0, 0, 256, 256]), sourceSize: Object.freeze([768, 768]), alphaThreshold: 18,
  alphaBounds: Object.freeze([57, 16, 198, 241]), sourceOrigin: Object.freeze([128, 240]),
  ground: Object.freeze([0, 31]), sourceToWorldScale: 0.315, referenceHeightWorld: 70.875,
  referenceCenterActorLocal: Object.freeze([-0.1575, -4.1225]) });
export const WORLD_SCALE = 0.6791684412265758;
export const PLAYER_RADIUS_WORLD = 32;
export const PLAYER_RADIUS_IMAGE = PLAYER_RADIUS_WORLD / WORLD_SCALE;
export const MOVE_SPEED_IMAGE = 146.75;
export const INTERACTION_RANGE_WORLD = 128;
export const INTERACTION_RANGE_IMAGE = INTERACTION_RANGE_WORLD / WORLD_SCALE;
export const REARM_RANGE_WORLD = 153.6;
export const REARM_RANGE_IMAGE = REARM_RANGE_WORLD / WORLD_SCALE;
export const COOLDOWN_MS = 40000;
export const LUCK_DURATION_MS = 20000;
export const SOURCE_DURATION_MS = 1450;
export const ROOM_ID = 'security-gallery-r04-fixture';
export const SET_ID = 'security-server-gpt6sol-r01+security-room-e-gpt6sol-luna-r04';
export const DESIGN_HASH = 'dea369c4a7a58ab24b93c50ea11a90827d79647f69dba4620c26cc6afe2ddccd';
export const RIM_DESIGN_HASH = '121aa9923b54bf5c6d3ad76c34e83c111711602b3acee3a6d3907e2a49799b31';
export const ACTIVATION_RIM = Object.freeze({
  version:'digital-service-ack/r1-activation-rim-1',durationEms:1450,innerBandPx:3,coreSigmaPx:.85,
  materialLinearRGB:Object.freeze([.14,.62,1]),coreLinearRGB:Object.freeze([.84,.98,1]),materialRadiance:1.55,
  coreRadiance:3.4,padOriginalPx:4,bloomSigmaOriginalPx:4,bloomWeight:.16,bloomMaxSupportOriginalPx:18,
  contours:Object.freeze({
    'gallery-server-console-1':Object.freeze([[494,108],[958,108],[958,190],[981,190],[994,212],[1013,294],[1006,354],[982,362],[887,364],[874,299],[520,299],[518,359],[451,359],[435,351],[427,294],[431,218],[442,195],[494,192]].map(p=>Object.freeze(p))),
    'gallery-server-rack-1':Object.freeze([[1092,570],[1234,570],[1243,678],[1217,847],[1078,848],[1067,756],[1074,682],[1087,601]].map(p=>Object.freeze(p)))
  })
});

export const OBJECTS = Object.freeze([
  Object.freeze({ id: 'gallery-server-console-1', sourceType: 'securityConsole', sourceGeometryId: 'console-six-inner-screen-faces-r1',
    sourceAnchor: Object.freeze([720, 182]), interaction: Object.freeze([710, 397]), benefitKind: 'luckBoost',
    amount: 0.15, cooldownMs: COOLDOWN_MS, durationMs: LUCK_DURATION_MS, profile: 'console' }),
  Object.freeze({ id: 'gallery-server-rack-1', sourceType: 'serverRack', sourceGeometryId: 'rack-existing-indicators-r1',
    sourceAnchor: Object.freeze([1143, 696]), interaction: Object.freeze([1138, 816]), benefitKind: 'credits',
    amount: 3, cooldownMs: COOLDOWN_MS, durationMs: 0, profile: 'rack' }),
]);

export const WALKABLE = Object.freeze([[180,420],[1060,420],[1060,837],[759,837],
  [759,967],[577,967],[577,837],[180,837]].map(point => Object.freeze(point)));

export const SCREEN_FACES = Object.freeze([
  [[522,139],[635,129],[635,175],[522,187]], [[652,129],[787,132],[787,172],[652,173]],
  [[811,134],[920,143],[922,189],[811,177]], [[526,205],[635,195],[635,235],[526,243]],
  [[654,191],[787,194],[788,234],[654,234]], [[812,196],[921,209],[922,243],[812,233]],
].map(quad => Object.freeze(quad.map(point => Object.freeze(point)))));
export const SCREEN_DELAYS = Object.freeze([0, .035, .070, .105, .140, .175]);
export const RACK_INDICATORS = Object.freeze({ green: Object.freeze([1137,692,12,7]), blue: Object.freeze([
  Object.freeze([1198,694,7,7]),Object.freeze([1194,718,7,7]),Object.freeze([1191,744,7,7]),
  Object.freeze([1188,770,7,7]),Object.freeze([1184,796,7,7])]), bluePeaks: Object.freeze([.220,.390,.560,.730,.900]), greenPeak: 1.050 });

const finite2 = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const dist2 = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];

export function normalizedInput(keys, stick = [0,0]) {
  const keyX = Number(Boolean(keys.right))-Number(Boolean(keys.left));
  const keyY = Number(Boolean(keys.down))-Number(Boolean(keys.up));
  let x = keyX + (Number.isFinite(stick[0]) ? stick[0] : 0);
  let y = keyY + (Number.isFinite(stick[1]) ? stick[1] : 0);
  const magnitude = Math.hypot(x,y);
  if (magnitude > 1) { x /= magnitude; y /= magnitude; }
  return Object.freeze([x,y]);
}

function closestOnSegment(p,a,b) {
  const d=[b[0]-a[0],b[1]-a[1]], length2=dot(d,d);
  const t=length2 ? Math.max(0,Math.min(1,dot([p[0]-a[0],p[1]-a[1]],d)/length2)) : 0;
  return [a[0]+d[0]*t,a[1]+d[1]*t];
}
function pointInPolygon(point, polygon) {
  let inside=false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if ((a[1]>point[1]) !== (b[1]>point[1]) && point[0] < (b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
function nearestBoundary(point,polygon) {
  let best=null;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],q=closestOnSegment(point,a,b),distance=dist2(point,q);
    if(!best||distance<best.distance)best={point:q,distance};
  }
  return best;
}
export function circleInsideWalkable(point,radius=PLAYER_RADIUS_IMAGE,polygon=WALKABLE) {
  return finite2(point)&&Number.isFinite(radius)&&radius>=0&&pointInPolygon(point,polygon)&&nearestBoundary(point,polygon).distance+1e-7>=radius;
}
export function sweepCircleMove(start, displacement,{radius=PLAYER_RADIUS_IMAGE,polygon=WALKABLE,maxContacts=4,bisections=22}={}) {
  if(!circleInsideWalkable(start,radius,polygon))throw new Error('actor footprint starts outside registered walkable geometry');
  if(!finite2(displacement)||!Number.isFinite(radius)||radius<0)throw new TypeError('finite movement and radius required');
  let position=[...start],remaining=[...displacement],contacts=0;
  for(;contacts<maxContacts&&Math.hypot(...remaining)>1e-8;contacts++) {
    const end=[position[0]+remaining[0],position[1]+remaining[1]];
    if(circleInsideWalkable(end,radius,polygon)){position=end;remaining=[0,0];break;}
    let low=0,high=1;
    for(let i=0;i<bisections;i++) {
      const mid=(low+high)/2,p=[position[0]+remaining[0]*mid,position[1]+remaining[1]*mid];
      if(circleInsideWalkable(p,radius,polygon))low=mid;else high=mid;
    }
    position=[position[0]+remaining[0]*low,position[1]+remaining[1]*low];
    const boundary=nearestBoundary(position,polygon).point;
    let normal=[position[0]-boundary[0],position[1]-boundary[1]],n=Math.hypot(...normal);
    if(n<1e-9) { const tangent=remaining; normal=[-tangent[1],tangent[0]]; n=Math.hypot(...normal)||1; }
    normal=[normal[0]/n,normal[1]/n];
    const fraction=1-low;
    let rest=[remaining[0]*fraction,remaining[1]*fraction];
    const into=dot(rest,normal);
    if(into<0)rest=[rest[0]-into*normal[0],rest[1]-into*normal[1]];
    position=[position[0]+normal[0]*1e-5,position[1]+normal[1]*1e-5];
    remaining=rest;
  }
  return Object.freeze({position:Object.freeze(position),contacts,blocked:contacts>0});
}

function solveLinear(matrix,values) {
  const n=values.length,a=matrix.map((row,i)=>[...row,values[i]]);
  for(let col=0;col<n;col++) {
    let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(a[row][col])>Math.abs(a[pivot][col]))pivot=row;
    if(Math.abs(a[pivot][col])<1e-10)throw new Error('degenerate screen support quad');
    [a[pivot],a[col]]=[a[col],a[pivot]];
    const scale=a[col][col];for(let j=col;j<=n;j++)a[col][j]/=scale;
    for(let row=0;row<n;row++)if(row!==col){const k=a[row][col];for(let j=col;j<=n;j++)a[row][j]-=k*a[col][j];}
  }
  return a.map(row=>row[n]);
}
export function unitSquareToQuad(quad) {
  if(!Array.isArray(quad)||quad.length!==4||quad.some(p=>!finite2(p)))throw new TypeError('four finite ordered quad corners required');
  const [p0,p1,p2,p3]=quad, matrix=[],rhs=[];
  for(const [u,v,p] of [[0,0,p0],[1,0,p1],[1,1,p2],[0,1,p3]]) {
    matrix.push([u,v,1,0,0,0,-u*p[0],-v*p[0]]);rhs.push(p[0]);
    matrix.push([0,0,0,u,v,1,-u*p[1],-v*p[1]]);rhs.push(p[1]);
  }
  const h=solveLinear(matrix,rhs);return Object.freeze([h[0],h[1],h[2],h[3],h[4],h[5],h[6],h[7],1]);
}
export function invertHomography(m) {
  if(!Array.isArray(m)||m.length!==9||!m.every(Number.isFinite))throw new TypeError('finite 3x3 homography required');
  const [a,b,c,d,e,f,g,h,i]=m;
  const cof=[e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];
  const det=a*cof[0]+b*cof[3]+c*cof[6];
  if(Math.abs(det)<1e-12)throw new Error('singular homography');
  return Object.freeze(cof.map(v=>v/det));
}
export function mapQuadUv(inverse,point) {
  const [a,b,c,d,e,f,g,h,i]=inverse,[x,y]=point,w=g*x+h*y+i;
  if(Math.abs(w)<1e-12)return null;
  return Object.freeze([(a*x+b*y+c)/w,(d*x+e*y+f)/w]);
}

export function sourceEnvelope(ageSeconds) {
  if(!Number.isFinite(ageSeconds)||ageSeconds<0||ageSeconds>=SOURCE_DURATION_MS/1000)return 0;
  if(ageSeconds<.1){const t=ageSeconds/.1;return t*t*(3-2*t);}
  if(ageSeconds<1.08)return 1;
  const t=Math.max(0,Math.min(1,(ageSeconds-1.08)/(.37)));return 1-t*t*(3-2*t);
}
export function rimEnvelope(ageEms) {
  if(!Number.isFinite(ageEms)||ageEms<=0||ageEms>=ACTIVATION_RIM.durationEms)return 0;
  const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
  return smooth(0,100,ageEms)*(1-smooth(780,1450,ageEms))*(.42+.58*Math.exp(-(((ageEms-180)/190)**2)));
}
export function signedPolygonDistance(point,contour) {
  if(!finite2(point)||!Array.isArray(contour)||contour.length<3||contour.some(p=>!finite2(p)))throw new TypeError('finite point and closed contour required');
  let distance=Infinity,inside=false;
  for(let i=0,j=contour.length-1;i<contour.length;j=i++){
    const a=contour[j],b=contour[i],edge=[b[0]-a[0],b[1]-a[1]],length2=dot(edge,edge);
    const t=length2?Math.max(0,Math.min(1,((point[0]-a[0])*edge[0]+(point[1]-a[1])*edge[1])/length2)):0;
    distance=Math.min(distance,Math.hypot(point[0]-(a[0]+edge[0]*t),point[1]-(a[1]+edge[1]*t)));
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside?-distance:distance;
}
export function rimRadianceAtSignedDistance(distanceOriginalPx,ageEms) {
  if(!Number.isFinite(distanceOriginalPx)||distanceOriginalPx>0||distanceOriginalPx < -ACTIVATION_RIM.innerBandPx)return Object.freeze([0,0,0]);
  const s=Math.max(0,Math.min(1,1+distanceOriginalPx/ACTIVATION_RIM.innerBandPx)),band=s*s*(3-2*s);
  const core=Math.exp(-((distanceOriginalPx/ACTIVATION_RIM.coreSigmaPx)**2)),envelope=rimEnvelope(ageEms);
  return Object.freeze(ACTIVATION_RIM.materialLinearRGB.map((color,i)=>envelope*(color*ACTIVATION_RIM.materialRadiance*band+ACTIVATION_RIM.coreLinearRGB[i]*ACTIVATION_RIM.coreRadiance*core)));
}
export function consoleSweep(ageSeconds,faceIndex,faceV=.5) {
  const local=ageSeconds-.1-SCREEN_DELAYS[faceIndex];
  if(!Number.isFinite(local)||!Number.isFinite(faceV)||faceV<0||faceV>1||local<0||local>.8)return 0;
  const center=-.30+(local/.8)*1.6;
  const distance=Math.abs(faceV-center);
  const inner=.15-.04,outer=.15+.04;
  if(distance<=inner)return 1;if(distance>=outer)return 0;
  const t=(distance-inner)/(outer-inner);return 1-t*t*(3-2*t);
}
export function rackPulse(ageSeconds,index) {
  const peak=RACK_INDICATORS.bluePeaks[index];
  if(!Number.isFinite(ageSeconds)||ageSeconds<0||ageSeconds>=1.45)return 0;
  return Math.max(0,1-Math.abs(ageSeconds-peak)/.14);
}
export function greenPulse(ageSeconds) {
  if(!Number.isFinite(ageSeconds)||ageSeconds<0||ageSeconds>=1.45)return 0;
  return Math.max(0,1-Math.abs(ageSeconds-RACK_INDICATORS.greenPeak)/.18);
}

export function createLedger(sessionId) {
  if(typeof sessionId!=='string'||!sessionId)throw new TypeError('fixture session id required');
  return {sessionId,seq:0,sourceKeys:new Map(),outcomeKeys:new Map(),tombstones:new Set(),
    state:{luckBonus:0,luckExpiresAt:0,credits:0},objects:new Map(OBJECTS.map(o=>[o.id,{cooldownUntil:0,spentForApproach:false}]))};
}
export function grantFixture(ledger,object,nowMs,{eligible=true,actorId='gallery-white-hood-actor'}={}) {
  if(!ledger||!OBJECTS.some(o=>o.id===object?.id)||!Number.isFinite(nowMs)||nowMs<0)throw new TypeError('registered object and fixture clock required');
  const objectState=ledger.objects.get(object.id);
  if(!eligible)return Object.freeze({status:'ineligible',sourceCause:null});
  if(objectState.spentForApproach)return Object.freeze({status:'spent-until-rearm',sourceCause:null});
  if(nowMs<objectState.cooldownUntil)return Object.freeze({status:'cooldown',remainingMs:objectState.cooldownUntil-nowMs,sourceCause:null});
  const seq=++ledger.seq,transactionId=`${ledger.sessionId}:fixture-tx:${seq}`;
  const sourceActivationKey=`${ledger.sessionId}/${ROOM_ID}/${object.id}/${transactionId}`;
  if(ledger.sourceKeys.has(sourceActivationKey))return Object.freeze({status:'duplicate-source',sourceCause:null});
  const prior=object.benefitKind==='luckBoost'&&ledger.state.luckExpiresAt<=nowMs?0:ledger.state[object.benefitKind==='luckBoost'?'luckBonus':'credits'];
  const next=object.benefitKind==='luckBoost'?object.amount:prior+object.amount;
  const causeId=`${ledger.sessionId}:cause:${seq}`,grantId=`${ledger.sessionId}:grant:${seq}`,outcomeId=`${ledger.sessionId}:outcome:${seq}`;
  const recipientGrantKey=`${sourceActivationKey}/${object.benefitKind}/${outcomeId}`;
  const cause=Object.freeze({schema:'dva-object-benefit-cause/1',origin:'gallery-fixture',sessionId:ledger.sessionId,
    roomId:ROOM_ID,setId:SET_ID,setOriginalHash:ORIGINAL.sha256,geometryGeneration:1,causeId,grantId,producerSequence:seq,
    causeKey:sourceActivationKey,transactionId,objectId:object.id,recipientId:actorId,outcomeIds:Object.freeze([outcomeId]),
    benefitResult:'changed',originalSha256:ORIGINAL.sha256,startedAtRoomE:nowMs,durationEms:ACTIVATION_RIM.durationEms,
    producerVersion:'sol-approved-gallery-benefit-fixture-r1',sourceObjectId:object.id,sourceType:object.sourceType,
    sourceAnchorWorld:Object.freeze(object.sourceAnchor.map(v=>v*WORLD_SCALE)),sourceGeometryId:object.sourceGeometryId,
    recipientActorId:actorId,recipientVisualIdentity:ACTOR_BASIS.identity,recipientBasisGeneration:1,
    benefitKind:object.benefitKind,grantedValue:object.amount,beforeValue:prior,afterValue:next,
    clockDomain:'gallery-visible-simulation',grantClockMs:nowMs,familyId:'digital-service-ack/r1',
    artistVersion:ACTIVATION_RIM.version,artistSourceHash:RIM_DESIGN_HASH,sourceActivationKey,recipientGrantKey,
    authoritativeGameplayReceipt:false});
  const semantic=JSON.stringify({sourceObjectId:cause.sourceObjectId,grantId:cause.grantId,benefitKind:cause.benefitKind,
    beforeValue:cause.beforeValue,afterValue:cause.afterValue,grantClockMs:cause.grantClockMs});
  const priorSource=ledger.sourceKeys.get(sourceActivationKey);
  if(priorSource&&priorSource!==semantic)throw new Error('contradictory fixture source transaction');
  const priorOutcome=ledger.outcomeKeys.get(recipientGrantKey);
  if(priorOutcome&&priorOutcome!==semantic)throw new Error('contradictory fixture outcome transaction');
  ledger.sourceKeys.set(sourceActivationKey,semantic);ledger.outcomeKeys.set(recipientGrantKey,semantic);
  ledger.tombstones.add(causeId);objectState.spentForApproach=true;objectState.cooldownUntil=nowMs+object.cooldownMs;
  if(object.benefitKind==='luckBoost'){ledger.state.luckBonus=object.amount;ledger.state.luckExpiresAt=nowMs+object.durationMs;}
  else ledger.state.credits=next;
  return Object.freeze({status:'granted',sourceCause:cause,sourceExpiresAt:nowMs+SOURCE_DURATION_MS,
    cooldownUntil:objectState.cooldownUntil,recipientGrantKey,state:Object.freeze({...ledger.state})});
}
export function rearmObject(ledger,objectId) {
  const object=OBJECTS.find(item=>item.id===objectId);if(!object)throw new Error('unknown fixture object');
  ledger.objects.get(objectId).spentForApproach=false;
}

// A replayed transaction is admitted only if its semantic outcome is identical.
// Tombstones survive finite visual expiry for the lifetime of the fixture session.
export function admitCauseSnapshot(ledger,cause) {
  if(!ledger||!cause||cause.schema!=='dva-object-benefit-cause/1'||
      cause.sessionId!==ledger.sessionId||cause.origin!=='gallery-fixture'||
      cause.authoritativeGameplayReceipt!==false||typeof cause.sourceActivationKey!=='string'||
      typeof cause.recipientGrantKey!=='string'||typeof cause.causeId!=='string')
    throw new TypeError('invalid fixture cause snapshot');
  const semantic=JSON.stringify({sourceObjectId:cause.sourceObjectId,grantId:cause.grantId,
    benefitKind:cause.benefitKind,beforeValue:cause.beforeValue,afterValue:cause.afterValue,
    grantClockMs:cause.grantClockMs});
  const priorSource=ledger.sourceKeys.get(cause.sourceActivationKey);
  const priorOutcome=ledger.outcomeKeys.get(cause.recipientGrantKey);
  if((priorSource&&priorSource!==semantic)||(priorOutcome&&priorOutcome!==semantic))
    throw new Error('contradictory fixture cause replay');
  if(priorSource&&priorOutcome&&ledger.tombstones.has(cause.causeId))return false;
  ledger.sourceKeys.set(cause.sourceActivationKey,semantic);
  ledger.outcomeKeys.set(cause.recipientGrantKey,semantic);
  ledger.tombstones.add(cause.causeId);
  return true;
}
