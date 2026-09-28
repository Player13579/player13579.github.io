import{createRenderer}from'./renderer.mjs';
import{StaminaRuntime,VERSION,DURATION_MS}from'./runtime.mjs';
import{StaminaSound}from'./sound.mjs';
const params=new URLSearchParams(location.search),verify=params.has('verify'),embed=params.get('embed')==='1';
// Replay adapter only: gallery height query controls display scale; creative shaders remain fixed.
const embedBodyHeight=Math.max(16,Math.min(256,Number(params.get('height'))||192));
if(embed)document.body.classList.add('embed');
const canvas=document.querySelector('canvas'),status=document.querySelector('#status'),runtime=new StaminaRuntime('preview-session'),sound=new StaminaSound({verify});
const actor={id:'recipient',alive:true,visible:true,x:0,y:0,eTimeMs:0,actorTimeScale:1,movementAccActive:false};
const diag=window.__stamina={version:VERSION,verify,gpu:'initializing',submissions:0,loops:0,audioStarts:0,errors:[],quality:'not_accepted',mode:'standalone',frameIntervals:[]};
diag.revision='r3';
document.querySelector('#sound').disabled=verify;document.querySelector('#sound').textContent=verify?'検証: 音は固定 OFF':'音を有効化';
document.querySelector('#sound').onclick=async()=>{await sound.unlock();restart();};
let renderer,sequence=0,frame=0,last=performance.now(),restartAt=0,raf=0,disposed=false,busy=false,paused=false;
function restart(){runtime.cancel();sound.stop();const id=`preview-${++sequence}`;runtime.admit({id,type:'gain-stamina',effectKind:'stamina',playerId:actor.id},{sessionId:'preview-session',actor,proof:{kind:'authoritative-discrete-delta',eventId:id,recipientId:actor.id,actualDelta:30}});restartAt=actor.eTimeMs;diag.loops++;}
document.querySelector('#replay').onclick=()=>restart();
function panel(x,y,width,height,bodyHeight,elapsedMs,light=false){return{x,y,width,height,bodyHeight,elapsedMs,light,footX:x+width*.54,footY:y+height*.75,reducedMotion:document.querySelector('#reduced').checked,layers:+document.querySelector('#layers').value};}
async function draw(now){
 if(disposed)return;raf=requestAnimationFrame(draw);if(busy||paused)return;busy=true;
 try{
  const rawDt=Math.max(0,now-last);if(renderer.submissions>5)diag.frameIntervals.push(rawDt);if(diag.frameIntervals.length>240)diag.frameIntervals.shift();const dt=Math.min(100,rawDt);last=now;const rate=+document.querySelector('#rate').value;actor.actorTimeScale=rate;actor.movementAccActive=rate===2;actor.eTimeMs+=dt*rate;
  if(actor.eTimeMs-restartAt>DURATION_MS+620)restart();
  const plans=runtime.prepare({sessionId:'preview-session',actors:[actor],phase:'playing',visible:!document.hidden,frameId:++frame,reducedMotion:document.querySelector('#reduced').checked});
  const elapsed=plans[0]?.elapsedMs??-1;
  const panels=embed?[panel(0,0,960,500,embedBodyHeight,elapsed)]:[panel(0,0,200,240,64,elapsed),panel(200,0,200,240,64,elapsed,true),panel(400,0,280,240,192,elapsed),panel(680,0,280,240,192,elapsed,true)];
  if(!embed)for(let row=0;row<2;row++)for(let col=0;col<4;col++)panels.push(panel(col*240,240+row*130,240,130,64,[150,380,800,1190][col],row===1));
  const ok=await renderer.render(panels);const visible=!document.hidden&&!disposed;
  if(visible&&ok)for(const p of plans){const cue=runtime.commit(p,{submitted:true,visible,sessionId:'preview-session',frameId:frame});if(cue)sound.play(cue);}
  sound.sync(visible?plans:[]);diag.submissions=renderer.submissions;diag.audioStarts=sound.starts;diag.elapsedMs=elapsed;diag.errors=[...renderer.errors];diag.phase=elapsed<250?'source':elapsed<620?'transfer':elapsed<1080?'buildup':'settle';
  status.textContent=JSON.stringify(diag,null,2);
 }catch(e){diag.errors.push(e.message);status.textContent=e.stack;paused=true;}finally{busy=false;}
}
document.addEventListener('visibilitychange',()=>{runtime.cancel();sound.stop();last=performance.now();if(!document.hidden)restart();});
async function dispose(){disposed=true;cancelAnimationFrame(raf);runtime.dispose();await sound.dispose();renderer?.dispose();}
window.addEventListener('pagehide',dispose,{once:true});
window.__staminaSetFrame=async(ms,{light=false,reducedMotion=false,layers=15,bodyHeight=64}={})=>{
 paused=true;while(busy)await new Promise(r=>setTimeout(r,5));canvas.width=320;canvas.height=240;canvas.style.width='320px';canvas.style.height='240px';
 await renderer.render([{x:0,y:0,width:320,height:240,bodyHeight,elapsedMs:ms,light,footX:170,footY:172,reducedMotion,layers}]);return{...diag,submissions:renderer.submissions};
};
try{renderer=await createRenderer(canvas);diag.gpu='ready';diag.compilation=renderer.compilation;diag.adapter=renderer.adapterInfo?.description;restart();raf=requestAnimationFrame(draw);}catch(e){diag.gpu='failed';diag.errors.push(e.message);status.textContent=e.stack;}
