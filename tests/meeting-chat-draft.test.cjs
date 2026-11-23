const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const app = readFileSync(process.env.DVA_TEST_APP || path.join(__dirname, "../app.js"), "utf8");

function between(start, end) {
  const first = app.indexOf(start);
  const last = app.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing application source between ${start} and ${end}`);
  return app.slice(first, last);
}

const source = [
  between('  els.slowWalkButton.addEventListener("pointerleave"', '  els.chatTab.addEventListener'),
  between("async function request(", "function setCurrentRoomSession("),
  between("async function api(", "async function loadDropoffAnalytics(")
].join("\n");

function fixture({ offline = false } = {}) {
  const chatForm = new EventTarget();
  const chatInput = new EventTarget();
  chatInput.value = "";
  const requests = [];
  const applied = [];
  const toasts = [];
  let recoveries = 0;
  const defer = (url, body) => new Promise((resolve, reject) => {
    requests.push({ url, body, resolve, reject });
  });
  const state = {
    roomId: "room-1",
    playerId: "player-1",
    roomSessionGeneration: 10,
    offlineMode: offline,
    offlineClient: { request: defer }
  };
  vm.runInNewContext(source, {
    els: { chatForm, chatInput, slowWalkButton: new EventTarget() },
    state,
    enhanceGestureContext: null,
    IS_VERIFICATION_MODE: false,
    CHARACTER_ACTION_BY_API: {},
    applyState(result) { applied.push(result); },
    recoverAfterRejectedAction() { recoveries += 1; },
    showToast(message) { toasts.push(message); },
    apiUrl: (url) => url,
    onlineApiHeaders: (headers) => headers,
    clientId: () => "test-client",
    AbortController,
    window: { setTimeout, clearTimeout },
    fetch: (url, options) => defer(url, JSON.parse(options.body))
  });

  return {
    state, requests, applied, toasts, chatInput,
    get recoveries() { return recoveries; },
    edit(value) {
      chatInput.value = value;
      chatInput.dispatchEvent(new Event("input"));
    },
    submit() {
      const event = new Event("submit", { cancelable: true });
      assert.equal(chatForm.dispatchEvent(event), false);
    },
    async reply(result = { ok: true }, status = 200) {
      const pending = requests.at(-1);
      pending.resolve(offline ? result : { ok: status < 400, status, json: async () => result });
      await new Promise(setImmediate);
    },
    async disconnect() {
      requests.at(-1).reject(new TypeError("Connection lost"));
      await new Promise(setImmediate);
    }
  };
}

test("an accepted unchanged draft clears and submits the trimmed message", async () => {
  const chat = fixture({ offline: true });
  chat.edit("  first message  ");
  chat.submit();
  assert.equal(chat.requests.length, 1);
  assert.equal(chat.requests[0].url, "/api/chat");
  assert.equal(chat.requests[0].body.message, "first message");
  await chat.reply();
  assert.equal(chat.applied.length, 1);
  assert.equal(chat.chatInput.value, "");
});

test("an accepted reply preserves text entered after submitting", async () => {
  const chat = fixture();
  chat.edit("first message");
  chat.submit();
  chat.edit("next draft");
  await chat.reply();
  assert.equal(chat.applied.length, 1);
  assert.equal(chat.chatInput.value, "next draft");
});

test("retyping the exact original text creates a new draft", async () => {
  const chat = fixture();
  chat.edit("first message");
  chat.submit();
  chat.edit("");
  chat.edit("first message");
  await chat.reply();
  assert.equal(chat.chatInput.value, "first message");
});

test("an old room reply cannot apply state or clear a draft in a new room", async () => {
  const chat = fixture({ offline: true });
  chat.edit("shared text");
  chat.submit();
  chat.state.roomId = "room-2";
  chat.state.playerId = "player-2";
  chat.state.roomSessionGeneration += 1;
  await chat.reply();
  assert.equal(chat.applied.length, 0);
  assert.equal(chat.chatInput.value, "shared text");
});

test("a reply from a replaced session with the same identifiers cannot clear its draft", async () => {
  const chat = fixture();
  chat.edit("shared text");
  chat.submit();
  chat.state.roomSessionGeneration += 1;
  await chat.reply();
  assert.equal(chat.applied.length, 0);
  assert.equal(chat.chatInput.value, "shared text");
});

test("rejected drafts survive a server refusal and can be retried", async () => {
  const chat = fixture();
  chat.edit("retry message");
  chat.submit();
  await chat.reply({ ok: false, error: "Meeting unavailable" }, 400);
  assert.equal(chat.chatInput.value, "retry message");
  assert.equal(chat.applied.length, 0);
  assert.equal(chat.recoveries, 1);
  assert.deepEqual(chat.toasts, ["Meeting unavailable"]);
  chat.submit();
  await chat.reply();
  assert.equal(chat.requests.length, 2);
  assert.equal(chat.chatInput.value, "");
});

test("network failure keeps the next draft intact", async () => {
  const chat = fixture();
  chat.edit("first message");
  chat.submit();
  chat.edit("next draft");
  await chat.disconnect();
  assert.equal(chat.chatInput.value, "next draft");
  assert.equal(chat.applied.length, 0);
  assert.equal(chat.recoveries, 1);
  assert.equal(chat.toasts.length, 1);
});

test("rejection from a retired room leaves the next room alone", async () => {
  const chat = fixture();
  chat.edit("first message");
  chat.submit();
  chat.state.roomId = "room-2";
  chat.state.roomSessionGeneration += 1;
  chat.edit("next draft");
  await chat.reply({ ok: false, error: "Meeting unavailable" }, 400);
  assert.equal(chat.chatInput.value, "next draft");
  assert.equal(chat.applied.length, 0);
  assert.equal(chat.recoveries, 0);
  assert.deepEqual(chat.toasts, []);
});
