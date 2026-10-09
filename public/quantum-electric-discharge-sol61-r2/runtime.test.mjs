import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DURATION_MS, dischargeChannels } from './channels.mjs';
import { DischargeRuntime, audioEligible, opticalContract } from './runtime.mjs';
import { PSF_RADIUS, PSF_SIGMA, PSF_GAIN, PSF_WEIGHTS, linearRadiance } from './optical-design.mjs';
import { createSnapAudio } from './audio.mjs';
import { createFramePump } from './frame-pump.mjs';

globalThis.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2 };
globalThis.GPUBufferUsage = { UNIFORM: 1, COPY_DST: 2, STORAGE: 4 };
globalThis.GPUTextureUsage = { RENDER_ATTACHMENT: 1, TEXTURE_BINDING: 2 };
const coords = { source: [100, 150], target: [500, 150] };
const signature = entries => entries.map(entry => `${entry.binding}:${entry.buffer?.type || entry.texture?.sampleType}`).join(',');

function strictPass(encoder, desc) {
  let pipeline = null;
  const groups = new Map();
  const record = { desc, pipeline: null, groups: [], draws: [], ended: false };
  encoder.passes.push(record);
  return {
    setPipeline(value) { pipeline = value; record.pipeline = value; groups.clear(); },
    setBindGroup(index, group) {
      const layouts = pipeline?.desc?.layout?.bindGroupLayouts || [];
      const expected = layouts[index];
      if (!expected) throw new Error(`pipeline has no explicit layout at group index ${index}`);
      if (expected !== group.layout) throw new Error(`bind group incompatible with pipeline layout at group index ${index}`);
      groups.set(index, group); record.groups.push({ index, group });
    },
    draw(vertexCount, instanceCount = 1) {
      const layouts = pipeline?.desc?.layout?.bindGroupLayouts || [];
      for (let index = 0; index < layouts.length; index++) {
        if (!groups.has(index)) throw new Error(`No bind group set at group index ${index}.`);
      }
      record.draws.push({ vertexCount, instanceCount });
    },
    end() { record.ended = true; }
  };
}

