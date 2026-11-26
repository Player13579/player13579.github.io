import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fixturePair, lifetimeMs, makeCue, makeGate, version} from './report.mjs';
import * as bridge from './gallery-effect.mjs';
import * as previous from '../r2/report.mjs';

assert.equal(version,'self-body-report-astra62-r4');
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
assert.ok(index.includes('self-body-report-r4'));
assert.ok(preview.includes('./effect.wgsl?rev=self-body-report-r4'));
const modules=['./report.mjs','./preview.mjs','./gallery-effect.mjs','./gallery.html','./index.html'];
for(const file of modules) assert.ok(!(await text(file)).includes('self-body-report-r3'));
console.log(JSON.stringify({version,lifetimeMs,acceptedUnique:2,pcm,shaderSha256:sha(await text(config.shaderUrl)),note:'CPU checks only. Fixture data are synthetic.'}));
