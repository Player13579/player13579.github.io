import {ManaReceipts,VERSION,DURATION} from './events.mjs';
import {ManaSound} from './sound.mjs';
import {createRenderer} from './renderer.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify');
if(params.get('embed')==='1')document.body.classList.add('embed');
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
const state={version:VERSION,verify,ready:false,frames:0,events:0,errors:[],intervals:[],soundStarts:0};window.manaPreview=state;
const owner={playerId:'preview-owner',sessionId:'preview-session',sessionValid:true,alive:true,hidden:false,onScreen:true,acc2Active:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,world:{x:0,y:0}};
const sound=new ManaSound({verify});
const ledger=new ManaReceipts(owner.sessionId,{onStart:e=>sound.start(e),onStop:e=>sound.stop(e),onRate:e=>sound.rate(e)});
let scale=params.get('scale')==='3'?3:1,guide=params.get('guide')!=='0',obs=params.get('obs')!=='0',sequence=0,last=0,loopAge=2.5,raf=0,closed=false;
const frozen=params.has('at')?Math.max(0,Number(params.get('at'))):null;
function receipt(){return {type:'gain-mana',effectKind:'mana',eventId:`preview-${++sequence}`,playerId:owner.playerId,sessionId:owner.sessionId,confirmed:true,discrete:true,actualDelta:25,sourceWorld:document.querySelector('#source').value==='side'?{x:-45,y:-45}:{x:-44,y:-3}};}
function replay(){if(document.hidden)return;ledger.reset(owner.sessionId);const result=ledger.receive(receipt(),owner);if(result.accepted)state.events++;loopAge=0;}
document.querySelector('#replay').onclick=replay;
document.querySelector('#scale').onclick=e=>{scale=scale===1?3:1;e.target.textContent=scale===1?'H64 原寸':'H192 拡大';};
document.querySelector('#speed').onclick=e=>{owner.acc2Active=!owner.acc2Active;e.target.textContent=owner.acc2Active?'ACC2 有効・2倍':'通常速度';};
document.querySelector('#guide').onclick=e=>{guide=!guide;e.target.textContent=guide?'位置ガイドあり':'位置ガイドなし';};
document.querySelector('#obs').onclick=e=>{obs=!obs;e.target.textContent=obs?'周辺光あり':'周辺光なし';};
document.querySelector('#sound').disabled=verify;document.querySelector('#sound').textContent=verify?'検証モード・音声0固定':'音を有効にする';
document.querySelector('#sound').onclick=async()=>{await sound.unlock();document.querySelector('#sound').textContent='音声有効';replay();};
canvas.addEventListener('pointerdown',async()=>{if(!verify&&sound.context?.state!=='running'){await sound.unlock();replay();}});
let renderer;
document.addEventListener('visibilitychange',()=>{owner.hidden=document.hidden;if(document.hidden)ledger.advance(0,()=>owner);last=0;});
try {
  renderer=await createRenderer(canvas);state.ready=true;replay();
  function frame(now){
    if(closed)return;
    const dt=last?Math.max(0,(now-last)/1000):0;last=now;
    if(!document.hidden){
      if(frozen!==null){for(const e of ledger.active)e.age=frozen;}
      else {ledger.advance(dt,()=>owner);loopAge+=dt;if(loopAge>2.5)replay();}
      renderer.render(ledger.active,{scale,guide,obs});state.frames=renderer.frames;state.phase=ledger.active[0]?.age??null;state.soundStarts=sound.starts;
      state.errors=renderer.errors; if(dt>0&&state.intervals.length<2000)state.intervals.push(dt*1000);
      if(state.frames%15===0)status.textContent=JSON.stringify({...state,intervals:undefined},null,2);
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
}catch(e){state.errors.push(e.stack||String(e));status.textContent=state.errors.join('\n');}
window.addEventListener('pagehide',()=>{closed=true;cancelAnimationFrame(raf);ledger.reset('closed');void sound.close();void renderer?.close();});
