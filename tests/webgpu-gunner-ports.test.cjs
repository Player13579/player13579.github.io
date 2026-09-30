const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const shot = require(path.join(root, 'webgpu-gunner-shot-e.js'));
const contacts = require(path.join(root, 'webgpu-taser-headshot-e.js'));
const viewport = { kind: 'main', width: 400, height: 300,
  pixelWidth: 800, pixelHeight: 600 };
const camera = { x: 0, y: 0 };
const shotEffect = (overrides = {}) => ({ id: 'shot-1', type: 'action-shoot',
  playerId: 'gunner', x: 100, y: 100, targetX: 240, targetY: 100,
  radius: 90, startedAt: 100, duration: 1200, variant: 'handgun', ...overrides });
const action = (effect = shotEffect()) => ({ kind: 'shoot', motionId: 'action-shoot',
  sourceEffectId: effect.id, variant: effect.variant });

const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const routerStart = appSource.indexOf('function captureWebGPUMainAppLateMagicScene(');
const routerEnd = appSource.indexOf('// WEBGPU_MAIN_APP_LATE_MAGIC_ADAPTER_V1_END', routerStart);
const routerSource = appSource.slice(routerStart, routerEnd);
function runLateRouter(effects, { actors, owners, api = shot, contactApi = contacts, now = 400 } = {}) {
  const data = { phase: 'playing', selfId: 'viewer', roomId: 'room', players: actors };
  const viewportSnapshot = { ...viewport, worldToLogical: [1, 0, 0, 1, 0, 0] };
  const sandbox = {
    window: { DvaWebGPUGunnerShotE: api, DvaWebGPUTaserHeadshotE: contactApi },
    state: { frameNow: now, magicEffects: effects },
    performance: { now: () => now },
    prefersReducedMotion: () => false,
    renderedPlayer: player => player,
    estimatedServerNow: () => now,
    isSharedHeadMarkerEffect: () => false,
    isCreditHeadMarkerEffect: () => false,
    isWallClockEmpLifetime: () => false,
    eEffectNow: effect => effect.startedAt === undefined ? now : now,
    Math, Number, String, Object, Set, Map, Array, Boolean, RegExp
  };
  const capture = vm.runInNewContext(`${routerSource}\ncaptureWebGPUMainAppLateMagicScene;`, sandbox);
  return capture(data, viewportSnapshot, camera, 1, {}, null,
    { visibleActors: actors, actionOwners: owners });
}

test('shared cardinal muzzle recipe preserves all four legacy directions and weapon offsets', () => {
  const origin = { x: 100, y: 100 };
  const cases = [
    [{ targetX: 180, targetY: 140 }, { dx: 1, dy: 0, x: 129, y: 68 }],
    [{ targetX: 20, targetY: 60 }, { dx: -1, dy: 0, x: 71, y: 68 }],
    [{ targetX: 120, targetY: 180 }, { dx: 0, dy: 1, x: 92, y: 119 }],
    [{ targetX: 80, targetY: 20 }, { dx: 0, dy: -1, x: 108, y: 28 }]
  ];
  for (const [axis, expected] of cases) {
    const muzzle = shot.cardinalMuzzle({ ...origin, ...axis, variant: 'handgun' });
    assert.deepEqual({ dx: muzzle.dx, dy: muzzle.dy, ...muzzle.source }, expected);
  }
  const taser = shot.cardinalMuzzle({ ...origin, targetX: 180, targetY: 100, variant: 'taser' });
  assert.deepEqual(taser.source, { x: 131, y: 68 });
  assert.equal(shot.cardinalMuzzle({ ...origin, targetX: 100, targetY: 100, variant: 'handgun' }), null);
});

test('gunner plan uses cardinal source and scales source/target with physical DPR', () => {
  const effect = shotEffect();
  const actor = { id: 'gunner', alive: true, visible: true };
  const owner = action(effect);
  const playerCommand = { playerId: 'gunner', sourceEffectId: effect.id,
    motionId: owner.motionId, variant: owner.variant };
  const planned = shot.plan({ effect, actor, actorVisible: true, actionOwner: owner,
    playerCommand, now: 400, phase: 'playing', viewerId: 'viewer', camera, zoom: 1,
    viewport, alpha: 1 });
  assert.equal(planned.eventId, effect.id);
  assert.deepEqual(planned.source, shot.cardinalMuzzle(effect).source);
  assert.equal(planned.values[2], 258);
  assert.equal(planned.values[3], 136);
  assert.equal(planned.values[4], 480);
  const doubled = shot.plan({ effect, actor, actorVisible: true, actionOwner: owner,
    playerCommand, now: 400, phase: 'playing', viewerId: 'viewer', camera, zoom: 1,
    viewport: { ...viewport, pixelWidth: 1600, pixelHeight: 1200 }, alpha: 1 });
  assert.equal(doubled.values[2], planned.values[2] * 2);
  assert.equal(doubled.values[4], planned.values[4] * 2);
  assert.equal(shot.plan({ effect, actor, actorVisible: false, actionOwner: owner,
    playerCommand, now: 400, phase: 'playing', camera, zoom: 1, viewport }), null);
  assert.equal(shot.plan({ effect, actor, actorVisible: true, actionOwner: owner,
    playerCommand, now: 100, phase: 'playing', camera, zoom: 1, viewport }), null);
});

