import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const pagesRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repoRoot=path.resolve(pagesRoot,'..','..','..','..','..');
const gallery=fs.readFileSync(path.join(pagesRoot,'asset-gallery.js'),'utf8');
const specs=[
 {id:'stamina-sol61-r8',group:'stamina-astra',source:'outputs/request-20260930/sol61-stamina-e/r8',dest:'public/sol61-stamina-e/r8',manifest:'manifest.json',files:['index.html','design.mjs','shader.mjs','runtime.mjs','audio-coordinator.mjs','body.png']},
 {id:'mana-zero-sol61-r4',group:'mana-astra',source:'outputs/request-20260930/sol61-mana-zero/r1/versions/r4',dest:'public/sol61-mana-zero/r4',manifest:'manifest.json',files:['preview.html','preview.mjs','effect.mjs','sfx.mjs','effect.wgsl','assets/sophia-front-five-v753.png']},
 {id:'cooldown-sol61-shortening-zero',group:'cooldown-astra',source:'outputs/request-20260930/sol61-cooldown-zero-r5/shortening-zero',dest:'public/sol61-cooldown-zero-r5/shortening-zero',manifest:'manifest.json',files:['index.html','runtime.mjs','design.mjs','shader.mjs','sfx.mjs','body.png']}
];
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
test('frozen Sol histories remain present, truthful, and source-manifest byte identical',()=>{
 for(const s of specs){
   const start=gallery.indexOf(`id: '${s.group}'`);
   const end=gallery.indexOf(']) }),',start);
   const block=gallery.slice(start,end);
   assert(block.indexOf(`version('${s.id}'`)>-1,`${s.id} is in ${s.group}`);
   assert.equal(block.split(`version('${s.id}'`).length-1,1,`${s.id} has exactly one catalog entry`);
   const entry=s.id==='stamina-sol61-r8'?'index.html':s.id==='mana-zero-sol61-r4'?'preview.html':'index.html';
   assert.ok(block.includes(`'${s.dest}/${entry}`),`${s.id} points to its copied public entry`);
   const sourceRoot=path.join(repoRoot,s.source),destRoot=path.join(pagesRoot,s.dest),manifestBytes=fs.readFileSync(path.join(sourceRoot,s.manifest));
   assert.ok(manifestBytes.length>0);
   const manifest=JSON.parse(manifestBytes),expectedManifest=JSON.parse(fs.readFileSync(path.join(sourceRoot,s.manifest),'utf8'));
   for(const rel of s.files){
     const expected=Array.isArray(manifest.files)?manifest.files.find(x=>x.path===rel)?.sha256:(manifest.hashes?.[rel]??manifest.files?.[rel]?.sha256??manifest.files?.[rel]);
     assert.ok(expected,`${s.id} manifest includes ${rel}`);
     const src=fs.readFileSync(path.join(sourceRoot,rel)),published=fs.readFileSync(path.join(destRoot,rel));
     assert.equal(sha(src),expected,`${s.id} source hash ${rel}`);assert.equal(sha(published),expected,`${s.id} public hash ${rel}`);
   }
   assert.ok(expectedManifest);
 }
 const staminaStart=gallery.indexOf("id: 'stamina-astra'");
 const staminaEnd=gallery.indexOf(']) }),',staminaStart);
 const staminaBlock=gallery.slice(staminaStart,staminaEnd);
 assert.match(staminaBlock,/defaultVersionId: 'stamina-sol61-r11'/,'the currently adopted r11 remains the default; historical r8 is not required to be newest');
});
test('catalog retains all five previously staged histories and excludes unexecuted semantic rejection',()=>{
 for(const id of ['stamina-sol61-r7','mana-zero-sol61-r2','mana-zero-sol61-r3','cooldown-sol61-r5-attempt-1','cooldown-sol61-r5-attempt-2'])assert.ok(gallery.includes(`version('${id}'`),`${id} remains listed`);
 for(const id of ['stamina-sol61-r8','stamina-sol61-r7','mana-zero-sol61-r4','mana-zero-sol61-r3','mana-zero-sol61-r2','cooldown-sol61-shortening-zero','cooldown-sol61-r5-attempt-1','cooldown-sol61-r5-attempt-2']){
   const match=gallery.match(new RegExp(`version\\('${id}', '[^']+', '([^']+)', '([^']+)'`));assert(match,`${id} entry is parseable`);
   for(const relative of [match[1],match[2]])assert(fs.existsSync(path.join(pagesRoot,relative.split('?')[0])),`${id} dependency ${relative} exists`);
 }
 assert.doesNotMatch(gallery,/cooldown-sol61-r5-attempt-3/);
 assert.match(gallery,/old «幾何|旧「幾何学的圧縮」/);
 assert.match(gallery,/title: '待機時間短縮'/);
});
test('new previews retain own-dimension framing and cache query is bumped',()=>{
 assert.match(gallery,/'stamina-sol61-r8': \{ magnification: 240 \/ \(64 \* \(530 \/ 260\)\), focusX: 490, focusY: 310 \}/);
 assert.match(gallery,/'mana-zero-sol61-r4': \{ magnification: 240 \/ 64, focusX: 490, focusY: 310 \}/);
 assert.match(gallery,/'cooldown-sol61-shortening-zero': \{ magnification: 240 \/ 64, focusX: 490, focusY: 310 \}/);
 const html=fs.readFileSync(path.join(pagesRoot,'webgpu-e-gallery.html'),'utf8');
 const cacheRevision=html.match(/asset-gallery\.js\?v=([^'"\s]+)/)?.[1];
 assert.ok(cacheRevision, 'gallery script URL carries a non-empty cache revision');
 assert.match(cacheRevision,/medical-r7-r47/, 'cache revision tracks the medical r7 gallery release');
 assert.match(gallery,/medical-r4-original-environment-r5/, 'the cache revision corresponds to a catalog containing the medical r5 registration');
});
