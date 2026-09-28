import {requestDevice} from '../src/gpu.js';
import {ManaGainAudio} from '../src/audio.js';
import {sampleTime,PHASES} from '../src/sampler.js';
import {envelope} from '../src/sfx.js';
import {InspectionView} from './fixture.js';
import {PreviewController} from './controller.js';
const $=id=>document.getElementById(id),errors=[],views=[];
const error=m=>{const text=typeof m==='string'?m:JSON.stringify(m);errors.push(text);$('error').hidden=false;$('error').textContent=errors.slice(-8).join('\n');};
const audio=new ManaGainAudio({onDiagnostic:error}),demo=new PreviewController(audio);
let info=null,compilation=[],last=performance.now(),frameCount=0,started=false;
function chart(){
  const total=demo.span,offsets=demo.offsets,pts=offsets.map(o=>{
    const p=[];for(let i=0;i<=220;i++){const ms=i/220*total,v=envelope((ms-o)/demo.duration);p.push(`${24+i/220*632},${112-v*135}`);}return `<polyline points="${p.join(' ')}" fill="none" stroke="#88b7f1" stroke-width="1.6" opacity="0.85"/>`;
  }).join('');
  const marks=offsets.map(o=>`<line x1="${24+o/total*632}" x2="${24+o/total*632}" y1="17" y2="118" stroke="#bd91ec" stroke-dasharray="3 4"/>`).join('');
  $('envelope').innerHTML=`<path d="M24 17V112H657" fill="none" stroke="#334a66"/>${marks}${pts}<text x="24" y="135" font-size="10" fill="#9dafc6">設計包絡 / actor-ms · 実測音ではない</text>`;
}
function stateUI(items){
  const phase=demo.phaseMs,sample=items[0]?sampleTime(items[0].ageMs,items[0].durationMs):null;
  $('time').textContent=`${phase.toFixed(0)} actor-ms${demo.inspectAt!==null?' / 無音標本':''}`;
  if(document.activeElement!==$('scrub'))$('scrub').value=Math.min(phase,demo.span);
  $('phase').textContent=sample?`${PHASES.find(v=>v.id===sample.phase)?.label} / 外 ${(sample.external*100).toFixed(0)}% → 内 ${(sample.stored*100).toFixed(0)}%`:'消去後 / Eなし';
  const s=demo.ledger.stats;$('counts').textContent=`受理 ${s.accepted} · 生存 ${items.length} · 音要求 ${s.audioRequested} · 重複 ${s.duplicate}`;
  $('play').textContent=demo.running?'一時停止':'再生';
  if(audio.workletStats){const w=audio.workletStats;$('voices').textContent=`Worklet 実行: 開始 ${w.starts} / 現在 ${w.voices} / 最大 ${w.peakVoices}。実聴の良否は未判定。`;}
  $('event-log').textContent=demo.events.slice(-7).map(e=>JSON.stringify(e)).join('\n');
}
function draw(items){
  const visible=demo.body.alive&&demo.body.present&&!demo.body.inVent&&!demo.body.invisible;
  const layer=$('layer').value,debugLabels=layer==='all'?null:layer==='stored'?['stored','fill','settled']: [layer];
  for(const view of views)view.render(items,{visible,occlusion:$('occlusion').checked,bloom:$('bloom').checked,debugLabels});
  stateUI(items);frameCount++;
}
function animate(now){const dt=now-last;last=now;try{draw(demo.step(document.hidden?0:dt));}catch(e){error(e.stack??String(e));demo.running=false;return;}requestAnimationFrame(animate);}
$('restart').onclick=()=>{demo.restart();chart();};$('play').onclick=()=>demo.toggle();
$('scenario').onchange=()=>{demo.scenario=$('scenario').value;demo.restart();$('scrub').max=demo.span;chart();};
$('duration').onchange=()=>{demo.duration=Number($('duration').value);demo.restart();$('scrub').max=demo.span;chart();};
$('rate').onchange=()=>{demo.clock.rate=Number($('rate').value);};
$('scrub').oninput=()=>{const items=demo.seek(Number($('scrub').value));if(started)draw(items);};
$('sound').onclick=async()=>{try{await audio.unlock();$('sound-status').textContent='音は以降の新しい原因のみ。過去の原因は再起音しません。';$('sound').textContent='音 有効';}catch(e){error(String(e));}};
$('gain').oninput=()=>audio.setGain(Number($('gain').value));
$('duplicate').onclick=()=>demo.duplicate();
for(const b of document.querySelectorAll('[data-remove]'))b.onclick=()=>demo.remove(b.dataset.remove);
$('restore').onclick=()=>demo.restore();
window.addEventListener('mana-error',e=>error(e.detail));window.addEventListener('unhandledrejection',e=>error(e.reason?.stack??String(e.reason)));
let hiddenRunning=false;document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenRunning=demo.running;demo.running=false;demo.ledger.update();audio.setMuted(true);}else{demo.running=hiddenRunning;audio.setMuted(!demo.running);last=performance.now();}});
function report(){return {release:'r0.4',scope:'local browser mock beneficiary, not live DVA',userAgent:navigator.userAgent,devicePixelRatio,adapter:info,originalWGSL:compilation,framesSubmitted:frameCount,renderSubmission:started?'running':'not_run',hardwareClassification:info?.isFallbackAdapter?'software-adapter':(info?'reported-adapter-see-fields':'not_run'),errors,settings:{duration:demo.duration,rate:demo.clock.rate,scenario:demo.scenario,phase:demo.phaseMs},eventStats:demo.ledger.stats,AudioWorklet:audio.workletStats??'not_run',auditoryReview:'not_run',visualQuality:'not_automatically_judged',fullLifetimeHumanReview:'not_run',liveGame:'not_run',productionApproved:false};}
$('report').onclick=()=>{const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mana-r04-browser-observation.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
window.__manaQA={report,seek:ms=>{const items=demo.seek(ms);if(started)draw(items);return report();},restart:()=>demo.restart(),setScenario:(s)=>{$('scenario').value=s;$('scenario').onchange();},setRate:r=>{$('rate').value=String(r);demo.clock.rate=r;},setDuration:d=>{$('duration').value=String(d);$('duration').onchange();},remove:kind=>demo.remove(kind),restore:()=>demo.restore(),duplicate:()=>demo.duplicate(),get ready(){return started;}};
chart();
try{
  const gpu=await requestDevice();info=gpu.info;
  for(const light of [false,true])for(const scale of [1,2,3]){
    const article=document.createElement('article');article.className='tile';article.innerHTML=`<header><strong>H${64*scale} / ${scale}×</strong><small>${light?'明背景':'暗背景'} · 同一shader</small></header><canvas aria-label="H${64*scale} ${light?'明':'暗'}背景 実WebGPU"></canvas>`;
    $('views').append(article);const v=await InspectionView.create(gpu.device,gpu.format,article.querySelector('canvas'),scale,light);views.push(v);if(!compilation.length)compilation=v.compilation;
  }
  $('gpu').textContent=`原本pipeline完了 / ${info.description||[info.vendor,info.architecture].filter(Boolean).join(' ')||'adapter metadata unavailable'}${info.isFallbackAdapter?' / software':''}`;
  started=true;demo.restart();last=performance.now();requestAnimationFrame(animate);
}catch(e){$('gpu').textContent='未起動 / エラー詳細参照';error(e.stack??String(e));}
window.addEventListener('pagehide',()=>{demo.dispose();views.forEach(v=>v.dispose());audio.dispose();});
