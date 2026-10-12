export const POISON_R3_RETIREMENT_SCHEMA = 'poison-r3-attached-retirement-r1780/v1';
export const POISON_R3_DEVICE_SCHEMA = 'poison-r3-device-retirement-r1780/v1';
const isHash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const asRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function sourceTuple(binding) {
  let tuple;
  try { tuple = JSON.parse(binding.causeId); } catch { return null; }
  return Array.isArray(tuple) && tuple.length === 3 && typeof tuple[0] === 'string' && tuple[0].length > 0 &&
    tuple[1] === binding.sourceId && Number.isFinite(tuple[2]) ? tuple : null;
}
export function createPoisonRetirementAck({ request, origin, acceptedReceipt, device, sequence } = {}) {
  if (!asRecord(request) || request.schema !== 'dva-gallery-startup/v1' || request.action !== 'retire' ||
      request.versionId !== 'poison-field-zero-sol61-r3' || typeof request.token !== 'string' || !request.token ||
      !Number.isSafeInteger(request.attemptEpoch) || request.attemptEpoch < 1 || !Number.isSafeInteger(sequence) || sequence < 1) {
    throw new TypeError('retirement request identity is invalid');
  }
  if (!asRecord(acceptedReceipt) || acceptedReceipt.token !== request.token || acceptedReceipt.versionId !== request.versionId ||
      acceptedReceipt.attemptEpoch !== request.attemptEpoch || acceptedReceipt.origin !== origin ||
      acceptedReceipt.route !== '/public/sol61-poison-field-zero/r3-attached-retirement-r1780/index.html' ||
      acceptedReceipt.packageSchema !== 'poison-r3-attached-retirement-r1780/v1' ||
      !isHash(acceptedReceipt.packageManifestSha256) || !isHash(acceptedReceipt.packageSealSha256) ||
      acceptedReceipt.sourceId !== 'poison-field-r3-source' || !sourceTuple(acceptedReceipt) ||
      !Number.isSafeInteger(acceptedReceipt.generation) || acceptedReceipt.generation < 1 ||
      acceptedReceipt.targetGeneration !== acceptedReceipt.generation || !Number.isSafeInteger(acceptedReceipt.sequence) || acceptedReceipt.sequence < 1) {
    throw new TypeError('first accepted receipt is not source-, route-, package-, and outer-identity-bound');
  }
  const allowedReceiptKeys = new Set(['token','versionId','attemptEpoch','origin','route','packageSchema','packageManifestSha256','packageSealSha256','sourceId','causeId','generation','targetGeneration','sequence']);
  if (Object.keys(acceptedReceipt).some(key => !allowedReceiptKeys.has(key)) || Object.values(acceptedReceipt).some(value => !['string','number'].includes(typeof value))) throw new TypeError('raw/non-primitive source receipt reference is forbidden');
  if (!asRecord(device) || device.schema !== POISON_R3_DEVICE_SCHEMA || device.disposeSettled !== true ||
      device.queueDrained !== true || device.queueFenceStatus !== 'fulfilled' || !Number.isSafeInteger(device.queueFenceCount) || device.queueFenceCount < 1 || sequence < acceptedReceipt.sequence ||
      device.destroyCalled !== true || device.destroyCalls !== 1 || device.lostSettled !== true || device.lostReason !== 'destroyed' ||
      device.sameDevice !== true || device.sameQueue !== true || !Array.isArray(device.cleanupErrors) || device.cleanupErrors.length !== 0) {
    throw new TypeError('actual same-device queue-fence / destroy / lost(destroyed) proof is incomplete');
  }
  const allowedDeviceKeys = new Set(['schema','disposeSettled','queueDrained','queueFenceCount','queueFenceStatus','destroyCalls','destroyCalled','lostSettled','lostReason','sameDevice','sameQueue','cleanupErrors']);
  if (Object.keys(device).some(key => !allowedDeviceKeys.has(key)) || Object.entries(device).some(([key,value]) => key !== 'cleanupErrors' && !['string','number','boolean'].includes(typeof value))) throw new TypeError('raw/non-primitive device reference is forbidden in retirement ACK');
  const binding = Object.freeze({
    origin: acceptedReceipt.origin, route: acceptedReceipt.route, versionId: acceptedReceipt.versionId,
    token: acceptedReceipt.token, attemptEpoch: acceptedReceipt.attemptEpoch,
    packageSchema: acceptedReceipt.packageSchema, packageManifestSha256: acceptedReceipt.packageManifestSha256,
    packageSealSha256: acceptedReceipt.packageSealSha256, sourceId: acceptedReceipt.sourceId,
    causeId: acceptedReceipt.causeId, generation: acceptedReceipt.generation, targetGeneration: acceptedReceipt.targetGeneration,
    acceptedSequence: acceptedReceipt.sequence,
  });
  const projection = Object.freeze({
    status: 'destroyed-loss-settled', drained: device.queueDrained, destroyCalled: device.destroyCalled,
    destroyCalls: device.destroyCalls, lostSettled: device.lostSettled, lostReason: device.lostReason,
    sameDevice: device.sameDevice, sameQueue: device.sameQueue, queueFenceCount: device.queueFenceCount,
    queueFenceStatus: device.queueFenceStatus, cleanupErrors: Object.freeze([]),
  });
  return {
    schema: 'dva-gallery-startup/v1', action: 'retired', token: request.token, versionId: request.versionId,
    attemptEpoch: request.attemptEpoch, sequence: sequence + 1,
    packageSchema: acceptedReceipt.packageSchema, packageManifestSha256: acceptedReceipt.packageManifestSha256,
    packageSealSha256: acceptedReceipt.packageSealSha256,
    lifecycle: {
      proofSchema: POISON_R3_RETIREMENT_SCHEMA, binding, disposeSettled: true, teardown: 'disposed',
      deviceLifecycle: 'destroyed-loss-settled', device: projection, cleanupErrors: [],
    },
  };
}
export function isPoisonRetirementAckValid(event, attempt, acceptedReceipt, pin) {
  const data = event?.data, lifecycle = data?.lifecycle, b = lifecycle?.binding, d = lifecycle?.device;
  return event?.origin === attempt?.origin && event?.source === attempt?.iframe?.contentWindow &&
    data?.schema === 'dva-gallery-startup/v1' && data?.action === 'retired' &&
    data?.token === attempt?.token && data?.versionId === attempt?.childProtocolVersionId &&
    data?.attemptEpoch === attempt?.issuedEpoch && Number.isSafeInteger(data?.sequence) && data.sequence > attempt.sequence &&
    data?.packageSchema === pin?.packageSchema && data?.packageManifestSha256 === pin?.manifest && data?.packageSealSha256 === pin?.seal &&
    lifecycle?.proofSchema === POISON_R3_RETIREMENT_SCHEMA && lifecycle?.disposeSettled === true &&
    lifecycle?.teardown === 'disposed' && lifecycle?.deviceLifecycle === 'destroyed-loss-settled' &&
    b?.origin === attempt.origin && b?.route === pin.route && b?.versionId === attempt.versionId && b?.versionId === attempt.childProtocolVersionId &&
    b?.token === attempt.token && b?.attemptEpoch === attempt.issuedEpoch && b?.packageSchema === pin.packageSchema &&
    b?.packageManifestSha256 === pin.manifest && b?.packageSealSha256 === pin.seal &&
    b?.sourceId === acceptedReceipt?.sourceId && b?.causeId === acceptedReceipt?.causeId &&
    b?.generation === acceptedReceipt?.generation && b?.targetGeneration === acceptedReceipt?.targetGeneration &&
    b?.acceptedSequence === attempt?.initialAcceptedSequence &&
    d?.status === 'destroyed-loss-settled' && d.drained === true && d.destroyCalled === true && d.destroyCalls === 1 &&
    d.lostSettled === true && d.lostReason === 'destroyed' && d.sameDevice === true && d.sameQueue === true &&
    Number.isSafeInteger(d.queueFenceCount) && d.queueFenceCount > 0 && d.queueFenceStatus === 'fulfilled' &&
    Array.isArray(d.cleanupErrors) && d.cleanupErrors.length === 0 && Array.isArray(lifecycle.cleanupErrors) && lifecycle.cleanupErrors.length === 0;
}
