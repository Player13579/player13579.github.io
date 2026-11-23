'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = name => readFileSync(resolve(__dirname, '..', name), 'utf8');
const app = source('app.js');
const bannerSource = source('webgpu-mode-banner.js');
const registrySource = source('webgpu-main-pass-registry.js');
const viewport = {
  kind: 'main', width: 980, height: 620, pixelWidth: 980, pixelHeight: 620,
  logicalToPixel: [1, 0, 0, 1, 0, 0]
};

function appFunction(name) {
  const declaration = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(app);
  assert.ok(declaration, name);
  const end = app.indexOf('\n}', declaration.index);
  assert.notEqual(end, -1, name);
  return app.slice(declaration.index, end + 2);
}

async function fixture() {
  const text = [];
  const readyTexture = {};
  const textAtlas = {
    textures: [],
    async ensure(value) {
      text.push(value);
      this.textures[0] = readyTexture;
    },
    layout(value) {
      assert.ok(text.includes(value), 'draw must use text prepared in the same atlas');
      return { width: 10, height: 12, quads: [{ page: 0, x: 0, y: 0, w: 10, h: 12, uv: [0, 0, 1, 1] }] };
    }
  };
  const data = {
    phase: 'playing', selfId: 'gunner',
    self: { alive: true, mana: 2, aimX: 0, aimY: 1 },
    players: [{ id: 'gunner', x: 500, y: 500, name: 'Gunner' }, { id: 'enemy', name: 'Enemy' }],
    map: { width: 2000, height: 2000 }
  };
  const state = {
    data, throwTargeting: { active: false }, clairvoyance: { active: false },
    roomSessionGeneration: 1, tabletOpen: false
  };
  const context = vm.createContext({
    state, structuredClone, performance,
    renderedPlayer: player => player,
    getDirection: () => ({ dx: 0, dy: 0 }),
    isClientWalkable: () => true, clientEnhanceLevel: () => 1,
    cancelThrowTargeting: () => {}, clearMovementInput: () => {},
    requestAnimationFrame: () => 1, updateEnhanceReadout: () => {},
    showToast: () => {},
    ensureClairvoyanceFollowTarget: frame => frame.players[1],
    estimatedServerNow: () => 100,
    prepareWebGPUMainAppEarlyScene: async () => ({})
  });
  vm.runInContext('this.window = this;', context);
  vm.runInContext(bannerSource, context, { filename: 'webgpu-mode-banner.js' });
  vm.runInContext(registrySource, context, { filename: 'webgpu-main-pass-registry.js' });
  for (const name of ['MAIN_CANVAS_LOGICAL_SIZE', 'CAMERA_ZOOM',
    'ITEM_THROW_BASE_DISTANCE_CLIENT', 'ENHANCE_MAX_LEVEL_CLIENT']) {
    const declaration = new RegExp('^const ' + name + ' = .*;$', 'm').exec(app);
    assert.ok(declaration, name);
    vm.runInContext(declaration[0], context);
  }
  vm.runInContext(['clamp', 'currentThrowDirection', 'predictedThrowLanding',
    'beginThrowTargeting', 'updateThrowTargetingFrame', 'throwTargetClairvoyanceActive',
    'modeBannerWebGPUScene',
    'prepareWebGPUMainAppWorldCandidate'].map(appFunction).join('\n'), context,
  { filename: 'app.js' });
  const { DvaWebGPUModeBanner: banner, DvaWebGPUMainPassRegistry: registryApi } = context;
  const device = {};
  const stubPass = {
    device, enqueue() {}, draw() {}, record() {}, destroy() {}, async prepareLabels() {}
  };
  const stubModule = {
    ...stubPass, create: () => stubPass, createTextureCache: () => stubPass
  };
  const modules = new Proxy({
    scene: { ORDER: ['modeBanner'], REQUIRED: ['modeBanner'] },
    modeBanner: banner,
    killBloom: { create: () => ({ prepare() {}, release() {} }) },
    killAnimation: { create: () => ({
      ...stubPass, prepare: async () => ({ unsupported: [], liveCount: 0 })
    }) },
    hud: { create: () => ({ ...stubPass, prepare: async () => ({ drawn: true }) }) },
    markerExplanation: { create: () => ({ ...stubPass, prepare: async () => ({ drawn: false }) }) },
    acquisition: { create: () => ({ ...stubPass, state: 'ready' }) }
  }, { get: (target, name) => target[name] ?? stubModule });
  context.DvaWebGPUHeadMarkers = { plan() {}, PROFILES: {} };
  context.DvaWebGPUTaskIndicators = { plan: () => [] };
  context.DvaWebGPUMinimap = { plan: () => ({ shapes: [{}] }) };
  context.DvaWebGPUSensoryBlackout = { message: () => null };
  const registry = await registryApi.create({
    renderer: { state: 'ready', device, format: 'rgba8unorm', createGravityHazardPasses: () => stubPass },
    map: data.map, textAtlas, atlasMetrics: { ascent: 11, pixelSize: 13 }, modules
  });

  function prepare(scene = context.modeBannerWebGPUScene(data)) {
    const candidate = {
      assertCurrent() {}, early: {}, players: { markerActors: [] }, viewport,
      headMarkers: { generation: 1, scenes: new Map() },
      stages: {
        players: { commands: [] }, taskIndicators: {}, hud: { data },
        minimap: {}, modeBanner: { scene }, lighting: {}, killCamera: {},
        killAnimation: { effects: [] }, sensory: {}, markerExplanation: {},
        magicEffects: { events: [], markerGeneration: 1, markerCoverage: { visibleRetained: [] },
          empCoverage: { visibleEmp: [] }, specialAmmoCoverage: { visibleSpecialAmmo: [] } }
      }
    };
    return context.prepareWebGPUMainAppWorldCandidate(candidate, registry.passes, textAtlas,
      { headMarkerDevice: device });
  }

  return { state, data, context, registry, banner, textAtlas, text, readyTexture, prepare };
}

