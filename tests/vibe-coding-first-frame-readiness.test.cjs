'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const base = path.resolve(__dirname, '../public/sol61-vibe-coding/r1');
const runtime = fs.readFileSync(path.join(base, 'runtime-host.mjs'), 'utf8');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function makeResizeHarness() {
  const hostBody = runtime.replace(/^import\s+\{[\s\S]*?\}\s+from\s+'\.\/artist\.mjs';\s*/m, '');
  const rafs = new Map(), listeners = { window: new Map(), document: new Map() };
  const textures = [], submitted = [], errors = [];
  const decode = deferred(), lost = deferred();
  let observer, nextRaf = 1, textureCreates = 0;
  const canvas = { width: 0, height: 0, clientWidth: 980,
    getBoundingClientRect() { return { x: 0, y: 0, width: 980, height: 620 }; },
    getContext() { return { configure() {}, getCurrentTexture() { return { createView() { return {}; } }; } }; } };
  const statusNode = { textContent: '' }, errorNode = { textContent: '', hidden: true };
  const elements = new Map([['#preview', canvas], ['#status', statusNode], ['#error', errorNode],
    ['#startup-status', { textContent: '', hidden: false }], ['#stage', {}],
    ['#rate', { value: '1', addEventListener() {} }], ['#source', { checked: true, addEventListener() {} }],
    ['#observer', { checked: true, addEventListener() {} }], ['#mute', { addEventListener() {}, textContent: '' }]]);
  const device = {
    queue: { writeBuffer() {}, copyExternalImageToTexture() {}, submit(commands) { submitted.push(commands); },
      onSubmittedWorkDone() { return Promise.resolve(); } },
    lost: lost.promise, addEventListener() {}, pushErrorScope() {}, popErrorScope() { return Promise.resolve(null); },
    createShaderModule() { return { getCompilationInfo: () => Promise.resolve({ messages: [] }) }; },
    createBindGroupLayout() { return {}; }, createPipelineLayout() { return {}; },
    createRenderPipeline() { return { getBindGroupLayout() { return {}; } }; }, createBindGroup() { return {}; }, createSampler() { return {}; },
    createBuffer(descriptor) { return { descriptor, destroy() {}, getMappedRange() { return new ArrayBuffer(descriptor.size); }, mapState: 'unmapped' }; },
    createTexture(descriptor) { textureCreates++; const item = { descriptor, destroyed: false, destroy() { this.destroyed = true; }, createView() { return {}; } }; textures.push(item); return item; },
    createCommandEncoder() { return { beginRenderPass() { return { setPipeline() {}, setBindGroup() {}, draw() {}, end() {} }; }, finish() { return {}; } }; },
    destroy() {}
  };
  class FakeImage { constructor() { this.naturalWidth = 768; this.naturalHeight = 768; } decode() { return decode.promise; } }
  class FakeResizeObserver { constructor(callback) { observer = callback; } observe() {} disconnect() {} }
  const root = {
    window: { devicePixelRatio: 2, addEventListener(name, cb) { listeners.window.set(name, cb); }, dispatchEvent() {} },
    document: { hidden: false, documentElement: { classList: { toggle() {} } }, querySelector(q) { return elements.get(q) || null; }, addEventListener(name, cb) { listeners.document.set(name, cb); } },
    navigator: { gpu: { async requestAdapter() { return { async requestDevice() { return device; } }; }, getPreferredCanvasFormat() { return 'bgra8unorm'; } } },
    location: { search: '?verify=1' }, URLSearchParams, Image: FakeImage, ResizeObserver: FakeResizeObserver,
    CustomEvent: class {}, performance: { now: () => 10 }, console: { error(...e) { errors.push(e); }, log() {}, warn() {} },
    requestAnimationFrame(cb) { const id = nextRaf++; rafs.set(id, cb); return id; }, cancelAnimationFrame(id) { rafs.delete(id); },
    GPUTextureUsage: { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2, COPY_SRC: 4, COPY_DST: 8 },
    GPUBufferUsage: { UNIFORM: 1, COPY_DST: 2 }, GPUShaderStage: { VERTEX: 1, FRAGMENT: 2 }, GPUMapMode: { READ: 1 },
    ABI: { bytes: 128, worldFormats: ['rgba16float', 'rgba16float', 'rgba16float'], lifetimeEms: 1200, visualEndEms: 1180 },
    VARIANTS: ['mineral-water'], snapshotReceipt(e, roomId) { return { status: 'supported', roomId, key: `${roomId}:${e.id}` }; },
    prepare(receipt) { return { status: 'offscreen', key: receipt.key }; }, phaseState() {}, uniformFloats() { return new Float32Array(32); },
    createKernel() { return { worldBindings: {}, observer: { getBindGroupLayout() { return {}; } }, modules: [{ getCompilationInfo: () => Promise.resolve({ messages: [] }) }] }; },
    recordWorld() {}, recordObserver() {}, synthesize() { return new Float32Array(0); },
    sfxSubmissionController() { return { cancel() {}, close() {}, visibilityChanged() {}, audit() { return { activeVoiceCount: 0 }; } }; }
  };
  const context = vm.createContext(root);
  const bootstrap = vm.runInContext(`(async()=>{${hostBody}\n})()`, context);
  async function spin(predicate) {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setImmediate(resolve)); }
    throw new Error(`timed out waiting for harness state; ${statusNode.textContent}; ${JSON.stringify(errors)}`);
  }
  return { bootstrap, async waitAtDecode() { await spin(() => root.window.vibeCodingR1?.status().phase === 'actor-upload'); },
    async ready() { await spin(() => root.window.vibeCodingR1?.status().ready && rafs.size); return root.window.vibeCodingR1; },
    runFrame() { const [id, cb] = rafs.entries().next().value; rafs.delete(id); cb(16); },
    observer: () => observer, resolveDecode() { decode.resolve(); }, resolveLost() { lost.resolve({ message: 'synthetic loss' }); },
    count: () => textureCreates, textures, submitted, rafs, errors, api: () => root.window.vibeCodingR1 };
}

