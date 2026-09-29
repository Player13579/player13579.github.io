import {createRenderer} from './renderer.mjs';
import {VERSION,LOOP,ReceiptGate,SOURCE,RECEIVER,phaseAt,verificationMode} from './contract.mjs';
import {ManaSound} from './sfx.mjs';
const q=new URLSearchParams(location.search),verify=verificationMode(location.search);
if(q.has('embed'))document.body.classList.add('embed');
const el=id=>document.getElementById(id),sound=new ManaSound(location.search),gate=new ReceiptGate();gate.reset('preview');
const status={version:VERSION,verify,quality:'unaccepted',audioEnabled:false,loops:0,gaps:[],errors:[]};
window.__manaPreview={status};
let renderer,raf=0,running=true,fixed=0,epoch=performance.now(),last=0,lastLoop=-1,disposed=false;
const options=()=>({stars:el('stars').checked,glow:el('glow').checked,reduced:el('reduced').checked});
el('reduced').checked=q.has('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
if(verify){el('audio').disabled=true;el('audio').textContent='検証モード：音声 0 固定';}
el('audio').onclick=async()=>{if(verify)return;if(status.audioEnabled){sound.setMuted(true);status.audioEnabled=false;el('audio').textContent='音を有効にする';}else{await sound.enable();sound.setMuted(false);status.audioEnabled=true;el('audio').textContent='ミュート';}};
el('pause').onclick=()=>{running=!running;if(running){epoch=performance.now()-fixed*1000;lastLoop=-1;}else{fixed=status.time;sound.stop();}el('pause').textContent=running?'一時停止':'再生';};
el('time').oninput=()=>{running=false;fixed=Number(el('time').value);el('pause').textContent='再生';sound.stop();};
for(const id of ['stars','glow','reduced'])el(id).onchange=()=>{};
try {
  renderer=await createRenderer(el('stage'));status.gpu=renderer.state;
  const draw=(now)=>{
    if(disposed)return;
    if(last && running){status.gaps.push(now-last);if(status.gaps.length>600)status.gaps.shift();}last=now;
    const elapsed=(now-epoch)/1000,loop=Math.floor(elapsed/LOOP),t=running?elapsed%LOOP:fixed;
    if(running&&loop!==lastLoop){
      lastLoop=loop;status.loops++;sound.reset();gate.reset('preview');
      const receipt=gate.accept({sessionId:'preview',causeId:`loop-${status.loops}`,recipientId:'philia-fixture',type:'gain-mana',confirmed:true,actualDelta:1,source:SOURCE,receiver:RECEIVER,startedAt:now-t*1000});
      sound.play(receipt,t);
    }
    renderer.draw(t,options());status.time=t;status.phase=phaseAt(t);
    if(running)el('time').value=String(Math.min(t,1.55));
    el('state').textContent=`${phaseAt(t)} · ${t.toFixed(2)} 秒 · WebGPU ${renderer.state.frames} frames · 品質未受入`;
    raf=requestAnimationFrame(draw);
  };
  epoch=performance.now();raf=requestAnimationFrame(draw);
  window.__manaPreview.setTime=async(t,overrides={})=>{running=false;fixed=t;for(const [k,v] of Object.entries(overrides))if(el(k))el(k).checked=!!v;renderer.draw(t,options());await renderer.settled();return renderer.state;};
  window.__manaPreview.resume=()=>{running=true;epoch=performance.now();lastLoop=-1;};
}catch(error){status.errors.push(String(error.stack||error));el('state').textContent=String(error);}
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);sound.dispose();renderer?.dispose();},{once:true});
