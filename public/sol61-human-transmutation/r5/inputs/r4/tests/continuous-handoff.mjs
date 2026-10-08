import assert from 'node:assert/strict';
import {HANDOFF_TIMING as T,materialHandoffAt} from '../handoff-state.mjs';
import {WORLD_WGSL} from '../shader.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
let sampledStates=0;
for(const H of [48,64,128])for(const reducedMotion of [false,true])for(let i=0;i<=225;i++){
  const rowY=i/225,arrivalMs=T.footArrivalMs+(1-rowY)*T.bodySweepMs;
  for(const phaseMs of [0,arrivalMs-110,arrivalMs-80,arrivalMs-1,arrivalMs,arrivalMs+1,arrivalMs+12,arrivalMs+24,814,1200]){
    const state=materialHandoffAt({rowY,phaseMs,actorHeight:H,reducedMotion});sampledStates++;
    if(state.fixed>0)assert.equal(state.travelCSS,0,'No fixation before exact arrival');
    if(phaseMs>=arrivalMs){
      assert.equal(state.onset,1,'Full material birth before complementary handoff');
      assert.equal(state.fixedWeight+state.transportWeight,1,'Opaque material support preserved during handoff');
      for(const alpha of [0,.1,.5,1])assert.ok(Math.abs(alpha*state.fixedWeight+alpha*state.transportWeight-alpha)<1e-12,'Original semitransparent edge support preserved');
    }
    assert.ok(state.fixed>=0&&state.fixed<=1&&state.transportWeight>=0&&state.transportWeight<=1);
    if(phaseMs>=814)assert.equal(state.fixed,1);
  }
}
const center=materialHandoffAt({rowY:.5,phaseMs:440+12});assert.equal(center.fixed,.5);assert.equal(center.travelCSS,0);assert.equal(center.fixedWeight+center.transportWeight,1);
assert.match(WORLD_WGSL,/smoothstep\(rowArrival,rowArrival\+24\.,time\)/);
assert.match(WORLD_WGSL,/let combinedA=fixedA\+incomingA/);
assert.doesNotMatch(WORLD_WGSL,/transportA\*\(1\.-actor\.a\)/);
const inherited=JSON.parse(await readFile(new URL('../inputs/r3/MANIFEST.json',import.meta.url),'utf8'));
for(const name of ['sfx.mjs','assets/philia-front-nine-v752.png']){
  const bytes=await readFile(new URL(`../${name}`,import.meta.url)),pin=inherited.files.find(f=>f.path===name);
  assert.ok(pin,`R3 inheritance pin exists for ${name}`);
  assert.equal(bytes.byteLength,pin.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),pin.sha256,`Original ${name} bytes inherited`);
}
console.log(JSON.stringify({status:'pass',sampledStates,checks:['arrival-precedes-all-fixation','opaque-and-edge-alpha-preservation','full-original-material-by814','shared-timing-in-actual-WGSL','r1-SFX-and-original-sprite-exact-byte-inheritance'],GPU:'not_run',visualQuality:'not_run',ordinarySFX:'not_run'}));
