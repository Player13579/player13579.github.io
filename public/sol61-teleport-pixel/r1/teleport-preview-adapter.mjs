const finite = Number.isFinite;
const validId = value => typeof value === 'string' && value.length > 0;
const ROLES = new Set(['departure', 'arrival']);
const FAMILIES = new Set(['gravity-body', 'gravity-target']);
const immutable = value => Object.freeze(value);
const point = p => p && finite(p.x) && finite(p.y);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
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

// This is a preview-side adapter for already-visible event projections. It is
// not a producer, serializer, or public proof mechanism.
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

const ENDPOINT_KEYS = new Set(['roomIncarnationId', 'clientRoomSessionGeneration', 'roomId',
  'eClockRoomId', 'castId', 'family', 'transportedActorId', 'endpointRole',
  'sourceId', 'sourceType', 'sourceVariant', 'sourceRadius', 'sourcePlayerId', 'sourceTargetId',
  'sourceX', 'sourceY', 'sourceAtServerMs',
  'relocationRevision', 'poseIdentity', 'localFirstReceiptAtMs']);
export function createEndpointOnlyLease(input) {
  if (!input || typeof input !== 'object' || !Object.isFrozen(input) ||
      Object.keys(input).some(key => !ENDPOINT_KEYS.has(key)) ||
      !validId(input.roomIncarnationId) || !Number.isInteger(input.clientRoomSessionGeneration) ||
      input.clientRoomSessionGeneration < 0 || !validId(input.roomId) || input.eClockRoomId !== input.roomId ||
      !validId(input.castId) || !FAMILIES.has(input.family) || !validId(input.transportedActorId) ||
      !ROLES.has(input.endpointRole) || !validId(input.sourceId) || input.sourceType !== 'action-teleport' ||
      input.sourceVariant !== (input.endpointRole === 'departure' ? '' : 'arrival') ||
      input.sourceRadius !== 135 ||
      (input.endpointRole === 'arrival' &&
        (input.sourcePlayerId !== input.transportedActorId || input.sourceTargetId !== undefined)) ||
      (input.endpointRole === 'departure' &&
        (!validId(input.sourcePlayerId) || !validId(input.sourceTargetId) ||
          input.sourceTargetId !== input.transportedActorId)) ||
      !finite(input.sourceX) || !finite(input.sourceY) || !finite(input.sourceAtServerMs) || input.sourceAtServerMs < 0 ||
      !Number.isInteger(input.relocationRevision) || input.relocationRevision < 1 ||
      !validId(input.poseIdentity) || !finite(input.localFirstReceiptAtMs) || input.localFirstReceiptAtMs < 0)
    throw new TypeError('Invalid endpoint-only projection; hidden endpoint fields are forbidden');
  const endpoint = immutable({ role: input.endpointRole, sourceId: input.sourceId,
    type: input.sourceType, radius: input.sourceRadius, playerId: input.sourcePlayerId,
    ...(input.sourceTargetId === undefined ? {} : { targetId: input.sourceTargetId }),
    variant: input.sourceVariant,
    position: immutable({ x: input.sourceX, y: input.sourceY }),
    sourceAtServerMs: input.sourceAtServerMs });
  const lease = { schema: 'teleport-endpoint-preview-r1', roomIncarnationId: input.roomIncarnationId,
    clientRoomSessionGeneration: input.clientRoomSessionGeneration, roomId: input.roomId,
    eClockRoomId: input.eClockRoomId, castId: input.castId, family: input.family,
    transportedActorId: input.transportedActorId, endpoint, relocationRevision: input.relocationRevision,
    poseIdentity: input.poseIdentity, localFirstReceiptAtMs: input.localFirstReceiptAtMs,
    dedupeKey: [input.roomIncarnationId, input.clientRoomSessionGeneration, input.castId, input.endpointRole].join(':') };
  return deepFreeze(lease);
}

export function endpointOnlyPlan({ lease, pose, scope, nowMs, viewport, actor }) {
  const blocked = reason => immutable({ status: 'blocked', reason });
  if (!lease || !Object.isFrozen(lease) || lease.schema !== 'teleport-endpoint-preview-r1' ||
      lease.roomId !== scope?.roomId || lease.eClockRoomId !== scope?.roomId ||
      lease.clientRoomSessionGeneration !== scope?.generation ||
      !finite(nowMs) || nowMs < lease.localFirstReceiptAtMs ||
      !pose || pose.actorId !== lease.transportedActorId || pose.causalId !== lease.castId ||
      pose.identity !== lease.poseIdentity || pose.roomId !== lease.roomId ||
      pose.generation !== scope.generation || !Object.isFrozen(pose) || pose.ready !== true ||
      pose.ownerLease?.ready !== true || pose.ownerLease?.current !== true ||
      pose.ownerLease?.uploadVersion !== pose.uploadVersion || pose.deviceIdentity !== pose.ownerLease?.deviceIdentity ||
      !viewport || ![viewport.width, viewport.height, viewport.zoom, viewport.camera?.x, viewport.camera?.y].every(finite) ||
      viewport.width <= 0 || viewport.height <= 0 || viewport.zoom <= 0 || !Number.isInteger(viewport.generation) ||
      !actor || actor.id !== lease.transportedActorId || !point(actor) ||
      actor.relocationRevision !== lease.relocationRevision ||
      [actor.alive, actor.ejected, actor.inVent].some(value => typeof value !== 'boolean'))
    return blocked('invalid-endpoint-only-lease');
  if (!actor.alive || actor.ejected || actor.inVent ||
      (lease.endpoint.role === 'arrival' &&
        (actor.x !== lease.endpoint.position.x || actor.y !== lease.endpoint.position.y)))
    return immutable({ status: 'cancelled', reason: 'actor-lifecycle-or-endpoint-mismatch' });
  const ageMs = nowMs - lease.localFirstReceiptAtMs;
  if (ageMs >= 640) return immutable({ status: 'omitted', reason: 'expired' });
  const arrival = lease.endpoint.role === 'arrival';
  if (arrival && ageMs < 160) return immutable({ status: 'omitted', reason: 'arrival-not-started' });
  if (!arrival && ageMs >= 280) return immutable({ status: 'omitted', reason: 'departure-ended' });
  const cellPx = viewport.reducedMotion ? 6 : 4;
  const columns = Math.min(32, Math.max(1, Math.ceil(pose.localRect[2] * viewport.zoom / cellPx)));
  const rows = Math.min(40, Math.max(1, Math.ceil(pose.localRect[3] * viewport.zoom / cellPx)));
  return immutable({ status: 'ready', causalId: lease.castId, actorId: lease.transportedActorId,
    ageMs, viewportGeneration: viewport.generation, columns, rows, pose, viewport,
    endpoints: immutable([immutable({ phase: arrival ? 1 : 0, anchor: lease.endpoint.position })]),
    // Endpoint-only departure never suppresses the ordinary body. Arrival is
    // kept local to this preview; it has no gameplay body-ownership claim.
    bodyLease: null, leaseKind: 'endpoint-only', endpointRole: lease.endpoint.role });
}

export function createVisibleEndpointDeduper(capacity = 256) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be positive');
  const seen = new Map();
  return Object.freeze({
    accept(lease) {
      if (!lease || lease.schema !== 'teleport-endpoint-preview-r1' || !Object.isFrozen(lease)) return false;
      if (seen.has(lease.dedupeKey)) return false;
      seen.set(lease.dedupeKey, lease.localFirstReceiptAtMs);
      if (seen.size > capacity) seen.delete(seen.keys().next().value);
      return true;
    },
    get size() { return seen.size; }
  });
}

