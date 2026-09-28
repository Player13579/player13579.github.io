import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {inspectDesign} from '../scripts/structure-check.mjs';
for(const key of ['A','B'])test(`${key}: B full structures, domains, identities, dependencies and status`,()=>{const d=JSON.parse(fs.readFileSync(new URL(`../design/${key}.B-Expression-2.json`,import.meta.url)));assert.deepEqual(inspectDesign(d),[]);});
test('B rule mapping has unique IDs and real implementation files',()=>{const mapping=JSON.parse(fs.readFileSync(new URL('../docs/B-rule-mapping.json',import.meta.url)));assert.equal(mapping.rules.length,new Set(mapping.rules.map(x=>x.rule_id)).size);for(const r of mapping.rules){for(const x of r.implementation)assert.ok(fs.existsSync(new URL('../'+x.path,import.meta.url)),x.path);assert.equal(r.runtime_visual_status,'not_run');}});
test('runtime has no raster asset/readback/fallback or receipt polling API',()=>{
 const root=new URL('../src/',import.meta.url);const walk=url=>fs.readdirSync(url,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(new URL(x.name+'/',url)):[new URL(x.name,url)]);
 const patterns=[/getContext\s*\(\s*['"](?:2d|webgl2?)['"]/,/\.mapAsync\s*\(/,/copyTextureToBuffer\s*\(/,/readPixels\s*\(/,/getImageData\s*\(/,/createImageBitmap\s*\(/,/\.toDataURL\s*\(/,/new\s+OffscreenCanvas\s*\(/,/setInterval\s*\(/,/\.(?:png|jpe?g|webp|gif)["']/i];
 for(const file of walk(root)){if(!['.mjs','.wgsl'].includes(path.extname(file.pathname)))continue;const source=fs.readFileSync(file,'utf8');for(const pattern of patterns)assert.equal(pattern.test(source),false,`${file.pathname}: ${pattern}`);}
});
test('shaders have native entrypoints and distinct morphology (not compilation)',()=>{
 const a=fs.readFileSync(new URL('../src/effects/reactor/reactor.wgsl',import.meta.url),'utf8'),b=fs.readFileSync(new URL('../src/effects/recycling/recycling.wgsl',import.meta.url),'utf8');
 for(const s of [a,b]){assert.match(s,/@vertex fn vs/);assert.match(s,/@fragment fn fs/);assert.match(s,/var<storage,read>/);assert.match(s,/t>=2\.2/);assert.match(s,/e\.options\.x/);assert.equal((s.match(/{/g)||[]).length,(s.match(/}/g)||[]).length);}
 assert.match(a,/arcPoint/);assert.match(a,/quintic/);assert.doesNotMatch(a,/easeCos/);assert.match(b,/boxSDF/);assert.match(b,/easeCos/);assert.doesNotMatch(b,/quintic/);
});
test('sound code cannot be triggered from render or projection',()=>{for(const f of ['src/gpu/renderer.mjs','src/runtime/projection.mjs']){const s=fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');assert.doesNotMatch(s,/playOnce\s*\(|createBufferSource\s*\(/);}});

test('selected WGSL reserved words are absent outside comments (not compilation)',()=>{
 const words=new Set(['target','filter','active','pass','resource','patch','precision','smooth','layout','self','type','enum']);
 for(const file of ['src/effects/reactor/reactor.wgsl','src/effects/recycling/recycling.wgsl','src/gpu/composite.wgsl','preview/fixture.wgsl']){
  const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\/\/[^\n]*/g,'');
  for(const token of source.match(/\b[A-Za-z_][A-Za-z_0-9]*\b/g)||[])assert.equal(words.has(token),false,`${file}: reserved ${token}`);
 }
});
