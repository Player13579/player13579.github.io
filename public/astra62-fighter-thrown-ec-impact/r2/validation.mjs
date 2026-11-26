import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {boundWorld, fixtureEvent, lifetimeMs, makeCue, makeGate, marker, version} from './impact.mjs';
import * as r1 from '../r1/impact.mjs';

const read = file => readFile(new URL(file, import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(version,'fighter-thrown-ec-impact-astra62-r2');
assert.equal(boundWorld,180);
assert.equal(lifetimeMs,880);
assert.equal((await read('./impact.mjs')).toString().replace(version, r1.version),
  (await read('../r1/impact.mjs')).toString());
assert.deepEqual(marker('west'),[-51,4]);
assert.deepEqual(marker('east'),[48,-3]);
assert.equal(marker('hidden'),null);
const accept=makeGate();
for(const mode of ['flight','hidden','ordinary','mismatch','blade']) {
  const blocked=fixtureEvent(mode,1);
  Object.defineProperty(blocked,'point',{get(){throw Error('Rejected event accessed landing');}});
  assert.equal(accept(blocked),null);
}
for(const override of [{id:0},{id:1.25},{current:false},{permitted:false},{settled:false},
  {sameThrow:false},{hasAttachment:false},{variant:'other'},{worldRadius:179},{point:null},
  {point:[,2]},{point:[0,NaN]},{point:[Infinity,0]},{point:[84.01,0]},{point:[0,-10.01]}]) {
  assert.equal(accept({...fixtureEvent('west',1),...override}),null);
}
for(const [id,mode] of [[1,'west'],[2,'east']]) {
  const event=fixtureEvent(mode,id);
  for(const key of ['target','targetId','damage','outcome']){
    Object.defineProperty(event,key,{get(){throw Error('Visual event accessed '+key);}});
  }
  const [x,y]=marker(mode);
  assert.deepEqual(accept(event),{id,x,y});
  assert.equal(accept(event),null);
}
assert.deepEqual(accept({...fixtureEvent('west',3),point:[84,-10]}),{id:3,x:84,y:-10});
const pcm={};
for(const rate of [8000,44100,48000,96000,192000]){
  const sample=makeCue(rate);
  assert.deepEqual(sample,r1.makeCue(rate));
  assert.equal(sample.length,Math.ceil(rate*.86));
  assert.ok(sample.some(x=>Math.abs(x)>.01) && sample.every(x=>Number.isFinite(x)&&Math.abs(x)<1));
  assert.equal(Math.abs(sample.at(-1)),0);
  pcm[rate]=sha(Buffer.from(sample.buffer,sample.byteOffset,sample.byteLength));
}
const html=(await read('./gallery.html')).toString();
const inline=html.match(/<script type="module">([\s\S]+?)<\/script>/)[1];
const adapter=inline.match(/import \{mountGalleryEffect\} from '([^']+)';/)[1];
const cfgSource=inline.slice(inline.indexOf('mountGalleryEffect({')+'mountGalleryEffect('.length,inline.indexOf('}).catch')+1);
const cfg=Function('return ('+cfgSource+')')();
assert.equal(cfg.versionId,version);
assert.equal(cfg.fixture,'west');
assert.equal(cfg.uniformBytes,48);
assert.deepEqual(cfg.uniformValues({width:292,height:135,age:100,scale:1,reduced:true,live:true}),
  [292,135,100,1,1,1,1,0,-51,4,0,0]);
for(const dependency of [adapter,cfg.moduleUrl,cfg.shaderUrl]) assert.ok((await read(dependency)).length);
assert.equal(sha(await read(adapter)),sha(await read('../r1/gallery-adapter.mjs')));
const index=(await read('./index.html')).toString();
const preview=(await read('./preview.mjs')).toString();
assert.ok(index.includes('thrown-ec-impact-r2'));
assert.ok(preview.includes('./effect.wgsl?rev=thrown-ec-impact-r2'));
assert.equal(preview.replaceAll('thrown-ec-impact-r2','thrown-ec-impact-r1'),(await read('../r1/preview.mjs')).toString());
console.log(JSON.stringify({version,lifetimeMs,boundWorld,acceptedUnique:3,uniformBytes:48,pcm,shaderSha256:sha(await read(cfg.shaderUrl)),method:'CPU-only fixture, PCM equivalence, and entry dependency checks'}));
