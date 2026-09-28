'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pkg = path.resolve(root, '..', '..', '..', 'astra-heal-sparkle-r1');
const manifest = JSON.parse(fs.readFileSync(path.join(pkg, 'package-files.json'), 'utf8'));
for (const name of ['heal-sparkle.js', 'heal-sparkle-sfx.js']) {
  const listed = manifest.files.find(item => item.path === name);
  assert(listed, `frozen r1 package includes ${name}`);
  const digest = crypto.createHash('sha256').update(fs.readFileSync(path.join(root,
    name === 'heal-sparkle.js' ? 'webgpu-heal-sparkle-r1.js' : 'webgpu-heal-sparkle-r1-sfx.js'))).digest('hex');
  assert.equal(digest, listed.sha256, `${name} remains byte-identical to frozen r1`);
}

const { create } = require('../webgpu-heal-astra-sparkle-r1-game-adapter.js');
const calls = [];
const released = [];
let baseDrawn = true;
const base = { ready: Promise.resolve(), create() { throw Error('injected module should be used'); } };
const basePass = { ready: Promise.resolve(), record(args) {
  calls.push(`base:${args.side}`);
  return baseDrawn ? { drawn: true, eventId: args.planned.id, side: args.side,
    receipt: Object.freeze({ effectId: args.planned.id, ownerId: args.planned.ownerId }) } : { drawn: false };
}, release(id) { released.push(`base:${id}`); }, destroy() { calls.push('base:destroy'); } };
const sparkleModule = { create() { return { ready: Promise.resolve(), record(args) {
  calls.push(`sparkle:${args.side}:${args.planned.id}`); return { drawn: true };
}, release(id) { released.push(`sparkle:${id}`); }, destroy() { calls.push('sparkle:destroy'); } }; } };
const baseModule = { create() { return basePass; } };
const renderer = { device: {} };
const adapter = create({ renderer, baseModule, sparkleModule });
const planned = { id: 'heal-receipt-1', ownerId: 'player-7' };
adapter.reconcile([planned.id]);
const args = { frame: {}, target: 'main', planned, side: 'back' };
const originalReceipt = adapter.record(args);
assert.equal(originalReceipt.eventId, planned.id);
assert.equal(originalReceipt.receipt.ownerId, planned.ownerId);
assert.deepEqual(calls.splice(0), ['base:back', 'sparkle:back:heal-receipt-1']);
adapter.record({ ...args, side: 'front' });
assert.deepEqual(calls.splice(0), ['base:front', 'sparkle:front:heal-receipt-1']);
baseDrawn = false;
assert.equal(adapter.record(args).drawn, false);
assert.deepEqual(calls.splice(0), ['base:back'], 'sparkle requires the base pass to admit the owner event');
adapter.reconcile([]);
assert.deepEqual(released, ['base:heal-receipt-1', 'sparkle:heal-receipt-1']);
adapter.destroy();
assert.deepEqual(calls, ['base:destroy', 'sparkle:destroy']);

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.match(index, /webgpu-heal-sparkle-r1\.js/);
assert.match(index, /webgpu-heal-sparkle-r1-sfx\.js/);
assert.match(index, /webgpu-heal-astra-sparkle-r1-game-adapter\.js/);
assert.match(app, /DvaHealSparkleSfx\.createPlayer/);
assert.match(app, /DvaHealSparkleSfx\.createPlayer\([\s\S]{0,150}syncActorClock: true/);
console.log('PASS: Heal sparkle r1 preserves frozen sources and base receipt while recording both sides, reconciling, and using shared actor-clock SFX');
