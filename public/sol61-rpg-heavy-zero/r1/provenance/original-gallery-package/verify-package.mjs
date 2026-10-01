import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedLoopState, frameInput } from './rpg-e-r1/runtime-preview/preview-host.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package-manifest.json'), 'utf8'));
const closure = JSON.parse(fs.readFileSync(path.join(root, 'package-closure.json'), 'utf8'));
function sha(relative) {
  const target = path.resolve(root, relative);
  assert.ok(target.startsWith(root + path.sep), `path escapes package: ${relative}`);
  return crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
}
for (const file of closure.files) assert.equal(sha(file.path), file.sha256, `${file.path} closure hash`);
const sourceFreeze = JSON.parse(fs.readFileSync(path.join(root, 'rpg-e-r1/source-freeze.json'), 'utf8'));
for (const [file, hash] of Object.entries(sourceFreeze.files)) assert.equal(sha(`rpg-e-r1/${file}`), hash, `${file} source freeze`);
assert.equal(sha('rpg-e-r1/rpg-e.mjs'), manifest.creative.sha256, 'frozen creative module');
const previewFreeze = JSON.parse(fs.readFileSync(path.join(root, 'rpg-e-r1/runtime-preview/preview-freeze.json'), 'utf8'));
for (const entry of previewFreeze.runtime.localCodeDependencies) assert.equal(sha(`rpg-e-r1/runtime-preview/${entry.path}`), entry.sha256, `${entry.path} preview pin`);
for (const entry of previewFreeze.provenanceAndTests) assert.equal(sha(`rpg-e-r1/runtime-preview/${entry.path}`), entry.sha256, `${entry.path} provenance pin`);
assert.match(fs.readFileSync(path.join(root, 'rpg-e-r1/runtime-preview/index.html'), 'utf8'), /id="error" role="alert" hidden/);
const host = fs.readFileSync(path.join(root, 'rpg-e-r1/runtime-preview/preview-host.mjs'), 'utf8');
assert.match(host, /errorBridge\.textContent = message/);
assert.match(host, /errorBridge\.hidden = false/);
assert.match(host, /errorBridge\.hidden = true/);
assert.equal(manifest.validation.nativeWebGpuPixels, 'pending-primary-actual-browser-review');
assert.equal(manifest.validation.adoption, false);
assert.equal(manifest.validation.gameIntegration, 'unimplemented');
assert.equal(manifest.audio.verify, 'hard-zero');
assert.equal(manifest.audio.normal, 'finite-version-sfx-unlock-only-after-user-gesture-and-submission');
assert.deepEqual(embedLoopState(0), { cycle: 0, ageMs: 0, inPauseGap: false });
assert.deepEqual(embedLoopState(1200), { cycle: 0, ageMs: 1200, inPauseGap: true });
assert.deepEqual(embedLoopState(1500), { cycle: 1, ageMs: 0, inPauseGap: false });
assert.notEqual(frameInput(0, 'normal', false, 0).receipt.causeId,
  frameInput(0, 'normal', false, 1).receipt.causeId, 'fresh cause per local replay cycle');
assert.match(fs.readFileSync(path.join(root, 'rpg-e-r1/runtime-preview/index.html'), 'utf8'),
  /new URLSearchParams\(location\.search\)\.has\("embed"\)/, 'embed route is explicit');
console.log(`package closure and provenance passed: ${closure.files.length} files; creative SHA ${manifest.creative.sha256}; native GPU pixels pending`);

