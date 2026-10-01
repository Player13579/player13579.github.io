const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const hostPath = path.resolve(__dirname, '..', 'public/sol61-vibe-coding/r1/runtime-host.mjs');
const hostSource = fs.readFileSync(hostPath, 'utf8');
const hostBody = hostSource.replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/artist\.mjs';\s*/m, '');
assert.notEqual(hostBody, hostSource, 'the runtime host import is removed for dependency injection');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function makeHarness({ queueFence = 'resolved', compilation = 'resolved', textureFailureAt = 0 } = {}) {
  const rafs = new Map(), cancelledRafs = [], listeners = { window: new Map(), document: new Map() };
  const submitted = [], textures = [], buffers = [], errors = [], shaderWaiters = [];
  let nextRaf = 1, textureCreates = 0, encoderFailures = 0, cssWidth = 980;
  const lost = deferred(), never = new Promise(() => {});
  const statusNode = { textContent: '' }, errorNode = { textContent: '', hidden: true };
  const rateSelect = { value: '1', addEventListener() {} };
  const sourceToggle = { checked: true, addEventListener() {} };
  const observerToggle = { checked: true, addEventListener() {} };
  const muteButton = { disabled: false, textContent: '', addEventListener() {} };
  const stage = { classList: { add() {}, remove() {}, toggle() {} } };
  const canvas = {
    width: 0, height: 0, clientWidth: 980,
    getBoundingClientRect() { return { x: 0, y: 0, width: cssWidth, height: 620 }; },
    getContext(kind) { assert.equal(kind, 'webgpu'); return context; }
  };
  const elements = new Map([['#preview', canvas], ['#status', statusNode], ['#error', errorNode],
    ['#rate', rateSelect], ['#source', sourceToggle], ['#observer', observerToggle],
    ['#mute', muteButton], ['#stage', stage]]);
  const doc = {
    hidden: false,
    documentElement: { classList: { toggle() {}, add() {}, remove() {} } },
    querySelector(selector) { return elements.get(selector) || null; },
    addEventListener(name, handler) { listeners.document.set(name, handler); }
  };
  const win = {
    devicePixelRatio: 2,
    addEventListener(name, handler) { listeners.window.set(name, handler); },
    dispatchEvent() {},
    vibeCodingR1: null,
    __gallerySfx: null
  };
  const queue = {
    writeBuffer() {},
    copyExternalImageToTexture() {},
    submit(commandBuffers) { submitted.push(commandBuffers); },
    onSubmittedWorkDone() { return queueFence === 'pending' ? never : Promise.resolve(); }
  };
  const context = { configure() {}, getCurrentTexture() { return { createView() { return {}; } }; } };
  const device = {
    queue,
    lost: lost.promise,
    addEventListener(name, handler) { listeners.device = handler; },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); },
    createShaderModule(descriptor) {
      const gate = deferred(); shaderWaiters.push(gate);
      return { label: descriptor.label, getCompilationInfo() {
        return compilation === 'pending' ? gate.promise : Promise.resolve({ messages: [] });
      } };
    },
    createBindGroupLayout(descriptor) { return { descriptor }; },
    createPipelineLayout(descriptor) { return { descriptor }; },
    createRenderPipeline(descriptor) { return { descriptor, getBindGroupLayout() { return {}; } }; },
    createBindGroup(descriptor) { return { descriptor }; },
    createSampler(descriptor) { return { descriptor }; },
    createBuffer(descriptor) {
      const buffer = { descriptor, destroyed: false, destroy() { this.destroyed = true; },
        getMappedRange() { return new ArrayBuffer(descriptor.size); }, mapState: 'unmapped',
        async mapAsync() { this.mapState = 'mapped'; }, unmap() { this.mapState = 'unmapped'; } };
      buffers.push(buffer); return buffer;
    },
    createTexture(descriptor) {
      textureCreates += 1;
      if (textureFailureAt && textureCreates === textureFailureAt) throw new Error('synthetic createTexture allocation failure');
      const texture = { descriptor, destroyed: false, destroy() { this.destroyed = true; }, createView() { return {}; } };
      textures.push(texture); return texture;
    },
    createCommandEncoder() {
      if (encoderFailures > 0) { encoderFailures -= 1; throw new Error('synthetic render encoder failure'); }
      return {
        beginRenderPass() { return { setPipeline() {}, setBindGroup() {}, setScissorRect() {}, draw() {}, end() {} }; },
        copyTextureToBuffer() {}, finish() { return {}; }
      };
    },
    destroy() { this.destroyed = true; }
  };
  const adapter = { features: new Set(), async requestDevice() { return device; } };
  class FakeImage {
    constructor() { this.naturalWidth = 768; this.naturalHeight = 768; this.width = 768; this.height = 768; }
    async decode() {}
  }
  class FakeResizeObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }
  const root = {
    window: win, document: doc, navigator: { gpu: { async requestAdapter() { return adapter; }, getPreferredCanvasFormat() { return 'bgra8unorm'; } } },
    location: { search: '?verify=1' }, URLSearchParams, Image: FakeImage, ResizeObserver: FakeResizeObserver,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    performance: { now: () => 10 }, console: { error(...args) { errors.push(args); }, log() {}, warn() {} },
    requestAnimationFrame(callback) { const id = nextRaf++; rafs.set(id, callback); return id; },
    cancelAnimationFrame(id) { cancelledRafs.push(id); rafs.delete(id); },
    GPUTextureUsage: { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2, COPY_SRC: 4, COPY_DST: 8 },
    GPUBufferUsage: { UNIFORM: 1, COPY_DST: 2, MAP_READ: 4 },
    GPUShaderStage: { VERTEX: 1, FRAGMENT: 2 }, GPUMapMode: { READ: 1 },
    ABI: { bytes: 128, worldFormats: ['rgba16float', 'rgba16float', 'rgba16float'], lifetimeEms: 1200, visualEndEms: 1180 },
    VARIANTS: ['mineral-water'], STAR_ANGLE: 0,
    snapshotReceipt(event, roomId) { return { status: 'supported', roomId, id: event.id, key: `${roomId}:${event.id}` }; },
    prepare(receipt, frame) { return { status: 'offscreen', key: receipt.key }; }, phaseState() {}, uniformFloats() { return new Float32Array(32); },
    createKernel(gpuDevice, options) {
      assert.deepEqual(options.worldFormats, ['rgba16float', 'rgba16float', 'rgba16float']);
      const mod = { getCompilationInfo: () => Promise.resolve({ messages: [] }) };
      return { worldBindings: {}, observer: { getBindGroupLayout() { return {}; } }, modules: [mod] };
    }, recordWorld() {}, recordObserver() {}, synthesize() { return new Float32Array(0); },
    sfxSubmissionController() { return { cancel() {}, close() {}, visibilityChanged() {}, onSubmission() {}, audit() { return { activeVoiceCount: 0 }; } }; }
  };
  const vmContext = vm.createContext(root);
  const bootstrap = vm.runInContext(`(async () => { ${hostBody}\n})()`, vmContext, { timeout: 5000 });
  async function spinUntil(predicate, description) {
    for (let i = 0; i < 100; i += 1) {
      if (predicate()) return;
      await new Promise(resolve => setImmediate(resolve));
    }
    throw new Error(`timed out waiting for ${description}; errors=${JSON.stringify(errors)} status=${statusNode.textContent}`);
  }
  async function ready() {
    await spinUntil(() => win.vibeCodingR1?.status?.().ready && rafs.size > 0, 'host ready and RAF queued');
    return win.vibeCodingR1;
  }
  function runFrame(time = 16) {
    const entry = rafs.entries().next().value;
    assert.ok(entry, 'a frame callback is queued');
    rafs.delete(entry[0]); entry[1](time);
  }
  return { bootstrap, ready, runFrame, api: () => win.vibeCodingR1, rafs, cancelledRafs,
    listeners, submitted, textures, buffers, errors, shaderWaiters, setEncoderFailures(n) { encoderFailures = n; },
    failTextureAt(nextCreateNumber) { textureFailureAt = nextCreateNumber; }, setCssWidth(value) { cssWidth = value; },
    device, getTextureCreates() { return textureCreates; }, resolveLost(info = { reason: 'unknown', message: 'synthetic device loss' }) { lost.resolve(info); },
    resolveShaderWaiters() { for (const d of shaderWaiters) d.resolve({ messages: [] }); },
    async dispose() { await win.vibeCodingR1?.dispose?.(); }
  };
}

