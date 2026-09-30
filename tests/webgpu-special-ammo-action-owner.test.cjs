const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const directions = ['front', 'back', 'left', 'right'];
const weapons = ['handgun', 'smg', 'assault', 'sniper', 'taser'];
const profileNames = [
  'AUTHORED_PHILIA_HANDGUN_RELOAD', 'AUTHORED_PHILIA_SMG_RELOAD',
  'AUTHORED_PHILIA_ASSAULT_RELOAD', 'AUTHORED_PHILIA_SNIPER_RELOAD',
  'AUTHORED_PHILIA_TASER_RELOAD', 'AUTHORED_SOPHIA_HANDGUN_RELOAD',
  'AUTHORED_SOPHIA_SMG_RELOAD', 'AUTHORED_SOPHIA_ASSAULT_RELOAD',
  'AUTHORED_SOPHIA_SNIPER_RELOAD', 'AUTHORED_SOPHIA_TASER_RELOAD',
  'AUTHORED_BOT_HANDGUN_RELOAD', 'AUTHORED_BOT_SMG_RELOAD',
  'AUTHORED_BOT_ASSAULT_RELOAD', 'AUTHORED_BOT_SNIPER_RELOAD',
  'AUTHORED_BOT_TASER_RELOAD'
];
function constantSource(name) {
  const match = app.match(new RegExp(`^const ${name}=Object\\.freeze\\((.*)\\);$`, 'm'));
  assert.ok(match, `missing profile declaration ${name}`);
  return match[0];
}
function topLevelFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const end = app.indexOf('\n}', start);
  assert.notEqual(end, -1, `unterminated function ${name}`);
  return app.slice(start, end + 2);
}
const definitions = profileNames.map(constantSource).join('\n');
const sandbox = {
  window: { DvaWebGPUPlayerSprite: { createCommand: options => ({ options }) } },
  state: { magicEffects: [], textures: {}, frameNow: 0 },
  eEffectNow: (effect, _data, now) => now,
  physicalMotionRateFor: () => { throw new Error('special-ammo action must use the already-scaled E clock'); },
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
  performance: { now: () => 0 },
  displayedSkinId: player => player.skin,
  authoredDirection: player => player.direction,
  motionFor: () => ({}),
  characterAscensionPresentation: () => ({ ascensionRise: 0 }),
  prefersReducedMotion: () => false,
  playerIdentityLabel: player => player.id,
  Object, Number, String, Math, Array, Map, Set, Boolean, RegExp
};
const runtime = vm.runInNewContext(`${definitions}
${topLevelFunction('specialAmmoReloadAuthoredSources')}
${topLevelFunction('specialAmmoLoadActionOwner')}
${topLevelFunction('buildWebGPUSpecialAmmoLoadActionCommand')}
({ SPECIAL_AMMO_RELOAD_AUTHORED_SOURCES: specialAmmoReloadAuthoredSources(), specialAmmoLoadActionOwner, buildWebGPUSpecialAmmoLoadActionCommand })`, sandbox);
function profileFor(skin, weapon) {
  const key = skin === 'white-hood' ? 'white-hood' : skin === 'blue-dress' ? 'blue-dress' : 'male-bot';
  return runtime.SPECIAL_AMMO_RELOAD_AUTHORED_SOURCES[key][weapon][0];
}
function fixture({ skin = 'white-hood', weapon = 'handgun', direction = 'front', now = 1300,
  startedAt = 1000, variant = `weak:${weapon}`, duration = 1450, rate = 1,
  clockRegistered = true, visualElapsed = (now - startedAt) * rate } = {}) {
  const player = { id: 'owner', alive: true, ejected: false, inVent: false,
    invisible: false, isBot: skin === 'male-bot', skin, direction, x: 20, y: 30, actorRate: rate };
  const effect = { id: 'load-event-1', type: 'action-special-ammo-load', playerId: player.id,
    variant, startedAt, duration,
    ...(clockRegistered ? { eClockStartedAt: 50, eClockRoomId: 'room' } : {}) };
  const data = { selfId: 'viewer', roomId: 'room', players: [player] };
  sandbox.state.magicEffects = [effect];
  sandbox.state.frameNow = now;
  const visualClock = { elapsed: visualElapsed,
    advance(wallMs, actorRate) { this.elapsed += wallMs * actorRate; } };
  sandbox.eEffectNow = (source, sourceData, wallNow) =>
    Number.isFinite(source?.eClockStartedAt) && source.eClockRoomId === sourceData?.roomId
      ? source.startedAt + visualClock.elapsed : wallNow;
  const profile = profileFor(skin, weapon)[direction];
  const image = { complete: true, naturalWidth: profile.size[0], naturalHeight: profile.size[1] };
  const textureKey = runtime.SPECIAL_AMMO_RELOAD_AUTHORED_SOURCES[
    skin === 'male-bot' ? 'male-bot' : skin][weapon][1];
  sandbox.state.textures = { [textureKey]: { [direction]: image } };
  const action = runtime.specialAmmoLoadActionOwner(player, data, now);
  return { player, effect, data, profile, image, action, textureKey, visualClock,
    view: { camera: { x: 0, y: 0 }, zoom: 1, order: 4 } };
}

