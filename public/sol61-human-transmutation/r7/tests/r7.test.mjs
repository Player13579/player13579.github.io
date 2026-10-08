import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLINT_SITES as S,GLINT_OPTICS as O,glintAt,rayPSF} from '../glints.mjs';
import {WORLD_WGSL,PRESENT_WGSL} from '../shader.mjs';
import {materialHandoffAt} from '../handoff-state.mjs';
import {VERSION_ID} from '../cause.mjs';
import {makeFixture} from '../fixture.mjs';
const read=async name=>readFile(new URL('../'+name,import.meta.url));
test('spatially dispersed opaque-site layout replaces clusters',async()=>{
 const sites=JSON.parse(await read('SITE-PLACEMENT.json')).sites;
 assert.deepEqual(S,sites);assert.ok(S.length>25);
 assert.equal(new Set(S.map(s=>s.y)).size,15);
 for(let i=0;i<S.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(S[i].x-S[j].x,S[i].y-S[j].y)>=12);
 assert.match(WORLD_WGSL,new RegExp(`array<vec3f,${S.length}>`));
 assert.match(PRESENT_WGSL,new RegExp(`i<${S.length}u`));
});
test('every pulse starts after its exact material is fully fixed; all controls gate',()=>{
 for(let index=0;index<S.length;index++){
  const a=glintAt({index,phaseMs:0}).arrivalMs;
  const start=a+S[index].staggerMs+O.beginAfterArrivalMs;
  assert.equal(glintAt({index,phaseMs:start}).flux,0);
  const phaseMs=start+O.riseMs;
  assert.equal(materialHandoffAt({rowY:(S[index].y-16)/225,phaseMs}).fixed,1);
  assert.ok(glintAt({index,phaseMs}).flux>0);
  for(const key of ['sourceEnabled','glintsEnabled','targetVisible','sourceActive'])assert.equal(glintAt({index,phaseMs,[key]:false}).flux,0);
  assert.equal(glintAt({index,phaseMs,sourceAlpha:0}).flux,0);
  assert.equal(glintAt({index,phaseMs:a+S[index].staggerMs+O.endAfterArrivalMs}).flux,0);
  assert.equal(glintAt({index,phaseMs:1200}).flux,0);
 }
});
test('fine continuous fixed-axis PSF and pixel integral keep source causality',()=>{
 assert.equal(O.rayLengthH64,1.75);assert.equal(O.sourceRadiusH64,.5);
 assert.equal(O.angleRadians,17*Math.PI/180);
 assert.ok(rayPSF({dx:0,dy:0})>rayPSF({dx:10,dy:0}));
 assert.equal(rayPSF({dx:.2,dy:.3}),rayPSF({dx:-.2,dy:-.3}));
 assert.match(WORLD_WGSL,/pixelIntegral=radius\*radius\/\(filteredRadius\*filteredRadius\)/);
 assert.match(WORLD_WGSL,/sourceAlpha\*coverage\*pixelIntegral/);
 assert.match(PRESENT_WGSL,/textureSampleLevel\(glints,linearSampler,sourceUV,0\.\)/);
});
test('more spatial and temporal coverage is a CPU fact, not visible acceptance',()=>{
 let max=0;const phases={};
 for(let t=0;t<1200;t+=.5){const n=S.filter((_,index)=>glintAt({index,phaseMs:t}).flux>0).length;max=Math.max(max,n);}
 for(const t of [450,650,850,1050])phases[t]=S.filter((_,index)=>glintAt({index,phaseMs:t}).flux>0).length;
 assert.ok(max>9);assert.ok(max<32);
 assert.ok(phases[450]>9);assert.ok(phases[650]>9);
 console.log('CPU_ACTIVE_SITE_FACTS',JSON.stringify({sites:S.length,max,phases}));
});
test('R7 entry and native fixture preserve explicit version and H64 registration',async()=>{
 assert.equal(VERSION_ID,'human-transmutation-sol61-r7');
 const gallery=(await read('gallery.html')).toString();const index=(await read('index.html')).toString();
 assert.match(gallery,/const versionId='human-transmutation-sol61-r7'/);
 assert.match(index,/GPT-6\.1-Sol r7/);
 assert.doesNotMatch(gallery,/human-transmutation-sol61-r6/);
 for(const h of [48,64,128])assert.equal(makeFixture({height:h}).sprite.scale,h/225);
});
test('parent material transport, original PNG and SFX remain byte-identical',async()=>{
 const pins=JSON.parse(await read('SOURCE-PINS.json'));
 for(const path of ['handoff-state.mjs','sfx.mjs','assets/philia-front-nine-v752.png']){
  const expected=pins.files.find(x=>x.path===path).sha256;
  assert.equal(createHash('sha256').update(await read(path)).digest('hex'),expected);
 }
});
