import {createRenderer,version,durationMs} from './effect.mjs?revision=sol61-mana-zero-r4';
import {createSoundGate} from './sfx.mjs?revision=sol61-mana-zero-r4';
const query=new URLSearchParams(location.search);const verify=query.has('verify');const embed=query.has('embed')||query.has('gallery');document.body.classList.toggle('embed',embed);
const state=window.__manaZero={version,ready:false,errors:[],submits:0,frames:0,loops:0,rafIntervals:[],verify};const gate=createSoundGate({verify});window.__gallerySfx={activateFromGesture:async()=>gate.activateFromGesture(),snapshot:()=>gate.snapshot()};
let renderer,animation,previous=0,epoch=0,lastLoop=-1,fixed=null;let options={};const cycleMs=2400;
window.__controls={async gpuCheckpoint(){const start=performance.now();await renderer.done();return performance.now()-start;},async sample(seconds,next={}){fixed=seconds*1000;options={...next};renderer.render(fixed,options);await renderer.done();return state;},resume(){fixed=null;epoch=performance.now();lastLoop=-1},dispose:async()=>{cancelAnimationFrame(animation);renderer?.destroy();await gate.dispose()}};
document.addEventListener('pointerdown',()=>gate.activateFromGesture());window.addEventListener('message',e=>{if(e.data?.type==='dva-gallery-sfx-activate'||e.data?.type==='gallery-sfx-activate')gate.activateFromGesture()});
try{renderer=await createRenderer(document.querySelector('canvas'),state);const prep=performance.now();renderer.render(0,options);await renderer.done();state.gpuPrewarmMs=performance.now()-prep;epoch=performance.now();state.ready=true;function frame(now){if(previous){state.rafIntervals.push(now-previous);if(state.rafIntervals.length>3000)state.rafIntervals.shift()}previous=now;const elapsed=Math.max(0,now-epoch);const loop=Math.floor(elapsed/cycleMs);if(fixed===null&&loop!==lastLoop){lastLoop=loop;state.loops++;gate.play()}renderer.render(fixed===null?elapsed%cycleMs:fixed,options);state.frames++;state.audio=gate.snapshot();animation=requestAnimationFrame(frame)}animation=requestAnimationFrame(frame);
}catch(e){state.errors.push(String(e));document.getElementById('error').textContent=String(e)}