test('all human and bot Gunner reload registrations resolve to existing direction assets', () => {
  const profileNamesObject = `{ ${profileNames.map(name => `${name}: ${name}`).join(', ')} }`;
  const profileSandbox = { Object };
  vm.runInNewContext(`${definitions}\nglobalThis.profiles = ${profileNamesObject};`, profileSandbox);
  const profiles = profileSandbox.profiles;
  const identities = [
    ['white-hood', ['AUTHORED_PHILIA_HANDGUN_RELOAD', 'AUTHORED_PHILIA_SMG_RELOAD',
      'AUTHORED_PHILIA_ASSAULT_RELOAD', 'AUTHORED_PHILIA_SNIPER_RELOAD', 'AUTHORED_PHILIA_TASER_RELOAD']],
    ['blue-dress', ['AUTHORED_SOPHIA_HANDGUN_RELOAD', 'AUTHORED_SOPHIA_SMG_RELOAD',
      'AUTHORED_SOPHIA_ASSAULT_RELOAD', 'AUTHORED_SOPHIA_SNIPER_RELOAD', 'AUTHORED_SOPHIA_TASER_RELOAD']],
    ['male-bot', ['AUTHORED_BOT_HANDGUN_RELOAD', 'AUTHORED_BOT_SMG_RELOAD',
      'AUTHORED_BOT_ASSAULT_RELOAD', 'AUTHORED_BOT_SNIPER_RELOAD', 'AUTHORED_BOT_TASER_RELOAD']]
  ];
  let count = 0;
  for (const [identity, names] of identities) for (let i = 0; i < weapons.length; i++) {
    const weapon = weapons[i], profile = profiles[names[i]];
    assert.ok(profile, `${identity}/${weapon} profile`);
    for (const direction of directions) {
      const entry = profile[direction];
      assert.ok(entry?.assetPath && entry.size?.length === 2, `${identity}/${weapon}/${direction} registration`);
      assert.ok(entry.origin || entry.registration?.origin, `${identity}/${weapon}/${direction} origin`);
      assert.ok(Number.isFinite(entry.runtimeScale ?? entry.registration?.runtimeScale), `${identity}/${weapon}/${direction} scale`);
      assert.ok(fs.existsSync(path.join(root, entry.assetPath)), `${identity}/${weapon}/${direction} asset ${entry.assetPath}`);
      count++;
    }
  }
  assert.equal(count, 60);
});

test('special-ammo owner uses the already-scaled E clock exactly once over 1450ms', () => {
  const normal = fixture({ now: 1225 });
  assert.deepEqual({ kind: normal.action.kind, motionId: normal.action.motionId,
    variant: normal.action.variant, sourceEffectId: normal.action.sourceEffectId,
    duration: normal.action.duration }, { kind: 'reload', motionId: 'action-special-ammo-load',
    variant: 'weak:handgun', sourceEffectId: 'load-event-1', duration: 1450 });
  assert.equal(normal.action.progress, 225 / 1450);
  const accelerated = fixture({ now: 1225, rate: 2 });
  assert.equal(accelerated.action.progress, 450 / 1450);
  accelerated.visualClock.elapsed = 1450;
  assert.equal(runtime.specialAmmoLoadActionOwner(accelerated.player, accelerated.data, 2450), null);
  const mixedRate = fixture({ now: 1300, startedAt: 1000, visualElapsed: 0 });
  mixedRate.visualClock.advance(100, 1); // ACC1
  mixedRate.visualClock.advance(100, 2); // ACC2
  mixedRate.visualClock.advance(100, 0.5); // slowdown
  mixedRate.action = runtime.specialAmmoLoadActionOwner(
    mixedRate.player, mixedRate.data, 1300);
  assert.equal(mixedRate.action.progress, 350 / 1450,
    'ACC1/ACC2/slowdown segments arrive as one already-integrated actor clock');
  const unregisteredClock = fixture({ now: 1225, rate: 2, clockRegistered: false });
  assert.equal(unregisteredClock.action.progress, 225 / 1450,
    'eEffectNow wall-clock fallback remains unscaled');
  const exactExpiry = fixture({ now: 2450, visualElapsed: 1450 });
  assert.equal(exactExpiry.action, null);
  const badDuration = fixture({ now: 1225, duration: 2200 });
  assert.equal(badDuration.action.duration, 2200);
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(badDuration.player,
    badDuration.data, badDuration.view, badDuration.action), null);
});

