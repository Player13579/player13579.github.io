// Adapter for verify URLs that pin an effect at one age. The artist owner clock
// stays frozen for phase rendering; this independent gate measures only visible
// actor E-time needed to admit a fresh receipt after visibility cancellation.
export class HeldAgeFixtureResume {
  constructor({ dwellEms = 300 } = {}) {
    if (!Number.isFinite(dwellEms) || dwellEms < 0) throw new RangeError('dwellEms must be finite and nonnegative');
    this.dwellEms = dwellEms;
    this.pending = true;
    this.afterHidden = false;
    this.visibleDwellEms = 0;
  }

  hiddenCancellation() {
    this.pending = true;
    this.afterHidden = true;
    this.visibleDwellEms = 0;
  }

  visibleFrame(deltaEms, visible = true) {
    if (!this.pending) return false;
    if (!visible) return false;
    if (!this.afterHidden) {
      this.pending = false;
      return true;
    }
    const delta = Number.isFinite(deltaEms) && deltaEms > 0 ? deltaEms : 0;
    this.visibleDwellEms += delta;
    if (this.visibleDwellEms < this.dwellEms) return false;
    this.pending = false;
    this.afterHidden = false;
    this.visibleDwellEms = 0;
    return true;
  }
}

// Keep the non-frozen path byte-for-byte equivalent in behavior to the former
// owner-clock comparison. The adapter is consulted for fixed-age fixtures only.
export function fixtureCauseDue({ frozenAge, ownerE, nextStartE, deltaEms, visible = true, resume }) {
  return frozenAge === null
    ? ownerE >= nextStartE
    : resume.visibleFrame(deltaEms, visible);
}