test('gunner records once on the shared ordered frame and releases owned buffer', () => {
  const writes = [], stages = [], additions = [], buffers = [];
  const device = {
    queue: { writeBuffer: (...args) => writes.push(args) },
    createShaderModule: descriptor => descriptor,
    createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }),
    createBuffer: descriptor => { const buffer = { descriptor, destroy() { buffer.destroyed = true; } }; buffers.push(buffer); return buffer; },
    createBindGroup: descriptor => descriptor
  };
  const owner = { state: 'ready', device, format: 'rgba8unorm', own: value => value,
    release: () => true };
  const pass = shot.create({ frameOwner: owner });
  const effect = shotEffect();
  const planned = shot.plan({ effect, actor: { id: 'gunner', alive: true }, actorVisible: true,
    actionOwner: action(effect), playerCommand: { playerId: 'gunner' }, now: 400,
    phase: 'playing', camera, zoom: 1, viewport });
  const frame = { stage: name => stages.push(name), add: item => additions.push(item) };
  assert.equal(pass.record({ frame, target: 'main', viewport, planned }), effect.id);
  assert.throws(() => pass.record({ frame, target: 'main', viewport, planned }), /already recorded/);
  assert.equal(stages.length, 1);
  assert.equal(additions.length, 1);
  assert.equal(writes.length, 1);
  pass.destroy();
  assert.equal(buffers[0].destroyed, true);
});

test('headshot contacts accept dead visible targets, reject hidden ones, and honor short visual expiry', () => {
  const effect = { id: 'hs-1', type: 'action-gunner-headshot', playerId: 'shooter',
    targetId: 'target', x: 200, y: 140, startedAt: 100, duration: 1200,
    variant: 'aim:assault' };
  assert.equal(contacts.classify(effect).kind, 'headshot');
  const visibleDeadTarget = { id: 'target', alive: false, visible: true };
  const input = { scene: { effects: [effect], players: [visibleDeadTarget], viewerId: 'viewer',
    nowMs: 200, reducedMotion: false }, camera, zoom: 1, viewport: { ...viewport, pixelWidth: 400, pixelHeight: 300 } };
  const plan = contacts.plan(input);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].killOutcomeUnknown, true);
  assert.ok(contacts.commandsFor(plan[0]).length > 0);
  assert.deepEqual(contacts.plan({ ...input, scene: { ...input.scene,
    players: [{ ...visibleDeadTarget, invisible: true }] } }), []);
  assert.deepEqual(contacts.plan({ ...input, scene: { ...input.scene, nowMs: 520 } }), []);
  const taser = { ...effect, id: 'taser-1', type: 'action-taser', variant: '' };
  const taserPlan = contacts.plan({ ...input, scene: { ...input.scene, effects: [taser], nowMs: 200 } });
  assert.equal(taserPlan[0].duration, contacts.TASER_MS);
});

test('registry, scene validation, and recorder own both ports inside source-ordered magicEffects only', () => {
  const registry = fs.readFileSync(path.join(root, 'webgpu-main-pass-registry.js'), 'utf8');
  const scene = fs.readFileSync(path.join(root, 'webgpu-main-scene.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(registry, /DvaWebGPUGunnerShotE[\s\S]*webgpu-gunner-shot-e\.js/);
  assert.match(registry, /DvaWebGPUTaserHeadshotE[\s\S]*webgpu-taser-headshot-e\.js/);
  assert.match(registry, /'gunnerShotE', 'taserHeadshotE'/);
  assert.match(registry, /passes\.magicEffects = passes\.shapes/);
  assert.ok(index.indexOf('src="webgpu-gunner-shot-e.js') <
    index.indexOf('src="webgpu-main-pass-registry.js'));
  assert.ok(index.indexOf('src="webgpu-taser-headshot-e.js') <
    index.indexOf('src="webgpu-main-pass-registry.js'));
  assert.ok(index.indexOf('src="webgpu-main-pass-registry.js') < index.indexOf('src="app.js'));
  assert.match(scene, /event\?\.type === 'gunnerShotE'/);
  assert.match(scene, /event\?\.type === 'taserHeadshotE'/);
  assert.match(scene, /Unsupported magic event/);
  assert.match(scene, /event\.type === 'gunnerShotE'[\s\S]*event\.type === 'taserHeadshotE'/);
  assert.match(app, /gunner-contact-fully-offscreen/);
  assert.match(app, /headshot-contact-visual-expired/);
  assert.match(app, /gunner-shot-visible-plan-invalid/);
  assert.match(app, /DvaWebGPUGunnerShotE\?\.cardinalMuzzle/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'webgpu-gunner-shot-e.js'), 'utf8'),
    /playSound|AudioContext|DvaWebGPUECuePlayer/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'webgpu-taser-headshot-e.js'), 'utf8'),
    /playSound|AudioContext|DvaWebGPUECuePlayer/);
});

