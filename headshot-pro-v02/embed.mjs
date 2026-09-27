import {HeadshotContactSystem,HeadshotRenderer,RateClock} from './src/index.mjs';
import {FixtureHost,DISPLAY_VARIANTS,fixtureScene} from './preview/fixture-host.mjs';
import {PresentationTime,PreviewLoopController} from './preview/loop-controller.mjs';

const status=document.getElementById('status');
const time=new PresentationTime();
const clock=new RateClock({sourceNow:time.now});
const host=new FixtureHost(clock);
const system=new HeadshotContactSystem({clock,verifyCanonical:host.verifyCanonical,getPermission:host.getPermission,roomId:host.roomId,epoch:host.epoch});
const loop=new PreviewLoopController({time,clock,host,system,variants:DISPLAY_VARIANTS});
const views=[];
let ready=false,error=null,stopped=false,inFlight=false;

function tiledScene(size,light){
  const width=320,height=128;
  const out=new Uint8Array(width*height*4);
  const bg=light?[201,205,208]:[20,24,31];
  for(let i=0;i<out.length;i+=4){out[i]=bg[0];out[i+1]=bg[1];out[i+2]=bg[2];out[i+3]=255;}
  const tile=fixtureScene(size,size,{single:true,light});
  for(let index=0;index<DISPLAY_VARIANTS.length;index++){
    const x0=(index%5)*64+(64-size)/2,y0=Math.floor(index/5)*64+(64-size)/2;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const src=(y*size+x)*4,dst=((y0+y)*width+x0+x)*4;
      out.set(tile.subarray(src,src+4),dst);
    }
  }
  return out;
}
function projection(frame,size){
  const index=DISPLAY_VARIANTS.indexOf(frame.event.variant);
  if(index<0)throw new Error('unknown variant');
  return {center:[(index%5)*64+32,Math.floor(index/5)*64+32],axisX:[size/2,0],axisY:[0,-size/2]};
}
function stop(reason){
  stopped=true;error=String(reason?.message??reason);
  status.textContent='WebGPU再生不可';
  system.cancelAll('preview_failure');
}
async function tick(wallNow){
  if(stopped||inFlight)return;
  inFlight=true;
  try{
    const frames=await loop.step(wallNow);
    const mask=host.mask();
    for(const view of views){
      const records=frames.map(frame=>({frame,projection:projection(frame,view.size),mask}));
      view.renderer.render(records);
    }
    await views[0].renderer.submitted();
    if(views.some(view=>view.renderer.isLost))throw new Error('GPU device lost');
    loop.recordSubmitted(frames);
    if(!ready&&frames.some(frame=>frame.envelope.body>0)){
      ready=true;
      status.textContent='自動再生中 · 旧版の品質不合格比較';
    }
  }catch(cause){stop(cause)}finally{inFlight=false;if(!stopped)requestAnimationFrame(tick)}
}
try{
  const configs=[['h64-dark',64,false],['h64-light',64,true],['h32-dark',32,false],['h32-light',32,true]];
  for(const [id,size,light] of configs){
    const canvas=document.getElementById(id);
    const renderer=await HeadshotRenderer.create({canvas,device:views[0]?.renderer.device??null});
    renderer.setScenePixels(tiledScene(size,light));
    views.push({id,size,light,renderer});
  }
  requestAnimationFrame(tick);
}catch(cause){stop(cause)}
document.addEventListener('visibilitychange',()=>{
  loop.setSuspended(document.hidden);
  if(!document.hidden&&!stopped)requestAnimationFrame(tick);
});
window.__headshotGallery={get ready(){return ready},get error(){return error},get snapshot(){return loop.snapshot()},get adapter(){return views[0]?.renderer.diagnostics.adapterInfo??null},get diagnostics(){return views.map(view=>({id:view.id,size:view.size,shaderMessages:view.renderer.diagnostics.shaderMessages,uncapturedErrors:view.renderer.diagnostics.uncapturedErrors,deviceLost:view.renderer.diagnostics.deviceLost}))}};
