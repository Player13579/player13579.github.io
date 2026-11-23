const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");
const offlineRuntime = read("offline-runtime.js");
const version = offlineRuntime.match(/const OFFLINE_WORKER_VERSION = "([^"]+)"/)[1];

function appFunction(name, nextName) {
  const start = app.indexOf("function " + name + "(");
  const end = app.indexOf("function " + nextName + "(", start + 1);
  assert.ok(start >= 0 && end > start, name);
  return app.slice(start, end);
}

function harness(transport) {
  let now = 1_800_000_000_000;
  class TestDate extends Date {
    static now() { return now; }
  }
  const platform = {
    Date: TestDate, URL, queueMicrotask, setTimeout, clearTimeout,
    setInterval() {},
    console: { log() {}, warn() {}, error() {} },
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
      worker.postMessage = (data) => queueMicrotask(() => {
        this.listeners.get("message")?.({ data });
      });
      vm.runInContext(read("offline-server-worker-" + version + ".js"), worker);
    }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    postMessage(data) {
      queueMicrotask(() => this.receive({ data }));
    }
    terminate() { this.listeners.clear(); }
  }

  const authority = vm.createContext({
    ...platform, Worker: WorkerBridge, document: { baseURI: "https://example.test/" }
  });
  if (transport === "main") {
    authority.window = authority;
    vm.runInContext(read("offline-server-main-" + version + ".js"), authority);
  }
  vm.runInContext(offlineRuntime, authority);
  const runtime = new authority.DVAOffline.OfflineApiClient({ hasActiveRoom: () => true });

  async function openRoom(identity) {
    const clientId = "acc-ack-" + identity;
    const opened = await runtime.request("/api/matchmake", {
      clientId, name: "Test" + identity, mapId: "station", offlineFallback: true
    });
    assert.equal(opened?.phase, "selecting", opened?.error);
    const keys = { clientId, roomId: opened.roomId, playerId: opened.playerId };
    const request = async (route, body) => {
      const result = await runtime.request(route, { ...keys, ...body });
      assert.equal(result?.ok, true, result?.error);
      return result;
    };
    const select = async () => {
      const result = await request("/api/operator", { operatorId: "operator-fighter" });
      assert.equal(result.phase, "playing");
      now = result.preparationEndsAt + 100;
      return result;
    };
    await select();
    return { request, select, ...keys };
  }

  return {
    openRoom,
    advance: (milliseconds = 1) => { now += milliseconds; },
    now: () => now,
    close: () => runtime.stop()
  };
}

function browserConsumer(snapshot, movementSession) {
  const button = {
    textContent: "",
    firstChild: { nodeType: 3 },
    childNodes: [{}],
    classList: { toggle() {} },
    dataset: {},
    getAttribute(name) { return this[name]; },
    setAttribute(name, value) { this[name] = value; }
  };
  const data = structuredClone(snapshot);
  const rendered = {
    speedMultiplier: data.self.speedMultiplier,
    predictionLeadMultiplier: data.self.speedMultiplier,
    predictionLeadUntil: 1
  };
  const state = {
    data, movementSession, lastMovementServerNow: 0,
    lastStateServerNow: data.serverNow, lastMoveAppliedSeq: 0,
    lastMoveAppliedClock: 0, movementStopPendingSeq: 0,
    renderPlayers: new Map([[data.selfId, rendered]])
  };
  const browser = vm.createContext({
    state, performance, els: { movementAccControl: {}, movementAccToggleButton: button }
  });
  vm.runInContext(appFunction("syncMovementAccControl", "toggleMovementAcc").replace(/async\s*$/, ""), browser);
  vm.runInContext(appFunction("applyMovementAck", "isDashing"), browser);
  vm.runInContext("syncMovementAccControl(state.data)", browser);
  return { state, rendered, button, apply: vm.runInContext("applyMovementAck", browser) };
}

const projectionKeys = [
  "movementAccEnabled", "movementAccActive", "movementAccAvailable",
  "movementAcc", "movementAccMax", "movementAccThreshold",
  "speedMultiplier", "accelerationMultiplier", "actorTimeScale"
];
const projection = (data) => projectionKeys.map((field) => data[field]);
const position = (actor) => [actor.x, actor.y, actor.moveX, actor.moveY];
const input = (session, seq, elapsed, additional = {}) => ({
  movementSession: session, movementSeq: seq, movementClock: elapsed,
  dx: 1, dy: 0, ...additional
});

