import test from 'node:test';
import assert from 'node:assert/strict';
import { captureH64, H64_READBACK_SOURCE, selectH64CaptureShot } from './h64-capture.js';

const shots = [
  { id: 'smg-early', variant: 'smg', age: 0.03, life: 0.2 },
  { id: 'rifle-target', variant: 'rifle', age: 0.081, life: 0.3 },
  { id: 'rifle-late', variant: 'rifle', age: 0.14, life: 0.3 },
  { id: 'expired', variant: 'rifle', age: 0.31, life: 0.3 }
];

test('selects the requested weapon nearest the known active age and excludes expired shots', () => {
  assert.equal(selectH64CaptureShot(shots, 'rifle')?.id, 'rifle-target');
  assert.equal(selectH64CaptureShot(shots, 'rifle', 80, 10)?.id, 'rifle-target');
  assert.equal(selectH64CaptureShot(shots, 'smg', 80, 10), null);
  assert.equal(selectH64CaptureShot(shots, 'rifle', 80, 0), null);
});

test('reads and reports exact weapon, measured age, H64 source and native pixels', async () => {
  const rgba = new Uint8Array(320 * 64 * 4);
  let calls = 0;
  const renderer = { stats: { visibleShots: 1 }, async readPixels() { calls++; return { width: 320, height: 64, rgba }; } };
  const shot = selectH64CaptureShot(shots, 'rifle');
  const report = await captureH64(renderer, shot, {
    variant: 'rifle', background: 'bright', canvasRect: { width: 320, height: 64 }, frame: 144
  });
  assert.equal(calls, 1);
  assert.equal(report.source, H64_READBACK_SOURCE);
  assert.equal(report.weaponId, 'rifle-target');
  assert.equal(report.variant, 'rifle');
  assert.equal(report.ageMs, 81);
  assert.deepEqual(report.h64, { width: 320, height: 64, cssWidth: 320, cssHeight: 64 });
  assert.equal(report.rendererVisibleShots, 1);
  assert.equal(report.rgba, rgba);
});
