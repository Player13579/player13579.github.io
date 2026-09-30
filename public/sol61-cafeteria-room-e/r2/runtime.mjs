import { DESIGN, defaults, uniformFloats, soundReceipts, worldShader, postShader, RATE as SAMPLE_RATE, DURATIONS } from './artist.mjs';

const query=new URLSearchParams(location.search);
const verify=query.has('verify');
const targetSize=query.get('size')==='half'?DESIGN.halfSize:DESIGN.targetSize;
const playbackRate=Number(query.get('rate')??1);if(![0,1,2].includes(playbackRate))throw Error('supported gallery rates are 0, 1, or 2');
if(query.has('embed'))document.body.classList.add('embedded');
const canvas=document.querySelector('#stage'),status=document.querySelector('#status');
const originalPath='./cafeteria-attempt04.png';
const errors=[],seen=new Set(),voices=new Set();
let adapter,device,context,format,originalTexture,sampler,sceneTexture,radianceTexture;
let uniformBuffer,worldPipeline,postPipeline,worldLayout,postLayout,worldGroup,postGroup;
let raf=0,frames=0,draws=0,disposed=false,hidden=document.hidden,previousFrame=0;
let visualSeconds=0,lastReceiptTime=0,audioEnabled=false,audioContext=null,audioBuffers=null,audioLoading=null;
let audioEnabledAt=Infinity,animationPaused=false,captureBaseline=null;
let currentSettings=defaults();
const source={path:new URL(originalPath,location.href).href,bytes:0,sha256:'',width:0,height:0};

