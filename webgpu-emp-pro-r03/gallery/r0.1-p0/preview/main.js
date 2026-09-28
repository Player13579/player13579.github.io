import {EMPEffects,CONTRACT,TIMELINES,ActorClock} from '../src/emp-e.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const draft=params.get('draft')==='1'||document.documentElement.dataset.prototype==='true';
const descriptions={
 charge:['チャージ / Capture','発動者の周囲で六つの櫛状格子が折り畳まれ、二本の稜線へ圧縮。1200 msの直前に白い位相ロックが成立する。','SOURCE / 1200 ms CHARGE'],
 normal:['通常放電 / Transfer','発動者から命中対象へ、暗い谷を挟む三本の分岐導波路が走る。到達した対象の局所格子が閉じ、封鎖状態へ移行する。','SOURCE → ACTUAL TARGET'],
 suppression:['使用封鎖 / Held state','命中対象に追従する分節ラメラ。7秒間の保持と終端のほどけ方を、画面のタイマー記号とは分けて示す。','TARGET-LOCAL / 7000 ms'],
 resonance:['共鳴 / Resonance','二つの発生点の中点で、閉じた格子が六方向へ反転。白い稜線、暗い裂け目、奥行きのある櫛状内部が独立した主形をつくる。','SAME PHASE / MIDPOINT EVENT'],
 cancellation:['相殺 / Counterphase','対向する二系統の櫛状層が中点の暗い断層へ収束。外向きの爆発ではなく、すれ違い・圧縮・消失を順に見せる。','OPPOSED PHASE / MIDPOINT NULL'],
 continuous:['連続イベント / Stress','通常・共鳴・相殺を重ねる検証シーケンス。これは複数アクターの試験入力であり、一人の18秒クールタイムを変更しない。','MULTI-ACTOR / CONTINUITY TEST'],
};
let branch=params.get('branch')||'resonance';if(!(branch in descriptions))branch='resonance';
let zoom=1,theme='dark',playing=true,loopMs=10000,clock=new ActorClock(),last=performance.now(),cycleIndex=0;
let fx,events=[],emitIndex=0,markers=[],fpsSamples=[],testFrozen=params.has('time'),serial=0;
const order=['charge','normal','suppression','resonance','cancellation','continuous'];
function add(kind,atMs,spec){events.push({kind,spec:{id:`preview-${serial}-${events.length}`,atMs,...spec}});}
function charge(at,p,id,phase=1){add('charge',at,{actorId:id,origin:p,phase});}
function normal(at,p,q,id,phase=1){add('normal',at,{actorId:id,origin:p,phase,targets:q?[{id:'target',position:q}]:[]});if(q)add('suppression',at+180,{origin:q,targetId:'target',durationMs:7000,sound:false});}
function setup({keepRate=true}={}){
  serial++;fx?.reset(0);clock.reset();events=[];emitIndex=0;markers=[];
  const A={x:-180,y:0},B={x:180,y:0},M={x:0,y:0};
  if(branch==='charge'){
    loopMs=10000;charge(100,M,'A');markers=[{p:M,label:'SOURCE A',kind:'actor'}];
  } else if(branch==='normal'){
    loopMs=10000;const P={x:-118,y:0},Q={x:118,y:0};charge(100,P,'A');normal(1300,P,Q,'A');
    markers=[{p:P,label:'SOURCE A',kind:'actor'},{p:Q,label:'TARGET · 236 px',kind:'target'}];
  } else if(branch==='suppression'){
    loopMs=10000;add('suppression',200,{origin:M,targetId:'target',durationMs:7000,sound:true});markers=[{p:M,label:'TARGET',kind:'target'}];
  } else if(branch==='resonance'||branch==='cancellation'){
    loopMs=10000;charge(100,A,'A');charge(340,B,'B',branch==='cancellation'?-1:1);
    normal(1300,A,null,'A');normal(1540,B,null,'B',branch==='cancellation'?-1:1);
    add(branch,1540,{origin:M,a:A,b:B});markers=[{p:A,label:'SOURCE A / +',kind:'actor'},{p:B,label:branch==='resonance'?'SOURCE B / +':'SOURCE B / −',kind:'actor'},{p:M,label:'MIDPOINT',kind:'midpoint'}];
  } else {
    loopMs=10000;
    for(let i=0;i<5;i++){
      const y=(i-2)*61,p={x:-220+i*15,y},q={x:20+i*20,y};charge(i*400,p,`A${i}`);normal(1200+i*400,p,q,`A${i}`);
    }
    add('resonance',2100,{origin:{x:75,y:-45},a:{x:-95,y:-45},b:{x:245,y:-45}});
    add('cancellation',2950,{origin:{x:110,y:95},a:{x:-60,y:95},b:{x:280,y:95}});
    markers=[{p:{x:-220,y:0},label:'MULTIPLE SOURCES',kind:'actor'}];
  }
  events.sort((a,b)=>a.spec.atMs-b.spec.atMs);
  $('scrub').max=String(loopMs);$('duration').textContent=(loopMs/1000).toFixed(2)+' s';
  $('branch-title').textContent=descriptions[branch][0];$('branch-description').textContent=descriptions[branch][1];$('scene-tag').textContent=descriptions[branch][2];
  document.querySelectorAll('[data-branch]').forEach(b=>b.classList.toggle('active',b.dataset.branch===branch));
  const timeline=TIMELINES[branch]??TIMELINES.resonance;
  $('timeline-phases').replaceChildren(...timeline.phases.map(([a,b,title])=>{
    const el=document.createElement('div');el.className='phase-cell';el.style.flexGrow=String(b-a);
    const h=document.createElement('b');h.textContent=title;const s=document.createElement('span');s.textContent=`${a}—${b} actor ms`;el.append(h,s);return el;
  }));
}
function emitThrough(time,{mute=false}={}){
  while(emitIndex<events.length&&events[emitIndex].spec.atMs<=time){
    const {kind,spec}=events[emitIndex++];fx[kind]({...spec,sound:mute?false:spec.sound});
  }
}
function seek(ms){
  fx.reset(0);emitIndex=0;clock.reset(ms);emitThrough(ms,{mute:true});fx.update({actorMs:ms,rate:0});draw();
}
function drawUI(){
  const c=$('diagnostics'),rect=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const w=rect.width,h=rect.height;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const light=theme==='light';ctx.strokeStyle=light?'#586e8214':'#729cb510';ctx.lineWidth=1;
  for(let x=w/2%64;x<w;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=h/2%64;y<h;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  const map=p=>[w/2+p.x*zoom,h/2+p.y*zoom];
  if($('ranges').checked){
    const centers=branch==='normal'?[markers[0].p]:branch==='resonance'?[{x:0,y:0}]:[];
    for(const p of centers){
      const [x,y]=map(p);for(const r of (branch==='resonance'?[110,260]:[260])){
        ctx.setLineDash([4,6]);ctx.strokeStyle=light?'#345a685f':'#92b6c83b';ctx.beginPath();ctx.arc(x,y,r*zoom,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        ctx.font='9px monospace';ctx.fillStyle=light?'#446676':'#78929e';ctx.fillText(`${r} px / UI ONLY`,x+8,y-r*zoom+12);
      }
    }
  }
  if($('markers').checked)for(const {p,label,kind} of markers){
    const [x,y]=map(p);ctx.font='9px monospace';ctx.textAlign='center';ctx.fillStyle=light?'#526b76':'#728794';
    if(kind==='midpoint'){ctx.strokeStyle=light?'#395e796b':'#90b4c55f';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();ctx.fillText(label,x,y+99*zoom);}
    else{
      // Non-character diagnostic body ruler: exactly 64 game px. Not part of the VFX.
      ctx.strokeStyle=light?'#647d8955':'#99b9c636';ctx.fillStyle=light?'#50677912':'#607c9414';
      ctx.fillRect(x-10*zoom,y-32*zoom,20*zoom,64*zoom);ctx.strokeRect(x-10*zoom,y-32*zoom,20*zoom,64*zoom);
      ctx.fillStyle=light?'#526b76':'#728794';ctx.fillText(label,x,y+51*zoom);
    }
  }
  ctx.textAlign='left';
}
function phaseLabel(){
  let selected=null;for(const e of fx.events.active(clock.ms))if(!selected||e.atMs>selected.atMs)selected=e;
  if(!selected)return 'INTERVAL / NO LIVE FIELD';const a=clock.ms-selected.atMs;
  const ph=TIMELINES[selected.kind].phases.find(([start,end])=>a>=start&&a<end);
  return selected.kind.toUpperCase()+' / '+(ph?.[2]??'HELD');
}
function draw(){
  fx.setView({center:{x:0,y:0},pixelsPerGamePixel:zoom});
  fx.setOccluders($('occluder').checked?[{x:-20,y:-65,w:40,h:130,depth:16,color:theme==='light'?[.32,.38,.42]:[.09,.12,.16]}]:[]);
  drawUI();fx.render();$('time').textContent=(clock.ms/1000).toFixed(2)+' s';$('scrub').value=String(clock.ms);$('phase-label').textContent=phaseLabel();
  const s=fx.stats();$('frame-info').textContent=`${s.triangles.toLocaleString()} TRI · ${s.active} EVENTS · ${zoom===1?'H64 1:1':'H64 2:1'}`;
}
function fail(err){$('error').hidden=false;$('error').textContent=`WebGPUを起動できませんでした。\n${err.message??err}\n\n同梱ランチャーでlocalhostから開き、WebGPU対応ブラウザを使用してください。\nこのプレビューは他の描画APIへ自動置換しません。`;$('gpu-state').textContent='GPU ERROR';console.error(err);}
try {
  fx=await EMPEffects.create({canvas:$('vfx'),draft,onError:message=>fail(new Error(message))});
  const info=fx.gpu.adapter?.info;
  $('gpu-state').textContent='WEBGPU / '+(info?.isFallbackAdapter?'SOFTWARE':'ACTIVE');
  if(draft){$('quality-label').textContent='P0 / 凍結ブロックアウト';$('quality-note').textContent='試作・最終品質ではありません';}
  setup();
  document.querySelectorAll('[data-branch]').forEach(b=>b.onclick=()=>{branch=b.dataset.branch;setup();draw();});
  document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{zoom=Number(b.dataset.zoom);document.querySelectorAll('[data-zoom]').forEach(x=>x.classList.toggle('active',x===b));$('ruler-label').textContent=`64 game px = ${64*zoom} CSS px`;$('stage').querySelector('.ruler i').style.height=64*zoom+'px';draw();});
  document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{theme=b.dataset.bg;$('stage').classList.toggle('light',theme==='light');document.querySelectorAll('[data-bg]').forEach(x=>x.classList.toggle('active',x===b));draw();});
  document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{clock.setRate(Number(b.dataset.rate));document.querySelectorAll('[data-rate]').forEach(x=>x.classList.toggle('active',x===b));fx.update({actorMs:clock.ms,rate:playing?clock.rate:0});});
  $('audio').onclick=async()=>{try{await fx.enableAudio();$('audio').textContent='音声 ON';$('audio').classList.add('enabled');setup();}catch(e){fail(e);}};
  $('volume').oninput=e=>fx.setVolume(Number(e.target.value));
  $('listen-distance').oninput=e=>{const distance=Number(e.target.value);fx.setListener({x:0,y:distance});$('distance-label').textContent=distance+' px';};
  $('play').onclick=()=>{playing=!playing;testFrozen=false;$('play').textContent=playing?'Ⅱ':'▶';last=performance.now();fx.update({actorMs:clock.ms,rate:playing?clock.rate:0});};
  $('restart').onclick=()=>{setup();draw();};
  $('scrub').oninput=e=>{playing=false;$('play').textContent='▶';seek(Number(e.target.value));};
  for(const id of ['ranges','occluder','markers'])$(id).onchange=draw;
  if(testFrozen){playing=false;$('play').textContent='▶';seek(Number(params.get('time')));}
  function frame(now){
    try{
      const dt=Math.min(100,Math.max(0,now-last));last=now;
      if(playing&&!document.hidden&&!testFrozen){
        clock.advance(dt);
        if(clock.ms>=loopMs){
          if($('autocycle').checked){cycleIndex=(order.indexOf(branch)+1)%order.length;branch=order[cycleIndex];}
          setup();
        }
        emitThrough(clock.ms);fx.update({actorMs:clock.ms,rate:clock.rate});
      }
      draw();requestAnimationFrame(frame);
    }catch(e){fail(e);}
  }
  document.addEventListener('visibilitychange',()=>{last=performance.now();fx.update({actorMs:clock.ms,rate:document.hidden||!playing?0:clock.rate});});
  requestAnimationFrame(frame);
  // Automation uses these exact public hooks; not a separate mock renderer.
  window.empPreview={fx,seek,select(name){if(!(name in descriptions))throw Error('branch');branch=name;setup();},
    pause(){playing=false;fx.update({actorMs:clock.ms,rate:0});},play(){playing=true;testFrozen=false;last=performance.now();},
    setZoom(v){document.querySelector(`[data-zoom="${v}"]`).click();},setBackground(v){document.querySelector(`[data-bg="${v}"]`).click();},
    setRate(v){document.querySelector(`[data-rate="${v}"]`).click();},
    getState(){return {branch,zoom,theme,playing,clockMs:clock.ms,loopMs,adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:info.isFallbackAdapter}:null,stats:fx.stats()};}};
}catch(e){fail(e);}
