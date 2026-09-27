import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const expected = [
  { file: 'luck-e.mjs', sha256: '1bffc09b0281e365ab1686495212e7b11b152c1ca1fd892e07f583031fce55f5', tests: 28 },
  { file: 'luck-e-revision.mjs', sha256: 'bb2ed5dd4840d72dea05cf3b1f2a26f544b3add09fab0b960a9df74a45619c29', tests: 39 }
];

test('version sources are byte-identical to the Pro deliveries and pass their CPU/mock contracts', async () => {
  for (const item of expected) {
    const bytes = await readFile(path.join(root, item.file));
    assert.equal(bytes.length, item.file === 'luck-e.mjs' ? 139251 : 164536, item.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.file);
    const mod = await import(`./${item.file}`);
    const result = await mod.runSelfTests();
    assert.equal(result.passed, item.tests, item.file);
    assert.equal(result.failed, 0, item.file);
    assert.match(result.kind, /CPU\/static\/mock only; not actual GPU or listening/);
  }
});

test('harness exposes both exact versions through query-selected WebGPU-only routes', async () => {
  const harnessPath = path.join(root, 'luck-gpu-harness.html');
  const harnessBytes = await readFile(harnessPath);
  assert.equal(createHash('sha256').update(harnessBytes).digest('hex'), 'bbc5cb876e41782e44300a582bc4e7e9bb7b3e3d34935c0c803560ef801baa17');
  const html = harnessBytes.toString('utf8');
  assert.match(html, /legacy:\s*'\.\/luck-e\.mjs'/);
  assert.match(html, /revision:\s*'\.\/luck-e-revision\.mjs'/);
  assert.match(html, /candidate=|get\('candidate'\)/);
  assert.match(html, /canvas\.getContext\('webgpu'\)/);
  assert.doesNotMatch(html, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D|OffscreenCanvas/);
  const [legacy, revision] = await Promise.all([
    readFile(path.join(root, 'luck-e.mjs'), 'utf8'),
    readFile(path.join(root, 'luck-e-revision.mjs'), 'utf8')
  ]);
  assert.doesNotMatch(`${legacy}\n${revision}`, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D|OffscreenCanvas/);
});

test('gallery preview routes are clean auto-loop WebGPU entry points bound to exact Pro files', async () => {
  for (const [route, source, label] of [
    ['luck-pro-r01.html', './luck-e.mjs', 'Luck Pro r0.1'],
    ['luck-pro-r02.html', './luck-e-revision.mjs', 'Luck Pro r0.2']
  ]) {
    const html = await readFile(path.join(root, route), 'utf8');
    assert.match(html, new RegExp(`import \\* as module from '${source.replaceAll('.', '\\.')}'`));
    assert.match(html, /mountLuckLoop/);
    assert.match(html, new RegExp(label.replaceAll('.', '\\.')));
    assert.match(html, /<canvas width="980" height="620"/);
    assert.doesNotMatch(html, /<button|<select|<pre|<h1|<p\b/);
    assert.doesNotMatch(html, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D|OffscreenCanvas/);
  }
  const runtime = await readFile(path.join(root, 'gallery-loop.mjs'), 'utf8');
  assert.match(runtime, /requestAnimationFrame\(render\)/);
  assert.match(runtime, /canvas\.getContext\('webgpu'\)/);
  assert.match(runtime, /benefit-acquired/);
  assert.match(runtime, /luck-gallery-event-\$\{sequence\}/);
  assert.doesNotMatch(runtime, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D|OffscreenCanvas|AudioContext/);
});

