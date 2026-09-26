(async function () {
  'use strict';
  const canvas = document.getElementById('preview');
  const status = document.getElementById('status');
  const query = new URLSearchParams(location.search);
  const verify = query.has('verify');
  const embed = query.get('embed') === '1';
  const fixed = verify && query.has('phase') ? Math.max(0, Math.min(1,
    Number(query.get('phase')))) : null;
  const params = `struct Params { size: vec2f, phase: f32, height: f32, flags: f32, reduced: f32, pad: vec2f }
@group(0) @binding(0) var<uniform> u: Params;
struct VOut { @builtin(position) pos: vec4f }
@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  let center=u.size*0.5;let extent=vec2f(0.42,0.56)*u.height;
  let corner=array<vec2f,6>(vec2f(-1.0,-1.0),vec2f(1.0,-1.0),vec2f(-1.0,1.0),vec2f(-1.0,1.0),vec2f(1.0,-1.0),vec2f(1.0,1.0))[i];
  let pixel=center+corner*extent;
  var o: VOut; o.pos = vec4f(pixel/u.size*vec2f(2.0,-2.0)+vec2f(-1.0,1.0),0.0,1.0); return o;
}
fn sdSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
 let pa=p-a; let ba=b-a; let h=clamp(dot(pa,ba)/max(dot(ba,ba),0.0001),0.0,1.0); return length(pa-ba*h);
}
fn sdEllipse(p: vec2f, r: vec2f) -> f32 {
 let k0=length(p/r); let k1=length(p/(r*r)); return k0*(k0-1.0)/max(k1,0.001);
}
fn sdPoly(p: vec2f, points: array<vec2f,8>, n: u32) -> f32 {
 var d=1.0e6; var inside=false; var j=n-1u;
 for(var i=0u;i<n;i=i+1u){let a=points[i];let b=points[j];d=min(d,sdSegment(p,a,b));
   if(((a.y>p.y)!=(b.y>p.y)) && (p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)){inside=!inside;} j=i;}
 if(inside){return -d;} return d;
}
fn legPoint(side:f32,t:f32,h:f32)->vec2f { return vec2f(side*(0.12+0.105*t)*h,(0.025+0.25*t)*h); }
fn ribbon(p:vec2f,side:f32,phase:f32,h:f32,reduced:f32)->f32 {
 let travel=clamp((phase-0.015)/0.665,0.0,1.0);
 let reach=select(0.22+0.78*travel,0.40+0.50*travel,reduced>0.5);
 let t0=0.0;let t1=reach*0.35;let t2=reach*0.68;let t3=reach;
 let a0=legPoint(side,t0,h);let a1=legPoint(side,t1,h);let a2=legPoint(side,t2,h);let a3=legPoint(side,t3,h);
 let w0=0.115*h;let w1=(0.105+0.035*sin(phase*8.0+0.4))*h;let w2=(0.095+0.058*sin(phase*7.0+1.3))*h;let w3=0.045*h;
 var v:array<vec2f,8>;
 v[0]=vec2f(side*(abs(a0.x)+0.105*h),a0.y);
 v[1]=vec2f(side*(abs(a1.x)+0.105*h),a1.y);
 v[2]=vec2f(side*(abs(a2.x)+0.105*h),a2.y);
 v[3]=vec2f(side*(abs(a3.x)+0.105*h),a3.y);
 v[4]=vec2f(side*(abs(a3.x)+0.105*h+w3),a3.y-0.012*h);
 v[5]=vec2f(side*(abs(a2.x)+0.105*h+w2),a2.y);
 v[6]=vec2f(side*(abs(a1.x)+0.105*h+w1),a1.y);
 v[7]=vec2f(side*(abs(a0.x)+0.105*h+w0),a0.y+0.02*h);
 return sdPoly(p,v,8u);
}
fn shoulder(p:vec2f,side:f32,h:f32)->f32 {
 var v:array<vec2f,8>;let y=0.015*h;
 v[0]=vec2f(side*0.115*h,y);v[1]=vec2f(side*0.27*h,y+0.012*h);
 v[2]=vec2f(side*0.30*h,y+0.055*h);v[3]=vec2f(side*0.235*h,y+0.095*h);
 v[4]=vec2f(side*0.15*h,y+0.085*h);v[5]=vec2f(side*0.105*h,y+0.05*h);
 v[6]=vec2f(side*0.105*h,y+0.025*h);v[7]=vec2f(side*0.115*h,y);
 return sdPoly(p,v,8u);
}
fn over(dst:vec4f,src:vec4f)->vec4f { return vec4f(src.rgb*src.a+dst.rgb*(1.0-src.a),src.a+dst.a*(1.0-src.a)); }
fn fill(d:f32, color:vec3f, aa:f32)->vec4f { let a=1.0-smoothstep(-aa,aa,d); return vec4f(color,a); }
@fragment fn fs(input:VOut)->@location(0) vec4f {
 let px=input.pos.xy;let center=vec2f(u.size.x*0.5,u.size.y*0.5);let h=u.height;let q=px-center;
 let p=clamp(u.phase,0.0,1.0);let aa=max(0.75,u.size.x/900.0);
 var color=vec4f(0.086,0.112,0.129,1.0);
 // Neutral actor proxy defines the pelvis, thigh anchors and existing pose; no body animation is added.
 let head=sdEllipse(q-vec2f(0.0,-0.405*h),vec2f(0.082*h,0.095*h));
 let torso=sdEllipse(q-vec2f(0.0,-0.165*h),vec2f(0.16*h,0.20*h));
 let hip=sdEllipse(q-vec2f(0.0,0.025*h),vec2f(0.16*h,0.08*h));
 let body=min(head,min(torso,hip));
 var d=body;
 d=min(d,sdSegment(q,vec2f(-0.13*h,-0.29*h),vec2f(-0.23*h,0.015*h))-0.045*h);
 d=min(d,sdSegment(q,vec2f(0.13*h,-0.29*h),vec2f(0.23*h,0.015*h))-0.045*h);
 d=min(d,sdSegment(q,vec2f(-0.09*h,0.055*h),vec2f(-0.15*h,0.29*h))-0.065*h);
 d=min(d,sdSegment(q,vec2f(0.09*h,0.055*h),vec2f(0.15*h,0.29*h))-0.065*h);
 d=min(d,sdSegment(q,vec2f(-0.15*h,0.29*h),vec2f(-0.20*h,0.49*h))-0.052*h);
 d=min(d,sdSegment(q,vec2f(0.15*h,0.29*h),vec2f(0.20*h,0.49*h))-0.052*h);
 color=over(color,fill(d,vec3f(0.48,0.55,0.55),aa));
 let f=floor(u.flags);let l1=f-2.0*floor(f/2.0)>0.5;let l2=floor(f/2.0)-2.0*floor(f/4.0)>0.5;
 let l3=floor(f/4.0)-2.0*floor(f/8.0)>0.5;let glow=floor(f/8.0)-2.0*floor(f/16.0)>0.5;
 for(var sideIndex=0u;sideIndex<2u;sideIndex=sideIndex+1u){
   let side=select(1.0,-1.0,sideIndex==0u);
   let s=shoulder(q,side,h);let r=ribbon(q,side,p,h,u.reduced);
   if(glow){
     let gd=min(s,r)-0.025*h;let ga=exp(-max(gd,0.0)*0.12)*0.18;
     let gate=select(1.0,0.0,p<=0.0 || p>=1.0);
     color=vec4f(color.rgb+vec3f(0.94,0.42,0.29)*ga*gate,color.a);
   }
   if(l1){let shoulderGate=1.0-smoothstep(0.10,0.20,p);color=over(color,fill(s,vec3f(0.94,0.55,0.41)*shoulderGate,aa));}
   if(l2){
     // Low-density far fold is separated from the brighter broad surface.
     let back=ribbon(q-vec2f(side*0.018*h,0.0),side,p,h,u.reduced);
     let backAlpha=(1.0-smoothstep(-aa,aa,back))*0.20;
     color=over(color,vec4f(0.72,0.23,0.20,backAlpha));
     color=over(color,fill(r,vec3f(0.94,0.55,0.42),aa));
     let travel=clamp((p-0.015)/0.665,0.0,1.0);let reach=select(0.22+0.78*travel,0.40+0.50*travel,u.reduced>0.5);
     let foldPoint=legPoint(side,reach,h);
     let fd=sdSegment(q,foldPoint+vec2f(side*0.105*h,-0.055*h),foldPoint+vec2f(side*0.19*h,0.005*h))-0.012*h;
     color=over(color,fill(fd,vec3f(1.0,0.945,0.84),0.8*aa));
   }
   if(l3 && p>0.42){
     let t=clamp((p-0.42)/0.28,0.0,1.0);let at=legPoint(side,t,h);
     let join=sdSegment(q,at+vec2f(side*0.045*h,-0.005*h),at+vec2f(side*0.105*h,0.01*h))-0.025*h;
     color=over(color,fill(join,vec3f(1.0,0.90,0.76),aa));
   }
 }
 return color;
}`;

  let device, context, pipeline, uniform, bindGroup, raf = 0, startMs = performance.now();
  let phase = fixed ?? 0, previous = phase, running = fixed === null, started = fixed === null;
  let width = 900, height = 520, frameId = 0, loopCount = 0, terminalAt = 0, audioContext = null, audioArmed = false;
  let cues = [];
  const controls = Object.fromEntries(['height','rate','acc2','reduced','glow','l1','l2','l3'].map(id => [id, document.getElementById(id)]));
  const requestedHeight=Number(query.get('height'));if(verify&&[64,100].includes(requestedHeight))controls.height.value=String(requestedHeight);
  function flags(){return (controls.l1.checked?1:0)+(controls.l2.checked?2:0)+(controls.l3.checked?4:0)+(controls.glow.checked?8:0);}
  function resize(){const r=canvas.getBoundingClientRect();const dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(w!==width||h!==height){width=w;height=h;canvas.width=width;canvas.height=height;}}
  function updateUniform(){const dpr=width/Math.max(1,canvas.clientWidth);device.queue.writeBuffer(uniform,0,new Float32Array([width,height,phase,Number(controls.height.value)*dpr,flags(),controls.reduced.checked?1:0,0,0]));}
  function frame(){
    resize();updateUniform();const encoder=device.createCommandEncoder({label:`Stamina zero preview frame ${frameId+1}`});
    const pass=encoder.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0.086,g:0.112,b:0.129,a:1},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(6);pass.end();device.queue.submit([encoder.finish()]);frameId++;
    window.__staminaAstraZeroSnapshot=Object.freeze({ready:true,renderer:'WebGPU',frameId,phase,loopCount,embed,wallMs:performance.now()-startMs,height:Number(controls.height.value),dpr:width/canvas.clientWidth,rate:Number(controls.rate.value)*(controls.acc2.checked?2:1),reduced:controls.reduced.checked,layerFlags:flags(),verify,submitted:true});
  }
  function playNoiseCue(atPhase, kind){
    if(!audioArmed||verify||!audioContext)return;
    const now=audioContext.currentTime;const rate=Number(controls.rate.value)*(controls.acc2.checked?2:1);
    const eDuration=kind==='stretch'?0.46:kind==='arrival'?0.13:0.20;const duration=eDuration/rate;
    const length=Math.ceil(audioContext.sampleRate*eDuration);const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);const data=buffer.getChannelData(0);
    let seed=Math.floor((atPhase+1)*75491);for(let i=0;i<length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1);}
    const source=audioContext.createBufferSource();source.buffer=buffer;source.playbackRate.value=rate;
    const filter=audioContext.createBiquadFilter();filter.type='bandpass';filter.frequency.value=kind==='onset'?1500:950;filter.Q.value=kind==='stretch'?0.72:0.35;
    const gain=audioContext.createGain();const volume=kind==='stretch'?0.025:0.055;gain.gain.setValueAtTime(0.0001,now);gain.gain.linearRampToValueAtTime(volume,now+0.035/rate);gain.gain.setValueAtTime(volume,now+Math.max(0.04,duration*0.55));gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    source.connect(filter);filter.connect(gain);
    if(kind==='stretch'){
      const body=audioContext.createBiquadFilter();body.type='bandpass';body.frequency.setValueAtTime(300,now);body.frequency.linearRampToValueAtTime(190,now+duration);body.Q.value=0.95;
      const bodyGain=audioContext.createGain();bodyGain.gain.setValueAtTime(0.0001,now);bodyGain.gain.linearRampToValueAtTime(0.065,now+0.06/rate);bodyGain.gain.setValueAtTime(0.065,now+duration*0.52);bodyGain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
      const scrape=audioContext.createBiquadFilter();scrape.type='bandpass';scrape.frequency.setValueAtTime(720,now);scrape.frequency.linearRampToValueAtTime(1320,now+duration);scrape.Q.value=0.62;
      const scrapeGain=audioContext.createGain();scrapeGain.gain.setValueAtTime(0.0001,now);scrapeGain.gain.linearRampToValueAtTime(0.022,now+0.05/rate);scrapeGain.gain.setValueAtTime(0.022,now+duration*0.52);scrapeGain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
      source.connect(body);body.connect(bodyGain);bodyGain.connect(audioContext.destination);source.connect(scrape);scrape.connect(scrapeGain);scrapeGain.connect(audioContext.destination);
    }
    if(kind==='arrival'){
      const resonance=audioContext.createOscillator();const resonanceGain=audioContext.createGain();resonance.type='sine';resonance.frequency.value=218;resonanceGain.gain.setValueAtTime(0.0001,now);resonanceGain.gain.linearRampToValueAtTime(0.014,now+0.035/rate);resonanceGain.gain.exponentialRampToValueAtTime(0.0001,now+duration);resonance.connect(resonanceGain);resonanceGain.connect(audioContext.destination);resonance.start(now);resonance.stop(now+duration);
    }
    gain.connect(audioContext.destination);source.start(now);source.stop(now+duration);
    cues.push({kind,phase:atPhase,scheduledAt:now,rate});
    window.__staminaAstraZeroAudio=Object.freeze({status:'scheduled',verify:false,cues:cues.slice()});
  }
  function checkAudio(oldP,newP){if(!audioArmed||newP<oldP)return;for(const [at,kind] of [[0.06,'onset'],[0.12,'stretch'],[0.66,'arrival']])if(oldP<at&&newP>=at&&!(kind==='arrival'&&newP>=1))playNoiseCue(at,kind);}
  function tick(now){raf=0;if(fixed===null&&running){const dt=Math.min(80,Math.max(0,now-(tick.last||now)));tick.last=now;const rate=Number(controls.rate.value)*(controls.acc2.checked?2:1);phase=Math.min(1,phase+dt*rate/1500);checkAudio(previous,phase);previous=phase;if(phase>=1){running=false;audioArmed=false;if(embed)terminalAt=now;}}
    if(fixed===null&&embed&&terminalAt&&now-terminalAt>=420){phase=0;previous=0;running=true;terminalAt=0;loopCount++;tick.last=now;startMs=now;}
    frame();if(fixed===null&&(running||phase<1||terminalAt))raf=requestAnimationFrame(tick);}
  function redraw(){if(!raf)raf=requestAnimationFrame(tick);}
  document.getElementById('restart').onclick=()=>{phase=0;previous=0;running=true;started=true;tick.last=performance.now();startMs=performance.now();redraw();};
  document.getElementById('pause').onclick=e=>{running=!running;e.currentTarget.textContent=running?'一時停止':'再開';tick.last=performance.now();if(audioContext){if(running)void audioContext.resume();else void audioContext.suspend();}if(running)redraw();};
  for(const el of Object.values(controls))el.addEventListener('change',redraw);
  document.getElementById('sound').onclick=async()=>{
    if(verify){window.__staminaAstraZeroAudio={status:'suppressed',verify:true,cues:[]};return;}
    try{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Web Audio unavailable');audioContext??=new C();await audioContext.resume();audioArmed=true;cues=[];previous=phase;window.__staminaAstraZeroAudio={status:'armed',verify:false,cues:[]};}catch(e){window.__staminaAstraZeroAudio={status:'error',error:String(e)};}
  };
  try{
    if(!navigator.gpu)throw new Error('このブラウザーはWebGPUを利用できません');
    const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('WebGPU adapter unavailable');
    device=await adapter.requestDevice();device.addEventListener('uncapturederror',e=>{window.__staminaAstraZeroGpuErrors=(window.__staminaAstraZeroGpuErrors||[]).concat(String(e.error));});
    context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas context unavailable');
    const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
    const module=device.createShaderModule({label:'Astra zero Stamina E preview WGSL',code:params});const info=await module.getCompilationInfo();
    const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw new Error(errors.map(x=>x.message).join('\n'));
    uniform=device.createBuffer({label:'Stamina preview phase and geometry parameters',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    pipeline=await device.createRenderPipelineAsync({label:'Stamina zero full-screen WebGPU E',layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
    resize();phase=fixed??0;previous=phase;running=fixed===null;tick.last=performance.now();frame();
    const infoAdapter=adapter.info;
    window.__staminaAstraZeroGpu={state:'ready',adapter:infoAdapter?{vendor:infoAdapter.vendor,architecture:infoAdapter.architecture,device:infoAdapter.device,description:infoAdapter.description}:null,format,shaderErrors:errors.length,pipeline:'ready'};
    status.textContent=verify?'verify: 音声は強制無音です。位相・DPR・レイヤー診断を利用できます。':'各設定を切り替え、H64/H100の実寸と連続再生を確認してください。音声はボタン操作後のみ再生します。';
    if(fixed===null)redraw();
  }catch(error){status.textContent=`WebGPUプレビューを開始できません: ${String(error)}`;window.__staminaAstraZeroGpu={state:'error',error:String(error)};}
  window.addEventListener('resize',redraw);
  window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);try{audioContext?.close();}catch(_){}try{device?.destroy();}catch(_){}});
})();