function record(pass, scene, override = {}) {
  const commands = [];
  const frame = {
    stage: name => commands.push(['stage', name]),
    rect: (target, rect) => commands.push(['rect', target, rect]),
    sprite: (target, sprite) => commands.push(['sprite', target, sprite])
  };
  const result = pass.draw({ frame, target: 'main', viewport, scene, ...override });
  return { result, commands };
}

test('ordinary downward frag targeting prepares and records the WebGPU banner before throw confirmation', async t => {
  const { context, registry, prepare, text, readyTexture, state } = await fixture();
  t.after(() => registry.destroy());
  assert.equal(context.beginThrowTargeting('frag-grenade', 2000, 'charge'), true);
  assert.equal(state.throwTargeting.targetY, 720);
  const prepared = await prepare();
  const { result, commands } = record(registry.passes.modeBanner, prepared.stages.modeBanner.scene);
  assert.equal(result.drawn, true);
  assert.equal(result.message, '千里眼 / 着地点追従 / 全域投擲');
  assert.deepEqual(text, [result.message]);
  assert.deepEqual(commands[0], ['stage', 'mode-banner']);
  assert.equal(commands.filter(([type]) => type === 'rect').length, 34);
  assert.equal(commands.at(-1)[0], 'sprite');
  assert.equal(commands.at(-1)[2].texture, readyTexture);
});

test('normal frames and missing mana skip banner atlas work', async t => {
  const { registry, context, data, prepare, text } = await fixture();
  t.after(() => registry.destroy());
  const pass = registry.passes.modeBanner;
  assert.equal((await prepare()).stages.modeBanner.scene.aimTargetId, undefined);
  assert.equal(context.beginThrowTargeting('frag-grenade', 2000, 'charge'), true);
  data.self.mana = 0;
  assert.equal((await prepare()).stages.modeBanner.scene.throwTargetClairvoyanceActive, false);
  assert.equal(await pass.prepare(null), false);
  assert.equal(record(pass, null).result.drawn, false);
  assert.deepEqual(text, []);
});

test('manual clairvoyance and assassination targeting use the same pass and atlas', async t => {
  const { state, data, registry, prepare, text } = await fixture();
  t.after(() => registry.destroy());
  state.clairvoyance.active = true;
  const follow = (await prepare()).stages.modeBanner.scene;
  assert.match(record(registry.passes.modeBanner, follow).result.message, /Enemyを追尾/);
  state.clairvoyance.active = false;
  Object.assign(data.self, { aimTargetId: 'enemy', aimReadyAt: 600, special: 'assassin' });
  const aim = (await prepare()).stages.modeBanner.scene;
  assert.equal(record(registry.passes.modeBanner, aim).result.message, '忍殺静止中: Enemy / 残り 0.5秒');
  assert.equal(text.length, 2);
});

test('world preparation awaits atlas uploads and propagates upload failure', async t => {
  const { state, registry, prepare, textAtlas } = await fixture();
  t.after(() => registry.destroy());
  state.clairvoyance.active = true;
  let rejectUpload;
  const uploaded = new Promise((resolve, reject) => { rejectUpload = reject; });
  let enterUpload;
  const entered = new Promise(resolve => { enterUpload = resolve; });
  textAtlas.ensure = () => { enterUpload(); return uploaded; };
  const preparation = prepare();
  const entry = await Promise.race([entered.then(() => 'upload started'), preparation]);
  assert.equal(entry, 'upload started');
  const settledBeforeUpload = await Promise.race([
    preparation.then(() => true), new Promise(resolve => setImmediate(() => resolve(false)))
  ]);
  assert.equal(settledBeforeUpload, false);
  const rejection = assert.rejects(preparation, /GPU upload failed/);
  rejectUpload(new Error('GPU upload failed'));
  await rejection;
});

test('invalid viewport and unavailable texture still reject before recording', () => {
  const sandbox = vm.createContext({});
  vm.runInContext(bannerSource, sandbox);
  const atlas = {
    textures: [],
    layout: () => ({ width: 10, height: 12, quads: [{ page: 0 }] })
  };
  const pass = sandbox.DvaWebGPUModeBanner.create({ textAtlas: atlas });
  const scene = { throwTargetClairvoyanceActive: true };
  assert.throws(() => record(pass, scene, { viewport: { ...viewport, pixelWidth: 0 } }),
    /committed main viewport required/);
  assert.throws(() => record(pass, scene, { viewport: { ...viewport, logicalToPixel: [0, 0, 0, 1, 0, 0] } }),
    /Viewport pixel scale must be positive/);
  assert.throws(() => record(pass, scene), /text atlas page is not loaded/);
});

test('static preparation API keeps its explicit atlas contract', async () => {
  const sandbox = vm.createContext({});
  vm.runInContext(bannerSource, sandbox);
  const banner = sandbox.DvaWebGPUModeBanner;
  assert.equal(await banner.prepare(null), false);
  await assert.rejects(banner.prepare({ throwTargetClairvoyanceActive: true }),
    /Shared GPU text atlas required/);
});
