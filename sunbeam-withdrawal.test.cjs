const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const pendingStart = app.indexOf('function isCanonicalWithdrawnSunbeamReceipt(');
const pendingEnd = app.indexOf('\nfunction captureWebGPUMainAppLateMagicScene(', pendingStart);
assert.ok(pendingStart >= 0 && pendingEnd > pendingStart);
const pendingSource = app.slice(pendingStart, pendingEnd);
const emptySet = new Set();
function pending(effect, now = 1100, action = null) {
  const owner = { id: 'p1', alive: true, ejected: false, inVent: false, invisible: false };
  const sandbox = { state: { characterActions: new Map(action ? [['p1', action]] : []) },
    PENDING_PRO_OBJECT_E_PORTS: emptySet, PENDING_PRO_ACTION_E_TYPES: emptySet };
  vm.runInNewContext(`${pendingSource}\nglobalThis.check = isCanonicalWithdrawnSunbeamReceipt;`, sandbox);
  return sandbox.check(effect,
    { players: [owner], selfId: 'p1', phase: 'playing' }, now);
}
const source = { id: 'magic_sunbeam-1', type: 'flora-sunbeam', playerId: 'p1',
  variant: 'refraction:piercing', sunbeamCausalId: 'sunbeam:cast_1', x: 10, y: 20,
  targetX: 300, targetY: 200, startedAt: 1000, duration: 1200, radius: 104 };
const action = { kind: 'cast', motionId: 'flora-sunbeam', sourceEffectId: source.id };
assert.equal(pending(source, 1100, action), true, 'canonical single-owner Sunbeam can be held');
assert.equal(pending({ ...source, sunbeamCausalId: '' }, 1100, action), false,
  'missing causal receipt is rejected');
assert.equal(pending({ ...source, variant: 'forged:piercing' }, 1100, action), false,
  'noncanonical optical variant is rejected');
assert.equal(pending({ ...source, radius: 999 }, 1100, action), false,
  'noncanonical radius is rejected');
assert.equal(pending({ ...source, playerId: 'forged-player' }, 1100, action), false,
  'unknown owner is rejected');
assert.equal(pending(source, 1100, { ...action, sourceEffectId: 'other-effect' }), false,
  'receipt bound to another cast is rejected');
assert.equal(pending(source, 2200, action), false, 'expired source is not held');

let overlayStopped = false, adapterAudioStopped = false, playerDestroyed = false;
const characterActions = new Map([['p1', action]]);
const sequenceSandbox = { state: { characterActions, magicEffects: [source] },
  PENDING_PRO_OBJECT_E_PORTS: emptySet, PENDING_PRO_ACTION_E_TYPES: emptySet,
  sunbeamLive: { pendingSounds: new Map([['cause', {}]]),
    soundPlayers: new Map([['cause', { player: { destroy() { playerDestroyed = true; } } }]]),
    playedCauses: new Set(['cause']) },
  suspendLiveSunbeamOverlay(options) { overlayStopped = options.destroy === true; },
  webgpuMainApp: { driver: { stopSunbeamSounds() { adapterAudioStopped = true; } } } };
vm.runInNewContext(`${pendingSource}\n` +
  `globalThis.check = isCanonicalWithdrawnSunbeamReceipt; globalThis.withdraw = stopWithdrawnSunbeamPresentation;`,
  sequenceSandbox);
const liveData = { players: [{ id: 'p1', alive: true, ejected: false,
  inVent: false, invisible: false }], selfId: 'p1', phase: 'playing' };
assert.equal(sequenceSandbox.check(source, liveData, 1100), true);
const playerSceneAt = app.indexOf('function captureWebGPUMainAppPlayerScene(');
const playerSceneEnd = app.indexOf('\nfunction ', playerSceneAt + 10);
const playerScene = app.slice(playerSceneAt, playerSceneEnd);
const earlyStart = playerScene.indexOf('  const sunbeamNow =');
const earlyEnd = playerScene.indexOf('  if (!data ||', earlyStart);
assert.ok(earlyStart >= 0 && earlyEnd > earlyStart);
vm.runInNewContext(`(() => { ${playerScene.slice(earlyStart, earlyEnd)} })()`,
  { ...sequenceSandbox, data: liveData, performance: { now: () => 1100 },
    eEffectNow: () => 1100 });
assert.equal(sequenceSandbox.check(source, liveData, 1100), true,
  'early player capture preserves the authoritative cast for late ownership');
assert.equal(characterActions.get('p1'), action, 'withdrawal preserves the current ability action');
assert.equal(overlayStopped && adapterAudioStopped && playerDestroyed, true,
  'early player capture shuts down old visual and sound owners');