function fixture({ compileError = false, failPipeline = false, failBufferAt = 0,
  failTextureAt = 0, failBindGroup = false, failWrite = false, errorScopeAt = 0,
  queueFailAt = 0, deferFenceAt = 0 } = {}) {
  let resolveDeferred;
  const deferred = new Promise(resolve => { resolveDeferred = resolve; });
  const destroyed = [], scopeStack = [], layouts = [], pipelines = [], textures = [], events = [], shaderSources = [];
  let unconfigured = 0, poppedScopes = 0, bufferCount = 0, textureCount = 0, fenceCalls = 0;
  const queue = {
    writes: [], submits: [], waits: 0,
    onSubmittedWorkDone() {
      this.waits++; fenceCalls++;
      if (fenceCalls === queueFailAt) { loseDevice({ reason: 'mock queue loss' }); return Promise.reject(new Error('queue failed')); }
      if (fenceCalls === deferFenceAt) return deferred;
      return Promise.resolve();
    },
    writeBuffer(buffer, offset, data) {
      if (failWrite) throw new Error('write failed');
      this.writes.push({ buffer, offset, data: new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) });
    },
    submit(commands) { this.submits.push(commands); }
  };
  let loseDevice;
  const lost = new Promise(resolve => { loseDevice = resolve; });
  const device = {
    queue, lost,
    createShaderModule({ code }) {
      shaderSources.push(code);
      return { code, async getCompilationInfo() {
        return { messages: compileError ? [{ type: 'error', message: 'invalid WGSL' }] : [] };
      } };
    },
    createBindGroupLayout({ entries }) {
      const layout = { entries: [...entries], signature: signature(entries) };
      layouts.push(layout); return layout;
    },
    createPipelineLayout({ bindGroupLayouts }) { return { bindGroupLayouts }; },
    createRenderPipeline(desc) {
      if (failPipeline) throw new Error('pipeline rejected');
      const entry = desc.fragment.entryPoint, groups = desc.layout.bindGroupLayouts;
      if (entry === 'fs') assert.equal(signature(groups[0].entries), '0:uniform,1:read-only-storage');
      if (entry === 'blurFs') assert.equal(signature(groups[0].entries), '0:uniform,1:float');
      if (entry === 'screenFs') {
        assert.equal(groups.length, 2);
        assert.equal(signature(groups[0].entries), '0:uniform,1:read-only-storage');
        assert.equal(signature(groups[1].entries), '0:uniform,1:float,2:float');
      }
      const pipeline = { desc, getBindGroupLayout: index => groups[index] };
      pipelines.push(pipeline); return pipeline;
    },
    createBuffer(desc) {
      bufferCount++;
      if (failBufferAt === bufferCount) throw new Error('buffer allocation failed');
      const buffer = { desc, destroyed: false, destroy() { this.destroyed = true; destroyed.push('buffer'); } };
      return buffer;
    },
    createTexture(desc) {
      textureCount++; events.push(`texture-create-${textureCount}`);
      if (failTextureAt === textureCount) throw new Error('texture allocation failed');
      const texture = { desc, textureId: textureCount, destroyed: false,
        createView() { return { texture, dimension: '2d' }; },
        destroy() { if (!this.destroyed) { this.destroyed = true; events.push(`texture-destroy-${this.textureId}`); destroyed.push('texture'); } }
      };
      textures.push(texture); return texture;
    },
    createBindGroup({ layout, entries }) {
      const given = entries.map(entry => entry.binding).sort((a, b) => a - b);
      const wanted = layout.entries.map(entry => entry.binding).sort((a, b) => a - b);
      const actualType = resource => resource?.buffer?.desc?.usage & GPUBufferUsage.UNIFORM ? 'uniform' :
        resource?.buffer?.desc?.usage & GPUBufferUsage.STORAGE ? 'read-only-storage' :
        resource?.texture?.desc?.format === 'rgba16float' && resource?.dimension === '2d' ? 'float' : null;
      const allCompatible = layout.entries.every(spec => {
        const entry = entries.find(candidate => candidate.binding === spec.binding);
        const wantedType = spec.buffer?.type || spec.texture?.sampleType;
        return entry && actualType(entry.resource) === wantedType;
      });
      if (failBindGroup || given.length !== wanted.length || given.some((value, index) => value !== wanted[index]) || !allCompatible)
        throw new Error(`bind-group layout mismatch: expected ${wanted}; got ${given}`);
      return { layout, entries };
    },
    createCommandEncoder() {
      const encoder = { passes: [], beginRenderPass(desc) { return strictPass(this, desc); }, finish() { return { passes: this.passes }; } };
      return encoder;
    },
    pushErrorScope(type) { scopeStack.push(type); },
    async popErrorScope() {
      if (!scopeStack.length) throw new Error('unbalanced popErrorScope');
      scopeStack.pop(); poppedScopes++;
      return errorScopeAt === poppedScopes ? new Error('GPU validation error') : null;
    },
    destroy() { destroyed.push('device'); }
  };
  const gpu = { async requestAdapter() { return { async requestDevice() { return device; } }; }, getPreferredCanvasFormat() { return 'bgra8unorm'; } };
  const context = { configure() {}, unconfigure() { unconfigured++; }, getCurrentTexture() { return { createView() { return { canvas: true }; } }; } };
  const canvas = { width: 640, height: 300, getContext(name) { return name === 'webgpu' ? context : null; } };
  let tick = 100;
  const runtime = new DischargeRuntime({ canvas, gpu, now: () => ++tick });
  return { runtime, queue, destroyed, scopeStack, layouts, pipelines, textures, events, shaderSources, context, canvas,
    get unconfigured() { return unconfigured; }, releaseDeferred: resolveDeferred,
    get fenceCalls() { return fenceCalls; } };
}

