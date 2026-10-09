import {createHumanTransmutationRenderer,loadOriginalSprite} from './core.mjs';
import {makeFixture,ORIGINAL_URL} from './fixture.mjs';
import {createHumanSFX} from './sfx.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify');
const byId=id=>document.getElementById(id),canvas=byId('stage');
const ui={height:byId('height'),source:byId('source'),observer:byId('observer'),glints:byId('glints'),reduced:byId('reduced'),background:byId('background'),audio:byId('audio')};
if(['48','64','128'].includes(query.get('height')))ui.height.value=query.get('height');
ui.source.checked=query.get('source')!=='0';ui.glints.checked=query.get('glints')!=='0';ui.observer.checked=query.get('observer')!=='0';ui.reduced.checked=query.get('reduced')==='1';ui.background.value=query.get('bg')==='light'?'light':'dark';
ui.audio.disabled=verify;ui.audio.checked=!verify&&query.get('audio')==='1';
const audio=createHumanSFX({verify,onStatus:s=>byId('audio-status').textContent=verify?'検証モード：音量0':s});
let device,renderer,disposed=false,running=true,lastWall=performance.now(),age=0,generation=0,causeNumber=1,loops=0,visible=true,lastReceipt=null,ready=false,fatal=null,renderTail=Promise.resolve();
let causeId=`human-r11-fixture-${causeNumber}`;let causeAt=performance.now();
const held=query.has('phase')?Number(query.get('phase')):null;
if(held!==null&&Number.isFinite(held)&&held>=0){age=held;running=false;}
function tickClock(now=performance.now()) {
  // The replay handler and RAF sample this same clock when they execute.
  if(running&&!document.hidden)age+=now-lastWall;
  lastWall=now;
  if(running&&age>=1380){age%=1380;generation++;causeId=`human-r11-fixture-${++causeNumber}`;causeAt=now-age;loops++;audio.stop('next-cause');if(ui.audio.checked)playAudio();}
}
function inputForCurrentFrame(){const r=canvas.getBoundingClientRect();const input=makeFixture({height:Number(ui.height.value),width:r.width,viewportHeight:r.height,causeId,generation,eventAt:causeAt});input.target.invisible=!visible;return {input,width:r.width,height:r.height,dpr:window.devicePixelRatio||1};}
function playAudio(){const expected=causeId,expectedGeneration=generation;void audio.start({causeId,elapsedMs:age,durationMs:1200,valid:()=>!disposed&&ready&&!document.hidden&&visible&&running&&ui.audio.checked&&ui.source.checked&&causeId===expected&&generation===expectedGeneration&&age<1200});}
function draw(){
  const request={...inputForCurrentFrame(),elapsedMs:age,sourceEnabled:ui.source.checked,observerEnabled:ui.observer.checked,glintsEnabled:ui.glints.checked,reducedMotion:ui.reduced.checked,background:ui.background.value==='light'?[.70,.73,.76]:[.025,.035,.045]};
  const execute=async()=>{
    if(!ready||disposed)return null;
    lastReceipt=await renderer.render(request);
    byId('status').textContent=`人物高 ${Number(ui.height.value)}px · ${Math.round(lastReceipt.elapsedMs)} / 1200ms · ${running?'再生中':'静止'} · GPU完了 ${lastReceipt.completed}`;
    byId('receipt').textContent=JSON.stringify({...lastReceipt,loops,audio:audio.getState()},null,2);return lastReceipt;
  };
  renderTail=renderTail.then(execute);return renderTail;
}
function fail(error){fatal=String(error?.message??error);running=false;audio.stop('drawing-failed');byId('fatal').textContent=fatal;window.__humanError=fatal;}
async function frame(){if(disposed||fatal)return;tickClock(performance.now());if(ready&&!document.hidden){try{await draw();}catch(e){fail(e);}}if(!disposed)requestAnimationFrame(frame);}
byId('replay').addEventListener('click',()=>{lastWall=performance.now();age=0;generation++;causeId=`human-r11-fixture-${++causeNumber}`;causeAt=lastWall;running=true;audio.stop('replay');if(ui.audio.checked)playAudio();void draw().catch(fail);});
byId('pause').addEventListener('click',()=>{tickClock(performance.now());running=!running;lastWall=performance.now();audio.stop('pause-toggle');if(running&&ui.audio.checked)playAudio();void draw().catch(fail);});
for(const [key,element]of Object.entries(ui))element.addEventListener('change',()=>{tickClock(performance.now());if(key==='source'&&!element.checked)audio.stop('source-off');if(key==='audio'){if(element.checked)playAudio();else audio.stop('audio-off');}void draw().catch(fail);});
document.addEventListener('visibilitychange',()=>{lastWall=performance.now();if(document.hidden)audio.stop('hidden');else if(ready)void draw().catch(fail);});
const resizeObserver=new ResizeObserver(()=>{if(ready)void draw().catch(fail);});resizeObserver.observe(canvas);
async function dispose(){if(disposed)return;disposed=true;ready=false;resizeObserver.disconnect();await renderTail.catch(()=>{});renderer?.dispose();await audio.dispose();device?.destroy();}
window.addEventListener('pagehide',()=>{void dispose();},{once:true});
window.__human={
  getState:()=>({ready,fatal,verify,running,age,causeId,generation,loops,receipt:lastReceipt,audio:audio.getState(),renderer:renderer?.getState(),compilationMessages:renderer?.compilationMessages??[]}),
  async hold(ms){if(!Number.isFinite(ms)||ms<0)throw new TypeError('Nonnegative exact phase required');running=false;age=ms;lastWall=performance.now();audio.stop('held');await draw();return this.getState();},
  async controls({source,observer,glints,reduced,height,background,targetVisible}={}){tickClock(performance.now());if(source!==undefined)ui.source.checked=!!source;if(observer!==undefined)ui.observer.checked=!!observer;if(glints!==undefined)ui.glints.checked=!!glints;if(reduced!==undefined)ui.reduced.checked=!!reduced;if(height!==undefined){if(![48,64,128].includes(height))throw new RangeError('H48/H64/H128');ui.height.value=String(height);}if(background!==undefined){if(!['dark','light'].includes(background))throw new RangeError('dark/light');ui.background.value=background;}if(targetVisible!==undefined)visible=!!targetVisible;if(!ui.source.checked||!visible)audio.stop('source-or-target-off');await draw();return this.getState();},
  async replay(){byId('replay').click();await renderTail;return this.getState();},
  async pause(){byId('pause').click();await renderTail;return this.getState();},
  async inspectEmission(){await renderTail;return renderer.inspectEmission();},
  async inspectGlints(){await renderTail;return renderer.inspectGlints();},
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

