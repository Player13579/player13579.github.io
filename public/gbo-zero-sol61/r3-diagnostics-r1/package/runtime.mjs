import {VERSION,DURATION_MS,DEFAULTS,fixturePose} from './model.mjs';
import {createGboLayer} from './renderer.mjs';
import {GboSound} from './sfx.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify');if(params.has('embed'))document.documentElement.classList.add('embed');
const canvas=document.querySelector('#effect'),status=document.querySelector('#status');
const sound=new GboSound({verify});let options={...DEFAULTS,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
let device,context,layer,lastReceipt=null,ready=false,disposed=false,fatal=null,busy=false,pending=false,raf=0,cause=0,generation=0,origin=0,heldAge=0,mode='stopped',stage='magazine-commit',angle=0,loopAfter=0,disposePromise=null;
const jobs=new Set();const errors=[];let expectedLoss=false,deviceLoss=null;
const age=()=>mode==='playing'?performance.now()-origin:heldAge;
function snapshot(){return {versionId:VERSION,status:disposed?'disposed':fatal?'failed':ready?'ready':'initializing',ready,disposed,mode,stage,cause,generation,ageMs:age(),lastReceipt,options:{...options},verify,muted:sound.muted,activeVoices:sound.voices.size,pendingTasks:jobs.size,fatal,errors:[...errors],deviceLoss,renderer:layer?.snapshot()??null};}
function track(p){jobs.add(p);p.then(()=>jobs.delete(p),()=>jobs.delete(p));return p;}
function fail(error){errors.push(String(error?.message??error));fatal=errors.at(-1);cancelAnimationFrame(raf);raf=0;sound.stop();status.textContent='失敗: '+fatal;}
function replay(){if(disposed||fatal||!ready)return false;cause++;generation++;origin=performance.now();heldAge=0;mode='playing';loopAfter=0;request();schedule();return cause;}
function hold(value){if(!Number.isFinite(value)||value<0)throw new RangeError('hold age');generation++;heldAge=value;mode='held';sound.stop();request();return snapshot();}
function stop(){generation++;heldAge=DURATION_MS;mode='stopped';sound.stop();request();return snapshot();}
function setStage(value){if(!['magazine-commit','weapon-retirement'].includes(value))throw new RangeError('stage');stage=value;document.querySelector('#stage').value=value;return replay();}
function setOptions(patch){const next={...options,...patch};for(const k of ['source','observer','fixture','reducedMotion'])if(typeof next[k]!=='boolean')throw new TypeError(k);if(!Number.isFinite(next.fixtureH)||next.fixtureH<16||next.fixtureH>512||!Number.isFinite(next.background)||next.background<0||next.background>1)throw new RangeError('display options');options=next;generation++;request();return snapshot();}
function dimensions(){const r=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;return {width:Math.max(1,Math.round(r.width*dpr)),height:Math.max(1,Math.round(r.height*dpr)),dpr};}
async function draw(){
 if(!ready||disposed||fatal)return;if(busy){pending=true;return;}busy=true;
 try{
  const dim=dimensions();canvas.width=dim.width;canvas.height=dim.height;
  const captured={cause,generation,ageMs:age(),stage,mode};
  const frame={...captured,width:dim.width,height:dim.height,pose:fixturePose({width:dim.width,height:dim.height,H:options.fixtureH*dim.dpr,angle}),options:{...options}};
  const encoder=device.createCommandEncoder(),token=layer.record({encoder,targetView:context.getCurrentTexture().createView(),frame});device.queue.submit([encoder.finish()]);const receipt=await token.settle();lastReceipt=receipt;
  if(!disposed&&captured.cause===cause&&captured.generation===generation)sound.play(receipt,{cause,generation,ageMs:age(),mode});
  status.textContent=`${stage} · ${mode} · ${Math.round(captured.ageMs)}ms · GPU ${receipt.submission}`;
 }catch(error){fail(error);}finally{busy=false;if(pending&&!disposed&&!fatal){pending=false;queueMicrotask(request);}}
}
function request(){if(!ready||disposed||fatal)return;void track(draw());}
function schedule(){if(!raf&&!disposed&&!fatal&&ready&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(){raf=0;if(disposed||fatal)return;if(mode==='playing'&&age()>=DURATION_MS){mode='stopped';heldAge=DURATION_MS;loopAfter=performance.now()+450;request();}else if(mode==='stopped'&&loopAfter&&performance.now()>=loopAfter)replay();else if(mode==='playing')request();schedule();}
async function dispose(){
 if(disposePromise)return disposePromise;disposed=true;ready=false;generation++;mode='stopped';cancelAnimationFrame(raf);raf=0;
 disposePromise=(async()=>{const collected=[];const settle=async p=>{try{await p;}catch(e){collected.push(String(e));}};await settle(Promise.allSettled([...jobs]));await settle(sound.dispose());await settle(layer?.dispose());context?.unconfigure();expectedLoss=true;device?.destroy();if(device)await settle(device.lost.then(info=>{deviceLoss={reason:info.reason,message:info.message,expected:expectedLoss};}));errors.push(...collected);return snapshot();})();return disposePromise;
}
globalThis.__gboZero=Object.freeze({snapshot,replay,hold,stop,setStage,setOptions,setAngle(value){if(!Number.isFinite(value))throw new RangeError('angle');angle=value;generation++;request();return snapshot();},enableAudio:()=>sound.enable(),setMuted:v=>sound.setMuted(v),dispose});
document.querySelector('#replay').onclick=replay;document.querySelector('#stage').onchange=e=>setStage(e.target.value);document.querySelector('#audio').onclick=()=>sound.enable().catch(fail);
addEventListener('resize',request);addEventListener('pagehide',()=>void dispose());document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;sound.stop();}else schedule();});
async function initialize(){
 try{
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw new Error('WebGPU required');device=await adapter.requestDevice();if(disposed){device.destroy();return;}
  device.addEventListener('uncapturederror',event=>fail(event.error));device.lost.then(info=>{deviceLoss={reason:info.reason,message:info.message,expected:expectedLoss};if(!expectedLoss&&!disposed)fail(new Error('device lost: '+info.message));});
  const shaderPairs=await Promise.all(['common','world','observer'].map(async name=>{const response=await fetch(`./${name}.wgsl`);if(!response.ok)throw new Error(`${name} shader HTTP ${response.status}`);return [name,await response.text()];}));
  if(disposed)return;context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  layer=await createGboLayer({device,format,shaders:Object.fromEntries(shaderPairs)});if(disposed){await layer.dispose();return;}
  ready=true;heldAge=0;mode='held';await draw();if(disposed||fatal)return;
  const msg={type:'dva-gallery-startup/v1',versionId:VERSION,status:'ready',completed:true,receipt:lastReceipt};parent.postMessage(msg,location.origin);replay();schedule();
 }catch(error){fail(error);void dispose();}
}
void track(initialize());
