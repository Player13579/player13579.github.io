import { packUniform, sample } from './model.mjs';

// Separates natural monotonic time from an explicitly requested diagnostic event age.
export function prepareUniformFrame(event, clockMs, { diagnostic = false, viewport, actorHeightPx, sourceEnabled = true, observerEnabled = true, reducedMotion = false, sparklesEnabled = true } = {}) {
  if (!event) return { effectiveNow: clockMs, ageMs: null, active: false, uniform: new Float32Array(16) };
  // `clockMs` is the absolute host monotonic time for natural frames, and the
  // absolute event-relative time for diagnostics only after anchoring it here.
  const effectiveNow = diagnostic ? event.startedAt + clockMs : clockMs;
  const sampled = sample(event, effectiveNow);
  const active = sampled.active && sourceEnabled !== false;
  const uniform = packUniform(event, effectiveNow, {
    viewport, actorHeightPx, sourceEnabled: sourceEnabled !== false && sampled.active, observerEnabled, reducedMotion, sparklesEnabled,
  });
  const uniformAgeMs = uniform[3] * 1000;
  const uniformActive = uniform[8] >= 0.5;
  if (Math.abs(uniformAgeMs - sampled.ageMs) > 0.1) throw new Error(`uniform age mismatch: expected ${sampled.ageMs}ms, packed ${uniformAgeMs}ms`);
  if (uniformActive !== active) throw new Error(`source gate mismatch: requested=${active}, uniform=${uniformActive}`);
  return { effectiveNow, ageMs: sampled.ageMs, phase: sampled.phase, active: uniformActive, observerEnabled: observerEnabled !== false, uniform, uniformAgeMs };
}
