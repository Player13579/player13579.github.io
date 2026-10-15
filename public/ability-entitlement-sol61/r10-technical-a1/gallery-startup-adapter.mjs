import{makeStatusMessage,abilityR10IdentityValid,isAbilityR10RetireCommand,readAbilityR10Query}from'./gallery-parent-contract.mjs';
const startup=window.__dvaGalleryStartupContext;
if(!startup)throw Error('early gallery startup bootstrap missing');
const{token,versionId,attemptEpoch,embedded,autoLoop}=startup;
const PACKAGE_SCHEMA='ability-entitlement-attached-retirement/v1';
if(versionId!=='ability-entitlement-sol61-r10')throw Error('gallery version identity mismatch');
const parsed=readAbilityR10Query(new URL(location.href).searchParams,location.pathname);
if(parsed.token!==token||parsed.versionId!==versionId||parsed.attemptEpoch!==attemptEpoch)throw Error('startup bootstrap/query mismatch');
const{packageManifestSha256,packageSealSha256,sourceManifestSha256}=parsed;
if(!abilityR10IdentityValid({schema:'dva-gallery-startup/v1',packageSchema:PACKAGE_SCHEMA,versionId,token,attemptEpoch,packageManifestSha256,packageSealSha256,sourceManifestSha256}))throw Error('gallery startup contract invalid');
const phases=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
const status=document.querySelector('#report'),canvas=document.querySelector('#view'),card=document.querySelector('#status');
const expectedSource='8581c573a0c07882db7ca818735004737e4c67e13aa83625a5134c213dd6c1b3';
const expectedShaders=['a877fed453a54c5b0238ac13c26f05c240ab85708dcf666bced7a0db79fba37d','bcd333d4916fb212c36a17b371cac6cc7cdcf5122d4d9bfb903bcb8e08e05bc9','015eceb83966367a589d58cf51634b951ae0452b64574269b01b98eab811f3a5'];
const expectedBaseline='0c3256338a4e88d2dcd660b12ed772d3405305df44d3de9bf314e261cd0a9c3f';
let sequence=startup.sequence||0,rank=startup.rank??-1,retired=Boolean(startup.retired),ready=false,loopEnabled=false,loopTimer=0,pollTimer=0,lastControlSequence=0;
function post(stage,state,extra={}){if(retired||window.parent===window||!token||versionId!=='ability-entitlement-sol61-r10'||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<1)return;const next=phases.indexOf(stage);if(next<rank)return;rank=next;startup.current=makeStatusMessage({token,versionId,attemptEpoch,sequence:++sequence,stage,status:state,extra:{...extra,packageSchema:PACKAGE_SCHEMA,packageManifestSha256,packageSealSha256,sourceManifestSha256,adapterSessionId:sessionId,sourcePins}});startup.sequence=sequence;startup.rank=rank;window.parent.postMessage(startup.current,location.origin)}
function schedule(){if(retired||!ready||!loopEnabled||!embedded||!autoLoop||loopTimer)return;loopTimer=setTimeout(()=>{loopTimer=0;if(retired||!loopEnabled)return;document.querySelector('[data-action="replay"]')?.click();schedule()},1320)}
function setAutoLoopEnabled(value){loopEnabled=Boolean(value)&&!retired&&embedded&&autoLoop;if(!loopEnabled&&loopTimer){clearTimeout(loopTimer);loopTimer=0}if(loopEnabled)schedule();return{enabled:loopEnabled,startup:startup.current}}
let retirementPromise=null;const sessionId=crypto.randomUUID();
 const sourcePins={versionId,route:location.pathname,packageSchema:PACKAGE_SCHEMA,packageManifestSha256,packageSealSha256,sourceManifestSha256};
 function retire(){if(retirementPromise)return retirementPromise;retired=true;startup.retired=true;loopEnabled=false;if(loopTimer)clearTimeout(loopTimer);if(pollTimer)clearInterval(pollTimer);loopTimer=pollTimer=0;retirementPromise=(async()=>{await boot;return await window.__dvaAbilityEntitlementE.retire()})();return retirementPromise;}
 async function respondRetirement(){try{const lifecycle=await retire();sequence=Math.max(sequence,startup.sequence||0);const api=window.__dvaAbilityEntitlementE;const canvas=document.querySelector('#view');const data={schema:'dva-gallery-startup/v1',action:'retired',stage:'playing',status:'cancelled',token,versionId,attemptEpoch,sequence:++sequence,packageSchema:PACKAGE_SCHEMA,packageManifestSha256,packageSealSha256,sourceManifestSha256,adapterSessionId:sessionId,canvasConnected:canvas?.isConnected===true,attached:!!(canvas?.isConnected&&document.documentElement.contains(canvas)),runtimeSnapshot:api.snapshot(),retirementReceipt:lifecycle};startup.sequence=sequence;startup.current=data;window.parent.postMessage(data,location.origin)}catch(e){sequence=Math.max(sequence,startup.sequence||0);window.parent.postMessage({schema:'dva-gallery-startup/v1',action:'retire-error',stage:'playing',status:'error',token,versionId,attemptEpoch,sequence:++sequence,packageSchema:PACKAGE_SCHEMA,packageManifestSha256,packageSealSha256,sourceManifestSha256,adapterSessionId:sessionId,teardown:'unknown',retirementReceipt:e.lifecycle??{teardown:'unknown'},error:{message:String(e)}},location.origin)}}
 window.addEventListener('message',e=>{const pins={packageManifestSha256,packageSealSha256,sourceManifestSha256};if(!isAbilityR10RetireCommand(e,{parent:window.parent,origin:location.origin,token,attemptEpoch,packagePins:pins,lastSequence:lastControlSequence})||e.data.versionId!==versionId||e.data.packageSchema!==PACKAGE_SCHEMA||e.data.sequence!==startup.parentSequence)return;lastControlSequence=e.data.sequence;void respondRetirement()});
 const boot=import('./host.mjs');boot.catch(()=>{});if(retired)queueMicrotask(()=>{if(startup.retireRequests)for(let i=0;i<startup.retireRequests;i++)void respondRetirement();else void retire().catch(()=>{})});
