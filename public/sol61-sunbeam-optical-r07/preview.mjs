import {SunbeamRenderer,SunbeamSound,VERSION,AUTHORSHIP} from './effect.mjs';
const query=new URLSearchParams(location.search);if(query.has('embed'))document.documentElement.classList.add('embed');
const status=document.querySelector('#status'),canvas=document.querySelector('canvas'),sound=new SunbeamSound({verify:query.has('verify')});
if(sound.verify){document.querySelector('#sound').disabled=true;document.querySelector('#sound').textContent='検証中: 音声固定OFF';}
canvas.style.visibility='hidden';
try{
 const renderer=await SunbeamRenderer.create(canvas,query.get('character')||'./character.png');
 const defaults=structuredClone(renderer.options),warmupStarted=performance.now();
 for(const t of [100,600,950,1200]){renderer.render(t);await renderer.device.queue.onSubmittedWorkDone();}
 renderer.render(0);await renderer.device.queue.onSubmittedWorkDone();renderer.frames=0;canvas.style.visibility='visible';
 let paused=false,raf,runId=0,actorTime=0,timeScale=1,lastNow=performance.now(),lastLoop=-1,lastAt=0,audioUnlocked=false;
 const api=window.__sunbeam={version:VERSION,authorship:AUTHORSHIP,ready:true,renderer,errors:renderer.errors,verify:sound.verify,options:renderer.options,warmupMs:performance.now()-warmupStarted,warmupFrames:5,loops:0,intervals:[],audioStarts:[],
  at:async(ms,options={})=>{paused=true;sound.stopAll();renderer.options=structuredClone(defaults);renderer.render(ms,options);await renderer.device.queue.onSubmittedWorkDone();api.options=renderer.options;return renderer.last;},
  resume:()=>{sound.stopAll();paused=false;actorTime=0;lastNow=performance.now();lastLoop=-1;lastAt=0;runId++;},
  setTimeScale:scale=>{if(!Number.isFinite(scale)||scale<0)throw TypeError('nonnegative actor scale required');timeScale=scale;sound.setTimeScale(scale);},
  dispose:async()=>{cancelAnimationFrame(raf);renderer.destroy();await sound.destroy();},
 };
 function loop(now){
  if(!paused){
   actorTime+=(now-lastNow)*timeScale;lastNow=now;const cycle=Math.floor(actorTime/2000),age=actorTime%2000;
   if(lastAt&&api.intervals.length<1500)api.intervals.push(now-lastAt);lastAt=now;
   const changed=cycle!==lastLoop;if(changed){lastLoop=cycle;api.loops++;}
   renderer.render(age);api.options=renderer.options;
   const sourceEnabled=renderer.options.sourceVisibility>0&&renderer.options.intensity>0;
   if(!sourceEnabled||document.visibilityState!=='visible'||age>=1200)sound.stopAll();
   if(changed&&audioUnlocked&&!sound.verify&&sourceEnabled&&timeScale>0&&age<1200&&document.visibilityState==='visible'){
    const submittedRun=runId,submittedCycle=cycle,submittedRate=timeScale;
    renderer.device.queue.onSubmittedWorkDone().then(async()=>{
     if(paused||runId!==submittedRun||lastLoop!==submittedCycle||timeScale!==submittedRate||document.visibilityState!=='visible'||renderer.options.sourceVisibility<=0||renderer.options.intensity<=0)return;
     const currentAge=actorTime%2000;if(currentAge>=1200)return;
     const cause=VERSION+':'+submittedRun+':'+submittedCycle;
     if(await sound.trigger(cause,{ageEms:currentAge,submitted:true}))api.audioStarts.push({cause,ageEms:currentAge,rate:timeScale,submittedFrames:renderer.frames});
    }).catch(error=>renderer.errors.push(String(error)));
   }
   if(renderer.frames%30===0)status.textContent=JSON.stringify({version:VERSION,gpuFrames:renderer.frames,loops:api.loops,errors:renderer.errors},null,2);
  }raf=requestAnimationFrame(loop);
 }
 raf=requestAnimationFrame(loop);
 document.querySelector('#replay').onclick=api.resume;
 document.querySelector('#bg').onclick=()=>renderer.options.background=1-renderer.options.background;
 document.querySelector('#ghosts').onclick=()=>renderer.options.ghosts=1-renderer.options.ghosts;
 document.querySelector('#obs').onclick=()=>renderer.options.observation=1-renderer.options.observation;
 document.querySelector('#source').onclick=()=>{renderer.options.sourceVisibility=1-renderer.options.sourceVisibility;if(!renderer.options.sourceVisibility)sound.stopAll();};
 async function activateFromGesture(){if(sound.verify)return false;audioUnlocked=await sound.unlock();if(audioUnlocked)api.resume();return audioUnlocked;}
 window.__gallerySfx={activateFromGesture};document.querySelector('#sound').onclick=activateFromGesture;canvas.addEventListener('pointerdown',activateFromGesture);
 document.addEventListener('visibilitychange',()=>sound.stopAll());addEventListener('pagehide',()=>api.dispose(),{once:true});
 const fixedOptions={};
 for(const [parameter,key] of [['height','height'],['background','background'],['ghosts','ghosts'],['obs','observation'],['source','sourceVisibility'],['intensity','intensity']])if(query.has(parameter))fixedOptions[key]=Number(query.get(parameter));
 for(const [parameter,key] of [['shift','shift'],['centre','observerCentre']])if(query.has(parameter))fixedOptions[key]=query.get(parameter).split(',').map(Number);
 if(query.has('component'))fixedOptions.ghostComponent=query.get('component');
 if(query.has('rate'))api.setTimeScale(Number(query.get('rate')));
 if(query.has('t'))await api.at(Number(query.get('t')),fixedOptions);else if(Object.keys(fixedOptions).length)renderer.render(0,fixedOptions);
 api.fixture={query:Object.fromEntries(query),fixed:query.has('t'),exposure:'inherited source gain and gamma2.2; no global exposure adaptation',timeScale};
 if(query.has('t'))status.textContent=JSON.stringify({version:VERSION,fixture:api.fixture,last:renderer.last,errors:renderer.errors},null,2);
}catch(error){canvas.style.visibility='visible';status.textContent=error.stack;window.__sunbeam={ready:false,errors:[error.stack]};throw error;}
