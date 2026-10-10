import {createItemUseHost} from './runtime.mjs';
import {freezeDiagnosticSnapshot} from './diagnostics.mjs';
import {createItemUseGallerySfx,createItemUseGalleryStartup,startItemUseFixtureLoop} from './gallery-adapter.mjs';

const GALLERY_VERSION_ID='item-use-sol61-r3';
const ITEM_VARIANT='mineral-water';
const canvas=document.querySelector('#surface'),status=document.querySelector('#status');
const params=new URLSearchParams(location.search),verify=params.has('verify'),embedMode=params.get('embed')==='1';
document.documentElement.classList.toggle('gallery-embed',embedMode);
let diagnostic=freezeDiagnosticSnapshot({status:'fixture starting'});
Object.defineProperty(window,'__itemUseGalleryDiagnosticSnapshot',{value:()=>diagnostic,writable:false,configurable:false});
const say=x=>{diagnostic=freezeDiagnosticSnapshot(x);status.textContent=JSON.stringify(diagnostic,null,2);};
const startup=createItemUseGalleryStartup(window);
let host=null,audioContext=null,stopped=false,currentCue=null,cueObservedAt=0,currentTargetGeneration=1;
const sfx=createItemUseGallerySfx({window,verify,itemIds:[GALLERY_VERSION_ID],currentCue:()=>currentCue&&({...currentCue,ageMs:currentCue.ageMs+Math.max(0,performance.now()-cueObservedAt)}),
  makeAudioContext:()=>audioContext??=(new AudioContext())});
