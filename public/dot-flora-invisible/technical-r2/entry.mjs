import {bootPreview,getPreviewController} from './preview.mjs';
import {bindGalleryChild} from './gallery-child.mjs';
import {VERSION_IDS} from './catalog-entry.mjs';
export function connectEntry({window:win=globalThis.window,controller=getPreviewController(),autoLoop=true,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  if(!controller)throw new Error('preview controller unavailable');
  const url=new URL(win.location.href),requested=url.searchParams.get('galleryVersionId');
  const versionId=requested||VERSION_IDS[1];
  if(!VERSION_IDS.includes(versionId))throw new Error('unknown frozen version');
  let timer=null,disposed=false,offFrame=()=>{},offState=()=>{},scheduled=null,loopSerial=0;
  const cancelLoop=()=>{loopSerial++;if(timer!==null)clearTimer(timer);timer=null;scheduled=null;};
  const replaySafely=async()=>{if(disposed)return false;try{return await controller.replay();}catch(error){cancelLoop();adapter.reportVisualError(error);return false;}};
  const adapter=bindGalleryChild({window:win,versionId,getSnapshot:controller.getSnapshot,replay:replaySafely,stop:()=>{cancelLoop();return controller.stop();},setMuted:controller.setMuted,unlockFromGesture:controller.unlockFromGesture,dispose:async()=>{disposed=true;cancelLoop();offFrame();offState();return controller.dispose();}});
  offFrame=controller.subscribeFrame(()=>{
    adapter.reportFrame();
    if(autoLoop&&url.searchParams.get('galleryAutoLoop')==='1'&&!disposed&&timer===null){
      const s=controller.getSnapshot();
      if(s?.state!=='playing'||!s.active||s.lastVisualError)return;
      scheduled={causeId:s.causeId,generation:s.generation};const serial=++loopSerial;
      timer=setTimer(async()=>{timer=null;const current=controller.getSnapshot();if(disposed||serial!==loopSerial||current?.state==='held'||current?.state==='disposed'||current?.lastVisualError||current?.causeId!==scheduled?.causeId||current?.generation!==scheduled?.generation)return;scheduled=null;await replaySafely();},Math.max(0,1600-s.sourceAgeMs)+1000);
    }
  });
  offState=controller.subscribeState(s=>{
    if(s?.lastVisualError){cancelLoop();adapter.reportVisualError(s.lastVisualError);return;}
    // Natural expiry keeps the same cause's timer. Explicit stop before expiry,
    // held/disposed, and replacement invalidate the pending automatic replay.
    if(s?.state==='held'||s?.state==='disposed'||s?.lifecycle?.teardown!=='active'||(s?.state==='stopped'&&(s.sourceAgeMs<1600||s.lastPlaybackEvent==='stopped'))||
      (scheduled&&(s?.causeId!==scheduled.causeId||s?.generation!==scheduled.generation)))cancelLoop();
  });
  adapter.reportStage('adapter');
  if(autoLoop&&url.searchParams.get('galleryAutoLoop')==='1')void replaySafely();
  return Object.freeze({adapter,versionId,getSnapshot:controller.getSnapshot,dispose:adapter.retire});
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const controller=bootPreview();
  if(controller)globalThis.__floraEntry=connectEntry({window,controller});
}
