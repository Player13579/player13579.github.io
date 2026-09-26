(async function () {
  'use strict';
  const canvas=document.getElementById('preview'),status=document.getElementById('status');
  const query=new URLSearchParams(location.search),verify=query.has('verify'),embed=query.has('embed');
  const modes={charge:0,release:1,resonance:2,cancel:3,storage:4};
  const lengths={charge:1200,release:1200,resonance:1600,cancel:1600,storage:7000};
  const initialBranch=query.get('branch');
  const controls=Object.fromEntries(['branch','polarity','axis','height','time','rate','acc2','reduced','glow','l1','l2','l3'].map(id=>[id,document.getElementById(id)]));
  if(modes[initialBranch]!==undefined)controls.branch.value=initialBranch;
  const requestedHeight=Number(query.get('height'));if(verify&&[64,100].includes(requestedHeight))controls.height.value=String(requestedHeight);
  const requestedPolarity=Number(query.get('polarity'));if(verify&&[-1,1].includes(requestedPolarity))controls.polarity.value=String(requestedPolarity);
  const shader=`struct Params { size:vec2f, age:f32, height:f32, branch:f32, polarity:f32, flags:f32, angle:f32 }
@group(0) @binding(0) var<uniform> u:Params;
struct VOut { @builtin(position) pos:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
 let center=u.size*0.5;var extentScale=1.15;if(u.branch>0.5&&u.branch<1.5){extentScale=3.0;}else if(u.branch>1.5&&u.branch<2.5){extentScale=2.5;}else if(u.branch>2.5&&u.branch<3.5){extentScale=2.2;}else if(u.branch>3.5){extentScale=0.64;}let extent=vec2f(extentScale,extentScale)*u.height;
 let c=array<vec2f,6>(vec2f(-1.0,-1.0),vec2f(1.0,-1.0),vec2f(-1.0,1.0),vec2f(-1.0,1.0),vec2f(1.0,-1.0),vec2f(1.0,1.0))[i];
 let p=center+c*extent;var o:VOut;o.pos=vec4f(p/u.size*vec2f(2.0,-2.0)+vec2f(-1.0,1.0),0.0,1.0);return o;
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32 { let v=b-a;let h=clamp(dot(p-a,v)/max(dot(v,v),0.0001),0.0,1.0);return length(p-a-v*h); }
fn poly(p:vec2f,v:array<vec2f,10>)->f32 { var d=1.0e6;var inside=false;var j=9u;for(var i=0u;i<10u;i=i+1u){let a=v[i];let b=v[j];d=min(d,seg(p,a,b));if((a.y>p.y)!=(b.y>p.y)){if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x){inside=!inside;}}j=i;}if(inside){return -d;}return d; }
fn facePoint(side:f32,t:f32,h:f32,reach:f32,gap:f32,bend:f32,sign:f32,width:f32)->vec2f {
 let curved=side*(gap+sign*bend*sin(3.14159265*t));let along=side*(0.055*h+reach*t);
 return vec2f(along,curved+side*width);
}
fn field(p:vec2f,side:f32,h:f32,age:f32,branch:f32,pol:f32,reduced:f32)->f32 {
 let a=clamp(age,0.0,1.0);var seconds=1.2*a;if(branch>1.5){seconds=1.6*a;}if(branch>3.5){seconds=7.0*a;}
 var reach=0.8*h;var gap=0.085*h;var bend=0.20*h;var widthStart=0.19*h;var widthEnd=0.025*h;var sign=pol;
 if(branch<0.5){
   let build=smoothstep(0.0,0.68,seconds);reach=mix(0.22*h,0.80*h,build);bend=mix(0.12*h,0.21*h,smoothstep(0.18,0.68,seconds));
 }else if(branch<1.5){
   let open=smoothstep(0.0,0.64,seconds);reach=mix(0.80*h,2.55*h,open);bend=mix(0.14*h,0.24*h,open);
   let dissolve=smoothstep(0.64,0.98,seconds);reach=mix(reach,0.18*h,dissolve);widthStart=mix(0.19*h,0.035*h,dissolve);widthEnd=0.018*h;
 }else if(branch<2.5){
   let join=smoothstep(0.0,0.20,seconds);gap=mix(0.16*h,0.065*h,join);let open=smoothstep(0.20,0.95,seconds);
   reach=mix(0.42*h,2.15*h,open);bend=mix(0.10*h,0.24*h,join);let end=smoothstep(0.95,1.35,seconds);reach=mix(reach,0.14*h,end);
 }else if(branch<3.5){
   let settle=smoothstep(0.0,0.26,seconds);gap=mix(0.15*h,0.045*h,settle);bend=mix(0.21*h,0.025*h,settle);sign=mix(pol,0.0,settle);
   let vanish=smoothstep(0.26,0.84,seconds);reach=mix(0.82*h,0.025*h,vanish);let last=smoothstep(0.84,1.18,seconds);widthStart=mix(0.19*h,0.005*h,last);widthEnd=0.005*h;
 }else{return 1.0e6;}
 if(reduced>0.5 && branch<3.5){reach=0.62*reach+0.18*h;bend*=0.72;}
 let t0=0.0;let t1=0.25;let t2=0.5;let t3=0.75;let t4=1.0;
 var v:array<vec2f,10>;
 let w0=select(mix(widthStart,widthEnd,t0),mix(widthEnd,widthStart,t0),sign<0.0);let w1=select(mix(widthStart,widthEnd,t1),mix(widthEnd,widthStart,t1),sign<0.0);
 let w2=select(mix(widthStart,widthEnd,t2),mix(widthEnd,widthStart,t2),sign<0.0);let w3=select(mix(widthStart,widthEnd,t3),mix(widthEnd,widthStart,t3),sign<0.0);let w4=select(widthEnd,widthStart,sign<0.0);
 v[0]=facePoint(side,t0,h,reach,gap,bend,sign,w0);
 v[1]=facePoint(side,t1,h,reach,gap,bend,sign,w1);
 v[2]=facePoint(side,t2,h,reach,gap,bend,sign,w2);
 v[3]=facePoint(side,t3,h,reach,gap,bend,sign,w3);
 v[4]=facePoint(side,t4,h,reach,gap,bend,sign,w4);
 v[5]=vec2f(side*(0.055*h+reach*t4),side*(gap+sign*bend*sin(3.14159265*t4)));
 v[6]=vec2f(side*(0.055*h+reach*t3),side*(gap+sign*bend*sin(3.14159265*t3)));
 v[7]=vec2f(side*(0.055*h+reach*t2),side*(gap+sign*bend*sin(3.14159265*t2)));
 v[8]=vec2f(side*(0.055*h+reach*t1),side*(gap+sign*bend*sin(3.14159265*t1)));
 v[9]=vec2f(side*(0.055*h+reach*t0),side*gap);
 return poly(p,v);
}
fn box(p:vec2f,c:vec2f,b:vec2f)->f32 { let d=abs(p-c)-b;return length(max(d,vec2f(0.0)))+min(max(d.x,d.y),0.0); }
fn over(dst:vec4f,src:vec4f)->vec4f { return vec4f(src.rgb*src.a+dst.rgb*(1.0-src.a),src.a+dst.a*(1.0-src.a)); }
fn fill(d:f32,c:vec3f,aa:f32)->vec4f { return vec4f(c,1.0-smoothstep(-aa,aa,d)); }
@fragment fn fs(i:VOut)->@location(0) vec4f {
 let center=u.size*0.5;let world=i.pos.xy-center;let angle=u.angle;let cs=cos(angle);let sn=sin(angle);let q=vec2f(world.x*cs+world.y*sn,-world.x*sn+world.y*cs);
 let h=u.height;let a=u.age;let mode=u.branch;let p=clamp(a,0.0,1.0);let aa=max(0.75,u.size.x/900.0);
 let l1=floor(u.flags)-2.0*floor(u.flags/2.0)>0.5;let l2=floor(u.flags/2.0)-2.0*floor(u.flags/4.0)>0.5;let l3=floor(u.flags/4.0)-2.0*floor(u.flags/8.0)>0.5;let glow=floor(u.flags/8.0)-2.0*floor(u.flags/16.0)>0.5;let reduced=select(0.0,1.0,u.flags>=16.0);
 var out=vec4f(0.086,0.108,0.12,1.0);
 // A flat, neutral scale proxy only. It supplies occlusion context without adding character design.
 let head=box(q,vec2f(0.0,-0.39*h),vec2f(0.075*h,0.09*h));let torso=box(q,vec2f(0.0,-0.16*h),vec2f(0.15*h,0.19*h));let hips=box(q,vec2f(0.0,0.025*h),vec2f(0.15*h,0.07*h));
 let body=min(head,min(torso,hips));var bodyD=body;
 bodyD=min(bodyD,seg(q,vec2f(-0.12*h,-0.30*h),vec2f(-0.22*h,0.01*h))-0.042*h);bodyD=min(bodyD,seg(q,vec2f(0.12*h,-0.30*h),vec2f(0.22*h,0.01*h))-0.042*h);
 bodyD=min(bodyD,seg(q,vec2f(-0.08*h,0.06*h),vec2f(-0.15*h,0.29*h))-0.062*h);bodyD=min(bodyD,seg(q,vec2f(0.08*h,0.06*h),vec2f(0.15*h,0.29*h))-0.062*h);
 bodyD=min(bodyD,seg(q,vec2f(-0.15*h,0.29*h),vec2f(-0.19*h,0.49*h))-0.05*h);bodyD=min(bodyD,seg(q,vec2f(0.15*h,0.29*h),vec2f(0.19*h,0.49*h))-0.05*h);
 let bodyColor=fill(bodyD,vec3f(0.47,0.54,0.55),aa);
 let localOrigin=q;let d0=field(localOrigin,-1.0,h,a,mode,u.polarity,reduced);let d1=field(localOrigin,1.0,h,a,mode,u.polarity,reduced);
 var d=min(d0,d1);
 let branchSeconds=a*select(1.2,1.6,mode>1.5);var fieldAlpha=1.0;
 if(mode<0.5){fieldAlpha=smoothstep(0.0,0.18,branchSeconds);}else if(mode<1.5){fieldAlpha=1.0-smoothstep(0.98,1.20,branchSeconds);}else if(mode<2.5){fieldAlpha=1.0-smoothstep(1.35,1.60,branchSeconds);}else if(mode<3.5){fieldAlpha=1.0-smoothstep(1.18,1.28,branchSeconds);}
 if(mode<3.5 && l1){
   if(glow){let g=exp(-max(d,0.0)*0.12)*0.14*fieldAlpha;out=vec4f(out.rgb+vec3f(0.19,0.42,0.40)*g,out.a);}
   // Far projected half is composed behind the actor; near half follows the body.
   if(world.y<0.0){var face=fill(d,vec3f(0.30,0.66,0.61),aa);face.a*=fieldAlpha;out=over(out,face);}
 }
 out=over(out,bodyColor);
 if(mode<3.5 && l1 && world.y>=0.0){var face=fill(d,vec3f(0.36,0.75,0.67),aa);face.a*=fieldAlpha;out=over(out,face);}
 if(mode<3.5 && l2){
   let secs=branchSeconds;var transfer=0.80*h;var travel=0.0;var curve=0.18*h;
   if(mode<0.5){travel=smoothstep(0.18,0.68,secs);}else if(mode<1.5){transfer=2.55*h;travel=smoothstep(0.14,0.64,secs);}else if(mode<2.5){transfer=2.15*h;travel=smoothstep(0.20,0.95,secs);}else{travel=1.0-smoothstep(0.26,0.84,secs);}
   if(reduced>0.5){transfer*=0.70;curve*=0.75;}
   for(var sIndex=0u;sIndex<2u;sIndex=sIndex+1u){let side=select(1.0,-1.0,sIndex==0u);let t0=max(0.0,travel-0.12);let t1=min(1.0,travel+0.12);
     let c0=vec2f(side*(0.055*h+transfer*t0),side*(0.085*h+curve*sin(3.14159265*t0))*u.polarity);let c1=vec2f(side*(0.055*h+transfer*t1),side*(0.085*h+curve*sin(3.14159265*t1))*u.polarity);
     let thick=seg(q,c0,c1)-0.045*h;
     if(world.y>=0.0){var core=fill(thick,vec3f(0.95,0.94,0.83),aa);core.a*=fieldAlpha;out=over(out,core);}
   }
 }
 if(mode>3.5 && mode<4.5 && l3){
   let open=smoothstep(0.0,0.0286,a);let lockFade=1.0-smoothstep(0.985,1.0,a);let gap=mix(0.0,0.105*h,open);
   let panelL=box(q,vec2f(-gap*0.5,-0.12*h),vec2f(0.045*h,0.11*h));let panelR=box(q,vec2f(gap*0.5,-0.12*h),vec2f(0.045*h,0.11*h));
   if(glow){let ga=(exp(-max(min(panelL,panelR),0.0)*0.14)*0.12)*lockFade;out=vec4f(out.rgb+vec3f(0.15,0.36,0.37)*ga,out.a);}
   let covL=(1.0-smoothstep(-aa,aa,panelL))*lockFade;let covR=(1.0-smoothstep(-aa,aa,panelR))*lockFade;out=over(out,vec4f(0.36,0.70,0.68,covL));out=over(out,vec4f(0.36,0.70,0.68,covR));
 }
 return out;
}`;

  let device,context,pipeline,uniform,bindGroup,raf=0,width=900,height=520,age=0,previous=0,started=false,running=!fixedRequested();
  function fixedRequested(){return verify&&query.has('phase');}
  let fixedAge=fixedRequested()?Math.max(0,Math.min(1,Number(query.get('phase')))):null;
  if(fixedAge!==null&&!Number.isFinite(fixedAge))fixedAge=0;
  if(fixedAge!==null){age=fixedAge;controls.time.value=String(Math.round(age*1000));}
  let startTime=performance.now(),frameId=0,audioContext=null,audioArmed=false,lastCueAge=-1,cues=[],playCycle=1,completedCycles=0,embedLoopTimer=0,embedLoopPendingUntil=0;
  function duration(){return lengths[controls.branch.value]||1200;}
  function mode(){return modes[controls.branch.value]||0;}
  function stateFlags(){return (controls.l1.checked?1:0)+(controls.l2.checked?2:0)+(controls.l3.checked?4:0)+(controls.glow.checked?8:0)+(controls.reduced.checked?16:0);}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(w!==width||h!==height){width=w;height=h;canvas.width=w;canvas.height=h;}}
  function update(){const dpr=width/Math.max(canvas.clientWidth,1),h=Number(controls.height.value)*dpr,flags=stateFlags();device.queue.writeBuffer(uniform,0,new Float32Array([width,height,age,h,mode(),Number(controls.polarity.value),flags,Number(controls.axis.value)*Math.PI/180]));}
  function render(){resize();update();controls.time.value=String(Math.round(age*1000));document.getElementById('timeValue').value=age.toFixed(3);const e=device.createCommandEncoder({label:`EMP local preview ${frameId+1}`}),pass=e.beginRenderPass({colorAttachments:[{view:context.getCurrentTexture().createView(),clearValue:{r:0.086,g:0.108,b:0.12,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(6);pass.end();device.queue.submit([e.finish()]);frameId++;
    window.__empAstraZeroSnapshot=Object.freeze({ready:true,renderer:'WebGPU',frameId,branch:controls.branch.value,age,wallAgeMs:performance.now()-startTime,durationMs:duration(),height:Number(controls.height.value),dpr:width/Math.max(1,canvas.clientWidth),polarity:Number(controls.polarity.value),axisDegrees:Number(controls.axis.value),rate:Number(controls.rate.value)*(controls.acc2.checked?2:1),layerFlags:stateFlags(),verify,submitted:true,running,fixedAge,raf,embed,playCycle,completedCycles,embedLoopPendingUntil,spatialContract:mode()===2||mode()===3?'localized-midpoint-axis-cross-section; no source endpoints':'isolated-proxy-only'});
  }
  function cue(kind){if(verify||!audioArmed||!audioContext)return;const now=audioContext.currentTime,base=kind==='charge'?0.72:kind==='release'?0.28:kind==='resonance'?0.68:kind==='cancel'?0.18:0.10;const rate=Number(controls.rate.value)*(controls.acc2.checked?2:1),seconds=(kind==='charge'?0.7:kind==='release'?0.32:kind==='resonance'?0.52:kind==='cancel'?0.18:0.11)/rate;
    const osc=audioContext.createOscillator(),oscGain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='charge'?110:kind==='release'?82:kind==='resonance'?96:kind==='cancel'?340:620,now);if(kind==='charge')osc.frequency.linearRampToValueAtTime(360,now+seconds);oscGain.gain.setValueAtTime(0.0001,now);oscGain.gain.linearRampToValueAtTime(base,now+0.045/rate);oscGain.gain.setValueAtTime(base,now+seconds*0.56);oscGain.gain.exponentialRampToValueAtTime(0.0001,now+seconds);osc.connect(oscGain);oscGain.connect(audioContext.destination);osc.start(now);osc.stop(now+seconds);
    if(['release','resonance','cancel'].includes(kind)){const buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*seconds*rate),audioContext.sampleRate),data=buffer.getChannelData(0);let seed=0x9e3779b9;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}const src=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),noiseGain=audioContext.createGain();src.buffer=buffer;src.playbackRate.value=rate;filter.type='bandpass';filter.frequency.value=kind==='release'?1250:kind==='resonance'?740:480;filter.Q.value=0.45;noiseGain.gain.setValueAtTime(0.0001,now);noiseGain.gain.linearRampToValueAtTime(base*0.55,now+0.035/rate);noiseGain.gain.exponentialRampToValueAtTime(0.0001,now+seconds);src.connect(filter);filter.connect(noiseGain);noiseGain.connect(audioContext.destination);src.start(now);src.stop(now+seconds);}
    cues.push({kind,age,scheduledAt:now,rate});window.__empAstraZeroAudio=Object.freeze({status:'scheduled',verify:false,cues:cues.slice()});
  }
  function updateAudio(oldAge,newAge){if(!audioArmed||newAge<oldAge||newAge===lastCueAge)return;const branch=controls.branch.value,d=duration(),oldSeconds=oldAge*d/1000,newSeconds=newAge*d/1000;let at=-1;if(branch==='charge'&&oldSeconds<0.02&&newSeconds>=0.02){at=0.02;cue('charge');}if(branch==='release'&&oldSeconds<0.02&&newSeconds>=0.02){at=0.02;cue('release');}if(branch==='resonance'&&oldSeconds<0.04&&newSeconds>=0.04){at=0.04;cue('resonance');}if(branch==='cancel'&&oldSeconds<0.26&&newSeconds>=0.26){at=0.26;cue('cancel');}if(branch==='storage'&&oldSeconds<0.02&&newSeconds>=0.02){at=0.02;cue('storage');}if(at>=0)lastCueAge=at;}
  function tick(now){raf=0;if(fixedAge===null&&running){const dt=Math.min(100,Math.max(0,now-(tick.last||now))),old=age,rate=Number(controls.rate.value)*(controls.acc2.checked?2:1);age=Math.min(1,age+dt*rate/duration());updateAudio(old,age);tick.last=now;if(age>=1){running=false;audioArmed=false;completedCycles++;if(embed){clearTimeout(embedLoopTimer);embedLoopPendingUntil=performance.now()+550;embedLoopTimer=setTimeout(()=>{embedLoopTimer=0;embedLoopPendingUntil=0;playCycle++;age=0;running=true;tick.last=performance.now();redraw();},550);}}}render();if(fixedAge===null&&(running||age<1))raf=requestAnimationFrame(tick);}
  function redraw(){if(!raf)raf=requestAnimationFrame(tick);}
  document.getElementById('restart').onclick=()=>{clearTimeout(embedLoopTimer);embedLoopTimer=0;embedLoopPendingUntil=0;playCycle=1;completedCycles=0;age=0;previous=0;running=true;lastCueAge=-1;cues=[];audioArmed=Boolean(audioContext&&!verify);tick.last=performance.now();startTime=performance.now();redraw();};
  document.getElementById('pause').onclick=e=>{running=!running;e.currentTarget.textContent=running?'一時停止':'再開';tick.last=performance.now();if(audioContext){if(running)void audioContext.resume();else void audioContext.suspend();}if(running)redraw();};
  controls.time.addEventListener('input',()=>{age=Number(controls.time.value)/1000;running=false;redraw();});
  for(const id of ['branch','polarity','axis','height','rate','acc2','reduced','glow','l1','l2','l3'])controls[id].addEventListener('change',()=>{if(id==='branch'){clearTimeout(embedLoopTimer);embedLoopTimer=0;embedLoopPendingUntil=0;playCycle=1;completedCycles=0;age=0;lastCueAge=-1;cues=[];running=fixedAge===null;}redraw();});
  document.getElementById('sound').onclick=async()=>{if(verify){window.__empAstraZeroAudio={status:'suppressed',verify:true,cues:[]};return;}try{const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('Web Audio unavailable');audioContext??=new C();await audioContext.resume();audioArmed=true;lastCueAge=-1;window.__empAstraZeroAudio={status:'armed',verify:false,cues:[]};}catch(e){window.__empAstraZeroAudio={status:'error',error:String(e)};}};
  try{
    if(!navigator.gpu)throw new Error('WebGPU unavailable');const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');device=await adapter.requestDevice();
    device.addEventListener('uncapturederror',e=>{window.__empAstraZeroGpuErrors=(window.__empAstraZeroGpuErrors||[]).concat(String(e.error));});
    context=canvas.getContext('webgpu');if(!context)throw new Error('WebGPU canvas unavailable');const format=navigator.gpu.getPreferredCanvasFormat();context.configure({device,format,alphaMode:'opaque'});
    const module=device.createShaderModule({label:'EMP Astra zero preview shader',code:shader}),info=await module.getCompilationInfo(),errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>m.message).join('\n'));
    uniform=device.createBuffer({label:'EMP preview parameters',size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});pipeline=await device.createRenderPipelineAsync({label:'EMP local preview',layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});resize();render();
    const ai=adapter.info;window.__empAstraZeroGpu={state:'ready',shaderErrors:errors.length,pipeline:'ready',format,adapter:ai?{vendor:ai.vendor,architecture:ai.architecture,device:ai.device}:null};
    status.textContent=verify?'verify: 全音声抑制中。branchと位相の描画を確認できます。':'branch、phase、H64/H100、DPR、層を切り替えてください。合格・本編接続は未実施です。';
    if(fixedAge===null){age=0;running=true;tick.last=performance.now();raf=requestAnimationFrame(tick);}
  }catch(error){window.__empAstraZeroGpu={state:'error',error:String(error)};status.textContent=`WebGPU開始失敗: ${String(error)}`;}
  window.addEventListener('resize',redraw);window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);clearTimeout(embedLoopTimer);try{audioContext?.close();}catch(_){}try{device?.destroy();}catch(_){}});
})();







