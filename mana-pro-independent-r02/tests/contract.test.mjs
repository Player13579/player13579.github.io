import test from 'node:test';import assert from 'node:assert/strict';
import {classifyEvent,eventKey,ownerRate} from '../src/contract.mjs';import {setup} from './fixtures.mjs';
test('確定したmap-object正増分だけを受理する',()=>{const f=setup();assert.equal(classifyEvent(f.event(),f.context,1000),null);});
test('Mystery mana-surgeの正増分を受理する',()=>{const f=setup();assert.equal(f.engine.admit(f.event({source:'mystery',variant:'mana-surge'})).accepted,true);});
const invalid=[
 ['0実増分',{manaAfter:4}],['負実増分',{manaAfter:3}],['上限で無変化',{manaBefore:100,manaAfter:100,amount:20}],
 ['非確定',{committed:false}],['自然回復',{source:'natural-recovery'}],['連続回復',{gainClass:'continuous'}],
 ['錬気desire',{variant:'desire-recovery'}],['錬気renki',{variant:'renki'}],['錬気tenfold',{variant:'renki-tenfold'}],
 ['別効果',{effectKind:'health'}],['別type',{type:'gain-health'}],['別ルーム',{roomId:'other'}],['別セッション',{sessionId:'other'}],
 ['失効',{expiresAtMs:1000}],['未来通知',{committedAtMs:1001}],['NaN増分',{manaAfter:NaN}],['Infinity増分',{manaAfter:Infinity}],
 ['IDなし',{id:''}],['受け手なし',{playerId:''}],['未知source',{source:'unknown'}],['未知Mystery',{source:'mystery',variant:'other'}],['別所有者',{ownerPlayerId:'p2'}],
];
for(const [name,patch] of invalid)test(name+'は抑制',()=>{const f=setup();assert.equal(f.engine.admit(f.event(patch)).accepted,false);assert.equal(f.engine.active.size,0);assert.equal(f.calls.filter(x=>x.kind==='play').length,0);});
test('event keyは文字列区切りの衝突を作らない',()=>assert.notEqual(eventKey({roomId:'a|b',sessionId:'c',id:'d'}),eventKey({roomId:'a',sessionId:'b|c',id:'d'})));
for(const state of ['off','waiting','reserved'])test('ACC2 '+state+'は等速',()=>assert.equal(ownerRate({moving:true,acc2State:state,acc2Effective:true}),1));
test('実効ACC2でも静止中は等速',()=>assert.equal(ownerRate({moving:false,acc2State:'active',acc2Effective:true}),1));
test('移動かつ実効activeだけ2倍',()=>assert.equal(ownerRate({moving:true,acc2State:'active',acc2Effective:true}),2));
test('effectiveフラグ未確定を2倍と推測しない',()=>assert.equal(ownerRate({moving:true,acc2State:'active'}),1));
