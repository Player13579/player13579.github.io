"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const root = join(__dirname, "..");
const appSource = readFileSync(join(root, "app.js"), "utf8");
const runtimeSource = readFileSync(join(root, "offline-runtime.js"), "utf8");
const version = runtimeSource.match(/^const OFFLINE_WORKER_VERSION = "([^"]+)";$/m)?.[1];
assert.ok(version, "The offline fallback version must come from the actual loader");
const serverSource = readFileSync(join(root, "offline-server-main-" + version + ".js"), "utf8");

function sourceBlock(start) {
  const offset = appSource.indexOf("\n" + start);
  assert.notEqual(offset, -1, start);
  const first = offset + 1;
  const last = appSource.indexOf("\n}", first);
  assert.notEqual(last, -1, start);
  return appSource.slice(first, last + (start.startsWith("const ") ? 4 : 2));
}

function clickBinding(elementName) {
  const line = appSource.split("\n").find((text) =>
    text.trimStart().startsWith("els." + elementName + '.addEventListener("click"')
  );
  assert.ok(line, "Missing live " + elementName + " binding");
  return line;
}

const appHandlers = new vm.Script([
  sourceBlock("const CHARACTER_ACTION_BY_API = "),
  sourceBlock("async function api("),
  sourceBlock("async function request("),
  sourceBlock("async function returnToTitle("),
  sourceBlock("async function leaveCurrentRoom("),
  sourceBlock("function emptyThrowTargetingState("),
  sourceBlock("function resetThrowChargeSession("),
  sourceBlock("function isCurrentRoomSession("),
  sourceBlock("function setCurrentRoomSession("),
  sourceBlock("function resetLocalSession("),
  sourceBlock("function applyState("),
  sourceBlock("function isStaleState("),
  sourceBlock("function recoverAfterRejectedAction("),
  clickBinding("empButton"),
  clickBinding("titleHomeButton"),
].join("\n"), { filename: "app-room-action-handlers.js" });

function deferred() {
  let resolve;
  const promise = new Promise((settle) => { resolve = settle; });
  return { promise, resolve };
}

function noop() {}

class TestClock extends Date {
  static now() { return 1_700_000_000_000; }
}

// Run the generated fallback server with a fixed clock and no persistent I/O.
const serverContext = vm.createContext({
  crypto: webcrypto,
  Date: TestClock,
  URL,
  queueMicrotask,
  console: { log: noop, error: noop },
  setInterval: noop,
  setTimeout: noop,
  clearTimeout: noop,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
});
serverContext.window = serverContext;
vm.runInContext(serverSource, serverContext, { filename: "generated-offline-server.js" });
const requestServer = serverContext.DVAOfflineMainThread.request;
let nextFixture = 0;

const renderAndEffectHooks = [
  "syncOperatorSelectionRetry", "stopAllEnvironmentSounds", "clearAcquisitionOverlay",
  "clearMarkerExplanation", "cancelCommonActionGestures", "detectAuthoredBotSmgReload",
  "detectAuthoredBotTaserReload", "detectAuthoredBotSniperReload", "detectAuthoredBotAssaultReload",
  "detectAuthoredBotHandgunReload", "cleanupAuthoredHandgunFire", "cancelResultRankingAudio",
  "setPreparationEditingField", "invalidateFocusResync", "closeSwitchDragMenu", "setExpandedMapOpen",
  "setKillCameraOpen", "hideOperatorDetail", "hideInventoryItemDetail", "hideChatNotification",
  "clearMysteryReveal", "resetRootBorrowedAbilitySelection", "clearMovementInput", "render",
  "detectGameSounds", "detectAttackResult", "detectLuminousResult", "detectMysteryBoxReveal",
  "detectMysteryResult", "detectWorldSounds", "syncGravityLevitationEffects", "detectHitEffects",
  "detectMagicEffects", "detectAuthoredPhiliaSniperSwitch", "detectAuthoredSophiaHandgunSwitch",
  "detectAuthoredSophiaTaserSwitch", "detectAuthoredSophiaAssaultSwitch", "detectAuthoredSophiaSmgSwitch",
  "detectAuthoredSophiaSniperSwitch", "detectAuthoredPhiliaTaserSwitch", "detectAuthoredPhiliaAssaultSwitch",
  "detectAuthoredPhiliaSmgSwitch", "detectAuthoredPhiliaHandgunSwitch", "detectKillEffects", "detectRoomChat",
  "updateMotion", "syncRenderPlayers", "reconcilePhenomenonSounds", "reconcileEnvironmentSounds",
  "syncHoverSprintLiveCountdownTicker", "updateManualVerificationBotContinuity", "recordUsageCheckpoint",
  "ensureRealtimeConnection", "scheduleUiRender",
];

