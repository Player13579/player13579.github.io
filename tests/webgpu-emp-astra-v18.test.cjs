const assert = require('node:assert/strict');
const EMP = require('../webgpu-emp-effect.js');

assert.deepEqual(Object.keys(EMP.TYPES), ['emp-charge', 'emp', 'emp-resonance', 'emp-cancel', 'emp-storage-lock']);
assert.deepEqual(Object.values(EMP.TYPES), [0, 1, 2, 3, 4]);
assert.deepEqual(EMP.DURATIONS, {
  'emp-charge': 1200, emp: 1200, 'emp-resonance': 1600,
  'emp-cancel': 1600, 'emp-storage-lock': 7000
});
for (const marker of ['fn capacitor(', 'fn pulse(', 'let contact=ease((frontRadius-span)/35.)',
  'let collapse=ease(age/650.)', 'let scanY=-49.+98.*ease(age/310.)',
  'RGBA8 quantization must not round coverage to zero', 'return vec4f(out.rgb,clamp(max(1./255.']) {
  assert.ok(EMP.shader.includes(marker), `v1.8 shader feature missing: ${marker}`);
}

const viewport = {kind: 'main', width: 960, height: 620, pixelWidth: 1920, pixelHeight: 1240};
const common = {phase: 'playing', camera: {x: 0, y: 0}, zoom: 1,
  viewport, now: 100, alpha: 1};
const charge = EMP.plan({...common, effect: {id: 'charge-1', type: 'emp-charge', x: 100,
  y: 110, startedAt: 0, duration: 1200, radius: 125, empPulseId: 'pulse-1'}});
assert.ok(charge);
assert.equal(charge.mode, 0);
assert.equal(charge.progress, 100 / 1200);
assert.equal(charge.values.length, 16);
assert.ok([...charge.values].every(Number.isFinite));
assert.equal(charge.values[12], 0);

const resonance = EMP.plan({...common, now: 300, effect: {id: 'res-1', type: 'emp-resonance',
  x: 150, y: 110, startedAt: 200, duration: 1600, radius: 520,
  empSourceAxis: 0.25, resolvedEmpPulseIds: ['pulse-1']}});
assert.ok(resonance);
assert.equal(resonance.mode, 2);
assert.equal(resonance.sourceHalfSpan, 50);
assert.equal(resonance.values[12], 50);
assert.equal(EMP.plan({...common, now: 300, effect: {id: 'res-missing', type: 'emp-resonance',
  x: 150, y: 110, startedAt: 200, duration: 1600, radius: 520,
  empSourceAxis: 0.25, resolvedEmpPulseIds: ['unknown']}}), null,
  'interaction with no source-origin evidence must not fabricate span');
assert.equal(EMP.plan({...common, now: 300, effect: {id: 'res-no-axis', type: 'emp-resonance',
  x: 150, y: 110, startedAt: 200, duration: 1600, radius: 520,
  sourceHalfSpan: 50}}), null, 'interaction axis is authoritative input and cannot default');

const storage = EMP.plan({...common, now: 400, effect: {id: 'lock-1', type: 'emp-storage-lock',
  x: 400, y: 200, playerId: 'recipient', startedAt: 0, duration: 7000, radius: 105},
  storageActor: {id: 'recipient', alive: true, ejected: false, renderedX: 410, renderedY: 220}});
assert.ok(storage);
assert.equal(storage.sourceX, 410);
assert.equal(storage.sourceY, 220);
assert.equal(storage.values[0], 410 * 2);
assert.equal(EMP.plan({...common, effect: {id: 'lock-dead', type: 'emp-storage-lock',
  x: 400, y: 200, playerId: 'recipient', startedAt: 0, duration: 7000},
  storageActor: {id: 'recipient', alive: false}}), null);
for (const type of Object.keys(EMP.TYPES)) {
  const plan = EMP.plan({...common, effect: {id: `e-${type}`, type, x: 1, y: 2,
    startedAt: 0, duration: EMP.DURATIONS[type], radius: 200,
    empSourceAxis: 0.1, sourceHalfSpan: 40, empPulseId: `p-${type}`}});
  assert.ok(plan, `${type} should plan with explicit interaction geometry`);
  assert.equal(plan.type, type);
  assert.ok(plan.values.every(Number.isFinite));
}
assert.equal(EMP.plan({...common, phase: 'selecting', effect: {id: 'bad', type: 'emp',
  x: 1, y: 2, startedAt: 0}}), null);
assert.equal(EMP.plan({...common, viewport: {...viewport, pixelWidth: 0}, effect: {id: 'bad',
  type: 'emp', x: 1, y: 2, startedAt: 0}}), null);

const buffers = [], writes = [], encoded = [], staged = [];
const device = {
  queue: {writeBuffer(buffer, offset, data) { writes.push({buffer, offset, data: new Float32Array(data)}); }},
  createShaderModule({code}) { assert.equal(code, EMP.shader); return {code}; },
  createRenderPipeline(desc) { assert.equal(desc.fragment.targets[0].blend.color.srcFactor, 'one');
    assert.equal(desc.fragment.targets[0].blend.color.dstFactor, 'one-minus-src-alpha');
    return {desc, getBindGroupLayout() { return {}; }}; },
  createBuffer(desc) { const buffer = {...desc, destroyed: 0, destroy() { this.destroyed++; }}; buffers.push(buffer); return buffer; },
  createBindGroup(desc) { return desc; }
};
const owner = {state: 'ready', device, format: 'rgba8unorm', own(buffer) { return buffer; },
  release(buffer) { return buffers.includes(buffer); }};
const pass = EMP.create({frameOwner: owner});
const frame = {stage(label) { staged.push(label); }, add(item) { encoded.push(item); }};
const result = pass.record({frame, target: 'main-color', viewport, planned: charge});
assert.deepEqual(result, {effectId: 'charge-1', type: 'emp-charge', drawn: true});
assert.equal(writes.length, 1);
assert.equal(writes[0].data.length, 20);
assert.deepEqual([...writes[0].data.slice(0, 4)], [1920, 1240, 2, 2]);
assert.deepEqual([...writes[0].data.slice(4)], [...charge.values]);
assert.deepEqual(staged, ['world:emp:charge-1']);
assert.equal(encoded.length, 1);
let draws = 0;
encoded[0].encode({setPipeline() {}, setBindGroup() {}, draw(count) { draws = count; }},
  {device, format: 'rgba8unorm', width: 1920, height: 1240});
assert.equal(draws, 6);
assert.throws(() => encoded[0].encode({setPipeline() {}, setBindGroup() {}, draw() {}},
  {device, format: 'bgra8unorm', width: 1920, height: 1240}), /target device, format or backing size mismatch/);
pass.destroy();
assert.equal(pass.state, 'destroyed');
assert.equal(buffers[0].destroyed, 1);
pass.destroy();
assert.equal(buffers[0].destroyed, 1);
console.log('EMP Astra v1.8 integration contract passed');