window.addEventListener('pagehide',()=>{stopped=true;try{loop?.stop();}catch{}sfx.dispose();if(audioContext&&audioContext.state!=='closed')void audioContext.close();},{once:true});
let loop;
try {
 if(!window.parent||window.parent===window)throw Error('embedded gallery fixture required');
 if(params.get('galleryVersionId')!==GALLERY_VERSION_ID)throw Error('selected gallery item.id mismatch');
 if(!navigator.gpu)throw Error('WebGPU unavailable');
 startup.advance('child-document','ready',{versionId:GALLERY_VERSION_ID});
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter unavailable');
 startup.advance('adapter','ready');
 const device=await adapter.requestDevice();startup.advance('device','ready');
 const context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas context unavailable');
 const format=navigator.gpu.getPreferredCanvasFormat();
 const resize=()=>{const r=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1;canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));context.configure({device,format,alphaMode:'premultiplied'});};
 resize();
 const expectedWorldSha256='25c35a5769361bb4a8d86856cd10fbb8344f4c9deb8247fdffc325a541b573ec';
 const versionMeta=document.querySelector('meta[name="item-use-version"]')?.content;
 const sourceMeta=document.querySelector('meta[name="item-use-source-sha256"]')?.content;
 const expectedManifestSha256=params.get('packageManifestSha256');
 const expectedSealSha256=params.get('packageSealSha256');
 const expectedSourceSha256=params.get('sourceSha256');
 const digestHex=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(versionMeta!==GALLERY_VERSION_ID||sourceMeta!==expectedWorldSha256||params.get('galleryVersionId')!==GALLERY_VERSION_ID||expectedSourceSha256!==expectedWorldSha256||!/^([0-9a-f]{64})$/.test(expectedManifestSha256||'')||!/^([0-9a-f]{64})$/.test(expectedSealSha256||''))throw Error('selected R3 version/source/package SHA is missing or mismatched');
 const manifestResponse=await fetch('./package-manifest.json');if(!manifestResponse.ok)throw Error('R3 package manifest fetch failed');
 const manifestBytes=await manifestResponse.arrayBuffer();if(await digestHex(manifestBytes)!==expectedManifestSha256)throw Error('R3 package manifest SHA mismatch');
 const manifest=JSON.parse(new TextDecoder().decode(manifestBytes));
 if(manifest.versionId!==GALLERY_VERSION_ID||manifest.creativeVersion!=='item-use-e-zero-sol61-r3'||manifest.files?.find(x=>x.path==='source/item-use-e-sol61-r3.wgsl')?.sha256!==expectedWorldSha256||manifest.files?.find(x=>x.path==='source/item-use-e-sol61-r3.mjs')?.sha256!=='0726815bcbea45835e99216595c1367778c2437882d4f97b3cdd018f599049c2'||manifest.files?.find(x=>x.path==='source/item-use-e-sfx-sol61-r3.mjs')?.sha256!=='0e19edcdf1a851e41f9f0ab286aa4ec52715f8e90e11eacf3aba23dac54c088a')throw Error('R3 package manifest identity/source pins mismatch');
 const sealResponse=await fetch('./package-seal.json');if(!sealResponse.ok)throw Error('R3 package seal fetch failed');
 const sealBytes=await sealResponse.arrayBuffer();if(await digestHex(sealBytes)!==expectedSealSha256)throw Error('R3 package seal SHA mismatch');
 const seal=JSON.parse(new TextDecoder().decode(sealBytes));
 if(seal.versionId!==GALLERY_VERSION_ID||seal.packageManifestSha256!==expectedManifestSha256)throw Error('R3 package seal identity mismatch');
 const shaderUrl=new URL('./source/item-use-e-sol61-r3.wgsl',location.href);shaderUrl.searchParams.set('sha256',expectedWorldSha256);
 const response=await fetch(shaderUrl);if(!response.ok)throw Error('shader fetch failed: '+response.status);const shaderBytes=await response.arrayBuffer();if(await digestHex(shaderBytes)!==expectedWorldSha256)throw Error('R3 WGSL source SHA mismatch');const shaderCode=new TextDecoder().decode(shaderBytes);
 host=await createItemUseHost({device,context,format,shaderCode,width:canvas.width,height:canvas.height,verify,onFailure:e=>say({status:'host failure',error:String(e?.error??e)})});
 startup.advance('assets','ready');startup.advance('pipelines','ready');
 window.addEventListener('resize',async()=>{try{resize();const sized=await host.resize(canvas.width,canvas.height);currentTargetGeneration=sized.generation;}catch(e){startup.advance('playing','error',{message:String(e)});}});
 const playerId='fixture-player';
 loop=startItemUseFixtureLoop({host,canvas,window,startup,verify,itemIds:[GALLERY_VERSION_ID],onStop:()=>sfx.dispose(),onCauseStart:f=>sfx.noteCauseStart(f.causeId,host),onProof:p=>say({status:'fixture positive emission sample; native/gallery acceptance pending',proof:p}),
   onFailure:e=>say({status:'frame rejected',error:String(e)}),onFrame:(result,f,timing)=>{
     const receipt={type:'action-item-use',id:f.causeId,playerId:f.playerId,variant:f.itemId,at:Date.now(),x:f.anchor[0],y:f.anchor[1],targetX:null,targetY:null,targetId:''};
     currentCue={causeId:f.causeId,itemId:f.itemId,playerId:f.playerId,ageMs:f.ageMs,sourceOn:f.sourceOn,mainOn:f.mainOn,obsOn:f.obsOn,visibility:f.visibility,receipt,host};
     cueObservedAt=performance.now();
     sfx.observeCompletedFrame(result,{...f,receipt},{host,canvas,expectedTargetGeneration:currentTargetGeneration,submittedAt:timing?.submittedAt,completedAt:timing?.completedAt});
     if(result?.retired)say({status:'stale frame retired'});
   },fixture:({causeId,ageMs,sourceOn})=>({clockKind:'fixture',causeId,sourceCauseId:causeId,visibilityCauseId:causeId,itemId:ITEM_VARIANT,
     playerId,sourcePlayerId:playerId,anchorPlayerId:playerId,ageMs,heightPx:92,viewport:[canvas.width,canvas.height],anchor:[canvas.width*.5,canvas.height*.48],
     sourceOn,mainOn:true,obsOn:true,visibility:1,intensity:1,angleRad:-.3,reducedMotion:false})});
 startup.advance('first-frame','pending');startup.advance('playing','pending');
 say({status:'fixture running; readiness awaits exact positive emission readback',galleryVersionId:GALLERY_VERSION_ID,verify,scope:'fixture-only'});
} catch(e) {startup.advance('child-document','error',{message:String(e)});say({status:'startup failed',error:String(e)});}
