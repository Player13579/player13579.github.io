(() => {
  "use strict";

  const RECONNECT_MIN_MS = 800;
  const RECONNECT_MAX_MS = 5000;

  function websocketUrl(apiBase, session) {
    const base = apiBase || globalThis.location.origin;
    const url = new URL("/ws", base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("roomId", session.roomId);
    url.searchParams.set("playerId", session.playerId);
    url.searchParams.set("clientId", session.clientId || "");
    url.searchParams.set("clientRelease", session.clientRelease || "");
    if (session.performanceMode) url.searchParams.set("performanceMode", session.performanceMode);
    return url.toString();
  }

  class RealtimeClient {
    constructor(handlers = {}) {
      this.handlers = handlers;
      this.socket = null;
      this.session = null;
      this.sessionKey = "";
      this.reconnectTimer = 0;
      this.reconnectDelay = RECONNECT_MIN_MS;
      this.lastMessageAt = 0;
      this.closedByClient = false;
      this.connectionGeneration = 0;
    }

    connect(session) {
      if (!session?.roomId || !session?.playerId) return;
      const key = `${session.apiBase || ""}|${session.roomId}|${session.playerId}|${session.clientRelease || ""}|${session.performanceMode || ""}`;
      if (key === this.sessionKey && this.socket && this.socket.readyState <= WebSocket.OPEN) return;
      this.disconnect(false);
      this.session = { ...session };
      this.sessionKey = key;
      this.closedByClient = false;
      this.open(++this.connectionGeneration);
    }

    open(generation = this.connectionGeneration) {
      if (!this.session || this.closedByClient || generation !== this.connectionGeneration) return;
      const sessionKey = this.sessionKey;
      const session = this.session;
      try {
        const socket = new WebSocket(websocketUrl(session.apiBase, session));
        this.socket = socket;
        const isCurrentSocket = () => (
          !this.closedByClient &&
          generation === this.connectionGeneration &&
          sessionKey === this.sessionKey &&
          this.socket === socket
        );
        socket.addEventListener("open", () => {
          if (!isCurrentSocket()) return;
          this.reconnectDelay = RECONNECT_MIN_MS;
          this.lastMessageAt = performance.now();
          this.handlers.onStatus?.("connected");
        });
        socket.addEventListener("message", (event) => {
          if (!isCurrentSocket()) return;
          this.lastMessageAt = performance.now();
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          if (message.type === "state" && message.data) this.handlers.onState?.(message.data);
          if (message.type === "movement" && message.data) this.handlers.onMovement?.(message.data);
        });
        socket.addEventListener("close", () => {
          if (!isCurrentSocket()) return;
          this.socket = null;
          this.handlers.onStatus?.("disconnected");
          this.scheduleReconnect(generation, sessionKey);
        });
        socket.addEventListener("error", () => {
          if (isCurrentSocket()) socket.close();
        });
      } catch {
        this.scheduleReconnect(generation, sessionKey);
      }
    }

    scheduleReconnect(generation = this.connectionGeneration, sessionKey = this.sessionKey) {
      if (
        this.closedByClient ||
        !this.session ||
        this.reconnectTimer ||
        generation !== this.connectionGeneration ||
        sessionKey !== this.sessionKey ||
        (this.socket && this.socket.readyState <= WebSocket.OPEN)
      ) return;
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(RECONNECT_MAX_MS, Math.round(this.reconnectDelay * 1.6));
      this.reconnectTimer = globalThis.setTimeout(() => {
        this.reconnectTimer = 0;
        if (generation !== this.connectionGeneration || sessionKey !== this.sessionKey) return;
        this.open(generation);
      }, delay);
    }

    sendMovement(payload) {
      const socket = this.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) return false;
      try {
        socket.send(JSON.stringify({ type: "move", ...payload }));
      } catch {
        // A socket may close after the readyState check.  Let its current
        // close listener own the disconnect/reconnect transition, while the
        // caller falls back to its ordered HTTP movement queue.
        if (this.socket === socket && !this.closedByClient) {
          try { socket.close(); } catch {}
        }
        return false;
      }
      return true;
    }

    isHealthy(maxAgeMs = 1600) {
      return Boolean(
        this.socket &&
        this.socket.readyState === WebSocket.OPEN &&
        performance.now() - this.lastMessageAt <= maxAgeMs
      );
    }

    disconnect(clearSession = true) {
      this.closedByClient = clearSession;
      this.connectionGeneration += 1;
      if (this.reconnectTimer) globalThis.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = 0;
      if (this.socket) {
        const socket = this.socket;
        this.socket = null;
        socket.close();
      }
      if (clearSession) {
        this.session = null;
        this.sessionKey = "";
        this.lastMessageAt = 0;
      }
    }
  }

  class LatestRequestQueue {
    constructor(sender, receiver) {
      this.sender = sender;
      this.receiver = receiver;
      this.inFlight = false;
      this.pending = null;
    }

    enqueue(payload) {
      this.pending = payload;
      this.flush();
    }

    async flush() {
      if (this.inFlight || !this.pending) return;
      const payload = this.pending;
      this.pending = null;
      this.inFlight = true;
      try {
        const result = await this.sender(payload);
        if (result) this.receiver?.(result);
      } catch {}
      this.inFlight = false;
      if (this.pending) this.flush();
    }

    clear() {
      this.pending = null;
    }
  }

  class MovementRequestQueue {
    constructor(sender, receiver) {
      this.sender = sender;
      this.receiver = receiver;
      this.inFlight = false;
      this.pending = [];
      this.retryTimer = 0;
      this.generation = 0;
    }

    static inputSignature(payload) {
      return [
        Number(payload?.dx) || 0,
        Number(payload?.dy) || 0,
        Boolean(payload?.dash),
        Boolean(payload?.slow),
        String(payload?.movementSession || "")
      ].join(":");
    }

    enqueue(payload) {
      const latestIndex = this.pending.length - 1;
      const latest = this.pending[latestIndex];
      if (latest && MovementRequestQueue.inputSignature(latest) === MovementRequestQueue.inputSignature(payload)) {
        this.pending[latestIndex] = payload;
      } else {
        this.pending.push(payload);
      }
      this.flush();
    }

    async flush() {
      if (this.inFlight || this.pending.length === 0) return;
      const payload = this.pending.shift();
      const generation = this.generation;
      this.inFlight = true;
      try {
        const result = await this.sender(payload);
        if (generation === this.generation && result) this.receiver?.(result);
      } catch {
        if (generation !== this.generation) {
          this.inFlight = false;
          // clear() dropped the retired generation's pending inputs. Drain only
          // the current head; the rejected input and its ACK stay retired.
          if (this.pending.length > 0) void this.flush();
          return;
        }
        // Movement payloads describe the complete current direction. If a
        // newer transition (especially stop) arrived while this request was
        // stalled, replaying the failed older direction first can create a
        // phantom movement burst after connectivity recovers. Retry the old
        // payload only when no newer authoritative input is waiting.
        if (this.pending.length === 0) this.pending.unshift(payload);
        this.inFlight = false;
        if (!this.retryTimer) {
          this.retryTimer = setTimeout(() => {
            this.retryTimer = 0;
            this.flush();
          }, 120);
        }
        return;
      }
      this.inFlight = false;
      if (this.pending.length > 0) this.flush();
    }

    clear() {
      this.generation += 1;
      this.pending.length = 0;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.retryTimer = 0;
    }
  }

  function reconcilePredictedMovement(input = {}) {
    const x = Number(input.x) || 0;
    const y = Number(input.y) || 0;
    const targetX = Number(input.targetX) || 0;
    const targetY = Number(input.targetY) || 0;
    const rawDirectionX = Number(input.directionX) || 0;
    const rawDirectionY = Number(input.directionY) || 0;
    const directionLength = Math.hypot(rawDirectionX, rawDirectionY);
    if (directionLength < 0.001) return { x, y, snapped: false };

    const directionX = rawDirectionX / directionLength;
    const directionY = rawDirectionY / directionLength;
    const correctionX = targetX - x;
    const correctionY = targetY - y;
    const correctionDistance = Math.hypot(correctionX, correctionY);
    const speed = Math.max(0, Number(input.speed) || 0);
    const leadAllowanceSpeed = Math.max(speed, Number(input.leadAllowanceSpeed) || 0);
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (Number(input.deltaMs) || 16.67) / 1000));

    // At high speed the local prediction naturally leads the latest server ACK.
    // Treat that along-path lead as latency, while still correcting lateral drift.
    const alongPath = correctionX * directionX + correctionY * directionY;
    const lateralX = correctionX - directionX * alongPath;
    const lateralY = correctionY - directionY * alongPath;
    const releaseTransition = leadAllowanceSpeed > speed + 0.01;
    const leadAllowance = Math.max(28, leadAllowanceSpeed * (releaseTransition ? 0.32 : 0.18));
    const snapDistance = Math.max(420, speed * 0.72);

    // While input is held, an authoritative point behind the prediction is
    // normally an old ACK. Snapping or easing toward it creates rubber-banding.
    const allowBackwardCorrection = input.allowBackwardCorrection !== false;
    if (correctionDistance > snapDistance && (allowBackwardCorrection || alongPath >= 0)) {
      return { x: targetX, y: targetY, snapped: true };
    }

    const lateralAlpha = 1 - Math.exp(-deltaSeconds / 0.12);
    const catchUpAlpha = 1 - Math.exp(-deltaSeconds / 0.16);
    const rollbackAlpha = 1 - Math.exp(-deltaSeconds / 0.5);
    const rollbackExcess = allowBackwardCorrection
      ? Math.max(0, -alongPath - leadAllowance)
      : 0;
    // Local input already advances at the authoritative speed. Applying
    // along-path ACK correction while input is held creates a speed pulse on
    // every ACK, so only idle/non-predicted actors may catch up longitudinally.
    const alongAdjustment = !allowBackwardCorrection
      ? 0
      : alongPath > 0
        ? alongPath * catchUpAlpha
        : -rollbackExcess * rollbackAlpha;

    return {
      x: x + lateralX * lateralAlpha + directionX * alongAdjustment,
      y: y + lateralY * lateralAlpha + directionY * alongAdjustment,
      snapped: false
    };
  }

  function advanceCollisionAwarePosition(input = {}) {
    let x = Number(input.x) || 0;
    let y = Number(input.y) || 0;
    const rawDirectionX = Number(input.directionX) || 0;
    const rawDirectionY = Number(input.directionY) || 0;
    const directionLength = Math.hypot(rawDirectionX, rawDirectionY);
    const speed = Math.max(0, Number(input.speed) || 0);
    const deltaMs = Math.min(100, Math.max(0, Number(input.deltaMs) || 0));
    if (directionLength < 0.001 || speed <= 0 || deltaMs <= 0) return { x, y, distance: 0 };

    const directionX = rawDirectionX / directionLength;
    const directionY = rawDirectionY / directionLength;
    const distance = speed * deltaMs / 1000;
    const maxStep = Math.max(2, Number(input.maxStep) || 8);
    const steps = Math.max(1, Math.ceil(distance / maxStep));
    const stepX = directionX * distance / steps;
    const stepY = directionY * distance / steps;
    const canOccupy = typeof input.canOccupy === "function" ? input.canOccupy : () => true;

    for (let index = 0; index < steps; index += 1) {
      const nextX = x + stepX;
      const nextY = y + stepY;
      if (canOccupy(nextX, nextY)) {
        x = nextX;
        y = nextY;
      } else if (canOccupy(nextX, y)) {
        x = nextX;
      } else if (canOccupy(x, nextY)) {
        y = nextY;
      } else {
        break;
      }
    }
    return { x, y, distance };
  }

  globalThis.DVARuntime = Object.freeze({
    RealtimeClient,
    LatestRequestQueue,
    MovementRequestQueue,
    reconcilePredictedMovement,
    advanceCollisionAwarePosition
  });
})();
