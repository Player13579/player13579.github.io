const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const app = fs.readFileSync(process.argv[2] === "-" ? 0 : process.argv[2] || path.join(__dirname, "../app.js"), "utf8").replaceAll("\r\n", "\n");
function section(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, start);
  return app.slice(from, to);
}
const handlersSource = [
  section('  window.addEventListener("keydown", (event) => {', '  window.addEventListener("focus", () => void recoverRoomInteractionAfterBackground());'),
  section("function syncMovementInputImmediately()", "const revokedTabletCategoryClicks"),
  section("function keyName(", "function normalizeSkinId("),
  section("function sendMovement(", "function rotateMovementSession("),
  section("function isDashing()", "function activeStaminaFor("),
  section("function ownsThrowCharge(", "function releaseThrowChargeOperation("),
  section("function isCurrentRoomSession(", "function setCurrentRoomSession(")
].join("\n");

function makeGame() {
  const events = new Map();
  const packets = [];
  const noOp = () => {};
  class Element {
    constructor(tagName = "BODY") { this.tagName = tagName; }
    matches() { return this.tagName === "INPUT"; }
  }
  const body = new Element();
  const input = new Element("INPUT");
  const document = { activeElement: body };
  const state = {
    screen: "game", data: { phase: "playing" }, keys: new Set(), movementKeyDirections: new Map(), pad: new Set(),
    enhanceHold: {}, throwTargeting: {}, throwChargeOperation: null, clairvoyance: {}, tabletStick: { dx: 0, dy: 0 },
    continuousActionKeyAt: new Map(), movementActive: false, moveRequestSeq: 0,
    movementQueue: { clear: noOp, enqueue: (packet) => packets.push(packet) }
  };
  const context = {
    Element, document, state,
    window: { addEventListener: (type, handler) => events.set(type, handler) },
    els: new Proxy({}, { get: () => ({ hidden: true, classList: { remove: noOp } }) }),
    performance: { now: () => packets.length * 1000 }, MOVEMENT_SEND_INTERVAL_MS: 16,
    clientId: () => "test",
    clearPointerInput: () => state.pad.clear()
  };
  for (const name of [
    "handleSwitchDragMenuKeydown", "handleKillCameraDialogKeydown", "handleKeybindModalKeydown",
    "handleFieldFeedDialogKeydown", "handleExpandedMapDialogKeydown", "triggerDeveloperAnalyticsHotkey",
    "beginClairvoyanceMovement", "selectedScrollRegion", "isActionBlocked", "triggerHackerHotkey",
    "triggerItemHotkey", "triggerScreenHotkey", "triggerAlchemySelectionHotkey", "triggerVendingHotkey",
    "triggerActionHotkey", "stopRootShortcutKeyHold", "stopAbilityBatchKeyHold", "stopContinuousActionKeyHold",
    "releaseThrowTargetMovement", "releaseClairvoyanceMovement", "cancelCommonActionGestures",
    "cancelActiveRootShortcutHolds", "stopContinuousActionHold", "cancelThrowTargeting", "cancelEnhanceAction",
    "clearClairvoyanceCameraInput"
  ]) context[name] = noOp;
  vm.runInNewContext(handlersSource, context);
  return {
    state, packets,
    focusEditor: () => { document.activeElement = input; },
    emit: (type, key, code, flags) =>
      events.get(type)({ key, code, target: document.activeElement, preventDefault: noOp, ...flags }),
    direction: () => packets.length && [packets.at(-1).dx, packets.at(-1).dy]
  };
}

{
  const game = makeGame();
  game.emit("keydown", "w", "KeyW");
  assert.deepEqual(game.direction(), [0, -1]);
  game.emit("keydown", "Alt", "AltLeft", { altKey: true });
  assert.equal(game.packets.at(-1).slow, true);
  game.emit("keyup", "∑", "KeyW", { altKey: true });
  assert.deepEqual(game.direction(), [0, 0]);
  game.emit("keyup", "Alt", "AltLeft");
  assert.equal(game.packets.filter(({ dx, dy }) => !dx && !dy).length, 1);
}

{
  const game = makeGame();
  game.emit("keydown", "w", "KeyZ");
  game.emit("keydown", "a", "KeyZ", { repeat: true });
  game.emit("keyup", "w", "KeyW");
  assert.deepEqual(game.direction(), [0, -1]);
  game.focusEditor();
  game.emit("keyup", "Process", "KeyZ", { isComposing: true });
  assert.deepEqual(game.direction(), [0, 0]);
  const packetCount = game.packets.length;
  game.emit("keydown", "w", "KeyZ");
  assert.equal(game.packets.length, packetCount);
}

for (const code of ["", "Unidentified"]) {
  const game = makeGame();
  game.emit("keydown", "w", code);
  game.emit("keyup", "W", code);
  assert.deepEqual(game.direction(), [0, 0]);
}
{
  const game = makeGame();
  game.emit("keydown", "w", "KeyW", { isComposing: true });
  assert.equal(game.packets.length, 0);
  game.emit("keydown", "w", "KeyW");
  game.emit("keydown", "w", "KeyZ");
  game.emit("keyup", "∑", "KeyW");
  assert.deepEqual(game.direction(), [0, -1]);
  game.state.pad.add("up");
  game.emit("keyup", "z", "KeyZ");
  assert.deepEqual(game.direction(), [0, -1]);
  game.emit("blur");
  assert.deepEqual(game.direction(), [0, 0]);
  assert.equal(game.state.movementKeyDirections.size, 0);
}

{
  const game = makeGame();
  game.emit("keydown", "w", "KeyW");
  game.state.fieldFeedOpen = true;
  game.emit("keyup", "∑", "KeyW");
  assert.deepEqual(game.direction(), [0, 0]);
}

{
  const game = makeGame();
  game.emit("keydown", "w", "KeyW");
  game.emit("keydown", "Shift", "ShiftLeft", { shiftKey: true });
  game.emit("keydown", "Shift", "ShiftRight", { shiftKey: true });
  game.emit("keyup", "Shift", "ShiftLeft", { shiftKey: true });
  assert.equal(game.packets.at(-1).dash, true);
  game.emit("keyup", "Shift", "ShiftRight");
  assert.equal(game.packets.at(-1).dash, false);
  game.emit("keydown", "Control", "ControlLeft", { ctrlKey: true });
  game.emit("keydown", "Alt", "AltLeft", { ctrlKey: true, altKey: true });
  game.emit("keyup", "Control", "ControlLeft", { altKey: true });
  assert.equal(game.packets.at(-1).slow, true);
  game.emit("keyup", "Alt", "AltLeft");
  assert.equal(game.packets.at(-1).slow, false);
  game.emit("keyup", "w", "KeyW");
  assert.deepEqual(game.direction(), [0, 0]);
}

console.log("Movement key ownership regression passed.");
