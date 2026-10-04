// Child-frame bridge contract used by the current asset gallery. Audio remains
// owned by this preview; the parent only calls activateFromGesture(item).
export function createPreviewSfxBridge({ version, verify, isMuted, activate, snapshot } = {}) {
  if (typeof version !== 'string' || !version) throw new TypeError('preview version required');
  if (typeof activate !== 'function' || typeof snapshot !== 'function') throw new TypeError('audio activation and snapshot callbacks required');
  return Object.freeze({
    async activateFromGesture(item) {
      if (item?.id !== version) return { state: 'unsupported', reason: 'version mismatch' };
      if (verify) return { state: 'silent', reason: 'verify mode hard-mutes audio' };
      if (isMuted?.()) return { state: 'unavailable', reason: 'saved game mute preference is enabled' };
      const enabled = await activate();
      const state = snapshot();
      return enabled && state.masterGain > 0
        ? { state: 'active', reason: 'Hover Sprint Blue onset audio active' }
        : { state: 'unavailable', reason: 'audio is not running or enabled' };
    },
    getSnapshot: snapshot,
  });
}
