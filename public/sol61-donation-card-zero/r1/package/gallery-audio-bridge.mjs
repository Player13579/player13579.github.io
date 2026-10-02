export function createDonationGalleryAudioBridge({ playback, verify, itemId, host = globalThis }) {
  let enabled = false;
  const bridge = Object.freeze({
    activateFromGesture(item) {
      if (verify) return Promise.resolve({ state: 'silent', reason: 'verification mode' });
      if (String(item?.id || '') !== itemId) return Promise.resolve({ state: 'unavailable', reason: 'gallery item identity mismatch' });
      try {
        const Audio = host.AudioContext || host.webkitAudioContext;
        if (!Audio) return Promise.resolve({ state: 'unavailable', reason: 'AudioContext unavailable' });
        const sound = playback.sound;
        sound.context ??= new Audio();
        // Call resume before yielding so the gallery's trusted user activation is live.
        const unlock = sound.context.resume();
        return Promise.resolve(unlock).then(() => {
          if (sound.context.state !== 'running') return { state: 'unavailable', reason: 'audio context did not enter running state' };
          enabled = true;
          return { state: 'active' };
        }).catch(error => ({ state: 'unavailable', reason: error?.message || String(error) }));
      } catch (error) {
        return Promise.resolve({ state: 'unavailable', reason: error?.message || String(error) });
      }
    },
    get enabled() { return enabled && !verify; }
  });
  host.__gallerySfx = bridge;
  return bridge;
}
