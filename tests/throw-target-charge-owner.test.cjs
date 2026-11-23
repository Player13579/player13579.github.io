const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const app = read("app.js");
const runtimeSource = read("offline-runtime.js");
const version = runtimeSource.match(/const OFFLINE_WORKER_VERSION = "([^"]+)"/)[1];

function appSection(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, start);
  return app.slice(from, to);
}

const throwMovement = app.indexOf("if (beginThrowTargetMovement(event)) return;");
const throwKeydownStart = app.lastIndexOf("    if (!typingField && ", throwMovement);
assert.ok(throwMovement > throwKeydownStart && throwKeydownStart >= 0);
const throwKeydown = appSection(
  app.slice(throwKeydownStart, app.indexOf("\n", throwKeydownStart)),
  "    if (!typingField && beginClairvoyanceMovement"
);
const clientSource = [
  appSection("function enhanceActionForElement(", "function abilityBatchSource("),
  appSection("function beginThrowTargetMovement(", "function clairvoyanceFollowCandidates("),
  appSection("function beginEnhanceAction(", "function triggerVendingHotkey("),
  appSection("function clientEnhanceLevel(", "function throwLandingWebGPUScene("),
  appSection("function releaseRejectedActionTransientInput(", "async function loadDropoffAnalytics("),
  appSection("function isCurrentRoomSession(", "function invalidateFocusResync("),
  appSection("function cancelTransientGameInputForBackground(", "function returnExpiredOnlineRoomToMatchmaking("),
  appSection('  window.addEventListener("keyup", (event) => {\n    const releasedMovementKey', '  window.addEventListener("blur", () => {\n    cancelCommonActionGestures'),
  appSection("  const bindEnhanceButton = (button, kind) => {", '  window.addEventListener("pointerup", (event) => {\n    // The control-local'),
  appSection('  window.addEventListener("blur", () => {\n    cancelCommonActionGestures', '  window.addEventListener("focus", () => void recoverRoomInteractionAfterBackground()'),
  appSection("function setExpandedMapOpen(", "function minimapCanvasBounds("),
  "function throwKeydown(event) { const typingField = false;\n" + throwKeydown + "\nreturn triggerItemHotkey(event); }",
  "state.throwTargeting = emptyThrowTargetingState();"
].join("\n");

const charge = "/api/enhance-charge";
const throwItem = "/api/item-throw";