const lateSceneAt = app.indexOf('function captureWebGPUMainAppLateMagicScene(');
const sunbeamBranchAt = app.indexOf("    if (type === 'flora-sunbeam') {", lateSceneAt);
const sunbeamBranchEnd = app.indexOf("    if (['alchemy-excalibur'", sunbeamBranchAt);
assert.ok(sunbeamBranchAt >= 0 && sunbeamBranchEnd > sunbeamBranchAt);
const sunbeamBranch = app.slice(sunbeamBranchAt, sunbeamBranchEnd);
function lateOutcome(candidate) {
  const deferredVisible = [], unsupported = [], omitted = [], events = [];
  const sandbox = { ...sequenceSandbox, input: candidate, data: liveData, now: 1100,
    deferredVisible, unsupported, omitted, events,
    renderedPlayer: player => player, sunbeamActorVisualElapsed: () => 100 };
  vm.runInNewContext(`for (const [index, effect] of [input].entries()) {\n` +
    `const type = effect.type; ${sunbeamBranch}\n}`, sandbox);
  return { deferredVisible, unsupported, omitted, events };
}
assert.deepEqual(lateOutcome(source).deferredVisible.map(item => item.reason),
  ['sunbeam-adoption-withdrawn'], 'late magic admits the early-captured canonical source as base');
const forgedOutcome = lateOutcome({ ...source, radius: 999 });
assert.equal(forgedOutcome.unsupported[0]?.reason,
  'withdrawn-sunbeam-source-is-not-canonical', 'late magic rejects malformed active sources');
assert.equal(forgedOutcome.events.length, 0, 'invalid active source does not invoke an E adapter');

// Exercise the real main-scene prepare/record path: one owned deferred source,
// an empty Sunbeam pass submission, and a positive frame token.
const mainSceneApi = require('./webgpu-main-scene.js');
const methodFor = {
  map: 'enqueue', environmentE: 'record', stations: 'record', mapObjects: 'draw',
  mysteryBoxes: 'record', alchemyObjects: 'record', gravityHazards: 'record',
  groundItems: 'record', facilityEffects: 'record', bodies: 'record',
  worldSound: 'record', throwPreview: 'record', preparationSummons: 'record',
  players: 'record', gunnerAim: 'record', killCamera: 'record', hitEffects: 'record',
  magicEffects: 'enqueue', attackTargets: 'record', taskIndicators: 'draw',
  hud: 'draw', minimap: 'draw', modeBanner: 'draw', expandedMap: 'record',
  lighting: 'record', killAnimation: 'record', sensory: 'enqueue',
  markerExplanation: 'draw', acquisition: 'record'
};
const recordedSunbeamFrames = [];
const passes = {};
for (const [name, method] of Object.entries(methodFor)) {
  passes[name] = { [method](input = {}) {
    if (name === 'sunbeamE') {
      recordedSunbeamFrames.push(input.events);
      return { token: 1, eventIds: input.events.map(event => String(event.effect.id)) };
    }
    return undefined;
  } };
}
passes.shapes = { enqueue() {} };
passes.headMarkers = { record({ planned }) { return planned.hitTargets; } };
passes.playerNameplates = { record() { return { hits: [] }; } };
passes.hoverSprintE = { record({ scene, viewport, camera, zoom }) {
  return { drawn: 0, effects: [] };
} };
passes.sunbeamE = { record(input) {
  recordedSunbeamFrames.push(input.events);
  return { token: 1, eventIds: input.events.map(event => String(event.effect.id)) };
} };
const device = {};
const renderer = { device, beginFrame() {} };
const recorder = mainSceneApi.create({ renderer, passes });
const previousPlayerSprite = global.DvaWebGPUPlayerSprite;
global.DvaWebGPUPlayerSprite = { sunbeamHandsForCommand: () => [{ x: 20, y: 30 }] };
const stages = Object.fromEntries(mainSceneApi.ORDER.map(name => [name, {}]));
stages.preparationSummons = null;
stages.map = { camera: { x: 0, y: 0 }, zoom: 1 };
stages.environmentE = { planned: null };
stages.groundItems = { commands: [] };
stages.players = { commands: [{ playerId: 'p1', movementMode: 'flora-sunbeam',
  sourceEffectId: source.id, poseKey: 'cast' }], markerGeneration: 1,
  headMarkersForCommand({ command }) { return { playerId: command.playerId,
    unsupported: [], planned: { generation: 1, unsupported: [], commands: [], hitTargets: [] } }; },
  selfPlayerId: 'p1', preparation: false,
  hoverSprint: { scene: { events: [], players: [] }, planned: [] } };
stages.magicEffects = { sourceEffectIds: [source.id], events: [],
  omitted: [], deferredVisible: [{ effectId: source.id,
    reason: 'sunbeam-adoption-withdrawn' }],
  markerCoverage: { visibleRetained: [] }, empCoverage: { visibleEmp: [] },
  specialAmmoCoverage: { visibleSpecialAmmo: [] }, roomId: 'room', phase: 'playing' };
stages.minimap = { scene: { bounds: { x: 0, y: 0, width: 10, height: 10 } } };
for (const name of mainSceneApi.ORDER) {
  if (!(name in stages)) continue;
  if (!stages[name] || Array.isArray(stages[name])) continue;
  if (['map', 'environmentE', 'groundItems', 'players', 'magicEffects', 'minimap'].includes(name)) continue;
  stages[name] = {};
}
const prepared = recorder.prepare({ stages, device });
const frame = { stage() {}, add() {}, sprite() {}, rect() {} };
const recordedFrame = recorder.record({ frame, target: 'main',
  viewport: { width: 10, height: 10, pixelWidth: 10, pixelHeight: 10 },
  renderer, prepared });
