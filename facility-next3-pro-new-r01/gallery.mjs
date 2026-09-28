import {FACILITIES,VERSION,ReceiptClock,ReceiptLedger,FacilityUseRuntime,OneShotAudio,NativeWebGPUMeshRenderer} from './src/index.mjs';
import {MeshBuilder} from './src/mesh.mjs';

const $=id=>document.getElementById(id),canvas=$('view');
const verify=new URLSearchParams(location.search).has('verify');
const epoch=1800000000000,base=performance.now(),records=[];
const testKinds=Object.fromEntries(FACILITIES.map((d,i)=>[d.objectId,`TEST_ONLY_KIND_${i}`]));
const ledger=new ReceiptLedger();
let device,context,renderer,runtime,audio,audioContext,formatView,raf=0,disposed=false,selected=0,cycle=0,nextAutoAt=Infinity;
const audit=e=>{records.push({...e,at:performance.now()});if(records.length>80)records.shift();$('log').textContent=records.slice(-10).map(x=>JSON.stringify(x)).join('\n');};
$('mode').textContent=verify?'verify付き技術再生：無音。effectKindはTEST_ONLY fixtureです。':'通常技術再生：SFXはボタン操作後の新規イベントのみ。';
$('enableAudio').hidden=verify;

function makeRuntime(){runtime=new FacilityUseRuntime({effectKinds:testKinds,clock:new ReceiptClock({serverEpochMs:epoch,monotonicMs:base}),ledger,renderer,audio,verify,audit});}
function emit(index){
  selected=index;cycle++;
  const d=FACILITIES[index],receipt={objectId:d.objectId,type:d.type,effectKind:testKinds[d.objectId],playerId:'gallery-fixture',
    objectCausalId:`technical-replay:${cycle}`,capturedTime:Math.round(epoch+performance.now()-base),worldOrigin:{...d.origin}};
  const decision=runtime.onSuccess(receipt);audit({kind:'synthetic_fixture_receipt',objectId:d.objectId,effectKind:testKinds[d.objectId],decision});
  nextAutoAt=performance.now()+2500;
}
function receiverFor(receipt){
  const {x,y}=receipt.worldOrigin,a=[x-38,y-19,0],b=[x+38,y-19,0],c=[x+38,y+19,0],d=[x-38,y+19,0];
  return [{triangles:[[a,b,c],[a,c,d]],normal:[0,0,1],albedo:[.46,.50,.55],roughness:.65,f0:[.04,.04,.04],viewDirection:[0,-.55,1],sourceVisibility:1}];
}
function frameBinding(){
  const ratio=devicePixelRatio||1,w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const d=FACILITIES[selected],pixels=Math.min(w/250,h/175),sx=2*pixels/w,sy=2*pixels/h,cx=d.origin.x,cy=d.origin.y-32;
  return {worldToClip:new Float32Array([sx,0,0,0,0,-sy,0,0,0,sy,0,0,-cx*sx,cy*sy,.5,1]),
    viewport:{x:0,y:0,width:w,height:h},sourceVisibility:()=>1,receiverSurfaces:receiverFor,protectedRects:[]};
}
function render(){
  if(disposed||!runtime||!device)return;
  const now=performance.now();
  if($('auto').checked&&now>=nextAutoAt)emit((selected+1)%FACILITIES.length);
  try{
    const frame=frameBinding(),built=runtime.buildFrame(frame),facility=FACILITIES[selected],background=new MeshBuilder();
    for(const surface of receiverFor({worldOrigin:facility.origin}))for(const tri of surface.triangles)background.tri(tri,[.055,.065,.078],1);
    built.mesh.alpha.unshift(...background.alpha);
    const encoder=device.createCommandEncoder({label:'facility-use-e/gallery-fixture'});
    const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView({format:formatView}),loadOp:'clear',storeOp:'store',clearValue:{r:.008,g:.012,b:.020,a:1}}]});
    const draw=renderer.draw(pass,built.mesh,frame);pass.end();device.queue.submit([encoder.finish()]);
    $('stats').textContent=`WebGPU submitted · ${facility.objectId} · ${Math.round(built.stats.vertices+draw.vertices)} vertices · synthetic event mapping · ${verify?'silent verify':'normal mode'}`;
    raf=requestAnimationFrame(render);
  }catch(error){audit({kind:'render_failed',message:String(error)});$('stats').textContent=`WebGPU render error: ${String(error)}`;}
}
async function initialize(){
  if(!navigator.gpu)throw Error('WebGPU unavailable; fallback renderer is disabled');
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');
  const info=adapter.info;if(info?.isFallbackAdapter===true||/swiftshader|llvmpipe|software/i.test(info?.description??''))throw Error('Software/fallback adapter rejected');
  device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>audit({kind:'gpu_error',message:e.error.message}));
  context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas context unavailable');
  const format=navigator.gpu.getPreferredCanvasFormat();formatView=`${format}-srgb`;context.configure({device,format,alphaMode:'opaque',viewFormats:[formatView]});
  renderer=await NativeWebGPUMeshRenderer.create({device,format:formatView});
  device.lost.then(info=>{if(!disposed){cancelAnimationFrame(raf);audit({kind:'device_lost',reason:info.reason,message:info.message});}});
  makeRuntime();emit(0);audit({kind:'gpu_initialized',adapter:info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description}:null,version:VERSION});
  $('mode').textContent=`WebGPU ready · auto-loop ${$('auto').checked?'on':'off'} · ${verify?'verify silent':'normal mode'}`;render();
}
$('auto').onchange=()=>{nextAutoAt=$('auto').checked?performance.now()+2500:Infinity;};
$('enableAudio').onclick=async()=>{
  if(verify||audioContext||!runtime)return;
  try{
    audioContext=new AudioContext({latencyHint:'interactive'});await audioContext.resume();
    audio=new OneShotAudio({context:audioContext,destination:audioContext.destination,volume:Number($('volume').value),muted:$('mute').checked,audit});
    runtime.dispose();makeRuntime();$('enableAudio').disabled=true;$('enableAudio').textContent='SFX有効：次回の新規イベントから';
    audit({kind:'audio_enabled_by_user_gesture',sampleRate:audioContext.sampleRate});
  }catch(error){audit({kind:'audio_init_failed',message:String(error)});}
};
for(const id of ['mute','volume'])$(id).oninput=()=>audio?.setState({muted:$('mute').checked,volume:Number($('volume').value)});
addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);runtime?.dispose();audio?.dispose();renderer?.dispose();device?.destroy();},{once:true});
initialize().catch(error=>{$('mode').textContent=`WebGPU unavailable: ${String(error)}`;$('stats').textContent='実GPU再生は成立していません。';audit({kind:'gpu_init_failed',message:String(error)});});
