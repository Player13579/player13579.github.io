import {VERSION,TYPES,DURATIONS,EmpTimeline,createEmpRenderer} from './emp.mjs?v=1.5';
import {EmpAudio} from './sfx.mjs?v=1.5';
const params=new URLSearchParams(location.search),verify=params.has('verify');
if(params.get('embed')==='1')document.body.classList.add('embed');
const canvas=document.querySelector('canvas'),timeline=new EmpTimeline(),audio=new EmpAudio({verification:verify});
const controls=Object.fromEntries(['variant','negative','acc2','reduced','obs','status','label','phase','audio'].map(id=>[id,document.getElementById(id)]));
if(verify){controls.audio.disabled=true;controls.audio.textContent='検証：無音固定';}
const labels={'emp-charge':'充填',emp:'放出','emp-resonance':'同位相共鳴','emp-cancel':'逆位相相殺','emp-storage-lock':'機器異常・ストレージ遮断'};
const sequence=Object.keys(TYPES);let renderer,running=true,frameId=0,last=0,cycleStart=0,cycle=0,sequenceIndex=0,forced=null,current='emp-charge';
const metrics={version:VERSION,frames:0,submitted:0,eventEmits:0,maxGapMs:0,gaps:[],errors:[],verify,cleanup:false};
const owner=()=>({id:'emitter',x:480,y:310,actorTimeScale:1,movementAccActive:controls.acc2.checked,movementAccEnabled:true,alive:true});
function restart(type,now){timeline.reset(`preview-${++cycle}`);audio.reset();current=type;cycleStart=now;const o=owner();timeline.ingest({id:`preview-${cycle}`,type,x:480,y:310,playerId:'emitter',ownerId:'emitter',radius:type==='emp-storage-lock'?105:type==='emp-charge'?105:230,variant:controls.negative.checked?'negative':'positive',empPulseId:`pulse-${cycle}`,empSourceAxis:.15,sourceHalfSpan:75,durationMs:DURATIONS[type]},now,o);metrics.eventEmits++;}
function draw(now){if(!renderer)return;const events=timeline.advance(now,new Map([['emitter',owner()]]));const result=renderer.render(events,{reducedMotion:controls.reduced.checked,observation:controls.obs.checked,background:params.get('light')==='1'?[.88,.9,.93,1]:[.018,.025,.045,1]});audio.presented(result.visible);metrics.frames++;metrics.submitted=result.submits;
controls.label.textContent=labels[current];controls.phase.textContent=`${controls.negative.checked?'逆相':'正相'} · ${controls.acc2.checked?'ACC2':'等速'} · ${((now-cycleStart)/1000).toFixed(2)} s`;if(metrics.frames%20===0)controls.status.textContent=`${VERSION} · GPU ${metrics.submitted} frames · ${verify?'無音検証':'操作で音を有効化'} · ${renderer.errors.length?'GPUエラー':'正常描画'}`;return events;}
function frame(now){if(!running)return;if(last){const gap=now-last;metrics.maxGapMs=Math.max(metrics.maxGapMs,gap);metrics.gaps.push(gap);if(metrics.gaps.length>600)metrics.gaps.shift();}last=now;
if(!forced){if(now-cycleStart>DURATIONS[current]+650){if(controls.variant.value==='sequence')sequenceIndex=(sequenceIndex+1)%sequence.length;restart(controls.variant.value==='sequence'?sequence[sequenceIndex]:controls.variant.value,now);}draw(now);}frameId=requestAnimationFrame(frame);}
async function start(){try{renderer=await createEmpRenderer(canvas);restart(current,performance.now());frameId=requestAnimationFrame(frame);window.__EMP_READY__=true;}catch(error){metrics.errors.push(String(error));controls.status.textContent=String(error);window.__EMP_ERROR__=String(error);}}
window.__EMP__={metrics,timeline,audio,
 async sample(type,visualMs,wallMs=visualMs,options={}){forced=true;current=type;controls.label.textContent=labels[type];controls.phase.textContent=`visual ${visualMs} ms / wall ${wallMs} ms`;const e={id:'sample',key:'sample',type,x:480,y:310,radius:type==='emp-charge'||type==='emp-storage-lock'?105:230,variant:options.negative?'negative':'positive',empSourceAxis:options.axis??.15,sourceHalfSpan:options.sourceHalfSpan??75,duration:DURATIONS[type],visualMs,wallMs,rate:options.rate||1};const result=renderer.render(((type==='emp-charge'||type==='emp-storage-lock')?wallMs:visualMs)>=DURATIONS[type]?[]:[e],{reducedMotion:!!options.reduced,observation:options.observation!==false,scale:options.scale||1,offsetX:options.scale?480*(1-options.scale):0,offsetY:options.scale?310*(1-options.scale):0,background:options.transparent?[0,0,0,0]:options.light?[.88,.9,.93,1]:[.018,.025,.045,1]});const pixels=options.inspect?await renderer.inspectPixels():null;await renderer.device.queue.onSubmittedWorkDone();return {submits:result.submits,errors:renderer.errors,adapter:renderer.adapterInfo,pixels};},
 resume(){forced=null;restart(current,performance.now());},
 getGPU(){return {errors:renderer.errors,compilation:renderer.compilation,adapter:renderer.adapterInfo};},
 async dispose(){running=false;cancelAnimationFrame(frameId);await audio.destroy();renderer.destroy();metrics.cleanup=true;}
};
document.getElementById('restart').onclick=()=>{forced=null;restart(controls.variant.value==='sequence'?sequence[sequenceIndex]:controls.variant.value,performance.now());};
controls.variant.onchange=()=>{forced=null;restart(controls.variant.value==='sequence'?sequence[0]:controls.variant.value,performance.now());};
controls.audio.onclick=async()=>{if(await audio.enable())controls.audio.textContent='音：有効';};
window.addEventListener('pagehide',()=>window.__EMP__.dispose(),{once:true});start();




