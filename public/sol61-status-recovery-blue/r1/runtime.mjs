import {DESIGN,PH,OBS,admit,phase,makePCM} from './design.mjs';
import {shader} from './shader.mjs';
const q=new URLSearchParams(location.search),verification=q.has('verify'),audit=q.has('audit');
document.body.classList.toggle('embed',q.has('embed'));document.body.classList.toggle('audit',audit);
const canvas=document.getElementById('stage'),status=document.getElementById('status');
let device,context,pipeline,buffer,bind,elapsed=0,rate=1,last=null,loop=true,running=true,light=q.has('light')?1:0,audio=null,currentSound=null,cycles=0,frames=0;
const stats={errors:[],submitted:0,frameDeltas:[],frameSamples:[],cycleStarts:[],verification,sfxStarts:0,lastSfxActorMs:null,audioGain:verification?0:null,shaderMessages:[]};
window.statusRecoveryE={DESIGN,PH,OBS,stats,admit,phase,makePCM};
export async function createEffect(canvas){
 if(!navigator.gpu)throw new Error('WebGPU unsupported');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
 device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>stats.errors.push(e.error.message));device.lost.then(i=>{if(i.reason!=='destroyed')stats.errors.push(i.message)});
 stats.adapterInfo=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null;
 const mod=device.createShaderModule({code:shader});const info=await mod.getCompilationInfo();stats.shaderMessages=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));if(info.messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(stats.shaderMessages));
 context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const gl=device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]});
 pipeline=await device.createRenderPipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[gl]}),vertex:{module:mod,entryPoint:'vs'},fragment:{module:mod,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 buffer=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const bitmap=await createImageBitmap(await (await fetch('./body.png')).blob());const tex=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});device.queue.copyExternalImageToTexture({source:bitmap},{texture:tex},[bitmap.width,bitmap.height]);bitmap.close();
 bind=device.createBindGroup({layout:gl,entries:[{binding:0,resource:{buffer}},{binding:1,resource:tex.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 return {render:draw,destroy:()=>{device.destroy();tex.destroy();buffer.destroy()},stats};
}
function draw(ms){
 device.queue.writeBuffer(buffer,0,new Float32Array([canvas.width,canvas.height,ms,audit?1:0,canvas.width/2,audit?0:104,64,light,q.has('no-stars')?0:1,q.has('no-obs')?0:1,q.has('no-main')?0:1,q.has('reduced')?1:0]));
 const enc=device.createCommandEncoder(),pass=enc.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([enc.finish()]);stats.submitted++;
}
function stopSound(){if(currentSound){try{currentSound.stop()}catch{}currentSound=null;}}
function playSound(){if(verification||!audio||audio.state!=='running')return;stopSound();const src=audio.createBufferSource(),gain=audio.createGain(),pcm=makePCM(audio.sampleRate),b=audio.createBuffer(1,pcm.length,audio.sampleRate);b.copyToChannel(pcm,0);src.buffer=b;src.playbackRate.value=rate;gain.gain.value=.72;src.connect(gain).connect(audio.destination);src.start();currentSound=src;stats.sfxStarts++;stats.lastSfxActorMs=elapsed;stats.audioGain=.72;}
async function activateFromGesture(item){if(verification)return {ok:false,reason:'verification-silent',audioGain:0};audio??=new AudioContext();await audio.resume();elapsed=0;last=null;running=true;loop=true;playSound();return {ok:true,id:item?.id||DESIGN.id,audioState:audio.state};}
window.__gallerySfx={activateFromGesture,snapshot:()=>({id:DESIGN.id,verification,audioState:audio?.state||'not-created',audioGain:verification?0:stats.audioGain,sfxStarts:stats.sfxStarts,lastSfxActorMs:stats.lastSfxActorMs,cycles,elapsedMs:elapsed,loop})};
function finishTest(){const ds=stats.frameDeltas,byCycle=[0,1,2].map(c=>{const samples=stats.frameSamples.filter(s=>s.cycle===c),a=samples.map(s=>s.dt).sort((a,b)=>a-b);return {cycle:c,frames:a.length,avgMs:a.length?a.reduce((a,b)=>a+b,0)/a.length:null,maxMs:a.at(-1),p95Ms:a[Math.floor(a.length*.95)],gapsOver60:samples.filter(s=>s.dt>60)}});const report={id:DESIGN.id,adapter:stats.adapterInfo,shader:stats.shaderMessages,errors:stats.errors,submitted:stats.submitted,cycles,frames,elapsedMs:elapsed,audioGain:verification?0:null,negativeClock:stats.cycleStarts.some(c=>c.elapsedMs<0),avgRafMs:ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:null,maxRafMs:ds.length?Math.max(...ds):null,byCycle,rateTransitions:stats.rateTransitions||[]};window.statusRecoveryE.report=report;}
async function start(){await createEffect(canvas);if(audit){canvas.width=1320;canvas.height=1160;draw(0);await device.queue.onSubmittedWorkDone();status.textContent='PASS GPU H64 audit';finishTest();return;}if(q.has('at')){draw(Number(q.get('at')));await device.queue.onSubmittedWorkDone();finishTest();return;}
 // Submit/finish the pipeline before starting actor time so cold GPU compilation
 // cannot jump over the receipt phase of the first gallery loop.
 const warmStart=performance.now();draw(0);await device.queue.onSubmittedWorkDone();stats.warmupMs=performance.now()-warmStart;
 function frame(now){if(last!==null){const dt=now-last;stats.frameDeltas.push(dt);stats.frameSamples.push({cycle:cycles,actorMs:elapsed,dt});if(stats.frameDeltas.length>1000)stats.frameDeltas.shift();if(running)elapsed+=dt*rate;}last=now;
  if(loop&&elapsed>=DESIGN.cycleMs){elapsed%=DESIGN.cycleMs;cycles++;stats.cycleStarts.push({cycle:cycles,elapsedMs:elapsed});playSound();}
  if(q.has('rate-test')&&cycles===1&&rate===1){rate=2;stats.rateTransitions=[{cycle:1,rate:2,elapsedMs:elapsed}];}if(q.has('rate-test')&&cycles===2&&rate===2){rate=.5;stats.rateTransitions.push({cycle:2,rate:.5,elapsedMs:elapsed});}
  draw(elapsed);frames++;document.getElementById('time').value=Math.min(elapsed,1900);status.textContent='WebGPU / H64 / '+Math.round(elapsed)+'ms'+(verification?' / verify: audio=0':'');if(q.has('test')&&cycles>=3){device.queue.onSubmittedWorkDone().then(finishTest);return;}requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}
document.getElementById('replay').onclick=()=>{elapsed=0;last=null;loop=true;running=true;playSound()};document.getElementById('bg').onclick=()=>{light=1-light};document.getElementById('loop').onclick=()=>{loop=!loop};document.getElementById('rate').oninput=e=>{rate=Number(e.target.value);if(currentSound&&audio)currentSound.playbackRate.setValueAtTime(rate,audio.currentTime)};document.getElementById('time').oninput=e=>{loop=false;running=false;elapsed=Number(e.target.value);last=null;stopSound();draw(elapsed)};document.getElementById('audio').onclick=()=>activateFromGesture({id:DESIGN.id});
if(verification){document.getElementById('audio').disabled=true;document.getElementById('audio').textContent='verify: 音声0';}
window.addEventListener('pagehide',()=>{stopSound();audio?.close();device?.destroy()});start().catch(e=>{stats.errors.push(e.message);status.textContent='FAIL '+e.message;finishTest()});
