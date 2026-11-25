export const version = 'emergency-meeting-convened-astra62-r1';
export const lifetimeMs = 1170;

// The caller explicitly knows why this meeting began. No free-text reason, participant,
// coordinates or evidence is parsed. Repeated snapshots of this meeting cannot ring again.
export function createMeetingGate() {
  const seen = new Set();
  return (receipt) => {
    if (receipt?.kind !== 'emergencyMeetingStarted' || receipt.phase !== 'meeting') return false;
    const id = receipt.meetingId;
    if (typeof id !== 'string' || id.length === 0 || id.length > 128 || !id.trim() || seen.has(id)) return false;
    seen.add(id);
    return true;
  };
}

export function makeBellPcm(sampleRate = 48000) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('sample rate');
  const pcm = new Float32Array(Math.ceil(1.16 * sampleRate));
  const modes = [[613,0.34,0.21],[1008,0.23,0.11],[1631,0.16,0.066],[2267,0.098,0.032]];
  for (let n = Math.ceil(0.195 * sampleRate); n < pcm.length; n++) {
    const t = n / sampleRate - 0.195;
    const attack = 1 - Math.exp(-t / 0.002);
    let sample = 0;
    for (const [hz, decay, gain] of modes) {
      sample += gain * Math.exp(-t / decay) * Math.sin(2 * Math.PI * hz * t);
    }
    const tail = Math.min(1, (pcm.length - 1 - n) / (0.065 * sampleRate));
    pcm[n] = attack * sample * tail;
  }
  return pcm;
}