for (const transport of ["main", "worker"]) {
  test(transport + " preserves the newer ACC projection while acknowledging old dash input", async (t) => {
    const authority = harness(transport);
    t.after(authority.close);
    const room = await authority.openRoom("old");
    await room.request("/api/move", input("current", 1, 10, { dash: true }));
    authority.advance(20);
    const ack = await room.request("/api/move", input("current", 2, 30, { dash: true }));
    assert.equal(ack.movementMode, "dash");
    authority.advance(20);
    const off = await room.request("/api/movement-acc", { enabled: false });
    const view = browserConsumer(off, "current");
    const self = view.state.data.self;
    const player = view.state.data.players.find(({ id }) => id === off.selfId);
    const oldSelf = projection(self);
    const oldPlayer = projection(player);
    const speed = view.rendered.speedMultiplier;
    view.state.movementStopPendingSeq = 2;
    view.apply(ack);
    assert.ok(ack.serverNow < off.serverNow);
    assert.deepEqual(projection(self), oldSelf);
    assert.deepEqual(projection(player), oldPlayer);
    assert.equal(view.button["aria-pressed"], "false");
    assert.equal(view.rendered.speedMultiplier, speed);
    assert.equal(view.rendered.predictionLeadUntil, 1);
    assert.equal(self.movementMode, "dash");
    assert.deepEqual(position(player), position(ack));
    assert.deepEqual([view.rendered.targetX, view.rendered.targetY], [ack.x, ack.y]);
    assert.deepEqual([view.rendered.moveX, view.rendered.moveY], [ack.moveX, ack.moveY]);
    assert.equal(self.stamina, ack.stamina);
    assert.equal(view.state.lastMoveAppliedSeq, 2);
    assert.equal(view.state.lastMoveAppliedClock, 30);
    assert.equal(view.state.movementStopPendingSeq, 0);
  });

  test(transport + " continues to apply a newer ACK and accepts the existing equal-time path", async (t) => {
    const authority = harness(transport);
    t.after(authority.close);
    const room = await authority.openRoom("same");
    await room.request("/api/move", input("current", 1, 10, { slow: true }));
    authority.advance(20);
    const off = await room.request("/api/movement-acc", { enabled: false });
    await room.request("/api/movement-acc", { enabled: true });
    const tied = await room.request("/api/move", input("current", 2, 30, { slow: true }));
    assert.equal(tied.serverNow, off.serverNow);
    const view = browserConsumer(off, "current");
    view.apply(tied);
    assert.equal(view.button["aria-pressed"], "true");
    assert.equal(view.state.data.self.movementMode, "slow");

    authority.advance(20);
    await room.request("/api/movement-acc", { enabled: false });
    await room.request("/api/move", input("current", 3, 50));
    authority.advance(20);
    const newer = await room.request("/api/move", input("current", 4, 70));
    view.apply(newer);
    assert.equal(view.state.data.self.movementMode, "walk");
    assert.equal(view.state.data.self.movementAccEnabled, false);
    assert.equal(view.button["aria-pressed"], "false");
    assert.equal(view.state.lastMovementServerNow, newer.serverNow);
    assert.equal(view.rendered.speedMultiplier, newer.speedMultiplier);
  });

  test(transport + " keeps room identity and protects the ACC reset after operator reselect", async (t) => {
    const authority = harness(transport);
    t.after(authority.close);
    const first = await authority.openRoom("alpha");
    await first.request("/api/movement-acc", { enabled: false });
    const oldAck = await first.request("/api/move", input("first", 1, 10));
    authority.advance(20);
    const selecting = await first.request("/api/operator-reselect", { localOffline: true });
    assert.equal(selecting.phase, "selecting");
    const selected = await first.select();
    assert.equal(selected.self.movementAccEnabled, true);
    const view = browserConsumer(selected, "first");
    view.apply(oldAck);
    assert.equal(view.state.data.self.movementAccEnabled, true);
    assert.equal(view.state.lastMoveAppliedSeq, 1);
    const second = await authority.openRoom("beta");
    const secondSnapshot = await second.request("/api/state");
    const otherRoom = browserConsumer(secondSnapshot, "second");
    otherRoom.apply(oldAck);
    assert.equal(otherRoom.state.lastMoveAppliedSeq, 0);
    assert.equal(otherRoom.state.data.self.movementAccEnabled, true);
    await second.request("/api/move", input("second", 1, 10));
    authority.advance(20);
    const freshAck = await second.request("/api/move", input("second", 2, 30));
    otherRoom.apply(freshAck);
    assert.equal(otherRoom.state.lastMoveAppliedSeq, 2);
    assert.equal(otherRoom.state.data.self.movementMode, "walk");
  });
}
