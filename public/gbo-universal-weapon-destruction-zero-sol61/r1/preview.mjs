import {VERSION,createGboWeaponDestruction} from './gbo-universal-weapon-destruction.mjs';
import {awaitUniversalCompletedReceipt,buildUniversalFirstFrame,buildUniversalRetirementLifecycle,setRuntimeOptionsSafely,refreshRuntimeAfterResize,muteRuntimeWhenHidden,runtimePlaybackLabel,validateTransportManifest} from './preview-lifecycle.mjs';
const EXPECTED='gbo-universal-weapon-destruction-zero-sol61-r1';
const query=new URL(location.href).searchParams,embed=query.get('embed')==='1',verify=query.has('verify');
if(embed)document.documentElement.classList.add('embedded');
const token=query.get('galleryStartupToken'),versionId=query.get('galleryVersionId')??VERSION,attemptEpoch=Number(query.get('galleryAttemptEpoch'));
const canvas=document.querySelector('#scene'),status=document.querySelector('#status');let sequence=0,runtime=null,retirePromise=null,closure=null,closureMeta=null,resizeObserver=null,retiring=false,resolveRuntime,rejectRuntime;
const readyBarrier=new Promise((resolve,reject)=>{resolveRuntime=resolve;rejectRuntime=reject;});readyBarrier.catch(()=>{});
const send=(stage,state='pending',extra={})=>{const data={schema:'dva-gallery-startup/v1',token,versionId,attemptEpoch,sequence:sequence++,stage,status:state,...extra};window.__gboStartup=data;if(embed&&token)parent.postMessage(data,location.origin);};
send('child-document');
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
let transportManifestSha256=null;
async function verifyTransportManifest(){
 const response=await fetch(new URL('transport-manifest.json',import.meta.url),{cache:'no-store'});if(!response.ok)throw Error('Transport manifest HTTP '+response.status);
 const bytes=await response.arrayBuffer(),actual=await sha(bytes),data=JSON.parse(new TextDecoder().decode(bytes));validateTransportManifest(data,{version:VERSION,actualHash:actual,queryPin:query.get('galleryAdapterManifestSha256'),embedded:embed});
 for(const pin of data.files){const r=await fetch(new URL(pin.path,import.meta.url),{cache:'no-store'});if(!r.ok)throw Error('Transport file HTTP '+r.status+' '+pin.path);const b=await r.arrayBuffer();if(b.byteLength!==pin.bytes||await sha(b)!==pin.sha256)throw Error('Transport file bytes '+pin.path);}
 transportManifestSha256=actual;
}
async function verifyClosure(){
 const response=await fetch(new URL('source-closure.json',import.meta.url),{cache:'no-store'});if(!response.ok)throw Error('Closure HTTP '+response.status);
 const bytes=await response.arrayBuffer(),data=JSON.parse(new TextDecoder().decode(bytes));if(data.schema!=='dva-runtime-closure-1'||data.version!==VERSION||data.runtimeEntry!=='gbo-universal-weapon-destruction.mjs'||!Array.isArray(data.files)||!data.files.length)throw Error('Closure identity');
 const seen=new Set();for(const pin of data.files){if(!pin.path||pin.path.startsWith('/')||pin.path.includes('..')||seen.has(pin.path)||!/^[a-f0-9]{64}$/.test(pin.sha256))throw Error('Closure path/pin');seen.add(pin.path);const r=await fetch(new URL(pin.path,import.meta.url),{cache:'no-store'});if(!r.ok)throw Error('Source HTTP '+r.status+' '+pin.path);const b=await r.arrayBuffer();if(b.byteLength!==pin.bytes||await sha(b)!==pin.sha256)throw Error('Source bytes '+pin.path);}
 const mf=data.files.find(x=>x.path==='MF.json'),seal=data.files.find(x=>x.path==='SEAL.json');if(data.files.length!==6||!mf||!seal||mf.sha256!==data.manifestSha256||seal.sha256!==data.sealSha256)throw Error('Closure indexes');
 const manifestResponse=await fetch(new URL('MF.json',import.meta.url),{cache:'no-store'}),sealResponse=await fetch(new URL('SEAL.json',import.meta.url),{cache:'no-store'});if(!manifestResponse.ok||!sealResponse.ok)throw Error('MF/SEAL HTTP');const manifestBytes=await manifestResponse.arrayBuffer(),sealBytes=await sealResponse.arrayBuffer();if(await sha(manifestBytes)!==data.manifestSha256||await sha(sealBytes)!==data.sealSha256)throw Error('MF/SEAL hashes');const mfData=JSON.parse(new TextDecoder().decode(manifestBytes)),sealData=JSON.parse(new TextDecoder().decode(sealBytes));const expectedFiles=[...(mfData.runtimeClosure?.files??[]),'MF.json','SEAL.json'];if(mfData.version!==VERSION||!Array.isArray(mfData.runtimeClosure?.files)||mfData.runtimeClosure.files.length!==4||data.files.length!==expectedFiles.length||expectedFiles.some((name,index)=>data.files[index]?.path!==name)||sealData.version!==VERSION||sealData.contentIndex?.path!=='MF.json'||sealData.contentIndex?.sha256!==data.manifestSha256||sealData.contentIndex?.bytes!==manifestBytes.byteLength)throw Error('MF/SEAL identity or closure');
 closure=data.files;closureMeta={path:'source-closure.json',sha256:await sha(bytes),manifestSha256:data.manifestSha256,sealSha256:data.sealSha256,adapterManifestSha256:transportManifestSha256};
 for(const [key,actual] of [['gallerySourceClosureSha256',closureMeta.sha256],['gallerySourceManifestSha256',data.manifestSha256],['galleryPackageManifestSha256',data.manifestSha256],['galleryPackageSealSha256',data.sealSha256]])if((embed&&!query.has(key))||(query.has(key)&&query.get(key)!==actual))throw Error('Version query pin mismatch '+key);
}
function firstFrame(){return buildUniversalFirstFrame({runtime,canvas,style:getComputedStyle(canvas),versionId,sourceClosure:closure,sourceClosureManifest:closureMeta});}
function fit(){const b=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;if(b.width<=0||b.height<=0)return false;const width=Math.round(b.width*dpr),height=Math.round(b.height*dpr);if(canvas.width===width&&canvas.height===height)return false;canvas.width=width;canvas.height=height;return true;}
const retire=()=>{retiring=true;return retirePromise??=(async()=>{await readyBarrier;resizeObserver?.disconnect();await runtime.dispose();const s=runtime.snapshot();const lifecycle=buildUniversalRetirementLifecycle(s);send('playing','ready',{action:'retired',lifecycle});return s;})();};
window.addEventListener('message',event=>{const d=event.data;if(event.source!==parent||event.origin!==location.origin||d?.schema!=='dva-gallery-startup/v1'||d.action!=='retire'||d.token!==token||d.versionId!==versionId||d.attemptEpoch!==attemptEpoch)return;retire().catch(e=>{status.textContent=String(e);send('playing','error',{error:String(e)});});});
try{
 if(VERSION!==EXPECTED||versionId!==VERSION)throw Error('Wrong universal version route');send('adapter');await verifyTransportManifest();await verifyClosure();fit();send('device');
 const h64=query.has('h64')?Number(query.get('h64')):64;
 runtime=await createGboWeaponDestruction({canvas,verify,options:{loop:embed,h64,muted:verify},onPhase:event=>{if(event?.phase==='ready')send('pipelines');else if(event?.phase==='submitted')send('first-frame');}});
 window.__gboWeaponDestruction=runtime;window.__gboUniversalWeaponDestruction=runtime;resolveRuntime(runtime);
 window.__gallerySfx={activateFromGesture:()=>runtime.activateAudioFromGesture(),setMuted:muted=>runtime.setOptions({muted:verify?true:!!muted})};
 document.addEventListener('visibilitychange',()=>muteRuntimeWhenHidden(document.visibilityState==='hidden',runtime,error=>{status.textContent=String(error);}));
 resizeObserver=new ResizeObserver(()=>refreshRuntimeAfterResize(fit(),runtime,error=>{status.textContent=String(error);}));resizeObserver.observe(canvas);
 document.querySelector('#replay').onclick=async()=>{try{await runtime.replay();status.textContent=runtimePlaybackLabel(runtime.snapshot(),verify);}catch(error){status.textContent=String(error);}};
 document.querySelector('#stop').onclick=()=>runtime.stop();
 for(const key of ['source','observer','loop'])document.querySelector('#'+key).onchange=event=>setRuntimeOptionsSafely(runtime,{[key]:event.target.checked},error=>{status.textContent=String(error);});
 if(retiring)await retire();else if(embed){await awaitUniversalCompletedReceipt(runtime,{retiring:()=>retiring});if(!retiring)send('playing','ready',{firstFrame:firstFrame()});}else status.textContent='準備完了。再生で効果を確認';
 window.addEventListener('pagehide',()=>{resizeObserver?.disconnect();runtime.dispose().catch(()=>{});},{once:true});
}catch(e){rejectRuntime(e);status.textContent=String(e);send('playing','error',{error:String(e)});if(runtime)await runtime.dispose().catch(()=>{});}

