import{SunbeamRenderer,SunbeamSound,VERSION}from'./effect.mjs?revision=1';
const query=new URLSearchParams(location.search);if(query.has('embed'))document.documentElement.classList.add('embed');
const status=document.querySelector('#status');const sound=new SunbeamSound({verify:query.has('verify')});
if(sound.verify){document.querySelector('#sound').disabled=true;document.querySelector('#sound').textContent='検証中: 音声固定OFF';}
const characterUrl=query.get('character')||'./character.png';
try{
 const renderer=await SunbeamRenderer.create(document.querySelector('canvas'),characterUrl);let started=performance.now(),paused=false,enabledSound=false,lastLoop=-1,raf,lastAt=0;
 const api=window.__sunbeam={version:VERSION,ready:true,renderer,errors:renderer.errors,intervals:[],loops:0,verify:sound.verify,options:renderer.options,
  at:async(ms,options={})=>{paused=true;renderer.render(ms,options);await renderer.device.queue.onSubmittedWorkDone();return renderer.last;},
  resume:()=>{paused=false;started=performance.now();lastLoop=-1;api.intervals=[];lastAt=0;},
  dispose:async()=>{cancelAnimationFrame(raf);renderer.destroy();await sound.destroy();},
 };
 function loop(now){if(!paused){if(lastAt&&api.intervals.length<1000)api.intervals.push(now-lastAt);lastAt=now;const elapsed=now-started;const cycle=Math.floor(elapsed/2000);if(cycle!==lastLoop){lastLoop=cycle;api.loops++;if(enabledSound)sound.trigger(VERSION+':'+cycle);}renderer.render(elapsed%2000);if(renderer.frames%30===0)status.textContent=JSON.stringify({version:VERSION,gpuFrames:renderer.frames,loops:api.loops,errors:renderer.errors},null,2);}raf=requestAnimationFrame(loop);}raf=requestAnimationFrame(loop);
 document.querySelector('#replay').onclick=api.resume;
 document.querySelector('#bg').onclick=()=>renderer.options.background=1-renderer.options.background;
 document.querySelector('#ghosts').onclick=()=>renderer.options.ghosts=1-renderer.options.ghosts;
 document.querySelector('#sound').onclick=async()=>{if(sound.verify)return;enabledSound=true;await sound.trigger(VERSION+':manual:'+Date.now());api.resume();};
 addEventListener('pagehide',()=>api.dispose(),{once:true});
}catch(error){status.textContent=error.stack;window.__sunbeam={ready:false,errors:[error.stack]};throw error;}