function convolveLine(values) {
  return values.map((_, index) => PSF_WEIGHTS.reduce((sum, weight, tap) => {
    const source = Math.max(0, Math.min(values.length - 1, index + tap - PSF_RADIUS));
    return sum + values[source] * weight;
  }, 0));
}

test('creative geometry and immutable cycle timing remain R1', () => {
  assert.equal(DURATION_MS, 1050);
  assert.equal(dischargeChannels({ ageMs: 1, ...coords }).length, 0);
  assert.ok(dischargeChannels({ ageMs: 1, ...coords, sourceVisible: true, targetVisible: true }).length > 0);
  const first = dischargeChannels({ ageMs: 180, ...coords, seed: 8, sourceVisible: true, targetVisible: true });
  assert.deepEqual(first, dischargeChannels({ ageMs: 180, ...coords, seed: 8, sourceVisible: true, targetVisible: true }));
  for (const ageMs of [0, 1050, NaN]) assert.equal(dischargeChannels({ ageMs, ...coords, sourceVisible: true, targetVisible: true }).length, 0);
});

test('Sol PSF is normalized symmetric 17-tap sigma 2.4; impulse is one smooth peak and constant input is invariant', () => {
  assert.equal(PSF_RADIUS, 8); assert.equal(PSF_SIGMA, 2.4); assert.equal(PSF_GAIN, 0.65);
  assert.equal(PSF_WEIGHTS.length, 17); assert.equal(opticalContract.weights.length, 17);
  assert.ok(Math.abs(PSF_WEIGHTS.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-12);
  for (let i = 0; i < PSF_WEIGHTS.length; i++) assert.ok(Math.abs(PSF_WEIGHTS[i] - PSF_WEIGHTS.at(-1 - i)) < 1e-15);
  const constant = convolveLine(Array(41).fill(0.375));
  assert.ok(constant.every(value => Math.abs(value - 0.375) < 1e-12));
  const impulse = convolveLine(Array.from({ length: 41 }, (_, i) => i === 20 ? 1 : 0));
  assert.equal(impulse.indexOf(Math.max(...impulse)), 20);
  for (let radius = 1; radius <= 20; radius++) assert.ok(impulse[20 - radius] <= impulse[21 - radius]);
  for (let radius = 1; radius < 20; radius++) assert.ok(impulse[20 + radius] >= impulse[21 + radius]);
  assert.deepEqual(linearRadiance([2, 1, 0.5], [8, 8, 8], false, true), [0, 0, 0]);
  assert.deepEqual(linearRadiance([2, 1, 0.5], [8, 8, 8], true, false), [2, 1, 0.5]);
});

test('WGSL contains exact generated Gaussian weights, backing-pixel separable taps and one final display encode', async () => {
  const source = await readFile(new URL('./runtime.mjs', import.meta.url), 'utf8');
  const f = fixture(); f.runtime.start({ id: 'shader-inspect' });
  await f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true });
  const blurShader = f.shaderSources.find(code => code.includes('const PSF_WEIGHTS: array<f32, 17>'));
  const kernel = blurShader?.match(/const PSF_WEIGHTS: array<f32, 17> = array<f32, 17>\(([^)]+)\)/);
  assert.ok(kernel, 'shader embeds the Sol analytic kernel');
  const shaderWeights = kernel[1].split(',').map(value => Number(value.trim()));
  assert.equal(shaderWeights.length, 17);
  shaderWeights.forEach((value, index) => assert.ok(Math.abs(value - PSF_WEIGHTS[index]) < 5e-13));
  assert.match(blurShader, /for \(var tap: i32 = -8; tap <= 8; tap \+= 1\)/);
  assert.match(blurShader, /textureLoad\(sourceTexture, at, 0\)/);
  const displayShader = f.shaderSources.find(code => code.includes('scatteredEmission'));
  assert.match(displayShader, /direct \+ display\.scatterGain \* scatter \* display\.observerOn/);
  assert.match(source, /vec3f\(1\.0\) \+ radiance/);
  assert.equal((source.match(/pow\(mapped, vec3f\(1\.0 \/ 2\.4\)\)/g) || []).length, 1);
  assert.doesNotMatch(displayShader, /localScatter|textureSampleLevel/);
  await f.runtime.dispose();
});

