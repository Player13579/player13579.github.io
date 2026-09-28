const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const brace = app.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < app.length; i++) {
    if (app[i] === '{') depth++;
    else if (app[i] === '}' && --depth === 0) return app.slice(start, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

const functionSource = extractFunction('buildWebGPUAuthoredNinjutsuFocusActionCommand');
const spriteBuilder = extractFunction('buildWebGPUAuthoredPlayerSpriteCommand');
const readinessBuilder = extractFunction('captureWebGPUMainAppPlayerScene');
assert.match(spriteBuilder, /action\?\.kind === 'focus' && action\.motionId === 'action-ninjutsu-focus'[\s\S]*?return buildWebGPUAuthoredNinjutsuFocusActionCommand/,
  'player command path owns the authored Ninjutsu action');
assert.match(readinessBuilder, /action\?\.kind === 'focus' && action\.motionId === 'action-ninjutsu-focus'[\s\S]*?buildWebGPUAuthoredNinjutsuFocusActionCommand/,
  'first-frame readiness uses the same exact sprite owner');

const action = { kind: 'focus', motionId: 'action-ninjutsu-focus', sourceEffectId: 'ninjutsu-7',
  startedAt: 100, variant: 'ninjutsu', progress: .45 };
const pose = { assetPath: 'focus.png', sourceRect: { x: 256, y: 0, width: 256, height: 256 },
  origin: { x: 128, y: 240 }, ground: { x: 0, y: 31 }, scale: .4375 };
const profile = { accepted: true, actionKind: 'focus', motionId: action.motionId,
  directions: { right: { gather: pose } } };
const image = { complete: true, naturalWidth: 1024, naturalHeight: 256 };
const effect = { id: action.sourceEffectId, type: action.motionId, playerId: 'p1',
  startedAt: action.startedAt, variant: action.variant, duration: 1000 };
const owner = { ...action };
const commandArgs = [];
const context = {
  window: { DvaWebGPUPlayerSprite: { createCommand(args) { commandArgs.push(args); return { ...args, sprite: {} }; } } },
  state: { characterActions: new Map([['p1', owner]]), magicEffects: [effect], frameNow: 500,
    textures: { authoredNinjutsuFocusMotions: { 'white-hood': { right: { gather: image } } } } },
  AUTHORED_NINJUTSU_FOCUS_PROFILES: { 'white-hood': profile },
  AUTHORED_NINJUTSU_FOCUS_DIRECTIONS: ['front', 'left', 'right', 'back'],
  authoredNinjutsuFocusDirection: () => 'right',
  authoredNinjutsuFocusFrame: () => 'gather',
  authoredNinjutsuFocusPoseReady: (entry, source) => Boolean(entry && source?.complete && source.naturalWidth),
  authoredCharacterIdentity: () => 'white-hood',
  eEffectNow: (_entry, _data, now) => now,
  characterAscensionPresentation: () => ({ ascensionRise: 0 }),
  playerIdentityLabel: () => 'Player',
  Number, String, Object, Math, Map
};
vm.createContext(context);
vm.runInContext(`${functionSource}; this.build = buildWebGPUAuthoredNinjutsuFocusActionCommand;`, context);
const player = { id: 'p1', x: 10, y: 20, alive: true };
const data = { phase: 'playing', roomId: 'room', selfId: 'p1', self: {} };
const view = { camera: { x: 0, y: 0 }, zoom: 1, order: 2 };
const command = context.build(player, data, view, action);
assert.equal(command.sourceEffectId, 'ninjutsu-7');
assert.equal(command.poseKey, 'ninjutsu-focus-gather');
assert.deepEqual(commandArgs[0].frame, pose.sourceRect);
assert.equal(commandArgs[0].image, image);
for (const [label, changes] of [
  ['mismatched action source', { sourceEffectId: 'other' }],
  ['mismatched action time', { startedAt: 99 }],
  ['wrong motion', { motionId: 'action-mana' }],
  ['expired action', { progress: 1 }]
]) assert.equal(context.build(player, data, view, { ...action, ...changes }), null, label);
context.state.textures.authoredNinjutsuFocusMotions['white-hood'].right.gather.complete = false;
assert.equal(context.build(player, data, view, action), null, 'not-ready frame is rejected');

for (const line of app.split(/\r?\n/).filter(line => /^const AUTHORED_NINJUTSU_FOCUS_(ACTIONS|PROFILES) =/.test(line))) {
  const assetPattern = /"assetPath":"([^"]+)","assetSha256":"([A-Fa-f0-9]{64})"/g;
  let match, checked = 0;
  while ((match = assetPattern.exec(line))) {
    const bytes = fs.readFileSync(path.join(root, match[1]));
    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha.toLowerCase(), match[2].toLowerCase(), `${match[1]} manifest SHA`);
    const colorType = bytes[25];
    assert.ok(colorType === 4 || colorType === 6, `${match[1]} must have alpha for direct WebGPU upload`);
    checked++;
  }
  assert.ok(checked > 0, 'focus profile has verified source textures');
}

console.log('PASS: Ninjutsu-focus action owns the exact source/time and ready authored texture in both WebGPU paths; no fallback; source PNG hashes and alpha verified');
