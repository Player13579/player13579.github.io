import {EMPEffects,ActorClock,CONTRACT} from '../src/emp-e.js';
import {sampleStore} from '../src/sampler.js';
import {SCENARIOS,MATRIX_BRANCHES,dispatch,actorsAt,expectedAudio} from './scenarios.js';
import {actorOccluders} from './fixtures.js';
import {unlockAudioFromGesture} from './audio-control.js';
const $=s=>document.querySelector(s),clock=new ActorClock();
// Codex gallery adaptation: tour only the five authored branches in embed mode.
const params=new URLSearchParams(location.search),embedMode=params.get('embed')==='1',verifyMode=params.has('verify');
const embedBranches=['charge','normal','resonance','cancellation','suppression'];
document.body.classList.toggle('embed',embedMode);
document.body.classList.toggle('audio-gesture-ready',embedMode&&!verifyMode);
const state={scene:'all',playing:true,zoom:1,background:'dark',quality:'high',occlusion:'mixed',loop:true,tour:embedMode,markers:!embedMode,ranges:false,cursor:0,cycles:0,records:[],matrix:null,trace:null};
let fx=null,last=performance.now(),error=null,inspectionThrottle=0;
for(const[key,s]of Object.entries(SCENARIOS))$('#scenario').add(new Option(s.label,key));
function fail(e){error=String(e?.stack??e);$('#error-panel').hidden=false;$('#error-text').textContent=error;$('#runtime-status').textContent='WebGPU実行不可 / 実GPU・実聴・品質: not_run';state.playing=false;}
function scene(){return SCENARIOS[state.scene];}
function moveActors(){const actors=actorsAt(scene(),clock.ms);fx.setOccluders(actorOccluders(actors,state.occlusion,state.background==='light'));for(const e of fx.events.events.values()){const id=e.kind==='suppression'?e.binding.targetId:e.kind==='charge'?e.binding.owner:null;const a=actors.find(a=>a.id===id);if(a)fx.moveAttachment(e.id,a);}updateListener();return actors;}
function processTo(t){while(state.cursor<scene().commands.length&&scene().commands[state.cursor].at<=t)dispatch(fx,scene().commands[state.cursor++]);}
function rewind(t=0){if(!fx)return;fx.reset();state.cursor=0;state.trace={fromMs:t,frameCount:0,maxActorStepMs:0,previousMs:t,phaseFrames:{},seeked:t!==0};clock.reset(t);processTo(t);moveActors();fx.update({actorMs:t,rate:state.playing?clock.rate:0});fx.render();drawUI();}
function select(key){if(!SCENARIOS[key])throw new Error('Unknown scenario');state.scene=key;$('#scenario').value=key;$('#scene-label').textContent=scene().label;$('#scrub').max=scene().duration;document.querySelectorAll('[data-scene]').forEach(b=>b.classList.toggle('selected',b.dataset.scene===key));rewind(0);}
function setZoom(z){state.zoom=Number(z);$('#zoom').value=String(z);fx?.setView({center:{x:0,y:0},pixelsPerGamePixel:state.zoom});$('#scale-chip').textContent=`H64 = ${64*state.zoom} CSS px`;}
function setBackground(bg){state.background=bg;$('#background').value=bg;document.body.classList.toggle('light-stage',bg==='light');fx?.setBackground(bg==='light'?[.855,.890,.915,1]:[.032,.056,.081,1]);}
function setRate(r){clock.setRate(Number(r));$('#rate').value=String(r);fx?.update({actorMs:clock.ms,rate:state.playing?clock.rate:0});}
function setQuality(q){state.quality=q;$('#quality').value=q;fx?.setQuality(q);}
function pause(){state.playing=false;$('#play').textContent='再生';fx?.update({actorMs:clock.ms,rate:0});}
function play(){state.playing=true;$('#play').textContent='一時停止';last=performance.now();}
function seek(t){pause();rewind(Math.max(0,Math.min(scene().duration,Number(t))));}
function drawUI(){if(embedMode)return;const canvas=$('#ui'),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,rect.width,rect.height);if(!state.markers&&!state.ranges)return;
 const xy=p=>[rect.width/2+p.x*state.zoom,rect.height/2+p.y*state.zoom],ink=state.background==='light'?'#435c68':'#879ca9';
 c.font='10px ui-monospace,monospace';c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=1;
 if(state.ranges){c.save();c.setLineDash([3,6]);for(const sample of sampleStore(fx.events,clock.ms)){
  const radii=sample.kind==='normal'?[CONTRACT.normalRange]:sample.kind==='resonance'?[CONTRACT.killRadius,CONTRACT.damageRadius]:[];
  const center=xy(sample.origin);for(const r of radii){c.beginPath();c.arc(...center,r*state.zoom,0,Math.PI*2);c.stroke();c.fillText(`${sample.kind} ${r}px / UI ONLY`,center[0]+8,center[1]-r*state.zoom+13);}
 }c.restore();}
 if(state.markers){for(const a of actorsAt(scene(),clock.ms)){const[x,y]=xy(a);c.fillText(a.id,x-23,y+45*state.zoom);}
  const x=24,y=42,hh=64*state.zoom;c.beginPath();c.moveTo(x+6,y);c.lineTo(x,y);c.lineTo(x,y+hh);c.lineTo(x+6,y+hh);c.stroke();c.fillText(`H64 · ${hh}px`,x+11,y+hh/2+3);c.fillText('UI / NOT HITBOX',x,y+hh+18);
  for(const sample of sampleStore(fx.events,clock.ms).filter(s=>['resonance','cancellation'].includes(s.kind))){const[x,y]=xy(sample.origin);c.fillText(`${sample.kind} / AUTH MIDPOINT`,x+7,y+83*state.zoom);}
 }
}
function display(){const s=fx.snapshot();$('#clock').textContent=`${(clock.ms/1000).toFixed(3)} / ${(scene().duration/1000).toFixed(3)} s`;$('#scrub').value=clock.ms;
 $('#field-state').textContent=s.active.length?s.active.map(a=>`${a.kind} → ${a.information.operation}`).join(' / '):'情報場消去 / empty field';
 $('#states').replaceChildren(...(s.active.length?s.active.map(a=>{const n=document.createElement('span');n.textContent=`${a.kind}: ${a.phase}${a.authorityActive?'':' [cosmetic tail]'}`;return n;}):[Object.assign(document.createElement('span'),{textContent:'全効果消去 / no active geometry'})]));
 const log=s.eventLog.slice(-12).map(e=>`${e.atMs??'—'} ms | ${e.action} ${e.id??''} | ${e.accepted?'accepted':e.reason}`);$('#ledger').textContent=log.join('\n')+`\ntriangles: ${s.gpu.triangles} / samples: ${s.gpu.sampleCount} / gpu errors: ${s.gpu.errors.length}`;
 const a=s.audio;$('#audio-counts').textContent=`queued ${a.queued} / duplicate cause ${a.duplicateCauses}\nexpected causes ${expectedAudio(scene()).uniqueCausalVoices} / resolve +0 / extend +0\npre-unlock skipped ${a.skippedBeforeUnlock}\nworklet: ${a.worklet?`created ${a.worklet.created} / started ${a.worklet.started} / active ${a.worklet.active}`:'not_run'}\n実聴: ${$('#review-listened').checked?'手動記録あり（範囲はメモ）':'not_run'}`;
}
function recordCycle(){state.records.push({scene:state.scene,background:state.background,quality:state.quality,zoom:state.zoom,rate:clock.rate,occlusion:state.occlusion,coveredActorInterval:[state.trace?.fromMs??clock.ms,scene().duration],trace:state.trace,recordType:state.trace?.seeked?'partial_seek_traversal':'continuous_clock_traversal',visualQuality:'not_reviewed',listening:'not_run',expectedAudio:expectedAudio(scene()),renderCoverage:'phase counts and max gap must be reviewed; no automatic full-life approval',snapshot:fx.snapshot()});if(state.records.length>1024)state.records.shift();}
function matrixNext(){const m=state.matrix;if(!m)return false;if(m.index>=m.conditions.length){state.matrix=null;$('#matrix-status').textContent=`${m.conditions.length}条件の時計巡回完了。欠落相・フレーム間隔はログで確認。品質・実聴の合格ではありません。`;$('#matrix').disabled=false;$('#stop-matrix').disabled=true;pause();return true;}const v=m.conditions[m.index++];state.occlusion=v.occlusion;$('#occlusion').value=v.occlusion;setZoom(v.zoom);setBackground(v.background);setRate(v.rate);setQuality(v.quality);select(v.scene);play();$('#matrix-status').textContent=`巡回 ${m.index}/${m.conditions.length}: ${v.scene} · ${v.background} · ${v.quality} · ${v.rate}× · zoom${v.zoom} · ${v.occlusion}`;return true;}
function tick(now){const dt=Math.max(0,now-last);last=now;if(fx&&!error){try{
 if(state.playing){clock.advance(dt);const end=scene().duration;if(clock.ms>=end){clock.ms=end;processTo(end);moveActors();fx.update({actorMs:end,rate:clock.rate});fx.render();recordCycle();state.cycles++;if(state.matrix)matrixNext();else if(state.loop){if(state.tour){const keys=embedMode?embedBranches:Object.keys(SCENARIOS);select(keys[(keys.indexOf(state.scene)+1)%keys.length]);}else rewind(0);}else pause();}}
 processTo(clock.ms);moveActors();fx.update({actorMs:clock.ms,rate:state.playing?clock.rate:0});fx.render();if(state.trace){const tr=state.trace;tr.frameCount++;tr.maxActorStepMs=Math.max(tr.maxActorStepMs,clock.ms-tr.previousMs);tr.previousMs=clock.ms;for(const s of sampleStore(fx.events,clock.ms)){const k=s.kind+':'+s.phase;tr.phaseFrames[k]=(tr.phaseFrames[k]??0)+1;}}drawUI();if(now-inspectionThrottle>110){display();inspectionThrottle=now;}
 }catch(e){fail(e);}}requestAnimationFrame(tick);}
