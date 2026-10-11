(() => {
  const query = new URLSearchParams(location.search);
  const context = {token:query.get('galleryStartupToken')||'',versionId:query.get('galleryVersionId')||'',attemptEpoch:Number(query.get('galleryAttemptEpoch')),embedded:query.has('embed'),autoLoop:query.get('galleryAutoLoop')==='1',retired:false,sequence:0,rank:-1,current:{schema:'dva-gallery-startup/v1',token:query.get('galleryStartupToken')||'',versionId:query.get('galleryVersionId')||'',attemptEpoch:Number(query.get('galleryAttemptEpoch')),sequence:0,stage:'child-document',status:'pending'}};
  document.documentElement.dataset.embedded=String(context.embedded);
  Object.defineProperty(window,'__dvaGalleryStartupContext',{value:context,configurable:false});
  Object.defineProperty(window,'__dvaGalleryStartupSnapshot',{value:()=>context.current,configurable:false});
  const retire=event=>{const d=event?.data;if(event?.source!==window.parent||event?.origin!==location.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==context.token||d.versionId!==context.versionId||d.attemptEpoch!==context.attemptEpoch)return;context.retired=true;window.dispatchEvent(new Event('dva-gallery-retire'));};
  window.addEventListener('message',retire);window.addEventListener('pagehide',()=>{context.retired=true;window.dispatchEvent(new Event('dva-gallery-retire'));},{once:true});
  if(context.token&&context.versionId&&Number.isSafeInteger(context.attemptEpoch)&&context.attemptEpoch>0&&window.parent!==window)window.parent.postMessage(context.current,location.origin);
})();