window.__dvaAbilityEntitlementGalleryStartup=Object.freeze({snapshot:()=>startup.current,setAutoLoopEnabled,retire});
window.addEventListener('dva-gallery-retire',()=>{void retire().catch(()=>{})});window.addEventListener('pagehide',()=>{void retire().catch(()=>{})},{once:true});
post('adapter','pending');
pollTimer=setInterval(()=>{
 if(retired){clearInterval(pollTimer);pollTimer=0;return}
 const text=status?.textContent||'';
 if(text.startsWith('Not ready:')){clearInterval(pollTimer);pollTimer=0;post(phases[Math.max(1,rank)]||'adapter','error',{error:{code:'R1015_INITIALIZATION_FAILED',message:text.slice(0,900)}});return}
 let report;try{report=JSON.parse(text)}catch{return}
 if(report.ready!==true){
  if(typeof report.compilation==='string'&&Array.isArray(report.shaders)&&report.shaders.length===3&&typeof report.sourceHash==='string'&&report.hostBaselineShaderHash===expectedBaseline){
   if(rank<1)post('adapter','ready');if(rank<2)post('device','ready',{deviceReady:true});
   if(rank<3)post('assets','ready',{sourceHash:report.sourceHash,shaderHashes:report.shaders.map(x=>x.hash)});
   if(rank<4)post('pipelines','ready',{compilation:report.compilation,shaderHashes:report.shaders.map(x=>x.hash)});
  }
  return
 }
 if(ready)return;
 const causeKey=report.causeKey,seq=report.firstCompletedSequence,shaderHashes=report.shaderHashes;
 const cr=canvas?.getBoundingClientRect(),tr=card?.getBoundingClientRect(),visible=!!(canvas?.isConnected&&card?.isConnected&&cr&&tr&&canvas.width>0&&canvas.height>0&&cr.width>0&&cr.height>0&&tr.width>=40&&tr.height>=24&&cr.right>0&&cr.bottom>0&&cr.left<innerWidth&&cr.top<innerHeight&&tr.right>0&&tr.bottom>0&&tr.left<innerWidth&&tr.top<innerHeight);
 if(typeof causeKey!=='string'||!causeKey||!Number.isSafeInteger(seq)||seq<1||report.sourceHash!==expectedSource||report.hostBaselineShaderHash!==expectedBaseline||!Array.isArray(shaderHashes)||shaderHashes.length!==3||shaderHashes.some((h,i)=>h!==expectedShaders[i])||!visible)return;
 ready=true;clearInterval(pollTimer);pollTimer=0;
 const firstFrame=report.firstFrame;if(!firstFrame||firstFrame.recorded!==true||firstFrame.submitted!==true||firstFrame.completed!==true||firstFrame.canvasConnected!==true||firstFrame.passes!==6||firstFrame.causeKey!==causeKey||firstFrame.sequence!==seq||!Number.isSafeInteger(firstFrame.viewportWidth)||firstFrame.viewportWidth<=0||!Number.isSafeInteger(firstFrame.viewportHeight)||firstFrame.viewportHeight<=0||firstFrame.viewportWidth!==canvas.width||firstFrame.viewportHeight!==canvas.height||firstFrame.targetGeneration!==1)return;
 post('first-frame','ready',{causeID:causeKey,firstFrame});post('playing','ready',{causeID:causeKey,firstFrame});
 if(embedded&&autoLoop){loopEnabled=true;schedule()}
},25);