async function createHarness(t, transport) {
  let now = 1_800_000_000_000;
  class TestDate extends Date { static now() { return now; } }
  const noOp = () => {};
  const platform = {
    Date: TestDate, URL, queueMicrotask, setTimeout, clearTimeout, setInterval: noOp,
    console: { log: noOp, warn: noOp, error: noOp },
    async fetch(url) {
      assert.match(String(url), /^data:/);
      return { ok: true, async json() { return {}; } };
    }
  };
  class WorkerBridge {
    constructor() {
      this.listeners = new Map();
      const worker = vm.createContext({ ...platform });
      worker.self = worker;
      worker.addEventListener = (_, listener) => { this.receive = listener; };
      worker.postMessage = (data) => queueMicrotask(() => this.listeners.get("message")?.({ data }));
      vm.runInContext(read("offline-server-worker-" + version + ".js"), worker);
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    postMessage(data) { queueMicrotask(() => this.receive({ data })); }
    terminate() { this.listeners.clear(); }
  }
  const authority = vm.createContext({
    ...platform, Worker: WorkerBridge, document: { baseURI: "https://example.test/" }
  });
  if (transport === "main") {
    authority.window = authority;
    vm.runInContext(read("offline-server-main-" + version + ".js"), authority);
  }
  vm.runInContext(runtimeSource, authority);
  const runtime = new authority.DVAOffline.OfflineApiClient({ hasActiveRoom: () => true });
  t.after(() => runtime.stop());

  let clientId = 0;
  async function newRoom() {
    const result = await runtime.request("/api/solo/start", {
      clientId: "throw-test-" + String(++clientId), name: "Repro", missionId: "combat"
    });
    assert.equal(result?.phase, "playing", result?.error);
    now = Math.max(now, result.preparationEndsAt + 100);
    return result;
  }
  const snapshot = await newRoom();
  const state = {
    roomId: snapshot.roomId, playerId: snapshot.playerId, roomSessionGeneration: 1,
    screen: "game", data: snapshot, enhanceHold: {}, facing: new Map(), movementKeyDirections: new Map(), keys: new Set(),
    throwChargeOperation: null, continuousActionKeyAt: new Map(), preparationRosterEntries: new Map(), clairvoyance: {},
    rejectedActionRecovery: {}, quantumKineticHold: {}, tabletGesture: {}
  };
  assert.equal(snapshot.self.itemInventory.find((item) => item.id === "frag-grenade").amount, 1);

  const calls = [], listeners = {}, frames = new Map(), controls = new Map();
  const makeControl = (name) => ({
    disabled: false,
    classList: { add: noOp },
    setPointerCapture: noOp,
    addEventListener(type, listener) { controls.set(name + ":" + type, listener); }
  });
  let frame = 0;
  let oneDelay = null;
  let reject = null;
  let checks = true;
  const els = {
    itemSelect: { value: "frag-grenade" }, itemControl: { hidden: false },
    itemUseButton: makeControl("use"), itemThrowButton: makeControl("throw"),
    fireJutsuButton: makeControl("fire"), tabletFireShortcut: makeControl("tablet-fire"),
    expandedMapOverlay: {}, mapActionButton: { setAttribute: noOp }
  };
  const client = vm.createContext({
    state, els, Element: class {}, document: { activeElement: null },
    window: { clearTimeout: noOp, addEventListener(type, listener) { listeners[type] = listener; } },
    performance: { now: () => now - 1_800_000_000_000 + 10 },
    requestAnimationFrame(callback) { frames.set(++frame, callback); return frame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    clearMovementInput: noOp, rotateMovementSession: noOp, sendMovement: noOp,
    updateEnhanceReadout: noOp, syncClairvoyanceManaUsage: noOp, showToast: noOp,
    movementKeyOwner: (event) => event.code, stopRootShortcutKeyHold: noOp, stopAbilityBatchKeyHold: noOp,
    stopContinuousActionKeyHold: noOp, releaseClairvoyanceMovement: noOp, syncMovementInputImmediately: noOp,
    renderedPlayer: (player) => player, getDirection: () => ({ dx: 0, dy: 0 }),
    isClientWalkable: () => checks, clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    ENHANCE_MAX_LEVEL_CLIENT: 1, ENHANCE_HOLD_STEP_MS_CLIENT: 500, ITEM_THROW_BASE_DISTANCE_CLIENT: 100,
    enhanceGestureContext: null, IS_VERIFICATION_MODE: false, CHARACTER_ACTION_BY_API: {}, webgpuTitlePrewarm: {},
    clientStorage: { setItem: noOp }, storage: {},
    setPreparationEditingField: noOp, clearClairvoyanceCameraInput: noOp, invalidateFocusResync: noOp,
    cancelCommonActionGestures: noOp, cancelActiveRootShortcutHolds: noOp, cancelActiveAbilityBatchHolds: noOp,
    stopContinuousActionHold: noOp, closeSwitchDragMenu: noOp, clearNativeSelectHold: noOp, clearLocalGunTrigger: noOp,
    stopVendingHold: noOp, closeQuantumKineticHold: noOp,
    vendingHold: {}, pendingTabletMapRestore: null, expandedMapGpuRuntime: null, syncExpandedMapUi: noOp,
    applyState(result) { state.data = result; },
    async request(route, body) {
      const delay = oneDelay?.matches(route, body) ? oneDelay : null;
      if (delay) oneDelay = null;
      const fail = reject?.matches(route, body) ? reject : null;
      if (fail) reject = null;
      const sent = fail?.rewrite ? fail.rewrite(body) : body;
      const result = await runtime.request(route, sent);
      calls.push({ route, body, result });
      if (delay) {
        delay.arrive(result);
        await delay.done;
      }
      return fail?.drop || !result?.ok ? null : result;
    }
  });
  vm.runInContext(clientSource, client);
  const evaluate = (source) => vm.runInContext(source, client);
  const down = evaluate("throwKeydown");
  const key = (code, value, shiftKey = false) => ({ code, key: value, shiftKey, preventDefault: noOp });
  const g = key("KeyG", "G", true);
  const s = key("KeyS", "s");
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  async function settle() {
    for (let tries = 0; tries < 25 && (state.throwChargeOperation || tries === 0); tries += 1) await flush();
    assert.equal(state.throwChargeOperation, null);
  }
  function keydownThrow() { down(g); }
  function keyupThrow() { now += 700; listeners.keyup(g); }
  async function aim() {
    keydownThrow();
    keyupThrow();
    await settle();
    assert.equal(state.throwTargeting.active, true);
    return state.throwTargeting.chargeId;
  }
  async function confirm() {
    down(s);
    listeners.keyup(s);
    await settle();
  }
  function defer(matches) {
    let arrive, release;
    const arrived = new Promise((resolve) => { arrive = resolve; });
    const done = new Promise((resolve) => { release = resolve; });
    oneDelay = { matches, arrive, done };
    return { arrived, release };
  }
  const latestThrow = () => calls.findLast(({ route }) => route === throwItem);
  const readState = () => runtime.request("/api/state", { roomId: state.roomId, playerId: state.playerId });
  return {
    state, els, evaluate, frames, calls, newRoom, readState, aim, confirm, flush, settle,
    keydownThrow, keyupThrow, latestThrow, defer,
    repeatThrowKeydown() { down({ ...g, repeat: true }); },
    keyup(code, value) { listeners.keyup(key(code, value)); },
    blur() { listeners.blur(); },
    pointer(type, pointerId) {
      controls.get("throw:" + type)({
        pointerId, pointerType: "mouse", button: 0, cancelable: true, preventDefault: noOp
      });
    },
    changeWalkability(value) { checks = value; },
    rejectNext(matches, options) { reject = { matches, ...options }; },
    escape() { down(key("Escape", "Escape")); },
    select(itemId) { els.itemSelect.value = itemId; evaluate("cancelThrowTargeting(true)"); },
    advance(ms) { now += ms; },
    setRoom(result) {
      client.newRoom = result;
      evaluate("setCurrentRoomSession(newRoom.roomId, newRoom.playerId); state.data = newRoom;");
    }
  };
}

const finalizing = (route, body) => route === charge && body.finalize;
const starting = (route, body) => route === charge && body.active;
const clearing = (route, body) => route === charge && !body.active && !body.finalize;
const serverCharge = async (harness) => (await harness.readState()).self.enhanceChargeId;
const itemCount = (harness, itemId = "frag-grenade") =>
  harness.state.data.self.itemInventory.find((item) => item.id === itemId)?.amount ?? 0;

for (const transport of ["main", "worker"]) {

  for (const holdMs of [100, 700]) {
    test(transport + ": only the owning pointer releases a " + holdMs + "ms throw", async (t) => {
      const h = await createHarness(t, transport);
      h.pointer("pointerdown", 17);
      h.advance(holdMs);
      h.keydownThrow();
      h.repeatThrowKeydown();
      h.keyup("KeyG", "g");
      h.keyup("KeyV", "v");
      h.keyup("KeyF", "f");
      h.pointer("pointerdown", 29);
      h.pointer("pointerup", 29);
      await h.flush();
      assert.equal(h.state.enhanceHold.pointerId, 17);
      assert.equal(h.state.throwTargeting.active, false);
      assert.equal(h.calls.filter(({ route, body }) => starting(route, body)).length, 1);
      assert.equal(h.calls.filter(({ route, body }) => finalizing(route, body)).length, 0);
      h.pointer("pointerup", 17);
      h.pointer("click", 17);
      await h.settle();
      assert.equal(h.state.throwTargeting.holdMs, holdMs);
      assert.equal(h.calls.filter(({ route, body }) => finalizing(route, body)).length, 1);
      await h.confirm();
      assert.equal(h.latestThrow().result.status, 200);
      assert.equal(itemCount(h), 0);
      assert.equal(h.calls.filter(({ route }) => route === throwItem).length, 1);
    });
  }

  test(transport + ": exact physical keyboard release survives changed modifiers and repeats", async (t) => {
    const h = await createHarness(t, transport);
    h.keydownThrow();
    h.repeatThrowKeydown();
    h.pointer("pointerdown", 17);
    h.pointer("pointerup", 17);
    h.keyup("KeyF", "f");
    h.keyup("KeyV", "v");
    h.keyup("ShiftLeft", "Shift");
    h.advance(700);
    await h.flush();
    assert.equal(h.state.enhanceHold.inputSource, "keyboard");
    assert.equal(h.state.throwTargeting.active, false);
    h.keyup("KeyG", "g");
    h.keyup("KeyG", "g");
    await h.settle();
    assert.equal(h.state.throwTargeting.holdMs, 700);
    assert.equal(h.calls.filter(({ route, body }) => starting(route, body)).length, 1);
    assert.equal(h.calls.filter(({ route, body }) => finalizing(route, body)).length, 1);
    assert.equal(await serverCharge(h), h.state.throwTargeting.chargeId);
  });

  for (const interruption of ["pointer cancellation", "expanded map", "blur", "room replacement"]) {
    test(transport + ": " + interruption + " discards physical input and permits a new hold", async (t) => {
      const h = await createHarness(t, transport);
      h.pointer("pointerdown", 17);
      await h.flush();
      h.advance(700);
      if (interruption === "pointer cancellation") h.pointer("pointercancel", 17);
      else if (interruption === "expanded map") h.evaluate("setExpandedMapOpen(true, { focus: false })");
      else if (interruption === "blur") h.blur();
      else h.setRoom(await h.newRoom());
      h.keyup("KeyG", "g");
      h.pointer("pointerup", 17);
      await h.settle();
      assert.equal(h.state.throwTargeting.active, false);
      assert.equal(await serverCharge(h), "");
      assert.equal(itemCount(h), 1);
      assert.equal(h.calls.filter(({ route, body }) => finalizing(route, body)).length, 0);
      if (interruption === "expanded map") h.evaluate("setExpandedMapOpen(false, { focus: false })");
      await h.aim();
      assert.equal(await serverCharge(h), h.state.throwTargeting.chargeId);
    });
  }

  test(transport + ": replacement keeps the new charge and consumes one grenade exactly once", async (t) => {
    const h = await createHarness(t, transport);
    const original = await h.aim();
    const replaced = await h.aim();
    assert.notEqual(replaced, original);
    assert.equal(await serverCharge(h), replaced);
    assert.ok(!h.calls.some(({ route, body }) => clearing(route, body)));
    await h.confirm();
    assert.equal(h.latestThrow().body.chargeId, replaced);
    assert.equal(h.latestThrow().result.status, 200);
    assert.equal(itemCount(h), 0);
    assert.equal(await serverCharge(h), "");
    assert.equal(h.calls.filter(({ route }) => route === throwItem).length, 1);
  });

  test(transport + ": delayed replacement cannot confirm the old aim, and a third hold cannot overlap", async (t) => {
    const h = await createHarness(t, transport);
    const original = await h.aim();
    const delayed = h.defer(finalizing);
    h.keydownThrow();
    h.keyupThrow();
    const result = await delayed.arrived;
    assert.equal(h.state.throwTargeting.chargeId, original);
    assert.equal(await h.evaluate("confirmThrowTargeting()"), false);
    h.keydownThrow();
    assert.equal(h.calls.filter(({ route, body }) => starting(route, body)).length, 2);
    delayed.release();
    await h.settle();
    assert.equal(h.state.throwTargeting.chargeId, result.self.enhanceChargeId);
    await h.confirm();
    assert.equal(h.latestThrow().result.status, 200);
  });

  for (const cancel of ["escape", "background", "item change"]) {
    test(transport + ": " + cancel + " revokes an already submitted finalize", async (t) => {
      const h = await createHarness(t, transport);
      await h.aim();
      const delayed = h.defer(finalizing);
      h.keydownThrow();
      h.keyupThrow();
      await delayed.arrived;
      if (cancel === "escape") h.escape();
      else if (cancel === "background") h.evaluate("cancelTransientGameInputForBackground()");
      else h.select("stun-grenade");
      assert.equal(h.state.throwTargeting.active, false);
      h.keydownThrow();
      delayed.release();
      await h.settle();
      assert.equal(h.state.throwTargeting.active, false);
      assert.equal(await serverCharge(h), "");
      assert.equal(itemCount(h), 1);
      assert.equal(h.calls.filter(({ route, body }) => starting(route, body)).length, 2);
      assert.equal(h.calls.filter(({ route, body }) => clearing(route, body)).length, 1);
      assert.ok(!h.latestThrow());
      await h.aim();
      await h.confirm();
      assert.equal(h.latestThrow().result.status, 200);
      assert.equal(h.latestThrow().body.itemId, h.els.itemSelect.value);
    });
  }

  test(transport + ": cancelling a physical hold waits for its start acknowledgement and clears once", async (t) => {
    const h = await createHarness(t, transport);
    await h.aim();
    const delayed = h.defer(starting);
    h.keydownThrow();
    await delayed.arrived;
    assert.equal(h.evaluate('cancelEnhanceAction("throw")'), true);
    h.keydownThrow();
    delayed.release();
    await h.settle();
    assert.equal(h.state.throwTargeting.active, false);
    assert.equal(await serverCharge(h), "");
    assert.equal(h.calls.filter(({ route, body }) => starting(route, body)).length, 2);
    assert.equal(h.calls.filter(({ route, body }) => clearing(route, body)).length, 1);
  });

  for (const failure of ["rejected", "timeout after server success"]) {
    test(transport + ": finalize " + failure + " leaves no aim or server charge", async (t) => {
      const h = await createHarness(t, transport);
      await h.aim();
      if (failure === "rejected") h.rejectNext(finalizing, { rewrite: (body) => ({ ...body, chargeId: "stale" }) });
      else h.rejectNext(finalizing, { drop: true });
      h.keydownThrow();
      h.keyupThrow();
      await h.settle();
      assert.equal(h.state.throwTargeting.active, false);
      assert.equal(await serverCharge(h), "");
      assert.equal(itemCount(h), 1);
      assert.ok(!h.latestThrow());
      await h.aim();
      await h.confirm();
      assert.equal(h.latestThrow().result.status, 200);
    });
  }

  test(transport + ": old finalize cannot reopen an aim or clear a charge after room replacement", async (t) => {
    const h = await createHarness(t, transport);
    const delayed = h.defer(finalizing);
    h.keydownThrow();
    h.keyupThrow();
    await delayed.arrived;
    const replacement = await h.newRoom();
    h.setRoom(replacement);
    const current = await h.aim();
    delayed.release();
    await h.flush();
    assert.equal(h.state.throwTargeting.chargeId, current);
    assert.equal(await serverCharge(h), current);
    assert.ok(!h.calls.some(({ route, body }) => clearing(route, body)));
  });

  test(transport + ": no aim timer, invalid local landing retains aim, explicit cancellation clears it", async (t) => {
    const h = await createHarness(t, transport);
    const id = await h.aim();
    h.advance(60_000);
    const tick = h.frames.get(h.state.throwTargeting.frame);
    tick(65_000);
    assert.equal(h.state.throwTargeting.chargeId, id);
    h.changeWalkability(false);
    assert.equal(await h.evaluate("confirmThrowTargeting()"), false);
    assert.equal(h.state.throwTargeting.chargeId, id);
    assert.ok(!h.latestThrow());
    h.escape();
    await h.settle();
    assert.equal(await serverCharge(h), "");
  });

  test(transport + ": another action rejection revokes the first pending aim", async (t) => {
    const h = await createHarness(t, transport);
    const delayed = h.defer(finalizing);
    h.keydownThrow();
    h.keyupThrow();
    await delayed.arrived;
    assert.equal(h.state.throwTargeting.active, false);
    assert.equal(await h.evaluate('api("/api/item-use", { itemId: "frag-grenade" })'), false);
    assert.equal(h.calls.find(({ route }) => route === "/api/item-use").result.status, 400);
    delayed.release();
    await h.settle();
    assert.equal(h.state.throwTargeting.active, false);
    assert.equal(await serverCharge(h), "");
    assert.equal(itemCount(h), 1);
  });

  test(transport + ": item-throw rejection does not consume the new item or leave a charge", async (t) => {
    const h = await createHarness(t, transport);
    await h.aim();
    h.rejectNext((route) => route === throwItem, { rewrite: (body) => ({ ...body, itemId: "uranium" }) });
    await h.confirm();
    assert.equal(h.latestThrow().result.status, 400);
    assert.equal(h.state.throwTargeting.active, false);
    assert.equal(await serverCharge(h), "");
    assert.equal(itemCount(h), 1);
  });
}
