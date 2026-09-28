import {HeartReceiptCore} from './core.mjs';
import {createCanvasRenderer} from './gpu.mjs';
import {HeartSFX} from './sfx.mjs';
import {WallClock} from './contract.mjs';
/**
 * 本編接続点。subscribePrivateReceiptsは権威receipt channel専用。
 * 認証、caster時点座標、viewer scope、visibilityの正本はホストが提供する。
 * 先行UI用のemit/pose/actionボタンAPIは公開しない。
 */
export async function mountHeartTeleport({canvas,subscribePrivateReceipts,verifyEnvelope,isCanonicalId,getContext,getVisibility,projectCaster,ledger,verify=false,clock=new WallClock(),onError=()=>{}}){
  if(typeof subscribePrivateReceipts!=='function'||typeof projectCaster!=='function')throw new TypeError('private transport / caster projection required');
  const renderer=await createCanvasRenderer(canvas);
  const sound=new HeartSFX({verify});
  let disposed=false,raf=0;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const core=new HeartReceiptCore({verifyEnvelope,isCanonicalId,getContext,getVisibility:p=>{
    if(!renderer.gpu.ready)return {visible:false};
    const v=getVisibility(p);
    const projected=projectCaster({playerId:p.playerId,x:p.casterX,y:p.casterY});
    const onScreen=!!projected&&projected.inViewport===true&&projected.x>=0&&projected.y>=0&&projected.x<canvas.clientWidth&&projected.y<canvas.clientHeight;
    return {...v,onScreen:v?.onScreen===true&&onScreen,documentVisible:!document.hidden&&v?.documentVisible===true};
  },ledger,clock,onStart:p=>sound.playOnce({id:p.id,ageMs:clock.now()-p.firstReceivedAt}),onStop:p=>sound.stop(p.id)});
  const unsubscribe=subscribePrivateReceipts(e=>{void core.receive(e).catch(()=>onError('receipt_failure'));});
  if(typeof unsubscribe!=='function'){core.dispose();try{await sound.dispose();}finally{renderer.dispose();}throw new TypeError('subscription must return unsubscribe');}
  function frame(){
    if(disposed)return;
    const dpr=Math.min(3,devicePixelRatio||1),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const items=[];
    try{
      for(const p of core.tick()){
        const s=projectCaster({playerId:p.playerId,x:p.casterX,y:p.casterY});
        if(!s||s.inViewport!==true)continue;
        const v=getVisibility(p);
        const clip=v?.clipRect;
        items.push({x:s.x*dpr,y:s.y*dpr,h:64*dpr,dpr,ageMs:p.ageMs,clipRect:clip?{x:clip.x*dpr,y:clip.y*dpr,width:clip.width*dpr,height:clip.height*dpr}:undefined});
      }
      renderer.draw({items,reducedMotion:media.matches});
    }catch{core.cancelAll('frame_failure');sound.stopAll();onError('frame_failure');}
    raf=requestAnimationFrame(frame);
  }
  const hide=()=>{if(document.hidden){core.cancelAll('document_hidden');sound.stopAll();renderer.draw({items:[]});}};
  document.addEventListener('visibilitychange',hide);
  const disposer=async()=>{
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);try{unsubscribe();}catch{onError('unsubscribe_failure');}document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',disposer);
    core.dispose();try{await sound.dispose();}finally{renderer.dispose();}
  };
  window.addEventListener('pagehide',disposer);
  frame();
  return Object.freeze({unlockAudio:event=>sound.unlockFromGesture(event),stats:()=>({core:core.stats(),audio:sound.stats(),gpuReady:renderer.gpu.ready,gpuErrors:renderer.gpu.errors()}),dispose:disposer});
}
