export const SCHEMA='dva-gallery-startup/v1';
export const GALLERY_VERSION='luminous-sol61-r1';
const KEYS=['galleryStartupToken','galleryVersionId','galleryAttemptEpoch'];
const STAGES=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
export function parseGalleryBinding(search){
 const query=new URLSearchParams(search);
 if(!KEYS.some(key=>query.has(key)))return null;
 if(KEYS.some(key=>query.getAll(key).length!==1))throw new TypeError('Invalid gallery binding cardinality');
 const token=query.get(KEYS[0]),versionId=query.get(KEYS[1]),raw=query.get(KEYS[2]);
 const attemptEpoch=Number(raw);
 if(!/^[0-9a-f]{32}$/.test(token)||versionId!==GALLERY_VERSION||!/^\d+$/.test(raw)||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<=0)throw new TypeError('Invalid gallery binding');
 return Object.freeze({token,versionId,attemptEpoch});
}
export function createGalleryProtocol({binding,origin,parentSource,post}){
 let sequence=0,stageIndex=-1,readySent=false,retireReplySent=false;
 function emit(payload){
  if(!binding)return false;
  post({...payload,schema:SCHEMA,...binding,sequence:++sequence});return true;
 }
 function progress(stage,status='pending',extra={}){
  const index=STAGES.indexOf(stage);
  if(index<0||index<stageIndex||!['pending','delayed','error','cancelled','unsupported'].includes(status)||(readySent&&!['error','unsupported','cancelled'].includes(status)))return false;
  stageIndex=index;return emit({...extra,stage,status});
 }
 function ready(firstFrame){
  if(readySent||!firstFrame||firstFrame.recorded!==true||firstFrame.submitted!==true||firstFrame.completed!==true||firstFrame.canvasConnected!==true||firstFrame.passes!==1||!(firstFrame.viewportWidth>0&&firstFrame.viewportHeight>0))return false;
  if(!binding)return false;
  readySent=true;stageIndex=STAGES.length-1;
  return emit({stage:'playing',status:'ready',firstFrame});
 }
 function acceptsRetire(event){
  const data=event.data;
  return !!binding&&event.source===parentSource&&event.origin===origin&&!!data&&data.schema===SCHEMA&&data.action==='retire'&&data.token===binding.token&&data.versionId===binding.versionId&&data.attemptEpoch===binding.attemptEpoch;
 }
 function retirement(success,lifecycle){
  if(retireReplySent||!binding)return false;
  retireReplySent=true;
  return emit({action:success?'retired':'retire-error',type:success?'dva-effect-retired':'dva-effect-retire-error',lifecycle});
 }
 return Object.freeze({progress,ready,acceptsRetire,retirement,get stage(){return STAGES[Math.max(0,stageIndex)];}});
}
