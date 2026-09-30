export const BARRIER_GALLERY_PHASES = Object.freeze([
  Object.freeze({ name: 'create', stage: 0, durationMs: 650, kind: 'create', live: true }),
  Object.freeze({ name: 'stable-after-create', stage: 1, durationMs: 350, kind: null, live: true }),
  Object.freeze({ name: 'known-hit', stage: 3, durationMs: 650, kind: 'hit', live: true, known: true }),
  Object.freeze({ name: 'stable-after-hit', stage: 1, durationMs: 350, kind: null, live: true }),
  Object.freeze({ name: 'break', stage: 2, durationMs: 480, kind: 'break', live: true }),
  Object.freeze({ name: 'off', stage: 4, durationMs: 220, kind: null, live: false }),
]);

export const BARRIER_GALLERY_CYCLE_MS = BARRIER_GALLERY_PHASES.reduce((sum, phase) => sum + phase.durationMs, 0);

export function normalizeDisplayRate(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0.5 && rate <= 2 ? rate : 1;
}

export function phaseAtElapsed(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('elapsedMs must be a finite non-negative number');
  const cycle = Math.floor(elapsedMs / BARRIER_GALLERY_CYCLE_MS);
  const cycleMs = elapsedMs - cycle * BARRIER_GALLERY_CYCLE_MS;
  let start = 0;
  for (const phase of BARRIER_GALLERY_PHASES) {
    const end = start + phase.durationMs;
    if (cycleMs < end) return Object.freeze({ ...phase, ageMs: cycleMs - start, cycle, cycleMs });
    start = end;
  }
  throw new Error('unreachable phase boundary');
}

const asState = phase => ({
  stage: phase.stage,
  t: phase.kind ? phase.ageMs / 1000 : 0,
  live: phase.live,
  known: phase.name === 'known-hit',
  contact: phase.name === 'known-hit' ? [.50, .15, .66] : [0, 0, 0],
});

export function createBarrierGalleryLoop(runtime, { rate = 1, verify = false, target = globalThis, now = () => performance.now(), raf = callback => requestAnimationFrame(callback), cancelRaf = id => cancelAnimationFrame(id) } = {}) {
  if (!runtime?.setState || !runtime?.submit || !runtime?.snapshot || !runtime?.sound) throw new TypeError('A live Barrier r10 runtime is required');
  const displayRate = normalizeDisplayRate(rate);
  const verification = !!verify || !!runtime.verification;
  let elapsedEms = 0;
  let previousWallMs = null;
  let requestId = 0;
  let stopped = false;
  let busy = false;
  let frameCount = 0;
  let lastReceipt = null;
  let lastError = null;
  let phaseSnapshot = null;
  const phaseHistory = [];

  const phaseAt = value => phaseAtElapsed(value);
  const bridge = Object.freeze({
    activateFromGesture: () => verification ? Promise.resolve(false) : runtime.sound.unlock(),
    setMuted: muted => runtime.sound.setMuted(!!muted),
    stop: () => runtime.sound.stopAll(),
    dispose: () => api.dispose(),
    status: () => runtime.sound.audit(),
    snapshot: () => runtime.sound.audit(),
  });

  async function publishFrame(wallMs) {
    if (stopped || busy || (typeof document !== 'undefined' && document.hidden)) return;
    busy = true;
    try {
      if (previousWallMs !== null) elapsedEms += Math.max(0, wallMs - previousWallMs) * displayRate;
      previousWallMs = wallMs;
      const phase = phaseAt(elapsedEms);
      phaseSnapshot = phase;
      runtime.setState(asState(phase));
      const submitted = await runtime.submit();
      if (stopped || (typeof document !== 'undefined' && document.hidden)) return;
      const nextWallMs = now();
      const projectedElapsed = elapsedEms + Math.max(0, nextWallMs - wallMs) * displayRate;
      const currentPhase = phaseAt(projectedElapsed);
      const currentState = runtime.snapshot().lastSubmitted;
      const stageMatches = currentState?.stage === phase.stage && Math.abs((currentState?.ageSeconds ?? 0) * 1000 - (phase.kind ? phase.ageMs : 0)) < 1;
      if (!submitted || !stageMatches) throw new Error('Barrier frame was not confirmed at the adapter phase age');
      if (phase.kind) {
        const ageMs = phase.ageMs + Math.max(0, nextWallMs - wallMs) * displayRate;
        const causeId = `barrier-r10-gallery-${phase.cycle}-${phase.name}`;
        await runtime.sound.sync(phase.kind, causeId, {
          ageMs,
          rate: displayRate,
          submitted: true,
          wallNowMs: nextWallMs,
        });
        lastReceipt = { causeId, kind: phase.kind, ageMs, rate: displayRate, submitted: true, expiredBeforeAudio: ageMs >= phase.durationMs };
      } else if (lastReceipt && !lastReceipt.stopped) {
        const duration = lastReceipt.kind === 'break' ? 480 : 650;
        if (phase.name === 'stable-after-create' || phase.name === 'stable-after-hit' || phase.name === 'off') {
          await runtime.sound.sync(lastReceipt.kind, lastReceipt.causeId, {
            ageMs: duration,
            rate: displayRate,
            submitted: true,
            wallNowMs: nextWallMs,
          });
          lastReceipt = { ...lastReceipt, stopped: true, expiredAtMs: duration };
        }
      }
      frameCount++;
      phaseSnapshot = { ...phase, submitted: true, submitId: currentState.submitId, frameCount };
      const prior = phaseHistory.at(-1);
      if (!prior || prior.cycle !== phase.cycle || prior.name !== phase.name) {
        phaseHistory.push({cycle:phase.cycle,name:phase.name,ageMs:phase.ageMs,stage:phase.stage,submitId:currentState.submitId,elapsedEms});
      }
    } catch (error) {
      lastError = String(error?.stack ?? error);
      stopped = true;
    } finally {
      busy = false;
      if (!stopped && typeof document !== 'undefined' && !document.hidden) requestId = raf(publishFrame);
    }
  }

  const onVisibility = async () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      previousWallMs = null;
      if (requestId) cancelRaf(requestId);
      requestId = 0;
      const context = runtime.sound.context;
      if (context?.state === 'running') await context.suspend();
      return;
    }
    const context = runtime.sound.context;
    if (context && runtime.sound.unlocked && !runtime.sound.muted && context.state === 'suspended' && !verification) await context.resume();
    previousWallMs = null;
    if (!stopped && !requestId) requestId = raf(publishFrame);
  };

  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  if (typeof window !== 'undefined') {
    window.__gallerySfx = bridge;
    runtime.sound.arm?.(target);
  }

  const api = {
    start() {
      if (stopped) throw new Error('Cannot restart a disposed Barrier gallery loop');
      if (!requestId && !(typeof document !== 'undefined' && document.hidden)) requestId = raf(publishFrame);
      return api.snapshot();
    },
    async dispose() {
      if (stopped) return;
      stopped = true;
      if (requestId) cancelRaf(requestId);
      requestId = 0;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
      runtime.sound.dispose();
      runtime.destroy();
    },
    snapshot() {
      return {
        running: !stopped,
        verification,
        rate: displayRate,
        elapsedEms,
        cycleMs: BARRIER_GALLERY_CYCLE_MS,
        frameCount,
        phase: phaseSnapshot,
        phaseHistory: phaseHistory.slice(),
        lastReceipt,
        lastError,
        runtime: runtime.snapshot(),
      };
    },
  };
  return api;
}

