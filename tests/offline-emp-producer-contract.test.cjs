const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const names = ['offline-server-main.js','offline-server-worker.js',
'offline-server-main-fire-e-causal-v920-box-grenades-r1.js',
'offline-server-worker-fire-e-causal-v920-box-grenades-r1.js'];
function between(s,a,b) {
 const i=s.indexOf(a), j=s.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i); return s.slice(i,j);
}
function fixture(name) {
 const s=fs.readFileSync(path.join(root,name),'utf8');
 const resolve=between(s,'function resolveEmpInteraction(','\nfunction resolvePendingEmps(');
 const settlement=resolve.slice(resolve.indexOf('  const visualSettlement'),resolve.indexOf('  const soloEmpPractice'));
 const begin=resolve.indexOf('  const dx = second.x - first.x;');
 const body=begin>=0?resolve.slice(begin,resolve.indexOf('  const soloEmpPractice')):settlement;
 const sandbox={batchActivationEffectSuppressed:()=>false,isValidCooldownOutcomeV1:()=>false,
 uid:()=> 'fixture',now:()=>1234,abilityBatchPresentationScopes:new WeakMap()};
 vm.runInNewContext(between(s,'function pushMagicEffect(','\nfunction pushGainAte(')+'\nthis.push=pushMagicEffect;',sandbox);
 return (end,type='emp-resonance')=>{
 const options=new Function('first','second',body+'\nreturn visualSettlement;')(
 {id:'a',x:10,y:20},{id:'b',...end});
 const room={magicEffects:[]};sandbox.push(room,type,{x:13,y:24},options);
 return JSON.parse(JSON.stringify(room.magicEffects[0]));
 };
}
for(const name of names) {
 test(name+' exports positive and coincident geometry',()=>{
 const emit=fixture(name);
 for(const type of ['emp-resonance','emp-cancel']) {
 const e=emit({x:16,y:28},type);
 assert.equal(e.sourceHalfSpan,5);
 assert.equal(e.empSourceAxis,Math.atan2(8,6));
 assert.deepEqual(e.resolvedEmpPulseIds,['a','b']);
 assert.equal(e.durationMs,0);
 const zero=emit({x:10,y:20},type);
 assert.ok(Object.hasOwn(zero,'sourceHalfSpan'));assert.equal(zero.sourceHalfSpan,0);
 }
 });
 test(name+' produces plannable event without charge history',()=>{
 const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(root,'webgpu-emp-effect.js'),'utf8'),sandbox);
 const e=fixture(name)({x:16,y:28});
 const planned=sandbox.DvaWebGPUEmpEffect.plan({effect:{...e,startedAt:0},now:339,phase:'playing',
 camera:{x:0,y:0},zoom:1,viewport:{kind:'main',width:800,height:600,pixelWidth:800,pixelHeight:600}});
 assert.ok(planned);assert.equal(planned.sourceHalfSpan,5);
 });
}
test('all producer variants emit identical geometry',()=>{
 const values=names.map(n=>fixture(n)({x:16,y:28}));
 for(const e of values)assert.deepEqual(e,values[0]);
});
