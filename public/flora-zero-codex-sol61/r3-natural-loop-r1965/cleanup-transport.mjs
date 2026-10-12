const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const scalar = value => value === null || ['string', 'number', 'boolean'].includes(typeof value);
const copyScalars = (source, keys) => {
  const out = {};
  for (const key of keys) if (scalar(source?.[key])) out[key] = source[key];
  return Object.freeze(out);
};

export function sourceIdentityFromPlaying({ versionId, receipt, source }) {
  if (!versionId || !receipt || !source || receipt.version !== versionId || source.version !== versionId ||
      receipt.sourceId !== source.sourceId || receipt.causeId !== source.causeId ||
      receipt.generation !== source.generation || typeof source.sourceId !== 'string' ||
      typeof source.causeId !== 'string' || !Number.isSafeInteger(source.generation) || source.generation < 1)
    throw new Error('CLEANUP_SOURCE_IDENTITY_INVALID');
  return Object.freeze({ versionId, sourceId: source.sourceId, causeId: source.causeId, generation: source.generation });
}

function validIdentity(identity) {
  return isRecord(identity) && typeof identity.versionId === 'string' && identity.versionId.length > 0 &&
    typeof identity.sourceId === 'string' && identity.sourceId.length > 0 &&
    typeof identity.causeId === 'string' && identity.causeId.length > 0 &&
    Number.isSafeInteger(identity.generation) && identity.generation > 0;
}

function projectReceipt(receipt, identity) {
  if (receipt == null) return null;
  if (!isRecord(receipt)) throw new Error('CLEANUP_RECEIPT_INVALID');
  if (receipt.version !== identity.versionId || receipt.sourceId !== identity.sourceId ||
      receipt.causeId !== identity.causeId || receipt.generation !== identity.generation)
    throw new Error('CLEANUP_RECEIPT_SOURCE_MISMATCH');
  const out = copyScalars(receipt, ['frameId', 'sourceId', 'causeId', 'generation', 'version', 'captureKind',
    'clockKind', 'startedAtMs', 'elapsedMs', 'durationMs', 'active', 'submitted', 'completed',
    'sameDevice', 'sameEncoder', 'queueCompleted']);
  return out;
}

/** Allowlist-only cleanup transport. No producer objects or nested unknown values escape. */
export function projectCleanupReceipts(cleanup, sourceIdentity) {
  if (!isRecord(cleanup)) throw new Error('CLEANUP_SNAPSHOT_REQUIRED');
  if (cleanup.status === 'not-started') {
    const audio = cleanup.audioRetirement;
    if (!isRecord(audio)) throw new Error('CLEANUP_AUDIO_RECEIPT_REQUIRED');
    return Object.freeze({ sourceIdentity: null, host: null, hostRetiredEvent: null,
      audio: Object.freeze({ settled: audio.settled === true, contextState: scalar(audio.contextState) ? audio.contextState : null,
        voicesRemaining: Number.isFinite(audio.voicesRemaining) ? audio.voicesRemaining : null,
        pendingCount: Number.isFinite(audio.pendingCount) ? audio.pendingCount : null,
        errors: Object.freeze(Array.isArray(audio.errors) ? audio.errors.map(String) : []) }) });
  }
  if (!validIdentity(sourceIdentity)) throw new Error('CLEANUP_SOURCE_IDENTITY_REQUIRED');
  const host = cleanup.hostResult, event = cleanup.hostRetiredEvent, audio = cleanup.audioRetirement;
  if (!isRecord(host) || !isRecord(event) || !isRecord(audio)) throw new Error('CLEANUP_RECEIPTS_REQUIRED');
  const receipt = projectReceipt(host.lastTerminalReceipt, sourceIdentity);
  const projectedHost = Object.freeze({ state: scalar(host.state) ? host.state : null,
    frameId: Number.isFinite(host.frameId) ? host.frameId : null,
    pendingFrames: Number.isFinite(host.pendingFrames) ? host.pendingFrames : null,
    terminalPending: Number.isFinite(host.terminalPending) ? host.terminalPending : null,
    sourceIdentity, lastTerminalReceipt: receipt,
    lost: host.lost == null ? null : copyScalars(host.lost, ['reason', 'sameDevice']),
    failure: scalar(host.failure) ? host.failure : null });
  const projectedEvent = Object.freeze({ name: scalar(event.name) ? event.name : null,
    pendingErrorCount: Number.isFinite(event.pendingErrorCount) ? event.pendingErrorCount : null,
    effectError: scalar(event.effectError) ? event.effectError : null,
    queueError: scalar(event.queueError) ? event.queueError : null,
    lostWaitError: scalar(event.lostWaitError) ? event.lostWaitError : null,
    lost: event.lost == null ? null : copyScalars(event.lost, ['reason', 'sameDevice']) });
  const projectedAudio = Object.freeze({ settled: audio.settled === true,
    contextState: scalar(audio.contextState) ? audio.contextState : null,
    voicesRemaining: Number.isFinite(audio.voicesRemaining) ? audio.voicesRemaining : null,
    pendingCount: Number.isFinite(audio.pendingCount) ? audio.pendingCount : null,
    errors: Object.freeze(Array.isArray(audio.errors) ? audio.errors.map(String) : []) });
  return Object.freeze({ sourceIdentity: Object.freeze({ ...sourceIdentity }), host: projectedHost,
    hostRetiredEvent: projectedEvent, audio: projectedAudio });
}

export function assertTransportRetirement(evidence, expectedIdentity) {
  if (!isRecord(evidence) || !validIdentity(expectedIdentity) || !validIdentity(evidence.sourceIdentity) ||
      Object.keys(expectedIdentity).some(key => evidence.sourceIdentity[key] !== expectedIdentity[key]))
    throw new Error('RETIREMENT_SOURCE_IDENTITY_MISMATCH');
  const { host, hostRetiredEvent: event, audio } = evidence;
  if (!isRecord(host) || host.state !== 'retired' || host.pendingFrames !== 0 ||
      host.sourceIdentity.sourceId !== expectedIdentity.sourceId || !isRecord(host.lost) ||
      host.lost.reason !== 'destroyed' || host.lost.sameDevice !== true ||
      !isRecord(event) || event.name !== 'retired' || event.pendingErrorCount !== 0 ||
      event.effectError !== null || event.queueError !== null || event.lostWaitError !== null ||
      event.lost?.reason !== 'destroyed' || event.lost?.sameDevice !== true ||
      !isRecord(audio) || audio.settled !== true || audio.voicesRemaining !== 0 || audio.pendingCount !== 0 ||
      !Array.isArray(audio.errors) || audio.errors.length !== 0 ||
      host.lastTerminalReceipt && (host.lastTerminalReceipt.sourceId !== expectedIdentity.sourceId ||
        host.lastTerminalReceipt.causeId !== expectedIdentity.causeId || host.lastTerminalReceipt.version !== expectedIdentity.versionId))
    throw new Error('RETIREMENT_TRANSPORT_INCOMPLETE');
  return true;
}
