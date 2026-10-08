import {createHumanTransmutationRenderer,loadOriginalSprite} from './core.mjs';
import {makeFixture,ORIGINAL_URL} from './fixture.mjs';
import {createHumanSFX} from './sfx.mjs';
import {createCompletionLatch} from './completion-latch.mjs'; // Private technical lifecycle prototype; original core is unchanged.
const query=new URLSearchParams(location.search),verify=query.has('verify');
const byId=id=>document.getElementById(id),canvas=byId('stage');
const ui={height:byId('height'),source:byId('source'),observer:byId('observer'),reduced:byId('reduced'),background:byId('background'),audio:byId('audio')};
if(['48','64','128'].includes(query.get('height')))ui.height.value=query.get('height');
ui.source.checked=query.get('source')!=='0';ui.observer.checked=query.get('observer')!=='0';ui.reduced.checked=query.get('reduced')==='1';ui.background.value=query.get('bg')==='light'?'light':'dark';
ui.audio.disabled=verify;ui.audio.checked=!verify&&query.get('audio')==='1';
const audio=createHumanSFX({verify,onStatus:s=>byId('audio-status').textContent=verify?'検証モード：音量0':s});
const completionLatch=createCompletionLatch({sourceHashes:{sourceManifestSha256:'4ad381469e2502fea57711ea8845e96ea877d13bef9c85f3c74e062d0eeeafd3',sourceSealSha256:'7b80ed73a2d2e4ba68cdb91cd3aaddf4170161453ee11012ab03da3fbf7765d6',sourcePreviewSha256:'8526d285af8a14199ce8f7936f6940f7f918746efadaa902f2364d9a7d3fc141',sourceCoreSha256:'3eaaf28da17476a15ed4d98c7ed3b533a06a5cc5f9cc63b36d08bee70c705380'}});window.__completionLatch=completionLatch; // Diagnostic-only derivative state.
let device,renderer,disposed=false,running=true,lastWall=performance.now(),age=0,generation=0,causeNumber=1,loops=0,visible=true,lastReceipt=null,ready=false,fatal=null,renderTail=Promise.resolve();
let contextRevision=0,terminal=null;const cancellations=[];
let causeId=`human-r4-fixture-${causeNumber}`;let causeAt=performance.now();
const held=query.has('phase')?Number(query.get('phase')):null;
if(held!==null&&Number.isFinite(held)&&held>=0){age=held;running=false;}
function tickClock(now=performance.now()) {
  // The replay handler and RAF sample this same clock when they execute.
  if(running&&!document.hidden)age+=now-lastWall;
  lastWall=now;
  if(age>=1200)audio.stop('expired'); // No rollover: actual expired elapsed remains cause-bound.
}
function inputForCurrentFrame(){const r=canvas.getBoundingClientRect();const input=makeFixture({height:Number(ui.height.value),width:r.width,viewportHeight:r.height,causeId,generation,eventAt:causeAt});input.target.invisible=!visible;return {input,width:r.width,height:r.height,dpr:window.devicePixelRatio||1};}
function playAudio(){const expected=causeId,expectedGeneration=generation;void audio.start({causeId,elapsedMs:age,durationMs:1200,valid:()=>!disposed&&ready&&!document.hidden&&visible&&running&&ui.audio.checked&&ui.source.checked&&causeId===expected&&generation===expectedGeneration&&(age+(running&&!document.hidden?performance.now()-lastWall:0))<1200});}
function contextKey(request){return JSON.stringify({input:request.input,width:request.width,height:request.height,dpr:request.dpr,sourceEnabled:request.sourceEnabled,observerEnabled:request.observerEnabled,reducedMotion:request.reducedMotion,background:request.background});}
function makeRequest(){return {...inputForCurrentFrame(),elapsedMs:age,sourceEnabled:ui.source.checked,observerEnabled:ui.observer.checked,reducedMotion:ui.reduced.checked,background:ui.background.value==='light'?[.70,.73,.76]:[.025,.035,.045]};}
function invalidate(reason){contextRevision++;terminal=null;cancellations.push({reason,causeId,generation,at:performance.now()});}
function terminalMatches(receipt,request){
  const [w,h]=receipt?.physicalExtent??[],[cw,ch]=receipt?.cssExtent??[];
  return receipt?.version==='human-transmutation-sol61-r4'&&receipt.causeId===request.input.event.id&&receipt.targetId===request.input.event.targetId&&receipt.scopeId===request.input.scope.id&&receipt.generation===request.input.scope.generation&&receipt.sourceSha256===request.input.sprite.sourceSha256&&receipt.elapsedMs===request.elapsedMs&&receipt.elapsedMs>=request.input.event.durationMs&&receipt.active===false&&receipt.queueCompleted===true&&Number.isInteger(receipt.submitted)&&receipt.submitted>0&&receipt.completed===receipt.submitted&&receipt.passes===4&&cw===request.width&&ch===request.height&&receipt.dpr===request.dpr&&w===Math.max(1,Math.round(cw*request.dpr))&&h===Math.max(1,Math.round(ch*request.dpr));
}
function draw(){
  const scheduledCause=causeId,scheduledGeneration=generation;
  const execute=async()=>{
    if(!ready||disposed||fatal||document.hidden||scheduledCause!==causeId||scheduledGeneration!==generation)return null;
    tickClock(performance.now());
    let request=makeRequest();
    if(running&&age>=1380&&terminal&&terminal.revision===contextRevision&&terminal.key===contextKey(request)){
      // This successor is born now, never backdated by legacy modulo.
      age=0;lastWall=performance.now();generation++;causeId=`human-r4-fixture-${++causeNumber}`;causeAt=lastWall;loops++;terminal=null;
      audio.stop('next-cause');if(ui.audio.checked)playAudio();request=makeRequest();
    }
    const revision=contextRevision,key=contextKey(request);
    const token=completionLatch.request(request);
    let receipt;
    try{receipt=await renderer.render(request);completionLatch.fulfilled(token,receipt);}
    catch(error){completionLatch.failed(token,error);throw error;}
    const current=!disposed&&!fatal&&!document.hidden&&revision===contextRevision&&request.input.event.id===causeId&&request.input.scope.generation===generation&&key===contextKey(makeRequest());
    if(!current)return receipt; // Keep actual completion evidence, do not authorize current ownership.
    lastReceipt=receipt;
    if(terminalMatches(receipt,request))terminal={revision,key,receipt};
    byId('status').textContent=`人物高 ${Number(ui.height.value)}px · ${Math.round(receipt.elapsedMs)} / 1200ms · ${running?'再生中':'静止'} · GPU完了 ${receipt.completed}`;
    byId('receipt').textContent=JSON.stringify({...receipt,loops,audio:audio.getState()},null,2);return receipt;
  };
  renderTail=renderTail.then(execute);return renderTail;
}
function fail(error){invalidate('fatal');fatal=String(error?.message??error);running=false;audio.stop('drawing-failed');byId('fatal').textContent=fatal;window.__humanError=fatal;}
async function frame(){if(disposed||fatal)return;tickClock(performance.now());if(ready&&!document.hidden){try{await draw();}catch(e){fail(e);}}if(!disposed)requestAnimationFrame(frame);}
byId('replay').addEventListener('click',()=>{invalidate('explicit-replay-cancel');lastWall=performance.now();age=0;generation++;causeId=`human-r4-fixture-${++causeNumber}`;causeAt=lastWall;running=true;audio.stop('replay');if(ui.audio.checked)playAudio();void draw().catch(fail);});
byId('pause').addEventListener('click',()=>{tickClock(performance.now());invalidate('pause-toggle');running=!running;lastWall=performance.now();audio.stop('pause-toggle');if(running&&ui.audio.checked)playAudio();void draw().catch(fail);});
for(const [key,element]of Object.entries(ui))element.addEventListener('change',()=>{tickClock(performance.now());invalidate('control-change');if(key==='source'&&!element.checked)audio.stop('source-off');if(key==='audio'){if(element.checked)playAudio();else audio.stop('audio-off');}void draw().catch(fail);});
document.addEventListener('visibilitychange',()=>{invalidate('visibility-change');lastWall=performance.now();if(document.hidden)audio.stop('hidden');else if(ready)void draw().catch(fail);});
const resizeObserver=new ResizeObserver(()=>{invalidate('resize');if(ready)void draw().catch(fail);});resizeObserver.observe(canvas);
async function dispose(){if(disposed)return;invalidate('disposed');disposed=true;ready=false;resizeObserver.disconnect();await renderTail.catch(()=>{});renderer?.dispose();await audio.dispose();device?.destroy();}
window.addEventListener('pagehide',()=>{void dispose();},{once:true});
window.__human={
  getState:()=>({lifecycle:{contextRevision,terminal:terminal?.receipt??null,cancellations:[...cancellations]},ready,fatal,verify,running,age,causeId,generation,loops,receipt:lastReceipt,audio:audio.getState(),renderer:renderer?.getState(),compilationMessages:renderer?.compilationMessages??[]}),
  async hold(ms){if(!Number.isFinite(ms)||ms<0)throw new TypeError('Nonnegative exact phase required');invalidate('diagnostic-hold');running=false;age=ms;lastWall=performance.now();audio.stop('held');await draw();return this.getState();},
  async controls({source,observer,reduced,height,background,targetVisible}={}){tickClock(performance.now());invalidate('controls');if(source!==undefined)ui.source.checked=!!source;if(observer!==undefined)ui.observer.checked=!!observer;if(reduced!==undefined)ui.reduced.checked=!!reduced;if(height!==undefined){if(![48,64,128].includes(height))throw new RangeError('H48/H64/H128');ui.height.value=String(height);}if(background!==undefined){if(!['dark','light'].includes(background))throw new RangeError('dark/light');ui.background.value=background;}if(targetVisible!==undefined)visible=!!targetVisible;if(!ui.source.checked||!visible)audio.stop('source-or-target-off');await draw();return this.getState();},
  async replay(){byId('replay').click();await renderTail;return this.getState();},
  async pause(){byId('pause').click();await renderTail;return this.getState();},
  async inspectEmission(){await renderTail;return renderer.inspectEmission();},
  dispose,
};
try {
  if(!navigator.gpu)throw new Error('WebGPUが必要です');
  const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');device=await adapter.requestDevice();
  device.addEventListener('uncapturederror',e=>fail(e.error));
  void device.lost.then(info=>{if(!disposed)fail(new Error(`GPU device lost: ${info.reason}`));});
  const registration=makeFixture().sprite;
  const original=await loadOriginalSprite(device,{url:ORIGINAL_URL,...registration});
  renderer=await createHumanTransmutationRenderer({canvas,device,original:original.texture,originalRegistration:registration});
  ready=true;lastWall=performance.now();await draw();window.__humanReady=true;requestAnimationFrame(frame);
} catch(e){fail(e);}