test('strict explicit layouts run source, horizontal blur, vertical blur and display passes in one fenced submission', async () => {
  const f = fixture({ deferFenceAt: 2 }); f.runtime.start({ id: 'r2-four-pass' });
  const pendingReceipt = f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true });
  for (let i = 0; i < 50 && f.queue.submits.length === 0; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.queue.submits.length, 1); assert.equal(f.runtime.lastReceipt, null);
  f.releaseDeferred();
  const receipt = await pendingReceipt;
  assert.equal(receipt.causeId, 'r2-four-pass'); assert.ok(receipt.completedAt >= receipt.submittedAt);
  assert.equal(f.scopeStack.length, 0); assert.equal(f.queue.submits.length, 1);
  assert.deepEqual(f.layouts.map(layout => layout.signature), [
    '0:uniform,1:read-only-storage', '0:uniform,1:float', '0:uniform,1:float,2:float'
  ]);
  const passes = f.queue.submits[0][0].passes;
  assert.deepEqual(passes.map(pass => pass.pipeline?.desc.fragment.entryPoint), ['fs', 'blurFs', 'blurFs', 'screenFs']);
  assert.ok(passes.every(pass => pass.ended && pass.draws.length === 1));
  assert.deepEqual(passes[0].groups.map(group => group.index), [0]);
  assert.deepEqual(passes[1].groups.map(group => group.index), [0]);
  assert.deepEqual(passes[2].groups.map(group => group.index), [0]);
  assert.deepEqual(passes[3].groups.map(group => group.index), [0, 1]);
  assert.equal(f.textures.length, 3);
  assert.ok(f.textures.every(texture => texture.desc.format === 'rgba16float' && texture.desc.size[0] === 640 && texture.desc.size[1] === 300));
  const written = f.queue.writes.map(item => item.data);
  assert.equal(written[0].length, 128 * 8);
  assert.equal(written[2][4], 1); assert.equal(written[2][5], 0);
  assert.equal(written[3][4], 0); assert.equal(written[3][5], 1);
  assert.equal(written[4][0], 1); assert.ok(Math.abs(written[4][1] - 0.65) < 1e-7);
  const expected = dischargeChannels({ ageMs: 180, ...coords, seed: 1, sourceVisible: true, targetVisible: true });
  assert.deepEqual(written[0].slice(0, expected.length), expected);
  assert.equal(audioEligible(receipt), true);
  await f.runtime.dispose(); assert.equal(f.unconfigured, 1); assert.ok(f.destroyed.includes('device'));
});

test('observer-off is direct-only and still executes zeroed blur passes; source-off clears all three HDR targets and canvas', async () => {
  const f = fixture(); f.runtime.start({ id: 'controls' });
  const directOnly = await f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true, observerScatter: false });
  assert.ok(directOnly?.completed); assert.equal(directOnly.controls.observerScatter, false);
  assert.equal(f.textures.length, 3, 'same backing size reuses emission and both intermediates');
  assert.equal(f.queue.writes[2].data[2], 0); assert.equal(f.queue.writes[3].data[2], 0);
  assert.equal(f.queue.writes[4].data[0], 0);
  const previousTargets = [...f.textures];
  assert.equal(await f.runtime.render({ ...coords, ageMs: 200, sourceVisible: true, targetVisible: true, sourceEmission: false }), null);
  assert.equal(f.runtime.lastReceipt, null);
  const clearPasses = f.queue.submits.at(-1)[0].passes;
  assert.equal(clearPasses.length, 4);
  assert.deepEqual(new Set(clearPasses.slice(0, 3).map(pass => pass.desc.colorAttachments[0].view.texture)), new Set(previousTargets));
  assert.equal(clearPasses[3].desc.colorAttachments[0].view.canvas, true);
  assert.ok(clearPasses.every(pass => pass.desc.colorAttachments[0].loadOp === 'clear' && !pass.draws.length));
  await f.runtime.dispose();
});

