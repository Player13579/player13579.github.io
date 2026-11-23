const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const app = readFileSync(path.join(__dirname, "../app.js"), "utf8");

function between(start, end) {
  const first = app.indexOf(start);
  const last = app.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing application source: ${start}`);
  return app.slice(first, last);
}

const source = [
  between("function reconcileMeetingActionRows(", "function renderFeeds("),
  between("async function api(", "async function loadDropoffAnalytics("),
  between("async function request(", "function setCurrentRoomSession(")
].join("\n");

function element() {
  const attributes = new Map();
  const children = new Map();
  const handlers = new Map();
  return {
    dataset: {},
    classList: { toggle() {} },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    querySelector(selector) {
      if (!children.has(selector)) children.set(selector, { textContent: "" });
      return children.get(selector);
    },
    addEventListener(event, handler) { handlers.set(event, handler); },
    click() {
      if (!this.disabled) return handlers.get("click")?.();
    }
  };
}

function list() {
  const children = [];
  return {
    children,
    get firstElementChild() { return children[0]; },
    insertBefore(row, current) {
      children.splice(current ? children.indexOf(current) : children.length, 0, row);
      row.remove = () => children.splice(children.indexOf(row), 1);
      Object.defineProperty(row, "nextElementSibling", {
        configurable: true,
        get: () => children[children.indexOf(row) + 1]
      });
    }
  };
}

function fixture(offline) {
  const requests = [];
  const applied = [];
  const toasts = [];
  let recoveries = 0;

  function defer(url, body) {
    return new Promise((resolve) => requests.push({
      url,
      body,
      reply(result, status = 200) {
        resolve(offline ? result : { ok: status < 400, status, json: async () => result });
      }
    }));
  }

  const els = {
    meetingPanel: { contains: () => false },
    voteList: list(), luminousList: list(),
    meetingReason: {}, meetingTimer: {}, luminousPanel: {}
  };
  const state = {
    roomId: "room-1", playerId: "voter", roomSessionGeneration: 1,
    offlineMode: offline, offlineClient: { request: defer }
  };
  const renderMeeting = vm.runInNewContext(source + "\nrenderMeeting", {
    els, state,
    document: { createElement: element },
    playerIdentityLabel: (player) => player.id,
    playerFacingRoleLabel: (role) => role,
    enhanceGestureContext: null,
    IS_VERIFICATION_MODE: false,
    CHARACTER_ACTION_BY_API: { "/api/vote": "interact" },
    triggerCharacterAction() {},
    applyState(result) {
      applied.push(result);
      state.data = result;
      renderMeeting(state.data);
    },
    recoverAfterRejectedAction() { recoveries += 1; },
    showToast(message) { toasts.push(message); },
    apiUrl: (url) => url,
    onlineApiHeaders: (headers) => headers,
    clientId: () => "client",
    AbortController,
    window: { setTimeout: (...args) => setTimeout(...args).unref(), clearTimeout },
    fetch: (url, options) => {
      assert.equal(options.method, "POST");
      return defer(url, JSON.parse(options.body));
    }
  });

  function meeting(id = "meeting-1", data = {}) {
    const players = [state.playerId, "first", "second"].map((playerId) => ({
      id: playerId, role: "attacker", alive: true, ejected: false
    }));
    state.data = {
      ok: true, roomId: state.roomId, selfId: state.playerId,
      phase: "meeting", self: players[0], players,
      meeting: { id, discussionSecondsLeft: 0, votes: {} },
      ...data
    };
    renderMeeting(state.data);
  }

  function voteAccepted(targetId) {
    return { ...state.data, meeting: { ...state.data.meeting, votes: { [state.playerId]: targetId } } };
  }

  function button(targetId) {
    return els.voteList.children.find((button) => button.dataset.voteTargetId === targetId);
  }

  meeting();
  return { state, requests, applied, toasts, meeting, voteAccepted, button, get recoveries() { return recoveries; } };
}

for (const offline of [true, false]) {
  const transport = offline ? "offline request" : "online HTTP request";

  test(transport + ": target click and skip share one pending vote", async () => {
    const f = fixture(offline);
    const first = f.button("first").click();
    f.meeting();
    const repeated = f.button("first").click();
    const skip = f.button("skip").click();
    assert.deepEqual(f.requests.map(({ body }) => body.targetId), ["first"]);
    assert.equal(f.requests[0].url, "/api/vote");
    assert.equal(await repeated, false);
    assert.equal(await skip, false);
    f.requests[0].reply(f.voteAccepted("first"));
    await first;
    assert.equal(f.button("first").disabled, true);
    assert.equal(f.button("skip").disabled, true);
    assert.equal(f.state.data.meeting.votes.voter, "first");
    assert.equal(f.requests.length, 1);
  });

  test(transport + ": rejected vote releases the slot and allows skip", async () => {
    const f = fixture(offline);
    const first = f.button("first").click();
    f.requests[0].reply({ ok: false, error: "Vote rejected" }, 400);
    assert.equal(await first, false);
    assert.deepEqual(f.toasts, ["Vote rejected"]);
    assert.equal(f.recoveries, 1);
    const retry = f.button("skip").click();
    assert.deepEqual(f.requests.map(({ body }) => body.targetId), ["first", "skip"]);
    f.requests[1].reply(f.voteAccepted("skip"));
    await retry;
    assert.equal(f.state.data.meeting.votes.voter, "skip");
  });

  for (const transition of ["next meeting", "phase change", "new room", "same room rejoin", "different voter"]) {
    test(transport + ": " + transition + " can vote while a retired request is outstanding", async () => {
      const f = fixture(offline);
      const oldReceipt = f.voteAccepted("first");
      const oldVote = f.button("first").click();
      if (transition === "phase change") {
        f.state.data = { ...f.state.data, phase: "playing" };
        const stalePhaseClick = f.button("skip").click();
        assert.equal(f.requests.length, 1);
        assert.equal(await stalePhaseClick, false);
      }
      if (transition === "new room") f.state.roomId = "room-2";
      if (transition === "same room rejoin") f.state.roomSessionGeneration += 2;
      if (transition === "different voter") f.state.playerId = "next-voter";
      f.meeting(["next meeting", "phase change"].includes(transition) ? "meeting-2" : "meeting-1");
      const current = f.button("skip").click();
      assert.deepEqual(f.requests.map(({ body }) => body.targetId), ["first", "skip"]);
      f.requests[0].reply(oldReceipt);
      assert.equal(await oldVote, false);
      assert.equal(f.applied.length, 0);
      assert.deepEqual(f.toasts, []);
      assert.equal(f.recoveries, 0);
      const laterClick = f.button("second").click();
      assert.equal(f.requests.length, 2);
      assert.equal(await laterClick, false);
      f.requests[1].reply(f.voteAccepted("skip"));
      await current;
      assert.equal(f.state.data.meeting.votes[f.state.playerId], "skip");
    });
  }

  test(transport + ": current rejection and old rejection stay distinct", async () => {
    const f = fixture(offline);
    const oldVote = f.button("first").click();
    f.meeting("meeting-2");
    const currentVote = f.button("skip").click();
    f.requests[0].reply({ ok: false, error: "Old vote rejected" }, 400);
    assert.equal(await oldVote, false);
    assert.deepEqual(f.toasts, []);
    assert.equal(f.recoveries, 0);
    const laterClick = f.button("second").click();
    assert.equal(f.requests.length, 2);
    assert.equal(await laterClick, false);
    f.requests[1].reply({ ok: false, error: "Current vote rejected" }, 400);
    assert.equal(await currentVote, false);
    assert.deepEqual(f.toasts, ["Current vote rejected"]);
    assert.equal(f.recoveries, 1);
  });
}
