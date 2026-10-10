import{makeStatusMessage}from'./gallery-parent-contract.mjs';
const startup=window.__dvaGalleryStartupContext;
if(!startup)throw Error('early gallery startup bootstrap missing');
const{token,versionId,attemptEpoch,embedded,autoLoop}=startup;
if(versionId!=='ability-entitlement-sol61-r2')throw Error('gallery version identity mismatch');
const phases=['child-document','adapter','device','assets','pipelines','first-frame','playing'];
const status=document.querySelector('#report'),canvas=document.querySelector('#view'),card=document.querySelector('#status');
const expectedSource='454e9a59a1882b57040a8151e693d9442cad827ab44c7023e4670af304193664';
const expectedShaders=['d79d18c5b116efe6e2b6b8cd237720553372e7a90f8e1aa945c94510358db7b5','bcd333d4916fb212c36a17b371cac6cc7cdcf5122d4d9bfb903bcb8e08e05bc9','015eceb83966367a589d58cf51634b951ae0452b64574269b01b98eab811f3a5'];
const expectedBaseline='0c3256338a4e88d2dcd660b12ed772d3405305df44d3de9bf314e261cd0a9c3f';
let sequence=startup.sequence||0,rank=startup.rank??-1,retired=Boolean(startup.retired),ready=false,loopEnabled=false,loopTimer=0,pollTimer=0;
function post(stage,state,extra={}){if(retired||window.parent===window||!token||versionId!=='ability-entitlement-sol61-r2'||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<1)return;const next=phases.indexOf(stage);if(next<rank)return;rank=next;startup.current=makeStatusMessage({token,versionId,attemptEpoch,sequence:++sequence,stage,status:state,extra});startup.sequence=sequence;startup.rank=rank;window.parent.postMessage(startup.current,location.origin)}
function schedule(){if(retired||!ready||!loopEnabled||!embedded||!autoLoop||loopTimer)return;loopTimer=setTimeout(()=>{loopTimer=0;if(retired||!loopEnabled)return;document.querySelector('[data-action="replay"]')?.click();schedule()},1100)}
function setAutoLoopEnabled(value){loopEnabled=Boolean(value)&&!retired&&embedded&&autoLoop;if(!loopEnabled&&loopTimer){clearTimeout(loopTimer);loopTimer=0}if(loopEnabled)schedule();return{enabled:loopEnabled,startup:startup.current}}
function retire(){if(retired)return;retired=true;loopEnabled=false;if(loopTimer)clearTimeout(loopTimer);if(pollTimer)clearInterval(pollTimer);loopTimer=pollTimer=0;document.querySelector('[data-action="retire"]')?.click()}
window.__dvaAbilityEntitlementGalleryStartup=Object.freeze({snapshot:()=>startup.current,setAutoLoopEnabled,retire});
window.addEventListener('dva-gallery-retire',retire);window.addEventListener('pagehide',retire,{once:true});
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
 const firstFrame={recorded:true,submitted:true,completed:true,canvasConnected:true,passes:5,viewportWidth:canvas.width,viewportHeight:canvas.height,causeKey,sequence:seq,sourceHash:report.sourceHash,shaderHashes:[...shaderHashes],hostBaselineShaderHash:report.hostBaselineShaderHash,visible:{canvas:true,target:true}};
 post('first-frame','ready',{causeID:causeKey,firstFrame});post('playing','ready',{causeID:causeKey,firstFrame});
 if(embedded&&autoLoop){loopEnabled=true;schedule()}
},25);
