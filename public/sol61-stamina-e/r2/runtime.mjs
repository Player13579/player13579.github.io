import {DESIGN,makePCM,admit,phase} from './design.mjs';
const query=new URLSearchParams(location.search), verification=query.has('verify'), audit=query.has('audit');
document.body.classList.toggle('embed',query.has('embed'));document.body.classList.toggle('audit',audit);
const canvas=document.getElementById('stage'),status=document.getElementById('status');
import {shader} from './shader.mjs';
let device,context,pipeline,materialPipeline,lightPipeline,buffer,bind,elapsed=0,rate=1,last=null,loop=true,running=true,light=0,audio=null,currentSound=null,cycles=0,frames=0;
const seen=new Set(),stats={errors:[],submitted:0,frameDeltas:[],cycleStarts:[],verification,audioGain:verification?0:null,sfxStarts:0,lastSfxActorMs:null,shaderMessages:[]};
window.staminaE={DESIGN,stats,admit,phase,makePCM};
function playSound(){
 if(verification||!audio||audio.state!=='running')return;
 if(currentSound){try{currentSound.stop()}catch{}}
 const src=audio.createBufferSource(),gain=audio.createGain(),pcm=makePCM(audio.sampleRate),b=audio.createBuffer(1,pcm.length,audio.sampleRate);b.copyToChannel(pcm,0);
 src.buffer=b;src.playbackRate.value=rate;gain.gain.value=.70;src.connect(gain).connect(audio.destination);src.start();currentSound=src;stats.sfxStarts++;stats.lastSfxActorMs=elapsed;stats.audioGain=.70;
}
async function activateFromGesture(item){
 if(verification)return {ok:false,reason:'verification-silent',audioGain:0};
 audio??=new AudioContext();await audio.resume();elapsed=0;last=null;running=true;loop=true;playSound();
 return {ok:true,item:item?.id||DESIGN.id,audioState:audio.state};
}
window.__gallerySfx={activateFromGesture,snapshot:()=>({id:DESIGN.id,verification,audioState:audio?.state||'not-created',audioGain:verification?0:stats.audioGain,sfxStarts:stats.sfxStarts,lastSfxActorMs:stats.lastSfxActorMs,cycles,elapsedMs:elapsed,loop})};
function draw(ms){
 device.queue.writeBuffer(buffer,0,new Float32Array([canvas.width,canvas.height,ms,audit?1:0,canvas.width/2,canvas.height*.72,64,light,1,1,1,0]));
 const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.setPipeline(materialPipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.setPipeline(lightPipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);stats.submitted++;
}
async function start(){
 if(!navigator.gpu)throw new Error('WebGPU unsupported');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
 device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>stats.errors.push(e.error.message));device.lost.then(i=>{if(i.reason!=='destroyed')stats.errors.push(i.message)});
 stats.adapterInfo=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null;
 const mod=device.createShaderModule({code:shader});const info=await mod.getCompilationInfo();stats.shaderMessages=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));if(info.messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(stats.shaderMessages));
 context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const groupLayout=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]});
 const layout=device.createPipelineLayout({bindGroupLayouts:[groupLayout]});
 const build=(entryPoint,blend)=>device.createRenderPipelineAsync({layout,vertex:{module:mod,entryPoint:'vs'},fragment:{module:mod,entryPoint,targets:[{format,...(blend?{blend}:{})}]},primitive:{topology:'triangle-list'}});
 pipeline=await build('fsBody');materialPipeline=await build('fsMaterial',{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}});lightPipeline=await build('fsLight',{color:{srcFactor:'one',dstFactor:'one'},alpha:{srcFactor:'zero',dstFactor:'one'}});
 buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const bitmap=await createImageBitmap(await (await fetch('./body.png')).blob());const tex=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture:tex},[bitmap.width,bitmap.height]);bitmap.close();
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:tex.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 if(audit){canvas.width=1320;canvas.height=696;draw(0);await device.queue.onSubmittedWorkDone();status.textContent='PASS WebGPU compilation + submitted H64 audit';finishTest();return;}
 const fixed=query.has('at')?Number(query.get('at')):null;
 if(fixed!==null){draw(fixed);await device.queue.onSubmittedWorkDone();status.textContent='PASS fixed-frame GPU';finishTest();return;}
 function frame(now){
  if(last!==null){const dt=now-last;stats.frameDeltas.push(dt);if(stats.frameDeltas.length>600)stats.frameDeltas.shift();if(running)elapsed+=dt*rate;}last=now;
  if(loop&&elapsed>=DESIGN.cycleMs){elapsed%=DESIGN.cycleMs;cycles++;stats.cycleStarts.push({cycle:cycles,elapsedMs:elapsed});playSound();}
  draw(elapsed);frames++;document.getElementById('time').value=Math.min(elapsed,1600);status.textContent='WebGPU / H64 / '+Math.round(elapsed)+'ms'+(verification?' / verify: audio=0':'');
  if(query.has('test')&&cycles>=3){device.queue.onSubmittedWorkDone().then(finishTest);return;}requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}
function finishTest(){
 const deltas=stats.frameDeltas;const report={id:DESIGN.id,adapter:stats.adapterInfo,shader:stats.shaderMessages,errors:stats.errors,submitted:stats.submitted,cycles,frames,elapsedMs:elapsed,audioGain:verification?0:null,negativeClock:stats.cycleStarts.some(c=>c.elapsedMs<0),avgRafMs:deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:null,maxRafMs:deltas.length?Math.max(...deltas):null};
 const node=document.createElement('pre');node.id='gpu-result';node.textContent=JSON.stringify(report);document.body.append(node);window.staminaE.report=report;
}
document.getElementById('replay').onclick=()=>{elapsed=0;last=null;loop=true;running=true;playSound();};
document.getElementById('bg').onclick=()=>{light=1-light;};
document.getElementById('loop').onclick=()=>{loop=!loop;};
document.getElementById('rate').oninput=e=>{rate=Number(e.target.value);if(currentSound&&audio)currentSound.playbackRate.setValueAtTime(rate,audio.currentTime);};
document.getElementById('time').oninput=e=>{loop=false;running=false;elapsed=Number(e.target.value);last=null;draw(elapsed);};
document.getElementById('audio').onclick=()=>activateFromGesture({id:DESIGN.id});
if(verification){document.getElementById('audio').disabled=true;document.getElementById('audio').textContent='verify: 音声0';}
window.addEventListener('pagehide',()=>{if(currentSound)try{currentSound.stop()}catch{};if(audio)audio.close();device?.destroy();});
start().catch(e=>{stats.errors.push(e.message);status.textContent='FAIL '+e.message;finishTest();});
