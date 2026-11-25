export const PROTOCOL = "dva-gallery-startup/v1";
export const VERSION = "substitution-sol61-r1";
export const STAGES = Object.freeze(["child-document", "adapter", "device", "assets", "pipelines", "first-frame", "playing"]);
const TOKEN = /^[0-9a-f]{32}$/;
const STAGE_SET = new Set(STAGES);
const COMMANDS = new Set(["play", "hold", "resume", "stop"]);
const DETAIL_FIELDS = new Set(["message", "reason", "error", "progress", "completed", "total", "adapter", "device", "width", "height"]);
const safePositive = n => Number.isSafeInteger(n) && n > 0;
const safeNonnegative = n => Number.isSafeInteger(n) && n >= 0;
const f32 = n => typeof n === "number" && Number.isFinite(n) && Math.fround(n) === n;

export function parseGalleryAuth(search) {
  const p = new URLSearchParams(search || "");
  const keys = ["galleryVersionId", "galleryStartupToken", "galleryAttemptEpoch"];
  const values = keys.map(k => p.getAll(k));
  if (values.every(v => v.length === 0)) return Object.freeze({ mode: "standalone" });
  if (values.some(v => v.length !== 1)) return Object.freeze({ mode: "rejected", reason: "partial-or-duplicate-auth" });
  const [versionId, token, text] = values.map(v => v[0]);
  if (versionId !== VERSION || !TOKEN.test(token) || !/^\d+$/.test(text)) return Object.freeze({ mode: "rejected", reason: "invalid-auth" });
  const epoch = Number(text);
  if (!safePositive(epoch)) return Object.freeze({ mode: "rejected", reason: "invalid-epoch" });
  return Object.freeze({ mode: "gallery", versionId, token, epoch, attemptEpoch: epoch });
}

function validReceipt(r) {
  if (!r || r.status !== "completed" || r.recorded !== true || r.submitted !== true || r.completed !== true || r.current !== true || r.mainOn !== true || r.submittedMode !== "playing" || r.sourceEligible !== true) return false;
  if (!safePositive(r.passes) || !safePositive(r.drawCalls) || !safePositive(r.serial) || !safePositive(r.causeId) || !safePositive(r.generation) || !safePositive(r.targetGeneration)) return false;
  if (!f32(r.submittedAgeMs) || r.submittedAgeMs <= 0) return false;
  if (r.queueFence == null || r.queueFenceResult?.completed !== true || r.queueFenceResult.serial !== r.serial || r.queueFenceResult.targetGeneration !== r.targetGeneration) return false;
  if (!Array.isArray(r.scopeResults) || !["validation", "outOfMemory"].every(k => r.scopeResults.some(x => x?.kind === k && x.error === null)) || r.scopeResults.some(x => !x || x.error !== null)) return false;
  if (!Array.isArray(r.uncapturedErrors) || r.uncapturedErrors.length !== 0) return false;
  const v = r.viewport;
  return !!v && [v.width, v.height, v.cssWidth, v.cssHeight].every(n => typeof n === "number" && Number.isFinite(n) && n > 0);
}

export function isFreshSourceReceipt(receipt) { return validReceipt(receipt); }

export function isReadyFrameValid(r, state) {
  if (!validReceipt(r) || !state || (state.kind !== "grant" && state.kind !== "trigger") || state.current !== true) return false;
  const submitted = state.submittedAgeMs === undefined ? state.ageMs : state.submittedAgeMs;
  const current = state.currentAgeMs;
  const limit = state.kind === "grant" ? 820 : 1200;
  const rect = state.canvasRect;
  const width = rect ? rect.width : state.canvasWidth;
  const height = rect ? rect.height : state.canvasHeight;
  const gpuTarget = state.gpu?.targetGeneration;
  return f32(submitted) && submitted > 0 && submitted < limit && r.submittedAgeMs === submitted &&
    f32(current) && current > 0 && current < limit &&
    (state.currentMode === "playing" || state.playing === true) && state.mainOn === true && state.visible === true &&
    state.canvasConnected === true && Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 &&
    state.sourceVisible === true && state.sourceOn === true && state.sourceDrawable === true &&
    safePositive(state.causeId) && safePositive(state.generation) && r.causeId === state.causeId && r.generation === state.generation &&
    safePositive(state.targetGeneration) && (gpuTarget === undefined || gpuTarget === state.targetGeneration) && r.targetGeneration === state.targetGeneration;
}

function validLifecycle(r) {
  if (!r || r.retired !== true || r.closed !== true || r.creationClosed !== true || r.initSettled !== true || r.loopStopped !== true || r.rafPending !== false || r.pendingRender !== 0 || !Array.isArray(r.cleanupErrors) || r.cleanupErrors.length !== 0) return false;
  const g = r.gpu;
  const gpuOK = !!g && g.status === "disposed" && Array.isArray(g.errors) && g.errors.length === 0 &&
    ((safeNonnegative(g.serial) && safeNonnegative(g.completedSerial) && g.completedSerial >= g.serial) ||
      (g.noDevice === true && g.serial === 0 && g.completedSerial === 0));
  const a = r.audio;
  return gpuOK && a?.closed === true && a?.closeSettled === true && a.activeVoices === 0 && a.pending === 0 &&
    (a.contextState === "absent" || a.contextState === "closed") && Array.isArray(a.cleanupErrors) && a.cleanupErrors.length === 0 && Array.isArray(a.errors);
}

