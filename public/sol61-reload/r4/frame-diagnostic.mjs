// Bounded, read-only instrumentation for root-owned diagnosis. No render or
// startup decision is made here; the caller only adds observations.
export function createReloadFrameDiagnostic({ env = globalThis, enabled = false, live = () => ({}) } = {}) {
  const events = [];
  const counts = { rafRequests: 0, rafStarts: 0, frameStarts: 0, frameEnds: 0, renderEntered: 0, renderCompleted: 0, renderSubmitted: 0 };
  let pending = false, lastPlan = null, lastRender = null, lastError = null;
  const now = () => Number(env.performance?.now?.() ?? Date.now());
  const clone = value => {
    try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
  };
  function record(type, detail = {}) {
    if (!enabled) return;
    const event = { atMs: now(), type, ...clone(live()), renderPromisePending: pending, ...clone(detail) };
    events.push(event);
    if (events.length > 32) events.splice(0, events.length - 32);
  }
  const api = {
    get enabled() { return enabled; },
    frameStart(viaRaf = false) { counts.frameStarts++; record('frame-start', { viaRaf }); },
    frameEnd() { counts.frameEnds++; record('frame-end'); },
    rafRequested() { counts.rafRequests++; record('raf-requested', { request: counts.rafRequests }); },
    rafStarted() { counts.rafStarts++; record('raf-start', { start: counts.rafStarts }); },
    plan(plan) {
      lastPlan = plan && { causeId: plan.causeId, clockKind: plan.clockKind, sourceOn: plan.sourceOn, obsOn: plan.obsOn, mainOn: plan.mainOn, visibility: plan.visibility, active: plan.active, phase: plan.phase, ageMs: plan.ageMs, pending: plan.pending };
      record('plan', { plan: lastPlan, packedGates: plan ? [plan.sourceOn ? 1 : 0, plan.obsOn ? 1 : 0, plan.mainOn ? 1 : 0, plan.visibility] : null });
    },
    renderEnter() { pending = true; counts.renderEntered++; record('render-enter', { renderEntered: counts.renderEntered }); },
    renderExit(result = null) {
      pending = false; counts.renderCompleted++;
      lastRender = result && clone(result);
      if (result?.submitted === true) counts.renderSubmitted++;
      record('render-complete', { renderCompleted: counts.renderCompleted, renderSubmitted: counts.renderSubmitted, render: lastRender });
    },
    error(error) { lastError = { name: String(error?.name || 'Error'), message: String(error?.message || error) }; pending = false; record('error', { error: lastError }); },
    snapshot() {
      return clone({ schema: 'reload-e-frame-diagnostic/v1', enabled, counts: { ...counts }, renderPromisePending: pending, lastPlan, lastRender, lastError, live: live(), events: events.slice(-32) });
    }
  };
  return Object.freeze(api);
}
