/**
 * DVA substitution preview WebGPU host. Rendering orchestration only; creative
 * content is supplied by effectWgsl. This module never inspects source events.
 */
const ROLE_COUNT = 4;
const ACTOR_COUNT = 3;
const UNIFORM_BYTES = 64;
const ROLE_INDEX = new Map([
  ["grantSource", 0], ["grantReceipt", 1],
  ["triggerOrigin", 2], ["triggerDestination", 3],
]);

function assert(cond, message) { if (!cond) throw new Error(message); }
function positive(n) { return Number.isFinite(n) && n > 0; }
function clampDpr(value) { return Math.min(2, Math.max(0.1, Number(value) || 1)); }

export function createGpuRenderer({ canvas, effectWgsl, baselineWgsl, reportStage = () => {} }) {
  assert(canvas && typeof canvas.getContext === "function", "WebGPU canvas is required");
  assert(typeof effectWgsl === "string" && typeof baselineWgsl === "string", "WGSL sources are required");

  let closed = false, initialized = false, initPromise, disposePromise;
  let adapter = null, device = null, context = null, format = null, renderViewFormat = null;
  let effectPipeline = null, baselinePipeline = null;
  const roleBuffers = [], roleGroups = [], actorBuffers = [], actorGroups = [];
  let roleLayout, baselineLayout;
  let targetGeneration = 0, serial = 0, completedSerial = 0;
  let lastSubmittedTarget = null, lastQueueFenceState = "none";
  let renderTail = Promise.resolve();
  let errors = [], compilationMessages = [], scopeHistory = [];
  let lostPromise = null, lostInfo = null;
  let viewport = { cssWidth: 0, cssHeight: 0, backingWidth: 0, backingHeight: 0, dpr: 1 };

  const stage = (name, detail = {}) => {
    try { reportStage({ name, ...detail }); } catch (e) { errors.push({ stage: "reportStage", message: String(e) }); }
  };
  const snapshot = () => ({
    initialized, closed, targetGeneration, submittedSerial: serial, completedSerial,
    current: !closed && lastSubmittedTarget === targetGeneration,
    queueFence: { serial, targetGeneration: lastSubmittedTarget, status: lastQueueFenceState },
    compilationMessages: compilationMessages.slice(), scopes: scopeHistory.slice(),
    errors: errors.slice(), lost: lostInfo,
    viewport: { ...viewport },
    color: { baseFormat: format, viewFormat: renderViewFormat, colorSpace: "srgb", outputTransfer: "srgb-view" },
    lifecycle: { initPending: !!initPromise && !initialized, renderPending: serial > completedSerial, disposePending: !!disposePromise },
  });
  function recordError(where, e) {
    const item = { where, message: String(e?.message ?? e), name: e?.name ?? "Error" };
    errors.push(item); stage("error", item); return item;
  }
  async function compilationInfo(module, label) {
    if (typeof module.getCompilationInfo !== "function") return;
    try {
      const info = await module.getCompilationInfo();
      const rows = (info.messages ?? []).map(m => ({
        label, type: m.type ?? "unknown", message: m.message ?? "",
        lineNum: m.lineNum ?? null, linePos: m.linePos ?? null,
        offset: m.offset ?? null, length: m.length ?? null,
      }));
      compilationMessages.push(...rows);
      for (const row of rows) if (row.type === "error") errors.push({ where: "compile:" + label, ...row });
    } catch (e) { recordError("compilationInfo:" + label, e); }
  }
  function makeUniformBindGroupLayout() {
    return device.createBindGroupLayout({ entries: [{
      binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: UNIFORM_BYTES },
    }] });
  }
  function makeUniformGroup(layout, buffer) {
    return device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer, offset: 0, size: UNIFORM_BYTES } }] });
  }
  function configureTarget() {
    if (closed || !initialized) return;
    const rect = canvas.getBoundingClientRect?.() ?? { width: canvas.clientWidth, height: canvas.clientHeight };
    const cssWidth = Number(rect.width), cssHeight = Number(rect.height);
    const dpr = clampDpr(globalThis.devicePixelRatio ?? 1);
    if (!positive(cssWidth) || !positive(cssHeight)) {
      viewport = { cssWidth: positive(cssWidth) ? cssWidth : 0, cssHeight: positive(cssHeight) ? cssHeight : 0,
        backingWidth: 0, backingHeight: 0, dpr };
      targetGeneration++;
      stage("resize-skipped-zero", { targetGeneration, viewport: { ...viewport } });
      return;
    }
    const width = Math.max(1, Math.round(cssWidth * dpr)), height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.width = width; canvas.height = height;
    context.configure({ device, format, viewFormats: [renderViewFormat], colorSpace: "srgb", alphaMode: "premultiplied", usage: GPUTextureUsage.RENDER_ATTACHMENT });
    targetGeneration++;
    viewport = { cssWidth, cssHeight, backingWidth: width, backingHeight: height, dpr };
    stage("target-configured", { targetGeneration, viewport: { ...viewport } });
  }
  function makeUniform(draw, role) {
    const supplied = draw.uniforms;
    assert(supplied && supplied.length === 16, "uniforms must be Float32Array-like length 16");
    const out = new Float32Array(supplied);
    const age = draw.ageMs == null ? supplied[2] : Number(draw.ageMs);
    assert(Number.isFinite(age) && Math.fround(age) === Math.fround(supplied[2]), "draw age must match its uniform age");
    assert(Number.isFinite(supplied[3]) && Math.fround(supplied[3]) === role, "draw role must match its uniform role");
    out[0] = viewport.backingWidth; out[1] = viewport.backingHeight;
    out[2] = age; out[3] = role;
    assert(positive(out[0]) && positive(out[1]) && positive(out[6]) && Number.isFinite(out[2]) && [...out].every(Number.isFinite), "effect uniforms must be finite Float32 values with positive viewport and height");
    return out;
  }
  function actorUniform(actor) {
    const u = new Float32Array(16);
    u[0] = viewport.backingWidth; u[1] = viewport.backingHeight;
    u[4] = Number(actor.footX) * viewport.dpr;
    u[5] = Number(actor.footY) * viewport.dpr;
    u[6] = Number(actor.actorHeightPx) * viewport.dpr;
    u[3] = 0;
    assert(positive(u[0]) && positive(u[1]) && [...u].every(Number.isFinite), "actor uniforms must be finite Float32 values with positive viewport");
    return u;
  }
  function rectToScissor(rect) {
    const x = Math.floor(rect.x), y = Math.floor(rect.y);
    const right = Math.ceil(rect.x + rect.width);
    const bottom = Math.ceil(rect.y + rect.height);
    const left = Math.max(0, x), top = Math.max(0, y);
    const r = Math.min(viewport.backingWidth, right), b = Math.min(viewport.backingHeight, bottom);
    return { x: left, y: top, width: Math.max(0, r - left), height: Math.max(0, b - top) };
  }

  async function initialize() {
    stage("initializing");
    try {
      assert(typeof navigator !== "undefined" && navigator.gpu, "WebGPU is unavailable");
      adapter = await navigator.gpu.requestAdapter();
      assert(adapter, "No WebGPU adapter is available");
      if (closed) return;
      device = await adapter.requestDevice();
      lostPromise = device.lost.then(info => {
        lostInfo = { reason: info?.reason ?? "unknown", message: info?.message ?? "" };
        if (!closed && lostInfo.reason !== "destroyed") recordError("device.lost", new Error(lostInfo.message || lostInfo.reason));
        stage("device-lost", lostInfo);
        return lostInfo;
      });
      device.addEventListener?.("uncapturederror", ev => recordError("uncapturederror", ev.error));
      if (closed) return;
      context = canvas.getContext("webgpu");
      assert(context, "canvas.getContext('webgpu') failed");
      format = navigator.gpu.getPreferredCanvasFormat();
      assert(format === "bgra8unorm" || format === "rgba8unorm", "Unsupported preferred canvas base format");
      renderViewFormat = format === "bgra8unorm" ? "bgra8unorm-srgb" : "rgba8unorm-srgb";
      roleLayout = makeUniformBindGroupLayout();
      baselineLayout = makeUniformBindGroupLayout();
      const effectModule = device.createShaderModule({ label: "substitution-effect", code: effectWgsl });
      const baselineModule = device.createShaderModule({ label: "fixture-baseline", code: baselineWgsl });
      await Promise.all([compilationInfo(effectModule, "effect"), compilationInfo(baselineModule, "baseline")]);
      const shaderErrors = errors.filter(x => String(x.where).startsWith("compile:"));
      assert(shaderErrors.length === 0, "WGSL compilation failed");
      effectPipeline = device.createRenderPipeline({
        label: "substitution-effect-pipeline", layout: device.createPipelineLayout({ bindGroupLayouts: [roleLayout] }),
        vertex: { module: effectModule, entryPoint: "vsMain" },
        fragment: { module: effectModule, entryPoint: "fsMain", targets: [{
          format: renderViewFormat, blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } },
        }] },
        primitive: { topology: "triangle-list" },
      });
      baselinePipeline = device.createRenderPipeline({
        label: "fixture-human-reference", layout: device.createPipelineLayout({ bindGroupLayouts: [baselineLayout] }),
        vertex: { module: baselineModule, entryPoint: "vsMain" },
        fragment: { module: baselineModule, entryPoint: "fsMain", targets: [{ format: renderViewFormat,
          blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" } },
        }] },
        primitive: { topology: "triangle-list" },
      });
      for (let i = 0; i < ROLE_COUNT; i++) {
        const b = device.createBuffer({ label: "effect-uniform-role-" + i, size: UNIFORM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        roleBuffers.push(b); roleGroups.push(makeUniformGroup(roleLayout, b));
      }
      for (let i = 0; i < ACTOR_COUNT; i++) {
        const b = device.createBuffer({ label: "fixture-actor-uniform-" + i, size: UNIFORM_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        actorBuffers.push(b); actorGroups.push(makeUniformGroup(baselineLayout, b));
      }
      initialized = true;
      configureTarget();
      stage("ready", { targetGeneration });
    } catch (e) {
      recordError("initialize", e);
      throw e;
    }
  }
  initPromise = initialize();
  const ready = initPromise.then(() => ({ status: closed ? "closed" : "ready", targetGeneration, deviceLost: lostPromise }));
  // Suppress an unhandled rejection when callers dispose without awaiting ready;
  // the same rejection remains observable from ready and render().
  ready.catch(() => {});

  function resize() {
    if (closed) return Promise.resolve({ status: "closed", targetGeneration });
    return initPromise.then(() => {
      if (closed) return { status: "closed", targetGeneration };
      configureTarget();
      return { status: viewport.backingWidth && viewport.backingHeight ? "resized" : "zero-size", targetGeneration, viewport: { ...viewport } };
    });
  }

  function render(input = {}) {
    const job = renderTail.then(async () => {
      await initPromise;
      if (closed) return { status: "closed", recorded: false, submitted: false, completed: false, serial, targetGeneration, current: false };
      if (!viewport.backingWidth || !viewport.backingHeight) return { status: "zero-size", recorded: false, submitted: false, completed: false, serial, targetGeneration, current: true, viewport: publicViewport() };
      const beforeErrors = errors.length;
      const submittedViewport = publicViewport();
      const actors = (input.baselineActors ?? []).slice(0, ACTOR_COUNT);
      const draws = (input.draws ?? []).filter(d => ROLE_INDEX.has(d.role)).slice(0, ROLE_COUNT);
      const packedActors = actors.map(actorUniform);
      const packedDraws = draws.map(d => makeUniform(d, ROLE_INDEX.get(d.role)));
      if (input.ageMs != null) {
        const inputAge = Number(input.ageMs);
        assert(Number.isFinite(inputAge) && packedDraws.every(u => Math.fround(u[2]) === Math.fround(inputAge)), "receipt age must match every submitted draw age");
      }
      const scope = { validation: false, outOfMemory: false };
      for (const [key, filter] of [["validation", "validation"], ["outOfMemory", "out-of-memory"]]) {
        if (device.pushErrorScope && device.popErrorScope) {
          device.pushErrorScope(filter); scope[key] = true;
        }
      }
      let queueFence, thisSerial, thisTarget, drawCalls = 0;
      try {
        packedActors.forEach((u, i) => device.queue.writeBuffer(actorBuffers[i], 0, u));
        draws.forEach((d, i) => device.queue.writeBuffer(roleBuffers[ROLE_INDEX.get(d.role)], 0, packedDraws[i]));
        const encoder = device.createCommandEncoder({ label: "substitution-frame-" + (serial + 1) });
        const pass = encoder.beginRenderPass({ colorAttachments: [{
          view: context.getCurrentTexture().createView({ format: renderViewFormat }),
          clearValue: { r: 0.025, g: 0.035, b: 0.055, a: 1 }, loadOp: "clear", storeOp: "store",
        }] });
        actors.forEach((a, i) => {
          pass.setPipeline(baselinePipeline); pass.setBindGroup(0, actorGroups[i]);
          pass.setScissorRect(0, 0, viewport.backingWidth, viewport.backingHeight); pass.draw(3); drawCalls++;
        });
        draws.forEach((d, i) => {
          const u = packedDraws[i], H = u[6], fx = u[4], fy = u[5];
          // Each role uses only its own backing-pixel anchor and support.
          const rect = { x: fx - .92 * H, y: fy - 1.22 * H, width: 1.84 * H, height: 1.4 * H };
          const sc = rectToScissor(rect);
          if (!sc.width || !sc.height) return;
          pass.setPipeline(effectPipeline); pass.setBindGroup(0, roleGroups[ROLE_INDEX.get(d.role)]);
          pass.setScissorRect(sc.x, sc.y, sc.width, sc.height); pass.draw(3); drawCalls++;
        });
        pass.end();
        device.queue.submit([encoder.finish()]);
        thisSerial = ++serial; thisTarget = targetGeneration; lastSubmittedTarget = thisTarget;
        lastQueueFenceState = "pending";
        queueFence = device.queue.onSubmittedWorkDone().then(() => {
          completedSerial = Math.max(completedSerial, thisSerial);
          lastQueueFenceState = "completed";
          return { serial: thisSerial, targetGeneration: thisTarget, completed: true };
        }, e => { lastQueueFenceState = "rejected"; throw e; });
        stage("submitted", { serial: thisSerial, targetGeneration: thisTarget, drawCalls, passCount: 1 });
      } catch (e) {
        recordError("render-submit", e);
        throw e;
      }
      const scopeResults = [];
      // GPU error scopes are a stack: pop in reverse push order.
      for (const [key] of [["outOfMemory"], ["validation"]]) {
        if (scope[key]) {
          const value = await device.popErrorScope();
          const result = { kind: key, error: value ? { name: value.name, message: value.message } : null };
          scopeHistory.push(result); scopeResults.push(result);
          if (value) recordError("errorScope:" + key, value);
        }
      }
      const fence = await queueFence;
      const current = !closed && thisTarget === targetGeneration;
      const uncapturedErrors = errors.slice(beforeErrors);
      const receipt = {
        status: "completed", recorded: true, submitted: true, completed: true, passes: 1,
        drawCalls, serial: thisSerial, causeId: input.causeId ?? null,
        generation: input.generation ?? null,
        submittedMode: input.mode ?? null, sourceEligible: input.sourceEligible ?? false,
        mainOn: input.mainOn ?? false, targetGeneration: thisTarget, current,
        color: { baseFormat: format, viewFormat: renderViewFormat, colorSpace: "srgb", outputTransfer: "srgb-view" },
        submittedAgeMs: input.ageMs ?? (packedDraws.length ? packedDraws[0][2] : null),
        scopeResults, uncapturedErrors, viewport: submittedViewport, queueFence,
        queueFenceResult: fence,
      };
      stage("completed", { serial: thisSerial, targetGeneration: thisTarget, current });
      return receipt;
    });
    renderTail = job.catch(() => {});
    return job;
  }
  function publicViewport() {
    return { cssWidth: viewport.cssWidth, cssHeight: viewport.cssHeight,
      width: viewport.backingWidth, height: viewport.backingHeight, dpr: viewport.dpr };
  }

  function dispose() {
    if (disposePromise) return disposePromise;
    closed = true;
    stage("closing");
    disposePromise = (async () => {
      try { await initPromise.catch(() => {}); } catch {}
      await renderTail.catch(() => {});
      if (device?.queue?.onSubmittedWorkDone) {
        try { await device.queue.onSubmittedWorkDone(); } catch (e) { recordError("dispose.queueDrain", e); }
      }
      if (lostPromise) {
        // Do not wait forever for device.lost; destroy below causes it to settle.
      }
      try { context?.unconfigure?.(); } catch (e) { recordError("dispose.unconfigure", e); }
      for (const b of [...roleBuffers, ...actorBuffers]) { try { b.destroy(); } catch (e) { recordError("dispose.buffer", e); } }
      if (device) { try { device.destroy(); } catch (e) { recordError("dispose.device", e); } }
      if (lostPromise) { try { await lostPromise; } catch (e) { recordError("dispose.deviceLost", e); } }
      stage("disposed");
      return { status: "disposed", serial, completedSerial, lost: lostInfo, errors: errors.slice() };
    })();
    return disposePromise;
  }

  return { ready, render, resize, dispose, snapshot };
}
