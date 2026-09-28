// Gallery-only gate. Verification mode never creates or resumes an AudioContext.
export function createReplayAudioGate({ verifyMode, sfx, onError = () => {} }) {
  let enabled = false;
  let currentEvent = null;
  let unlocking = null;
  async function unlock() {
    if (verifyMode || enabled) return false;
    if (unlocking) return unlocking;
    unlocking = (async () => {
      try { await sfx.ensure(); enabled = true; return true; }
      catch (error) { onError(error); return false; }
      finally { unlocking = null; }
    })();
    return unlocking;
  }
  function enter(event) {
    const changed = event !== currentEvent;
    currentEvent = event;
    if (verifyMode || !enabled || !changed) return false;
    Promise.resolve().then(() => sfx.play(event)).catch(onError);
    return true;
  }
  return { unlock, enter, get enabled() { return enabled; } };
}
