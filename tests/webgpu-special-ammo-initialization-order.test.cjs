const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const names = [
  'AUTHORED_PHILIA_HANDGUN_RELOAD', 'AUTHORED_PHILIA_SMG_RELOAD',
  'AUTHORED_PHILIA_ASSAULT_RELOAD', 'AUTHORED_PHILIA_SNIPER_RELOAD',
  'AUTHORED_PHILIA_TASER_RELOAD', 'AUTHORED_SOPHIA_HANDGUN_RELOAD',
  'AUTHORED_SOPHIA_SMG_RELOAD', 'AUTHORED_SOPHIA_ASSAULT_RELOAD',
  'AUTHORED_SOPHIA_SNIPER_RELOAD', 'AUTHORED_SOPHIA_TASER_RELOAD',
  'AUTHORED_BOT_HANDGUN_RELOAD', 'AUTHORED_BOT_SMG_RELOAD',
  'AUTHORED_BOT_ASSAULT_RELOAD', 'AUTHORED_BOT_SNIPER_RELOAD',
  'AUTHORED_BOT_TASER_RELOAD'
];

function sourceAt(regex, label) {
  const match = regex.exec(app);
  assert.ok(match, `missing ${label}`);
  return { index: match.index, source: match[0] };
}

function authoredDeclaration(name) {
  return sourceAt(new RegExp(`^const ${name}=Object\\.freeze\\(.*;\\s*$`, 'm'), name);
}

function initializationRegistration() {
  const factory = /^function specialAmmoReloadAuthoredSources\(\) \{[\s\S]*?^\}/m.exec(app);
  if (factory) return { index: factory.index, source: factory[0], kind: 'lazy-factory' };
  const eager = /^const SPECIAL_AMMO_RELOAD_AUTHORED_SOURCES = Object\.freeze\([\s\S]*?^\}\);/m.exec(app);
  assert.ok(eager, 'missing reload authored-source registry/factory');
  return { index: eager.index, source: eager[0], kind: 'eager-registry' };
}

const declarations = names.map(authoredDeclaration);
const registration = initializationRegistration();
const orderedInitialization = [...declarations, registration]
  .sort((a, b) => a.index - b.index)
  .map(item => item.source)
  .join('\n');

function evaluateSourceOrder() {
  const context = vm.createContext({ Object, Map, Array });
  // This is the relevant top-level initialization script, extracted without moving
  // declarations: eager registries must not read profiles that occur later in app.js.
  vm.runInContext(orderedInitialization, context, { filename: 'app-special-ammo-init-order.js' });
  assert.equal(registration.kind, 'lazy-factory',
    'authored sources should be assembled by the deferred factory, not an eager const');
  context.__resolved = vm.runInContext('specialAmmoReloadAuthoredSources()', context);
  return context.__resolved;
}

test('special-ammo registry initialization follows app.js declaration order without TDZ throws', () => {
  const result = evaluateSourceOrder();
  assert.ok(result && typeof result === 'object');
  assert.deepEqual(Object.keys(result), ['white-hood', 'blue-dress', 'male-bot']);
  const weapons = ['handgun', 'smg', 'assault', 'sniper', 'taser'];
  const skins = [
    ['white-hood', 'AUTHORED_PHILIA'],
    ['blue-dress', 'AUTHORED_SOPHIA'],
    ['male-bot', 'AUTHORED_BOT']
  ];
  let resolvedCount = 0;
  for (const [skin, prefix] of skins) {
    assert.deepEqual(Object.keys(result[skin]), weapons, `${skin} weapon order`);
    for (const weapon of weapons) {
      const [profiles, textureKey] = result[skin][weapon];
      const constant = `${prefix}_${weapon.toUpperCase()}_RELOAD`;
      assert.ok(names.includes(constant), `${skin}/${weapon} source constant`);
      assert.ok(profiles && typeof profiles === 'object', `${skin}/${weapon} profile object`);
      assert.match(textureKey, /^authored[A-Za-z]+Reload$/, `${skin}/${weapon} texture key`);
      for (const direction of ['front', 'back', 'left', 'right']) {
        const entry = profiles[direction];
        assert.ok(entry?.assetPath, `${skin}/${weapon}/${direction} asset path`);
        assert.ok(Array.isArray(entry.size) && entry.size.length === 2,
          `${skin}/${weapon}/${direction} size`);
        resolvedCount++;
      }
    }
  }
  assert.equal(resolvedCount, 60);
});

// Keep the extracted-script failure leg explicit: a direct registry initializer
// inserted before AUTHORED_PHILIA_SNIPER_RELOAD must throw ReferenceError.
test('source-order harness detects the former eager TDZ failure mode', () => {
  const sniper = authoredDeclaration('AUTHORED_PHILIA_SNIPER_RELOAD');
  const beforeSniper = declarations.filter(item => item.index < sniper.index);
  const eager = `const SPECIAL_AMMO_RELOAD_AUTHORED_SOURCES = Object.freeze({\n` +
    `  'white-hood': { sniper: [AUTHORED_PHILIA_SNIPER_RELOAD, 'authoredPhiliaSniperReload'] }\n});`;
  const code = [...beforeSniper.map(item => item.source), eager].join('\n');
  assert.throws(() => vm.runInNewContext(code, { Object }), error =>
    error?.name === 'ReferenceError');
});
