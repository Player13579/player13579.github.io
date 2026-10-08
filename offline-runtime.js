(() => {
  "use strict";

const OFFLINE_WORKER_VERSION = "fire-e-causal-v920-box-grenades-r1";
// Generated-worker startup must never turn an instant matchmaking decision
// into a 40-second stall. Fall back to the generated main-thread bundle after
// one bounded perceptual beat; initialization is already prewarmed on title.
const OFFLINE_WORKER_READY_TIMEOUT_MS = 800;
const OFFLINE_MAIN_READY_TIMEOUT_MS = 30_000;
const OFFLINE_REQUEST_TIMEOUT_MS = 20_000;

  class OfflineApiClient {
    constructor(options = {}) {
      this.options = options;
      this.worker = null;
      this.pending = new Map();
      this.requestId = 0;
      this.workerGeneration = 0;
      this.readyPromise = null;
      this.readyResolve = null;
      this.readyTimer = null;
      this.mainThreadApi = null;
      this.mainThreadPromise = null;
    }

    compatibleMainThreadApi(api = globalThis.DVAOfflineMainThread) {
      return api && String(api.version || "") === OFFLINE_WORKER_VERSION ? api : null;
    }

    start() {
      const compatibleGlobalApi = this.compatibleMainThreadApi();
      if (!this.mainThreadApi && compatibleGlobalApi) {
        this.mainThreadApi = compatibleGlobalApi;
        this.failPending();
        this.worker?.terminate();
        this.worker = null;
        this.settleReady(true);
      }
      if (this.mainThreadApi) return Promise.resolve(true);
      if (this.worker) return this.readyPromise || Promise.resolve(true);
      const generation = ++this.workerGeneration;
      const workerUrl = new URL(`offline-server-worker-${OFFLINE_WORKER_VERSION}.js`, document.baseURI);
      workerUrl.searchParams.set("v", OFFLINE_WORKER_VERSION);
      workerUrl.searchParams.set("boot", String(generation));
      this.readyPromise = new Promise((resolve) => {
        this.readyResolve = resolve;
        this.readyTimer = setTimeout(() => this.handleWorkerFailure(generation), OFFLINE_WORKER_READY_TIMEOUT_MS);
      });
      let worker;
      try {
        worker = new Worker(workerUrl, { name: `${OFFLINE_WORKER_VERSION}-${generation}` });
        this.worker = worker;
      } catch {
        this.worker = null;
        this.activateMainThreadFallback(generation);
        return this.readyPromise;
      }
      worker.addEventListener("message", (event) => {
        if (generation !== this.workerGeneration || this.worker !== worker) return;
        const message = event.data || {};
        if (message.type === "ready") {
          if (String(message.version || "") !== OFFLINE_WORKER_VERSION) {
            this.handleWorkerFailure(generation);
            return;
          }
          this.settleReady(true);
          return;
        }
        if (message.type !== "response") return;
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        pending.resolve(message.result || null);
      });
      worker.addEventListener("error", () => {
        if (this.worker === worker) this.handleWorkerFailure(generation);
      });
      worker.addEventListener("messageerror", () => {
        if (this.worker === worker) this.handleWorkerFailure(generation);
      });
      return this.readyPromise;
    }

    startMainThreadFallback() {
      if (this.mainThreadApi) return Promise.resolve(true);
      const compatibleGlobalApi = this.compatibleMainThreadApi();
      if (compatibleGlobalApi) {
        this.mainThreadApi = compatibleGlobalApi;
        return Promise.resolve(true);
      }
      if (this.mainThreadPromise) return this.mainThreadPromise;
      this.mainThreadPromise = new Promise((resolve) => {
        const staleScript = document.querySelector("script[data-dva-offline-main]");
        if (staleScript && staleScript.dataset.dvaOfflineMain !== OFFLINE_WORKER_VERSION) staleScript.remove();
        // An active load is owned by mainThreadPromise above. With no promise
        // or compatible API, every surviving same-version node is orphaned:
        // its load/error event may already have fired and cannot wake Play.
        document.querySelector(`script[data-dva-offline-main="${OFFLINE_WORKER_VERSION}"]`)?.remove();
        const script = document.createElement("script");
        let settled = false;
        const finish = (value) => {
          // A hidden Pages tab can finish parsing the generated main bundle
          // after an earlier readiness boundary. Adopt that late owner even
          // when this particular waiter has already settled, so the next
          // request cannot start another discarded Worker generation.
          const loadedApi = this.compatibleMainThreadApi();
          if (loadedApi) {
            this.mainThreadApi = loadedApi;
            this.failPending();
            this.worker?.terminate();
            this.worker = null;
            this.settleReady(true);
          }
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(Boolean(value && this.mainThreadApi));
        };
        const timer = setTimeout(() => finish(false), OFFLINE_MAIN_READY_TIMEOUT_MS);
        script.addEventListener("load", () => finish(true), { once: true });
        script.addEventListener("error", () => finish(false), { once: true });
        const mainUrl = new URL(`offline-server-main-${OFFLINE_WORKER_VERSION}.js`, document.baseURI);
        mainUrl.searchParams.set("v", OFFLINE_WORKER_VERSION);
        script.src = mainUrl.href;
        script.async = true;
        script.dataset.dvaOfflineMain = OFFLINE_WORKER_VERSION;
        document.head.append(script);
      }).finally(() => {
        if (!this.mainThreadApi) this.mainThreadPromise = null;
      });
      return this.mainThreadPromise;
    }

    async activateMainThreadFallback(generation) {
      if (generation !== this.workerGeneration) return;
      this.failPending();
      this.worker?.terminate();
      this.worker = null;
      const ready = await this.startMainThreadFallback();
      if (generation !== this.workerGeneration) return;
      this.settleReady(ready);
    }

    async request(path, body = {}, options = {}) {
      const attempts = Number.isFinite(options.attempts) ? Math.max(1, Number(options.attempts)) : 2;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const ready = await this.start();
        if (ready) {
          const result = await this.requestOnce(path, body, options);
          if (result) return result;
        }
        // A hidden/background browser can discard a ready Worker between its
        // handshake and the first request. Promote the generated main-thread
        // server inside this same request instead of starting another Worker
        // generation and losing the fallback to the generation race.
        const fallbackReady = await this.startMainThreadFallback();
        if (fallbackReady) {
          this.worker?.terminate();
          this.worker = null;
          const fallbackResult = await this.requestOnce(path, body, options);
          if (fallbackResult) return fallbackResult;
        }
        this.stop();
      }
      return null;
    }

    requestOnce(path, body = {}, options = {}) {
      const timeoutMs = Number.isFinite(options.timeoutMs)
        ? Math.max(50, Number(options.timeoutMs))
        : OFFLINE_REQUEST_TIMEOUT_MS;
      const requestBody = {
        ...body,
        clientId: body.clientId || this.options.clientId?.() || "offline-device",
        _offlineDeveloper: Boolean(this.options.isDeveloper?.())
      };
      if (this.mainThreadApi) {
        return new Promise((resolve) => {
          let settled = false;
          const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value || null);
          };
          const timer = setTimeout(() => finish(null), timeoutMs);
          Promise.resolve(this.mainThreadApi.request(path, requestBody)).then(finish, () => finish(null));
        });
      }
      const worker = this.worker;
      const generation = this.workerGeneration;
      if (!worker) return Promise.resolve(null);
      const id = `offline-${Date.now()}-${++this.requestId}`;
      return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          this.pending.delete(id);
          clearTimeout(timer);
          resolve(value || null);
        };
        const timer = setTimeout(() => {
          finish(null);
        }, timeoutMs);
        this.pending.set(id, { resolve: finish, timer, worker, generation });
        try {
          if (this.worker !== worker || this.workerGeneration !== generation) {
            finish(null);
            return;
          }
          worker.postMessage({
            type: "request",
            id,
            path,
            body: requestBody
          });
        } catch {
          finish(null);
          if (this.worker === worker && this.workerGeneration === generation) {
            this.handleWorkerFailure(generation);
          }
        }
      });
    }

    settleReady(value) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
      const resolve = this.readyResolve;
      this.readyResolve = null;
      resolve?.(Boolean(value));
    }

    handleWorkerFailure(generation) {
      if (generation !== this.workerGeneration) return;
      this.activateMainThreadFallback(generation);
    }

    failPending() {
      for (const { resolve, timer } of this.pending.values()) {
        clearTimeout(timer);
        resolve(null);
      }
      this.pending.clear();
    }

    stop() {
      this.settleReady(false);
      this.failPending();
      this.worker?.terminate();
      this.worker = null;
      this.readyPromise = null;
    }
  }

  globalThis.DVAOffline = Object.freeze({ OfflineApiClient });
})();
