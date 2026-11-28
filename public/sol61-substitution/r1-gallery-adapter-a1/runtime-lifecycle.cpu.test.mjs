import assert from 'node:assert/strict';
import { createPreviewRuntime } from './runtime.mjs';
const VERSION='substitution-sol61-r1', SCHEMA='dva-gallery-startup/v1', TOKEN='a'.repeat(32), ORIGIN='https://gallery.test';
function makeEnv({fetcher,rendererFactory,audioFactory}={}) {
  const posted=[], handlers=new Map();
  const parent={postMessage(message,target){posted.push({message,target});}};
  const canvas={isConnected:true,getBoundingClientRect(){return {width:800,height:440};}};
  const doc={visibilityState:'visible',querySelector(selector){return selector==='canvas'?canvas:{textContent:'',checked:true,addEventListener(){}};},addEventListener(){}};
  const win={parent,location:{origin:ORIGIN,search:`?galleryVersionId=${VERSION}&galleryStartupToken=${TOKEN}&galleryAttemptEpoch=1&verify=1`},navigator:{gpu:{}},addEventListener(name,fn){handlers.set(name,fn);},removeEventListener(name){handlers.delete(name);}};
  const runtime=createPreviewRuntime({windowRef:win,documentRef:doc,fetcher:fetcher||(async()=>({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer})),rendererFactory,audioFactory,now:()=>10,raf:()=>1,cancelRaf:()=>{},visibility:()=> 'visible'});
  return {runtime,posted,handlers,parent};
}
function mockRenderer({disposeResult={status:'disposed',serial:0,completedSerial:0,lost:{status:'destroyed'},errors:[]}}={}) {
  return {ready:Promise.resolve(),render:async input=>({status:'completed',recorded:true,submitted:true,completed:true,passes:1,drawCalls:1,serial:0,causeId:input.causeId,generation:input.generation,submittedMode:input.mode,sourceEligible:input.sourceEligible,mainOn:input.mainOn,targetGeneration:1,current:true,submittedAgeMs:input.ageMs,scopeResults:[{kind:'validation',error:null},{kind:'outOfMemory',error:null}],uncapturedErrors:[],viewport:{width:800,height:440,cssWidth:800,cssHeight:440,dpr:1},queueFence:{},queueFenceResult:{completed:true,serial:0,targetGeneration:1}}),dispose:async()=>disposeResult,snapshot:()=>({viewport:{backingWidth:800,backingHeight:440,cssWidth:800,cssHeight:440,dpr:1,targetGeneration:1}})};
}
function mockAudio({snapshot={retired:true,closed:true,closeSettled:true,contextState:'absent',activeVoices:0,pending:0,errors:[],cleanupErrors:[]}}={}) {return {stop:async()=>{},dispose:async()=>{},snapshot:()=>snapshot};}
async function requestRetire(env) {
  const handler=env.handlers.get('message'); assert.equal(typeof handler,'function');
  handler({source:env.parent,origin:ORIGIN,data:{schema:SCHEMA,token:TOKEN,versionId:VERSION,attemptEpoch:1,sequence:1,action:'retire'}});
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
}
{
 const env=makeEnv({rendererFactory:()=>mockRenderer(),audioFactory:()=>mockAudio()});
 await env.runtime.start(); await requestRetire(env);
 const ack=env.posted.find(x=>x.message.action==='retired');
 assert.ok(ack,'valid lifecycle should produce native retirement ACK');
 assert.equal(ack.target,ORIGIN); assert.equal(ack.message.type,'dva-effect-retired');
 assert.equal(ack.message.lifecycle.gpu.status,'disposed'); assert.equal(ack.message.lifecycle.audio.closed,true);
}
{
 const env=makeEnv({rendererFactory:()=>mockRenderer({disposeResult:{status:'disposed',serial:1,completedSerial:1,lost:{},errors:['device destroy failed']}}),audioFactory:()=>mockAudio()});
 await env.runtime.start(); await requestRetire(env);
 assert.equal(env.posted.some(x=>x.message.action==='retired'),false);
 assert.ok(env.posted.some(x=>x.message.action==='retire-error'&&x.message.type==='dva-effect-retire-error'));
}
{
 const env=makeEnv({rendererFactory:()=>mockRenderer(),audioFactory:()=>mockAudio({snapshot:{retired:true,closed:false,closeSettled:false,contextState:'running',activeVoices:1,pending:1,errors:[],cleanupErrors:[]}})});
 await env.runtime.start(); await requestRetire(env);
 assert.equal(env.posted.some(x=>x.message.action==='retired'),false);
 assert.ok(env.posted.some(x=>x.message.action==='retire-error'));
}
console.log('Runtime lifecycle CPU harness passed: native ACK only for disposal evidence; invalid GPU/audio evidence emits retire-error. No browser/GPU/audio acceptance implied.');