if (previousPlayerSprite === undefined) delete global.DvaWebGPUPlayerSprite;
else global.DvaWebGPUPlayerSprite = previousPlayerSprite;
assert.deepEqual(recordedSunbeamFrames, [[]], 'main scene commits an empty Sunbeam frame');
assert.equal(recordedFrame.sunbeamFrameToken, 1, 'empty Sunbeam frame returns its commit token');
assert.equal(recordedFrame.sunbeamHandReceipts.length, 1,
  'the cast ability player-motion hand receipt remains active independently of the withdrawn E');

const scene = fs.readFileSync('webgpu-main-scene.js', 'utf8');
assert.match(scene, /deferredVisible[\s\S]*?owned\.has\(id\)[\s\S]*?sunbeam-adoption-withdrawn/,
  'deferred Sunbeam uses the strict one-owner receipt gate');
assert.match(scene, /record\(\{ frame, target,[\s\S]*?events: sunbeamEvents/,
  'Sunbeam frame commits even with an empty event list');
assert.match(scene, /sunbeamFrame\.eventIds\.length !== sunbeamEvents\.length/,
  'empty and populated frame receipts retain complete-plan validation');
assert.match(app, /function stopWithdrawnSunbeamPresentation\(\)[\s\S]*?pendingSounds\?\.clear\(\)[\s\S]*?soundPlayers[\s\S]*?stopSunbeamSounds/,
  'withdrawal clears queued/playing SFX and stops adapter audio');
assert.match(app, /stopWithdrawnSunbeamPresentation\(\);\s*deferredVisible\.push\(\{ effectId: effect\.id,\s*reason: 'sunbeam-adoption-withdrawn' \}\)/,
  'only the validated Sunbeam route creates its pending receipt');
assert.ok(playerScene.indexOf('stopWithdrawnSunbeamPresentation()') <
  playerScene.indexOf('buildWebGPUAuthoredPlayerSpriteCommand'),
  'withdrawal runs before player sprites are prepared');
const lateStart = app.indexOf("      if (isCanonicalWithdrawnSunbeamReceipt(effect, data, now)) {");
const lateEnd = app.indexOf("    if (['alchemy-excalibur'", lateStart);
assert.ok(lateStart >= 0 && lateEnd > lateStart);
assert.doesNotMatch(app.slice(lateStart, lateEnd), /DvaSunbeamAstraV3GameAdapter|events\.push/,
  'canonical holds and malformed active Sunbeams cannot reach the v3 adapter event');
assert.match(app, /new Set\(active\.filter\(effect => effect\.type !== "fire"\)[\s\S]*?distinct IDs/,
  'duplicate effect IDs remain rejected before receipt admission');
assert.match(app, /const deferredVisibleIds = Array\.isArray\(receipt\.deferredVisibleIds\)[\s\S]*?webgpuMainCompleteness = incomplete \? 'base' : 'complete'/,
  'submitted withdrawn-E receipts keep the visible main frame at base quality');
const ownedMatch = /const owned = new Set\(\);\s*let previousPosition = -1;/.exec(scene);
const ownedStart = ownedMatch?.index ?? -1;
const ownedEnd = scene.indexOf('for (const omission of magic.omitted)', ownedStart);
assert.ok(ownedStart >= 0 && ownedEnd > ownedStart);
const ownershipCode = scene.slice(ownedStart, ownedEnd);
function checkOwnership(receipts) {
  const owned = new Set();
  const positions = new Map([['magic_sunbeam-1', 0]]);
  const retained = new Set(), visibleEmp = new Map(), visibleSpecialAmmo = new Map();
  const magic = { deferredVisible: receipts };
  return vm.runInNewContext(`(() => { ${ownershipCode}; return owned.size; })()`,
    { owned, positions, retained, visibleEmp, visibleSpecialAmmo, magic,
      own: (value, key) => Object.prototype.hasOwnProperty.call(value, key) });
}
assert.equal(checkOwnership([{ effectId: 'magic_sunbeam-1', reason: 'sunbeam-adoption-withdrawn' }]), 1,
  'one exact withdrawn receipt owns its source');
assert.throws(() => checkOwnership([
  { effectId: 'magic_sunbeam-1', reason: 'sunbeam-adoption-withdrawn' },
  { effectId: 'magic_sunbeam-1', reason: 'sunbeam-adoption-withdrawn' }
]), /Invalid deferred visible magic ownership/, 'duplicate receipts are rejected');
assert.throws(() => checkOwnership([{ effectId: 'magic_sunbeam-1', reason: 'forged' }]),
  /Invalid deferred visible magic ownership/, 'forged reason is rejected');
console.log('PASS Sunbeam withdrawal owner proof, forgery, expiry, unique IDs, empty commits, and SFX stop');
