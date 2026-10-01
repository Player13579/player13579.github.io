import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceManifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
const sourceManifestHash = hash(await readFile(resolve(root, 'manifest.json')));
assert.equal(sourceManifestHash, 'ed7ebb22d644bffc7d63e23f2827ec1407e69b58a17a2ffd414e17a624090de1');
const packageManifest = JSON.parse(await readFile(resolve(root, 'PACKAGE.json'), 'utf8'));
const ready = JSON.parse(await readFile(resolve(root, 'READY.json'), 'utf8'));
assert.equal(packageManifest.sourceManifest.sha256, sourceManifestHash);
assert.equal(packageManifest.entry, 'runtime/index.html');
assert.equal(packageManifest.audioGain, 0);
assert.equal(packageManifest.embedEntry, 'runtime/index.html?embed=1');
assert.equal(packageManifest.publicHostAdapter.publicSha256, '34b85ede9119a59eb9635b0c35ef03fe1735ff50040b82c33e8f006cea0f9041');
assert.equal(ready.status, 'native_technical_pass_quality_revision_required');
assert.equal(ready.nativeWebGpu, 'pass; primary-owned verification');
assert.equal(ready.entry, 'runtime/index.html?embed=1');
assert.equal(ready.verifyEntry, 'runtime/index.html?verify');
assert.match(ready.visualQuality, /fail; full-fit water and cloth readability failed/);
assert.equal(ready.nativeEvidence.proof.completed, true);
assert.equal(ready.nativeEvidence.proof.current, true);
assert.deepEqual(ready.nativeEvidence.proof.errors, []);
assert.equal(ready.nativeEvidence.proof.phaseMs, 3000);

for (const [name, metadata] of Object.entries(sourceManifest.files)) {
  const bytes = await readFile(resolve(root, name));
  assert.equal(bytes.length, metadata.bytes, `${name} byte count`);
  assert.equal(hash(bytes), metadata.sha256, `${name} frozen source hash`);
}
assert.equal(Object.keys(sourceManifest.files).length, 29, 'all 29 frozen source entries are present');

const runtimeRoot = resolve(root, 'runtime');
const runtimeManifest = JSON.parse(await readFile(resolve(runtimeRoot, 'manifest.json'), 'utf8'));
assert.equal(runtimeManifest.sourceManifest.sha256, sourceManifestHash);
for (const [name, metadata] of Object.entries(runtimeManifest.files)) {
  const bytes = await readFile(resolve(runtimeRoot, name));
  assert.equal(hash(bytes), metadata.sha256, `runtime/${name} hash`);
}

for (const dependency of runtimeManifest.runtimeDependencies) {
  const target = resolve(runtimeRoot, dependency);
  const rel = relative(root, target);
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`), `runtime dependency stays inside the package: ${dependency}`);
  await readFile(target);
}

const html = await readFile(resolve(runtimeRoot, 'index.html'), 'utf8');
const runtime = await readFile(resolve(runtimeRoot, 'runtime.mjs'), 'utf8');
const source = await readFile(resolve(root, 'artist.mjs'), 'utf8');
assert.match(html, /\.\/runtime\.mjs/);
assert.match(html, /new URLSearchParams\(location\.search\)\.get\('embed'\) === '1'/);
assert.match(html, /html\.embed #controls, html\.embed #diagnostics/);
assert.doesNotMatch(html, /html\.embed\s+#error/);
assert.equal(runtimeManifest.publicHostAdapter.publicIndexSha256, runtimeManifest.files['index.html'].sha256);
assert.match(runtime, /from ['"]\.\.\/artist\.mjs['"]/);
assert.match(source, /from ['"]\.\/support-light\/artist\.mjs['"]/);
assert.match(source, /from ['"]\.\/cloth\.mjs['"]/);

const rootEntries = (await readdir(root, { withFileTypes: true })).map(entry => entry.name);
assert.ok(rootEntries.includes('runtime') && rootEntries.includes('medical-room-vfx-r4.png'));

console.log(JSON.stringify({
  status: 'pass',
  sourceManifestSha256: sourceManifestHash,
  frozenSourceEntries: Object.keys(sourceManifest.files).length,
  runtimeDependencies: runtimeManifest.runtimeDependencies.length,
  runtimeFileHashes: Object.keys(runtimeManifest.files).length,
  packageEntry: 'runtime/index.html?embed=1',
  verifyEntry: 'runtime/index.html?verify',
  nativeWebGpu: ready.nativeWebGpu,
  visualQuality: ready.visualQuality,
}, null, 2));