test('hidden source/target, no cause and invalid lifetime clear without a receipt', async () => {
  const f = fixture(); f.runtime.start({ id: 'clear-gates' });
  const live = await f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true }); assert.ok(live);
  for (const options of [
    { ...coords, ageMs: 200, sourceVisible: false, targetVisible: true },
    { ...coords, ageMs: 200, sourceVisible: true, targetVisible: false },
    { ...coords, ageMs: 1050, sourceVisible: true, targetVisible: true },
    { ...coords, ageMs: NaN, sourceVisible: true, targetVisible: true }
  ]) assert.equal(await f.runtime.render(options), null);
  f.runtime.stop(); assert.equal(await f.runtime.render({ ...coords, ageMs: 200, sourceVisible: true, targetVisible: true }), null);
  assert.equal(f.runtime.lastReceipt, null); await f.runtime.dispose();
});

test('request sequence rejects stale completion when controls change while a four-pass frame is fenced', async () => {
  const f = fixture({ deferFenceAt: 2 }); f.runtime.start({ id: 'stale-frame' });
  const first = f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true, observerScatter: true });
  for (let i = 0; i < 50 && f.queue.submits.length === 0; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.queue.submits.length, 1); assert.equal(f.runtime.lastReceipt, null);
  const next = f.runtime.render({ ...coords, ageMs: 200, sourceVisible: true, targetVisible: true, observerScatter: false });
  f.releaseDeferred();
  assert.equal(await first, null);
  const newest = await next; assert.equal(newest?.controls.observerScatter, false);
  assert.equal(f.queue.submits.length, 3);
  assert.ok(f.queue.submits[1][0].passes.every(pass => !pass.draws.length), 'stale frame is cleared before new controls render');
  assert.equal(f.scopeStack.length, 0);
  await f.runtime.dispose();
});

test('resize waits for queue use, replaces and destroys both intermediates with the emission target', async () => {
  const f = fixture(); f.runtime.start({ id: 'resize' });
  await f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true });
  const oldTargets = [...f.textures]; f.canvas.width = 800;
  const eventStart = f.events.length;
  const resized = await f.runtime.render({ ...coords, ageMs: 200, sourceVisible: true, targetVisible: true });
  assert.ok(resized?.completed); assert.equal(f.textures.length, 6);
  assert.ok(oldTargets.every(texture => texture.destroyed));
  const events = f.events.slice(eventStart);
  assert.ok(events.indexOf('texture-create-4') < events.indexOf('texture-destroy-1'));
  assert.ok(events.indexOf('texture-create-6') < events.indexOf('texture-destroy-3'));
  await f.runtime.dispose(); assert.ok(f.textures.every(texture => texture.destroyed));
});

test('one RAF chain preserves the R1 1050ms lifetime and 900ms inter-cycle gap', async () => {
  const callbacks = []; let completeFirst, runs = 0;
  const pump = createFramePump(callback => callbacks.push(callback), () => {
    runs++; if (runs === 1) return new Promise(resolve => { completeFirst = resolve; });
  });
  pump.schedule(); pump.schedule(); assert.equal(callbacks.length, 1);
  callbacks.shift()(); assert.equal(runs, 1); pump.schedule(); pump.schedule(); assert.equal(callbacks.length, 0);
  completeFirst(); await new Promise(resolve => setImmediate(resolve)); assert.equal(callbacks.length, 1);
  callbacks.shift()(); await new Promise(resolve => setImmediate(resolve)); assert.equal(runs, 2); assert.equal(callbacks.length, 0);
  pump.schedule(); assert.equal(callbacks.length, 1); pump.dispose(); callbacks.shift()();
  await new Promise(resolve => setImmediate(resolve)); assert.equal(runs, 2);
  const preview = await readFile(new URL('./preview.html', import.meta.url), 'utf8');
  assert.match(preview, /import \{DURATION_MS\} from '\.\/channels\.mjs'/);
  assert.match(preview, /if\(age>=DURATION_MS\)[\s\S]{0,160}setTimeout\(replay,900\)\}scheduleFrame\(\)/);
  assert.doesNotMatch(preview, /age>=1950/);
});

