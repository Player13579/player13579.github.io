import test from 'node:test';import assert from 'node:assert/strict';
import {HeartReceiptCore} from '../src/core.mjs';
import {ReceiptLedger,WallClock,validateReceipt,TYPE} from '../src/contract.mjs';
import {createHeartTransferIssuer} from '../server/issue-receipt.mjs';
function packet(id='magic-1'){return {delivery:'private',ownerId:'caster',roomId:'room',sessionId:'session',receipt:{id,type:TYPE,radius:64,playerId:'caster',viewerId:'caster',x:5,y:7,variant:'role',targetId:'target',targetX:400,targetY:-800}};}
function fixture(options={}){
 const f={now:1000,context:{viewerId:'caster',selfId:'caster',ownerId:'caster',roomId:'room',sessionId:'session',casterId:'caster',casterX:5,casterY:7},visibility:{visible:true,onScreen:true,occluded:false,documentVisible:true},starts:[],stops:[],ledger:options.ledger||new ReceiptLedger()};
 f.core=new HeartReceiptCore({verifyEnvelope:options.verify||(()=>true),isCanonicalId:id=>typeof id==='string'&&id.startsWith('magic-'),getContext:()=>f.context,getVisibility:p=>{f.visibilityInput=p;return f.visibility;},ledger:f.ledger,clock:{now:()=>f.now},onStart:p=>f.starts.push(p),onStop:(p,r)=>f.stops.push({id:p.id,reason:r})});return f;
}
test('authority: valid receipt starts one caster-only effect',async()=>{const f=fixture();assert.equal((await f.core.receive(packet())).ok,true);assert.equal(f.starts.length,1);assert.deepEqual(Object.keys(f.starts[0]).sort(),['casterX','casterY','deadline','firstReceivedAt','id','playerId']);assert.equal(f.starts[0].deadline,2800);});
const mutations={
 'type':p=>p.receipt.type='teleport','radius':p=>p.receipt.radius=65,'noncanonical':p=>p.receipt.id='ui-pose',
 'empty-id':p=>p.receipt.id='','private':p=>p.delivery='broadcast','player':p=>p.receipt.playerId='other',
 'viewer':p=>p.receipt.viewerId='other','owner':p=>p.ownerId='other','room':p=>p.roomId='elsewhere','session':p=>p.sessionId='old',
 'x':p=>p.receipt.x=6,'y':p=>p.receipt.y=8,'nonfinite-caster':p=>p.receipt.x=Infinity,
 'targetId':p=>delete p.receipt.targetId,'targetX':p=>p.receipt.targetX=NaN,'targetY':p=>delete p.receipt.targetY,
 'variant':p=>p.receipt.variant='', 'id-object':p=>p.receipt.id={},'bad-receipt':p=>p.receipt=null
};
for(const [name,mutate] of Object.entries(mutations))test(`refuse: ${name}`,async()=>{const f=fixture(),p=packet();mutate(p);assert.equal((await f.core.receive(p)).ok,false);assert.equal(f.starts.length,0);});
for(const field of ['viewerId','selfId','ownerId','roomId','sessionId','casterId'])test(`scope: mismatched ${field}`,async()=>{const f=fixture();f.context[field]='other';assert.equal((await f.core.receive(packet())).ok,false);assert.equal(f.starts.length,0);});
test('authority: UI verified=true flag is not a receipt verifier',async()=>{const f=fixture({verify:()=>false}),p=packet();p.verified=true;p.receipt.pose='heart-transfer';assert.equal((await f.core.receive(p)).reason,'unverified');assert.equal(f.ledger.size,0);});
test('authority: exceptions and getters fail closed without invoking getter',async()=>{const f=fixture(),p=packet();let hits=0;Object.defineProperty(p.receipt,'targetX',{get(){hits++;return 1;}});assert.equal((await f.core.receive(p)).ok,false);assert.equal(hits,0);const g=fixture({verify:()=>{throw Error('x');}});assert.equal((await g.core.receive(packet())).reason,'unverified');});
test('privacy: target positions, identities, role do not affect presentation',async()=>{
 let expected;
 for(const values of [[1,2,'a','one'],[1e300,-1e299,'b','two'],[-800,400,'c','three']]){
  const f=fixture(),p=packet();[p.receipt.targetX,p.receipt.targetY,p.receipt.targetId,p.receipt.variant]=values;
  assert.equal((await f.core.receive(p)).ok,true);const snap=f.core.tick();if(expected)assert.deepEqual(snap,expected);else expected=snap;
  assert(!Object.keys(f.visibilityInput).some(k=>/target|variant|direction/i.test(k)));
 }
});
test('dedup: concurrent receipt deliveries start once',async()=>{const f=fixture();const results=await Promise.all(Array.from({length:12},()=>f.core.receive(packet())));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.starts.length,1);});
test('dedup: expire, remount, and retransmission retain tombstone',async()=>{const ledger=new ReceiptLedger(),f=fixture({ledger});await f.core.receive(packet());f.now=2800;assert.equal(f.core.tick().length,0);assert.equal((await f.core.receive(packet())).reason,'duplicate');f.core.dispose();const g=fixture({ledger});assert.equal((await g.core.receive(packet())).reason,'duplicate');assert.equal(g.starts.length,0);});
test('dedup: ledger capacity never evicts old IDs',async()=>{const f=fixture({ledger:new ReceiptLedger(1)});await f.core.receive(packet());assert.equal((await f.core.receive(packet('magic-2'))).reason,'ledger_full');assert.equal((await f.core.receive(packet())).reason,'duplicate');});
for(const [field,value] of [['visible',false],['onScreen',false],['occluded',true],['documentVisible',false]]){
 test(`visibility: ${field} at receipt is consumed and never replayed`,async()=>{const f=fixture();f.visibility[field]=value;assert.equal((await f.core.receive(packet())).reason,'not_visible');f.visibility[field]=!value;assert.equal((await f.core.receive(packet())).reason,'duplicate');assert.equal(f.starts.length,0);});
 test(`visibility: ${field} during lifetime stops irreversibly`,async()=>{const f=fixture();await f.core.receive(packet());f.now+=400;f.visibility[field]=value;assert.equal(f.core.tick().length,0);assert.equal(f.stops.length,1);f.visibility[field]=!value;assert.equal(f.core.tick().length,0);assert.equal((await f.core.receive(packet())).reason,'duplicate');});
}
test('visibility: missing occlusion answer is not assumed visible',async()=>{const f=fixture();delete f.visibility.occluded;assert.equal((await f.core.receive(packet())).reason,'not_visible');});
test('wallclock: exactly 1800ms, no game speed parameter',async()=>{const f=fixture();await f.core.receive(packet());f.now=2799.999;assert.equal(f.core.tick().length,1);f.now=2800;assert.equal(f.core.tick().length,0);assert.equal(f.stops[0].reason,'expired');});
test('wallclock: long background gap expires, no resumed tail',async()=>{const f=fixture();await f.core.receive(packet());f.now+=80000;assert.equal(f.core.tick().length,0);assert.equal(f.starts.length,1);});
test('wallclock: backward clock does not extend duration',()=>{let wall=1000,mono=0;const clock=new WallClock(()=>wall,()=>mono);wall=800;mono=1800;assert.equal(clock.now(),2800);wall=10000;assert.equal(clock.now(),10000);wall=3;assert.equal(clock.now(),10000);});
test('wallclock: delayed verification does not reset receipt lifetime',async()=>{let resume;const f=fixture({verify:()=>new Promise(r=>resume=r)});const task=f.core.receive(packet());f.now+=1800;resume(true);assert.equal((await task).reason,'expired_during_verification');assert.equal(f.starts.length,0);});
test('authority: async scope change is rejected using arrival snapshot',async()=>{let resume;const f=fixture({verify:()=>new Promise(r=>resume=r)});const task=f.core.receive(packet());f.context.sessionId='new';resume(true);assert.equal((await task).ok,false);});
test('authority: mutation after receive cannot change validated packet',async()=>{let resume;const f=fixture({verify:()=>new Promise(r=>resume=r)}),p=packet();const task=f.core.receive(p);p.receipt.x=999;resume(true);assert.equal((await task).ok,true);assert.equal(f.starts[0].casterX,5);});
for(const field of ['viewerId','selfId','ownerId','roomId','sessionId'])test(`lifetime: ${field} change terminates`,async()=>{const f=fixture();await f.core.receive(packet());f.context[field]='other';assert.equal(f.core.tick().length,0);assert.equal(f.stops[0].reason,'scope_changed');});
test('multiple causes: 8 independent IDs; ninth consumed at cap',async()=>{const f=fixture();for(let i=0;i<8;i++)assert.equal((await f.core.receive(packet(`magic-${i}`))).ok,true);assert.equal(f.core.tick().length,8);assert.equal((await f.core.receive(packet('magic-overflow'))).reason,'active_capacity');f.now+=1800;f.core.tick();assert.equal((await f.core.receive(packet('magic-overflow'))).reason,'duplicate');});
test('dispose: release once, retain ledger, reject late async receipt',async()=>{const f=fixture();await f.core.receive(packet());f.core.dispose();f.core.dispose();assert.equal(f.stops.length,1);assert.equal(f.ledger.size,1);assert.equal((await f.core.receive(packet('magic-2'))).reason,'disposed');});
test('server: committed heart transfer emits private caster receipt, not kill',async()=>{
 let sent;const issuer=createHeartTransferIssuer({isCommittedHeartTransfer:e=>e.committed===true,isCanonicalId:id=>id==='magic-ok',sendPrivate:async(to,env)=>{sent={to,env};},ledger:new ReceiptLedger()});
 const event={magicId:'magic-ok',committed:true,kill:false,caster:{id:'caster',x:5,y:7},target:{id:'target',x:900,y:800,role:'chosen'},roomId:'room',sessionId:'session'},before=structuredClone(event);
 assert.equal((await issuer(event)).ok,true);assert.equal(sent.to,'caster');assert.deepEqual(sent.env.receipt,{id:'magic-ok',type:TYPE,x:5,y:7,radius:64,playerId:'caster',viewerId:'caster',variant:'chosen',targetId:'target',targetX:900,targetY:800});assert.deepEqual(event,before);assert.equal((await issuer(event)).reason,'duplicate');
});
test('server: uncommitted or UI action issues no receipt',async()=>{let count=0;const issuer=createHeartTransferIssuer({isCommittedHeartTransfer:()=>false,isCanonicalId:()=>true,sendPrivate:()=>count++,ledger:new ReceiptLedger()});assert.equal((await issuer({pose:'heart-transfer',kill:true})).reason,'not_committed_transfer');assert.equal(count,0);});
test('multiple causes: context lookup uses each authority ID snapshot',async()=>{
 const base={viewerId:'caster',selfId:'caster',ownerId:'caster',roomId:'room',sessionId:'session',casterId:'caster',casterX:5,casterY:7};
 const core=new HeartReceiptCore({verifyEnvelope:()=>true,isCanonicalId:id=>id.startsWith('magic-'),getContext:id=>({...base,casterX:id==='magic-2'?20:5}),getVisibility:()=>({visible:true,onScreen:true,occluded:false,documentVisible:true}),ledger:new ReceiptLedger(),clock:{now:()=>1000}});
 const p=packet('magic-2');p.receipt.x=20;assert((await core.receive(packet())).ok);assert((await core.receive(p)).ok);assert.deepEqual(core.tick().map(x=>x.casterX),[5,20]);core.dispose();
});