test('special-ammo WebGPU drawplan uses the selected authored weapon, skin, direction, frame and registration', () => {
  const cases = [
    ['white-hood', 'handgun', 'front', .1, 0],
    ['white-hood', 'smg', 'left', .3, 1],
    ['white-hood', 'assault', 'back', .5, 2],
    ['white-hood', 'sniper', 'right', .75, 3],
    ['white-hood', 'taser', 'front', .95, 4],
    ['blue-dress', 'handgun', 'back', .3, 1],
    ['blue-dress', 'smg', 'right', .5, 2],
    ['blue-dress', 'assault', 'left', .75, 3],
    ['blue-dress', 'sniper', 'front', .95, 4],
    ['blue-dress', 'taser', 'back', .1, 0],
    ['male-bot', 'handgun', 'front', .1, 0],
    ['male-bot', 'smg', 'left', .3, 1],
    ['male-bot', 'assault', 'back', .5, 2],
    ['male-bot', 'sniper', 'right', .75, 3],
    ['male-bot', 'taser', 'front', .95, 4]
  ];
  for (const [skin, weapon, direction, progressAt, frameIndex] of cases) {
    const profile = profileFor(skin, weapon)[direction];
    const now = 1000 + 1450 * progressAt;
    const testCase = fixture({ skin, weapon, direction, now });
    const command = runtime.buildWebGPUSpecialAmmoLoadActionCommand(
      testCase.player, testCase.data, testCase.view, testCase.action);
    assert.ok(command, `${skin}/${weapon}/${direction} command`);
    const options = command.options;
    const cell = Array.isArray(profile.cell) ? profile.cell : [profile.cell, profile.cell];
    assert.equal(options.identity, skin);
    assert.equal(options.direction, direction);
    assert.equal(options.entry.assetPath, profile.assetPath);
    assert.deepEqual({ x: options.frame.x, y: options.frame.y, width: options.frame.width, height: options.frame.height },
      { x: frameIndex * cell[0], y: 0, width: cell[0], height: cell[1] });
    assert.equal(options.image, testCase.image);
    assert.equal(options.entry.layout.scale, profile.runtimeScale ?? profile.registration.runtimeScale);
    assert.equal(options.sourceEffectId, undefined);
    assert.equal(command.sourceEffectId, testCase.effect.id);
  }
});

test('visible invalid, expired, invisible, hidden-owner and asset-pending actions never produce a drawplan', () => {
  const badVariant = fixture({ variant: 'fire:handgun' });
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(badVariant.player,
    badVariant.data, badVariant.view, badVariant.action), null);
  const expired = fixture({ now: 2450 });
  assert.equal(expired.action, null);
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(expired.player,
    expired.data, expired.view, expired.action), null);
  const hidden = fixture();
  hidden.player.invisible = true;
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(hidden.player,
    hidden.data, hidden.view, hidden.action), null);
  const missingTexture = fixture();
  sandbox.state.textures[missingTexture.textureKey][missingTexture.player.direction].complete = false;
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(missingTexture.player,
    missingTexture.data, missingTexture.view, missingTexture.action), null);
  const wrongOwner = fixture();
  const wrongSource = { ...wrongOwner.action, sourceEffectId: 'other-event' };
  assert.equal(runtime.buildWebGPUSpecialAmmoLoadActionCommand(wrongOwner.player,
    wrongOwner.data, wrongOwner.view, wrongSource), null);
});

test('sprite readiness and shared player command both route the action owner; ordinary reload checks stay separate', () => {
  assert.match(app, /const action = specialAmmoLoadActionOwner\(player, data\) \|\| currentCharacterAction\(player\);/);
  assert.match(app, /if \(action\?\.motionId === 'action-special-ammo-load'\)[\s\S]*?buildWebGPUSpecialAmmoLoadActionCommand/);
  assert.match(app, /if \(action\?\.motionId === 'action-special-ammo-load'\)\s+return buildWebGPUSpecialAmmoLoadActionCommand/);
  const ordinary = topLevelFunction('buildWebGPUHandgunReloadActionCommand');
  assert.match(ordinary, /Number\(metadata\.durationMs\) !== 2200/);
  assert.match(ordinary, /owner\?\.token !== token/);
  assert.doesNotMatch(topLevelFunction('buildWebGPUSpecialAmmoLoadActionCommand'), /weaponActionMotions/);
});



