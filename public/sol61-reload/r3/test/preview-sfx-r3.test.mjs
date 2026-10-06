import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {makeMockGpu} from '../mock-gpu.mjs';
import {renderReloadPcm} from '../creative/reload-e-sfx-sol61-r3.mjs';
import {createGalleryStartup} from '../startup-bootstrap.mjs';

const route=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let importSequence=0;
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
function mockAudio({resumePending=false}={}){
 const resumeGate=resumePending?deferred():null,contexts=[];
 class MockAudioContext{
  constructor(){this.state='suspended';this.sampleRate=48000;this.currentTime=0;this.destination={};this.buffers=[];this.sources=[];contexts.push(this);}
  resume(){const finish=()=>{this.state='running';return undefined};if(resumeGate)return resumeGate.promise.then(finish);return Promise.resolve(finish());}
  close(){this.state='closed';return Promise.resolve();}
  createGain(){const param={value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}};return{gain:param,connect(){},disconnect(){}};}
  createStereoPanner(){const param={value:0};return{pan:param,connect(){},disconnect(){}};}
  createBuffer(_channels,length,rate){const data=new Float32Array(length),buffer={data,sampleRate:rate,getChannelData(){return data;}};this.buffers.push(buffer);return buffer;}
  createBufferSource(){const src={onended:null,buffer:null,started:null,stopped:false,connect(){},disconnect(){},start(when,offset){this.started={when,offset};},stop(){this.stopped=true;this.onended?.();}};this.sources.push(src);return src;}
 }
 return{MockAudioContext,contexts,resumeGate};
}
function environment({verify=false,missingGpu=false,delayedGpu=false,resumePending=false}={}){
 const original=new Map(),keys=['window','document','navigator','location','devicePixelRatio','requestAnimationFrame','cancelAnimationFrame','fetch','performance'];
 for(const key of keys)original.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
 const gpu=makeMockGpu();const adapterGate=delayedGpu?deferred():null;const realRequestAdapter=gpu.gpu.requestAdapter.bind(gpu.gpu);
 if(missingGpu)gpu.gpu.requestAdapter=async()=>null;
 else if(adapterGate)gpu.gpu.requestAdapter=()=>adapterGate.promise;
 let now=0,nextRaf=0;const rafs=new Map(),audio=mockAudio({resumePending});
 const events={};
 function element({value='',checked=false}={}){return{value,checked,disabled:false,textContent:'',classList:{add(){},remove(){}},listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},emit(name){return this.listeners[name]?.({type:name,target:this});},click(){return this.emit('click');}};}
 const ids={height:element({value:'64'}),weapon:element({value:'handgun'}),visibility:element({value:'1'}),obs:element({checked:true}),main:element({checked:true}),reduced:element({checked:true}),status:element(),start:element(),complete:element(),off:element(),gpuProbeControls:element(),gpuProbeButton:element()};
 const canvas={clientWidth:640,clientHeight:360,width:0,height:0,isConnected:true,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},getContext(type){return type==='webgpu'?gpu.context:null;}};
 let visible='visible';
 const doc={documentElement:{classList:{add(){}}},visibilityState:'visible',listeners:{},querySelector(selector){return selector==='#reload'?canvas:selector==='#status'?ids.status:null;},getElementById(id){return ids[id]||null;},addEventListener(name,fn){this.listeners[name]=fn;}};
 const parent={messages:[],postMessage(message){this.messages.push(message);}};
 const href=`http://gallery.invalid/public/sol61-reload/r3/index.html?embed=1&galleryStartupToken=fixture-token&galleryVersionId=reload-e-zero-sol61-r3&galleryAttemptEpoch=1${verify?'&verify=1':''}`;
 const win={parent,location:{href,origin:'http://gallery.invalid',search:new URL(href).search},AudioContext:audio.MockAudioContext,webkitAudioContext:null,listeners:{},addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},removeEventListener(name,fn){this.listeners[name]=(this.listeners[name]||[]).filter(value=>value!==fn);},__gallerySfx:null};
 Object.defineProperties(doc,{visibilityState:{get(){return visible;},set(v){visible=v;}}});
 const location=win.location;
 const set=(key,value)=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 set('window',win);set('document',doc);set('navigator',{gpu:gpu.gpu});set('location',location);set('devicePixelRatio',1);
 set('performance',{now:()=>now});win.performance=globalThis.performance;set('requestAnimationFrame',fn=>{const id=++nextRaf;rafs.set(id,fn);return id;});set('cancelAnimationFrame',id=>rafs.delete(id));
 win.__reloadGalleryStartup=createGalleryStartup(win);
 const wgsl=readFile(path.join(route,'creative/reload-e-sol61-r2.wgsl'),'utf8');
 set('fetch',async()=>({text:()=>wgsl}));
 const nextFrame=async(ms=16)=>{now+=ms;const first=rafs.entries().next();if(first.done)return false;const[id,fn]=first.value;rafs.delete(id);fn(now);await flush();return true;};
 const startPreview=async()=>{const loaded=import(`${pathToFileURL(path.join(route,'preview.mjs')).href}?test=${++importSequence}`);await flush();return {win,doc,ids,canvas,startup:win.__reloadGalleryStartup,rafs,gpu,audio,nextFrame,awaitLoaded:()=>loaded,setNow:v=>{now=v;},setVisible:v=>{visible=v;doc.listeners.visibilitychange?.();},pagehide:()=>{for(const fn of win.listeners.pagehide||[])fn();},restore};};
 function restore(){for(const key of keys){const d=original.get(key);if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}}
 return{startPreview,adapterGate,resolveGpu:()=>adapterGate?.resolve(realRequestAdapter()),audio,gpu,restore};
}
async function waitReady(s){await s.awaitLoaded();for(let i=0;i<40&&s.startup.snapshot().status==='pending';i++)await flush();return s.startup.snapshot().status==='ready';}

