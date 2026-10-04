import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=rel=>fs.readFileSync(path.join(root,...rel.split('/'))),json=rel=>JSON.parse(read(rel));
const seal=json('PACKAGE-SEAL.json'),manifest=json('PACKAGE-MANIFEST.json');
assert.equal(seal.schema,'dva-cannon-r9-transport-package-seal/v1');
assert.deepEqual(seal.excludedFromSelfHash,['PACKAGE-SEAL.json','PACKAGE-MANIFEST.json']);
for(const f of seal.files){const b=read(f.route);assert.equal(b.length,f.bytes,`${f.route} length`);assert.equal(sha(b),f.sha256,`${f.route} sha256`);}
assert.equal(sha(read('PACKAGE-SEAL.json')),manifest.packageSealSha256);
assert.equal(manifest.sourceStatus,'copied-draft-bytes-pinned; producer input remains unsealed');
assert.equal(manifest.qualityStatus,'not_accepted');
assert.equal(manifest.tests.packageFocused,'4/4');
console.log(JSON.stringify({status:'pass',sealedFileCount:seal.files.length,excluded:seal.excludedFromSelfHash,quality:manifest.qualityStatus}));
