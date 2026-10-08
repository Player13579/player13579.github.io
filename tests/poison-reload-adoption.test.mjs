import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidate = fs.readFileSync(path.join(repo, 'asset-gallery.js'), 'utf8');
const baseline = execFileSync('git', ['show', 'e79dfde1cfd37edbc6483eaaa4182ab5ca939590:asset-gallery.js'], { cwd: repo, encoding: 'utf8' });

function adoptedIds(source) {
  const match = source.match(/const adoptedVersionIds = new Set\((\[[^\n]*\])\);/);
  assert.ok(match, 'production adoptedVersionIds set exists');
  return Array.from(vm.runInNewContext(match[1]));
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function group(source, id) {
  const startMatch = new RegExp(`Object\\.freeze\\(\\{\\s*id\\s*:\\s*(['"])${escapeRegExp(id)}\\1`).exec(source);
  assert.ok(startMatch, `production group ${id} exists`);
  const start = startMatch.index;
  const next = /Object\.freeze\(\{\s*id\s*:/.exec(source.slice(start + startMatch[0].length));
  const end = next ? start + startMatch[0].length + next.index : source.length;
  let expression = source.slice(start, end).trim().replace(/,\s*$/, '');
  const versionStart = source.indexOf('const version = ');
  const versionEnd = source.indexOf(';', versionStart) + 1;
  assert.ok(versionStart >= 0 && versionEnd > versionStart, 'production version constructor exists');
  const context = vm.createContext({});
  vm.runInContext(`${source.slice(versionStart, versionEnd)}\nglobalThis.__group = (${expression});`, context);
  return context.__group;
}
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `production helper ${name} exists`);
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
  assert.ok(defaultIndex, 'production defaultVersionIndex exists');
  const hiddenMatch = source.match(/const HIDDEN_EFFECT_GROUP_IDS = new Set\((\[[^\n]*\])\);/);
  assert.ok(hiddenMatch, 'production hidden effect group filter exists');
  const context = vm.createContext({ __ids: adoptedIds(source), __hidden: Array.from(vm.runInNewContext(hiddenMatch[1])) });
  const helpers = [
    functionSource(source, 'adoptionState'),
    functionSource(source, 'visibleEffectGroups'),
    functionSource(source, 'visibleVersionIndices'),
    defaultIndex,
    `globalThis.__filters = { adoptionState, visibleEffectGroups, visibleVersionIndices, defaultVersionIndex,
      setFilter(value) { currentAdoptionFilter = value; } };`
  ].join('\n');
  vm.runInContext(`
    const adoptedVersionIds = new Set(globalThis.__ids);
    const OBJECT_SPECIFIC_EFFECT_GROUP_IDS = new Set(['camera-tripod-observation-map-e','atrium-hydration-object','engineering-wash-object-e']);
    const HIDDEN_EFFECT_GROUP_IDS = new Set(globalThis.__hidden);
    let currentCategory = 'effect';
    let currentAdoptionFilter = 'unadopted';
    ${helpers}
  `, context);
  return context.__filters;
}
function assertOnlyAdoptionFieldsChanged(before, after, id) {
  const keys = [
    'originalCreatorDisplayName','designAuthorDisplayName','runtimeAuthorDisplayName','creatorDisplayName','creatorModelId',
    'qualityStatus','qualityReviewStatus','qualityReviewOutcome','qualityReviewerDisplayName','qualityEvidence','qualityEvidenceSha256','qualityReviewScope',
    'technicalReplayStatus','nativeStatus','publicParentReplayStatus','currentParentReplayStatus','parentGalleryReplayStatus',
    'normalAudioListening','sfxListeningStatus','safariReplayStatus','gameIntegrationStatus','performanceStatus',
    'creativeEdition','creativeEditionLimit','additionalCreativeEditionsRemaining','publicationEligible','packageManifestSha256','packageSealSha256','creativeSourceSealSha256'
  ];
  for (const key of keys) assert.deepEqual(after[key], before[key], `${id} ${key} remains unchanged`);
}

test('adopts only Poison Field R5 and Reload E R4, preserving quality and verification state', () => {
  const beforeIds = adoptedIds(baseline);
  const afterIds = adoptedIds(candidate);
  const newIds = ['poison-field-zero-sol61-r5','reload-e-zero-sol61-r4'];
  assert.deepEqual(afterIds.filter(id => !beforeIds.includes(id)), newIds);
  assert.deepEqual(afterIds.filter(id => !newIds.includes(id)), beforeIds, 'all other adoption IDs remain unchanged');

  const cases = [
    { groupId: 'poison-field-zero-sol61', versionId: 'poison-field-zero-sol61-r5', defaultId: 'poison-field-zero-sol61-r5', quality: 'NOT_ACCEPTED_SAMPLED_VISUAL' },
    { groupId: 'reload-e-sol61', versionId: 'reload-e-zero-sol61-r4', defaultId: 'reload-e-zero-sol61-r4', quality: 'pending' }
  ];
  for (const item of cases) {
    const oldGroup = group(baseline, item.groupId);
    const newGroup = group(candidate, item.groupId);
    const oldVersion = oldGroup.versions.find(version => version.id === item.versionId);
    const newVersion = newGroup.versions.find(version => version.id === item.versionId);
    assert.equal(newGroup.defaultVersionId, item.defaultId, 'the user-adopted exact version remains the group default');
    assert.equal(newVersion.adoption, 'adopted');
    assert.deepEqual(Array.from(newVersion.adoptionHistory, event => event.status), ['adopted']);
    assert.equal(newVersion.adoptionHistory[0].source, 'user-direction-2026-10-08');
    assert.equal(newVersion.qualityStatus, item.quality, 'adoption does not change quality state');
    assertOnlyAdoptionFieldsChanged(oldVersion, newVersion, item.versionId);
    assert.equal(oldVersion.id, newVersion.id);
  }

  const poison = group(candidate, 'poison-field-zero-sol61').versions.find(version => version.id === 'poison-field-zero-sol61-r5');
  assert.equal(poison.qualityReviewOutcome, 'fail');
  assert.equal(poison.additionalCreativeEditionsRemaining, 0, 'adoption does not reopen the 5/5 creative cap');
  assert.equal(poison.sfxListeningStatus, 'not_run');
  assert.equal(poison.safariReplayStatus, 'unverified');
  assert.equal(poison.gameIntegrationStatus, 'not_connected');
  const reload = group(candidate, 'reload-e-sol61').versions.find(version => version.id === 'reload-e-zero-sol61-r4');
  assert.equal(reload.qualityStatus, 'pending');
  assert.equal(reload.normalAudioListening, 'not_run');
  assert.equal(reload.safariReplayStatus, 'unverified');
  assert.equal(reload.gameIntegrationStatus, 'not_connected');
  assert.match(reload.status, /user-adopted/);
});

test('actual production filters select the adopted editions and hide Item Acquisition from lists and deep links', () => {
  const filters = productionFilters(candidate);
  const entries = [
    group(candidate, 'poison-field-zero-sol61'),
    group(candidate, 'reload-e-sol61'),
    group(candidate, 'iai-result-zero-sol61')
  ];
  const visible = Array.from(filters.visibleEffectGroups(entries), item => item.id);
  assert.deepEqual(visible, ['poison-field-zero-sol61','reload-e-sol61']);
  assert.match(candidate, /const exposedEntries = visibleEffectGroups\(entries\)\.map/);
  assert.match(candidate, /const effects=visibleEffectGroups\(entries\);/,
    'the production deep-link resolver only accepts listed effect groups');

  const renderedSelection = candidate.match(/const first=preferred\?\?indices\.find\(i=>group\.versions\[i\]\.id===group\.defaultVersionId\)\?\?indices\[0\];/);
  assert.ok(renderedSelection, 'actual production initial render prefers the selected group default');
  const chooseFirst = new Function('group','indices','preferred','return ' + renderedSelection[0].replace(/^const first=/, '').replace(/;$/, ''));
  for (const id of ['poison-field-zero-sol61','reload-e-sol61']) {
    const selectedGroup = entries.find(item => item.id === id);
    filters.setFilter('unadopted');
    assert.deepEqual(Array.from(filters.visibleVersionIndices(selectedGroup)), [], `${id} is omitted from Unadopted`);
    filters.setFilter('adopted');
    const adopted = Array.from(filters.visibleVersionIndices(selectedGroup));
    assert.ok(adopted.length > 0, `${id} is listed in Adopted`);
    const initial = chooseFirst(selectedGroup, adopted, undefined);
    assert.equal(selectedGroup.versions[initial].id, selectedGroup.defaultVersionId, `${id} actual initial render selects its adopted default`);
  }

  const iaBefore = group(baseline, 'iai-result-zero-sol61');
  const iaAfter = group(candidate, 'iai-result-zero-sol61');
  assert.equal(iaAfter.id, iaBefore.id, 'nonlisting preserves the group record');
  assert.deepEqual(Array.from(iaAfter.versions, item => item.id), Array.from(iaBefore.versions, item => item.id));
  for (const key of ['page','source','packageManifestSha256','creatorModelId','qualityStatus','technicalReplayStatus','normalAudioListening','safariReplayStatus','gameIntegrationStatus','publicationEligible']) {
    assert.deepEqual(iaAfter.versions[0][key], iaBefore.versions[0][key], `Iai source/provenance ${key} preserved`);
  }
  assert.equal(iaAfter.versions[0].adoption, 'unknown', 'nonlisting does not imply rejection or adoption');
});

 test('gallery loader token matches the changed catalog bytes', () => {
  const html = fs.readFileSync(path.join(repo, 'webgpu-e-gallery.html'), 'utf8');
  const token = html.match(/asset-gallery\.js\?sha256=([0-9a-f]{64})/)?.[1];
  assert.ok(token, 'gallery HTML pins the catalog hash');
  const bytes = fs.readFileSync(path.join(repo, 'asset-gallery.js'));
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(token, actualHash, 'gallery loader token equals exact production catalog bytes');
});
