import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const seal=JSON.parse(fs.readFileSync(path.join(root,'RUNTIME-SEAL.json'),'utf8'));
for(const entry of seal.files){const b=fs.readFileSync(path.join(root,...entry.route.split('/')));assert.equal(b.length,entry.bytes,`${entry.route} length`);assert.equal(sha(b),entry.sha256,`${entry.route} sha256`);}
const pins=JSON.parse(fs.readFileSync(path.join(root,'ROUTE-PINS.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(root,'SOURCE-PINS.json'),'utf8'));
assert.equal(source.source.effect.sha256,'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd');
assert.equal(source.source.shaderExport.sha256,'851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3');
assert.equal(source.source.audio.sha256,'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
assert.equal(pins.routes.length,4);assert.deepEqual(pins.routes.map(x=>x.route).sort(),['audio.mjs','effect.mjs','gallery.html','main.mjs'].sort());
const manifest=JSON.parse(fs.readFileSync(path.join(root,'PACKAGE-MANIFEST.json'),'utf8'));
assert.equal(manifest.sourceStatus,'unsealed-draft');assert.equal(manifest.tests.runtimeFocused,'7/7');
assert.equal(manifest.native.quality,'pending/not accepted');
console.log(JSON.stringify({status:'pass',sealedFiles:seal.files.length,onlyAllowedPreviewRoutes:pins.routes.map(x=>x.route),sourceBoundary:manifest.sourceStatus,quality:manifest.native.quality}));
