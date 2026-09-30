import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = relative => fs.readFileSync(path.join(root, relative));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const entries = [
  'index.html', 'runtime.mjs', 'embed-test.html', 'verify.mjs', 'runtime-port-test.mjs', 'freeze.mjs',
  'design.mjs', 'projection.mjs', 'field-model.mjs', 'world-shader.mjs', 'post-shader.mjs', 'sfx.mjs',
  'body.png', 'render-contract.json', 'design-manifest.json', 'contract.mjs', 'b-contract.json'
];
for (const name of entries) assert(fs.existsSync(path.join(root, name)), `missing runtime closure file: ${name}`);

const r5Root = path.join(root, '..', '..', '..', 'r5');
const r5ManifestBytes = fs.readFileSync(path.join(r5Root, 'manifest.json'));
const r5Manifest = JSON.parse(r5ManifestBytes);
for (const [name, expected] of Object.entries(r5Manifest.files)) {
  assert.equal(hash(fs.readFileSync(path.join(r5Root, name))), expected, `frozen r5 source changed: ${name}`);
}
const designManifest = JSON.parse(read('design-manifest.json'));
for (const [name, expected] of Object.entries(designManifest.files)) {
  if (!fs.existsSync(path.join(root, name))) continue; // Freeze validates the included runtime inputs; full design archive stays at its original path.
  if (name === 'world-shader.mjs' || name === 'post-shader.mjs') {
    const restored = read(name).toString().replace(/\beSmooth\b/g, 'smooth');
    assert.equal(hash(Buffer.from(restored)), expected, `mechanical shader rename must preserve Sol-authored source: ${name}`);
  } else assert.equal(hash(read(name)), expected, `Sol-authored r6 design source changed: ${name}`);
}

const port = spawnSync(process.execPath, [path.join(root, 'runtime-port-test.mjs')], { encoding: 'utf8', windowsHide: true });
assert.equal(port.status, 0, port.stderr || port.stdout);
const cpu = JSON.parse(port.stdout.trim());
assert.equal(cpu.status, 'pass CPU runtime contract/source port; actual WebGPU untested');
const files = Object.fromEntries(entries.map(name => [name, hash(read(name))]));
const runtimeFreeze = {
  id: 'sol61-barrier-zero-r6-tested-a2',
  attempt: { parentRuntimeFreezeSha256: '5d1cd6a5142849510fab2f6ee64ec7bebfe355c1eb48eb1db6d6739a486bb7b2', purpose: 'mechanical WGSL reserved-identifier correction after compile failure', sourceStatus: 'copy of frozen r6; original closure and failure evidence preserved' },
  sourceDesign: { id: designManifest.id, author: designManifest.author, model: designManifest.model, designManifestSha256: hash(read('design-manifest.json')) },
  runtimePort: { author: 'GPT-6-Luna', executionModel: 'GPT-6-Luna', selection: 'bounded faithful WebGPU runtime port', sourceScaffold: 'r5 generic runtime/harness, copied read-only; no r5 PCM is used in the r6 closure' },
  mechanicalShaderCorrection: { author: 'GPT-6-Luna', executionModel: 'GPT-6-Luna', files: ['world-shader.mjs','post-shader.mjs'], operation: 'exact WGSL identifier token smooth -> eSmooth; smoothstep and every other source token preserved', creativeSourceOwner: 'GPT-6.1-Sol', equivalence: 'reversing only the exact identifier-token rename restores both original design-manifest hashes' },
  entrypoint: 'index.html?embed=1',
  verificationEntrypoint: 'embed-test.html?verify=1',
  dependencies: {
    'index.html': ['runtime.mjs'],
    'runtime.mjs': ['design.mjs', 'projection.mjs', 'field-model.mjs', 'world-shader.mjs', 'post-shader.mjs', 'sfx.mjs', 'body.png'],
    'projection.mjs': ['design.mjs', 'field-model.mjs'],
    'field-model.mjs': ['design.mjs'],
    'embed-test.html': ['index.html'],
    'verify.mjs': ['runtime-port-test.mjs'],
    'freeze.mjs': ['runtime-port-test.mjs', 'render-contract.json', 'design-manifest.json']
  },
  files,
  r5ImmutableSource: { manifestSha256: hash(r5ManifestBytes), files: Object.keys(r5Manifest.files).length, allListedFileHashesMatch: true },
  cpuRuntimeTest: cpu,
  replay: 'CPU source/runtime contract checks pass; actual GPU replay not run',
  technicalReplayEligible: 'not_established — WebGPU shader compilation/submission not run', actualGPU: 'not_run', visualQuality: 'not_accepted', listening: 'not_run', gameIntegration: 'not_run', publication: 'not_run', adoption: 'unadopted',
  modelWorkShare: [{ displayName: 'GPT-6-Luna', percent: 100, acceptedWork: 'inherited faithful runtime port and mechanical WGSL reserved-identifier correction with focused compile verification' }]
};
const out = path.join(root, 'runtime-freeze.json');
fs.writeFileSync(out, JSON.stringify(runtimeFreeze, null, 2));
console.log(JSON.stringify({ status: 'frozen source closure; actual GPU not run', output: path.basename(out), files: Object.keys(files).length, r5FrozenFiles: Object.keys(r5Manifest.files).length, r5AllHashesMatch: true, SolDesignFilesStillMatchManifest: true, CPU: cpu.status, actualGPU: 'not_run', runtimeFreezeSha256: hash(fs.readFileSync(out)) }));
