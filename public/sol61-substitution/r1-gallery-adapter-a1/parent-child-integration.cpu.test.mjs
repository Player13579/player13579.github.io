import assert from 'node:assert/strict';
import { createSubstitutionAttempt } from './substitution-parent-adapter.mjs';
import { createPreviewRuntime } from './runtime.mjs';
const origin='https://gallery.test';
const listeners=new Set(), childListeners=new Set(), outgoing=[];
const host={location:{origin},crypto:globalThis.crypto,
  addEventListener(type,fn){assert.equal(type,'message');listeners.add(fn);},
  removeEventListener(type,fn){listeners.delete(fn);},
  postMessage(data,target){outgoing.push({data,target});for(const fn of [...listeners])fn({source:childProxy,origin,data});}};
const childProxy={postMessage(data,target){assert.equal(target,origin);for(const fn of [...childListeners])fn({source:host,origin,data});}};
const iframe={ownerDocument:{defaultView:host},contentWindow:childProxy,src:''};
const attempt=createSubstitutionAttempt({iframe,origin});
const ready=attempt.start();
const childWindow={parent:host,location:{origin,search:new URL(iframe.src).search},navigator:{gpu:{}},
  addEventListener(type,fn){if(type==='message')childListeners.add(fn);},
  removeEventListener(type,fn){if(type==='message')childListeners.delete(fn);}};
const canvas={isConnected:true,getBoundingClientRect:()=>({width:800,height:440})};
const documentRef={visibilityState:'visible',querySelector:s=>s==='canvas'?canvas:{checked:true,addEventListener(){},textContent:''},addEventListener(){}};
const renderer={ready:Promise.resolve(),render:async input=>({status:'completed',recorded:true,submitted:true,completed:true,passes:1,drawCalls:1,serial:0,causeId:input.causeId,generation:input.generation,submittedMode:input.mode,sourceEligible:input.sourceEligible,mainOn:input.mainOn,targetGeneration:1,current:true,submittedAgeMs:input.ageMs,scopeResults:[{kind:'validation',error:null},{kind:'outOfMemory',error:null}],uncapturedErrors:[],viewport:{width:800,height:440,cssWidth:800,cssHeight:440,dpr:1},queueFence:{},queueFenceResult:{completed:true,serial:0,targetGeneration:1}}),dispose:async()=>({status:'disposed',serial:0,completedSerial:0,errors:[]}),snapshot:()=>({viewport:{backingWidth:800,backingHeight:440,cssWidth:800,cssHeight:440,dpr:1,targetGeneration:1}})};
const audio={stop:async()=>{},dispose:async()=>{},snapshot:()=>({retired:true,closed:true,closeSettled:true,contextState:'absent',activeVoices:0,pending:0,errors:[],cleanupErrors:[]})};
const runtime=createPreviewRuntime({windowRef:childWindow,documentRef,fetcher:async()=>({ok:true,arrayBuffer:async()=>new Uint8Array([1]).buffer}),rendererFactory:()=>renderer,audioFactory:()=>audio,now:()=>100,raf:()=>1,cancelRaf:()=>{},visibility:()=> 'visible'});
await runtime.start();
const frameReceipt={status:'completed',recorded:true,submitted:true,completed:true,current:true,mainOn:true,submittedMode:'playing',sourceEligible:true,passes:1,drawCalls:1,serial:1,causeId:1,generation:1,targetGeneration:1,submittedAgeMs:100,queueFence:{},queueFenceResult:{completed:true,serial:1,targetGeneration:1},scopeResults:[{kind:'validation',error:null},{kind:'outOfMemory',error:null}],uncapturedErrors:[],viewport:{width:800,height:440,cssWidth:800,cssHeight:440,dpr:1}};
const state={kind:'grant',submittedAgeMs:100,currentAgeMs:100,current:true,playing:true,mainOn:true,visible:true,canvasConnected:true,canvasWidth:800,canvasHeight:440,sourceVisible:true,sourceOn:true,sourceDrawable:true,causeId:1,generation:1,targetGeneration:1};
assert.equal(runtime.protocol.ready(frameReceipt,state),true);
const firstFrame=await ready;
assert.equal(firstFrame.privacyGate.authorized,true);
const lifecycle=await attempt.retire(); await new Promise(resolve=>setImmediate(resolve));
assert.equal(lifecycle.gpu.status,'disposed');
assert.equal(lifecycle.audio.closed,true);
assert.equal(outgoing.at(-1).data.action,'retired');
assert.equal(listeners.size,0);
assert.equal(childListeners.size,0);
attempt.close();
console.log('CPU parent-child protocol loop passed with exact technical R1 modules and mock GPU/audio. This does not establish real browser, GPU, audio, visual quality, or game integration.');