test('actual preview waits for a submitted visible frame and forwards reduced-motion contact timing',async()=>{
 const env=environment({delayedGpu:true,resumePending:true});
 try{
  const s=await env.startPreview();
  const pending=s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});
  await flush();assert.equal(env.audio.contexts.length,1);assert.equal(env.audio.contexts[0].sources.length,0,'gesture alone must not play before a GPU submission');
  env.resolveGpu();
  assert.equal(await waitReady(s),true);assert.equal(s.startup.snapshot().firstFrame.completed,true);assert.equal(env.audio.contexts[0].sources.length,0,'the unresolved gesture still cannot play before resume completes');
  env.audio.resumeGate.resolve();
  const activation=await pending;assert.equal(activation.state,'active');assert.equal(env.audio.contexts[0].sources.length,1);
  assert.equal(env.audio.contexts[0].sources[0].started.offset,0);
  const pcm=env.audio.contexts[0].buffers[0].data,expected=renderReloadPcm({phase:'start',sampleRate:48000,reducedMotion:true}).pcm;
  assert.deepEqual(pcm,expected,'submitted-frame reducedMotion must select the reduced contact timeline');
  const normal=renderReloadPcm({phase:'start',sampleRate:48000,reducedMotion:false}).pcm;assert.notDeepEqual(pcm,normal);
  assert.equal(s.startup.snapshot().firstFrame.causeId,'fixture:reload-1:start');
 } finally {env.restore();}
});

test('late user gesture seeks into the current start cause instead of replaying from zero',async()=>{
 const env=environment();
 try{const s=await env.startPreview();assert.equal(await waitReady(s),true);s.setNow(320);const result=await s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});assert.equal(result.state,'active');assert.equal(env.audio.contexts[0].sources.length,1);assert.equal(env.audio.contexts[0].sources[0].started.offset,.32);assert.deepEqual(env.audio.contexts[0].buffers[0].data,renderReloadPcm({phase:'start',sampleRate:48000,reducedMotion:true}).pcm);}
 finally{env.restore();}
});

test('missing GPU readiness cannot authorize preview SFX or create an AudioContext',async()=>{
 const env=environment({missingGpu:true});
 try{const s=await env.startPreview();await s.awaitLoaded();assert.equal(s.startup.snapshot().status,'error');const result=await s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});assert.equal(result.state,'unavailable');assert.equal(env.audio.contexts.length,0);assert.equal(s.startup.snapshot().firstFrame,undefined);}
 finally{env.restore();}
});

test('late gesture completion after cause replacement stays silent; new cause requires its own submitted frame',async()=>{
 const env=environment({resumePending:true});
 try{
  const s=await env.startPreview();assert.equal(await waitReady(s),true);s.ids.start.click();await flush();
  const activation=s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});await flush();assert.equal(env.audio.contexts.length,1);
  s.ids.off.click();env.audio.resumeGate.resolve();assert.equal((await activation).state,'active');await flush();assert.equal(env.audio.contexts[0].sources.length,0,'cancelled old cause must not start after resume');
  s.ids.start.click();await flush();assert.equal(env.audio.contexts[0].sources.length,0,'new start also waits for its own submitted frame');
  await s.nextFrame(24);assert.equal(env.audio.contexts[0].sources.length,1);assert.equal(env.audio.contexts[0].sources[0].started.offset,0.024);
 } finally{env.restore();}
});

test('source/main/visible off cancel voices, verify remains hard-silent, and pagehide disposes audio',async()=>{
 const env=environment();
 try{
  const s=await env.startPreview();assert.equal(await waitReady(s),true);const activation=await s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});assert.equal(activation.state,'active');assert.equal(env.audio.contexts[0].sources.length,1);
  s.setVisible('hidden');assert.equal(env.audio.contexts[0].sources[0].stopped,true,'hidden document cancels current cause voice');
  s.setVisible('visible');await s.nextFrame(20);assert.equal(env.audio.contexts[0].sources.length,1,'same cause is not re-emitted after visibility returns');
  s.ids.start.click();await s.nextFrame(20);assert.equal(env.audio.contexts[0].sources.length,2,'next cause admits after its own submitted frame');
  s.ids.main.checked=false;s.ids.main.emit('change');assert.equal(env.audio.contexts[0].sources[1].stopped,true);
  s.ids.main.checked=true;s.ids.main.emit('change');await s.nextFrame(20);assert.equal(env.audio.contexts[0].sources.length,2,'same cause is not re-emitted after Main-off cancellation');
  s.ids.off.click();await s.nextFrame(20);assert.equal(env.audio.contexts[0].sources.length,2,'source-off event cannot create a voice');
  s.pagehide();await flush();assert.equal(env.audio.contexts[0].state,'closed');
 } finally{env.restore();}
});

test('verify path never creates audio context or starts a source',async()=>{
 const env=environment({verify:true});
 try{const s=await env.startPreview();assert.equal(await waitReady(s),true);const result=await s.win.__gallerySfx.activateFromGesture({id:'reload-e-zero-sol61-r3'});assert.equal(result.state,'silent');assert.equal(env.audio.contexts.length,0);assert.equal(s.startup.snapshot().status,'ready');}
 finally{env.restore();}
});
