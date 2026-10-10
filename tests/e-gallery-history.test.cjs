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
  for (const name of ['asset-gallery-history.js', 'asset-gallery-history-data-r2.js'])
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
test('all 23 additions are withheld from normal selectors; all 401 established records remain', () => {
 const { window, catalog: groups, base } = catalog();
 assert.equal(window.E_GALLERY_HISTORY.length, 23);
 assert.equal(groups.reduce((n,g)=>n+g.versions.length,0),401);
 assert.deepEqual(JSON.parse(JSON.stringify(groups)),JSON.parse(JSON.stringify(base.map(g=>({...g,versions:g.versions.filter(Boolean)})))));
 for (const row of window.E_GALLERY_HISTORY) assert.ok(!groups.some(g=>g.versions.some(v=>v.id===row.version.id)));
});
test('admission requires every technical gate and never admits explicitly excluded records', () => {
 const version={id:'v', publicationEligible:true,replayable:true,historyOnly:false,galleryAcceptance:{entry:'pass',closure:'pass',nativeGpu:'pass',normalSfx:'pass',parentDisplay:'pass'}};
 const run=v=>mergeHistory([], [{groupId:'g',version:v}]);
 assert.equal(run(version)[0].versions.length,1);
 for(const key of Object.keys(version.galleryAcceptance)) assert.equal(run({...version,galleryAcceptance:{...version.galleryAcceptance,[key]:'not_run'}}).length,0);
 for(const patch of [{listingExcluded:true},{historyOnly:true},{publicationEligible:false},{replayable:false},{galleryAcceptance:null}]) assert.equal(run({...version,...patch}).length,0);
 assert.throws(()=>mergeHistory([{id:'g',versions:[{id:'v'}]}],[{groupId:'g',version}]),/Duplicate/);
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
test('original creator stays unknown; dot host and repaired-only roles are separate', () => {
 const {window,catalog:groups}=catalog();
 assert.ok(!groups.some(g=>g.id==='gunner-shot'));
 const pair=window.E_GALLERY_HISTORY.filter(r=>r.version.id.startsWith('dot-gunner-')).map(r=>r.version);
 assert.equal(pair.length,2);
 for(const v of pair){
  assert.equal(v.creatorModelId,null);
  assert.equal(v.technicalAttribution.modelId,'gpt-6-astra');
  assert.equal(v.technicalAttribution.modelEvidence,'https://learn.chatgpt.com/docs/dots');
  assert.equal(v.technicalAttribution.roles.includes('technical-source-repair'),v.id.includes('repaired'));
 }
 const excluded=window.E_GALLERY_HISTORY.filter(r=>r.version.listingExcluded);
 assert.equal(excluded.length,2);
 assert.ok(excluded.every(r=>r.version.listingStatus==='explicitly-excluded-missing-own-sfx'));
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
  for (const name of ['asset-gallery-history.js', 'asset-gallery-history-data-r2.js', 'asset-gallery.js']) {
    const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    assert.ok(html.includes(name + '?sha256=' + digest));
  }
  assert.ok(html.indexOf('asset-gallery-history-data-r2.js?') < html.lastIndexOf('asset-gallery.js?'));
});
