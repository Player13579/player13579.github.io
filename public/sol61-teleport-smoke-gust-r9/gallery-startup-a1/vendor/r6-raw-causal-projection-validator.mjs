// Exact raw producer-projection/privacy validation functions extracted from frozen R6. No plan, timing, geometry, shader, or phase helper is included.
const finite=Number.isFinite;
const validId=value=>typeof value==='string'&&value.length>0;
const point=p=>p&&finite(p.x)&&finite(p.y);
const ROLES=new Set(['departure','arrival']);
const FAMILIES=new Set(['gravity-body','gravity-target']);
const immutable=value=>Object.freeze(value);
function sourceOnly(source, role, pairRecord = false) {
  const allowed = new Set(['id', 'type', 'variant', 'x', 'y', 'at',
    ...(pairRecord ? ['playerId', 'radius', ...(role === 'departure' ? ['targetId', 'targetX', 'targetY'] : [])] : [])]);
  if (!source || !Object.isFrozen(source) || !validId(source.id) ||
      source.type !== 'action-teleport' || !ROLES.has(role) ||
      source.variant !== (role === 'departure' ? '' : 'arrival') ||
      !point({ x: source.x, y: source.y }) || !finite(source.at) || source.at < 0 ||
      Object.keys(source).some(key => !allowed.has(key)) ||
      (pairRecord && (source.radius !== 135 || !validId(source.playerId))) ||
      (pairRecord && role === 'departure' && (!validId(source.targetId) ||
        !finite(source.targetX) || !finite(source.targetY))))
    throw new TypeError('Visible teleport endpoint source must be immutable and whitelisted');
  return immutable(Object.fromEntries([...allowed].filter(key => key in source)
    .map(key => [key, source[key]])));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function createCausalPairReceipt({ scope, pair, nowMs }) {
  if (!scope || !validId(scope.roomId) || !Number.isInteger(scope.generation) || scope.generation < 0 ||
      !validId(scope.roomIncarnationId) || !Number.isInteger(scope.clientRoomSessionGeneration) ||
      scope.clientRoomSessionGeneration < 0 || scope.eClockRoomId !== scope.roomId ||
      !pair || !Object.isFrozen(pair) || !FAMILIES.has(pair.family) ||
      !validId(pair.castId) || !validId(pair.casterId) || !validId(pair.transportedActorId) ||
      !Number.isInteger(pair.revisionAfter) || pair.revisionAfter < 1 ||
      !finite(nowMs) || nowMs < 0) throw new TypeError('Invalid immutable causal-pair preview input');
  const departure = sourceOnly(pair.departure, 'departure', true);
  const arrival = sourceOnly(pair.arrival, 'arrival', true);
  if (departure.id === arrival.id || arrival.x !== Math.round(pair.to?.x) || arrival.y !== Math.round(pair.to?.y) ||
      departure.x !== Math.round(pair.from?.x) || departure.y !== Math.round(pair.from?.y) ||
      departure.playerId !== pair.casterId || departure.targetId !== pair.transportedActorId ||
      departure.targetX !== Math.round(pair.to?.x) || departure.targetY !== Math.round(pair.to?.y) ||
      arrival.playerId !== pair.transportedActorId ||
      arrival.targetX !== undefined || arrival.targetY !== undefined)
    throw new TypeError('Causal pair raw endpoints must match legacy event Math.round projection');
  const causalId = pair.castId;
  const receipt = {
    causalId, departureId: departure.id, arrivalId: arrival.id,
    transportedActorId: pair.transportedActorId, casterId: pair.casterId,
    revisionAfter: pair.revisionAfter,
    type: 'action-teleport', roomId: scope.roomId, generation: scope.generation,
    startedAtMs: nowMs, durationMs: 640, timeBasis: 'wall-receipt',
    from: immutable({ x: pair.from.x, y: pair.from.y }),
    to: immutable({ x: pair.to.x, y: pair.to.y }),
    sourceProof: immutable({ causalId, departureId: departure.id, arrivalId: arrival.id,
      transportedActorId: pair.transportedActorId, departure: immutable({ ...departure,
        causalId, playerId: pair.casterId, targetId: pair.transportedActorId }),
      arrival: immutable({ ...arrival, causalId, playerId: pair.transportedActorId }) })
  };
  return deepFreeze(receipt);
}
