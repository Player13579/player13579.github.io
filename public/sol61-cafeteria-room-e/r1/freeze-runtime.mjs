import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ownerFiles = ['runtime.mjs', 'index.html', 'embed-test.html', 'sfx.mjs', 'runtime-port-test.mjs', 'gpu-check.mjs', 'freeze-runtime.mjs'];
const deps = JSON.parse(await readFile(resolve(here, 'design-manifest-v2.json'), 'utf8'));
const dependencyFiles = [];
for (const entry of deps.files) {
  const bytes = await readFile(resolve(here, entry.path));
  const actual = sha(bytes);
  if (bytes.length !== entry.bytes || actual !== entry.sha256) {
    throw new Error(`Artist dependency changed: ${entry.path} expected ${entry.bytes}/${entry.sha256}, got ${bytes.length}/${actual}`);
  }
  dependencyFiles.push({ path: entry.path, bytes: bytes.length, sha256: actual });
}
for (const path of ['inputs/public-cafeteria-attempt04.png', 'cafeteria-vent-r1.wav', 'cafeteria-steam-r1.wav', 'cafeteria-purge-r1.wav']) {
  const bytes = await readFile(resolve(here, path));
  dependencyFiles.push({ path, bytes: bytes.length, sha256: sha(bytes) });
}
const runtimeFiles = [];
for (const path of ownerFiles) {
  const bytes = await readFile(resolve(here, path));
  runtimeFiles.push({ path, bytes: bytes.length, sha256: sha(bytes) });
}
const closureFiles = [...dependencyFiles, ...runtimeFiles].sort((a, b) => a.path.localeCompare(b.path));
const closureSha256 = sha(Buffer.from(JSON.stringify(closureFiles)));
const report = {
  id: 'cafeteria-attempt04-room-e-trial-r1-runtime-closure',
  author: 'GPT-6-Luna',
  sourceDesignAuthor: deps.author,
  designManifest: { path: 'design-manifest-v2.json', sha256: sha(await readFile(resolve(here, 'design-manifest-v2.json'))) },
  artistDependencies: dependencyFiles,
  runtimeFiles,
  closure: { fileCount: closureFiles.length, sha256: closureSha256 },
};
await mkdir(resolve(here, 'runtime-evidence'), { recursive: true });
if (process.argv.includes('--audit')) {
  report.status = 'source-closure-audit-only';
  const target = resolve(here, 'runtime-evidence/source-closure-audit.json');
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${target}\n${JSON.stringify({ fileCount: closureFiles.length, closureSha256, artistFiles: dependencyFiles.length - 4 })}`);
  process.exit(0);
}

const gpuPath = resolve(here, 'runtime-evidence/gpu-check-results.json');
const gpu = JSON.parse(await readFile(gpuPath, 'utf8'));
if (gpu.ok !== true || gpu.compileErrors !== 0 || gpu.validationErrors !== 0 || gpu.verify !== true || gpu.verifyAudioContext !== 'not-created') {
  throw new Error('GPU evidence lacks zero-error compiled/submitted verify-silent acceptance');
}
for (const expected of [[980, 620], [465, 430]]) {
  if (!gpu.viewports?.some(v => v.cssWidth === expected[0] && v.cssHeight === expected[1] && v.submittedFrames > 0 && v.phases?.length >= 10 && v.drawCounts?.length === v.phases.length)) {
    throw new Error(`Missing full-room viewport evidence ${expected.join('x')}`);
  }
}
report.status = 'technically-replayable-closure';
report.gpuEvidence = { path: 'runtime-evidence/gpu-check-results.json', sha256: sha(await readFile(gpuPath)), status: 'compile-submit-fit-phase-samples-pass' };
const target = resolve(here, 'runtime-evidence/freeze-runtime.json');
await writeFile(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${target}\n${JSON.stringify({ fileCount: closureFiles.length, closureSha256, gpuEvidence: report.gpuEvidence.sha256 })}`);
