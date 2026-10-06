import test from 'node:test';
import assert from 'node:assert/strict';
import { createReloadRenderer } from '../runtime.mjs';
import { makeMockGpu } from '../mock-gpu.mjs';
import { createGalleryStartup } from '../startup-bootstrap.mjs';
import { SHADER_ENTRIES, UNIFORM_BYTES, packReloadUniform } from '../creative/reload-e-sol61-r4.mjs';
import fs from 'node:fs';

const shaderSource = fs.readFileSync(new URL('../creative/reload-e-sol61-r4.wgsl', import.meta.url), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const startup = () => createGalleryStartup({ parent: { postMessage() {} }, location: { search: '?galleryStartupToken=test&galleryVersionId=reload-e-zero-sol61-r4&galleryAttemptEpoch=31', origin: 'http://fixture.test' }, performance: { now: () => 0 }, addEventListener() {}, removeEventListener() {} });
const args = (mock, life, extra = {}) => ({ canvas: mock.canvas, gpu: mock.gpu, shaderSource, shaderEntries: SHADER_ENTRIES, uniformBytes: UNIFORM_BYTES, packReloadUniform, isCurrent: () => life.isActive(), ...extra });

test('inactive owner at constructor entry performs no native work', async () => {
  const mock = makeMockGpu(); let calls = 0;
  mock.gpu.requestAdapter = async () => { calls++; return null; };
  await assert.rejects(createReloadRenderer(args(mock, { isActive: () => false })), e => e.code === 'RELOAD_STARTUP_RETIRED');
  assert.equal(calls, 0); assert.equal(mock.log.configured, false); assert.equal(mock.log.destroys, 0);
});

test('retirement during adapter wait never requests a device after the late adapter settles', async () => {
  const mock = makeMockGpu(), life = startup(), gate = deferred(), entered = deferred(); let deviceCalls = 0;
  mock.gpu.requestAdapter = () => { entered.resolve(); return gate.promise; };
  const pending = createReloadRenderer(args(mock, life)); await entered.promise; life.cancel(); gate.resolve({ requestDevice: async () => { deviceCalls++; return mock.device; } });
  await assert.rejects(pending, e => e.code === 'RELOAD_STARTUP_RETIRED');
  assert.equal(deviceCalls, 0); assert.equal(mock.log.configured, false); assert.equal(mock.log.destroys, 0);
});

for (const leaf of ['world', 'blurX', 'blurY', 'composite']) test(`retirement at ${leaf} pipeline prevents later pipeline calls and releases owned resources`, async () => {
  const mock = makeMockGpu(), life = startup(), gate = deferred(), entered = deferred(), labels = [];
  const create = mock.device.createRenderPipelineAsync.bind(mock.device);
  mock.device.createRenderPipelineAsync = async descriptor => { labels.push(descriptor.label); if (descriptor.label === `reload-e-r4/${leaf}`) { entered.resolve(); await gate.promise; } return create(descriptor); };
  const pending = createReloadRenderer(args(mock, life)); await entered.promise; life.cancel(); gate.resolve();
  await assert.rejects(pending, e => e.code === 'RELOAD_STARTUP_RETIRED');
  const expected = ['world', 'blurX', 'blurY', 'composite'].slice(0, ['world', 'blurX', 'blurY', 'composite'].indexOf(leaf) + 1).map(x => `reload-e-r4/${x}`);
  assert.deepEqual(labels, expected); assert.equal(mock.log.destroys, 2); assert.equal(mock.log.unconfigured, true);
});

test('startup observer marks actual sequential leaf boundaries without changing pipeline order', async () => {
  const mock = makeMockGpu(), life = startup(), events = [];
  const renderer = await createReloadRenderer(args(mock, life, { onStartupProgress: event => events.push({ ...event }) }));
  assert.deepEqual(events.filter(e => e.boundary === 'phase-start').map(e => `${e.stage}:${e.leaf}`), ['adapter:requestAdapter', 'device:requestDevice', 'pipelines:shader-and-pipeline-preparation']);
  assert.deepEqual(events.filter(e => e.leaf.startsWith('pipeline:')).map(e => e.leaf), ['pipeline:world', 'pipeline:blurX', 'pipeline:blurY', 'pipeline:composite']);
  await renderer.dispose();
});

test('device loss during compilation rejects with device-loss cause and never returns ready', async () => {
  const mock = makeMockGpu(), life = startup(), compilation = deferred(), lost = deferred(); let lostCalls = 0;
  mock.device.lost = lost.promise;
  const create = mock.device.createShaderModule.bind(mock.device);
  mock.device.createShaderModule = (...args) => { const module = create(...args); module.getCompilationInfo = () => compilation.promise; return module; };
  const pending = createReloadRenderer(args(mock, life, { onDeviceLost: () => lostCalls++ }));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  lost.resolve({ message: 'device gone' }); await Promise.resolve(); await Promise.resolve(); compilation.resolve({ messages: [] });
  await assert.rejects(pending, e => e.code === 'RELOAD_DEVICE_LOST');
  assert.equal(lostCalls, 1); assert.equal(mock.log.destroys, 2); assert.equal(mock.log.unconfigured, true);
});
