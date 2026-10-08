import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {VERSION_ID} from '../cause.mjs';
import {GLINT_SITES,GLINT_OPTICS as O,glintAt} from '../glints.mjs';
import {WORLD_WGSL,PRESENT_WGSL} from '../shader.mjs';
import {makeFixture} from '../fixture.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
test('expands only the five registered anchors into 25 distinct support sites',()=>{
  assert.equal(GLINT_SITES.length,25);
  assert.equal(new Set(GLINT_SITES.map(s=>`${s.x},${s.y}`)).size,25);
  for(const role of ['foot-fixation','dress-fixation','sleeve-fixation','torso-fixation','crown-fixation'])
    assert.equal(GLINT_SITES.filter(s=>s.anchorRole===role).length,5);
  assert.match(WORLD_WGSL,/array<vec3f,25>/);
  assert.match(PRESENT_WGSL,/array<vec3f,25>/);
  assert.match(WORLD_WGSL,/i<25u/);
  assert.match(PRESENT_WGSL,/i<25u/);
  assert.match(WORLD_WGSL,/if pulse>0\./);
  assert.match(PRESENT_WGSL,/if any\(flux>vec3f\(0\.\)\)/);
});
test('every point samples alpha above 0.85 in the immutable original sprite',async()=>{
  const placements=JSON.parse(await readFile(path.join(root,'SITE-PLACEMENT.json'),'utf8')).sites;
  assert.deepEqual(GLINT_SITES.map(s=>({x:s.x,y:s.y,staggerMs:s.staggerMs})),placements.map(s=>({x:s.x,y:s.y,staggerMs:s.staggerMs})));
  const result=spawnSync('python',['tests/check-original-alpha.py'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const alpha=JSON.parse(result.stdout);
  assert.equal(alpha.count,25); assert.equal(alpha.distinct,25); assert.equal(alpha.supported,true);
  assert.ok(alpha.minimumAlpha>.85);
});
test('reduces glint dimensions while retaining the fixed 17 degree axis and energy',()=>{
  assert.ok(O.sourceRadiusH64<.72);
  assert.ok(O.rayLengthH64<5.6);
  assert.ok(O.secondaryRayLengthH64<4.2);
  assert.ok(O.rayWidthH64<.38);
  assert.equal(O.sourceRadiance,7.5); assert.equal(O.rayGain,1.9);
  assert.ok(Math.abs(O.angleRadians-17*Math.PI/180)<1e-12);
});
test('staggered pulses preserve arrival gates and all visibility/source controls',()=>{
  for(let i=0;i<GLINT_SITES.length;i++){
    const site=GLINT_SITES[i];
    assert.equal(site.staggerMs,[0,11,22,33,44][site.subsite]);
    const {arrivalMs}=glintAt({index:i,phaseMs:0});
    const start=arrivalMs+O.beginAfterArrivalMs+site.staggerMs;
    assert.equal(glintAt({index:i,phaseMs:start-0.01}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:start+O.riseMs/2}).flux>0,true);
    assert.equal(glintAt({index:i,phaseMs:start+O.riseMs/2,sourceEnabled:false}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:start+O.riseMs/2,glintsEnabled:false}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:start+O.riseMs/2,targetVisible:false}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:start+O.riseMs/2,sourceActive:false}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:arrivalMs+site.staggerMs+O.endAfterArrivalMs}).flux,0);
    assert.equal(glintAt({index:i,phaseMs:1200}).flux,0);
  }
});
test('bounds simultaneous active fixation glints',()=>{
  let max=0,at=[];
  for(let phase=0;phase<1200;phase+=.25){
    let n=0;for(let i=0;i<GLINT_SITES.length;i++)if(glintAt({index:i,phaseMs:phase}).flux>0)n++;
    if(n>max){max=n;at=[phase];}else if(n===max)at.push(phase);
  }
  assert.ok(max<=10,`measured ${max} concurrent sites at ${at.slice(0,8).join(',')}ms`);
  process.stdout.write(`MAX_CONCURRENT_ACTIVE_GLINTS=${max}\n`);
});
test('preserves the existing native fixture H48/H64/H128 contract',()=>{
  for(const height of [48,64,128])assert.equal(makeFixture({height}).sprite.scale,height/225);
  assert.throws(()=>makeFixture({height:96}),/H48\/H64\/H128/);
});
test('binds the local gallery shell and preview labels to R6',async()=>{
  const gallery=await readFile(path.join(root,'gallery.html'),'utf8');
  const index=await readFile(path.join(root,'index.html'),'utf8');
  assert.equal(VERSION_ID,'human-transmutation-sol61-r6');
  assert.match(gallery,/const versionId='human-transmutation-sol61-r6'/);
  assert.match(gallery,/const currentOwner='human-transmutation-sol61-r6'/);
  assert.match(gallery,/new URL\('\.\/index\.html',location\.href\)/);
  assert.match(index,/GPT-6\.1-Sol r6/);
  assert.doesNotMatch(gallery,/sol61-r5|R5/);
  assert.doesNotMatch(index,/sol61-r5|R5/);
});
test('package manifest pins the actual R6 closure and has no stale prior default',async()=>{
  const manifest=JSON.parse(await readFile(path.join(root,'package-manifest.json'),'utf8'));
  assert.equal(manifest.versionId,'human-transmutation-sol61-r6');
  assert.equal(manifest.defaultVersionId,'human-transmutation-sol61-r6');
  assert.match(manifest.runtime.normalCatalogURL,/galleryVersionId=human-transmutation-sol61-r6/);
  assert.ok(!manifest.runtime.normalCatalogURL.includes('r5'));
  for(const rel of manifest.runtime.runtimeClosure)assert.ok(manifest.files.some(f=>f.path===rel),`closure entry not pinned: ${rel}`);
  for(const f of manifest.files){
    const bytes=await readFile(path.join(root,f.path));
    assert.equal(bytes.length,f.bytes,`byte length mismatch: ${f.path}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,`hash mismatch: ${f.path}`);
  }
});
