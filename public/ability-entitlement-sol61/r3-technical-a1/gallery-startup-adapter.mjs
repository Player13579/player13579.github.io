import{makeStatusMessage}from'./gallery-parent-contract.mjs';
const startup=window.__dvaGalleryStartupContext;
if(!startup)throw Error('early gallery startup bootstrap missing');
const{token,versionId,attemptEpoch,embedded,autoLoop}=startup;
if(versionId!=='ability-entitlement-sol61-r3')throw Error('gallery version identity mismatch');
const phases=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
const status=document.querySelector('#report'),canvas=document.querySelector('#view'),card=document.querySelector('#status');
const expectedSource='9fae7d9df3b8dafd770c162e847053288da1ce860e0e4f0b13466f8d843fff57';
const expectedShaders=['d871916c892b045de41ca63c69375884ec66d8a92c8643af1a433d91da46a735','bcd333d4916fb212c36a17b371cac6cc7cdcf5122d4d9bfb903bcb8e08e05bc9','015eceb83966367a589d58cf51634b951ae0452b64574269b01b98eab811f3a5'];
const expectedBaseline='0c3256338a4e88d2dcd660b12ed772d3405305df44d3de9bf314e261cd0a9c3f';
let sequence=startup.sequence||0,rank=startup.rank??-1,retired=Boolean(startup.retired),ready=false,loopEnabled=false,loopTimer=0,pollTimer=0;
function post(stage,state,extra={}){if(retired||window.parent===window||!token||versionId!=='ability-entitlement-sol61-r3'||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<1)return;const next=phases.indexOf(stage);if(next<rank)return;rank=next;startup.current=makeStatusMessage({token,versionId,attemptEpoch,sequence:++sequence,stage,status:state,extra:{...extra,adapterSessionId:sessionId,sourcePins}});startup.sequence=sequence;startup.rank=rank;window.parent.postMessage(startup.current,location.origin)}
function schedule(){if(retired||!ready||!loopEnabled||!embedded||!autoLoop||loopTimer)return;loopTimer=setTimeout(()=>{loopTimer=0;if(retired||!loopEnabled)return;document.querySelector('[data-action="replay"]')?.click();schedule()},1320)}
function setAutoLoopEnabled(value){loopEnabled=Boolean(value)&&!retired&&embedded&&autoLoop;if(!loopEnabled&&loopTimer){clearTimeout(loopTimer);loopTimer=0}if(loopEnabled)schedule();return{enabled:loopEnabled,startup:startup.current}}
let retirementPromise=null;const sessionId=crypto.randomUUID();
 const query=new URL(location.href).searchParams;
 const sourcePins={versionId,route:location.pathname,packageManifestSha256:query.get('packageManifestSha256'),packageSealSha256:query.get('packageSealSha256')};
 function retire(){if(retirementPromise)return retirementPromise;retired=true;startup.retired=true;loopEnabled=false;if(loopTimer)clearTimeout(loopTimer);if(pollTimer)clearInterval(pollTimer);loopTimer=pollTimer=0;retirementPromise=(async()=>{await boot;return await window.__dvaAbilityEntitlementE.retire()})();return retirementPromise;}
 async function respondRetirement(){try{const lifecycle=await retire();sequence=Math.max(sequence,startup.sequence||0);const data={schema:'dva-gallery-startup/v1',action:'retired',stage:'playing',status:'retired',token,versionId,attemptEpoch,sequence:++sequence,adapterSessionId:sessionId,lifecycle:{...lifecycle,adapterSessionId:sessionId,sourcePins,loopTimerActive:!!loopTimer,pollTimerActive:!!pollTimer}};startup.sequence=sequence;startup.current=data;window.parent.postMessage(data,location.origin)}catch(e){sequence=Math.max(sequence,startup.sequence||0);window.parent.postMessage({schema:'dva-gallery-startup/v1',action:'retire-error',stage:'playing',status:'error',token,versionId,attemptEpoch,sequence:++sequence,teardown:'unknown',lifecycle:e.lifecycle??{teardown:'unknown'},error:{message:String(e)}},location.origin)}}
 window.addEventListener('message',e=>{const d=e.data;if(e.source===window.parent&&e.origin===location.origin&&d?.schema==='dva-gallery-startup/v1'&&d.action==='retire'&&d.token===token&&d.versionId===versionId&&d.attemptEpoch===attemptEpoch)void respondRetirement()});
 const boot=import('./host.mjs');boot.catch(()=>{});if(retired)queueMicrotask(()=>{if(startup.retireRequests)for(let i=0;i<startup.retireRequests;i++)void respondRetirement();else void retire().catch(()=>{})});
window.__dvaAbilityEntitlementGalleryStartup=Object.freeze({snapshot:()=>startup.current,setAutoLoopEnabled,retire});
window.addEventListener('dva-gallery-retire',()=>{void retire().catch(()=>{})});window.addEventListener('pagehide',()=>{void retire().catch(()=>{})},{once:true});
post('adapter','pending');
pollTimer=setInterval(()=>{
 if(retired){clearInterval(pollTimer);pollTimer=0;return}
 const text=status?.textContent||'';
 if(text.startsWith('Not ready:')){clearInterval(pollTimer);pollTimer=0;post(phases[Math.max(1,rank)]||'adapter','error',{error:{code:'R815_INITIALIZATION_FAILED',message:text.slice(0,900)}});return}
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
 const firstFrame={recorded:true,submitted:true,completed:true,canvasConnected:true,passes:6,viewportWidth:canvas.width,viewportHeight:canvas.height,causeKey,sequence:seq,sourceHash:report.sourceHash,shaderHashes:[...shaderHashes],hostBaselineShaderHash:report.hostBaselineShaderHash,visible:{canvas:true,target:true}};
 post('first-frame','ready',{causeID:causeKey,firstFrame});post('playing','ready',{causeID:causeKey,firstFrame});
 if(embedded&&autoLoop){loopEnabled=true;schedule()}
},25);
