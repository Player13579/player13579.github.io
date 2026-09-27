import {BRANCHES,DURATIONS_MS,VERSION,sampleEnvelope,packUniforms,playSFX,srgbToLinear} from './barrier-pro-sampler.mjs';
const $=id=>document.getElementById(id),canvas=$('gpu'),status=$('status');
const W=256,H=192;let device,adapter,ctx,uniform,pipeline,bgPipeline,presentPipeline,effect,msaa,display,bindEffect,bindPresent;
let live=false,start=0,age=120,audio,voice,failures=[],raf=0,runToken=0,barrierBind;
const metadata={version:VERSION,userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,hardwareAttestation:'unverified',renderObservation:'not_run'};
const displayWGSL=`
struct D {size:vec4f,bg:vec4f};
@group(0) @binding(0) var tex:texture_2d<f32>;
@group(0) @binding(1) var<uniform> d:D;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0,1);
}
fn enc(c:vec3f)->vec3f {return select(12.92*c,1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn composite(@builtin(position) q:vec4f)->@location(0) vec4f {
 let s=textureLoad(tex,vec2i(q.xy),0);var bg=d.bg.xyz;
 if(d.bg.w>.5){let parity=(i32(q.x)/4+i32(q.y)/4)%2;bg=select(vec3f(.025),vec3f(.65),parity==0);}
 return vec4f(clamp(enc(s.rgb+(1.-s.a)*bg),vec3f(0),vec3f(1)),1);
}
@fragment fn present(@builtin(position) q:vec4f)->@location(0) vec4f{return textureLoad(tex,vec2i(q.xy),0);}
`;
function rgba(hex){return [1,3,5].map(i=>srgbToLinear(parseInt(hex.slice(i,i+2),16)/255));}
const backgrounds=['#10141c','#777777','#eeeeee','#ffffff','#234ad0'].map(rgba);
let displayUniform;
function updateStatus(extra={}){
 const b=$('branch').value;const e=sampleEnvelope(b,age,{authoritativeActive:['create','absorb'].includes(b),impactV:.57});
 status.textContent=JSON.stringify({...metadata,frame:{branch:b,ageMs:age,hPx:+$('height').value,background:+$('bg').value,yawDeg:+$('yaw').value,
 coreEnabled:$('core').checked,phase:e.phase,eventActive:e.eventActive,authorityActiveFixture:e.authoritativeActive,residueOnly:e.residueOnly},failures,...extra},null,2);
}
async function init(){
 if(!navigator.gpu)throw new Error('WebGPU APIがありません。Canvas 2Dやソフトウェア画像へ代替しません。');
 adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapterを取得できません。');
 const info=adapter.info;metadata.adapter=info?{vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,isFallbackAdapter:info.isFallbackAdapter??adapter.isFallbackAdapter??null}:{isFallbackAdapter:adapter.isFallbackAdapter??null};
 device=await adapter.requestDevice();device.lost.then(info=>{failures.push(`device lost: ${info.message}`);live=false;updateStatus();});
 device.addEventListener('uncapturederror',e=>{failures.push(e.error.message);live=false;updateStatus();});
 ctx=canvas.getContext('webgpu');if(!ctx)throw new Error('WebGPU canvas context unavailable');
 const format=navigator.gpu.getPreferredCanvasFormat();metadata.canvasFormat=format;
 ctx.configure({device,format,alphaMode:'opaque',colorSpace:'srgb'});
 canvas.style.width=`${W/devicePixelRatio}px`;canvas.style.height=`${H/devicePixelRatio}px`;
 const code=await fetch('./barrier-pro.wgsl').then(r=>{if(!r.ok)throw new Error(`shader HTTP ${r.status}`);return r.text();});
 const shader=device.createShaderModule({code,label:'barrier formulas'});
 const compilation=await shader.getCompilationInfo();metadata.shaderMessages=compilation.messages.map(m=>({type:m.type,line:m.lineNum,message:m.message}));
 if(compilation.messages.some(m=>m.type==='error'))throw new Error('WGSL compilation failed');
 device.pushErrorScope('validation');
 pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',targets:[{format:'rgba16float',blend:{color:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{operation:'add',srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:4}});
 uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 const effectBind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
 barrierBind=effectBind;
 msaa=device.createTexture({size:[W,H],format:'rgba16float',sampleCount:4,usage:GPUTextureUsage.RENDER_ATTACHMENT});
 effect=device.createTexture({size:[W,H],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
 display=device.createTexture({size:[W,H],format:'rgba8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});
 const dm=device.createShaderModule({code:displayWGSL});
 bgPipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:dm,entryPoint:'vs'},fragment:{module:dm,entryPoint:'composite',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}});
 presentPipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:dm,entryPoint:'vs'},fragment:{module:dm,entryPoint:'present',targets:[{format}]},primitive:{topology:'triangle-list'}});
 displayUniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 bindEffect=device.createBindGroup({layout:bgPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:effect.createView()},{binding:1,resource:{buffer:displayUniform}}]});
 bindPresent=device.createBindGroup({layout:presentPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:display.createView()}]});
 const err=await device.popErrorScope();if(err)throw err;draw();
}
function draw(){
 if(!device)return;
 const branch=$('branch').value,idx=BRANCHES.indexOf(branch),bg=+$('bg').value;
 const values=packUniforms({branch,ageMs:age,authoritativeActive:idx<2,impactV:.57,hPx:+$('height').value,width:W,height:H,yawDeg:+$('yaw').value,coreEnabled:$('core').checked});
 device.queue.writeBuffer(uniform,0,values);device.queue.writeBuffer(displayUniform,0,new Float32Array([W,H,0,0,...(backgrounds[bg]??[0,0,0]),bg===5?1:0]));
 const enc=device.createCommandEncoder();
 let pass=enc.beginRenderPass({colorAttachments:[{view:msaa.createView(),resolveTarget:effect.createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'discard'}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,barrierBind);
 pass.draw(48*80*6,2,0,0); // back halves; insert unmodified target at its depth in the ENGINE, not here.
 pass.draw(48*80*6,2,0,2); // front halves
 pass.end();
 pass=enc.beginRenderPass({colorAttachments:[{view:display.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(bgPipeline);pass.setBindGroup(0,bindEffect);pass.draw(3);pass.end();
 pass=enc.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(presentPipeline);pass.setBindGroup(0,bindPresent);pass.draw(3);pass.end();
 device.queue.submit([enc.finish()]);$('time').value=String(age);$('timeText').value=`${age.toFixed(1)}ms`;updateStatus();
}
function tick(now){if(!live)return;age=now-start;draw();if(age<850)raf=requestAnimationFrame(tick);else live=false;}
function stopLoop(){live=false;cancelAnimationFrame(raf);runToken++;}
async function run(withSound){stopLoop();voice?.cancel();const token=runToken;try{if(withSound){audio??=new AudioContext();await audio.resume();if(token!==runToken)return;voice=playSFX(audio,$('branch').value);}start=performance.now();live=true;raf=requestAnimationFrame(tick);}catch(e){failures.push(String(e));updateStatus();}}
for(const id of ['branch','height','bg','yaw','core'])$(id).addEventListener('change',()=>{stopLoop();voice?.cancel();draw();});
$('time').addEventListener('input',()=>{stopLoop();voice?.cancel();age=+$('time').value;draw();});
$('play').onclick=()=>run(false);$('sound').onclick=()=>run(true);
$('last').onclick=()=>{stopLoop();voice?.cancel();age=DURATIONS_MS[$('branch').value]-1;draw();};
$('after').onclick=()=>{stopLoop();voice?.cancel();age=DURATIONS_MS[$('branch').value]+50;draw();};
function halfToNumber(h){const s=(h&0x8000)?-1:1,e=(h>>10)&31,m=h&1023;return e===0?s*Math.pow(2,-14)*(m/1024):e===31?(m?NaN:s*Infinity):s*Math.pow(2,e-15)*(1+m/1024);}
async function readTexture(tex,bpp){const row=Math.ceil(W*bpp/256)*256;const buf=device.createBuffer({size:row*H,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const enc=device.createCommandEncoder();enc.copyTextureToBuffer({texture:tex},{buffer:buf,bytesPerRow:row,rowsPerImage:H},[W,H]);device.queue.submit([enc.finish()]);await buf.mapAsync(GPUMapMode.READ);const bytes=new Uint8Array(buf.getMappedRange()).slice();buf.unmap();buf.destroy();return {bytes,row};}
function largestComponent(mask){const seen=new Uint8Array(mask.length);let largest=0;for(let k=0;k<mask.length;k++){if(!mask[k]||seen[k])continue;const q=[k];seen[k]=1;let count=0;for(let h=0;h<q.length;h++){const x=q[h]%W,y=Math.floor(q[h]/W);count++;for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(xx<0||yy<0||xx>=W||yy>=H)continue;const n=yy*W+xx;if(mask[n]&&!seen[n]){seen[n]=1;q.push(n);}}}largest=Math.max(largest,count);}return largest;}
$('read').onclick=async()=>{
 const controls=[...document.querySelectorAll('button,select,input')];controls.forEach(e=>e.disabled=true);
 try{stopLoop();voice?.cancel();draw();await device.queue.onSubmittedWorkDone();const [f,d]=await Promise.all([readTexture(effect,8),readTexture(display,4)]);const dv=new DataView(f.bytes.buffer);let covered=0,clipped=0,nearWhite=0,invalid=0,alphaZeroRgb=0;const mask=new Uint8Array(W*H);let maxAlpha=0,pmViolation=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*f.row+x*8,j=y*d.row+x*4;const v=[0,2,4,6].map(o=>halfToNumber(dv.getUint16(i+o,true)));if(v.some(n=>!Number.isFinite(n)))invalid++;maxAlpha=Math.max(maxAlpha,v[3]);if(v[3]<1e-5&&v.slice(0,3).some(n=>Math.abs(n)>1e-4))alphaZeroRgb++;
 if(v.slice(0,3).some(n=>n>v[3]+.002))pmViolation++;if(v[3]<.05)continue;covered++;const rgb=Array.from(d.bytes.slice(j,j+3),n=>n/255);const Y=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];if(v[3]>=.15&&Y>=.94&&Math.max(...rgb)-Math.min(...rgb)<=.08){nearWhite++;mask[y*W+x]=1;}if(rgb.every(n=>n===1))clipped++;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',f.bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const largest=largestComponent(mask);const whiteFraction=covered?nearWhite/covered:0;const clipFraction=covered?clipped/covered:0;const expected=sampleEnvelope($('branch').value,age,{authoritativeActive:['create','absorb'].includes($('branch').value)}).visible;
 const record={...metadata,createdAt:new Date().toISOString(),measurement:'GPU readback; no image export; not a perceptual verdict',branch:$('branch').value,ageMs:age,hPx:+$('height').value,background:+$('bg').value,yawDeg:+$('yaw').value,coreEnabled:$('core').checked,renderTarget:[W,H],effectFormat:'rgba16float',sampleCount:4,stats:{covered,nearWhite,nearWhiteFraction:whiteFraction,largestNearWhiteComponent:largest,clippedAllChannels:clipped,invalid,alphaZeroRgb,pmViolation,maxAlpha},effectBufferSHA256:hash,
 automaticHardReject:invalid>0||alphaZeroRgb>0||pmViolation>0||whiteFraction>.025||clipFraction>.005||largest>(+$('height').value===64?18:44)||(expected&&covered<40*(+$('height').value/64)**2),
 pending:['hardware verification','full-lifetime readability','grayscale branch discrimination','face contrast lower bound','character/depth integration','SFX audition','timing and performance'],renderStatus:'NotRun'};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));a.download=`barrier-gpu-${record.branch}-H${record.hPx}-${Math.round(age)}ms.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);updateStatus({lastReadback:record.stats});
 }catch(e){failures.push(String(e));updateStatus();}finally{controls.forEach(e=>e.disabled=false);}
};
init().catch(e=>{failures.push(String(e));updateStatus();});
