import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const packageManifest=JSON.parse(fs.readFileSync(path.join(root,'package-manifest.json'),'utf8'));
for(const [p,v] of Object.entries(packageManifest.files)){const q=path.join(root,p);assert.ok(fs.existsSync(q),`manifest file missing: ${p}`);assert.equal(fs.statSync(q).size,v.bytes,`size mismatch: ${p}`);assert.equal(hash(p),v.sha256,`package hash mismatch: ${p}`);}
const freeze=JSON.parse(fs.readFileSync(path.join(root,'design-manifest.json'),'utf8'));
for(const [p,h] of Object.entries(freeze.files)) assert.equal(hash(p),h,`frozen original mismatch: ${p}`);
assert.equal(hash('runtime.mjs'),'8f427e783340a1cb8e2e1d54609c6054a263d251c33a1963787dbef64347cb0f');
assert.equal(hash('contracts/b-contract.json'),'bd33f7961d654a7f45af02d78ad257f72d691bd6b7f3912ede5b23486a388e69');
const executable=['runtime.mjs','sfx-controller.mjs','design.mjs','projection.mjs','input-state.mjs','world-shader.mjs','post-shader.mjs','field-model.mjs','sfx-score.mjs','gallery-clock.mjs'];
const local=[]; for(const f of executable){const s=fs.readFileSync(path.join(root,f),'utf8');for(const m of s.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)){const spec=m[1];if(spec.startsWith('.')){const q=path.resolve(root,path.dirname(f),spec);assert.ok(q.startsWith(root+path.sep));assert.ok(fs.existsSync(q),`missing local dependency ${f} -> ${spec}`);local.push(`${f} -> ${spec}`);}else if(!spec.startsWith('node:'))throw Error(`unresolved nonlocal dependency ${f}: ${spec}`);}}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(html.includes("searchParams.has('verify')"));assert.match(html,/from '\.\/runtime\.mjs'/);assert.match(html,/fetch\('\.\/capture'/);
for(const f of ['body.png','barrier-create-r8.wav','barrier-hit-r8.wav','barrier-break-r8.wav'])assert.ok(fs.existsSync(path.join(root,f)),`missing runtime asset ${f}`);
for(const f of executable.concat(['index.html','embed-test.html']))assert.doesNotMatch(fs.readFileSync(path.join(root,f),'utf8'),/https?:\/\/(?!127\.0\.0\.1)/,`remote runtime dependency in ${f}`);
console.log(JSON.stringify({status:'pass',edition:'r8-fidelityfix-a1',artistFiles:Object.keys(freeze.files).length,artistFreeze:'pass',runtimeSha256:hash('runtime.mjs'),correctedContractSha256:hash('contracts/b-contract.json'),localImportEdges:local,requiredAssets:['body.png','barrier-create-r8.wav','barrier-hit-r8.wav','barrier-break-r8.wav'],remoteRuntimeDependencies:0},null,2));
