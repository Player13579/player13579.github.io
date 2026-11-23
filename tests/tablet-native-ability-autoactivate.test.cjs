const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");
const app = read("app.js").replaceAll("\r\n", "\n");
const noop = () => {};

function appFunction(name) {
  const start = app.indexOf("\nfunction " + name + "(");
  assert.ok(start >= 0, name);
  const end = app.indexOf("\n}\n", start);
  assert.ok(end > start, name);
  return app.slice(start, end + 2);
}

const bindingStart = app.indexOf(
  "  [els.teleportModeSelect, els.rootAbilityBranchSelect, els.quantumKineticBranchSelect, els.teleportTargetSelect, els.empPhaseSelect].forEach((select) => {"
);
const lastBinding = '  els.operatorAbilityButton.addEventListener("click", triggerOperatorAbility);';
const bindingEnd = app.indexOf(lastBinding, bindingStart) + lastBinding.length;
assert.ok(bindingStart >= 0 && bindingEnd > bindingStart);

const source = [
  ...[
    "setTabletBranchGroup", "setTabletBranchPath", "appendTabletBranchButton", "setSelectValue",
    "renderTabletBranch", "triggerOperatorAbility", "triggerTeleportAction", "beginTeleportTargeting",
    "commitPurchasedAbilityModeSelect", "commitNativeQuantumModeSelect", "commitRootAbilityModeSelect",
    "rootAbilityModeSelectActive", "rememberSelectedOperatorMode"
  ].map(appFunction),
  app.slice(bindingStart, bindingEnd),
  'setTabletBranchGroup("operator");'
].join("\n");

class Control {
  constructor() {
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.options = [];
    this.value = "";
    this.classList = { add: noop, toggle: noop };
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  dispatchEvent(event) { this.listeners.get(event.type)?.(event); }
  click() { if (!this.disabled) this.dispatchEvent({ type: "click", detail: 1 }); }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  blur() {}
}

// Each native Flora and Gravity mode rendered by the shared tablet mode helper.
const flora = [
  ["ヒール", "heal", "/api/flora-heal", { mode: "heal", targetId: "", dx: 0, dy: 1 }],
  ["サンビーム", "sunbeam", "/api/flora-heal", { mode: "sunbeam", targetId: "other", dx: 0, dy: 1 }],
  ["インビジブル", "invisible", "/api/flora-heal", { mode: "invisible", targetId: "", dx: 0, dy: 1 }]
];
const gravity = [
  ["地点へ転移", "body", "", ["body", "self"], "転移"],
  ["対象転移", "target", "", ["target", "other"], "転移"],
  ["心臓転移", "heart", "/api/teleport", { mode: "heart", targetId: "other" }, "転移"],
  ["アクセラレート", "accelerate", "/api/gravity-time", { mode: "accelerate", targetId: "other" }, "時空制御"],
  ["ディーセラレート", "decelerate", "/api/gravity-time", { mode: "decelerate", targetId: "other" }, "時空制御"],
  ["時の番人", "time-keeper", "/api/gravity-time-keeper", undefined, "時空制御"],
  ["グラビティストーム", "storm", "/api/gravity-storm", { targetId: "other" }]
];
const branches = { flora, teleport: gravity };

function createHarness({ special, startingMode, enabled, disabled = false, rejected = false }) {
  const requests = [];
  const targeting = [];
  const writes = [];
  const responses = [];
  const els = new Proxy({}, {
    get(controls, name) { return controls[name] ??= new Control(); }
  });
  els.vendingPanel.hidden = els.utilityControl.hidden = true;
  els.teleportModeSelect.value = startingMode;
  els.teleportModeSelect.options = branches[special].map(([, value]) => ({ value }));
  els.teleportTargetSelect.value = "other";
  els.operatorAbilityButton.disabled = disabled;
  const self = { special, id: "self", alive: true, role: "defender", teleportReadyAt: 0 };
  const state = { tabletOpen: true, abilityAutoActivate: !enabled, data: { phase: "playing", self, players: [] } };
  const context = vm.createContext({
    state, els, Event, requestAnimationFrame: noop, scheduleTabletBranchLayout: noop,
    document: { createElement: () => new Control(), querySelectorAll: () => [] },
    OPERATOR_ABILITY_MODE_OPTIONS: { teleport: gravity.map(([, mode]) => [mode]) },
    selectedBorrowedOperator: () => "", selectedPurchasedShopAbility: () => null,
    estimatedServerNow: () => 1, initializeMapKeyboardPointer: noop,
    setExpandedMapOpen(open) {
      assert.equal(open, true);
      targeting.push([state.teleportTargetMode, state.teleportTargetId]);
    },
    showToast: noop, syncAbilityModeDescription: noop, ensureTeleportTargetForMode: noop,
    renderTargetOptions: noop, updateActionButtons: noop,
    clientStorage: { setItem: (...values) => writes.push(values) },
    storage: { abilityAutoActivate: "preference" },
    api(route, payload) {
      requests.push([route, payload === undefined ? undefined : JSON.parse(JSON.stringify(payload))]);
      const response = Promise.resolve(rejected ? null : { ok: true });
      responses.push(response);
      return response;
    }
  });
  vm.runInContext(source, context);
  els.abilityAutoActivateToggle.checked = enabled;
  els.abilityAutoActivateToggle.dispatchEvent(new Event("change"));
  assert.deepEqual(writes, [["preference", enabled ? "1" : "0"]]);
  assert.equal(els.abilityAutoActivateControl.dataset.enabled, enabled ? "1" : "0");
  return {
    els, requests, responses, targeting,
    clickBranch(label) {
      const node = els.tabletBranchList.children.find((button) => button.textContent === label);
      assert.ok(node, label);
      node.click();
    }
  };
}

for (const [special, modes] of Object.entries(branches)) {
  for (const [label, mode, route, expected, submenu] of modes) {
    for (const enabled of [false, true]) {
      test(special + " " + mode + ": tablet selection follows auto activation " + enabled, () => {
        const harness = createHarness({ special, startingMode: modes.find(([, other]) => other !== mode)[1], enabled });
        if (submenu) harness.clickBranch(submenu);
        harness.clickBranch(label);
        assert.equal(harness.els.teleportModeSelect.value, mode);
        const actual = route ? harness.requests : harness.targeting;
        const activation = route ? [route, expected] : expected;
        assert.deepEqual(actual, enabled ? [activation] : []);
        if (!enabled) {
          harness.els.operatorAbilityButton.click();
          assert.deepEqual(actual, [activation]);
        }
      });
    }
  }
}

test("selecting the same mode twice requests exactly one activation per explicit selection", () => {
  const harness = createHarness({ special: "flora", startingMode: "heal", enabled: true });
  harness.clickBranch("ヒール");
  assert.equal(harness.requests.length, 1);
  harness.clickBranch("ヒール");
  assert.equal(harness.requests.length, 2);
});

test("a rejected activation does not send a second request", async () => {
  const harness = createHarness({ special: "flora", startingMode: "heal", enabled: true, rejected: true });
  harness.clickBranch("サンビーム");
  assert.deepEqual(await Promise.all(harness.responses), [null]);
  assert.equal(harness.els.teleportModeSelect.value, "sunbeam");
});

test("a disabled mode button does not select or activate the mode", () => {
  const harness = createHarness({ special: "flora", startingMode: "heal", enabled: true, disabled: true });
  harness.clickBranch("サンビーム");
  assert.equal(harness.els.teleportModeSelect.value, "heal");
  assert.deepEqual(harness.requests, []);
});

test("the change listener also applies the preference to direct select changes", () => {
  for (const enabled of [false, true]) {
    const harness = createHarness({ special: "flora", startingMode: "heal", enabled });
    harness.els.teleportModeSelect.value = "invisible";
    harness.els.teleportModeSelect.dispatchEvent(new Event("change"));
    assert.equal(harness.requests.length, enabled ? 1 : 0);
  }
});

function assertCurrentAppCacheRevision(appSource, index, worker) {
  const scriptUrl = index.match(/<script src="(app\.js\?[^"]+)"/)[1];
  const query = new URL(scriptUrl.replaceAll("&amp;", "&"), "https://example.test").searchParams;
  assert.match(query.get("tabletability") || "", /^tablet-native-ability-autoactivate-r1-[0-9a-f]{16}$/);
  const release = Array.from(query.values()).at(-1);
  const digest = createHash("sha256").update(appSource).digest("hex").slice(0, 16);
  assert.ok(release.endsWith("-" + digest), "current app script token must match app.js SHA-256");
  for (const constant of ["RUNTIME_RELEASE", "CACHE_NAME"]) {
    const cacheRelease = worker.match(new RegExp('const ' + constant + ' = "([^"]+)"'))[1];
    assert.ok(cacheRelease.endsWith("-" + release), constant + " must end with the current app token");
  }
  return release;
}

