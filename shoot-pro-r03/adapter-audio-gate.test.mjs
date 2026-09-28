import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAdapterAudioGate as gateR01 } from '../shoot-pro-r01/adapter-audio-gate.js';
import { createAdapterAudioGate as gateR02 } from '../shoot-pro-r02/adapter-audio-gate.js';
import { createAdapterAudioGate as gateR03 } from './adapter-audio-gate.js';

const variants = [
  ['r0.1', gateR01], ['r0.2', gateR02], ['r0.3', gateR03]
];

for (const [version, createGate] of variants) {
  test(`${version} embed audio waits for a user gesture and enables only a running context`, async () => {
    let calls = 0;
    const gate = createGate({ verify: false, unlock: async () => { calls++; return 'running'; } });
    assert.equal(gate.enabled, false);
    assert.equal(gate.status, 'awaiting-browser-gesture');
    assert.equal(calls, 0);
    assert.equal(await gate.enableFromGesture(), true);
    assert.equal(gate.enabled, true);
    assert.equal(gate.status, 'gesture-unlocked');
    assert.equal(calls, 1);
    assert.equal(await gate.enableFromGesture(), false);
    assert.equal(calls, 1);

    const suspended = createGate({ verify: false, unlock: async () => 'suspended' });
    assert.equal(await suspended.enableFromGesture(), false);
    assert.equal(suspended.enabled, false);
  });

  test(`${version} verify mode never invokes audio unlock`, async () => {
    let calls = 0;
    const gate = createGate({ verify: true, unlock: async () => { calls++; return 'running'; } });
    assert.equal(gate.status, 'verification-muted');
    assert.equal(await gate.enableFromGesture(), false);
    assert.equal(gate.enabled, false);
    assert.equal(calls, 0);
  });
}

test('all adapters wire playback behind the gesture gate and hide the unlock button in verify mode', async () => {
  for (const version of ['r01', 'r02', 'r03']) {
    const source = await readFile(new URL(`../shoot-pro-${version}/adapter.js`, import.meta.url), 'utf8');
    assert.match(source, /new URLSearchParams\(location\.search\)\.has\('verify'\)/, version);
    assert.match(source, /if\(audioGate\.enabled\)audio\.play\(shot,age\)/, version);
    assert.match(source, /audioButton\.addEventListener\('click'/, version);
    assert.match(source, /if\(verifyMode\)audioButton\.hidden=true/, version);
  }
});
