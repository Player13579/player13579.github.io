const assert = require('node:assert/strict');

const map = { width: 3, height: 2, rooms: [], corridors: [], doors: [] };
global.DvaWebGPUFieldStatic = {
  shader: '@vertex fn vs()->@builtin(position) vec4f{return vec4f(0);}',
  createGeometryMask() { return new Uint8Array(map.width * map.height).fill(255); }
};
const FieldPass = require('../webgpu-field-pass.js');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function makeDevice({ compile, asyncPipeline = true, failTextureAt = 0 } = {}) {
  const resources = [];
  let textureCount = 0;
  const resource = kind => {
    if (kind === 'texture' && ++textureCount === failTextureAt) throw new Error('texture create failed');
    const value = { kind, destroyed: 0, destroy() { this.destroyed++; }, createView() { return { texture: this }; } };
    resources.push(value);
    return value;
  };
  const pipeline = { getBindGroupLayout() { return {}; } };
  const device = {
    limits: { maxTextureDimension2D: 8192 },
    queue: {
      copyExternalImageToTexture() {},
      writeTexture() {},
      writeBuffer() {},
      submit() {}
    },
    createShaderModule() { return { async getCompilationInfo() { return compile ? compile.promise : { messages: [] }; } }; },
    createRenderPipelineAsync: asyncPipeline ? async () => pipeline : undefined,
    createRenderPipeline() { return pipeline; },
    createBuffer() { return resource('buffer'); },
    createTexture() { return resource('texture'); },
    createSampler() { return {}; },
    createBindGroup() { return {}; },
    createCommandEncoder() { return { beginRenderPass() { return { setPipeline(){},setBindGroup(){},setViewport(){},draw(){},end(){} }; }, finish() { return {}; } }; }
  };
  return { device, resources };
}

const image = { width: map.width, height: map.height, complete: true };
const ownerFor = device => ({ state: 'ready', device, format: 'bgra8unorm' });
const mark = (events, phase, state) => events.find(e => e.name === `field.${phase}.${state}`);

(async () => {
  // Pending shader compilation and async pipeline promises remain open until their actual resolution.
  const compile = deferred(), pipeline = deferred(), events = [];
  const mocked = makeDevice({ compile });
  mocked.device.createRenderPipelineAsync = () => pipeline.promise;
  const creating = FieldPass.create({ owner: ownerFor(mocked.device), map, image, onTiming: e => events.push(e) });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(mark(events, 'field-shader-compilation', 'begin'));
  assert.equal(mark(events, 'field-shader-compilation', 'resolved'), undefined);
  compile.resolve({ messages: [] });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(mark(events, 'field-shader-compilation', 'resolved'));
  assert.ok(mark(events, 'field-pipeline-async', 'begin'));
  assert.equal(mark(events, 'field-pipeline-async', 'resolved'), undefined);
  pipeline.resolve({ getBindGroupLayout() { return {}; } });
  const pass = await creating;
  const names = events.map(e => e.name);
  for (const required of ['total', 'patch-validation', 'field-shader-compilation', 'field-pipeline-async',
    'texture-allocation', 'map-image-copy-enqueue', 'geometry-mask-cpu', 'geometry-upload-enqueue', 'field-bindings']) {
    assert.ok(names.includes(`field.${required}.begin`), `missing timing phase ${required}`);
  }
  assert.ok(!names.includes('field.patch-shader-compilation.begin'), 'no patch work should be timed when patches are absent');
  for (const name of ['field-shader-compilation', 'field-pipeline-async']) {
    const start = mark(events, name, 'begin');
    const end = mark(events, name, 'resolved');
    assert.ok(end.atMs >= start.atMs && end.durationMs >= 0);
  }
  assert.ok(events.every(e => /^field\.[a-z-]+\.(begin|resolved|failed)$/.test(e.name) && Number.isFinite(e.atMs)));
  assert.ok(events.filter(e => e.durationMs !== undefined).every(e => Number.isFinite(e.durationMs)));
  assert.ok(events.every((e, i) => i === 0 || e.atMs >= events[i - 1].atMs));
  pass.destroy();

  // Synchronous pipeline path and CPU phase are exposed; a throwing observer cannot disrupt creation or cleanup.
  const syncEvents = [], syncMock = makeDevice({ asyncPipeline: false });
  const syncPass = await FieldPass.create({ owner: ownerFor(syncMock.device), map, image,
    onTiming: event => { syncEvents.push(event); throw new Error('observer failure'); } });
  assert.ok(mark(syncEvents, 'field-pipeline-sync', 'resolved'));
  assert.ok(mark(syncEvents, 'geometry-mask-cpu', 'resolved'));
  syncPass.destroy();
  assert.ok(syncMock.resources.every(r => r.destroyed === 1));

  // Optional patch setup has separate shader, pipeline, and upload/binding timing phases.
  const patchEvents = [], patchMock = makeDevice({ asyncPipeline: false });
  const patchPass = await FieldPass.create({ owner: ownerFor(patchMock.device), map, image,
    patches: [{ id: 'small', x: 0, y: 0, w: 1, h: 1, image: { width: 1, height: 1, complete: true } }],
    onTiming: event => patchEvents.push(event) });
  for (const phase of ['patch-shader-compilation', 'patch-pipeline-sync', 'patch-bindings', 'patch-textures-copy-and-bindings-enqueue']) {
    assert.ok(mark(patchEvents, phase, 'begin'), `missing optional patch phase ${phase}`);
    assert.ok(mark(patchEvents, phase, 'resolved'), `incomplete optional patch phase ${phase}`);
  }
  patchPass.destroy();

  // Failure after one owned allocation reports the failed phase and total, destroys created resources, and rethrows.
  const failureEvents = [], failedMock = makeDevice({ asyncPipeline: false, failTextureAt: 1 });
  await assert.rejects(FieldPass.create({ owner: ownerFor(failedMock.device), map, image,
    onTiming: event => { failureEvents.push(event); throw new Error('observer failure'); } }), /texture create failed/);
  assert.ok(mark(failureEvents, 'texture-allocation', 'failed'));
  assert.ok(mark(failureEvents, 'total', 'failed'));
  assert.ok(failedMock.resources.length > 0 && failedMock.resources.every(r => r.destroyed === 1));

  console.log('WebGPU field startup timing phases passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
