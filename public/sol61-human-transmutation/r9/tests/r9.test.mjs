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
test('non-row separated material sites reach shader unchanged',async()=>{
 assert.deepEqual(S,JSON.parse(await read('SITE-PLACEMENT.json')).sites);assert.equal(S.length,60);
 assert.ok(new Set(S.map(s=>s.y)).size>45);
 assert.ok(Math.max(...S.map(s=>S.filter(t=>t.y===s.y).length))<=3);
 for(let i=0;i<S.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(S[i].x-S[j].x,S[i].y-S[j].y)>=15);
 assert.match(WORLD_WGSL,new RegExp(`array<vec4f,${S.length}>`));assert.match(PRESENT_WGSL,new RegExp(`i<${S.length}u`));
});
test('independent pulses follow fully fixed material, expire and obey all gates',()=>{
 for(let index=0;index<S.length;index++){
  const site=S[index],a=glintAt({index,phaseMs:0}).arrivalMs,start=a+site.staggerMs+O.beginAfterArrivalMs;
  assert.equal(glintAt({index,phaseMs:start-.001}).flux,0);assert.ok(glintAt({index,phaseMs:start}).flux<1e-12);const phaseMs=start+O.riseMs;
  assert.equal(materialHandoffAt({rowY:(site.y-16)/225,phaseMs}).fixed,1);assert.ok(glintAt({index,phaseMs}).flux>0);
  for(const key of ['sourceEnabled','glintsEnabled','targetVisible','sourceActive'])assert.equal(glintAt({index,phaseMs,[key]:false}).flux,0);
  assert.equal(glintAt({index,phaseMs,sourceAlpha:0}).flux,0);
  assert.ok(glintAt({index,phaseMs:start+site.durationMs}).flux<1e-12);assert.equal(glintAt({index,phaseMs:1200}).flux,0);
 }
 assert.ok(new Set(S.map(s=>s.staggerMs)).size>40);assert.ok(new Set(S.map(s=>s.durationMs)).size>25);
 assert.match(WORLD_WGSL,/smoothstep\(24\.\+info.w-40\.,24\.\+info.w,age\)/);
});
test('fine finite-source PSF, radiance and optical angle remain intact',()=>{
 assert.equal(O.rayLengthH64,.85);assert.equal(O.sourceRadiusH64,.5);assert.equal(O.sourceRadiance,14);assert.equal(O.angleRadians,17*Math.PI/180);
 assert.ok(rayPSF({dx:0,dy:0})>rayPSF({dx:10,dy:0}));assert.equal(rayPSF({dx:.2,dy:.3}),rayPSF({dx:-.2,dy:-.3}));
 assert.match(WORLD_WGSL,/pixelIntegral=radius\*radius\/\(filteredRadius\*filteredRadius\)/);assert.match(WORLD_WGSL,/sourceAlpha\*coverage\*pixelIntegral/);
 assert.match(PRESENT_WGSL,/textureSampleLevel\(glints,linearSampler,sourceUV,0\.\)/);
});
test('independent onset and short lifetime reduce correlated CPU occupancy',()=>{
 let max=0;const phases={},peaks=[];
 for(let t=0;t<1200;t+=.5)max=Math.max(max,S.filter((_,index)=>glintAt({index,phaseMs:t}).flux>0).length);
 for(let index=0;index<S.length;index++)peaks.push(glintAt({index,phaseMs:0}).arrivalMs+S[index].staggerMs+O.beginAfterArrivalMs+O.riseMs);
 for(const t of [450,650,850,1050])phases[t]=S.filter((_,index)=>glintAt({index,phaseMs:t}).flux>0).length;
 assert.ok(max>4&&max<20);assert.ok(new Set(peaks.map(x=>Math.round(x))).size>50);assert.ok(peaks.every(t=>t<1200));assert.ok(phases[650]>0&&phases[850]>0);
 console.log('CPU_FACTS_NOT_VISIBLE_ACCEPTANCE',JSON.stringify({sites:S.length,max,phases,distinctRoundedPeakTimes:new Set(peaks.map(x=>Math.round(x))).size}));
});
test('R9 exact entries and native fixture registration are preserved',async()=>{
 assert.equal(VERSION_ID,'human-transmutation-sol61-r9');const gallery=(await read('gallery.html')).toString(),index=(await read('index.html')).toString();
 assert.match(gallery,/const versionId='human-transmutation-sol61-r9'/);assert.match(index,/GPT-6\.1-Sol r9/);assert.doesNotMatch(gallery,/human-transmutation-sol61-r8/);
 for(const h of [48,64,128])assert.equal(makeFixture({height:h}).sprite.scale,h/225);
});
test('transport source PNG and SFX retain exact parent bytes',async()=>{
 const pins=JSON.parse(await read('SOURCE-PINS.json'));
 for(const path of ['handoff-state.mjs','sfx.mjs','assets/philia-front-nine-v752.png'])assert.equal(createHash('sha256').update(await read(path)).digest('hex'),pins.files.find(x=>x.path===path).sha256);
});

test('compact smooth optical lobes retain angle, conserve pixel-convolved area and reject long wings',()=>{
 const c=Math.cos(O.angleRadians),s=Math.sin(O.angleRadians);
 for(const height of [48,64,128])for(const dpr of [1,2]){
  const scale=height/64;
  assert.ok(rayPSF({dx:3*c*scale,dy:3*s*scale,height,dpr})<.001);
  assert.ok(rayPSF({dx:0,dy:0,height,dpr})>.4);
  assert.ok(rayPSF({dx:1*c*scale,dy:1*s*scale,height,dpr})>rayPSF({dx:-s*scale,dy:c*scale,height,dpr}));
  let area=0;const step=.08*scale;
  for(let x=-7*scale;x<7*scale;x+=step)for(let y=-7*scale;y<7*scale;y+=step)area+=rayPSF({dx:x,dy:y,height,dpr})*step*step;
  const expected=Math.PI*O.rayWidthH64*(O.rayLengthH64+.72*O.secondaryRayLengthH64)*scale*scale;
  assert.ok(Math.abs(area/expected-1)<1e-5);
 }
 assert.match(PRESENT_WGSL,/pixelSigma=\.5\/\(p.extent.z\*scale\)/);
 assert.match(PRESENT_WGSL,/primaryArea\*exp\(-pow\(transverse\/width,2\.\)-pow\(along\/major,2\.\)\)/);
 assert.doesNotMatch(PRESENT_WGSL,/abs\(along\)\//);
});
test('R8 exact sites, timing, world material emission and unrelated shader sections preserved',async()=>{
 const parentSource=new URL('../../../../../human-small-many-r8/public/sol61-human-transmutation/r8/',import.meta.url);
 const oldG=await import(new URL('glints.mjs',parentSource));
 assert.deepEqual(S,oldG.GLINT_SITES);
 for(let index=0;index<S.length;index++)for(const phaseMs of [0,200,450,650,850,1050,1200])assert.deepEqual(glintAt({index,phaseMs}),oldG.glintAt({index,phaseMs}));
 const oldShader=await import(new URL('shader.mjs',parentSource));
 assert.equal(WORLD_WGSL,oldShader.WORLD_WGSL);
 const oldPresent=oldShader.PRESENT_WGSL,newPresent=PRESENT_WGSL;
 assert.equal(newPresent.slice(newPresent.indexOf('  let hdr=')),oldPresent.slice(oldPresent.indexOf('  let hdr=')));
});
