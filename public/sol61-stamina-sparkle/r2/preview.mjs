import {VERSION,AUTHOR,DURATION_MS,FIXTURE,phaseAt,createRenderer} from './effect.mjs';
import {createSound} from './sound.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify'),$=id=>document.getElementById(id),surface=$('surface'),status=$('status');
if(query.has('embed'))document.body.dataset.embed='true';
const sound=createSound({verify}),diagnostics=[];let renderer=null,age=0,previous=0,playing=true,eventNumber=1,lastReceipt=null,raf=0,disposed=false,gapMax=0,errors=[];
const currentId=()=>`${VERSION}-preview-${eventNumber}`;
function settings(){const r=surface.getBoundingClientRect();return {causeId:currentId(),receiverId:'preview-sophia',ageMs:age,anchor:{x:r.width*Number($('x').value)/100,y:r.height*Number($('y').value)/100},heightPx:Number($('height').value),source:$('source').checked,receiver:$('receiver').checked,cross:$('cross').checked,post:$('post').checked,body:$('body').checked,reducedMotion:$('reduced').checked,lightBackground:$('background').value==='light'};}
function evidence(){return {version:VERSION,author:AUTHOR,adoption:'unadopted',verify,verifyAudioMuted:sound.verifyMuted,ageMs:age,phase:phaseAt(age),lastReceipt,submissions:renderer?.submissions??0,maxRafGapMs:gapMax,activeVoices:sound.activeVoices,diagnostics:diagnostics.slice(),errors:errors.slice(),quality:'not_run',gameIntegration:'not_run'};}
window.__dvaStaminaSparklePreview={evidence,setAge(value){if(!Number.isFinite(value)||value<0||value>1500)throw Error('invalid age');playing=false;age=value;sound.stop();$('age').value=String(value);},reset(){replay();},setControls(values){for(const [key,value]of Object.entries(values)){const element=$(key);if(!element)throw Error('unknown control '+key);if(element.type==='checkbox')element.checked=Boolean(value);else element.value=String(value)}},dispose};
function replay(){sound.stop();age=0;eventNumber++;playing=true;previous=performance.now();if(!verify&&soundEnabled)sound.play(currentId(),{ageMs:0,rate:Number($('rate').value)}).catch(fail);}
let soundEnabled=false;$('replay').onclick=replay;$('pause').onclick=()=>{playing=!playing;sound.setRate(playing?Number($('rate').value):0)};
$('age').oninput=()=>{playing=false;age=Number($('age').value);sound.stop()};$('rate').onchange=()=>sound.setRate(playing?Number($('rate').value):0);
$('sound').onclick=async()=>{if(verify){status.textContent='verifyでは音声は0に固定されています';return;}try{soundEnabled=true;await sound.activate();if(!disposed&&!document.hidden)replay();}catch(error){fail(error);}};
if(verify){$('sound').disabled=true;$('sound').textContent='verify: 無音固定';}
function fail(error){playing=false;errors.push({message:error?.message??String(error),stack:error?.stack??null});if(errors.length>16)errors.shift();document.body.dataset.failed='true';status.textContent='失敗: '+errors.at(-1).message;sound.stop();}
function frame(now){if(disposed)return;try{if(previous){const dt=now-previous;gapMax=Math.max(gapMax,dt);if(playing)age+=dt*Number($('rate').value);}previous=now;
  if(age>=DURATION_MS){sound.stop();if(playing&&$('loop').checked&&age>=DURATION_MS+380){replay();}}
  const input=settings();lastReceipt=renderer.render({...input,ageMs:age});$('age').value=String(Math.min(1500,Math.round(age)));$('ageText').textContent=`${Math.round(age)} ms`;
  status.textContent=`${phaseAt(age)} · ${Math.round(age)} E-ms · ${Number($('height').value)}px · GPU提出 ${lastReceipt.submissions}\n${verify?'verify: 音声0固定':'SFXは「音を試す」から'} · 未採用 / 品質未検証`;
  document.body.dataset.ready='true';document.body.dataset.submissions=String(lastReceipt.submissions);
 }catch(e){fail(e);return;}raf=requestAnimationFrame(frame);}
async function init(){const response=await fetch(FIXTURE.path);if(!response.ok)throw Error('body fixture HTTP '+response.status);const bytes=await response.arrayBuffer();const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hex!==FIXTURE.sourceSha256)throw Error('body fixture hash mismatch');const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));try{renderer=await createRenderer(surface,image,{onDiagnostic:entry=>{diagnostics.push(entry);if(diagnostics.length>16)diagnostics.shift();if(entry.stage==='device-lost'||entry.stage==='uncaptured')fail(Error(entry.message));}});}finally{image.close();}if(disposed){renderer.dispose();return;}raf=requestAnimationFrame(frame);}
function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);renderer?.dispose();sound.dispose();}
document.addEventListener('visibilitychange',()=>{if(document.hidden){sound.stop();playing=false;previous=0}});window.addEventListener('pagehide',dispose);init().catch(fail);
