// Run: node --experimental-vm-modules verify-candidate.cjs <path-to-naga-wasi-cli/bin/naga.mjs>
// CPU only: Naga uses WASI and stdin; this verifier starts no browser, GPU or server.
process.env.DVA_FORBID_NATIVE='1';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
(async()=>{
 const fs=require('node:fs'),path=require('node:path');
 const f=Object.fromEntries(["index.html","preview.mjs","gallery.html","gallery-adapter.mjs","resume.mjs","effect.wgsl"].map(n=>[n,fs.readFileSync(path.join(__dirname,n),'utf8')]));
 const old=fs.readFileSync(path.join(__dirname,'../r1/resume.mjs'),'utf8');
 const oldShader=fs.readFileSync(path.join(__dirname,'../r1/effect.wgsl'),'utf8');
 const tests=[];
 const test=(name,run)=>{run();tests.push(name);};
 const m=await import('data:text/javascript;base64,'+Buffer.from(f['resume.mjs']).toString('base64'));
 const valid=(id=1,from=1,to=from+1)=>({...m.fixtureEvent('small',id),previousRound:from,round:to});
 test('exact R1 gate fixture digit bodies retained',()=>{
  for(const name of ['makeGate','fixtureEvent','digitSlots']){
   const body=s=>s.slice(s.indexOf('export function '+name),s.indexOf('\nexport function ',s.indexOf('export function '+name)+1)===-1?s.length:s.indexOf('\nexport function ',s.indexOf('export function '+name)+1)).trim();
   assert.equal(body(f['resume.mjs']),body(old));
  }
 });
 test('authorized settled positive transition and frozen projection',()=>{const x=m.makeGate()(valid());assert.deepEqual(x,{id:1,from:1,to:2});assert(Object.isFrozen(x));});
 test('all denied authority cause phases and flags',()=>{
  const mutations=[{kind:'vote-accepted'},{authorized:false},{authorized:1},{current:false},{settled:false},{before:'playing'},{after:'ended'},{after:'meeting'},{id:0},{id:-1},{id:1.5},{id:NaN},{id:Infinity},{previousRound:0},{previousRound:-1},{previousRound:1.5},{previousRound:NaN},{round:1},{round:3},{round:NaN},{round:Number.MAX_SAFE_INTEGER+1}];
  for(const patch of mutations)assert.equal(m.makeGate()({...valid(),...patch}),null,JSON.stringify(patch));
  for(const x of [null,undefined,{},false,[]])assert.equal(m.makeGate()(x),null);
 });
 test('bad receipt does not consume ID; stale duplicate reject',()=>{
  const g=m.makeGate();assert.equal(g({...valid(3),settled:false}),null);assert(g(valid(3)));assert.equal(g(valid(3)),null);assert.equal(g(valid(2)),null);assert(g(valid(4,9,10)));
 });
 test('reject disallowed cause before reading round getter',()=>{
  const x=valid();x.kind='vote-accepted';Object.defineProperty(x,'round',{get(){throw Error('read disallowed round');}});assert.equal(m.makeGate()(x),null);
 });
 test('carry, 16-digit and max-safe transitions',()=>{
  const M=Number.MAX_SAFE_INTEGER;for(const [a,b] of [[9,10],[99,100],[999,1000],[M-1,M]]){assert.deepEqual(m.makeGate()(valid(1,a,b)),{id:1,from:a,to:b});const slots=m.digitSlots(b);assert.equal(slots.length,16);assert.equal(slots.filter(x=>x>=0).join(''),String(b));}
  assert.equal(m.makeGate()(valid(1,M,M+1)),null);
 });
 test('fixtures pending ended same unknown reject; carry valid',()=>{for(const mode of ['pending','ended','same','unknown'])assert.equal(m.makeGate()(m.fixtureEvent(mode,1)),null);assert.deepEqual(m.makeGate()(m.fixtureEvent('carry',1)),{id:1,from:9,to:10});});
 const pcm=[];
 test('PCM rates finite bounded leading trailing silence and mechanical contacts',()=>{
  for(const rate of [8000,44100,48000,96000,192000]){
   const p=m.makeCue(rate);assert(p instanceof Float32Array);assert.equal(p.length,Math.ceil(rate*.81));let peak=0,rms=0,release=0,seat=0;
   for(let i=0;i<p.length;i++){assert(Number.isFinite(p[i]));assert(Math.abs(p[i])<=1);peak=Math.max(peak,Math.abs(p[i]));rms+=p[i]*p[i];if(i/rate<.22||i/rate>=.78)assert(p[i]===0);if(i/rate>=.22&&i/rate<.4)release=Math.max(release,Math.abs(p[i]));if(i/rate>=.58&&i/rate<.77)seat=Math.max(seat,Math.abs(p[i]));}
   assert(release>0&&seat>release);pcm.push({rate,samples:p.length,peak,rms:Math.sqrt(rms/p.length),releasePeak:release,seatingPeak:seat});
  }
  for(const rate of [0,7999,192001,NaN,Infinity,-8000])assert.throws(()=>m.makeCue(rate),RangeError);
 });
 test('1190ms lifetime and 160-byte uniform ABI',()=>{assert.equal(m.lifetimeMs,1190);assert(/t\s*<\s*1160\.0/.test(f['effect.wgsl']));assert.equal(f['effect.wgsl'].slice(0,f['effect.wgsl'].indexOf('@group')).trim(),oldShader.slice(0,oldShader.indexOf('@group')).trim());const values=[292,135,500,1,0,1,2,0,...m.digitSlots(9),...m.digitSlots(10)];assert.equal(new Float32Array(values).byteLength,160);});
 test('ESM and inline module syntax',()=>{
  for(const [name,source] of Object.entries(f)){
   if(name.endsWith('.mjs'))new vm.SourceTextModule(source,{identifier:name});
   if(name.endsWith('.html'))for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())new vm.SourceTextModule(match[1],{identifier:name});
  }
 });
 const refs=[];
 test('relative runtime dependency closure',()=>{
  for(const [name,source] of Object.entries(f)){
   if(!/\.(mjs|html)$/.test(name))continue;
   const patterns=[/\bfrom\s*['"]([^'"]+)['"]/g,/\bimport\s*\(\s*['"]([^'"]+)['"]/g,/\b(?:moduleUrl|shaderUrl)\s*:\s*['"]([^'"]+)['"]/g,/new URL\(\s*['"]([^'"]+)['"]/g,/\bsrc=['"]([^'"]+)['"]/g];
   for(const regex of patterns)for(const match of source.matchAll(regex)){const ref=match[1];if(!ref.startsWith('./'))continue;const path=ref.slice(2).split(/[?#]/)[0];assert(Object.hasOwn(f,path),name+' -> '+path);refs.push({from:name,to:path});}
  }
  assert(refs.some(x=>x.to==='effect.wgsl'));assert(refs.some(x=>x.to==='resume.mjs'));assert(refs.some(x=>x.to==='gallery-adapter.mjs'));
 });
 test('R2 identifiers with no R1 runtime paths; verify hard-mute retained',()=>{
  for(const name of ['resume.mjs','gallery.html','index.html','preview.mjs'])assert(!/round-resume[^\n]*r1|round-resume\/r1/.test(f[name]),name);
  assert(f['preview.mjs'].includes("sound.disabled = verify"));assert(f['gallery-adapter.mjs'].includes('if(verify)return Promise.resolve'));
  assert(!/getContext\(['"]2d|copyExternalImageToTexture|createImageBitmap/.test(Object.values(f).join('\n')));
 });
 const nagaPath=process.argv[2]||process.env.DVA_NAGA_CLI;assert(nagaPath,'Pass Naga JS CLI path as argument or DVA_NAGA_CLI');
 const naga=spawnSync(process.execPath,[nagaPath,'--input-kind','wgsl','--stdin-file-path','effect.wgsl'],{input:f['effect.wgsl'],encoding:'utf8',env:{...process.env,DVA_FORBID_NATIVE:'1'},timeout:60000});
 assert.equal(naga.status,0,naga.stdout+naga.stderr);
 tests.push('Naga WASI WGSL parse + validate stdin');
 const files=Object.fromEntries(Object.entries(f).map(([name,s])=>[name,{bytes:Buffer.byteLength(s),sha256:crypto.createHash('sha256').update(s).digest('hex'),gitBlob:crypto.createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')}]));
 console.log(JSON.stringify({schema:'dva-candidate-cpu-evidence/v1',testsPassed:tests.length,tests,pcm,dependencyRefs:refs,shader:{validator:'naga-wasi-cli@0.1.0',status:naga.status,stdout:naga.stdout,stderr:naga.stderr},files,limits:{actualGpu:'not-run',visualQuality:'not-run',actualDisplaySize:'not-run',normalSpeed:'not-run',normalAudioListening:'not-run',gameIntegration:'not-connected',publication:'not-performed'}}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
