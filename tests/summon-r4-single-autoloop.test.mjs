import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { installGalleryAutoplay } from '../public/preparation-summon-green-hierarchy-sol61-r4-single-autoloop-r1/gallery-autoplay.mjs';

class Observer {
  constructor(callback) { this.callback = callback; }
  observe() {}
}

test('automatic replay repeats single-cause only; joint remains explicit', async () => {
  const callbacks = [];
  const single = { clicks: 0, click() { this.clicks += 1; } };
  const joint = { clicks: 0, click() { this.clicks += 1; } };
  const listeners = new Map();
  const doc = { hidden: false, addEventListener(name, fn) { listeners.set(name, fn); } };
  const win = { addEventListener() {} };
  const status = { textContent: 'WebGPU ready' };
  const handle = installGalleryAutoplay({
    query: new URLSearchParams('galleryAutoLoop=1'), status, single, joint,
    cancel: { addEventListener() {} }, documentRef: doc, windowRef: win,
    MutationObserverClass: Observer,
    setTimer(fn) { callbacks.push(fn); return callbacks.length; }, clearTimerFn() {},
    durationMs: 1,
  });
  assert.equal(handle.started, true);
  assert.equal(single.clicks, 1);
  for (let i = 0; i < 3; i++) callbacks.shift()();
  assert.equal(single.clicks, 4);
  assert.equal(joint.clicks, 0);

  const page = await readFile(new URL('../public/preparation-summon-green-hierarchy-sol61-r4-single-autoloop-r1/gallery.html', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../public/preparation-summon-green-hierarchy-sol61-r4-single-autoloop-r1/runtime.mjs', import.meta.url), 'utf8');
  assert.match(page, /id="joint"[^>]*>Play joint three-cause preview/);
  assert.match(runtime, /querySelector\('#joint'\)\.addEventListener\('click'/);
  assert.match(runtime, /fixture-joint-(?:left|center|right)-\$\{suffix\}/);
});

test('automatic replay stays disabled unless the route opts in', () => {
  const handle = installGalleryAutoplay({
    query: new URLSearchParams(), status: { textContent: 'WebGPU ready' },
    single: { click() { assert.fail('must not autoplay'); } }, joint: { click() { assert.fail('must not autoplay'); } },
    cancel: { addEventListener() {} }, documentRef: { hidden: false, addEventListener() {} },
    windowRef: { addEventListener() {} }, MutationObserverClass: Observer,
  });
  assert.equal(handle, null);
});