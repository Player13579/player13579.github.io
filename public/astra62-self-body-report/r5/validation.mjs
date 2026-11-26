import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixturePair, lifetimeMs, makeCue, makeGate, version} from './report.mjs';
import * as bridge from './gallery-effect.mjs';
import * as previous from '../r2/report.mjs';

assert.equal(version,'self-body-report-astra62-r5');
assert.equal(bridge.version,version);
assert.equal(lifetimeMs,1120);
assert.equal(bridge.lifetimeMs,lifetimeMs);
const accept=makeGate();
const ok=n=>fixturePair('confirmed',n);
const reject=(apply)=>{
  const pair=ok(2); apply(...pair); assert.equal(accept(...pair),null);
};
assert.deepEqual(accept(...ok(1)),{id:1});
assert.equal(accept(...ok(1)),null);
for(const mode of ['near','emergency','other','old','unknown']){
  assert.equal(accept(...fixturePair(mode,2)),null);
}
for(const change of [
  (room)=>room.owned=false, (room)=>room.phase='playing',
  (room,r)=>r.human=false,(room,r)=>r.current=false,(room,r)=>r.sequence=3,
  (room,r)=>r.match='another-match',(room,r)=>r.meeting='another-meeting',
  (room,r)=>r.before='meeting',(room,r)=>r.after='playing',
  (room,r)=>{room.sequence=r.sequence=1.5;},
  (room,r)=>{room.meeting=r.meeting='example-meeting-1';}
]) reject(change);
assert.deepEqual(accept(...ok(2)),{id:2});
const embedded=bridge.makeGate();
assert.equal(embedded({}),null);
assert.deepEqual(embedded(bridge.fixtureEvent('confirmed',1)),{id:1});
assert.equal(embedded(bridge.fixtureEvent('confirmed',1)),null);
const sha = b=>createHash('sha256').update(b).digest('hex');
const pcm={};
for(const rate of [8000,44100,48000,96000,192000]){
  const actual=makeCue(rate), old=previous.makeCue(rate);
  assert.equal(actual.length, Math.ceil(rate*.82));
  assert.deepEqual(actual,old);
  assert.ok(actual.every(x=>Number.isFinite(x)&&Math.abs(x)<1));
  assert.ok(actual.some(x=>x!==0));
  assert.equal(Math.abs(actual[0]),0);
  assert.equal(Math.abs(actual.at(-1)),0);
  pcm[rate]=sha(Buffer.from(actual.buffer,actual.byteOffset,actual.byteLength));
}
const text=name=>readFile(new URL(name,import.meta.url),'utf8');
const html=await text('./gallery.html');
const inline=html.match(/<script type="module">([\s\S]+?)<\/script>/)[1];
const moduleImport=inline.match(/import \{mountGalleryEffect\} from '([^']+)';/)[1];
const cfgSource=inline.slice(inline.indexOf('mountGalleryEffect({')+'mountGalleryEffect('.length,inline.indexOf('}).catch')+1);
const config=Function('return ('+cfgSource+')')();
assert.equal(config.versionId,version);
assert.equal(config.fixture,'confirmed');
assert.equal(config.uniformBytes,32);
const sample=config.uniformValues({width:170,height:145,age:370,scale:1,reduced:false,live:true});
assert.deepEqual(sample,[170,145,370,1,0,1,0,0]);
for(const url of [moduleImport,config.moduleUrl,config.shaderUrl]) assert.ok((await text(url)).length>0);
assert.equal(sha(await text(moduleImport)),'e864ee08b67e4f114b33ad42b1a0d744ea45cd6d0710b33a8386eeee10c9d625');
const index=await text('./index.html'), preview=await text('./preview.mjs');
assert.ok(index.includes('self-body-report-r5'));
assert.ok(preview.includes('./effect.wgsl?rev=self-body-report-r5'));
const modules=['./report.mjs','./preview.mjs','./gallery-effect.mjs','./gallery.html','./index.html'];
for(const file of modules) assert.ok(!(await text(file)).includes('self-body-report-r4'));
const shader = await text(config.shaderUrl);
const number = (name) => {
  const literal = shader.match(new RegExp('const ' + name + ': f32 = ([0-9.]+);'));
  assert.ok(literal, name);
  return Number(literal[1]);
};
for (const line of [
  'return CONTACT_RADIUS + mix(FULL_RUN, SHORT_RUN, m) * mix(u, u * (2.0 - u), m);',
  'let sectionGain = carrier * backFace(radial, radius, aa);',
  'return smoothstep(-REAR_FACE - b, -REAR_FACE + b, radial - radius);',
  'sectionGain * nearby(arc.x, ARC_SKIRT)',
  'sectionGain * mix(0.76, 1.0, arc.z) * coverage(arc.x, portAA)',
  'pilot * nearby(capD, CAP_SKIRT)',
  'let portAA = min(aa, PORT_AA_MAX);'
]) assert.ok(shader.includes(line), line);

// Width of the analytically clear interval along the propagation axis, before sampling.
const sourceReach = number('CAP_RADIUS') + Math.max(number('CAP_SKIRT'), number('PORT_AA_MAX'));
const rearReach = number('REAR_FACE') + number('REAR_BLEND_MAX');
const contact = number('CONTACT_RADIUS'), crest = number('CREST_MS'), travel = number('TRAVEL_MS');
const designGap = (age, reduced) => {
  const u = Math.max(0, Math.min(1, (age - crest) / travel));
  const distance = reduced ? number('SHORT_RUN') * u * (2 - u) : number('FULL_RUN') * u;
  return contact + distance - rearReach - sourceReach;
};
const axisGapLowerBounds = {};
for (const reduced of [false, true]) {
  let prior = -Infinity;
  for (let ms = crest; ms <= 780; ++ms) {
    const gap = designGap(ms, reduced);
    assert.ok(gap >= prior, 'cleared source interval must stay open');
    prior = gap;
  }
  assert.ok(designGap(380, reduced) < 0 && designGap(440, reduced) > 0);
  const times = [595, 680, 735];
  const gaps = times.map(ms => Number(designGap(ms, reduced).toFixed(3)));
  assert.ok(gaps[0] > (reduced ? 5 : 12));
  axisGapLowerBounds[reduced ? 'reduced' : 'normal'] = Object.fromEntries(times.map((ms,i)=>[ms,gaps[i]]));
}


console.log(JSON.stringify({version,lifetimeMs,axisGapLowerBounds,acceptedUnique:2,pcm,shaderSha256:sha(await text(config.shaderUrl)),note:'CPU checks only. Fixture data are synthetic.'}));
