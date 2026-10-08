import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLINT_SITES,GLINT_OPTICS as O,glintAt,rayPSF} from '../glints.mjs';
import {materialHandoffAt} from '../handoff-state.mjs';
import {WORLD_WGSL,BLOOM_WGSL,PRESENT_WGSL} from '../shader.mjs';
import {BLOOM_WGSL as R4_BLOOM} from '../inputs/r4/shader.mjs';
let pulses=0,gateChecks=0;const peaks=[];
for(let i=0;i<GLINT_SITES.length;i++){
  const arrival=glintAt({index:i,phaseMs:0}).arrivalMs;let best={flux:0,phaseMs:0};
  for(let t=0;t<=1200;t+=.25){
    const g=glintAt({index:i,phaseMs:t});assert.ok(Number.isFinite(g.flux)&&g.flux>=0&&g.flux<=O.sourceRadiance);pulses++;
    assert.equal(g.angleRadians,O.angleRadians);
    if(g.flux>0){assert.equal(materialHandoffAt({rowY:(g.site.y-16)/225,phaseMs:t}).fixed,1);assert.ok(t>arrival+24&&t<arrival+174);}
    if(g.flux>best.flux)best={flux:g.flux,phaseMs:t};
  }
  assert.ok(best.flux>7);peaks.push({...best,index:i,arrivalMs:arrival});
  for(const gate of [{sourceEnabled:false},{targetVisible:false},{sourceActive:false},{sourceAlpha:0},{glintsEnabled:false}]){
    assert.equal(glintAt({index:i,phaseMs:best.phaseMs,...gate}).flux,0);gateChecks++;
  }
  assert.equal(glintAt({index:i,phaseMs:1200}).flux,0);
  assert.equal(glintAt({index:i,phaseMs:-1}).flux,0);
}
for(let i=1;i<peaks.length;i++)assert.ok(peaks[i].phaseMs>peaks[i-1].phaseMs,'Fixation progression reaches crown after foot');
const c=Math.cos(O.angleRadians),s=Math.sin(O.angleRadians);
let psfChecks=0;
for(const height of [48,64,128])for(const along of [0,.1,.5,1,2,4,8,16,32]){
  const val=rayPSF({dx:along*c*height/64,dy:along*s*height/64,height});
  const next=rayPSF({dx:(along+.01)*c*height/64,dy:(along+.01)*s*height/64,height});assert.ok(val>next);
  const opposite=rayPSF({dx:-along*c*height/64,dy:-along*s*height/64,height});assert.ok(Math.abs(val-opposite)<1e-10);psfChecks++;
}
assert.equal(BLOOM_WGSL,R4_BLOOM);
assert.match(WORLD_WGSL,/sourceOn && p.state.x>.5 && p.state.z>.5/);
assert.match(WORLD_WGSL,/sourceAlpha=sampleOriginal\(site\).a/);
assert.match(WORLD_WGSL,/coverage=sampleOriginal\(uv\).a/);
assert.match(WORLD_WGSL,/pointRadiation.*pulse\*sourceAlpha\*coverage\*exp/);
assert.match(PRESENT_WGSL,/textureSampleLevel\(glints,linearSampler,sourceUV,0\.\)/);
assert.match(PRESENT_WGSL,/p.controls.x>.5 && p.controls.y>.5/);
assert.match(PRESENT_WGSL,/let hdr=base\+direct\+observer\+rays/);
const core=await readFile(new URL('../core.mjs',import.meta.url),'utf8');assert.match(core,/worldBind,\[views\[0\],views\[1\],views\[4\]\]/);assert.match(core,/{binding:5,resource:views\[4\]}/);
console.log(JSON.stringify({status:'pass',pulses,gateChecks,psfChecks,peaks,checks:['fixation-before-emission','foot-to-crown-same-cause-progression','source-off-target-hidden-expiry-no-emission','one-fixed-angle-all-sites-and-times','continuous-width-attenuation-and-scale','actual-MRT-source-consumed-by-observer','R4-bloom-unchanged'],native:'not_run',quality:'not_accepted'}));