async function createFixture() {
  const clientId = "room-action-owner-test-" + (++nextFixture);
  const start = await requestServer("/api/solo/start", { clientId, missionId: "emp", name: "Tester " + nextFixture });
  assert.equal(start.ok, true, start.error);

  const trace = { actions: [], toasts: [], releases: 0, resyncs: 0, cancelledFrames: [] };
  const handlers = new Map();
  const els = new Proxy({}, {
    get(nodes, name) {
      return nodes[name] ??= {
        dataset: {}, replaceChildren: noop, setAttribute: noop, classList: { remove: noop },
        addEventListener: (event, listener) => handlers.set(name + ":" + event, listener),
      };
    },
  });
  els.empPhaseSelect.value = "positive";
  const state = {
    roomId: start.roomId, playerId: start.playerId, roomSessionGeneration: 1, screen: "game",
    data: start, offlineMode: true, lastStateServerNow: start.serverNow, lastMovementServerNow: 0,
    enhanceHold: {}, throwChargeOperation: null,
  };
  for (const name of [
    "preparationRosterEntries", "motion", "facing", "walkAnimations", "gravityLevitationEffects",
    "physicalMotionPhases", "actorVisualClocks", "eVisualClocks", "characterActions", "renderPlayers",
  ]) state[name] = new Map();

  const empProduced = deferred();
  const deliverEmp = deferred();
  state.offlineClient = {
    async request(path, body) {
      const result = await requestServer(path, body);
      if (path === "/api/emp") {
        empProduced.resolve(result);
        await deliverEmp.promise;
      }
      return result;
    },
  };
  const context = vm.createContext({
    ...Object.fromEntries(renderAndEffectHooks.map((name) => [name, noop])),
    state, els, IS_VERIFICATION_MODE: false, VERIFY_REAL_SCREEN_FIXTURE_KIND: "", performance,
    pendingTabletMapRestore: null, enhanceGestureContext: null, webgpuTitlePrewarm: {},
    storage: {}, clientStorage: { setItem: noop, removeItem: noop },
    GRENADE_IMPACT_SOUND_RECEIPTS: { ids: new Set() }, WEBGPU_E_CUES: {},
    clientId: () => clientId,
    updateEnhanceReadout: noop,
    cancelAnimationFrame: (frame) => trace.cancelledFrames.push(frame),
    showToast: (message) => trace.toasts.push(message),
    switchScreenWithEffect: (next) => { state.screen = next; },
    triggerCharacterAction: (...args) => trace.actions.push(args),
    releaseRejectedActionTransientInput: () => trace.releases++,
    resyncAfterRejectedAction: () => trace.resyncs++,
  });
  appHandlers.runInContext(context);
  state.throwTargeting = vm.runInContext("emptyThrowTargetingState()", context);
  return { clientId, state, context, trace, handlers, empProduced, deliverEmp };
}

async function exitByClick(fixture) {
  fixture.handlers.get("titleHomeButton:click")();
  // The binding discards its promise. Microtasks are drained before this turn.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.state.screen, "title");
  assert.equal(fixture.state.data, null);
  assert.equal(fixture.state.roomSessionGeneration, 2);
}

test("title exit retires the room throw operation and its targeting frame", async () => {
  const fixture = await createFixture();
  const { state, trace } = fixture;
  state.throwChargeOperation = {
    roomId: state.roomId, playerId: state.playerId, roomSessionGeneration: state.roomSessionGeneration
  };
  Object.assign(state.throwTargeting, { active: true, itemId: "frag-grenade", frame: 21 });
  await exitByClick(fixture);
  assert.equal(state.throwChargeOperation, null);
  assert.equal(state.throwTargeting.active, false);
  assert.equal(state.throwTargeting.itemId, "");
  assert.equal(state.throwTargeting.frame, 0);
  assert.deepEqual(trace.cancelledFrames, [21]);
});

const cases = [
  { name: "current successful response is applied" },
  { name: "current rejection reports the error and recovers", fails: true },
  { name: "successful response after title exit is ignored", exits: true },
  { name: "rejection after title exit does not toast or recover", exits: true, fails: true },
  { name: "caller accepts a response from the current room", callerCurrent: true },
  { name: "caller vetoes a response from the current room", callerCurrent: false },
  { name: "caller acceptance cannot reinstate a revoked room", exits: true, callerCurrent: true },
  { name: "both room and caller veto the response", exits: true, callerCurrent: false },
  { name: "caller veto suppresses ordinary errors in the current room", fails: true, callerCurrent: false },
];

