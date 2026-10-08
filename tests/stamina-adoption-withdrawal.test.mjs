import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidate = fs.readFileSync(path.join(repo, 'asset-gallery.js'), 'utf8');
const baseline = execFileSync('git', ['show', '820149b176203ed902dcbeb78b82f29fd06fb752:asset-gallery.js'], { cwd: repo, encoding: 'utf8' });

function adoptedIds(source) {
  const match = source.match(/const adoptedVersionIds = new Set\((\[[^\n]*\])\);/);
  assert.ok(match, 'actual production adoptedVersionIds Set is present');
  return vm.runInNewContext(match[1]);
}
function staminaGroup(source) {
  const start = source.indexOf("Object.freeze({ id: 'stamina-astra'");
  const end = source.indexOf("Object.freeze({ id: 'emp-astra'", start);
  assert.ok(start >= 0 && end > start, 'production Stamina group boundaries are present');
  const versionStart = source.indexOf('const version = ', 0);
  const versionEnd = source.indexOf(';', versionStart) + 1;
  assert.ok(versionStart >= 0 && versionEnd > versionStart, 'production version constructor is present');
  let groupExpression = source.slice(start, end).trim().replace(/,\s*$/, '');
  const context = vm.createContext({});
  vm.runInContext(`${source.slice(versionStart, versionEnd)}\nglobalThis.__staminaGroup = (${groupExpression});`, context);
  return context.__staminaGroup;
}
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `production ${name} helper exists`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated production helper ${name}`);
}
function productionFilters(source) {
  const defaultIndex = source.match(/const defaultVersionIndex = entry =>[^;]+;/)?.[0];
  assert.ok(defaultIndex, 'production defaultVersionIndex helper exists');
  const context = vm.createContext({ __ids: adoptedIds(source) });
  const helpers = [
    functionSource(source, 'adoptionState'),
    functionSource(source, 'adoptionStatusLabel'),
    functionSource(source, 'visibleVersionIndices'),
    defaultIndex,
    `globalThis.__filters = {
      adoptionState, adoptionStatusLabel, visibleVersionIndices, defaultVersionIndex,
      setAdoptionFilter(value) { currentAdoptionFilter = value; }
    };`
  ].join('\n');
  vm.runInContext(`
    const adoptedVersionIds = new Set(globalThis.__ids);
    const OBJECT_SPECIFIC_EFFECT_GROUP_IDS = new Set(['camera-tripod-observation-map-e','atrium-hydration-object','engineering-wash-object-e']);
    let currentCategory = 'effect';
    let currentAdoptionFilter = 'unadopted';
    ${helpers}
  `, context);
  return context.__filters;
}

test('withdraws only the current Stamina adoption and preserves the prior event', () => {
  const before = adoptedIds(baseline);
  const after = adoptedIds(candidate);
  assert.deepEqual([...before].filter(id => id !== 'stamina-sol61-r11'), [...after]);
  assert.deepEqual([...before].filter(id => id.startsWith('stamina-')), ['stamina-sol61-r11']);
  assert.deepEqual([...after].filter(id => id.startsWith('stamina-')), []);

  const oldGroup = staminaGroup(baseline);
  const group = staminaGroup(candidate);
  assert.equal(group.id, 'stamina-astra');
  assert.equal(group.defaultVersionId, 'stamina-sparkle-sol61-r2');
  const oldIds = Array.from(oldGroup.versions, v => v.id);
  const expectedIds = ['stamina-sparkle-sol61-r2', 'stamina-sparkle-sol61-r1', 'stamina-sol61-r11', ...oldIds.slice(3)];
  assert.deepEqual(Array.from(group.versions, v => v.id), expectedIds, 'only the three required current/newest versions move to the front');
  for (const oldVersion of oldGroup.versions) {
    const current = group.versions.find(v => v.id === oldVersion.id);
    if (oldVersion.id !== 'stamina-sol61-r11') assert.equal(JSON.stringify(current), JSON.stringify(oldVersion), 'every other stamina version remains unchanged');
  }
  const oldR11 = oldGroup.versions.find(v => v.id === 'stamina-sol61-r11');
  for (const key of ['id','title','page','source','anchor','zoom','packageManifestSha256','packageSealSha256','creativeSourceSha256']) assert.equal(group.versions.find(v => v.id === oldR11.id)[key], oldR11[key], 'withdrawal does not alter frozen R11 source/runtime identity');

  const version = group.versions.find(v => v.id === 'stamina-sol61-r11');
  assert.equal(version.adoption, 'not-adopted');
  assert.deepEqual(Array.from(version.adoptionHistory, event => event.status), ['adopted', 'withdrawn']);
  assert.equal(version.adoptionHistory[0].source, 'user-direction-2026-09-30');
  assert.equal(version.adoptionHistory[1].source, 'user-direction-2026-10-08');
  assert.match(version.status, /2026-09-30採用・2026-10-08撤回/);
  assert.match(version.detail, /2026-09-30にユーザーがr11を採用/);
  assert.match(version.detail, /2026-10-08にユーザー指示で現行採用を撤回/);
});

test('actual gallery helpers classify the group Unadopted and select newest eligible R2 as its default', () => {
  assert.match(candidate, /let currentAdoptionFilter = 'unadopted';/);
  const group = staminaGroup(candidate);
  const filters = productionFilters(candidate);
  const r11 = group.versions.find(v => v.id === 'stamina-sol61-r11');
  assert.equal(filters.adoptionState(r11), 'not-adopted');
  assert.equal(filters.adoptionStatusLabel(r11), 'ユーザー採用撤回済み');
  assert.deepEqual(Array.from(group.versions).filter(v => filters.adoptionState(v) === 'adopted').map(v => v.id), [], 'no other stamina version remains adopted');

  filters.setAdoptionFilter('adopted');
  assert.deepEqual(Array.from(filters.visibleVersionIndices(group)), [], 'the group disappears from Adopted');
  filters.setAdoptionFilter('unadopted');
  const unadoptedIndices = Array.from(filters.visibleVersionIndices(group));
  assert.equal(unadoptedIndices.length, group.versions.length, 'the complete group appears under Unadopted');
  assert.equal(group.versions[filters.defaultVersionIndex(group)].id, 'stamina-sparkle-sol61-r2', 'newest eligible R2 is the group default');
  const renderedSelection = candidate.match(/const first\s*=\s*preferred\?\?indices\.find\(i=>group\.versions\[i\]\.id===group\.defaultVersionId\)\?\?indices\[0\];/);
  assert.ok(renderedSelection, 'actual initial render selection prefers the group default');
  const chooseFirst = new Function('group', 'indices', 'preferred', 'return ' + renderedSelection[0].replace(/^const first\s*=\s*/, '').replace(/;$/, ''));
  const initial = chooseFirst(group, unadoptedIndices, undefined);
  assert.equal(group.versions[initial].id, 'stamina-sparkle-sol61-r2', 'initial Unadopted preview selects R2');
});
