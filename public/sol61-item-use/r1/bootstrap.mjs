import {createItemUseHost} from './runtime.mjs';
import {freezeDiagnosticSnapshot} from './diagnostics.mjs';
import {createItemUseGallerySfx,createItemUseGalleryStartup,startItemUseFixtureLoop} from './gallery-adapter.mjs';

const GALLERY_VERSION_ID='item-use-sol61-r1';
const ITEM_VARIANT='mineral-water';
const canvas=document.querySelector('#surface'),status=document.querySelector('#status');
const params=new URLSearchParams(location.search),verify=params.has('verify'),embedMode=params.get('embed')==='1';
document.documentElement.classList.toggle('gallery-embed',embedMode);
let diagnostic=freezeDiagnosticSnapshot({status:'fixture starting'});
Object.defineProperty(window,'__itemUseGalleryDiagnosticSnapshot',{value:()=>diagnostic,writable:false,configurable:false});
const say=x=>{diagnostic=freezeDiagnosticSnapshot(x);status.textContent=JSON.stringify(diagnostic,null,2);};
const startup=createItemUseGalleryStartup(window);
let host=null,audioContext=null,stopped=false,currentCue=null,cueObservedAt=0;
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
 resize();const response=await fetch('./source/item-use-e-sol61-r1.wgsl');if(!response.ok)throw Error(`shader fetch failed: ${response.status}`);const shaderCode=await response.text();
 host=await createItemUseHost({device,context,format,shaderCode,width:canvas.width,height:canvas.height,verify,onFailure:e=>say({status:'host failure',error:String(e)})});
 startup.advance('assets','ready');startup.advance('pipelines','ready');
 window.addEventListener('resize',async()=>{try{resize();await host.resize(canvas.width,canvas.height);}catch(e){startup.advance('playing','error',{message:String(e)});}});
 const playerId='fixture-player';
 loop=startItemUseFixtureLoop({host,canvas,window,startup,verify,itemIds:[GALLERY_VERSION_ID],onProof:p=>say({status:'fixture positive emission sample; native/gallery acceptance pending',proof:p}),
   onFailure:e=>say({status:'frame rejected',error:String(e)}),onFrame:(result,f)=>{
     currentCue={causeId:f.causeId,itemId:f.itemId,playerId:f.playerId,ageMs:f.ageMs,sourceOn:f.sourceOn,mainOn:f.mainOn,obsOn:f.obsOn,visibility:f.visibility,
       receipt:{type:'action-item-use',id:f.causeId,playerId:f.playerId,variant:f.itemId,at:Date.now(),x:f.anchor[0],y:f.anchor[1],targetX:null,targetY:null,targetId:''},host};
     cueObservedAt=performance.now();
     if(result?.retired)say({status:'stale frame retired'});
   },fixture:({causeId,ageMs,sourceOn})=>({clockKind:'fixture',causeId,sourceCauseId:causeId,visibilityCauseId:causeId,itemId:ITEM_VARIANT,
     playerId,sourcePlayerId:playerId,anchorPlayerId:playerId,ageMs,heightPx:92,viewport:[canvas.width,canvas.height],anchor:[canvas.width*.5,canvas.height*.48],
     sourceOn,mainOn:true,obsOn:true,visibility:1,intensity:1,angleRad:-.3,reducedMotion:false})});
 startup.advance('first-frame','pending');startup.advance('playing','pending');
 say({status:'fixture running; readiness awaits exact positive emission readback',galleryVersionId:GALLERY_VERSION_ID,verify,scope:'fixture-only'});
} catch(e) {startup.advance('child-document','error',{message:String(e)});say({status:'startup failed',error:String(e)});}
