/* Serial main-frame driver for the WebGPU presentation path. The host owns RAF,
 * visibility, and the GPU runtime. draw must check isCurrent() before submitting
 * after an await; a scheduler cannot undo GPU work already submitted by draw. */
(function (root) {
  'use strict';

  function create({ draw, onError, onDiagnostic } = {}) {
    if (typeof draw !== 'function') throw new TypeError('Main frame scheduler needs a draw function');
    if (onError !== undefined && typeof onError !== 'function')
      throw new TypeError('Main frame scheduler onError must be a function');
    if (onDiagnostic !== undefined && typeof onDiagnostic !== 'function')
      throw new TypeError('Main frame scheduler onDiagnostic must be a function');

    let state = 'ready';
    let active = null;
    let pending = null;
    let nextRequestId = 0;
    const diagnostic = onDiagnostic ? event => {
      try { onDiagnostic(event); } catch (_) { /* Diagnostics cannot change frame ownership. */ }
    } : null;

    const outcome = (status, value) => Object.freeze(
      status === 'completed' ? { status, value } : { status }
    );
    function settle(job, result) {
      if (job.settled) return;
      job.settled = true;
      if (diagnostic) diagnostic({ kind: 'settle', requestId: job.requestId,
        status: result.status, reason: result.value?.reason || null });
      job.resolve(result);
    }
    function run(job) {
      active = job;
      if (diagnostic) diagnostic({ kind: 'active-begin', requestId: job.requestId });
      const controller = new AbortController();
      job.controller = controller;
      const isCurrent = () => state === 'ready' && active === job && !controller.signal.aborted;
      // Enter draw on a microtask. A synchronous request burst still owns only
      // one active job and one replaceable pending job.
      Promise.resolve().then(() => {
        if (isCurrent()) return draw(job.scene, Object.freeze(diagnostic
          ? { signal: controller.signal, isCurrent, requestId: job.requestId }
          : { signal: controller.signal, isCurrent }));
        return undefined;
      }).then(value => {
        if (!job.settled) settle(job, isCurrent() ? outcome('completed', value) :
          outcome(state === 'destroyed' ? 'destroyed' : 'suspended'));
      }, error => {
        if (job.settled || !isCurrent()) return;
        try { onError?.(error); } catch (_) { /* Keep the draw failure authoritative. */ }
        settle(job, Object.freeze({ status: 'error', error }));
      }).finally(() => {
        if (diagnostic) diagnostic({ kind: 'active-end', requestId: job.requestId });
        if (active === job) active = null;
        if (state === 'ready' && pending) {
          const next = pending;
          pending = null;
          run(next);
        }
      });
    }
    function invalidate(reason) {
      if (pending) {
        settle(pending, outcome(reason));
        pending = null;
      }
      if (active) {
        active.controller.abort();
        settle(active, outcome(reason));
      }
    }
    function suspend() {
      if (state !== 'ready') return false;
      state = 'suspended';
      invalidate('suspended');
      return true;
    }
    function resume() {
      if (state !== 'suspended') return false;
      state = 'ready';
      return true;
    }
    function destroy() {
      if (state === 'destroyed') return;
      state = 'destroyed';
      invalidate('destroyed');
    }
    function request(scene, { hidden = false } = {}) {
      if (hidden) {
        suspend();
        return Promise.resolve(outcome(state === 'destroyed' ? 'destroyed' : 'hidden'));
      }
      if (state !== 'ready') return Promise.resolve(outcome(state));
      return new Promise(resolve => {
        const job = { scene, resolve, settled: false, controller: null,
          requestId: diagnostic ? ++nextRequestId : null };
        if (diagnostic) diagnostic({ kind: 'request', requestId: job.requestId,
          disposition: active ? 'pending' : 'active' });
        if (!active) run(job);
        else {
          if (pending) {
            if (diagnostic) diagnostic({ kind: 'pending-replaced', requestId: pending.requestId,
              replacementId: job.requestId, activeId: active.requestId });
            settle(pending, outcome('superseded'));
          }
          pending = job;
        }
      });
    }
    return Object.freeze({
      get state() { return state; },
      get busy() { return !!active; },
      get hasPending() { return !!pending; },
      request, suspend, resume, destroy
    });
  }

  const api = Object.freeze({ create });
  root.DvaWebGPUMainFrameScheduler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
