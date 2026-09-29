import {DESIGN,makePCM,admit,phase} from './design.mjs';
const query=new URLSearchParams(location.search), verification=query.has('verify'), audit=query.has('audit');
document.body.classList.toggle('embed',query.has('embed'));document.body.classList.toggle('audit',audit);
const canvas=document.getElementById('stage'),status=document.getElementById('status');
const shader=`
struct Params{ view:vec4f, actor:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn ramp(a:f32,b:f32,t:f32)->f32 {return smoothstep(a,b,t);}
fn window(a:f32,b:f32,c:f32,d:f32,t:f32)->f32{return ramp(a,b,t)*(1.-ramp(c,d,t));}
fn ellipse(p:vec2f,c:vec2f,r:vec2f)->f32 {return length((p-c)/r);}
fn volume(p:vec2f,c:vec2f,r:vec2f)->f32 {let d=ellipse(p,c,r);return 1.-smoothstep(.72,1.06,d);}
fn star(p:vec2f,c:vec2f,h:f32)->f32 {
 let q=(p-c)*h;let a=${DESIGN.sparkleAngleDeg}.*.0174532925;
 let v=vec2f(q.x*cos(a)+q.y*sin(a),-q.x*sin(a)+q.y*cos(a));
 let long=exp(-abs(v.x)*5.)*pow(max(0.,1.-abs(v.y)/3.2),1.9);
 let short=exp(-abs(v.y)*6.)*pow(max(0.,1.-abs(v.x)/2.0),2.2);
 return long+short+exp(-dot(q,q)*3.1);
}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f{
 var px=pos.xy;var ms=u.view.z;var h=u.actor.z;var bg=u.actor.w;var stars=u.flags.x;var obs=u.flags.y;var bodies=u.flags.z;
 var ax=u.actor.x;var fy=u.actor.y;
 if(u.view.w>.5){
  let col=u32(floor(px.x/120.));let row=u32(floor(px.y/116.));
  let times=array<f32,11>(0.,80.,180.,350.,600.,810.,1000.,1180.,1350.,1450.,1600.);ms=times[min(col,10u)];
  px=vec2f(px.x-f32(col)*120.,px.y-f32(row)*116.);ax=60.;fy=91.;h=64.;bg=f32(row%2u);stars=select(1.,0.,row>=2u);obs=select(1.,0.,row>=4u);
 }
 let p=vec2f((px.x-ax)/h,1.-(fy-px.y)/h);
 let suv=vec2f((p.x+.30)/.60,p.y);
 let uv=vec2f((62.+suv.x*136.)/768.,(15.+suv.y*225.)/512.);
 let inside=select(0.,1.,suv.x>=0.&&suv.x<=1.&&suv.y>=0.&&suv.y<=1.);
 let body=textureSampleLevel(actorTex,samp,uv,0.);let alpha=body.a*inside;
 var color=mix(vec3f(.065,.10,.135),vec3f(.955,.953,.933),bg);
 let bodyRgb=pow(body.rgb,vec3f(2.2));color=mix(color,bodyRgb,alpha);
 let t=ms*.001;let liveMask=select(0.,1.,t>0.&&t<${DESIGN.durationMs/1000});
 // PH2: 腹部の受納体積。手前断面のふくらみと内側の芯を別々に形成。
 let sourceEnv=window(0.,.10,.46,.74,t)*liveMask;
 let compression=mix(.16,.105,ramp(.1,.38,t));
 let source=volume(p,vec2f(0.,.555),vec2f(compression,.14))*sourceEnv;
 let sourceCore=volume(p,vec2f(-.016,.549),vec2f(.037,.084))*sourceEnv;
 // 四肢の体積は輸送前線→充填→内側収束。外部の線や立ち上る粒子ではない。
 var receive=0.;var core=0.;var nearLight=0.;var sparkle=0.;
 for(var i:u32=0u;i<4u;i++){
  let side=select(-1.,1.,i%2u==1u);let arms=i>=2u;
  let arrival=select(.18,.51,arms);
  // 到達後は外付け光点の中心を身体内へ受納する。拡がりと連続した境界が残る。
  let settle=ramp(arrival+.17,arrival+.53,t);
  let center=vec2f(side*mix(select(.16,.24,arms),select(.107,.155,arms),settle),select(.765,.568,arms));
  let size=vec2f(select(.096,.072,arms),select(.133,.105,arms));
  let on=ramp(arrival,arrival+.22,t)*liveMask;let end=1.-ramp(1.10,1.45,t);
  let shrink=mix(1.,.22,ramp(1.12,1.45,t));
  let front=mix(center.y-size.y,center.y+size.y,ramp(arrival,arrival+.36,t));
  let filled=volume(p,center,vec2f(size.x*shrink,size.y))*on*end;
  let band=exp(-pow((p.y-front)/.046,2.))*filled;
  let inner=volume(p,vec2f(center.x-side*.031,center.y),size*vec2f(.54,.74))*on*end;
  receive+=filled*.85;core+=band*.75+inner*.29;
  nearLight+=exp(-pow(ellipse(p,center,size*2.0),2.))*on*end*(.24+.76*exp(-pow((t-arrival-.18)/.18,2.)));
  let flash=window(arrival+.08,arrival+.18,arrival+.38,arrival+.55,t);
  // 光条は源から最大4pxの外側へだけ露出する。固定角15°は全点共通。
  sparkle+=star(p,center+vec2f(side*(size.x+3.3/h),-size.y*.25),h)*flash;
 }
 nearLight+=exp(-pow(ellipse(p,vec2f(0.,.555),vec2f(.20,.19)),2.))*sourceEnv;
 sparkle+=star(p,vec2f(.192,.515),h)*window(.04,.12,.26,.37,t);
 // PH3:源由来の局所受光。OBS OFF診断もこの寄与を外す。
 color+=vec3f(.78,.35,.07)*nearLight*.27*alpha*obs*bodies;
 // 背面は身体に遮蔽。前面はalpha密度のある有色材と局所放射を分離。
 let form=(source+receive)*bodies;let density=min(1.,form);let opacity=density*.46;
 let amber=vec3f(.92,.39,.065);color=mix(color,amber,opacity);
 let radiance=(sourceCore*.9+core*.7)*bodies;
 color+=vec3f(1.0,.70,.28)*radiance;
 // OBS1: source-boundな小さい応答。主形の代用にしない。
 color+=vec3f(.70,.30,.065)*nearLight*.11*obs*bodies*(1.-alpha);
 color+=vec3f(1.,.87,.56)*sparkle*.80*stars*obs*bodies*liveMask;
 return vec4f(pow(max(color,vec3f(0.)),vec3f(1./2.2)),1.);
}`;
let device,context,pipeline,buffer,bind,elapsed=0,rate=1,last=null,loop=true,running=true,light=0,audio=null,currentSound=null,cycles=0,frames=0;
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
 pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();device.queue.submit([encoder.finish()]);stats.submitted++;
}
async function start(){
 if(!navigator.gpu)throw new Error('WebGPU unsupported');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
 device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>stats.errors.push(e.error.message));device.lost.then(i=>{if(i.reason!=='destroyed')stats.errors.push(i.message)});
 stats.adapterInfo=adapter.info?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null;
 const mod=device.createShaderModule({code:shader});const info=await mod.getCompilationInfo();stats.shaderMessages=info.messages.map(m=>({type:m.type,message:m.message,line:m.lineNum}));if(info.messages.some(m=>m.type==='error'))throw new Error(JSON.stringify(stats.shaderMessages));
 context=canvas.getContext('webgpu');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
 pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module:mod,entryPoint:'vs'},fragment:{module:mod,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
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
