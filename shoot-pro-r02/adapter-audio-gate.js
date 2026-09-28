export function createAdapterAudioGate({ verify, unlock }) {
  let enabled = false;
  let unlocking = false;
  return {
    get enabled() { return enabled && !verify; },
    get status() { return verify ? 'verification-muted' : enabled ? 'gesture-unlocked' : 'awaiting-browser-gesture'; },
    async enableFromGesture() {
      if (verify || enabled || unlocking) return false;
      unlocking = true;
      try {
        const state = await unlock();
        enabled = state === 'running';
        return enabled;
      } finally { unlocking = false; }
    }
  };
}