test('unresolved startup queue completion does not block the first submitted frame', async () => {
  const h = makeHarness({ queueFence: 'pending' });
  await h.ready();
  h.runFrame();
  assert.equal(h.submitted.length, 1, 'the first frame was submitted while startup queue completion remains unresolved');
  assert.equal(h.textures.length, 18, 'one atlas and seventeen frame targets were allocated');
  await h.dispose();
});

test('unresolved shader compilation diagnostics do not block the first submitted frame', async () => {
  const h = makeHarness({ compilation: 'pending' });
  await h.ready();
  h.runFrame();
  assert.equal(h.submitted.length, 1, 'the first frame was submitted while shader compilation information remains unresolved');
  h.resolveShaderWaiters();
  await h.dispose();
});

test('render exception is reported and the frame loop stops without another submission', async () => {
  const h = makeHarness();
  const api = await h.ready();
  h.runFrame();
  const before = h.submitted.length;
  h.setEncoderFailures(1);
  h.runFrame(32);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(api.status().errors.length > 0, 'render error is surfaced through diagnostics');
  assert.equal(h.rafs.size, 0, 'failed render leaves no repeating RAF');
  assert.equal(h.submitted.length, before, 'failed render did not submit a replacement frame');
  await h.dispose();
});

test('device loss cancels the RAF and retires resources safely', async () => {
  const h = makeHarness();
  const api = await h.ready();
  h.runFrame();
  assert.ok(h.rafs.size > 0, 'normal render queued the next frame');
  const before = h.submitted.length;
  const liveTargets = h.textures.filter(texture => !texture.destroyed);
  h.resolveLost();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(api.status().errors.length > 0, 'device loss is reported');
  assert.equal(h.rafs.size, 0, 'device loss leaves no active RAF');
  assert.ok(h.cancelledRafs.length > 0, 'pending RAF was explicitly cancelled');
  assert.ok(liveTargets.every(texture => texture.destroyed), 'all live target and actor textures are retired');
  const afterLoss = h.submitted.length;
  assert.equal(afterLoss, before, 'device loss did not submit a new frame');
  assert.equal(h.device.destroyed, undefined, 'lost device is not redundantly destroyed');
});

test('partial resize allocation destroys every texture already created in that attempt', async () => {
  const h = makeHarness();
  const api = await h.ready();
  const firstCount = h.getTextureCreates();
  h.setCssWidth(1000);
  h.failTextureAt(firstCount + 5);
  const existingListener = h.listeners.window.get('resize');
  assert.equal(typeof existingListener, 'function', 'resize listener is installed');
  existingListener();
  assert.ok(api.status().errors.some(message => message.includes('synthetic createTexture allocation failure')), 'resize allocation failure is reported');
  const partial = h.textures.slice(18);
  assert.equal(partial.length, 4, 'four new textures were successfully created before the fifth allocation failed');
  assert.ok(partial.every(texture => texture.destroyed), 'transactional failure cleanup destroyed the partial set');
  await api.dispose();
});