test('verify mode preserves selected observer visuals and creates no AudioContext or sound source', async () => {
  const f = fixture(); f.runtime.start({ id: 'verify' });
  const receipt = await f.runtime.render({ ...coords, ageMs: 300, sourceVisible: true, targetVisible: true, verify: true, observerScatter: true });
  assert.equal(receipt.controls.observerScatter, true); assert.equal(receipt.controls.verify, true);
  assert.equal(f.queue.writes[2].data[2], 1); assert.equal(audioEligible(receipt), false);
  let contexts = 0, starts = 0;
  class FakeAudioContext {
    constructor() { contexts++; this.state = 'suspended'; this.sampleRate = 10; this.currentTime = 0; this.destination = {}; }
    async resume() { this.state = 'running'; }
    node() { return { connect() { return this; }, start() { starts++; }, stop() {},
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createBuffer() { return { getChannelData: () => new Float32Array(2) }; }
    createBufferSource() { return this.node(); } createBiquadFilter() { return this.node(); }
    createGain() { return this.node(); } createOscillator() { return this.node(); }
  }
  const audio = createSnapAudio({ verify: true, AudioContextType: FakeAudioContext });
  assert.equal(await audio.enable(), false); assert.equal(audio.play(), false); assert.equal(contexts, 0); assert.equal(starts, 0);
  await f.runtime.dispose();
});

test('shader, pipeline, target and buffer failures balance scopes and release partial resources', async () => {
  for (const options of [{ compileError: true }, { failPipeline: true }, { failBufferAt: 3 }, { failTextureAt: 2 }]) {
    const f = fixture(options); f.runtime.start({ id: 'init-fail' });
    await assert.rejects(f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true }));
    assert.equal(f.scopeStack.length, 0); assert.ok(f.textures.every(texture => texture.destroyed));
    await f.runtime.dispose(); assert.ok(f.destroyed.includes('device')); assert.equal(f.unconfigured, 1);
  }
});

test('draw, bind, write and validation errors cannot return receipts or leak replacement targets', async () => {
  for (const options of [{ failBindGroup: true }, { failWrite: true }, { errorScopeAt: 2 }]) {
    const f = fixture(options); f.runtime.start({ id: 'draw-fail' });
    await assert.rejects(f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true }));
    assert.equal(f.scopeStack.length, 0); assert.equal(f.runtime.lastReceipt, null); assert.ok(f.textures.every(texture => texture.destroyed));
    await f.runtime.dispose();
  }
});

test('queue failure cannot produce a receipt; disposal waits for pending four-pass work and destroys all three textures', async () => {
  const bad = fixture({ queueFailAt: 2 }); bad.runtime.start({ id: 'queue-fail' });
  await assert.rejects(bad.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true }), /queue failed/);
  assert.equal(bad.runtime.lastReceipt, null); assert.equal(bad.scopeStack.length, 0); await bad.runtime.dispose();
  const f = fixture({ deferFenceAt: 2 }); f.runtime.start({ id: 'dispose-pending' });
  const pending = f.runtime.render({ ...coords, ageMs: 180, sourceVisible: true, targetVisible: true });
  for (let i = 0; i < 50 && f.queue.submits.length === 0; i++) await new Promise(resolve => setImmediate(resolve));
  const dispose = f.runtime.dispose(); assert.equal(f.runtime.ready, false); f.releaseDeferred();
  assert.equal(await pending, null); await dispose; assert.ok(f.textures.every(texture => texture.destroyed));
  assert.equal(f.scopeStack.length, 0);
});
