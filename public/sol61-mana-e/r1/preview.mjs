import {createRenderer} from './renderer.mjs';
import {VERSION,LOOP,SOURCE,RECEIVER,phaseAt,ReceiptGate,verificationMode} from './contract.mjs';
import {ManaSound} from './sfx.mjs';
const q=new URLSearchParams(location.search),verify=verificationMode(location.search),el=id=>document.getElementById(id);
if(q.has('embed'))document.body.classList.add('embed');
const single=q.has('single');if(single){el('stage').height=180;el('stage').style.height='180px';}
const sound=new ManaSound(location.search),gate=new ReceiptGate();gate.reset('preview');
const status={version:VERSION,author:'GPT-6.1-Sol',parentAuthor:'GPT-6-Astra',parentVersion:'mana-revision-astra-r07',verify,quality:'unaccepted',audioEnabled:false,loops:0,gaps:[],timeline:[],errors:[]};
const api=window.__manaPreview={status};let renderer,raf=0,running=true,time=0,previous=0,rate=1,lastLoop=-1,disposed=false,lastLabel=0;
const options=()=>({stars:el('stars').checked,glow:el('glow').checked,reduced:el('reduced').checked});
el('reduced').checked=q.has('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
api.enableAudio=async()=>{if(verify)return false;await sound.enable();sound.setMuted(false);status.audioEnabled=true;el('audio').textContent='ミュート';return true;};
api.snapshot=()=>({version:VERSION,verify,quality:status.quality,phase:status.phase,time:status.time,loops:status.loops,frames:renderer?.state.frames||0,errors:[...status.errors,...(renderer?.state.errors||[])],shaderMessages:renderer?.state.messages||[],audioGain:verify||sound.muted||!sound.context?0:.65,audioState:sound.context?.state||'not-created',voices:sound.sources.size,adapter:renderer?.state.adapterInfo,gpuMs:renderer?.state.gpuMs,cpuSubmitMs:renderer?.state.cpuSubmitMs,gaps:[...status.gaps]});
window.__gallerySfx={activateFromGesture:async()=>{if(verify)return false;const enabled=await api.enableAudio();if(enabled)api.resume();return enabled;},snapshot:api.snapshot};
if(verify){el('audio').disabled=true;el('audio').textContent='検証モード：音声0固定';}
el('audio').onclick=async()=>{if(status.audioEnabled){sound.setMuted(true);status.audioEnabled=false;el('audio').textContent='音を有効にする';}else await api.enableAudio();};
function draw(now){const t=time%LOOP;renderer.draw(t,options());status.time=t;status.phase=phaseAt(t);status.timeline.push({wall:now,actor:t,phase:status.phase,frame:renderer.state.frames});if(status.timeline.length>1200)status.timeline.shift();if(now-lastLabel>100){el('time').value=String(Math.min(t,1.8));el('state').textContent=`${status.phase} · ${t.toFixed(2)}秒 · ${renderer.state.frames} frames · 品質未受入`;lastLabel=now;}}
function tick(now){if(disposed)return;try{if(running){const gap=previous?now-previous:0;if(gap){status.gaps.push(gap);if(status.gaps.length>1200)status.gaps.shift();time+=gap/1000*rate;}const loop=Math.floor(time/LOOP);if(loop!==lastLoop){lastLoop=loop;status.loops++;sound.reset();gate.reset('preview');const receipt=gate.accept({type:'gain-mana',confirmed:true,actualDelta:1,source:SOURCE,receiver:RECEIVER,sessionId:'preview',recipientId:'fixture',causeId:`loop-${status.loops}`,startedAt:now-(time%LOOP)*1000});sound.play(receipt,time%LOOP);}draw(now);}previous=now;raf=requestAnimationFrame(tick);}catch(e){status.errors.push(String(e.stack||e));}}
api.setTime=async(t,overrides={})=>{if(!Number.isFinite(t))throw TypeError('time');running=false;time=t;sound.stop();for(const [k,v] of Object.entries(overrides))if(el(k))el(k).checked=!!v;draw(performance.now());await renderer.settled();return renderer.state;};
api.resume=()=>{running=true;time=0;previous=0;lastLoop=-1;status.gaps.length=0;status.timeline.length=0;};
api.setRate=v=>{if(!Number.isFinite(v)||v<=0||v>4)throw RangeError('rate');rate=v;};
el('pause').onclick=()=>{running=!running;previous=0;sound.stop();el('pause').textContent=running?'一時停止':'再生';};
el('time').oninput=()=>api.setTime(Number(el('time').value));for(const id of ['stars','glow','reduced'])el(id).onchange=()=>{if(!running)draw(performance.now());};
try{renderer=await createRenderer(el('stage'),{single});status.gpu=renderer.state;raf=requestAnimationFrame(tick);}catch(e){status.errors.push(String(e.stack||e));el('state').textContent=String(e);}
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);sound.dispose();renderer?.dispose();},{once:true});
