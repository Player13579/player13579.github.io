/** DOM可視性の純粋なモック検査。ブラウザー/GPUでの描画観察ではない。 */
import test from 'node:test';import assert from 'node:assert/strict';
import {ManaWebGPURenderer} from '../src/renderer.mjs';
function fixture(run){
 const keys=['document','innerWidth','innerHeight','Element','getComputedStyle'];
 const original=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 class FakeElement {constructor(rect,parent=null){this.rect=rect;this.parentElement=parent;this.style={};this.css={display:'block',visibility:'visible',opacity:'1',overflowX:'visible',overflowY:'visible'};this.clientLeft=0;this.clientTop=0;this.clientWidth=rect.right-rect.left;this.clientHeight=rect.bottom-rect.top;this.isConnected=true;}getBoundingClientRect(){return {...this.rect,width:this.rect.right-this.rect.left,height:this.rect.bottom-this.rect.top};}}
 const parent=new FakeElement({left:0,top:0,right:800,bottom:600}),canvas=new FakeElement({left:40,top:40,right:296,bottom:152},parent);
 try{Object.assign(globalThis,{Element:FakeElement,document:{visibilityState:'visible'},innerWidth:800,innerHeight:600,getComputedStyle:e=>e.css});
 const visible=(diagnosticAllowHidden=false)=>ManaWebGPURenderer.prototype.isCanvasVisible.call({canvas,diagnosticAllowHidden});run({parent,canvas,visible});
 }finally{for(const k of keys){const d=original.get(k);if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
}
test('DOMモック: 全canvasが表示域内なら可視条件成立',()=>fixture(({visible})=>assert.equal(visible(),true)));
test('DOMモック: viewportで一部欠けるcanvasは発音可視許可を得ない',()=>fixture(({canvas,visible})=>{canvas.rect.left=-1;assert.equal(visible(),false);}));
test('DOMモック: 非表示タブは許可されない',()=>fixture(({visible})=>{document.visibilityState='hidden';assert.equal(visible(),false);}));
test('DOMモック: 親の透明化は許可されない',()=>fixture(({parent,visible})=>{parent.css.opacity='0';assert.equal(visible(),false);}));
test('DOMモック: 親のoverflow clippingは許可されない',()=>fixture(({parent,visible})=>{parent.css.overflowY='hidden';parent.clientHeight=100;assert.equal(visible(),false);}));
test('DOMモック: 切断されたcanvasは許可されない',()=>fixture(({canvas,visible})=>{canvas.isConnected=false;assert.equal(visible(),false);}));
test('DOMモック: 診断用hidden経路は常に発音不可',()=>fixture(({visible})=>assert.equal(visible(true),false)));