test('atlas upload and WGSL diagnostics cannot fence first-frame startup', () => {
  const upload = runtime.match(/async function loadActorTexture\(device\)\s*\{[\s\S]*?\n\}/)?.[0];
  assert.ok(upload, 'actor atlas uploader exists');
  assert.match(upload, /copyExternalImageToTexture/);
  assert.match(upload, /popErrorScope\(\)/);
  assert.doesNotMatch(upload, /await\s+device\.queue\.onSubmittedWorkDone\(\)/,
    'queue ordering puts the atlas copy before later frame submissions without waiting on a fence');
  assert.match(runtime, /const diagnosticsPromise=compileDiagnostics\(\);/);
  assert.doesNotMatch(runtime, /await\s+compileDiagnostics\(\)/,
    'compilation diagnostics report asynchronously and do not gate frame submission');
  assert.match(runtime, /queue\.submit\(\[command\]\);state\.submissions\+\+;\s*if \(!state\.firstFrameSubmitted\) \{ state\.firstFrameSubmitted = true; setPhase\('running', ''\); \}/,
    'the first successful queue.submit establishes running state');
  assert.match(runtime, /actorUpload\.validation\.then\(\(\)=>\{\}\)\.catch\(error=>stopRuntime\(/,
    'a later atlas validation error is visible and fatal instead of silently ignored');
});

test('startup phase stays visible until a real frame submission', () => {
  const startup = { textContent: 'init', hidden: false };
  const state = { phase: 'starting' };
  const context = vm.createContext({ state, startupStatusNode: startup });
  vm.runInContext(extractFunction(runtime, 'setPhase'), context);
  context.setPhase('first-frame-pending', 'WebGPUを初回描画中…');
  assert.equal(startup.hidden, false);
  assert.match(startup.textContent, /初回描画中/);
  context.setPhase('running', '');
  assert.equal(startup.hidden, true);
  assert.equal(state.phase, 'running');
  assert.match(html, /<output id="startup-status" role="status">/);
});

test('first frame remains observable through the existing runtime status API', () => {
  assert.match(runtime, /status:\(\)=>\(\{ready:state\.ready,phase:state\.phase,firstFrameSubmitted:state\.firstFrameSubmitted/);
  assert.match(runtime, /setPhase\('first-frame-pending', 'WebGPUを初回描画中…'\)/);
  const requestFrame = runtime.slice(runtime.indexOf('function requestFrame'), runtime.indexOf('async function loadActorTexture'));
  assert.match(requestFrame, /state\.phase==='failed'\|\|state\.phase==='lost'/);
});

test('resize during deferred atlas decode is inert; initialization later submits normally', async () => {
  const h = makeResizeHarness();
  await h.waitAtDecode();
  assert.equal(h.api().status().ready, false);
  h.observer()();
  assert.equal(h.count(), 0, 'resize before atlas decode does not allocate frame targets');
  assert.equal(h.api().status().phase, 'actor-upload', 'early resize does not fail initialization');
  h.resolveDecode();
  await h.ready();
  h.runFrame();
  assert.equal(h.submitted.length, 1, 'completed initialization reaches a successful first submission');
  await h.api().dispose();
});

test('resize callbacks after device loss do not recreate targets', async () => {
  const h = makeResizeHarness();
  h.resolveDecode();
  const api = await h.ready();
  h.runFrame();
  const countBeforeLoss = h.count();
  h.resolveLost();
  await new Promise(resolve => setImmediate(resolve));
  h.observer()();
  assert.equal(h.count(), countBeforeLoss, 'terminal resize does not allocate resources');
  assert.equal(api.status().phase, 'lost');
  await api.dispose();
});

test('stack-only Safari errors retain their name, empty-message marker, and stack', () => {
  const state = { errors: [], errorGeneration: 0, persistentRuntimeError: false };
  const statusNode = { textContent: '' }, errorNode = { textContent: '', hidden: true };
  const context = vm.createContext({state,statusNode,errorNode,console:{error(){}},String});
  vm.runInContext(`${extractFunction(runtime,'setStatus')}\n${extractFunction(runtime,'stageError')}`,context);
  const cause = new Error(''); cause.name = 'OperationError'; cause.stack = 'recordWorld@kernel.mjs:94:75 passKernel@runtime-host.mjs:220:19';
  const error = new Error('kernel pass failed',{cause}); error.name = 'OperationError';
  context.stageError(error,true);
  assert.match(state.errors[0], /Caused by OperationError: \(empty message\)/);
  assert.match(state.errors[0], /recordWorld@kernel\.mjs:94:75/);
  assert.match(errorNode.textContent, /OperationError: kernel pass failed/);
});

test('kernel pass validation checks bounds and reports exact context for scissor failures', () => {
  const state = {phase:'running',ready:true,resources:{receiver:{width:100,height:50}},targetSizes:null,
    lastRecordContext:null,kernel:{},recordSlots:{rear:{group:{}}}};
  const canvas = {width:100,height:50};
  let recordCalls = 0;
  const context = vm.createContext({state,canvas,JSON,Number,Array,Error,RangeError,
    beginPass(){return {setScissorRect(x,y,w,h){
      assert.deepEqual([x,y,w,h],[10,5,90,45]);
      const error=new Error('scissor rejected by mock GPU');error.name='OperationError';
      error.stack='recordWorld@kernel.mjs:94:75 passKernel@runtime-host.mjs:254:15';throw error;
    },end(){}};},
    recordWorld(pass,kernel,p){recordCalls++;pass.setScissorRect(...p.scissor);},recordObserver(){recordCalls++;}
  });
  vm.runInContext(`${extractFunction(runtime,'passBoundsContext')}\n${extractFunction(runtime,'validatePassBounds')}\n${extractFunction(runtime,'passKernel')}`,context);
  const prepared={status:'prepared',live:true,viewport:[100,50],scissor:Object.freeze([10,5,90,45])};
  let thrown;
  try { context.passKernel({},'rear',['receiver'],'world',prepared); } catch(error) { thrown=error; }
  assert.ok(thrown);
  assert.equal(thrown.name,'OperationError');
  assert.match(thrown.message,/scissor rejected by mock GPU/);
  assert.match(thrown.message,/"viewport":\[100,50\]/);
  assert.match(thrown.message,/"scissor":\[10,5,90,45\]/);
  assert.match(thrown.message,/"attachments":\[\{"name":"receiver","width":100,"height":50\}\]/);
  assert.match(thrown.cause.stack,/recordWorld/);
  assert.equal(recordCalls,1);
  assert.deepEqual(JSON.parse(JSON.stringify(state.lastRecordContext)).scissor,[10,5,90,45]);

  const invalid={status:'prepared',live:true,viewport:[100,50],scissor:[90,45,20,10]};
  let invalidThrown;
  try { context.passKernel({},'rear',['receiver'],'world',invalid); } catch(error) { invalidThrown=error; }
  assert.equal(invalidThrown.name,'RangeError');
  assert.match(invalidThrown.message,/invalid WebGPU pass bounds/);
  assert.equal(recordCalls,1,'invalid scissor is rejected before the artist recorder or GPU pass runs');
});
