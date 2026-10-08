// Private receipt lifecycle glue for the sealed Excalibur R8 plan.
// Only an actual shared-frame submission proof can promote a release candidate.
const finite = Number.isFinite;
const point = p => p && finite(p.x) && finite(p.y);
function deepPoint(p) { return Object.freeze({ x: p.x, y: p.y }); }

export function createExcaliburR8ReleaseLedger() {
  const candidates = new WeakMap();
  const accepted = new Map();
  const consumedReleaseIds = new Set();

  function candidate({ source, descriptor, action, releaseBoundary, eAgeSeconds,
    pathEndWorld } = {}) {
    const id = String(source?.id ?? '');
    if (source?.type !== 'alchemy-excalibur' || !id ||
        String(descriptor?.sourceEffectId ?? '') !== id ||
        String(descriptor?.ownerId ?? '') !== String(source.playerId ?? '') ||
        descriptor?.roomId !== source.roomId ||
        descriptor?.generation !== action?.targetGeneration ||
        action?.kind !== 'slash' || action.motionId !== 'alchemy-excalibur' ||
        String(action.sourceEffectId ?? '') !== id ||
        !finite(action.progress) || action.progress < releaseBoundary || action.progress >= 1 ||
        !finite(releaseBoundary) || releaseBoundary < 0 || releaseBoundary >= 1 ||
        !String(source.playerId ?? '') || !String(source.roomId ?? '') ||
        !Number.isSafeInteger(source.localGeneration) ||
        !finite(source.duration) || source.duration < 1200 ||
        descriptor.poseIndex !== 2 || !point(descriptor.root?.world) ||
        !point(descriptor.tip?.world) || !point(pathEndWorld) ||
        !finite(eAgeSeconds) || eAgeSeconds < 0 || eAgeSeconds >= source.duration / 1000)
      return null;
    const packet = Object.freeze({ sourceEffectId: id, ownerId: String(source.playerId),
      roomId: String(source.roomId), localGeneration: source.localGeneration,
      eAgeSeconds, rootWorld: deepPoint(descriptor.root.world),
      tipWorld: deepPoint(descriptor.tip.world), pathEndWorld: deepPoint(pathEndWorld) });
    candidates.set(packet, Object.freeze({ descriptor, releaseBoundary,
      actionProgress: action.progress, eAgeSeconds }));
    return packet;
  }

  function frameCallbacks({ source, descriptor, packet } = {}) {
    const record = packet ? candidates.get(packet) : null;
    const ownedSource = record && packet.sourceEffectId === String(source?.id ?? '') &&
      packet.ownerId === String(source?.playerId ?? '') && packet.roomId === source?.roomId &&
      packet.localGeneration === source?.localGeneration && record.descriptor === descriptor;
    return Object.freeze({
      poseWillSubmit: candidateDescriptor => candidateDescriptor === descriptor,
      releaseEncodedWithPose: (candidatePacket, candidateDescriptor) =>
        Boolean(ownedSource && candidatePacket === packet && candidateDescriptor === descriptor),
      acceptedRelease: candidatePacket => Boolean(accepted.get(String(source?.id ?? '')) === candidatePacket)
    });
  }

  function observeSubmission({ source, packet, proof, isCurrent } = {}) {
    const record = packet ? candidates.get(packet) : null;
    if (!record || !proof || typeof proof.errorScopes?.then !== 'function' ||
        typeof proof.done?.then !== 'function' || typeof isCurrent !== 'function')
      return Promise.resolve(false);
    return Promise.all([proof.errorScopes, proof.done]).then(([scopes]) => {
      const id = String(source?.id ?? '');
      if (!Array.isArray(scopes) || scopes.length !== 3 || scopes.some(scope => scope !== null) ||
          !id || packet.sourceEffectId !== id ||
          packet.ownerId !== String(source.playerId ?? '') ||
          packet.roomId !== source.roomId || packet.localGeneration !== source.localGeneration ||
          !isCurrent() || consumedReleaseIds.has(id)) return false;
      accepted.set(id, packet);
      consumedReleaseIds.add(id);
      return true;
    }, () => false);
  }

  function acceptedRelease(source) {
    const id = String(source?.id ?? '');
    const packet = accepted.get(id);
    if (!packet || source?.type !== 'alchemy-excalibur' ||
        packet.ownerId !== String(source.playerId ?? '') || packet.roomId !== source.roomId ||
        packet.localGeneration !== source.localGeneration) return null;
    return packet;
  }

  function retire(sourceOrId) {
    const id = typeof sourceOrId === 'string' ? sourceOrId : String(sourceOrId?.id ?? '');
    accepted.delete(id);
    consumedReleaseIds.delete(id);
  }

  return Object.freeze({ candidate, frameCallbacks, observeSubmission, acceptedRelease, retire });
}