const hashHex=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
function reportError(error){errors.push(String(error?.message||error));if(status)status.textContent=`WebGPU error: ${errors.at(-1)}`;}
function setStatus(value){if(status)status.textContent=String(value);}
async function loadOriginal(){
  const response=await fetch(originalPath,{cache:'no-store'});if(!response.ok)throw Error(`original bitmap HTTP ${response.status}`);
  const bytes=await response.arrayBuffer();source.bytes=bytes.byteLength;source.sha256=await hashHex(bytes);
  if(source.sha256!==DESIGN.originalSHA256)throw Error(`original bitmap hash mismatch ${source.sha256}`);
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  source.width=bitmap.width;source.height=bitmap.height;
  if(source.width!==DESIGN.originalSize[0]||source.height!==DESIGN.originalSize[1])throw Error('original bitmap dimensions differ from frozen source');
  originalTexture=device.createTexture({label:'original-adopted-cafeteria-rgba8unorm',size:[source.width,source.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bitmap},{texture:originalTexture},{width:source.width,height:source.height});bitmap.close();
}
function makeIntermediates(){
  const [width,height]=targetSize;canvas.width=width;canvas.height=height;
  context=canvas.getContext('webgpu');if(!context)throw Error('WebGPU canvas context unavailable');
  format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
  const texture=label=>device.createTexture({label,size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});
  sceneTexture=texture('room-r2-scene-rgba16float');radianceTexture=texture('room-r2-radiance-rgba16float');
  sampler=device.createSampler({label:'room-r2-linear-clamp-sampler',minFilter:'linear',magFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'});
  postGroup=device.createBindGroup({label:'room-r2-post-bindings',layout:postLayout,entries:[
    {binding:0,resource:{buffer:uniformBuffer}},{binding:1,resource:sceneTexture.createView()},
    {binding:2,resource:radianceTexture.createView()},{binding:3,resource:sampler},
  ]});
  worldGroup=device.createBindGroup({label:'room-r2-world-bindings',layout:worldLayout,entries:[
    {binding:0,resource:{buffer:uniformBuffer}},{binding:1,resource:originalTexture.createView()},{binding:2,resource:sampler},
  ]});
}
function writeUniform(time,settings=currentSettings){
  const values=uniformFloats({width:targetSize[0],height:targetSize[1],time,rate:playbackRate,settings});
  if(values.byteLength!==64)throw Error(`r2 frame ABI expected 64 bytes, got ${values.byteLength}`);
  device.queue.writeBuffer(uniformBuffer,0,values);
}
function encodeFrame(time,settings,targetView){
  writeUniform(time,settings);
  const encoder=device.createCommandEncoder({label:`room-r2-frame-${time.toFixed(4)}`});
  const world=encoder.beginRenderPass({label:'r2-world-two-target-pass',colorAttachments:[
    {view:sceneTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
    {view:radianceTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
  ]});world.setPipeline(worldPipeline);world.setBindGroup(0,worldGroup);world.draw(3);world.end();
  const post=encoder.beginRenderPass({label:'r2-final-near-and-srgb-pass',colorAttachments:[
    {view:targetView,clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'},
  ]});post.setPipeline(postPipeline);post.setBindGroup(0,postGroup);post.draw(3);post.end();
  device.queue.submit([encoder.finish()]);frames++;draws+=2;
}
function render(time=visualSeconds,settings=currentSettings){
  if(disposed||hidden||!device||!context)return Promise.resolve(false);
  encodeFrame(time,settings,context.getCurrentTexture().createView());
  return device.queue.onSubmittedWorkDone().then(()=>true);
}
async function readback(time,settings){
  const [width,height]=targetSize,bytesPerRow=Math.ceil(width*4/256)*256;
  const out=device.createTexture({label:'r2-capture-target',size:[width,height],format:'bgra8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
  const encoder=device.createCommandEncoder({label:'r2-native-capture'});
  writeUniform(time,settings);
  const world=encoder.beginRenderPass({colorAttachments:[
    {view:sceneTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
    {view:radianceTexture.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'},
  ]});world.setPipeline(worldPipeline);world.setBindGroup(0,worldGroup);world.draw(3);world.end();
  const post=encoder.beginRenderPass({colorAttachments:[{view:out.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});post.setPipeline(postPipeline);post.setBindGroup(0,postGroup);post.draw(3);post.end();
  const buffer=device.createBuffer({label:'r2-capture-readback',size:bytesPerRow*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
  encoder.copyTextureToBuffer({texture:out},{buffer,bytesPerRow,rowsPerImage:height},{width,height});device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();
  await buffer.mapAsync(GPUMapMode.READ);const mapped=new Uint8Array(buffer.getMappedRange()).slice();buffer.unmap();buffer.destroy();out.destroy();
  const pixels=new Uint8Array(width*height*4);for(let y=0;y<height;y++)pixels.set(mapped.subarray(y*bytesPerRow,y*bytesPerRow+width*4),y*width*4);
  return pixels;
}
function boundsAgainst(base,other){
  const [width,height]=targetSize;let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;if(base[i]!==other[i]||base[i+1]!==other[i+1]||base[i+2]!==other[i+2]){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
  return {changedPixels:count,bounds:count?[minX,minY,maxX+1,maxY+1]:null};
}
function summarizePixels(pixels){const [width,height]=targetSize;let nonDark=0,sum=[0,0,0],min=[255,255,255],max=[0,0,0];const colors=new Set();for(let i=0;i<pixels.length;i+=4){const rgb=[pixels[i+2],pixels[i+1],pixels[i]];for(let c=0;c<3;c++){sum[c]+=rgb[c];min[c]=Math.min(min[c],rgb[c]);max[c]=Math.max(max[c],rgb[c]);}if(Math.max(...rgb)>20)nonDark++;if((i/4)%97===0)colors.add(rgb.join(','));}return {width,height,nonDarkPixels:nonDark,meanRGB:sum.map(x=>x/(width*height)),minRGB:min,maxRGB:max,sampledDistinctColors:colors.size,sampledColorStride:97};}
function cloneSettings(settings){return {...settings,lampEnabled:[...settings.lampEnabled]};}
const audioFiles={steam:'./steam.wav',device:'./device.wav',purge:'./purge.wav'};
async function loadAudio(){
  if(verify)return null;if(audioBuffers)return audioBuffers;if(audioLoading)return audioLoading;
  audioLoading=Promise.all(Object.entries(audioFiles).map(async([name,url])=>{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw Error(`${name} WAV HTTP ${r.status}`);const b=await r.arrayBuffer();const decoded=await audioContext.decodeAudioData(b.slice(0));if(decoded.numberOfChannels!==1||decoded.sampleRate!==SAMPLE_RATE||decoded.length!==Math.round(DURATIONS[name]*SAMPLE_RATE))throw Error(`${name} WAV does not match frozen mono/48K/finite-duration contract`);return[name,decoded];})).then(entries=>audioBuffers=Object.fromEntries(entries)).finally(()=>audioLoading=null);
  return audioLoading;
}
function stopVoices(){for(const v of voices){try{v.source.stop();}catch{}try{v.source.disconnect();}catch{}try{v.gain.disconnect();}catch{}}voices.clear();}
async function activateFromGesture(){
  if(verify)return audioSnapshot();audioEnabled=true;audioEnabledAt=visualSeconds;
  try{audioContext??=new AudioContext();await audioContext.resume();await loadAudio();}catch(e){audioEnabled=false;throw e;}return audioSnapshot();
}
function setMuted(muted){audioEnabled=!muted&&!verify;if(muted){audioEnabledAt=Infinity;stopVoices();}return audioSnapshot();}
function audioSnapshot(){return {verify,enabled:audioEnabled&&!verify,gain:audioEnabled&&!verify?'finite-version-wav':0,state:audioContext?.state??'not-created',voiceCount:voices.size,played:[...seen],status:verify?'verify-silent':audioEnabled?'enabled':'gesture-required',loadedScores:Object.keys(audioBuffers||{})};}
function dispatchReceipts(previous,current){
  const receipts=soundReceipts({previousTime:previous,currentTime:current,roomId:DESIGN.id,seen,settings:currentSettings});
  if(!audioEnabled||verify||hidden||animationPaused||errors.length||current<=previous)return;
  for(const receipt of receipts){const at=current-receipt.ageSeconds;if(at<audioEnabledAt||!audioContext||!audioBuffers?.[receipt.kind])continue;const sourceNode=audioContext.createBufferSource(),gain=audioContext.createGain();sourceNode.buffer=audioBuffers[receipt.kind];sourceNode.playbackRate.value=playbackRate;gain.gain.value=1;sourceNode.connect(gain).connect(audioContext.destination);const voice={source:sourceNode,gain,id:receipt.id};voices.add(voice);sourceNode.onended=()=>{voices.delete(voice);sourceNode.disconnect();gain.disconnect();};sourceNode.start(0,receipt.ageSeconds);}
}
async function tick(now){
  raf=0;if(disposed||hidden||animationPaused)return;
  if(previousFrame){const dt=Math.min(.1,Math.max(0,(now-previousFrame)/1000));visualSeconds=visualSeconds+dt*playbackRate;}
  previousFrame=now;
  const submittedAt=visualSeconds;
  try{const submitted=await render(submittedAt);if(submitted&&!disposed&&!hidden&&!animationPaused&&!errors.length)dispatchReceipts(lastReceiptTime,visualSeconds);}
  catch(error){reportError(error);}
  finally{lastReceiptTime=visualSeconds;}
  if(!disposed&&!hidden&&!animationPaused&&!raf)raf=requestAnimationFrame(tick);
}
function visibilityChanged(){
  hidden=document.hidden;previousFrame=0;lastReceiptTime=visualSeconds;
  if(hidden){stopVoices();audioContext?.suspend().catch(reportError);}
  else{if(audioEnabled&&!animationPaused)audioContext?.resume().catch(reportError);if(!disposed&&!animationPaused&&!raf)raf=requestAnimationFrame(tick);}
}
function snapshot(){return {ready:!!device&&!!worldPipeline&&!!postPipeline&&!!context&&source.width===DESIGN.originalSize[0]&&source.height===DESIGN.originalSize[1],verify,source:{...source},targetSize:[...targetSize],canvas:{width:canvas.width,height:canvas.height,cssWidth:canvas.getBoundingClientRect().width,cssHeight:canvas.getBoundingClientRect().height},adapter:adapter?.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device}:null,format,frames,draws,visualSeconds,cycle:Math.floor(visualSeconds/DESIGN.cycleSeconds),cycleAge:visualSeconds%DESIGN.cycleSeconds,rate:playbackRate,settings:cloneSettings(currentSettings),errors:[...errors],audio:audioSnapshot(),hidden,disposed};}
const api={snapshot,async setTime(time){if(!Number.isFinite(time)||time<0)throw Error('time must be nonnegative finite seconds');animationPaused=true;lastReceiptTime=visualSeconds;if(raf)cancelAnimationFrame(raf);raf=0;previousFrame=0;audioContext?.suspend().catch(reportError);visualSeconds=time;lastReceiptTime=time;await render(time);return snapshot();},setSettings(settings){currentSettings=cloneSettings({...defaults(),...settings,lampEnabled:settings?.lampEnabled??defaults().lampEnabled});return snapshot();},resume(){animationPaused=false;previousFrame=0;if(audioEnabled&&!hidden)audioContext?.resume().catch(reportError);if(!raf&&!hidden)raf=requestAnimationFrame(tick);return snapshot();},pause(){animationPaused=true;lastReceiptTime=visualSeconds;if(raf)cancelAnimationFrame(raf);raf=0;audioContext?.suspend().catch(reportError);return snapshot();},async capture(time=visualSeconds,settings=currentSettings){return readback(time,settings);},async pixelSummary(time=visualSeconds,settings=currentSettings){return summarizePixels(await readback(time,settings));},async captureDiff(time,settings,baseTime=time,baseSettings={steam:false,devices:false,purge:false,lamps:false,floor:false,foliage:false,near:false,lampEnabled:Array(7).fill(false)}){const base=captureBaseline??await readback(baseTime,baseSettings);captureBaseline=base;const pixels=await readback(time,settings);return {time,settings:cloneSettings(settings),baseline:{time:baseTime,settings:baseSettings},...boundsAgainst(base,pixels)};},async compare(time,settingsA,settingsB){const a=await readback(time,settingsA),b=await readback(time,settingsB);return {time,settingsA:cloneSettings(settingsA),settingsB:cloneSettings(settingsB),...boundsAgainst(a,b)};},activateFromGesture,setMuted,audioSnapshot,async dispose(){await dispose();return snapshot();}};
globalThis.__roomE=Object.freeze(api);
globalThis.__gallerySfx=Object.freeze({activateFromGesture,setMuted,stop:()=>setMuted(true),dispose:()=>dispose(),snapshot:audioSnapshot,status:()=>audioSnapshot().status});
async function dispose(){if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);raf=0;window.removeEventListener('pagehide',pageHide);document.removeEventListener('visibilitychange',visibilityChanged);stopVoices();audioEnabled=false;try{await device?.queue.onSubmittedWorkDone();}catch{}for(const t of [sceneTexture,radianceTexture,originalTexture])try{t?.destroy();}catch{}try{uniformBuffer?.destroy();}catch{}await audioContext?.close().catch(()=>{});device?.destroy();device=null;}
function pageHide(){void dispose();}
async function initialize(){
  if(verify&&audioContext)throw Error('verify must not create audio context');
  adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw Error('No WebGPU adapter');device=await adapter.requestDevice();
  device.addEventListener('uncapturederror',e=>reportError(e.error));device.lost.then(info=>{if(!disposed)reportError(new Error(`device lost ${info.message||info.reason}`));});
  uniformBuffer=device.createBuffer({label:'room-r2-frame-64B-ABI',size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const worldModule=device.createShaderModule({label:'Sol-r2-exact-world-shader',code:worldShader}),postModule=device.createShaderModule({label:'Sol-r2-exact-post-shader',code:postShader});
  const [worldInfo,postInfo]=await Promise.all([worldModule.getCompilationInfo(),postModule.getCompilationInfo()]);
  const shaderMessages=[...worldInfo.messages,...postInfo.messages];for(const m of shaderMessages)if(m.type==='error')throw Error(`WGSL ${m.type}: ${m.message} at ${m.lineNum}:${m.linePos}`);
  const entries=(bindings)=>bindings;
  worldLayout=device.createBindGroupLayout({label:'r2-world-layout',entries:entries([
    {binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
  ])});
  postLayout=device.createBindGroupLayout({label:'r2-post-layout',entries:entries([
    {binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},
    {binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:'float'}},
    {binding:3,visibility:GPUShaderStage.FRAGMENT,sampler:{type:'filtering'}},
  ])});
  const layout=(l,label)=>device.createPipelineLayout({label,bindGroupLayouts:[l]});
  worldPipeline=await device.createRenderPipelineAsync({label:'r2-world-exact-two-rgba16float-MRT',layout:layout(worldLayout,'r2-world-explicit-layout'),vertex:{module:worldModule,entryPoint:'vertex'},fragment:{module:worldModule,entryPoint:'fragment',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  postPipeline=await device.createRenderPipelineAsync({label:'r2-final-25tap-near-srgb-encode',layout:layout(postLayout,'r2-post-explicit-layout'),vertex:{module:postModule,entryPoint:'vertex'},fragment:{module:postModule,entryPoint:'finish',targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:'triangle-list'}});
  await loadOriginal();makeIntermediates();
  window.addEventListener('pagehide',pageHide);document.addEventListener('visibilitychange',visibilityChanged);
  if(!verify)canvas.addEventListener('pointerdown',()=>{if(!audioEnabled)void activateFromGesture().catch(reportError);},{once:true});
  await render(0,defaults());raf=requestAnimationFrame(tick);
  setStatus(`WebGPU ready · ${adapter.info?.vendor||'adapter'} · ${format} · ${targetSize.join('×')}`);
}
initialize().catch(reportError);
