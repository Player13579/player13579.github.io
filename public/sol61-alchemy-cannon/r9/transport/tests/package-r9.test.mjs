import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=rel=>fs.readFileSync(path.join(root,...rel.split('/')));
const json=rel=>JSON.parse(read(rel));
const captured=n=>JSON.parse(JSON.parse(read(`native-root/${n}.json`).toString('utf8')).result.value);

test('source binding pins only copied bytes and preserves unsealed producer status',()=>{
 const binding=json('SOURCE-FREEZE.json');assert.equal(binding.bindingStatus,'copied source bytes are hash-pinned for this transport package; this does NOT assert the producer folder was sealed/frozen');
 assert.equal(binding.producerInput.status,'unsealed creative draft at time of copy');
 const listed=binding.files.map(x=>x.route).sort(),actual=[];
 const walk=d=>{for(const e of fs.readdirSync(path.join(root,d),{withFileTypes:true})){const rel=`${d}/${e.name}`;if(e.isDirectory())walk(rel);else actual.push(rel);}};walk('source-binding/creative-draft');assert.deepEqual(actual.sort(),listed);
 for(const f of binding.files){const b=read(f.route);assert.equal(b.length,f.bytes,f.route);assert.equal(sha(b),f.sha256,f.route);}
 assert.equal(binding.files.find(x=>x.route.endsWith('/effect.mjs')).sha256,binding.producerHashesSupplied.effect);
 assert.equal(binding.files.find(x=>x.route.endsWith('/audio.mjs')).sha256,binding.producerHashesSupplied.audio);
 const copy=json('SOURCE-COPY-VERIFICATION.json');assert.equal(copy.checkedAgainstCurrentProducerDraft,true);assert.equal(copy.files.length,binding.files.length);assert(copy.files.every(x=>x.match));
});

test('nested faithful runtime seal, source pins, package tests, and route hashes remain intact',()=>{
 const dir='runtime/runtime-r9',seal=json(`${dir}/RUNTIME-SEAL.json`),manifest=json(`${dir}/PACKAGE-MANIFEST.json`),pins=json(`${dir}/SOURCE-PINS.json`),routes=json(`${dir}/ROUTE-PINS.json`);
 assert.equal(manifest.sourceStatus,'unsealed-draft');assert.equal(manifest.tests.runtimeFocused,'7/7');
 assert.equal(manifest.native.quality,'pending/not accepted');
 for(const f of seal.files){const b=read(`${dir}/${f.route}`);assert.equal(b.length,f.bytes,f.route);assert.equal(sha(b),f.sha256,f.route);}
 assert.equal(sha(read(`${dir}/RUNTIME-SEAL.json`)),manifest.runtimeSealSha256);
 assert.equal(pins.source.effect.sha256,'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd');
 assert.equal(pins.source.shaderExport.sha256,'851ae4cf391b90b2b3a6f05fccc06a91cfa0327dfb06896a10bea8a36d4b8eb3');
 assert.equal(pins.source.audio.sha256,'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
 assert.deepEqual(routes.routes.map(x=>x.route).sort(),['audio.mjs','effect.mjs','gallery.html','main.mjs'].sort());
});

test('root-captured native proof bytes bind completed ON/OFF same-cause 220 and expiry 420',()=>{
 const bound=json('NATIVE-PROOF-BOUND.json'),[on,off,expiry]=bound.captures;
 for(const c of bound.captures){for(const rel of [c.json,c.image]){const b=read(rel);assert.equal(sha(b),rel===c.json?c.jsonSha256:c.imageSha256,rel);}}
 assert.equal(on.native.completed,true);assert.equal(off.native.completed,true);assert.equal(expiry.native.completed,true);
 assert.equal(on.native.causeId,off.native.causeId);assert.equal(on.native.eventId,off.native.eventId);assert.equal(on.native.frameId,off.native.frameId);
 assert.equal(on.native.sequence,1);assert.equal(off.native.sequence,2);assert.equal(expiry.native.sequence,3);
 assert.equal(on.native.observation,true);assert.equal(off.native.observation,false);
 assert.equal(on.native.queueError,null);assert.equal(off.native.queueError,null);assert.equal(expiry.native.queueError,null);
 assert.equal(expiry.native.requestedAgeMs,420);assert.equal(expiry.native.activeEventCount,0);assert.equal(expiry.native.beamVertexCount,0);
 assert.equal(bound.expiry.totalFixtureVertexCount,72);assert.equal(expiry.native.sourceEnabled,true);
 for(const n of ['on220','off220','expiry420']){const proof=captured(n).nativePulseProof;assert.equal(proof.completed,true);assert.equal(proof.queue.error,null);assert.equal(proof.versionId,'alchemy-cannon-sol61-r9');}
});

test('Sol quality decision is pinned and limits remain explicit',()=>{
 const status=json('QUALITY-STATUS.json'),decision=read(status.decisionFile);
 assert.equal(status.qualityStatus,'not_accepted');assert.equal(sha(decision),status.decisionFileSha256);
 assert(status.notEstablished.includes('continuous transport/full 0-420ms perceptual quality'));
 assert(status.notEstablished.includes('normal SFX listening'));
 assert(status.notEstablished.includes('main-game integration'));
});

