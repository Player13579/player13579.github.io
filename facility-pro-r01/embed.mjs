import {getGPU} from './package/src/core/renderer.js';
import {OBJECTS,LIFETIME_MS} from './package/src/core/contracts.js';
import * as bookshelf from './package/src/effects/bookshelf/index.js';
import * as readingLamp from './package/src/effects/reading-lamp/index.js';
import * as securityConsole from './package/src/effects/security-console/index.js';

const allEntries=[
  {objectId:'v302-archive-bookshelf-1',module:bookshelf},
  {objectId:'v302-archive-readingLamp-3',module:readingLamp},
  {objectId:'v302-security-securityConsole-1',module:securityConsole}
];
const effectKey=new URLSearchParams(location.search).get('effect');
const effectKeys=new Map([['bookshelf','v302-archive-bookshelf-1'],['reading-lamp','v302-archive-readingLamp-3'],['security-console','v302-security-securityConsole-1']]);
const invalidEffect=effectKey!==null&&!effectKeys.has(effectKey);
const entries=effectKey===null?allEntries:allEntries.filter(e=>e.objectId===effectKeys.get(effectKey));
const verify=new URLSearchParams(location.search).has('verify');
const status=document.querySelector('#runtime-status');
const audioStatus=document.querySelector('#audio-status');
const cards=[];
let audio=null;
let lastAudioSourceCount=-1;
let serial=0;
const epoch=performance.now();
const starts=[0,760,1520];
function cardMarkup(entry,index){
 const meta=OBJECTS[entry.objectId];
 const article=document.createElement('article');article.className='effect';article.dataset.objectId=entry.objectId;
 article.innerHTML=`<h2>${meta.title}</h2><span class="version">GPT Pro r0.1 · ${entry.module.definition.key}</span><div class="views"><div class="view dark"><label>DARK · 1×</label><canvas aria-label="${meta.title} dark background WebGPU effect"></canvas></div><div class="view light"><label>LIGHT · 1×</label><canvas aria-label="${meta.title} light background WebGPU effect"></canvas></div></div><div class="progress" aria-hidden="true"><i></i></div>`;
 const grid=document.querySelector('#effects');grid.dataset.count=String(entries.length);grid.append(article);
 return {entry,meta,article,renderers:[],startedAt:null,nextAt:epoch+starts[index],lastState:null};
}
async function unlockAudio(){
 if(verify||audio)return;
 try{
  const [{SoundOwner},...mods]=await Promise.all([
   import('./package/src/core/audio.js'),...entries.map(e=>Promise.resolve(e.module))
  ]);
  audio=new SoundOwner({synths:Object.fromEntries(mods.map(m=>[m.definition.key,m.synthesize]))});
  await audio.unlock();
  window.__facilityReplayAudio=audio;
  audioStatus.textContent='音声: 有効 · 次回の演出から再生（過去分は再生しません）';
 }catch(error){audioStatus.textContent=`音声を開始できません: ${error.message}`;}
}
if(!verify){document.addEventListener('pointerdown',unlockAudio,{once:true});document.addEventListener('keydown',unlockAudio,{once:true});}
async function start(){
 try{
  if(invalidEffect)throw new Error(`Unknown effect selector: ${effectKey}`);
  const gpu=await getGPU();
  for(let i=0;i<entries.length;i++){
   const card=cardMarkup(entries[i],i);
   for(const [theme,view] of [['dark',card.article.querySelector('.dark')],['light',card.article.querySelector('.light')]]){
    const canvas=view.querySelector('canvas');
    const renderer=await card.entry.module.createE(canvas,{theme,gpu,dpr:1});
    card.renderers.push(renderer);
   }
   cards.push(card);
  }
  const shaderErrors=gpu.audit.compilations.reduce((n,c)=>n+c.messages.filter(m=>m.type==='error').length,0);
  const replay={version:'0.1.0',verify,audioForcedOff:verify,cards,gpu:gpu.audit,shaderErrors,
   get submittedFrames(){return cards.reduce((n,c)=>n+(c.lastState?2:0),0);},
   dispose(){for(const c of cards)for(const r of c.renderers)r.dispose();audio?.stopAll();}};
  window.__facilityReplay=replay;
  if(verify){
   let activeViews=0;
   const ages={'bookshelf':1100,'reading-lamp':760,'security-console':1250};
   for(let i=0;i<cards.length;i++){
    const card=cards[i],age=ages[card.entry.module.definition.key];
    for(const renderer of card.renderers){
     const idle=await renderer.readPixels(LIFETIME_MS),active=await renderer.readPixels(age);
     let changed=0;
     for(let p=0;p<active.rgba.length;p+=4){
      const delta=Math.abs(active.rgba[p]-idle.rgba[p])+Math.abs(active.rgba[p+1]-idle.rgba[p+1])+Math.abs(active.rgba[p+2]-idle.rgba[p+2]);
      if(delta>4)changed++;
     }
     if(changed>0)activeViews++;
    }
   }
   replay.activePixelViews=activeViews;
   replay.uncapturedErrors=gpu.audit.uncapturedErrors.length;
   status.dataset.activePixelViews=String(activeViews);
   status.dataset.gpuErrors=String(replay.uncapturedErrors);
   status.textContent=`WebGPU active · ${gpu.audit.description||'adapter description unavailable'} · ${gpu.audit.compilations.length} shader pipelines · shader errors ${shaderErrors} · GPU errors ${replay.uncapturedErrors} · active-pixel views ${activeViews}/${cards.length*2} · verification audio forced off · quality unreviewed · game unconnected`;
  }else{
   status.textContent=`WebGPU active · ${gpu.audit.description||'adapter description unavailable'} · quality unreviewed · game unconnected`;
  }
  status.dataset.gpu='active';status.dataset.shaderErrors=String(shaderErrors);
  requestAnimationFrame(frame);
 }catch(error){status.classList.add('error');status.textContent=`WebGPU replay failed · ${String(error?.stack||error)}`;window.__facilityReplayError=String(error?.stack||error);}
}
function begin(card,now){
 card.startedAt=now;card.nextAt=now+LIFETIME_MS+420;
 const object=card.meta;const tick=Math.floor(performance.timeOrigin+now);
 const receipt={id:`magic_gallery_${++serial}`,type:`object-${object.type}`,objectId:card.entry.objectId,
  effectKind:object.effectKind,objectCausalId:`map-object:${card.entry.objectId}:${tick}:gallery_${serial}`,
  playerId:'gallery-preview-only',x:object.origin[0],y:object.origin[1],createdAt:tick,expiresAt:tick+LIFETIME_MS};
 card.receipt=receipt;
 if(audio&&!verify)audio.play({receipt,key:card.entry.module.definition.key,soundOwner:card.entry.module.definition.soundId},0);
}
function frame(now){
 if(audio&&audio.sourceCount!==lastAudioSourceCount){lastAudioSourceCount=audio.sourceCount;audioStatus.dataset.sources=String(lastAudioSourceCount);audioStatus.textContent=`音声: 有効 · 新しい演出のみ · 再生source ${lastAudioSourceCount}`;}
 for(const card of cards){
  if(now>=card.nextAt)begin(card,now);
  const age=card.startedAt===null?LIFETIME_MS:Math.max(0,Math.min(LIFETIME_MS,now-card.startedAt));
  for(const renderer of card.renderers)card.lastState=renderer.renderAge(age,{bloom:true});
  card.article.querySelector('.progress i').style.width=`${(age/LIFETIME_MS)*100}%`;
 }
 requestAnimationFrame(frame);
}
start();
