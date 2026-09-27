import {createBarrierRenderer} from './barrier-pro-renderer.mjs';
import {DURATIONS_MS,playSFX} from './barrier-pro-sampler.mjs';
const $=s=>document.getElementById(s),canvas=$('view'),status=$('status'),out=$('output');
let renderer=null,raf=0,audio=null,voice=null,start=0,cadence=[],looping=false,remainingLoops=0;
function save(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function state(){const branch=$('branch').value;return {branch,ageMs:Number($('timeNumber').value),hPx:Number($('h').value),background:Number($('background').value),coreEnabled:$('core').checked,grayscale:$('gray').checked,bandMask:1,hemisphere:Number($('mask').value),diagnostic:Number($('diagnostic').value),yawDeg:Number($('yaw').value),pitchDeg:Number($('pitch').value),authoritativeActive:['create','absorb','idle'].includes(branch)};}
function nativeSize(){const z=Number($('zoom').value);canvas.style.width=`${z*canvas.width/devicePixelRatio}px`;canvas.style.height=`${z*canvas.height/devicePixelRatio}px`;}
function stop(reason='manual'){if(raf)cancelAnimationFrame(raf);raf=0;looping=false;remainingLoops=0;voice?.cancel();voice=null;if(reason==='manual')status.classList.remove('failed');}
function summaryLine(s){return `${s.branch} ${s.ageMs.toFixed(1)}ms / H${s.hPx} / ${canvas.width}×${canvas.height}物理px / 内部SS2 / 4 depth peels＋overflow probe`;}
function draw(extra=''){if(!renderer)return;try{nativeSize();const s=renderer.draw(state());status.textContent=`${summaryLine(s)}\n造形品質：未判定。ループ実時間性・SFX実聴・実GPU品質は別検査。${extra?`\n${extra}`:''}`;status.classList.remove('failed');}catch(e){status.textContent=String(e.stack||e);status.classList.add('failed');}}
function setTime(t){$('time').value=String(t);$('timeNumber').value=String(t);draw();}
function defaultAge(branch){return ({create:300,absorb:175,fracture:240,bust:240,idle:0})[branch];}
function preset(){stop();setTime(defaultAge($('branch').value));}
async function sfx(){if($('branch').value==='idle')return;audio??=new AudioContext();await audio.resume();voice?.cancel();voice=playSFX(audio,$('branch').value,{volume:.35,pan:0});}
function loopInfo(){if(!cadence.length)return null;const avg=cadence.reduce((a,b)=>a+b,0)/cadence.length;const max=Math.max(...cadence),min=Math.min(...cadence);return {kind:'actual_requestAnimationFrame_intervals_not_GPU_timestamps',intervalsMs:cadence,meanMs:avg,minMs:min,maxMs:max,requestedLoops:Number($('loopCount').value),qualityApproval:false};}
async function playback({repeat=false}={}){
 stop('restart');if($('syncAudio').checked&&$('branch').value!=='idle')await sfx();
 const end=(DURATIONS_MS[$('branch').value]??650)+100;start=performance.now();cadence=[];looping=repeat;remainingLoops=repeat?Math.max(1,Number($('loopCount').value)||1):1;let previous=start;
 const frame=async now=>{cadence.push(now-previous);previous=now;const age=now-start;setTime(age);if(age<end){raf=requestAnimationFrame(frame);return;}
 remainingLoops--;if(looping&&remainingLoops>0){if($('syncAudio').checked&&$('branch').value!=='idle')await sfx();start=performance.now();previous=start;raf=requestAnimationFrame(frame);draw(`自動ループ残り ${remainingLoops}`);return;}
 raf=0;looping=false;const info=loopInfo();out.textContent=JSON.stringify(info,null,2);};
 raf=requestAnimationFrame(frame);
}
for(const id of ['h','background','core','gray','mask','diagnostic','yaw','pitch','zoom'])$(id).addEventListener('change',()=>{stop();draw();});
$('branch').addEventListener('change',preset);$('time').addEventListener('input',()=>{stop();$('timeNumber').value=$('time').value;draw();});$('timeNumber').addEventListener('input',()=>{stop();$('time').value=$('timeNumber').value;draw();});
$('play').onclick=()=>playback().catch(e=>{status.textContent=e.stack;status.classList.add('failed');});
$('autoplay').onclick=()=>playback({repeat:true}).catch(e=>{status.textContent=e.stack;status.classList.add('failed');});
$('stop').onclick=()=>stop();$('minus').onclick=()=>{stop();setTime((DURATIONS_MS[$('branch').value]??650)-1);};$('end').onclick=()=>{stop();setTime(DURATIONS_MS[$('branch').value]??650);};$('plus').onclick=()=>{stop();setTime((DURATIONS_MS[$('branch').value]??650)+50);};$('audio').onclick=()=>sfx().catch(e=>{status.textContent=e.stack;status.classList.add('failed');});
async function action(kind,fn){stop();status.textContent=`${kind} 実行中。画質合格判定ではありません。`;try{const result=await fn();out.textContent=JSON.stringify(result,null,2);save(`barrier-r05-${kind}-${Date.now()}.json`,result);draw();}catch(e){status.textContent=e.stack||String(e);status.classList.add('failed');}}
$('png').onclick=()=>{stop();draw();canvas.toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`r05-${state().branch}-${state().ageMs}-H${state().hPx}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);},'image/png');};
$('raw').onclick=()=>action('raw',async()=>{const b=await renderer.exportBuffers();for(const k of ['field','info','encoded']){const blob=new Blob([b[k].bytes]),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`r05-${state().branch}-${state().ageMs}-${k}.bin`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}return {...b,field:{row:b.field.row,format:'rgba16float'},info:{row:b.info.row,format:'rgba16float'},encoded:{row:b.encoded.row,format:'rgba8unorm'}};});
$('inspect').onclick=()=>action('readback',()=>renderer.inspect());$('parity').onclick=()=>action('scalar-parity',()=>renderer.numericParity());$('sweep').onclick=()=>action('prescribed-sweep',()=>renderer.prescribedSweep({maxFrames:1000}));
window.addEventListener('resize',()=>{nativeSize();draw();});
try{renderer=await createBarrierRenderer(canvas);window.barrierGallery={renderer,setTime,state,draw};out.textContent=JSON.stringify(renderer.metadata,null,2);preset();}catch(e){status.textContent='初期化失敗（合格扱いしない）\n'+(e.stack||e);save('barrier-r05-init-failure.json',{error:String(e.stack||e),qualityApproval:false});status.classList.add('failed');}
