import {VERSION,LIFE_MS,CooldownEvents,CooldownSound,shader} from './effect.mjs';
const q=new URLSearchParams(location.search),verify=q.has('verify');
if(q.has('embed'))document.body.classList.add('embed');
const canvas=document.querySelector('canvas'),status=document.querySelector('#status');
const sound=new CooldownSound({verify}),events=new CooldownEvents({sound:id=>sound.trigger(id)});
const report=window.__cooldown={version:VERSION,state:'starting',errors:[],submissions:0,verify,audio:sound,source:'gain-cooldownReduction',loops:0};
let start=performance.now(),serial=0,lastCycle=-1,fixed=q.has('phase')?Number(q.get('phase')):null,background=q.get('background')||'dark',height=Number(q.get('height'))||64,reduced=q.has('reduced');
document.querySelector('#background').value=background;document.querySelector('#size').value=String(height);document.querySelector('#reduced').checked=reduced;
document.querySelector('#background').onchange=e=>background=e.target.value;
document.querySelector('#size').onchange=e=>height=Number(e.target.value);
document.querySelector('#reduced').onchange=e=>reduced=e.target.checked;
document.querySelector('#sound').onclick=async()=>{await sound.enable();document.querySelector('#sound').textContent=verify?'検証モード：消音固定':'音を有効にしました';};
function trigger(now){events.receive({id:`preview-${++serial}`,type:'gain-cooldownReduction',playerId:'sophia',x:0,y:0,at:now},now);report.loops++;}
document.querySelector('#replay').onclick=()=>{fixed=null;start=performance.now();lastCycle=0;trigger(start);};
canvas.addEventListener('click',async()=>{if(!verify){await sound.enable();fixed=null;start=performance.now();lastCycle=0;trigger(start);}});
window.__setCooldown=(opts={})=>{if('phase'in opts)fixed=opts.phase;if('background'in opts)background=opts.background;if('height'in opts)height=opts.height;if('reduced'in opts)reduced=opts.reduced;};
try{
 if(!navigator.gpu)throw Error('WebGPU required');
 const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw Error('No WebGPU adapter');
 report.adapter=Object.fromEntries(['vendor','architecture','device','description'].map(k=>[k,adapter.info?.[k]||'']));
 const device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>report.errors.push(e.error.message));
 device.lost.then(x=>{report.lost=x.message;});
 const context=canvas.getContext('webgpu'),format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 const module=device.createShaderModule({code:shader});const messages=await module.getCompilationInfo();
 report.compilation=messages.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));
 if(messages.messages.some(m=>m.type==='error'))throw Error(JSON.stringify(report.compilation));
 const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
 const bitmap=await createImageBitmap(await(await fetch('./sophia-front-five-v753.png')).blob());
 const texture=device.createTexture({size:[bitmap.width,bitmap.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
 device.queue.copyExternalImageToTexture({source:bitmap},{texture},[bitmap.width,bitmap.height]);bitmap.close();
 const uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}},{binding:1,resource:texture.createView()},{binding:2,resource:device.createSampler({minFilter:'linear',magFilter:'linear'})}]});
 start=performance.now();report.state='ready';
 async function draw(now){
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const cycle=Math.floor((now-start)/2300);if(fixed===null&&cycle!==lastCycle){lastCycle=cycle;trigger(start+cycle*2300);}
  const phase=fixed===null?((now-start)%2300)/LIFE_MS:fixed;events.sample(now);
  device.queue.writeBuffer(uniform,0,new Float32Array([rect.width,rect.height,dpr,0,rect.width/2,rect.height/2+height*.49,height,0,phase,reduced?1:0,background==='light'?1:0,q.has('noactor')?0:1]));
  const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);
  report.submissions++;report.frame={phase,height,background,reduced,actor:!q.has('noactor'),active:events.active.length};
  status.textContent=`WebGPU · ${VERSION} · ${verify?'消音検証':'音はボタンで有効化'} · ${height}px`;
  await device.queue.onSubmittedWorkDone();
  requestAnimationFrame(draw);
 }
 requestAnimationFrame(draw);
 window.__gpuSettled=()=>device.queue.onSubmittedWorkDone();
 window.addEventListener('pagehide',()=>{sound.dispose();texture.destroy();uniform.destroy();device.destroy();},{once:true});
}catch(e){report.state='error';report.errors.push(e.message);status.textContent=e.message;}
