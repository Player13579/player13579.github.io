import {createRenderer,Lifecycle,VERSION,DURATION_MS} from './cleanse.mjs';import {CleanseSound} from './sfx.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify');if(query.has('embed'))document.documentElement.classList.add('embed');
const canvas=document.querySelector('canvas'),status=document.querySelector('#status'),scale=document.querySelector('#scale');let h=Number(query.get('h'))||240;scale.value=String(h);let light=query.get('light')==='1';document.querySelector('#light').checked=light;let reduced=false,signs=true;let renderer,sound,audio,raf;let start=performance.now();let count=0;let paused=query.has('phase');let frozen=Number(query.get('phase'))||0;const session='cleanse-preview';const lifecycle=new Lifecycle(session);let current;
function trigger(){current='preview-'+(++count);start=performance.now();lifecycle.admit({id:current,playerId:'fixture',sessionId:session,type:'gain-statusRecovery',durationMs:DURATION_MS,startedAt:start});}
function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(r.width*devicePixelRatio));canvas.height=Math.max(1,Math.round(r.height*devicePixelRatio));}
function draw(time){if(!paused&&time-start>DURATION_MS+1000)trigger();let plan;if(paused)plan={id:current,playerId:'fixture',sessionId:session,phase:frozen,elapsedMs:frozen*DURATION_MS,durationMs:DURATION_MS,x:canvas.width/2,y:canvas.height/2,height:h*devicePixelRatio};else plan=lifecycle.plan(current,time,{playerId:'fixture',visible:true,x:canvas.width/2,y:canvas.height/2,height:h*devicePixelRatio});
 const receipt=renderer.draw(plan,{light,reduced,signs,height:h*devicePixelRatio});if(receipt&&sound&&!paused)sound.start(receipt);status.textContent=JSON.stringify({version:VERSION,submissions:renderer.submissions,phase:plan?.phase??null,verify,soundStarts:sound?.starts??0,errors:renderer.errors},null,2);raf=requestAnimationFrame(draw);}
document.querySelector('#replay').onclick=()=>{paused=false;trigger();};scale.onchange=()=>h=Number(scale.value);document.querySelector('#light').onchange=e=>light=e.target.checked;document.querySelector('#reduced').onchange=e=>reduced=e.target.checked;
const button=document.querySelector('#sound');if(verify){button.disabled=true;button.textContent='検証モード：無音';}else button.onclick=async()=>{audio??=new AudioContext();await audio.resume();sound??=new CleanseSound({context:audio,sessionId:session});button.textContent='音声 有効';trigger();};
try{resize();renderer=await createRenderer(canvas);trigger();window.cleansePreview={version:VERSION,renderer,verify,lifecycle,setPhase(p){paused=true;frozen=p;},setSize(n){h=n;},setLight(v){light=v;},setReduced(v){reduced=v;},setSigns(v){signs=v;},resume(){paused=false;trigger();},async check(){return renderer.check();},get count(){return count;},get soundStarts(){return sound?.starts??0;}};raf=requestAnimationFrame(draw);window.addEventListener('resize',resize);}catch(e){status.textContent=e.stack;window.cleanseFailure=e.stack;}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);sound?.stop();audio?.close();renderer?.dispose();});









