const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const pass = require(path.join(root, 'webgpu-hazard-fields.js'));
const camera = { x: 0, y: 0 };
const viewport = { width: 900, height: 600 };

function fixture() {
  const field = { id: 'hazard_1', kind: 'poison', sourceId: 'bot_1',
    x: 120, y: 140, radius: 145, strength: 1.9,
    createdAt: 1000, endsAt: 13000 };
  const effect = { id: 'magic_1', type: 'hazard-poison', playerId: 'bot_1',
    x: 120, y: 140, radius: 145, variant: '1.9', at: 1001,
    startedAt: 5, duration: 1200, hazardFieldId: field.id,
    hazardFieldCreatedAt: field.createdAt, hazardFieldEndsAt: field.endsAt };
  const scene = { hazardFields: [field], hazardFieldRetirements: [],
    serverNow: 2000, now: 10, textures: { poisonMaterialTransport: {
      complete: true, naturalWidth: 2304, naturalHeight: 2048
    } } };
  return { field, effect, scene };
}

function claim(effect, scene, view = { camera, zoom: 1, viewport }) {
  return pass.claimPoisonEffect({ effect, scene, ...view });
}

test('exact active receipt is owned by the visible field command', () => {
  const { field, effect, scene } = fixture();
  assert.deepEqual({ ...claim(effect, scene) }, { fieldId: field.id, visible: true });
  assert.ok(pass.plan({ scene, camera, zoom: 1, viewport })
    .some(command => command.kind === 'poison' && command.fieldId === field.id));
  assert.equal(claim(effect, scene, { camera: { x: 2000, y: 2000 }, zoom: 1, viewport }).visible, false);
});

test('same-source newer field cannot claim an older effect', () => {
  const { field, effect, scene } = fixture();
  const newer = { ...field, id: 'hazard_2', createdAt: 3000, endsAt: 15000 };
  scene.hazardFields = [newer];
  scene.serverNow = 4000;
  assert.equal(claim(effect, scene), null);
  scene.serverNow = 14000;
  assert.equal(claim(effect, scene).omittedReason, 'authoritative-poison-field-expired');
});

test('missing live field remains a blocking missing claim', () => {
  const { effect, scene } = fixture();
  scene.hazardFields = [];
  assert.equal(claim(effect, scene), null);
  scene.hazardFieldRetirements = [{ id: 'other', reason: 'evicted', retiredAt: 1500 }];
  assert.equal(claim(effect, scene), null);
});

test('eviction needs a matching authoritative retirement', () => {
  const { effect, scene } = fixture();
  scene.hazardFields = [];
  scene.hazardFieldRetirements = [{ id: effect.hazardFieldId, reason: 'evicted', retiredAt: 1600 }];
  assert.equal(claim(effect, scene).omittedReason, 'authoritative-poison-field-evicted');
  scene.hazardFieldRetirements[0].retiredAt = 999;
  assert.equal(claim(effect, scene), null);
});

test('mismatched or duplicate live field cannot be silently omitted', () => {
  const { field, effect, scene } = fixture();
  scene.hazardFields = [{ ...field, x: field.x + 1 }];
  assert.equal(claim(effect, scene), null);
  scene.hazardFields = [field, { ...field }];
  assert.equal(claim(effect, scene), null);
  scene.hazardFields = [];
  assert.equal(claim({ ...effect, hazardFieldId: '' }, scene), null);
});

function serverFunctions(filename) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));
  let time = 1000, id = 0;
  const scope = { now: () => ++time, uid: prefix => `${prefix}${++id}`,
    HAZARD_FIELD_DURATION_MS: 12000,
    batchActivationEffectSuppressed: () => false,
    abilityBatchPresentationScopes: new WeakMap() };
  vm.runInNewContext(section('function pushMagicEffect(', 'function pushGainAte(') +
    section('function addHazardField(', 'function safeThrowPoint(') +
    '\nthis.add = addHazardField;', scope);
  return scope.add;
}

for (const filename of ['offline-server-main.js', 'offline-server-worker.js']) {
  test(`${filename} emits field identity and bounded eviction proof`, () => {
    const add = serverFunctions(filename);
    const room = { hazardFields: [], hazardFieldRetirements: [], magicEffects: [] };
    const source = { id: 'bot_1', x: 120, y: 140 };
    const first = add(room, source, 'poison', 120, 140, 145, 1.9);
    const receipt = room.magicEffects[0];
    assert.equal(receipt.hazardFieldId, first.id);
    assert.equal(receipt.hazardFieldCreatedAt, first.createdAt);
    assert.equal(receipt.hazardFieldEndsAt, first.endsAt);
    for (let i = 0; i < 32; i++) add(room, source, 'poison', 150 + i, 140, 145, 1.9);
    assert.equal(room.hazardFields.length, 32);
    assert.equal(room.hazardFields.some(field => field.id === first.id), false);
    assert.equal(room.hazardFieldRetirements[0].id, first.id);
    assert.equal(room.hazardFieldRetirements[0].reason, 'evicted');
  });
}
