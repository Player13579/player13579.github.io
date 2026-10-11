import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {eventAt,OBSERVER_SOURCE_SHA256,OBSERVER_WGSL,observerUniform,THROW_EVENT,verifyObserverSourceBytes,WORLD_SOURCE_SHA256,verifyWorldSourceBytes} from '../runtime.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const base={id:'throw:r4:source-bound',type:THROW_EVENT,variant:'flight:ordinary-crate',playerId:'p1',success:true,x:100,y:200,targetX:800,targetY:420,startedAt:1000,duration:600};

test('R4 world and observer shaders match root-authored byte pins and embedded observer text',async()=>{
 const rootWorld=await readFile(new URL('../world.wgsl',import.meta.url));
 const rootObserver=await readFile(new URL('../observer.wgsl',import.meta.url));
 const packageWorld=await readFile(new URL('../world.wgsl',import.meta.url));
 const packageObserver=await readFile(new URL('../observer.wgsl',import.meta.url));
 assert.equal(hash(rootWorld),WORLD_SOURCE_SHA256);assert.equal(hash(packageWorld),WORLD_SOURCE_SHA256);
 assert.equal(await verifyWorldSourceBytes(packageWorld),WORLD_SOURCE_SHA256);
 assert.equal(hash(rootObserver),OBSERVER_SOURCE_SHA256);assert.equal(hash(packageObserver),OBSERVER_SOURCE_SHA256);
 assert.equal(await verifyObserverSourceBytes(packageObserver),OBSERVER_SOURCE_SHA256);
 assert.equal(OBSERVER_WGSL,rootObserver.toString('utf8'));
});

test('R4 5x5 binomial PSF is contiguous and normalized to one',()=>{
 const shader=OBSERVER_WGSL;
 assert.ok(shader.includes('array<f32,5>(1.,4.,6.,4.,1.)'));
 assert.ok(shader.includes('for(var y=0u;y<5u;y++)'));assert.ok(shader.includes('for(var x=0u;x<5u;x++)'));
 assert.ok(shader.includes('i32(x)-2,i32(y)-2'));assert.ok(shader.includes('weights[x]*weights[y]/256.'));
 const w=[1,4,6,4,1], taps=[];let sum=0;
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const v=w[x+2]*w[y+2]/256;taps.push([x,y,v]);sum+=v;}
 assert.equal(taps.length,25);assert.equal(sum,1);assert.ok(taps.every(([, ,v])=>v>0));
 assert.deepEqual([Math.min(...taps.map(t=>t[0])),Math.max(...taps.map(t=>t[0])),Math.min(...taps.map(t=>t[1])),Math.max(...taps.map(t=>t[1]))],[-2,2,-2,2]);
});

test('source-off zeros both source gates; observer-off disables only emission scatter',async()=>{
 const p=eventAt(base,1300,{width:980,height:620,sourceEnabled:false});
 assert.equal(p.status,'active');assert.equal(p.uniform.length,16);assert.equal(p.uniform.byteLength,64);
 assert.equal(p.uniform[3],0);assert.equal(p.uniform[14],0);
 const world=(await readFile(new URL('../world.wgsl',import.meta.url))).toString();
 assert.ok(world.includes('f.view.w<.5 || f.optics.z<.5'));
 const off=observerUniform(false),on=observerUniform(true);
 assert.equal(off.byteLength,16);assert.deepEqual([...off],[0,0,0,0]);assert.deepEqual([...on],[1,0,0,0]);
 assert.ok(OBSERVER_WGSL.includes('let bloom=spread*(.16*clamp(observer.enabled,0.,1.))'));
 assert.ok(OBSERVER_WGSL.includes('let s=textureLoad(scene,p,0)'));
});

test('conservative shader cull contains the lifted path and head/wake support with padding',async()=>{
 const shader=(await readFile(new URL('../world.wgsl',import.meta.url))).toString();
 assert.ok(shader.includes('let lower=min(f.route.xy,f.route.zw)-vec2f(60.*scale,max(f.clock.z,0.)+60.*scale)'));
 assert.ok(shader.includes('let upper=max(f.route.xy,f.route.zw)+vec2f(60.*scale,max(-f.clock.z,0.)+60.*scale)'));
 const scale=2,a={x:120,y:190},b={x:760,y:430};
 for(const lift of [64,-18]){
  const lo={x:Math.min(a.x,b.x)-60*scale,y:Math.min(a.y,b.y)-Math.max(lift,0)-60*scale};
  const hi={x:Math.max(a.x,b.x)+60*scale,y:Math.max(a.y,b.y)+Math.max(-lift,0)+60*scale};
  for(let i=0;i<=100;i++){const t=i/100,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-lift*Math.sin(Math.PI*t);assert.ok(x>=lo.x&&x<=hi.x&&y>=lo.y&&y<=hi.y);}
  assert.ok(hi.x-lo.x>Math.hypot(b.x-a.x,b.y-a.y));
 }
});

test('R4 preserves 64-byte frame layout and successful ordinary-flight-only cause contract',()=>{
 const p=eventAt(base,1300,{width:980,height:620});
 assert.equal(p.uniform.length,16);assert.equal(p.uniform.byteLength,64);assert.equal(p.eventId,base.id);assert.equal(p.durationMs,600);
 assert.throws(()=>eventAt({...base,success:false},1300,{width:980,height:620}),/successful stable-cause/);
 assert.throws(()=>eventAt({...base,variant:'impact:crate'},1300,{width:980,height:620}),/ordinary action-item-throw flight/);
});