for (const { name, exits = false, fails = false, callerCurrent } of cases) {
  test(name, { timeout: 3000 }, async () => {
    const fixture = await createFixture();
    const { trace, state, context, handlers, empProduced, deliverEmp } = fixture;
    if (fails) {
      const seeded = await requestServer("/api/emp", {
        roomId: state.roomId, playerId: state.playerId, clientId: fixture.clientId, phase: "positive",
      });
      assert.equal(seeded.ok, true, seeded.error);
    }
    const action = callerCurrent === undefined
      ? handlers.get("empButton:click")()
      : context.api("/api/emp", { phase: "positive" }, { isCurrent: () => callerCurrent });
    const response = await empProduced.promise;
    assert.equal(response.status, fails ? 400 : 200, response.error);

    if (exits) await exitByClick(fixture);
    deliverEmp.resolve();
    const result = await action;
    const actsOnResponse = !exits && callerCurrent !== false;

    assert.equal(Boolean(result), actsOnResponse && !fails);
    assert.equal(trace.actions.length, Number(actsOnResponse && !fails));
    assert.equal(trace.releases, Number(actsOnResponse && fails));
    assert.equal(trace.resyncs, Number(actsOnResponse && fails));
    assert.equal(trace.toasts.some((message) => message.includes("EMP再充填")), actsOnResponse && fails);
    if (actsOnResponse && !fails) assert.equal(state.data, response);
    if (exits) {
      assert.equal(state.data, null);
      assert.equal(state.roomId, "");
    }
  });
}

test("the same room and player IDs cannot accept a response from a revoked generation", { timeout: 3000 }, async () => {
  const fixture = await createFixture();
  const { state, context, handlers, empProduced, deliverEmp, trace } = fixture;
  const { roomId, playerId } = state;
  const action = handlers.get("empButton:click")();
  assert.equal((await empProduced.promise).ok, true);
  await exitByClick(fixture);
  context.setCurrentRoomSession(roomId, playerId);
  assert.equal(state.roomId, roomId);
  assert.equal(state.playerId, playerId);
  assert.equal(state.roomSessionGeneration, 3);

  deliverEmp.resolve();
  assert.equal(await action, false);
  assert.equal(state.data, null);
  assert.equal(trace.actions.length, 0);
});

test("the current response is accepted while exit acknowledgement is pending", { timeout: 3000 }, async () => {
  const { state, context, handlers, empProduced, deliverEmp } = await createFixture();
  const leaveProduced = deferred();
  const deliverLeave = deferred();
  const transport = state.offlineClient;
  state.offlineClient = {
    async request(path, body) {
      const result = await transport.request(path, body);
      if (path === "/api/leave") {
        leaveProduced.resolve(result);
        await deliverLeave.promise;
      }
      return result;
    },
  };
  const action = handlers.get("empButton:click")();
  assert.equal((await empProduced.promise).ok, true);
  const leaving = context.returnToTitle();
  assert.equal((await leaveProduced.promise).ok, true);
  assert.equal(state.screen, "game");
  assert.equal(state.roomSessionGeneration, 1);

  deliverEmp.resolve();
  assert.equal((await action).ok, true);
  deliverLeave.resolve();
  assert.equal(await leaving, true);
  assert.equal(state.screen, "title");
  assert.equal(state.data, null);
});

test("initial matchmaking and solo creation work without a room; retired join still rejects", { timeout: 3000 }, async () => {
  const fixture = await createFixture();
  const { state, context, clientId } = fixture;
  await exitByClick(fixture);
  const match = await context.request("/api/matchmake", {
    name: "Initial Match", mapId: "dva14", offlineFallback: true,
  }, { forceOffline: true });
  assert.equal(match.ok, true, match.error);
  assert.ok(match.roomId && match.playerId);
  assert.equal(state.roomId, "");

  const solo = await context.request("/api/solo/start", {
    name: "Initial Match", missionId: "emp",
  }, { forceOffline: true });
  assert.equal(solo.ok, true, solo.error);
  assert.equal(solo.phase, "playing");
  assert.equal(state.roomId, "");

  const legacy = await requestServer("/api/join", { name: "Initial Match", clientId });
  assert.equal(legacy.status, 410);
  const joinResponse = await context.request("/api/join", { name: "Initial Match" }, { forceOffline: true, quiet: true });
  assert.equal(joinResponse, null);
});

test("a delayed HTTP 426 still requests a client-wide update", { timeout: 3000 }, async () => {
  const { state, context, trace } = await createFixture();
  const response = deferred();
  const sent = deferred();
  let clientUpdateNotices = 0;
  state.offlineMode = false;
  state.onlineAvailable = true;
  Object.assign(context, {
    AbortController,
    window: { setTimeout: noop, clearTimeout: noop },
    apiUrl: (path) => path,
    onlineApiHeaders: (headers) => headers,
    applyOnlineAvailabilityUi: () => clientUpdateNotices++,
    fetch: async (path, options) => {
      sent.resolve({ path, options });
      return response.promise;
    },
  });
  const action = context.api("/api/emp", { phase: "positive" }, { isCurrent: () => false });
  const { path, options } = await sent.promise;
  assert.equal(path, "/api/emp");
  assert.equal(JSON.parse(options.body).roomId, state.roomId);
  state.roomSessionGeneration++;
  response.resolve({
    status: 426,
    ok: false,
    json: async () => ({ ok: false, requiredClientRelease: true, error: "更新が必要です。" }),
  });

  assert.equal(await action, false);
  assert.equal(state.onlineAvailable, false);
  assert.equal(clientUpdateNotices, 1);
  assert.deepEqual(trace.toasts, ["更新が必要です。"]);
  assert.equal(trace.releases, 0);
});
