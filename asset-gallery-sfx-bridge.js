/* Bridge the gallery's user gesture to the SFX already authored by each preview.
 * The preview remains the source of sound and timing; this file adds no synthesis.
 */
(function (root) {
  'use strict';

  const SUNBEAM_ONESHOT_PREFIXES = ['sunbeam-lens-ghost-r'];
  const CYCLE_REARM_IDS = new Set(['emp-astra-zero-v1', 'stamina-astra-zero-v1']);
  const POLL_MS = 60;

  function createGallerySfxBridge({ verify = false, setIntervalFn, clearIntervalFn } = {}) {
    const schedule = setIntervalFn || root.setInterval.bind(root);
    const unschedule = clearIntervalFn || root.clearInterval.bind(root);
    let current = null;
    let generation = 0;
    let audioUnlocked = false;

    function clearLoop() {
      if (current?.timer != null) unschedule(current.timer);
      if (current) current.timer = null;
    }

    function readChild(iframe) {
      try {
        const win = iframe?.contentWindow;
        const doc = iframe?.contentDocument || win?.document;
        if (!win || !doc) return null;
        // Access location deliberately: cross-origin frames throw here and are unsupported.
        const childVerify = new URL(win.location.href).searchParams.has('verify');
        return { win, doc, childVerify };
      } catch (_) {
        return null;
      }
    }

    function itemId(item) { return String(item?.id || ''); }
    function setState(state, reason) {
      if (current) {
        current.state = state;
        current.reason = reason || '';
      }
      return { state, reason: reason || '' };
    }

    function attachFrame(iframe, item) {
      clearLoop();
      generation += 1;
      current = { iframe, item, id: itemId(item), generation, timer: null, state: 'attached', reason: '' };
      const child = readChild(iframe);
      if (!child) return setState('unavailable', 'preview is inaccessible or not ready');
      if (verify || child.childVerify) return setState('silent', 'verification mode');
      if (audioUnlocked) return activateFromGesture(iframe, item);
      return setState('ready');
    }

    function invoke(target, method, args) {
      try {
        if (typeof target?.[method] !== 'function') return false;
        // Invoke before the first await, while the caller's user activation is live.
        Promise.resolve(target[method](...args)).catch(() => {});
        return true;
      } catch (_) {
        return false;
      }
    }

    function soundControl(doc) {
      for (const selector of ['#sound', '#audio', '#enable-audio', '[data-gallery-sfx]']) {
        const button = doc.querySelector(selector);
        if (button && !button.disabled) return button;
      }
      return null;
    }

    function cycleCounter(win, id) {
      if (id === 'emp-astra-zero-v1') return win.__empAstraZeroSnapshot?.playCycle;
      if (id === 'stamina-astra-zero-v1') return win.__staminaAstraZeroSnapshot?.loopCount;
      return undefined;
    }

    function sunbeamPhase(win) {
      try {
        const phase = win.__sunbeamSnapshot?.()?.time;
        return Number.isFinite(phase) ? phase : undefined;
      } catch (_) { return undefined; }
    }

    function activateFromGesture(iframe, item) {
      if (!current || current.iframe !== iframe || current.id !== itemId(item)) attachFrame(iframe, item);
      const child = readChild(iframe);
      if (!child) return setState('unavailable', 'preview is inaccessible or not ready');
      if (verify || child.childVerify) return setState('silent', 'verification mode');

      const { win, doc } = child;
      let activated = false;
      if (itemId(item) === 'item-pickup-sol-r2') {
        activated = invoke(win, 'enableItemPickupLoopAudio', []);
      } else if (win.__gallerySfx && typeof win.__gallerySfx.activateFromGesture === 'function') {
        activated = invoke(win.__gallerySfx, 'activateFromGesture', [item]);
      } else if (win.__manaPreview) {
        activated = invoke(win.__manaPreview, 'enableAudio', []);
      } else if (win.__cooldown?.audio) {
        activated = invoke(win.__cooldown.audio, 'enable', []);
      } else if (win.__EMP__?.audio) {
        activated = invoke(win.__EMP__.audio, 'enable', []);
      }

      if (!activated) {
        const button = soundControl(doc);
        if (button) {
          try { button.click(); activated = true; } catch (_) { /* unsupported edition */ }
        }
      }

      // Several editions use the canvas itself as the gesture target; the
      // preview owns the callback and its synchronized loop after this event.
      if (!activated) {
        try {
          const canvas = doc.querySelector('canvas');
          const EventCtor = win.PointerEvent || win.MouseEvent;
          if (canvas && EventCtor) {
            canvas.dispatchEvent(new EventCtor('pointerdown', { bubbles: true }));
            activated = true;
          }
        } catch (_) { /* inaccessible or older DOM implementation */ }
      }

      if (!activated) return setState('unsupported', 'edition exposes no usable authored SFX control');
      audioUnlocked = true;

      // Lens-ghost has only an authored manual one-shot. Reuse it when the
      // preview's own phase wraps. Two older previews disarm their own sound
      // after each visual cycle; rearm when their exposed counter advances.
      const id = itemId(item);
      if (SUNBEAM_ONESHOT_PREFIXES.some(prefix => id.startsWith(prefix))) {
        const token = current.generation;
        let previousPhase = sunbeamPhase(win);
        current.timer = schedule(() => {
          if (!current || current.generation !== token || current.id !== id) return;
          const activeChild = readChild(iframe);
          if (!activeChild || verify || activeChild.childVerify) { clearLoop(); return; }
          const phase = sunbeamPhase(activeChild.win);
          if (Number.isFinite(phase) && Number.isFinite(previousPhase) && phase < previousPhase - 0.5) {
            try { soundControl(activeChild.doc)?.click(); } catch (_) { /* edition switched or failed */ }
          }
          if (Number.isFinite(phase)) previousPhase = phase;
        }, POLL_MS);
      } else if (CYCLE_REARM_IDS.has(id)) {
        let previousCycle = cycleCounter(win, id);
        const token = current.generation;
        current.timer = schedule(() => {
          if (!current || current.generation !== token || current.id !== id) return;
          const activeChild = readChild(iframe);
          if (!activeChild || verify || activeChild.childVerify) { clearLoop(); return; }
          const nextCycle = cycleCounter(activeChild.win, id);
          if (Number.isFinite(nextCycle) && Number.isFinite(previousCycle) && nextCycle !== previousCycle) {
            previousCycle = nextCycle;
            try { soundControl(activeChild.doc)?.click(); } catch (_) { /* edition switched or failed */ }
          }
        }, POLL_MS);
      }
      return setState('active', 'using the preview’s authored SFX');
    }

    function detachFrame(iframe) {
      if (iframe && current?.iframe !== iframe) return false;
      clearLoop();
      current = null;
      generation += 1;
      return true;
    }

    return Object.freeze({ attachFrame, activateFromGesture, detachFrame, get status() {
      return current ? { id: current.id, state: current.state, reason: current.reason } : { state: 'idle', reason: '' };
    } });
  }

  root.createGallerySfxBridge = createGallerySfxBridge;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createGallerySfxBridge };
})(typeof window !== 'undefined' ? window : globalThis);