test("the app loader preserves the tablet history and identifies the current cached app", () => {
  assertCurrentAppCacheRevision(app, read("index.html"), read("sw.js"));
});

test("the app cache check rejects modified bytes and mismatched script, release, and cache tokens", () => {
  const release = "test-release-" + createHash("sha256").update(app).digest("hex").slice(0, 16);
  const history = "tablet-native-ability-autoactivate-r1-0123456789abcdef";
  const index = `<script src="app.js?tabletability=${history}&amp;current=${release}"></script>`;
  const worker = `const RUNTIME_RELEASE = "runtime-${release}"; const CACHE_NAME = "cache-${release}";`;
  assert.equal(assertCurrentAppCacheRevision(app, index, worker), release);
  assert.throws(() => assertCurrentAppCacheRevision(app + "\n", index, worker), /app script token/);
  assert.throws(() => assertCurrentAppCacheRevision(app, index.replace(release, release + "-stale"), worker), /app script token/);
  assert.throws(() => assertCurrentAppCacheRevision(app, index, worker.replace(release, release + "-stale")), /RUNTIME_RELEASE/);
  const cacheName = worker.match(/const CACHE_NAME = "([^"]+)"/)[1];
  assert.throws(() => assertCurrentAppCacheRevision(app, index, worker.replace(cacheName, cacheName + "-stale")), /CACHE_NAME/);
});

test("the app cache check rejects a missing tablet history token", () => {
  const index = read("index.html").replace(/&amp;tabletability=[^&"]+/, "");
  assert.throws(() => assertCurrentAppCacheRevision(app, index, read("sw.js")), /tablet-native-ability-autoactivate/);
});