test('late adapter retains typed event source order and accepts a dead visible headshot target', () => {
  const gunner = { id: 'gunner', alive: true, visible: true };
  const target = { id: 'victim', alive: false, visible: true };
  const first = shotEffect({ id: 'shot-a' });
  const headshot = { id: 'head-b', type: 'action-gunner-headshot', playerId: 'gunner',
    targetId: 'victim', x: 240, y: 150, radius: 150, startedAt: 100, duration: 1200,
    variant: 'aim:assault' };
  const last = { id: 'taser-c', type: 'action-taser', playerId: 'gunner',
    targetId: 'victim', x: 240, y: 150, radius: 95, startedAt: 100, duration: 1200,
    variant: '' };
  const owners = new Map([['gunner', action(first)]]);
  const result = runLateRouter([first, headshot, last], { actors: [gunner, target], owners });
  assert.deepEqual(Array.from(result.stage.events, event => event.effectId), ['shot-a', 'head-b', 'taser-c']);
  assert.deepEqual(Array.from(result.stage.events, event => event.type),
    ['gunnerShotE', 'taserHeadshotE', 'taserHeadshotE']);
  assert.equal(result.stage.events[1].input.planned.killOutcomeUnknown, true);
  assert.equal(result.stage.events[2].input.planned.kind, 'taser');
  assert.equal(result.stage.events.length + result.stage.omitted.length, 3);
});

test('late adapter hides concealed participants, expires contact receipts, and explicitly omits offscreen bounds', () => {
  const hiddenGunner = { id: 'hidden', alive: true, invisible: true, visible: true };
  const victim = { id: 'victim', alive: false, visible: true };
  const shotHidden = shotEffect({ id: 'shot-hidden', playerId: 'hidden', startedAt: 590 });
  const headHidden = { id: 'head-hidden', type: 'action-gunner-headshot', playerId: 'gunner',
    targetId: 'hidden', x: 200, y: 140, radius: 150, startedAt: 590, duration: 1200,
    variant: 'hip:handgun' };
  const expiredTaser = { id: 'taser-expired', type: 'action-taser', playerId: 'gunner',
    targetId: 'victim', x: 200, y: 140, radius: 95, startedAt: 100, duration: 1200, variant: '' };
  const offscreen = { id: 'head-offscreen', type: 'action-gunner-headshot', playerId: 'gunner',
    targetId: 'victim', x: 2200, y: 2200, radius: 150, startedAt: 590, duration: 1200,
    variant: 'hip:handgun' };
  const gunner = { id: 'gunner', alive: true, visible: true };
  const owners = new Map([['hidden', action(shotHidden)], ['gunner', action(shotHidden)] ]);
  const result = runLateRouter([shotHidden, headHidden, expiredTaser, offscreen], {
    actors: [hiddenGunner, gunner, victim], owners, now: 600
  });
  const reasons = new Map(result.stage.omitted.map(item => [item.effectId, item.reason]));
  assert.equal(reasons.get('shot-hidden'), 'gunner-shot-owner-not-visible');
  assert.equal(reasons.get('head-hidden'), 'gunner-contact-participant-not-visible');
  assert.equal(reasons.get('taser-expired'), 'taser-contact-visual-expired');
  assert.equal(reasons.get('head-offscreen'), 'gunner-contact-fully-offscreen');
  assert.equal(result.stage.events.length, 0);
});

test('unexpected visible null plan remains unsupported and is not a deferred or omitted claim', () => {
  const effect = shotEffect({ id: 'bad-visible' });
  const actor = { id: 'gunner', alive: true, visible: true };
  const owners = new Map([['gunner', action(effect)]]);
  const broken = { ...shot, plan: () => null };
  const result = runLateRouter([effect], { actors: [actor], owners, api: broken });
  assert.equal(result.stage.events.length, 0);
  assert.equal(result.stage.omitted.length, 0);
  assert.equal(result.unsupported[0].reason, 'gunner-shot-visible-plan-invalid');
  assert.equal(result.stage.deferredVisible.length, 0);
});

