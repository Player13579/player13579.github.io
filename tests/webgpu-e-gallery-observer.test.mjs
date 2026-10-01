import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const pagesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const galleryPath = path.join(pagesRoot, 'asset-gallery.js');
const gallerySource = fs.readFileSync(galleryPath, 'utf8');
const galleryHtml = fs.readFileSync(path.join(pagesRoot, 'webgpu-e-gallery.html'), 'utf8');
function evaluateEffectGroups(source = gallerySource) {
  const start = source.indexOf('  const version = (id, title, page, source, status, detail');
  const end = source.indexOf('\n  const params =', start);
  assert(start >= 0 && end > start, 'canonical asset-gallery effect data block exists');
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end) + '\nglobalThis.__effectGroups = entries;', context, { timeout: 1000, filename: 'asset-gallery-effect-inventory.js' });
  return context.__effectGroups;
}
const effectGroups = evaluateEffectGroups();

test('canonical gallery entrypoint exposes Map and Effect and retains current eligible effect groups', () => {
  assert.match(galleryHtml, /src="asset-gallery\.js\?/);
  assert.match(gallerySource, /categories: Object\.freeze\(\['map','effect'\]\)/);
  const ids = Array.from(effectGroups, group => group.id);
  assert.deepEqual(ids, [
    'teleport-sol61',
    'item-pickup-sol', 'rational-free-sol', 'heal-astra', 'vibe-coding-sol61', 'sunbeam-astra', 'credit-acquisition',
    'luck-astra', 'mana-astra', 'stamina-astra', 'emp-astra', 'recovery-astra',
    'status-cleanse-astra', 'cooldown-astra', 'dodge-sol61', 'quantum-transmutation-sol61', 'barrier-pro'
  ]);
  assert.match(gallerySource, /const exposedEntries = entries\.map\(group => Object\.freeze/);
  assert.match(gallerySource, /versions: Object\.freeze\(group\.versions\.map\(item => Object\.freeze/);
});

test('all retained playable Codex E versions have their preview and source files; Astra Barrier stays excluded', () => {
  const versions = effectGroups.flatMap(group => group.versions.map(version => ({ group, version })));
  assert.ok(versions.length > 100, 'historical playable E versions remain in the selectable data');
  for (const { group, version } of versions) {
    assert.equal(version.replayable, true, `${version.id} is kept as a replayable version`);
    assert.ok(version.page && version.source, `${version.id} has both preview and source paths`);
    assert.ok(fs.existsSync(path.join(pagesRoot, version.page.split('?')[0])), `${version.id} preview file exists`);
    assert.ok(fs.existsSync(path.join(pagesRoot, version.source)), `${version.id} source file exists`);
    assert.ok(version.status, `${version.id} keeps its quality/adoption status`);
    assert.doesNotMatch(`${group.id} ${version.id}`, /barrier-astra/i, 'Astra Barrier is not part of the catalog');
  }
  const barrier = effectGroups.find(group => group.id === 'barrier-pro');
  assert.ok(barrier, 'Barrier history plus new Sol designs remains represented');
  assert.ok(barrier.versions.some(version => version.id === 'barrier-pro-r07'), 'withdrawn GPT Pro r0.7 history remains preserved');
  assert.ok(barrier.versions.some(version => version.id.startsWith('barrier-sol61-')), 'new Sol Barrier designs are listed');
  assert.ok(barrier.versions.every(version => !/astra/i.test(version.id)), 'no Astra Barrier edition is selectable');
});

test('H64 Mana, Stamina, and Status views focus their actual actor regions', () => {
  for (const [group, focusX, focusY] of [
    ['mana-astra', 245, 310],
    ['stamina-astra', 518, 343],
    ['status-cleanse-astra', 490, 310]
  ]) {
    const view = gallerySource.match(new RegExp(`'${group}': \\{ magnification: [\\d.]+, focusX: ([\\d.]+), focusY: ([\\d.]+) \\}`));
    assert(view, `${group} has an explicit gallery transform`);
    assert.equal(Number(view[1]), focusX, `${group} focusX matches its renderer layout`);
    assert.equal(Number(view[2]), focusY, `${group} focusY matches its renderer layout`);
  }
});
