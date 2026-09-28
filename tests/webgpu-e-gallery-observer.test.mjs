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
  assert.doesNotMatch(gallerySource, /barrier-pro-r0[1-6]|barrier-pro-r08|barrier-pro-r09/);
  assert.ok(gallerySource.indexOf("version('sunbeam-astra-clean-v3'") < gallerySource.indexOf("version('sunbeam-astra-clean-v2'"), 'latest Sunbeam appears first');
  assert.ok(gallerySource.indexOf("version('luck-astra-clean-v4'") < gallerySource.indexOf("version('luck-astra-clean-v3'"), 'latest Luck appears first');
});
