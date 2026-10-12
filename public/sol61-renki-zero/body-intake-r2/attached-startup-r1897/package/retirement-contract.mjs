const safe = Number.isSafeInteger;
export function projectRenkiR2Retirement(e) {
  if (!e || !e.parent || !e.device || !e.queue || e.device.queue !== e.queue ||
      e.lost?.device !== e.device || e.lost?.reason !== 'destroyed' ||
      e.deviceDestroyCalls !== 1 || e.contextUnconfigured !== true ||
      e.finalFence?.settled !== true || e.finalFence?.resolved !== true ||
      e.finalFence?.device !== e.device || e.finalFence?.queue !== e.queue ||
      e.firstFrame?.submitted !== true || e.firstFrame?.queueCompleted !== true ||
      e.firstFrame?.device !== e.device || e.firstFrame?.queue !== e.queue ||
      e.firstFrame?.targetKind !== 'canvas-current-texture-view' ||
      e.firstFrame?.passes < 1 || e.firstFrame?.version !== 'renki-sol61-body-intake-r2' ||
      e.firstFrame?.sourceId !== e.identity?.versionId || e.firstFrame?.causeId !== e.identity?.token ||
      e.firstFrame?.generation !== 1 || !safe(e.firstFrame?.frameId) || e.firstFrame.frameId < 1 || !Number.isFinite(e.firstFrame?.age) ||
      e.firstFrame?.age < 0 || e.firstFrame?.age >= 1200 || !e.firstFrame?.target ||
      !e.identity || typeof e.identity.token !== 'string' || !e.identity.token ||
      e.identity.versionId !== 'renki-sol61-body-intake-r2' ||
      Object.keys(e.identity).some(key => !['token','versionId','attemptEpoch','sequence','routePath'].includes(key)) ||
      !safe(e.identity.attemptEpoch) || !safe(e.identity.sequence) ||
      typeof e.identity.routePath !== 'string' || !e.identity.routePath.endsWith('/sol61-renki-zero/body-intake-r2/attached-startup-r1897/package/gallery.html'))
    throw new Error('RENKI_R2_ACTUAL_RETIREMENT_EVIDENCE_REQUIRED');
  const deviceId = e.deviceId, queueId = e.queueId;
  if (typeof deviceId !== 'string' || !deviceId || typeof queueId !== 'string' || !queueId)
    throw new Error('RENKI_R2_DEVICE_QUEUE_ID_REQUIRED');
  const message = {
    schema: 'dva-gallery-startup/v1', action: 'retired',
    token: e.identity.token, versionId: e.identity.versionId,
    attemptEpoch: e.identity.attemptEpoch, sequence: e.identity.sequence,
    lifecycle: {
      disposeSettled: true, teardown: 'disposed',
      deviceLifecycle: 'destroyed-loss-settled',
      device: { status: 'destroyed-loss-settled', drained: true,
        destroyCalled: true, lostReason: 'destroyed', deviceId, queueId,
        queueFenceCount: e.queueFenceCount, pendingFenceCount: 0,
        queueFences: [{ deviceId, queueId, settled: true, resolved: true, final: true }] },
      firstFrame: { version: e.firstFrame.version, frameId: e.firstFrame.frameId,
        sourceId: e.firstFrame.sourceId, causeId: e.firstFrame.causeId,
        generation: e.firstFrame.generation, elapsedMs: e.firstFrame.age,
        passes: e.firstFrame.passes, targetKind: e.firstFrame.targetKind,
        submitted: true, queueCompleted: true }
    }
  };
  return structuredClone(message);
}
