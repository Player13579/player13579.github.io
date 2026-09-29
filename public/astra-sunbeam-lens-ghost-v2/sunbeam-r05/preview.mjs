import{SunbeamRenderer,SunbeamSound,VERSION}from'./effect.mjs?revision=5';
const query=new URLSearchParams(location.search);if(query.has('embed'))document.documentElement.classList.add('embed');
const status=document.querySelector('#status'),canvas=document.querySelector('canvas');const sound=new SunbeamSound({verify:query.has('verify')});
if(sound.verify){document.querySelector('#sound').disabled=true;document.querySelector('#sound').textContent='検証中: 音声固定OFF';}
const characterUrl=query.get('character')||'./character.png';canvas.style.visibility='hidden';
try{
 const renderer=await SunbeamRenderer.create(canvas,characterUrl);
 const warmupStarted=performance.now();for(const t of[100,600,950,1200]){renderer.render(t);await renderer.device.queue.onSubmittedWorkDone();}
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const warmupMs=performance.now()-warmupStarted;renderer.render(0);await renderer.device.queue.onSubmittedWorkDone();renderer.frames=0;canvas.style.visibility='visible';
 let paused=false,lastLoop=-1,raf,lastAt=0,runId=0,actorTime=0,timeScale=1,lastNow=performance.now();
 const api=window.__sunbeam={version:VERSION,ready:true,renderer,errors:renderer.errors,intervals:[],loopIntervals:{},loops:0,verify:sound.verify,options:renderer.options,warmupMs,warmupFrames:5,
  at:async(ms,options={})=>{paused=true;sound.stopAll();renderer.render(ms,options);await renderer.device.queue.onSubmittedWorkDone();return renderer.last;},
  resume:()=>{sound.stopAll();paused=false;actorTime=0;lastNow=performance.now();lastLoop=-1;api.intervals=[];api.loopIntervals={};lastAt=0;runId++;},
  setTimeScale:scale=>{if(!Number.isFinite(scale)||scale<0)throw TypeError('nonnegative actor scale required');timeScale=scale;sound.setTimeScale(scale);},
  dispose:async()=>{cancelAnimationFrame(raf);renderer.destroy();await sound.destroy();},
 };
 function loop(now){if(!paused){actorTime+=(now-lastNow)*timeScale;lastNow=now;const cycle=Math.floor(actorTime/2000);if(lastAt&&api.intervals.length<1500){const dt=now-lastAt;api.intervals.push(dt);(api.loopIntervals[cycle]??=[]).push(dt);}lastAt=now;if(cycle!==lastLoop){lastLoop=cycle;api.loops++;sound.trigger(VERSION+':'+runId+':'+cycle);}renderer.render(actorTime%2000);if(renderer.frames%30===0)status.textContent=JSON.stringify({version:VERSION,gpuFrames:renderer.frames,loops:api.loops,errors:renderer.errors},null,2);}raf=requestAnimationFrame(loop);}raf=requestAnimationFrame(loop);
 document.querySelector('#replay').onclick=api.resume;
 document.querySelector('#bg').onclick=()=>renderer.options.background=1-renderer.options.background;
 document.querySelector('#ghosts').onclick=()=>renderer.options.ghosts=1-renderer.options.ghosts;
 async function startSound(){if(sound.verify)return;await sound.unlock();api.resume();await sound.trigger(VERSION+':'+runId+':0');}
 document.querySelector('#sound').onclick=startSound;canvas.addEventListener('pointerdown',startSound);
 addEventListener('pagehide',()=>api.dispose(),{once:true});
}catch(error){canvas.style.visibility='visible';status.textContent=error.stack;window.__sunbeam={ready:false,errors:[error.stack]};throw error;}
