import {VERSION,TYPES,DURATIONS,EmpTimeline,createEmpRenderer} from './emp.mjs?v=1.8';
import {EmpAudio} from './sfx.mjs?v=1.8';
const params=new URLSearchParams(location.search),verify=params.has('verify');
if(params.get('embed')==='1')document.body.classList.add('embed');
const canvas=document.querySelector('canvas'),timeline=new EmpTimeline(),audio=new EmpAudio({verification:verify});
const controls=Object.fromEntries(['variant','negative','acc2','reduced','obs','status','label','phase','audio'].map(id=>[id,document.getElementById(id)]));
if(verify){controls.audio.disabled=true;controls.audio.textContent='検証：無音固定';}
const labels={standard:'充填 → 空間伝播 → 受信側の遮断','emp-charge':'充填',emp:'放出','emp-resonance':'同位相共鳴','emp-cancel':'逆位相相殺','emp-storage-lock':'機器異常・ストレージ遮断'};
const sequence=['standard','emp-resonance','emp-cancel'];
let renderer,running=true,frameId=0,last=0,cycleStart=0,cycle=0,sequenceIndex=0,forced=false,current='standard',released=false,received=false;
const metrics={version:VERSION,frames:0,submitted:0,eventEmits:0,maxGapMs:0,gaps:[],errors:[],verify,cleanup:false};
const owners=()=>new Map([['emitter',{id:'emitter',x:current==='standard'?390:480,y:310,actorTimeScale:1,movementAccActive:controls.acc2.checked,movementAccEnabled:true,alive:true}],['receiver',{id:'receiver',x:550,y:310,actorTimeScale:1,movementAccActive:controls.acc2.checked,movementAccEnabled:true,alive:true}]]);
function emit(type,now,extra={}){
 const receipt={id:`preview-${cycle}-${type}`,empCausalId:`cause-${cycle}`,type,x:480,y:310,playerId:'emitter',ownerId:'emitter',radius:type==='emp-storage-lock'?105:type==='emp-charge'?125:230,variant:controls.negative.checked?'negative':'positive',empPulseId:`pulse-${cycle}`,empSourceAxis:.15,sourceHalfSpan:75,durationMs:DURATIONS[type],...extra};
 if(timeline.ingest(receipt,now,owners().get(receipt.ownerId)))metrics.eventEmits++;
}
function restart(type,now){timeline.reset(`preview-${++cycle}`);audio.reset();current=type;cycleStart=now;released=false;received=false;emit(type==='standard'?'emp-charge':type,now,type==='standard'?{x:390}:{});}
function advance(now){
 if(current==='standard'&&!released&&now-cycleStart>=1200){released=true;emit('emp',cycleStart+1200,{x:390,radius:260,resolvedEmpPulseIds:[`pulse-${cycle}`]});}
 let events=timeline.advance(now,owners());
 // This standalone fixture explicitly supplies a target receipt. Renderer proximity
 // and pixels never create gameplay hits; production must supply the real receipt.
 const wave=events.find(e=>e.type==='emp');
 if(current==='standard'&&!received&&wave?.visualMs>=500){received=true;emit('emp-storage-lock',now,{x:550,playerId:'receiver',ownerId:'receiver',variant:'storage',radius:105});events=timeline.advance(now,owners());}
 return events;
}
function draw(now){if(!renderer)return;const result=renderer.render(advance(now),{reducedMotion:controls.reduced.checked,observation:controls.obs.checked,background:params.get('light')==='1'?[.88,.9,.93,1]:[.018,.025,.045,1]});audio.presented(result.visible);metrics.frames++;metrics.submitted=result.submits;
 controls.label.textContent=labels[current];controls.phase.textContent=`${controls.negative.checked?'逆相':'正相'} · ${controls.acc2.checked?'ACC2':'等速'} · ${((now-cycleStart)/1000).toFixed(2)} s`;if(metrics.frames%20===0)controls.status.textContent=`${VERSION} · GPU ${metrics.submitted} frames · ${verify?'無音検証':'操作で音を有効化'} · ${renderer.errors.length?'GPUエラー':'正常描画'}`;
}
function frame(now){if(!running)return;if(last){const gap=now-last;metrics.maxGapMs=Math.max(metrics.maxGapMs,gap);metrics.gaps.push(gap);if(metrics.gaps.length>1800)metrics.gaps.shift();}last=now;
 if(!forced){if(now-cycleStart>(current==='standard'?9500:DURATIONS[current]+650)){if(controls.variant.value==='sequence')sequenceIndex=(sequenceIndex+1)%sequence.length;restart(controls.variant.value==='sequence'?sequence[sequenceIndex]:controls.variant.value,now);}draw(now);}frameId=requestAnimationFrame(frame);
}
async function start(){try{renderer=await createEmpRenderer(canvas);restart(current,performance.now());frameId=requestAnimationFrame(frame);window.__EMP_READY__=true;}catch(error){metrics.errors.push(String(error));controls.status.textContent=String(error);window.__EMP_ERROR__=String(error);}}
function sampleEvent(type,visualMs,wallMs,options={}){return {id:'sample',key:'sample',type,x:480,y:310,radius:type==='emp-charge'?125:type==='emp-storage-lock'?105:230,variant:options.negative?'negative':'positive',empSourceAxis:options.axis??.15,sourceHalfSpan:options.sourceHalfSpan??75,duration:DURATIONS[type],visualMs,wallMs,rate:options.rate||1};}
function renderOptions(options){return {reducedMotion:!!options.reduced,observation:options.observation!==false,scale:options.scale||1,offsetX:options.scale?480*(1-options.scale):0,offsetY:options.scale?310*(1-options.scale):0,background:options.transparent?[0,0,0,0]:options.light?[.88,.9,.93,1]:[.018,.025,.045,1]};}
window.__EMP__={metrics,timeline,audio,
 async sample(type,visualMs,wallMs=visualMs,options={}){forced=true;current=type;controls.label.textContent=labels[type];controls.phase.textContent=`visual ${visualMs} ms / wall ${wallMs} ms`;const e=sampleEvent(type,visualMs,wallMs,options);const events=((type==='emp-charge'||type==='emp-storage-lock')?wallMs:visualMs)>=DURATIONS[type]?[]:[e];
  if(options.receiver&&type==='emp'&&visualMs>=550)events.push({...sampleEvent('emp-storage-lock',visualMs-550,wallMs-550,options),id:'receiver',key:'receiver',x:640});
  const result=renderer.render(events,renderOptions(options));const pixels=options.inspect?await renderer.inspectPixels():null;await renderer.device.queue.onSubmittedWorkDone();return {submits:result.submits,errors:renderer.errors,adapter:renderer.adapterInfo,pixels};},
 async fixture(wallMs,options={}){forced=true;restart('standard',0);if(wallMs>=1200)advance(1200);if(wallMs>=1700)advance(1700);const result=renderer.render(advance(wallMs),renderOptions(options));controls.label.textContent=labels.standard;controls.phase.textContent=`連続 fixture ${wallMs} ms`;await renderer.device.queue.onSubmittedWorkDone();return {events:result.visible.map(e=>({type:e.type,visualMs:e.visualMs,wallMs:e.wallMs})),errors:renderer.errors};},
 resume(){forced=false;restart(controls.variant.value==='sequence'?sequence[sequenceIndex]:controls.variant.value,performance.now());},
 getGPU(){return {errors:renderer.errors,compilation:renderer.compilation,adapter:renderer.adapterInfo};},
 async dispose(){running=false;cancelAnimationFrame(frameId);await audio.destroy();renderer.destroy();metrics.cleanup=true;}
};
document.getElementById('restart').onclick=()=>{forced=false;restart(controls.variant.value==='sequence'?sequence[sequenceIndex]:controls.variant.value,performance.now());};
controls.variant.onchange=()=>{forced=false;restart(controls.variant.value==='sequence'?sequence[0]:controls.variant.value,performance.now());};
controls.audio.onclick=async()=>{if(await audio.enable())controls.audio.textContent='音：有効';};
window.addEventListener('pagehide',()=>window.__EMP__.dispose(),{once:true});start();


