import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const runtime = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'outputs/request-20261004/finish-cannon-r16-gallery-candidate-luna-r1/attempt-02/commit-only.git');
const sourceCommit = 'ac7a5abf4ed7e4d5533d5187a00ceee1e2933e95';
const newId = 'donation-card-zero-sol61-r4-startup-idle-repair-r1';

function boot(url) {
  const messages = [], listeners = new Map(), timers = new Map();
  let timerId = 0;
  const parent = { postMessage: data => messages.push(data) };
  const win = {};
  const document = { getElementById: () => null };
  const ctx = {
    URL, location: new URL(url), window: win, parent,
    performance: { now: () => 1 }, document,
    addEventListener: (name, fn) => listeners.set(name, fn),
    clearTimeout: id => timers.delete(id),
    setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    HTMLScriptElement: class {}, console
  };
  vm.runInNewContext(fs.readFileSync(path.join(runtime, 'startup-bootstrap.js'), 'utf8'), ctx, { filename: 'startup-bootstrap.js' });
  return { win, parent, messages, listeners, timers, location: ctx.location };
}

test('gallery-style token, version id, and attempt epoch reach startup snapshots', () => {
  const token = 'candidate-token-abc123';
  const epoch = 17;
  const h = boot(`https://example.test/preview?embed=1&galleryStartupToken=${token}&galleryVersionId=${newId}&galleryAttemptEpoch=${epoch}`);
  const s = h.win.__dvaGalleryStartupSnapshot();
  assert.equal(s.versionId, newId);
  assert.equal(s.token, token);
  assert.equal(s.attemptEpoch, epoch);
  assert.equal(s.mode, 'existing-autoplay');
  assert.equal(h.messages.at(-1).versionId, newId);
});

test('retire message requires exact token, version id, and attempt epoch', () => {
  const token = 'candidate-token-abc123', epoch = 17;
  const h = boot(`https://example.test/preview?embed=1&galleryStartupToken=${token}&galleryVersionId=${newId}&galleryAttemptEpoch=${epoch}`);
  const dispatch = overrides => h.listeners.get('message')({
    origin: 'https://example.test', source: h.parent,
    data: { schema: 'dva-gallery-startup/v1', action: 'retire', token, versionId: newId, attemptEpoch: epoch, ...overrides }
  });
  dispatch({ versionId: 'donation-card-zero-sol61-r4-coin-sparkle' });
  assert.equal(h.win.__dvaGalleryStartup.isActive(), true, 'stale old-version retire rejected');
  dispatch({ attemptEpoch: epoch - 1 });
  assert.equal(h.win.__dvaGalleryStartup.isActive(), true, 'stale attempt retire rejected');
  dispatch({});
  assert.equal(h.win.__dvaGalleryStartup.isActive(), false, 'exact parent retire accepted');
  assert.equal(h.win.__dvaGalleryStartupSnapshot().status, 'cancelled');
});

test('committed gallery parent sets all three child identity guards', () => {
  const { spawnSync } = awaitImportChildProcess();
  const r = spawnSync('git', [`--git-dir=${base}`, 'show', `${sourceCommit}:asset-gallery.js`], { encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  const launch = r.stdout.match(/url\.searchParams\.set\('galleryStartupToken',[^\n]+\n\s*url\.searchParams\.set\('galleryVersionId',[^\n]+\n\s*url\.searchParams\.set\('galleryAttemptEpoch',[^\n]+/);
  assert.ok(launch, 'parent launches child with token, selected version id, and attempt epoch');
  assert.match(launch[0], /galleryStartupToken', token/);
  assert.match(launch[0], /galleryVersionId', item\.id/);
  assert.match(launch[0], /galleryAttemptEpoch', String\(epoch\)/);
});

function awaitImportChildProcess() {
  // Synchronous import is intentionally hidden behind this helper to keep the fixture dependency-free.
  return { spawnSync: process.getBuiltinModule('node:child_process').spawnSync };
}
