const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (name) => readFileSync(path.join(root, name), "utf8");
const runtime = read("offline-runtime.js");
const app = read("app.js");
const version = runtime.match(/OFFLINE_WORKER_VERSION = "([^"]+)"/)[1];
const workerFile = "offline-server-worker-" + version + ".js";
const mainFile = "offline-server-main-" + version + ".js";
const workerSource = read(workerFile);
const mainSource = read(mainFile);

function appSource(start, end) {
  const first = app.indexOf(start);
  const last = app.indexOf(end, first + 1);
  assert(first >= 0 && last > first, start);
  return app.slice(first, last);
}

const flush = () => new Promise(setImmediate);

function harness({ delayMainLoad = false, neverReady = false, allowGameFixture = false } = {}) {
  const timers = new Map();
  const posts = [];
  const held = [];
  const snapshots = [];
  const loads = [];
  const toast = [];
  const game = { offlineMode: true, roomSessionGeneration: 1, lastStateReceivedAt: 0, vendingBulkTransactions: {} };
  let holdPath = "";
  let activeWorker;
  let terminations = 0;
  let timerId = 0;
  let context;
  let client;
  let mainRequest;
  const vmGlobals = () => ({
    URL, URLSearchParams, TextEncoder, TextDecoder, crypto: globalThis.crypto, btoa, atob, queueMicrotask, structuredClone,
    setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {},
    fetch() { throw Error("The CPU fixture has no network"); },
    console: { log() {}, warn() {}, error() {} },
    location: { href: "https://player13579.github.io/?verify=offline-room-timeout-cpu" }
  });

  class WorkerBridge extends EventTarget {
    constructor(url) {
      super();
      assert.equal(url.pathname.split("/").at(-1), workerFile);
      activeWorker = this;
      const workerContext = vm.createContext({
        ...vmGlobals(),
        addEventListener: (type, listener) => {
          assert.equal(type, "message");
          this.receive = listener;
        },
        postMessage: (message) => queueMicrotask(() => {
          if (this.dead || (neverReady && message.type === "ready")) return;
          const deliver = () => this.dispatchEvent(new MessageEvent("message", { data: structuredClone(message) }));
          if (message.type === "response" && this.holdID === message.id) held.push({ result: message.result, deliver });
          else deliver();
        })
      });
      workerContext.self = workerContext;
      vm.runInContext(workerSource, workerContext, { filename: workerFile });
    }

    postMessage(message) {
      assert(!this.dead);
      posts.push({ path: message.path, body: structuredClone(message.body) });
      if (message.path === holdPath) {
        this.holdID = message.id;
        holdPath = "";
      }
      queueMicrotask(() => {
        if (!this.dead) this.receive({ data: structuredClone(message) });
      });
    }

    terminate() {
      this.dead = true;
      terminations += 1;
    }
  }

  function loadMain(script) {
    vm.runInContext(mainSource, context, { filename: mainFile });
    const main = context.DVAOfflineMainThread;
    context.DVAOfflineMainThread = {
      version: main.version,
      async request(route, body) {
        posts.push({ path: route, body: structuredClone(body) });
        const result = await main.request(route, body);
        if (route !== holdPath) return result;
        holdPath = "";
        return new Promise((resolve) => held.push({ result, deliver: () => resolve(result) }));
      }
    };
    mainRequest = context.DVAOfflineMainThread;
    script.dispatchEvent(new Event("load"));
  }

  const document = {
    hidden: false,
    baseURI: "https://player13579.github.io/",
    querySelector() { return null; },
    createElement() { return Object.assign(new EventTarget(), { dataset: {} }); },
    head: {
      append(script) {
        assert.equal(new URL(script.src).pathname.split("/").at(-1), mainFile);
        const load = () => loadMain(script);
        loads.push(load);
        if (!delayMainLoad) queueMicrotask(load);
      }
    }
  };

  context = vm.createContext({
    ...vmGlobals(), document, Event, Worker: WorkerBridge, state: game, performance,
    clientId: () => "offline-room-timeout-test",
    clientStorage: { getItem() { return null; } },
    storage: { developerIdentity: "developer" }, VERIFY_REAL_SCREEN_FIXTURE_KIND: allowGameFixture ? "vending-atomic-settlement" : "",
    IS_TRUSTED_REAL_SCREEN_FIXTURE_HOST: allowGameFixture, DVA_ECONOMY: { abilityProduct: () => null },
    enhanceGestureContext: null, IS_VERIFICATION_MODE: false, CHARACTER_ACTION_BY_API: {},
    applyState(payload) { snapshots.push(payload); game.data = payload; },
    showToast(message) { toast.push(message); },
    recoverAfterRejectedAction() {},
    setTimeout(callback, ms) {
      const id = ++timerId;
      timers.set(id, { callback, ms });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  });
  context.self = context;
  context.window = context;
  vm.runInContext(runtime, context, { filename: "offline-runtime.js" });
  vm.runInContext([
    appSource("function initializeOfflineRuntime(", "function activateOfflineMode("),
    appSource("async function request(", "function setCurrentRoomSession("),
    appSource("async function pollState(", "\nfunction "),
    appSource("function offlineRuntimeOwner(", "\n\n"),
    appSource("async function api(", "async function loadDropoffAnalytics("),
    appSource("function newVendingBulkTransactionId(", "function shopAbilityOwned("),
    appSource("async function purchaseVendingItem(", "const mapRevokedVendingClicks")
  ].join("\n"), context, { filename: "app-entrypoints.js" });
  context.initializeOfflineRuntime();
  client = game.offlineClient;

  return {
    client, context, game, held, posts, snapshots, loads, toast,
    hold(route) { holdPath = route; },
    expire(milliseconds) {
      const matching = [...timers.values()].filter((timer) => timer.ms === milliseconds);
      assert.equal(matching.length, 1);
      matching[0].callback();
    },
    get terminations() { return terminations; },
    get mainRequest() { return mainRequest; },
    workerEvent(type) { activeWorker.dispatchEvent(new Event(type)); },
    async join() {
      const data = await context.request("/api/matchmake", {
        name: "Fixture", skinId: "hood", mapId: "station", offlineFallback: true
      }, { forceOffline: true });
      assert.equal(data.phase, "selecting");
      Object.assign(game, { roomId: data.roomId, playerId: data.playerId, data });
      return { roomId: data.roomId, playerId: data.playerId };
    }
  };
}

test("ordinary polling recovers after one withheld Worker response", async () => {
  const h = harness();
  const room = await h.join();
  await h.context.pollState();
  assert.equal(h.snapshots.length, 1);
  h.hold("/api/state");
  const lost = h.context.pollState();
  await flush();
  assert.equal(h.held[0].result.status, 200);
  h.expire(20_000);
  await lost;
  h.held[0].deliver();
  assert.equal(h.snapshots.length, 1);
  assert.equal(h.terminations, 0);
  assert.equal(h.loads.length, 0);
  await h.context.pollState();
  assert.equal(h.snapshots.length, 2);
  assert.equal(h.snapshots[1].roomId, room.roomId);
});

test("a profile timeout preserves the active match", async () => {
  const h = harness();
  await h.join();
  h.hold("/api/profile");
  const lost = h.context.request("/api/profile");
  await flush();
  assert.equal(h.held[0].result.status, 200);
  h.expire(20_000);
  assert.equal(await lost, null);
  assert.equal(h.context.offlineRuntimeOwner(), "generated-worker");
  assert.equal(h.loads.length, 0);
  await h.context.pollState();
  assert.equal(h.snapshots.length, 1);
});

test("a main fallback started before matchmaking cannot replace its ready Worker", async () => {
  const h = harness({ delayMainLoad: true });
  await h.client.start();
  h.hold("/api/profile");
  const lost = h.context.request("/api/profile");
  await flush();
  h.expire(20_000);
  await flush();
  assert.equal(h.loads.length, 1);
  await h.join();
  h.loads[0]();
  assert.equal(await lost, null);
  assert.equal(h.context.offlineRuntimeOwner(), "generated-worker");
  assert.equal(h.terminations, 0);
  await h.context.pollState();
  assert.equal(h.snapshots.length, 1);
});

test("explicit stop invalidates a pending fallback and a late load", async () => {
  const h = harness({ delayMainLoad: true });
  await h.client.start();
  h.hold("/api/profile");
  const lost = h.context.request("/api/profile");
  await flush();
  h.expire(20_000);
  await flush();
  assert.equal(h.loads.length, 1);
  h.client.stop();
  h.loads[0]();
  assert.equal(await lost, null);
  assert.equal(h.client.mainThreadApi, null);
  assert.equal(h.terminations, 1);
  assert.equal(h.posts.length, 1);
  assert.equal(await h.client.start(), true);
  assert.equal(h.context.offlineRuntimeOwner(), "generated-main");
  const room = await h.join();
  assert.ok(room.roomId);
});

for (const attempts of [1, 2]) {
  test("withheld mutation acknowledgement never replays with attempts=" + attempts, async () => {
    const h = harness();
    await h.join();
    h.hold("/api/skin");
    const change = h.context.api("/api/skin", { skinId: "blue-dress" }, { attempts });
    await flush();
    assert.equal(h.held[0].result.self.skinId, "blue-dress");
    h.expire(20_000);
    assert.equal(await change, false);
    assert.equal(h.toast.length, 1);
    h.held[0].deliver();
    assert.equal(h.snapshots.length, 0);
    assert.equal(h.posts.filter((entry) => entry.path === "/api/skin").length, 1);
    await h.context.pollState();
    assert.equal(h.snapshots[0].self.skinId, "blue-dress");
  });
}

for (const mode of ["worker", "main"]) {
  test(mode + " settles a successful bulk purchase only once when its response is withheld", async () => {
    const h = harness({ allowGameFixture: true });
    if (mode === "main") {
      await h.client.start();
      assert.equal(await h.client.startMainThreadFallback(), true);
    }
    const room = await h.join();
    const playing = await h.context.request("/api/operator", { ...room, operatorId: "operator-fighter" });
    assert.equal(playing?.phase, "playing");
    const seeded = await h.context.request("/api/regression-real-screen-fixture", { ...room, kind: "vending-atomic-settlement" });
    assert.equal(seeded?.self.credits, 8);
    assert.equal(seeded.self.vendingVerification.bulkTransactionCount, 0);

    h.hold("/api/purchase");
    const button = { dataset: { drink: "mystery" } };
    const purchase = h.context.purchaseVendingItem(button, { bulk: true });
    await flush();
    const first = h.held[0].result;
    assert.equal(first.status, 200);
    assert.equal(first.ok, true);
    assert(first.self.credits > seeded.self.credits);
    assert.equal(first.self.vendingVerification.bulkTransactionCount, 1);
    assert.equal(first.self.vendingVerification.remainingMysteryRolls, 0);

    h.expire(20_000);
    const replay = await purchase;
    assert.equal(replay.ok, true);
    assert.equal(replay.self.credits, first.self.credits);
    assert.equal(replay.self.vendingVerification.bulkTransactionCount, 1);
    assert.equal(replay.self.vendingVerification.remainingMysteryRolls, 0);
    const sent = h.posts.filter((entry) => entry.path === "/api/purchase").map((entry) => entry.body);
    assert.equal(sent.length, 2);
    assert(sent[0].transactionId);
    assert.deepEqual(sent[0], sent[1]);

    h.held[0].deliver();
    await h.context.pollState();
    assert.equal(h.snapshots.length, 2);
    assert.equal(h.snapshots.at(-1).self.credits, first.self.credits);
    assert.equal(h.snapshots.at(-1).self.vendingVerification.bulkTransactionCount, 1);
    assert.equal(button.dataset.purchasePending, undefined);
    assert.equal(h.context.offlineRuntimeOwner(), "generated-" + mode);
  });
}

test("a departed room cannot replay or apply its old transaction", async () => {
  const h = harness();
  const room = await h.join();
  h.hold("/api/purchase");
  const purchase = h.context.api("/api/purchase", { bulk: true, transactionId: "old-room-fixture" },
    { attempts: 2, retryOfflineTimeout: true });
  await flush();
  assert.equal((await h.context.request("/api/leave", room)).left, true);
  Object.assign(h.game, { roomId: "", playerId: "", roomSessionGeneration: 2 });
  h.expire(20_000);
  assert.equal(await purchase, false);
  h.held[0].deliver();
  assert.equal(h.posts.filter((entry) => entry.path === "/api/purchase").length, 1);
  assert.equal(h.snapshots.length, 0);
  assert.equal(h.toast.length, 0);
});

for (const type of ["error", "messageerror"]) {
  test(type + " still retires a failed Worker and starts main fallback", async () => {
    const h = harness();
    const room = await h.join();
    h.hold("/api/state");
    const pending = h.context.pollState();
    await flush();
    h.workerEvent(type);
    await pending;
    await flush();
    assert.equal(h.terminations, 1);
    assert.equal(h.context.offlineRuntimeOwner(), "generated-main");
    assert.equal((await h.mainRequest.request("/api/state", room)).status, 404);
    assert.equal(h.snapshots.length, 0);
  });
}

test("ready timeout before joining still falls back to main", async () => {
  const h = harness({ neverReady: true });
  const joining = h.join();
  h.expire(800);
  await joining;
  assert.equal(h.context.offlineRuntimeOwner(), "generated-main");
  assert.equal(h.terminations, 1);
});

test("a live main-thread match also survives a withheld state response", async () => {
  const h = harness();
  await h.client.start();
  assert.equal(await h.client.startMainThreadFallback(), true);
  await h.join();
  h.hold("/api/state");
  const lost = h.context.pollState();
  await flush();
  assert.equal(h.held[0].result.status, 200);
  h.expire(20_000);
  await lost;
  h.held[0].deliver();
  assert.equal(h.snapshots.length, 0);
  await h.context.pollState();
  assert.equal(h.snapshots.length, 1);
  assert.equal(h.context.offlineRuntimeOwner(), "generated-main");
  assert.equal(h.loads.length, 1);
});

test("when neither startup authority becomes ready the caller receives a failed connection", async () => {
  const h = harness({ neverReady: true, delayMainLoad: true });
  const result = h.context.request("/api/matchmake", { offlineFallback: true }, { attempts: 1 });
  h.expire(800);
  await flush();
  h.expire(30_000);
  await flush();
  assert.equal(h.loads.length, 2);
  h.expire(30_000);
  assert.equal(await result, null);
  assert.equal(h.toast.length, 1);
});
