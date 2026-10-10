'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { mergeHistory } = require('../asset-gallery-history.js');
const source = fs.readFileSync(path.join(root, 'asset-gallery.js'), 'utf8');
function catalog() {
  const context = { window: {}, console }; vm.createContext(context);
  for (const name of ['asset-gallery-history.js', 'asset-gallery-history-data.js'])
    vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context);
  vm.runInContext(source.slice(0, source.indexOf('  const params = new URLSearchParams')) + '\n globalThis.catalog = entries; globalThis.base = baseEntries; })();', context);
  return context;
}
test('all existing versions and adopted defaults are unchanged, sparse slots normalized', () => {
  const { catalog: next, base } = catalog();
  for (const before of base) {
    const after = next.find(group => group.id === before.id);
    assert.equal(after.defaultVersionId, before.defaultVersionId);
    assert.equal(after.latestVersionId, before.latestVersionId);
    before.versions.forEach(item => assert.deepEqual(after.versions.find(v => v.id === item.id), item));
    assert.equal(after.versions.filter(Boolean).length, after.versions.length);
  }
});
test('history additions remain non-adopted and explicitly unverified', () => {
  const { window, catalog: groups } = catalog();
  assert.ok(window.E_GALLERY_HISTORY.length > 0);
  for (const row of window.E_GALLERY_HISTORY) {
    const v = groups.find(g => g.id === row.groupId).versions.find(v => v.id === row.version.id);
    assert.equal(v.historyOnly, true); assert.equal(v.replayable, false);
    assert.notEqual(v.adoption, 'adopted'); assert.notEqual(v.technicalReplayStatus, 'pass');
    assert.ok(v.sourceUrl || v.page || v.source);
  }
});
test('duplicate version IDs are rejected without replacing old versions', () => {
  assert.throws(() => mergeHistory([{ id: 'g', versions: [{ id: 'v' }] }], [{ groupId: 'g', version: { id: 'v' } }]), /Duplicate/);
});
test('all history IDs are unique, archived source URLs are pinned and comparison routes exist', () => {
  const { window, catalog: groups } = catalog();
  for (const group of groups) assert.equal(new Set(group.versions.map(v => v.id)).size, group.versions.length);
  for (const row of window.E_GALLERY_HISTORY) {
    const url = row.version.sourceUrl;
    if (/^https:/.test(url)) assert.match(url, /^https:\/\/github\.com\/Player13579\/player13579\.github\.io\/blob\/[a-f0-9]{40}\//);
    else assert.ok(fs.existsSync(path.join(root, url)), url);
  }
});
test('new shot comparison defaults to repaired bytes without adopting them', () => {
  const { catalog: groups } = catalog();
  const group = groups.find(g => g.id === 'gunner-shot');
  assert.equal(group.defaultVersionId, 'dot-gunner-repaired-r1');
  assert.equal(group.versions[0].adoption, 'not-adopted');
});
test('public lineage records never masquerade as successor previews', () => {
  const { window } = catalog();
  const records = window.E_GALLERY_HISTORY.map(row => row.version).filter(v => v.recordKind);
  assert.equal(records.length, 4);
  assert.equal(records.filter(v => v.recordKind === 'reference-only').length, 3);
  for (const v of records) {
    assert.equal(v.page, null);
    assert.ok(v.historicalVersionId);
    assert.ok(v.historyNotice);
    assert.equal(v.replayable, false);
  }
});
test('history selection stops prior iframe/audio before blocking autoplay', () => {
  const selection = source.slice(source.indexOf('  function select(index, versionIndex)'), source.indexOf('  const exposedEntries'));
  const guard = selection.indexOf('if (item.historyOnly)');
  assert.ok(guard > selection.indexOf('previousFrame?.remove()'));
  assert.ok(guard > selection.indexOf("retireGalleryChildStartup('effect-selection-changed')"));
  assert.ok(guard < selection.indexOf("document.createElement('iframe')"));
  assert.match(selection, /if \(item.historyOnly\) \{[\s\S]*?return;/);
  assert.match(source, /\(item.replayable \|\| item.historyOnly\)/);
});
test('history scripts load before the gallery and cache hashes match bytes', () => {
  const html = fs.readFileSync(path.join(root, 'webgpu-e-gallery.html'), 'utf8');
  const crypto = require('node:crypto');
  for (const name of ['asset-gallery-history.js', 'asset-gallery-history-data.js', 'asset-gallery.js']) {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    assert.ok(html.includes(name + '?sha256=' + digest));
  }
  assert.ok(html.indexOf('asset-gallery-history-data.js?') < html.lastIndexOf('asset-gallery.js?'));
});