export function createGalleryProtocol({ windowRef = globalThis.window, auth, onCommand = () => {}, onRetire = () => {} } = {}) {
  const valid = auth?.mode === "gallery" && auth.versionId === VERSION && TOKEN.test(auth.token || "") && safePositive(auth.attemptEpoch ?? auth.epoch);
  const epoch = auth?.attemptEpoch ?? auth?.epoch;
  const parent = windowRef?.parent;
  const origin = parent && parent !== windowRef && typeof windowRef?.location?.origin === "string" ? windowRef.location.origin : null;
  let outgoingSequence = 0, incomingSequence = 0, readySent = false, retired = false, disposed = false, retirePromise = null;

  const send = (stage, status, detail = {}, cleanupReply = false) => {
    if (!valid || !origin || disposed || retired && !cleanupReply) return false;
    const message = { schema: PROTOCOL, token: auth.token, versionId: auth.versionId, attemptEpoch: epoch, sequence: ++outgoingSequence, stage, status, ...detail };
    try { parent.postMessage(message, origin); return true; } catch { return false; }
  };
  const receive = event => {
    if (!valid || disposed || retired || !origin || event?.source !== parent || event.origin !== origin) return;
    const d = event.data;
    if (!d || d.schema !== PROTOCOL || d.versionId !== auth.versionId || d.token !== auth.token || d.attemptEpoch !== epoch) return;
    if (d.action === "retire") {
      if (d.sequence !== undefined && (!safePositive(d.sequence) || d.sequence <= incomingSequence)) return;
      if (d.sequence !== undefined) incomingSequence = d.sequence;
      const pending = retire();
      pending.catch(() => {});
      return;
    }
    if (!COMMANDS.has(d.action) || !safePositive(d.sequence) || d.sequence <= incomingSequence) return;
    incomingSequence = d.sequence;
    try { onCommand(d.action, d); } catch {}
  };
  const removeListener = () => {
    if (!disposed) windowRef?.removeEventListener?.("message", receive);
    disposed = true;
  };
  if (valid && origin && windowRef?.addEventListener) windowRef.addEventListener("message", receive);

  let retire;
  const api = {
    enabled: !!valid,
    auth,
    stage(name, detail = {}) {
      if (retired || disposed || !STAGE_SET.has(name) || !detail || typeof detail !== "object" || Array.isArray(detail)) return false;
      const bounded = {};
      for (const key of DETAIL_FIELDS) {
        const value = detail[key];
        if (typeof value === "string") bounded[key] = value.slice(0, 256);
        else if (typeof value === "boolean") bounded[key] = value;
        else if (typeof value === "number" && Number.isFinite(value)) bounded[key] = value;
      }
      return send(name, "pending", bounded);
    },
    ready(receipt, state) {
      if (readySent || retired || disposed || !isReadyFrameValid(receipt, state)) return false;
      const detail = { firstFrame: {
        recorded: true, submitted: true, completed: true, canvasConnected: true,
        passes: receipt.passes, viewportWidth: receipt.viewport.width, viewportHeight: receipt.viewport.height,
        causeId: receipt.causeId, generation: receipt.generation, sequence: receipt.serial,
        targetGeneration: receipt.targetGeneration, sourceOn: true, observerOn: state.observerOn === true,
        submittedAgeMs: receipt.submittedAgeMs, currentAgeMs: state.currentAgeMs
      } };
      if (!send("playing", "ready", detail)) return false;
      readySent = true;
      return true;
    },
    error(message) {
      if (retired || disposed) return false;
      return send("playing", "error", { error: String(message ?? "error").slice(0, 512) });
    },
    retire() { return retire(); },
    dispose() { removeListener(); }
  };
  retire = () => {
    if (retirePromise) return retirePromise;
    retired = true;
    retirePromise = (async () => {
      let result;
      try { result = await onRetire(); }
      catch (error) {
        send("playing", "error", { action: "retire-error", type: "dva-effect-retire-error", error: String(error?.message || error || "retirement failed").slice(0, 512) }, true);
        throw error;
      }
      if (!validLifecycle(result)) {
        send("playing", "error", { action: "retire-error", type: "dva-effect-retire-error", error: "invalid-lifecycle", lifecycle: result }, true);
        throw new Error("invalid retirement lifecycle");
      }
      send("playing", "cancelled", { action: "retired", type: "dva-effect-retired", lifecycle: result }, true);
      return result;
    })().finally(removeListener);
    return retirePromise;
  };
  if (valid) api.stage("child-document");
  return Object.freeze(api);
}
