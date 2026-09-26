(() => {
  'use strict';
  const canvas = document.querySelector('#preview');
  const status = document.querySelector('#status');
  const verify = new URLSearchParams(location.search).has('verify');
  const DURATION = 1.18;
  const cycleLength = 2.65;
  const shader = `
struct U { size: vec2f, time: f32, pad: f32 };
@group(0) @binding(0) var<uniform> u: U;
struct Out { @builtin(position) pos: vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
 var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var o:Out; o.pos=vec4f(p[i],0.,1.); return o;
}
fn sdEllipse(p:vec2f,c:vec2f,r:vec2f)->f32 {
 let q=(p-c)/r; return (length(q)-1.)*min(r.x,r.y);
}
fn sdSeg(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {
 let v=b-a; let h=clamp(dot(p-a,v)/dot(v,v),0.,1.); return length(p-a-v*h)-r;
}
fn sCurve(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/(b-a),0.,1.); return t*t*(3.-2.*t); }
fn bodyDist(p:vec2f)->f32 {
 let head=sdEllipse(p,vec2f(0.,-.426),vec2f(.071,.085));
 let torso=sdEllipse(p,vec2f(0.,-.205),vec2f(.112,.205));
 let pelvis=sdEllipse(p,vec2f(0.,.012),vec2f(.118,.112));
 let lArm=sdSeg(p,vec2f(-.088,-.352),vec2f(-.23,-.096),.044);
 let rArm=sdSeg(p,vec2f(.088,-.352),vec2f(.23,-.096),.044);
 let lLeg=sdSeg(p,vec2f(-.061,.052),vec2f(-.096,.438),.052);
 let rLeg=sdSeg(p,vec2f(.061,.052),vec2f(.096,.438),.052);
 return min(min(min(head,torso),min(pelvis,lArm)),min(min(rArm,lLeg),rLeg));
}
@fragment fn fs(in:Out)->@location(0) vec4f {
 let px=in.pos.xy; let dpr=u.pad; let H=64.*dpr;
 let center=vec2f(u.size.x*.5,u.size.y*.52);
 let p=vec2f((px.x-center.x)/H, (px.y-center.y)/H);
 // Convert raster-down coordinates into the design's foot-origin, y-up H space.
 let ep=vec2f(p.x,.5-p.y);
 let t=u.time;
 let life=1.-sCurve(1.10,1.18,t);
 let actor=bodyDist(p);
 let body=1.-sCurve(-.012,.015,actor);
 let edge=exp(-abs(actor)/.012);
 let skin=vec3f(.53,.57,.57);
 var col=vec3f(.073,.091,.103);
 // Subtle floor and a neutral, fixed H64 reference tick.
 let floor=1.-sCurve(.003,.009,abs(p.y-.50)); col=mix(col,vec3f(.17,.19,.19),floor*.3);
 let halo=exp(-abs(actor)/.045);
 var l1=vec3f(0.); var l2=vec3f(0.); var localGlow=vec3f(0.);
 // Broad, filled side folds with a shrinking outside edge and a dense inward contact band.
 let fold=sCurve(.10,.34,t)*(1.-sCurve(.38,.48,t));
 let profile=pow(max(0.,sin(3.14159265*clamp((ep.y-.28)/.54,0.,1.))),.70);
 let outer0=.18+.25*profile; let inner0=.13+.045*profile;
 let g=sCurve(.12,.40,t); let outer=mix(outer0,.15+.055*profile,g); let inner=mix(inner0,.08+.035*profile,g);
 let x=abs(p.x); let band=sCurve(inner-.012,inner+.018,x)*(1.-sCurve(outer-.018,outer+.015,x))*profile;
 let ends=sCurve(.28,.34,ep.y)*(1.-sCurve(.79,.85,ep.y));
 let bodyOcclusion=1.-body*.87;
 let contact=exp(-abs(x-(inner+.012))/.025);
 let foldAlpha=band*ends*fold*life*bodyOcclusion;
 l1 += vec3f(.27,.33,.075)*foldAlpha*(.55+.42*profile)+vec3f(.78,.73,.34)*foldAlpha*contact*.52;
 // A connected, broad surface front advances from the waist to shoulders/arms and legs.
 let upper=.55+sCurve(.28,.59,t)*.33;
 let lower=.55-sCurve(.34,.79,t)*.47;
 let topFill=sCurve(.51,.59,ep.y)*(1.-sCurve(upper-.09,upper+.09,ep.y));
 let botFill=sCurve(lower-.09,lower+.09,ep.y)*(1.-sCurve(.51,.59,ep.y));
 let spread=sCurve(.28,.48,t)*(1.-sCurve(1.0,1.12,t));
 let completed=sCurve(.32,.66,t)*(1.-sCurve(.78,1.08,t));
 let valid=body;
 let upPath=min(min(sdSeg(ep,vec2f(0.,.53),vec2f(-.105,.82),0.),sdSeg(ep,vec2f(0.,.53),vec2f(.105,.82),0.)),min(sdSeg(ep,vec2f(-.105,.82),vec2f(-.225,.66),0.),sdSeg(ep,vec2f(.105,.82),vec2f(.225,.66),0.)));
 let leftLeg=sdSeg(ep,vec2f(-.055,.43),vec2f(-.095,.07),0.); let rightLeg=sdSeg(ep,vec2f(.055,.43),vec2f(.095,.07),0.);
 let upMask=exp(-upPath/.115); let downMask=max(exp(-leftLeg/.11),exp(-rightLeg/.11));
 let topFront=exp(-abs(ep.y-upper)/.038)*upMask;
 let bottomFront=exp(-abs(ep.y-lower)/.038)*downMask;
 let broadTop=topFill*upMask; let broadBottom=botFill*downMask;
 let torsoBridge=exp(-abs(p.x)/.115)*sCurve(-.03,.12,t)*(1.-sCurve(.90,1.08,t));
 let fill=valid*(max(broadTop,broadBottom)*.30*spread + (topFront+bottomFront)*.72*spread + completed*.035 + torsoBridge*.10);
 l2 += vec3f(.31,.37,.10)*fill*life;
 let frontCore=valid*(topFront+bottomFront)*.20*spread*life;
 l2 += vec3f(.88,.84,.58)*frontCore;
 // Local observation glow derives only from the emitted surfaces.
 let source=clamp(dot(l1+l2,vec3f(.24,.24,.18)),0.,1.);
 localGlow=vec3f(.72,.78,.38)*halo*source*.075;
 // Actor remains legible above the body-bounded energy field.
 col=mix(col,skin,body*.92);
 // Overlay the body-bounded field after the neutral actor fill so the L2 surface
 // remains visible, while the mask and subsequent face pass preserve the actor.
 col += l1*.90 + l2*(.35+.42*body) + localGlow;
 let silhouetteEdge=edge*.22; col += vec3f(.74,.79,.72)*silhouetteEdge*(1.-body);
 // Small facial plane and garment center seam keep the synthetic H64 actor readable.
 let face=sdEllipse(p,vec2f(0.,-.431),vec2f(.043,.032));
 let faceMask=(1.-sCurve(-.004,.004,face))*body;
 col=mix(col,vec3f(.70,.73,.68),faceMask*.55);
 let seam=exp(-abs(p.x)/.005)*sCurve(-.32,-.30,p.y)*(1.-sCurve(.00,.02,p.y))*body;
 col=mix(col,vec3f(.35,.39,.38),seam*.38);
 let vignette=1.-.13*clamp(length(vec2f(p.x*.6,p.y*.65)),0.,1.);
 return vec4f(col*vignette,1.);
}`;
  let device, pipeline, uniform, context, format, audioContext=null, audioUnlocked=false;
  let start=performance.now(), paused=false, pauseAt=0, totalPause=0, lastCycle=-1, raf=0;
  let ready=false, readbackPending=false, readbackDone=false, snapshot={ready:false,phaseSeconds:0,logicalHeight:64,width:0,height:0,dpr:1,verify,audioMuted:verify};
  window.__staminaV2Snapshot=()=>({...snapshot,canvasWidth:canvas.width,canvasHeight:canvas.height,paused});
  const statusText = verify ? 'verify: 音声は強制無音。1.18 actor秒を自動反復中。' : '1.18 actor秒を自動反復中。音声はボタン操作後に開始します。';
  async function init(){
    if(!navigator.gpu) throw new Error('このブラウザーはWebGPUに対応していません');
    const adapter=await navigator.gpu.requestAdapter(); if(!adapter) throw new Error('WebGPU adapter unavailable');
    device=await adapter.requestDevice();
    device.addEventListener('uncapturederror',e=>{snapshot={...snapshot,uncapturedGpuError:e.error?.message||String(e.error)};});
    device.lost.then(info=>{snapshot={...snapshot,deviceLost:true,deviceLostReason:info.reason,deviceLostMessage:info.message};});
    context=canvas.getContext('webgpu'); format=navigator.gpu.getPreferredCanvasFormat();
    const module=device.createShaderModule({code:shader});
    const compilation=await module.getCompilationInfo();
    const shaderErrors=compilation.messages.filter(m=>m.type==='error');
    if(shaderErrors.length)throw new Error('WGSL compile: '+shaderErrors.map(m=>`${m.lineNum}:${m.linePos} ${m.message}`).join(' | '));
    pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
    uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    context.configure({device,format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}); ready=true; status.textContent=statusText; raf=requestAnimationFrame(draw);
  }
  function draw(now){
    raf=requestAnimationFrame(draw); if(paused)return;
    const dpr=Math.min(devicePixelRatio||1,2), w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;context.configure({device,format,alphaMode:'opaque',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}
    const elapsed=(now-start-totalPause)/1000, cycle=Math.floor(elapsed/cycleLength), phase=(elapsed%cycleLength);
    const effectTime=phase<DURATION?phase:2;
    snapshot={ready,phaseSeconds:effectTime,cycleIndex:cycle,logicalHeight:64,width:canvas.clientWidth,height:canvas.clientHeight,dpr,verify,audioMuted:verify||!audioUnlocked,syntheticActorMask:true};
    const data=new Float32Array([w,h,effectTime,dpr]); device.queue.writeBuffer(uniform,0,data);
    const enc=device.createCommandEncoder(); const texture=context.getCurrentTexture(); const pass=enc.beginRenderPass({colorAttachments:[{view:texture.createView(),clearValue:{r:.07,g:.09,b:.10,a:1},loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(pipeline); pass.setBindGroup(0,device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]})); pass.draw(3); pass.end();
    let pixelBuffer=null, pitch=0;
    if(!readbackDone&&!readbackPending&&phase>.40&&phase<.65){readbackPending=true;pitch=Math.ceil(w*4/256)*256;pixelBuffer=device.createBuffer({size:pitch*h,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});enc.copyTextureToBuffer({texture},{buffer:pixelBuffer,bytesPerRow:pitch,rowsPerImage:h},{width:w,height:h});}
    device.queue.submit([enc.finish()]);
    if(pixelBuffer){pixelBuffer.mapAsync(GPUMapMode.READ).then(()=>{const bytes=new Uint8Array(pixelBuffer.getMappedRange()),at=(x,y)=>{const i=y*pitch+x*4;return [...bytes.slice(i,i+3)];};let nonBlack=0;for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){const i=y*pitch+x*4;if(bytes[i]+bytes[i+1]+bytes[i+2]>36)nonBlack++;}snapshot={...snapshot,readback:{center:at(Math.floor(w/2),Math.floor(h/2)),nonBlackSampleRatio:nonBlack/Math.ceil(w/4)/Math.ceil(h/4)}};pixelBuffer.unmap();pixelBuffer.destroy();readbackDone=true;}).catch(e=>{snapshot={...snapshot,readbackError:e.message};readbackDone=true;});}
    if(cycle!==lastCycle){lastCycle=cycle; if(audioUnlocked&&!verify) startSound();}
  }
  function startSound(){
    if(!audioContext||verify)return;
    const ctx=audioContext, t=ctx.currentTime, master=ctx.createGain(); master.gain.setValueAtTime(.13,t); master.connect(ctx.destination);
    // Soft filtered intake: a short, non-voiced band-noise swell, 20–260 ms.
    const n=Math.floor(ctx.sampleRate*.30), buf=ctx.createBuffer(1,n,ctx.sampleRate), ch=buf.getChannelData(0);
    for(let i=0;i<n;i++) ch[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/n);
    const noise=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), ng=ctx.createGain(); noise.buffer=buf; filter.type='bandpass'; filter.frequency.value=520; filter.Q.value=.55; ng.gain.setValueAtTime(.0001,t+.02); ng.gain.exponentialRampToValueAtTime(.40,t+.15); ng.gain.exponentialRampToValueAtTime(.0001,t+.29); noise.connect(filter).connect(ng).connect(master); noise.start(t+.02);
    // Rounded 210 Hz impact with subdued second and third harmonics at the transfer.
    for(const [hz,amp] of [[210,.22],[420,.055],[630,.022]]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t+.30);g.gain.exponentialRampToValueAtTime(amp,t+.325);g.gain.exponentialRampToValueAtTime(.0001,t+.78);o.connect(g).connect(master);o.start(t+.30);o.stop(t+.82);}
    const overtone=ctx.createOscillator(),og=ctx.createGain();overtone.type='sine';overtone.frequency.setValueAtTime(420,t+.48);overtone.frequency.exponentialRampToValueAtTime(690,t+.74);og.gain.setValueAtTime(.0001,t+.47);og.gain.exponentialRampToValueAtTime(.026,t+.55);og.gain.exponentialRampToValueAtTime(.0001,t+.86);overtone.connect(og).connect(master);overtone.start(t+.47);overtone.stop(t+.88);
  }
  document.querySelector('#pause').addEventListener('click',e=>{paused=!paused;if(paused)pauseAt=performance.now();else totalPause+=performance.now()-pauseAt;e.currentTarget.textContent=paused?'再開':'一時停止';});
  document.querySelector('#sound').addEventListener('click',async()=>{if(verify){status.textContent='verify URLのため音声は常に無音です。';return;}try{audioContext??=new AudioContext();await audioContext.resume();audioUnlocked=true;status.textContent='通常再生: 吸い込み→210 Hzの丸い胴鳴り→短い上行。再生ごとに一回。';}catch(e){status.textContent='音声を開始できません: '+e.message;}});
  init().catch(e=>{console.error(e);status.textContent='WebGPU error: '+e.message;});
})();
