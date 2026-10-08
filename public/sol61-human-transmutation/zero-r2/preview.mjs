import { VERSION, DURATION_MS, DEFAULTS, Playback } from './plan.mjs';
import {createRenderer} from './renderer.mjs';
import {Sfx} from './sfx.mjs';
const query=new URLSearchParams(location.search),verify=query.has('verify');
if(query.has('embed'))document.body.classList.add('embedded');
const canvas=document.querySelector('canvas'),status=document.querySelector('output');
const clock=new Playback(),sfx=new Sfx({verify});
let settings={...DEFAULTS},renderer,ready=false,closed=false,error=null,raf=0,pending=false,rendering=false,generation=1,causeId=`${VERSION}:1`,lastReceipt=null,lastAge=0;
sfx.invalidate(generation);
const hook=async()=>sfx.activateFromGesture();hook.activateFromGesture=hook;hook.setMuted=v=>sfx.setMuted(v);hook.snapshot=()=>sfx.snapshot();globalThis.__gallerySfx=hook;
function invalidate(){generation++;sfx.invalidate(generation);}
function schedule(){if(closed)return;if(rendering||!ready){pending=true;return;}if(!raf)raf=requestAnimationFrame(tick);}
async function tick(){raf=0;if(closed||!ready)return;const rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;
  if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0){sfx.stop();pending=true;return;}
  const ageMs=clock.age(),myGeneration=generation;lastAge=ageMs;
  rendering=true;pending=false;
  try{const receipt=await renderer.render({...settings,ageMs,causeId,generation:myGeneration,width:Math.round(rect.width*dpr),height:Math.round(rect.height*dpr),bodyHeight:settings.bodyHeightCss*dpr,centerX:settings.centerX??rect.width*dpr*.5,centerY:settings.centerY??rect.height*dpr*.5});
    if(closed)return;lastReceipt=receipt;
    if(myGeneration===generation)sfx.afterGpu(receipt,{held:clock.held!==null,visible:!document.hidden,generation:myGeneration,causeId,ageMs:clock.age()});
    status.textContent=`${VERSION} | ${receipt.phase} ${Math.round(ageMs)} ms | H${settings.bodyHeightCss} | GPU ${receipt.submission} 完了 | 品質未検証`;
  }catch(e){if(!closed){error=String(e);status.textContent=error;ready=false;sfx.stop();}return;}finally{rendering=false;}
  if(clock.held===null&&ageMs<DURATION_MS&&!document.hidden)schedule();
  else if(pending){pending=false;schedule();}
}
function replay(){if(closed)return false;invalidate();clock.replay();causeId=`${VERSION}:${clock.serial}`;error=null;schedule();return true;}
function hold(ageMs){if(closed)return false;clock.hold(ageMs);invalidate();schedule();return true;}
function resume(){if(closed)return false;invalidate();clock.resume();schedule();return true;}
function configure(patch){if(closed)return false;for(const key of Object.keys(patch))if(!(key in DEFAULTS))throw Error(`Unknown option ${key}`);if('bodyHeightCss'in patch&&(!Number.isFinite(patch.bodyHeightCss)||patch.bodyHeightCss<=0))throw Error('bodyHeightCss must be positive');settings={...settings,...patch};invalidate();schedule();return true;}
function snapshot(){return {version:VERSION,ready,closed,error,verify,ageMs:lastAge,causeId,generation,heldAgeMs:clock.held,settings:{...settings},width:canvas.width,height:canvas.height,bodyHeightCss:settings.bodyHeightCss,backingHeight:settings.bodyHeightCss*(devicePixelRatio||1),submitted:renderer?.snapshot().submitted??0,completed:renderer?.snapshot().completed??0,lastReceipt,renderer:renderer?.snapshot()??null,sfx:sfx.snapshot()};}
const resize=new ResizeObserver(()=>{invalidate();schedule();});resize.observe(canvas);
function visibility(){invalidate();if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();}
document.addEventListener('visibilitychange',visibility);
async function dispose(){if(closed)return;closed=true;ready=false;invalidate();cancelAnimationFrame(raf);raf=0;resize.disconnect();document.removeEventListener('visibilitychange',visibility);await sfx.dispose();await renderer?.dispose();}
globalThis.__humanZero={replay,hold,resume,configure,snapshot,dispose};
document.querySelector('#replay').onclick=()=>{sfx.activateFromGesture();replay();};
document.querySelector('#sound').onclick=()=>sfx.activateFromGesture();
addEventListener('pagehide',dispose,{once:true});
try{renderer=await createRenderer(canvas);if(closed)await renderer.dispose();else{ready=true;pending=false;clock.replay();causeId=`${VERSION}:${clock.serial}`;schedule();}}catch(e){error=String(e);status.textContent=error;}