$('#play').onclick=()=>state.playing?pause():play();$('#restart').onclick=()=>{rewind(0);play();};$('#scenario').onchange=e=>select(e.target.value);$('#scrub').oninput=e=>seek(e.target.value);
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{select(b.dataset.scene);play();});document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>seek(scene().markers[b.dataset.jump]));
$('#zoom').onchange=e=>setZoom(e.target.value);$('#background').onchange=e=>setBackground(e.target.value);$('#quality').onchange=e=>setQuality(e.target.value);$('#rate').onchange=e=>setRate(e.target.value);$('#occlusion').onchange=e=>state.occlusion=e.target.value;
for(const key of['loop','tour','markers','ranges'])$('#'+key).onchange=e=>state[key]=e.target.checked;
function updateListener(){if(!fx)return;const offset=+$('#distance').value;let origin={x:0,y:0};
 if($('#listener-anchor').value==='source'){const samples=sampleStore(fx.events,clock.ms).filter(s=>s.authorityActive);const chosen=samples.find(s=>s.kind===state.scene)||samples[0];if(chosen)origin=chosen.origin;}
 fx.setListener({x:origin.x,y:origin.y+offset});$('#distance-readout').textContent=`${offset} px / ${$('#listener-anchor').value==='source'?'active source':'world origin'} offset`;
}
$('#volume').oninput=e=>{if(!verifyMode)fx?.setVolume(+e.target.value);};$('#distance').oninput=updateListener;$('#listener-anchor').onchange=updateListener;
let audioUnlocking=false,previewAudioEnabled=false;
async function enablePreviewAudio(){if(previewAudioEnabled||audioUnlocking||!fx||verifyMode)return;audioUnlocking=true;try{if(!await unlockAudioFromGesture(fx,verifyMode))return;previewAudioEnabled=true;$('#audio').textContent='音声有効 / 再開始して聴取';$('#vfx').title='音声有効 / 再開始して聴取';rewind(0);play();}catch(e){$('#audio-counts').textContent=`Audio not_run: ${e.message}`;if(embedMode)$('#vfx').title=`Audio not_run: ${e.message}`;}finally{audioUnlocking=false;}}
$('#audio').onclick=async()=>{if(embedMode)return;await enablePreviewAudio();};
if(embedMode&&!verifyMode){$('#vfx').tabIndex=0;$('#vfx').title='Click or press Enter/Space to enable sound and restart this branch tour';$('#vfx').addEventListener('pointerup',enablePreviewAudio);$('#vfx').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')enablePreviewAudio();});}
$('#matrix').onclick=()=>{const conditions=[];for(const s of MATRIX_BRANCHES)for(const bg of['dark','light'])for(const q of['high','low'])for(const r of[1,2])for(const z of[1,2])for(const occlusion of['mixed','front','back'])conditions.push({scene:s,background:bg,quality:q,rate:r,zoom:z,occlusion});state.matrix={conditions,index:0};$('#matrix').disabled=true;$('#stop-matrix').disabled=false;matrixNext();};
$('#stop-matrix').onclick=()=>{state.matrix=null;pause();$('#matrix').disabled=false;$('#stop-matrix').disabled=true;$('#matrix-status').textContent='途中中止。完了条件だけを記録。';};
function report(){return{version:'r0.2',recordedAt:new Date().toISOString(),userAgent:navigator.userAgent,hardwareRenderAcceptance:'not_assigned',artisticQuality:'not_run',listening:{status:$('#review-listened').checked?'manual_record_entered':'not_run',notes:$('#review-notes').value},state:{...state,matrix:state.matrix?{index:state.matrix.index}:null},runtime:fx?.snapshot()??null,error};}
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='EMP-E-r0.2-runtime-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
try{fx=await EMPEffects.create({canvas:$('#vfx'),onError:m=>fail(new Error(m))});if(verifyMode)fx.setVolume(0);setZoom(1);setBackground('dark');select(params.get('scene')??(embedMode?'charge':'all'));if(params.has('time'))seek(Number(params.get('time')));
 $('#runtime-status').textContent='WebGPU初期化済み / 実GPU機種・全寿命の視覚品質・実聴は個別に記録してください。';
 window.empPreview={fx,state,clock,select,pause,play,seek,setZoom,setBackground,setRate,setQuality,setOcclusion:m=>state.occlusion=m,getState:()=>({...report(),snapshot:fx.snapshot()}),frameCheck:async()=>fx.gpu.frameCheck(sampleStore(fx.events,clock.ms),clock.ms),report};
}catch(e){fail(e);}requestAnimationFrame(tick);
