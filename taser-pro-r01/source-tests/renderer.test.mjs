import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactRenderer} from '../src/renderer.js';
// GPUコマンドのモック。画素shaderの検証はbrowser-validation.jsonを参照。
globalThis.GPUBufferUsage={COPY_DST:1,MAP_READ:2};globalThis.GPUMapMode={READ:1};
function setup({fail=false}={}) {
  const r=new ContactRenderer(null);r.width=2;r.height=1;r.format='bgra8unorm';r.output={};
  const raw=new Uint8Array(256);raw.set([1,2,3,4,5,6,7,8]);let destroyed=false;let copiedSize;
  r.device={createBuffer:()=>({mapAsync:async()=>{r.width=4;r.height=2;if(fail)throw new Error('device lost');},
    getMappedRange:()=>raw.buffer,unmap(){},destroy(){destroyed=true;}}),
    createCommandEncoder:()=>({copyTextureToBuffer(t,b,size){copiedSize=size;},finish(){return {};}}),
    queue:{submit(){}}};
  return {r,state:()=>({destroyed,copiedSize})};
}
test('readPixels: resize中も提出時の寸法とBGRA変換を保持',async()=>{
 const {r,state}=setup();const p=await r.readPixels();
 assert.equal(p.width,2);assert.equal(p.height,1);assert.deepEqual([...p.bytes],[3,2,1,4,7,6,5,8]);
 assert.deepEqual(state().copiedSize,[2,1]);assert.equal(state().destroyed,true);
});
test('readPixels: map失敗でも一時bufferを解放',async()=>{
 const {r,state}=setup({fail:true});await assert.rejects(r.readPixels(),/device lost/);assert.equal(state().destroyed,true);
});
test('render: queue backpressureで無制限に提出しない',()=>{
 const r=new ContactRenderer(null);r.ready=true;r.inFlight=2;assert.equal(r.render([]),false);assert.equal(r.backpressureSkips,1);
});
test('render: 表示instance上限は128',()=>{
 const r=new ContactRenderer(null);r.ready=true;assert.throws(()=>r.render(Array(129).fill({})),/capacity/);
});
test('render: 非有限の表示座標はupload前に拒否',()=>{
 const r=new ContactRenderer(null);r.ready=true;r.device={};assert.throws(()=>r.render([{x:NaN,y:0,scale:1,ageMs:0,clip:[0,0,10,10]}]),/invalid authorized/);
});
