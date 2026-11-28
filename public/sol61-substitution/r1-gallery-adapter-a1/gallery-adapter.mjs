import { boot } from "./runtime.mjs";
import { parseGalleryAuth } from "./gallery-protocol.mjs";

const SCHEMA = "dva-gallery-startup/v1";
const VERSION = "substitution-sol61-r1";
const POLL_MS = 100;
const COMMANDS = new Set(["play", "hold", "resume", "stop"]);
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

// Inject standard asynchronous timer functions for CPU-only controller tests.
export function createReplayAdapter({
  windowRef = globalThis.window,
  documentRef = globalThis.document,
  setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeoutFn = handle => globalThis.clearTimeout(handle)
} = {}) {
  let stopped = false;
  let replayPaused = false;
  let attached = false;
  let runtime = null;
  let timer = null;
  let messageOwned = false;
  let pagehideOwned = false;
  const uiListeners = [];
  let incomingSequence = 0;
  let previousMode = null;
  let auth = null;
  let parent = null;
  let origin = null;
  let enabled = false;

  function clearPendingTimer() {
    const pending = timer;
    timer = null;
    if (pending !== null) {
      try { clearTimeoutFn(pending); } catch {}
    }
  }

  function stop() {
    // Close scheduling before invoking any external cleanup operation.
    stopped = true;
    clearPendingTimer();
    for (const { button, listener } of uiListeners.splice(0)) {
      try { button.removeEventListener("click", listener); } catch {}
    }
    if (messageOwned) {
      try {
        windowRef.removeEventListener("message", onMessage);
        messageOwned = false;
      } catch {}
    }
    if (pagehideOwned) {
      try {
        windowRef.removeEventListener("pagehide", onPageHide);
        pagehideOwned = false;
      } catch {}
    }
  }

  function onPageHide() {
    stop();
  }

  function onLocalStop() {
    if (stopped || !enabled) return;
    replayPaused = true;
    clearPendingTimer();
  }

  function onLocalPlay() {
    if (stopped || !enabled) return;
    replayPaused = false;
    try {
      if (attached) schedule();
    } catch {
      stop();
    }
  }

  function addUIListener(id, listener) {
    if (!documentRef || typeof documentRef.getElementById !== "function") return;
    const button = documentRef.getElementById(id);
    if (!button || typeof button.addEventListener !== "function" ||
        typeof button.removeEventListener !== "function") return;
    // Record ownership first so a registration failure also gets cleanup.
    uiListeners.push({ button, listener });
    button.addEventListener("click", listener);
  }

  function onMessage(event) {
    try {
      if (stopped || !enabled || !origin || event.source !== parent || event.origin !== origin) return;
      const data = event.data;
      if (!data || data.schema !== SCHEMA || data.versionId !== VERSION ||
          data.versionId !== auth.versionId || data.token !== auth.token ||
          data.attemptEpoch !== (auth.attemptEpoch ?? auth.epoch)) return;

      // Mirror native incoming-sequence acceptance without executing commands
      // or consuming the event. The runtime protocol remains their sole owner.
      if (data.action === "retire") {
        if (data.sequence !== undefined &&
            (!positiveInteger(data.sequence) || data.sequence <= incomingSequence)) return;
        if (data.sequence !== undefined) incomingSequence = data.sequence;
        stop();
        return;
      }
      if (!COMMANDS.has(data.action) || !positiveInteger(data.sequence) ||
          data.sequence <= incomingSequence) return;
      incomingSequence = data.sequence;

      if (data.action === "stop") {
        replayPaused = true;
        clearPendingTimer();
      } else if (data.action === "play") {
        replayPaused = false;
        if (attached) schedule();
      }
    } catch {
      stop();
    }
  }

  function schedule() {
    if (stopped || replayPaused || timer !== null) return;
    timer = setTimeoutFn(poll, POLL_MS);
  }

  function poll() {
    timer = null;
    if (stopped || replayPaused) return;
    try {
      const snapshot = runtime.getSnapshot();
      if (!snapshot || snapshot.startState !== "fulfilled" ||
          snapshot.retireState !== "active" || snapshot.mode === "retired" ||
          snapshot.mode === "error") {
        stop();
        return;
      }
      const becameIdle = snapshot.mode === "idle" && previousMode !== "idle";
      previousMode = snapshot.mode;
      if (becameIdle && !stopped && !replayPaused) {
        // No fixture, phase, timing, audio, or input manipulation.
        if (runtime.controls.play() === true) previousMode = "playing";
      }
      schedule();
    } catch {
      stop();
    }
  }

  try {
    if (windowRef) {
      const search = windowRef.location.search;
      auth = parseGalleryAuth(search);
      const values = new URLSearchParams(search).getAll("galleryAutoLoop");
      enabled = auth.mode === "gallery" && values.length === 1 && values[0] === "1";
      if (enabled) {
        parent = windowRef.parent;
        origin = parent && parent !== windowRef && typeof windowRef.location.origin === "string"
          ? windowRef.location.origin : null;
        // Install before awaiting boot so retirement/pagehide during startup
        // permanently prevents this adapter from starting playback afterward.
        pagehideOwned = true;
        windowRef.addEventListener("pagehide", onPageHide);
        if (origin) {
          messageOwned = true;
          windowRef.addEventListener("message", onMessage);
        }
        // Observe local controls before boot can bind them or await GPU setup.
        // These listeners only update replay scheduling, not runtime controls.
        // A pre-boot Play records resumed state without scheduling until attached.
        addUIListener("stop", onLocalStop);
        addUIListener("play", onLocalPlay);
      }
    }
  } catch {
    stop();
  }

  function attach(value) {
    if (attached || stopped || !enabled) return;
    attached = true;
    runtime = value;
    try {
      poll();
    } catch {
      stop();
    }
  }

  return Object.freeze({ attach, stop });
}

// The technical index must disable runtime autoboot. This is the only boot call.
if (typeof window !== "undefined") {
  const adapter = createReplayAdapter({ windowRef: window });
  try {
    const runtime = await boot();
    adapter.attach(runtime);
  } catch {
    adapter.stop();
  }
}
