import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { EXPECTED_CREATIVE_SHA256, EXPECTED_CREATIVE_VERSION, assertCreativeModuleIntegrity } from './preview-host.mjs';
import { VERSION } from '../rpg-e.mjs';
const modulePath = new URL('../rpg-e.mjs', import.meta.url);
const bytes = fs.readFileSync(modulePath);
assert.equal(VERSION, 'sol-rpg-heavy-quality-r6');
assert.equal(VERSION, EXPECTED_CREATIVE_VERSION);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), EXPECTED_CREATIVE_SHA256);
const originalFetch = globalThis.fetch;
try {
  let requested;
  globalThis.fetch = async (url, options) => {
    requested = { url: String(url), options };
    return new Response(bytes, { status: 200 });
  };
  assert.deepEqual(await assertCreativeModuleIntegrity(), { version: VERSION, sha256: EXPECTED_CREATIVE_SHA256 });
  assert.equal(requested.url, modulePath.href);
  assert.equal(requested.options.cache, 'no-store');
  globalThis.fetch = async () => new Response(Buffer.from('tampered module'), { status: 200 });
  await assert.rejects(assertCreativeModuleIntegrity(), /SHA-256 mismatch/);
} finally { globalThis.fetch = originalFetch; }
const host = fs.readFileSync(new URL('./preview-host.mjs', import.meta.url), 'utf8');
const gate = host.indexOf('await assertCreativeModuleIntegrity();');
const adapter = host.indexOf('navigator.gpu.requestAdapter()');
assert(gate >= 0 && gate < adapter, 'module integrity must gate WebGPU adapter initialization');
console.log('R6 runtime integrity: pass (exact bytes, version, no-store fetch, tamper rejection, startup ordering)');
