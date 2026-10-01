'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const clean = path.resolve(__dirname, '..');
const galleryPath = path.join(clean, 'asset-gallery.js');
const htmlPath = path.join(clean, 'webgpu-e-gallery.html');
const manifestPath = path.join(clean, 'public/server-room-object-interaction-r1/package-manifest.json');
const gallery = fs.readFileSync(galleryPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const manifestBytes = fs.readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = source.indexOf(') {', start) + 2;
  assert.ok(open > 1, `${name} opens a body`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} closes its body`);
}

function parseJsonObjectAt(source, marker) {
  const property = source.indexOf(marker);
  assert.notEqual(property, -1, `metadata marker ${marker} exists`);
  const start = source.lastIndexOf('{', property);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return JSON.parse(source.slice(start, index + 1));
  }
  assert.fail(`metadata object for ${marker} closes`);
}

const r04 = parseJsonObjectAt(gallery, '"id":"security-room-e-gpt6sol-luna-r04"');
const r05 = parseJsonObjectAt(gallery, '"id":"security-room-e-gpt6sol-r05"');
const originalReference = parseJsonObjectAt(gallery, '"id":"security-server-gpt6sol-r01-original"');
const securityGroup = parseJsonObjectAt(gallery, '"id":"security-server-gpt6sol-r01"');

test('r04 adopted E remains the same default version and keeps its bound original provenance', () => {
  assert.equal(securityGroup.defaultVersionId, 'security-room-e-gpt6sol-luna-r04');
  assert.equal(r04.id, 'security-room-e-gpt6sol-luna-r04');
  assert.equal(r04.page, 'public/sol61-server-room-e/r04/index.html?embed=1');
  assert.equal(r04.source, 'public/sol61-server-room-e/r04/package-manifest.json');
  assert.equal(r04.adoption, 'adopted');
  assert.equal(r04.originalCreatorDisplayName, 'GPT-6-Sol');
  assert.equal(r04.designAuthorDisplayName, 'GPT-6.1-Sol');
  assert.equal(r04.runtimeAuthorDisplayName, 'GPT-6-Luna');
  assert.equal(r04.originalSrc, 'public/sol61-server-room-e/r04/security-room-r01-original.png');
  assert.equal(r04.originalHash, 'b13814c922b644ef1c29929c7604df8e9e5f5980ef32c9fe466335e57d01ea64');
  assert.equal(r05.adoption, 'not-adopted');
  assert.equal(originalReference.standaloneAdoption, false);
  assert.equal(originalReference.adoption, 'reference-only');
  assert.equal(r04.interactionPreviewPage, 'public/server-room-object-interaction-r1/index.html?embed=1');
  assert.equal(r04.interactionPreviewManifest, 'public/server-room-object-interaction-r1/package-manifest.json');
  assert.equal(r04.interactionPreviewManifestSha256, crypto.createHash('sha256').update(manifestBytes).digest('hex'));
  assert.equal(r04.interactionPreviewDesignAuthorDisplayName, manifest.authorship.activationRimDesignAuthor);
  assert.equal(r04.interactionPreviewRuntimeAuthorDisplayName, manifest.authorship.runtimeAndFixtureImplementationAuthor);
  assert.equal(r04.interactionPreviewPackageStatus, manifest.packageStatus);
  assert.equal(manifest.authorship.adoptedEnvironmentEAuthor, r04.designAuthorDisplayName);
  assert.equal(manifest.authorship.adoptedEnvironmentERuntimeAuthor, r04.runtimeAuthorDisplayName);
  assert.equal(manifest.runtime.audio, 'disabled');
  assert.equal(manifest.runtime.authoritativeGameplayReceipts, false);
  assert.equal(manifest.runtime.mainGameIntegration, 'none');
  assert.equal(manifest.validation.qualityAcceptance, 'pending');
  assert.equal(Object.hasOwn(r05, 'interactionPreviewPage'), false);
});

test('fixture manifest pins every current package payload byte and adopted-source hash', () => {
  assert.equal(manifest.schema, 'dva-gallery-fixture-package/1');
  assert.equal(manifest.packageId, 'server-room-object-interaction-r1');
  assert.equal(manifest.sourceSet.adoption, 'adopted-server-room-original-r01-plus-environment-e-r04');
  assert.equal(manifest.sourceSet.original.sha256, r04.originalHash);
  assert.equal(manifest.validation.nativeCurrentRimShaderCompilation, 'passed-current-rim-integrated-source-in-Chrome; actual render captured; no uncaptured GPU errors');
  for (const entry of manifest.files) {
    const bytes = fs.readFileSync(path.join(clean, 'public/server-room-object-interaction-r1', entry.path));
    assert.equal(bytes.byteLength, entry.bytes, `${entry.path} byte length`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256, `${entry.path} SHA-256`);
  }
});

test('gallery companion resolver switches only r04 while preserving embed, verify, and cache token', () => {
  const context = vm.createContext({
    URL, URLSearchParams, location: { href: 'https://example.test/webgpu-e-gallery.html?category=map&verify=fixture-check' },
    params: new URLSearchParams('category=map&verify=fixture-check'), currentCategory: 'map', mapInteractionPreview: false
  });
  const resolver = extractFunction(gallery, 'makeMapPreview');
  const capability = extractFunction(gallery, 'canUseMapInteractionPreview');
  vm.runInContext(`${resolver}\n${capability}\nglobalThis.api={makeMapPreview,canUseMapInteractionPreview};`, context);
  const defaultUrl = new URL(context.api.makeMapPreview(r04).href);
  assert.equal(defaultUrl.pathname, '/public/sol61-server-room-e/r04/index.html');
  assert.equal(defaultUrl.searchParams.get('embed'), '1');
  assert.equal(defaultUrl.searchParams.get('verify'), 'fixture-check');
  assert.equal(defaultUrl.searchParams.get('galleryRelease'), 'map-webgpu-20260930-r1');
  assert.equal(context.api.canUseMapInteractionPreview(r04), true);
  assert.equal(context.api.canUseMapInteractionPreview(r05), false);
  assert.equal(context.api.canUseMapInteractionPreview(originalReference), false);
  context.mapInteractionPreview = true;
  const interactionUrl = new URL(context.api.makeMapPreview(r04).href);
  assert.equal(interactionUrl.pathname, '/public/server-room-object-interaction-r1/index.html');
  assert.equal(interactionUrl.searchParams.get('embed'), '1');
  assert.equal(interactionUrl.searchParams.get('verify'), 'fixture-check');
  assert.equal(interactionUrl.searchParams.get('galleryRelease'), 'map-webgpu-20260930-r1');
  assert.equal(interactionUrl.searchParams.has('height'), false);
  assert.equal(interactionUrl.searchParams.has('zoom'), false);
  assert.equal(new URL(context.api.makeMapPreview(r05).href).pathname, '/public/sol61-server-room-e/r05/index.html');
});

test('interaction checkbox is r04-only, initially unchecked, silent, and described as a local fixture', () => {
  assert.match(html, /id="map-interaction-toggle"[^>]*disabled/);
  assert.match(html, /id="map-interaction-control"[^>]*hidden/);
  assert.match(html, /キャラ操作/);
  assert.match(gallery, /syncMapInteractionControl\(canShowInteraction\);/);
  assert.match(gallery, /mapInteractionToggle\.disabled = !canShowInteraction \|\| mapOriginalComparison/);
  assert.match(gallery, /item\?\.id === 'security-room-e-gpt6sol-luna-r04'/);
  assert.match(gallery, /操作fixture設計者:/);
  assert.match(gallery, /操作fixture runtime作者:/);
  assert.match(gallery, /操作デモ状態: \$\{item\.interactionPreviewStatus\}/);
  assert.match(r04.interactionPreviewNote, /本編receiptを発行せず/);
  assert.match(r04.interactionPreviewNote, /マップ音声は無効/);
});

test('version/list changes clear interaction mode; original compare suspends and restores the same selected preview', () => {
  const selectStart = gallery.indexOf('function selectImage(');
  const selectEnd = gallery.indexOf('\n  mapComparisonButton.addEventListener', selectStart);
  const selectSource = gallery.slice(selectStart, selectEnd);
  const renderStart = gallery.indexOf('function renderSelection()');
  const renderEnd = gallery.indexOf('\n  const adoptionTabs', renderStart);
  const renderSource = gallery.slice(renderStart, renderEnd);
  assert.match(selectSource, /resetMapInteractionForSelection\(item\);/);
  assert.match(renderSource, /resetMapInteractionForListChange\(\);\s*mapInteractionToggle\.checked = false;\s*mapInteractionToggle\.disabled = true;/);
  assert.match(gallery, /mapOriginalComparison = !mapOriginalComparison;\s*selectImage\(imageGroups\.find\(group => group\.id === activeMapSelection\.groupId\), activeMapSelection\.versionIndex\);/);
  assert.match(selectSource, /if \(webgpu && mapOriginalComparison\) \{\s*void showMapOriginal\(group, item, generation\);\s*\} else if \(webgpu\) \{/);
  assert.match(selectSource, /disposeMapPreview\(\); stage\.querySelector\('img'\)\?\.remove\(\);/);
  assert.match(gallery, /setMapInteractionPreviewEnabled\(item, mapInteractionToggle\.checked\);\s*selectImage\(group, activeMapSelection\.versionIndex\);/);
});

test('interaction state persists through same-version comparison, then clears on version/list changes', () => {
  const names = ['canUseMapInteractionPreview', 'resetMapInteractionForSelection', 'resetMapInteractionForListChange', 'setMapInteractionPreviewEnabled'];
  const pieces = names.map(name => extractFunction(gallery, name)).join('\n');
  const context = vm.createContext({ currentCategory: 'map', mapOriginalComparison: false, mapInteractionPreview: false,
    activeMapSelection: { versionId: r04.id }, Boolean });
  vm.runInContext(`${pieces}\nglobalThis.api={canUseMapInteractionPreview,resetMapInteractionForSelection,resetMapInteractionForListChange,setMapInteractionPreviewEnabled};`, context);
  assert.equal(context.api.setMapInteractionPreviewEnabled(r04, true), true);
  assert.equal(context.mapInteractionPreview, true);
  context.mapOriginalComparison = true;
  context.api.resetMapInteractionForSelection(r04);
  assert.equal(context.mapInteractionPreview, true, 'original comparison suspends the iframe but retains the requested mode');
  context.mapOriginalComparison = false;
  context.api.resetMapInteractionForSelection(r04);
  assert.equal(context.mapInteractionPreview, true, 'returning to the same version restores the interaction preview');
  assert.equal(context.api.setMapInteractionPreviewEnabled(r04, false), false);
  assert.equal(context.mapInteractionPreview, false, 'unchecked toggle returns to the adopted E page');
  context.mapInteractionPreview = true;
  context.api.resetMapInteractionForSelection(r05);
  assert.equal(context.mapInteractionPreview, false, 'different selected version starts in E mode');
  context.mapInteractionPreview = true;
  context.api.resetMapInteractionForListChange();
  assert.equal(context.mapInteractionPreview, false, 'filter/category rerender starts in E mode');
  context.currentCategory = 'effect';
  assert.equal(context.api.canUseMapInteractionPreview(r04), false, 'E gallery does not expose map controls');
});

test('disabled original-comparison control is visually unchecked and restores the retained ON choice', () => {
  const sync = extractFunction(gallery, 'syncMapInteractionControl');
  const context = vm.createContext({ mapInteractionControl: { hidden: true }, mapInteractionToggle: { checked: false, disabled: true },
    mapInteractionPreview: true, mapOriginalComparison: true, Boolean });
  vm.runInContext(`${sync}\nglobalThis.sync=syncMapInteractionControl;`, context);
  context.sync(true);
  assert.equal(context.mapInteractionControl.hidden, false);
  assert.equal(context.mapInteractionToggle.checked, false);
  assert.equal(context.mapInteractionToggle.disabled, true);
  context.mapOriginalComparison = false;
  context.sync(true);
  assert.equal(context.mapInteractionToggle.checked, true, 'the previously selected fixture mode returns with the same r04');
  assert.equal(context.mapInteractionToggle.disabled, false);
  context.sync(false);
  assert.equal(context.mapInteractionControl.hidden, true);
  assert.equal(context.mapInteractionToggle.checked, false);
  assert.equal(context.mapInteractionToggle.disabled, true);
});

test('preview selection count uses visible groups and versions for current category/filter', () => {
  const counts = extractFunction(gallery, 'visibleCatalogCounts');
  const context = vm.createContext({ visibleVersionIndices: group => group.visibleIndices });
  vm.runInContext(`${counts}\nglobalThis.counts=visibleCatalogCounts;`, context);
  const mapGroups = [
    { id: 'adopted-server', visibleIndices: [0, 1] },
    { id: 'hidden-rejected', visibleIndices: [] }
  ];
  assert.deepEqual({ ...context.counts(mapGroups) }, { groupCount: 1, versionCount: 2 });
  assert.match(gallery, /visibleCatalogCounts\(imageGroups\.filter\(g => g\.category === currentCategory\)\)/);
  const selectStart = gallery.indexOf('function selectImage(');
  const selectEnd = gallery.indexOf('\n  mapComparisonButton.addEventListener', selectStart);
  assert.match(gallery.slice(selectStart, selectEnd), /counts\.groupCount.*counts\.versionCount/);
});

