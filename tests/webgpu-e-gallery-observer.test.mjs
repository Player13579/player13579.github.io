import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gallerySource = fs.readFileSync(path.join(pagesRoot, 'webgpu-e-gallery.js'), 'utf8');

test('Pages gallery publishes replayable Astra history newest first with version-specific quality states', () => {
  const astraGroups = [...gallerySource.matchAll(/Object\.freeze\(\{ id: '(?:heal|sunbeam|luck|mana|stamina|emp|barrier)-astra[^']*', title: '[^']+', versions: Object\.freeze\(\[([\s\S]*?)\]\) \}\)/g)];
  assert.equal(astraGroups.length, 7, 'all seven Astra effect groups are present');
  const astraVersions = [...gallerySource.matchAll(/version\('([^']+)', '[^']+', '([^']+)', '([^']+)', '([^']+)'/g)];
  assert.ok(astraVersions.length >= 30, 'older Astra versions remain in the selectable catalog');
  const ids = astraVersions.map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length, 'Astra version IDs are unique');
  for (const [, id, page, source, status] of astraVersions) {
    assert.ok(fs.existsSync(path.join(pagesRoot, page.split('?')[0])), `${id} preview page exists`);
    assert.ok(fs.existsSync(path.join(pagesRoot, source)), `${id} renderer source exists`);
    assert.match(status, /品質|採用|未審査|未受入|不合格|未達|却下/, `${id} has an explicit quality state`);
  }
  assert.match(gallerySource, /barrier-pro-r07/);
  const empIds = [...gallerySource.matchAll(/version\('(emp-astra-v[0-9.]+)'/g)].map(([, id]) => id);
  assert.deepEqual(empIds, ['emp-astra-v1.8', 'emp-astra-v1.7', 'emp-astra-v1.6', 'emp-astra-v1.5', 'emp-astra-v1.4', 'emp-astra-v1.3', 'emp-astra-v1.2']);
  assert.match(gallerySource, /品質審査中・本編未採用/);
  assert.equal((gallerySource.match(/復元再生/g) || []).length, 3, 'v1.2-v1.4 reconstruction is disclosed');
  assert.match(gallerySource, /emp-astra-zero-v1/, 'older zero version remains listed');
  assert.doesNotMatch(gallerySource, /barrier-pro-r0[1-6]|barrier-pro-r08|barrier-pro-r09/);
  assert.ok(gallerySource.indexOf("version('sunbeam-astra-clean-v3'") < gallerySource.indexOf("version('sunbeam-astra-clean-v2'"), 'latest Sunbeam appears first');
  assert.ok(gallerySource.indexOf("version('luck-astra-clean-v4'") < gallerySource.indexOf("version('luck-astra-clean-v3'"), 'latest Luck appears first');
});

test('H64 Mana, Stamina, and Status views focus their actual actor regions', () => {
  for (const [group, focusX, focusY] of [
    ['mana-astra', 245, 310], // one panel of the side-by-side dark/light preview
    ['stamina-astra', 518, 343], // embedded panel's authoritative support point
    ['status-cleanse-astra', 490, 310]
  ]) {
    const view = gallerySource.match(new RegExp(`'${group}': \\{ magnification: [\\d.]+, focusX: ([\\d.]+), focusY: ([\\d.]+) \\}`));
    assert(view, `${group} has an explicit gallery transform`);
    assert.equal(Number(view[1]), focusX, `${group} focusX matches its renderer layout`);
    assert.equal(Number(view[2]), focusY, `${group} focusY matches its renderer layout`);
  }
});
