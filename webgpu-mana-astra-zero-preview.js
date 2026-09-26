(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const verify = params.has('verify');
  const freezePhase = verify && params.get('freeze') === '1';
  const canvas = document.getElementById('mana');
  const status = document.getElementById('status');
  const heightSelect = document.getElementById('height');
  const dprSelect = document.getElementById('dpr');
  const motionSelect = document.getElementById('motion');
  const rateSelect = document.getElementById('rate');
  const actor = Object.freeze({ id: 'mana-preview-recipient', x: 490, y: 389 });
  const W = 980, H = 620, LIFE = 1.30, GAP = 0.72;
  const crop = Object.freeze([0, 0, 256, 256]);
  const sourceSize = Object.freeze([768, 512]);
  const imagePath = 'assets/generated/sophia-front-five-v753.png';
  const image = new Image();
  image.src = imagePath;
  let renderer, target, actorTexture, pass, raf = 0, startWall = 0, phaseOrigin = 0;
  let phase = 0, rate = 1, actorHeight = 64, dpr = 1, reduced = false;
  let frameNumber = 0, audioContext = null, master = null, audioEnabled = false;
  let audioSerial = 0, lastCycle = -1, destroyed = false;
  const sampleTargets = [0,0.05,0.12,0.163,0.18,0.197,0.28,0.50,0.65,0.72,
    0.763,0.78,0.797,0.88,0.923,0.94,0.957,1.00,1.063,1.08,1.097,
    1.16,1.28,1.30,1.36];
  const sampled = new Set();
  let previousSubmittedCycle = -1, previousSubmittedWithin = 0, maxFrameActorGap = 0;
  const intro = Math.max(0, Math.min(1.36, Number(params.get('phase')) || 0));

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const shader = /* wgsl */ `
struct Params {
  rect: vec4f,    // physical target x,y,width,height
  view: vec4f,    // physical target width,height, actor seconds, render layer
  state: vec4f,   // reduced motion, actor display height, actor x, actor y
  reserved: vec4f,
};
@group(0) @binding(0) var<uniform> u: Params;
struct VOut { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) index: u32) -> VOut {
  let c = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let q = c[index]; let px = u.rect.xy + q * u.rect.zw;
  var o: VOut; o.position = vec4f(px.x/u.view.x*2.0-1.0,1.0-px.y/u.view.y*2.0,0,1); o.uv=q; return o;
}
fn ss(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/max(b-a,0.0001),0.0,1.0); return t*t*(3.0-2.0*t); }
fn ellipse(p:vec2f,c:vec2f,r:vec2f)->f32 { return length((p-c)/r); }
fn premul(c:vec3f,a:f32,e:f32)->vec4f { let aa=clamp(a,0.0,0.95); return vec4f(c*(aa+max(e,0.0)),aa); }
@fragment fn fs(i:VOut)->@location(0) vec4f {
  let p=(i.uv-vec2f(0.5))*2.0;
  let t=u.view.z; let layer=u.view.w; let reduced=u.state.x>0.5;
  let arrival=ss(0.0,0.18,t);
  let transfer=ss(0.18,0.94,t);
  let settled=ss(0.78,1.08,t);
  let endFade=1.0-ss(1.08,1.30,t);
  let simplify=select(1.0,0.82,reduced);
  let remaining=(1.0-transfer)*arrival;
  let accepted=transfer;
  let seam=-0.35;
  var out=vec4f(0.0);
  if (layer<0.5) {
    // M1: one broad, asymmetric finite sheet approaching the actor-side chest boundary.
    let tail=mix(-0.99,seam-0.02,transfer);
    let sheetRegion=ss(-1.02, -0.90, p.x)*(1.0-ss(seam-0.20,seam+0.02,p.x))*
      ss(tail-0.025,tail+0.045,p.x)*arrival;
    let along=clamp((p.x-tail)/max(seam-tail,0.0001),0.0,1.0);
    let center=0.18*p.x+0.105*sin((p.x+1.0)*2.0)+0.035;
    let half=mix(0.16,0.49,smoothstep(0.0,1.0,along))*simplify;
    let edge=1.0-ss(half-0.055,half+0.035,abs(p.y-center));
    let lower=ss(-0.18,0.13,p.y-center);
    let tongue=sheetRegion*edge*(0.70+0.30*lower)*remaining;
    let leading=exp(-pow((p.x-seam)/0.12,2.0))*edge*arrival*(1.0-ss(0.91,0.97,t));
    out=premul(vec3f(0.105,0.155,0.68),tongue*0.54, tongue*0.075);
    out=vec4f(out.rgb+vec3f(0.10,0.14,0.42)*leading*0.16,out.a+leading*0.10);
  } else {
    // M2: a local folded entrance, same material coordinate as the arriving sheet.
    let entry=exp(-pow((p.x-seam)/0.16,2.0))*exp(-pow((p.y-(0.035+0.12*seam))/0.48,4.0));
    let crease=exp(-pow((p.x-(seam+0.05+0.018*sin(t*2.0)))/0.045,2.0))*entry;
    let entryOn=arrival*(1.0-ss(0.88,0.96,t));
    let m2=premul(vec3f(0.50,0.61,1.0),entry*entryOn*0.30,entry*entryOn*0.045);
    out=vec4f(out.rgb+m2.rgb,out.a+m2.a);
    let core=premul(vec3f(0.91,0.945,1.0),crease*entryOn*0.52,crease*entryOn*0.48);
    out=vec4f(out.rgb+core.rgb,out.a+core.a);

    // M3: widening upper/back and lower/front receiving folds with an open axial slit.
    let spread=(0.22+0.78*accepted)*simplify;
    let settle=0.60+0.40*settled;
    let upper=ellipse(p,vec2f(0.10,-0.23),vec2f(0.20*spread,0.50*spread));
    let lowerLobe=ellipse(p,vec2f(-0.055,0.27),vec2f(0.18*spread,0.50*spread));
    let upperMask=(1.0-ss(0.76,1.10,upper))*accepted*endFade;
    let lowerMask=(1.0-ss(0.78,1.12,lowerLobe))*accepted*endFade;
    let axis=abs(p.y-(0.035-0.16*p.x));
    let slit=ss(0.12,0.16,axis);
    let upperFace=upperMask*slit*(0.72+0.12*ss(0.2,0.8,p.x))*settle;
    let lowerFace=lowerMask*slit*(0.64+0.16*ss(-0.2,0.4,p.y))*settle;
    let far=premul(vec3f(0.29,0.37,0.84),upperFace*0.43,upperFace*0.06);
    out=vec4f(out.rgb+far.rgb,out.a+far.a);
    let near=premul(vec3f(0.53,0.61,0.94),lowerFace*0.49,lowerFace*0.08);
    out=vec4f(out.rgb+near.rgb,out.a+near.a);
    // A restrained local radiance fringe follows the colored area and dies with it.
    let fringe=max(0.0,(1.0-ss(1.05,1.30,min(upper,lowerLobe+0.14))))*
      max(upperFace,lowerFace)*0.13;
    out=vec4f(out.rgb+vec3f(0.13,0.18,0.48)*fringe,out.a);
  }
  return out;
}`;

  function fail(error) {
    status.dataset.error = '1';
    status.textContent = `WebGPUを開始できません: ${error?.message || error}`;
    console.error('[mana-preview]', error);
  }

  function createPass() {
    const device = renderer.device;
    const module = device.createShaderModule({ label: 'Mana gain zero-design preview', code: shader });
    const layout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: 3,
      buffer: { type: 'uniform' } }] });
    const pipeline = device.createRenderPipeline({ label: 'Mana gain transfer sheet',
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{
        format: renderer.format,
        blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } }
      }] }, primitive: { topology: 'triangle-list' } });
    const ready = module.getCompilationInfo ? module.getCompilationInfo().then(info => {
      const errors = info.messages.filter(m => m.type === 'error');
      if (errors.length) throw new Error(errors.map(m => m.message).join('\n'));
      return info.messages.filter(m => m.type === 'warning').map(m => m.message);
    }) : Promise.resolve([]);
    const slots = new Map();
    const resource = Object.freeze({ async warnings() { return ready; },
      draw({ frame, targetId, rect, viewport, seconds, layer }) {
        const key = String(layer);
        let slot = slots.get(key);
        if (!slot) {
          const buffer = renderer.own(device.createBuffer({ label: `Mana preview uniform ${key}`,
            size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
          const bind = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer } }] });
          slot = { buffer, bind }; slots.set(key, slot);
        }
        const sx = viewport.pixelWidth / viewport.width, sy = viewport.pixelHeight / viewport.height;
        const values = new Float32Array(16);
        values.set([rect.x*sx, rect.y*sy, rect.width*sx, rect.height*sy],0);
        values.set([viewport.pixelWidth,viewport.pixelHeight,seconds,layer],4);
        values.set([reduced?1:0,actorHeight,actor.x,actor.y],8);
        device.queue.writeBuffer(slot.buffer,0,values);
        const sxLeft=Math.max(0,Math.floor(rect.x*sx)),syTop=Math.max(0,Math.floor(rect.y*sy));
        const sxRight=Math.min(viewport.pixelWidth,Math.ceil((rect.x+rect.width)*sx));
        const syBottom=Math.min(viewport.pixelHeight,Math.ceil((rect.y+rect.height)*sy));
        if(sxRight<=sxLeft||syBottom<=syTop) throw new Error('Mana preview has no visible GPU footprint');
        frame.add({ target: targetId, label: `Mana preview layer ${layer}`,
          encode(passEncoder, info) {
            if (info.device!==device || info.format!==renderer.format) throw new Error('Mana preview GPU target mismatch');
            passEncoder.setScissorRect(sxLeft,syTop,sxRight-sxLeft,syBottom-syTop);
            passEncoder.setPipeline(pipeline); passEncoder.setBindGroup(0,slot.bind);
            passEncoder.draw(6);
          } });
      }, destroy() { for (const item of slots.values()) { renderer.release(item.buffer); item.buffer.destroy(); } slots.clear(); }
    });
    return resource;
  }

  function effectRect(layer) {
    const torsoY = actor.y - actorHeight * 0.48;
    return { x: actor.x - actorHeight*0.46, y: torsoY - actorHeight*0.18,
      width: actorHeight*0.92, height: actorHeight*0.36, layer };
  }

  function drawActor(frame) {
    const rect = { x: actor.x-actorHeight/2, y: actor.y-actorHeight,
      w: actorHeight, h: actorHeight };
    frame.sprite('mana-preview', { ...rect, texture: actorTexture, crop, sourceSize,
      color:[1,1,1,1], mode:'source-over' });
    return rect;
  }

  function render(now) {
    if (destroyed || renderer?.state!=='ready') return;
    phase = freezePhase ? intro : Math.max(0,(now-phaseOrigin)*rate/1000);
    const cycleLength=LIFE+GAP, cycle=Math.floor(phase/cycleLength), within=phase-cycle*cycleLength;
    const seconds=Math.min(within,LIFE+0.06);
    const logicalW=W,logicalH=H;
    const pixelW=Math.round(logicalW*dpr),pixelH=Math.round(logicalH*dpr);
    target.resize(pixelW,pixelH,{width:logicalW,height:logicalH});
    const viewport={width:logicalW,height:logicalH,pixelWidth:pixelW,pixelHeight:pixelH};
      const frame=renderer.beginFrame(`Mana preview ${++frameNumber}`);
    const submitStart=performance.now();
    try {
      frame.clear('mana-preview',[0.027,0.043,0.075,1]);
      const rect=effectRect();
      pass.draw({frame,targetId:'mana-preview',rect,viewport,seconds,layer:0});
      const actorRect=drawActor(frame);
      pass.draw({frame,targetId:'mana-preview',rect,viewport,seconds,layer:1});
      frame.submit();
      if(cycle===previousSubmittedCycle) maxFrameActorGap=Math.max(maxFrameActorGap,within-previousSubmittedWithin);
      previousSubmittedCycle=cycle; previousSubmittedWithin=within;
      const submitCpuMs=performance.now()-submitStart;
      for (const requested of sampleTargets) {
        if (!sampled.has(requested) && within>=requested && within-requested<=0.055) {
          sampled.add(requested);
          window.__manaPreviewSamples ||= [];
          window.__manaPreviewSamples.push(Object.freeze({requestedActorSeconds:requested,
            actualActorSeconds:within,actorCycle:cycle,wallSeconds:Math.max(0,(now-startWall)/1000),frameNumber,submitCpuMs,
            renderer:'webgpu',drawSubmitted:true}));
        }
      }
      if (cycle!==lastCycle) {
        lastCycle=cycle;
        if (!verify && audioEnabled && cycle>0) playSfx();
      }
      window.__manaAstraZeroPreview=Object.freeze({ready:true,frameNumber,wallMs:now-startWall,
        actorSeconds:within,seconds,cycle,lifeSeconds:LIFE,rate,actorHeight,dpr,reduced,verify,
        renderer:'webgpu',context:'webgpu',targetWidth:pixelW,targetHeight:pixelH,
        actorRect,effectRect:rect,submitCpuMs,samples:window.__manaPreviewSamples||[],
        shaderCompileState:window.__manaShaderCompileState||'pending',
        maxFrameActorGap,
        drawOrder:['M1-under-actor','actor','M2-M3-over-actor'],
        shaderWarnings:window.__manaShaderWarnings||[],audioEnabled:audioEnabled&&!verify});
      status.dataset.error='0';
      status.textContent=`WebGPU ready · H${actorHeight} · DPR${dpr} · ${reduced?'reduced':'normal'} · ${rate===2?'ACC2':'normal rate'} · τ ${seconds.toFixed(2)}s · frame ${frameNumber}`;
    } catch(error) {
      try { frame.discard(); } catch (_) {}
      fail(error);
    }
    raf=requestAnimationFrame(render);
  }

  function configureFromQuery() {
    const set=(select,key,allowed,defaultValue)=>{
      const value=params.get(key); select.value=allowed.includes(value)?value:defaultValue;
    };
    set(heightSelect,'height',['64','100'],'64');
    set(dprSelect,'dpr',['1','2'],'1');
    set(motionSelect,'reduced',['0','1'],'0');
    set(rateSelect,'rate',['1','2'],'1');
    if (verify) document.getElementById('sound').hidden=true;
    applySettings();
  }
  function applySettings() {
    actorHeight=Number(heightSelect.value); dpr=Number(dprSelect.value);
    reduced=motionSelect.value==='1'; rate=Number(rateSelect.value);
    canvas.style.width='100%'; canvas.style.height='100%';
    phaseOrigin=performance.now()-intro*1000/rate;
    if (renderer && target) {
      target.resize(Math.round(W*dpr),Math.round(H*dpr),{width:W,height:H});
    }
  }
  function restart() { phaseOrigin=performance.now()-intro*1000/rate; lastCycle=-1; }

  async function playSfx() {
    if (verify || !audioEnabled) return;
    try {
      if (!audioContext) {
        const C=window.AudioContext||window.webkitAudioContext;
        if (!C) throw new Error('Web Audio unavailable');
        audioContext=new C(); master=audioContext.createGain(); master.gain.value=0.23; master.connect(audioContext.destination);
      }
      if (audioContext.state==='suspended') await audioContext.resume();
      const now=audioContext.currentTime, duration=1.22/rate;
      const osc=audioContext.createOscillator(), gain=audioContext.createGain();
      const pan=audioContext.createStereoPanner?.();
      osc.type='sine'; osc.frequency.setValueAtTime(330,now);
      const partial=audioContext.createOscillator(), partialGain=audioContext.createGain();
      partial.type='sine'; partial.frequency.setValueAtTime(663,now); partialGain.gain.value=0.045;
      gain.gain.setValueAtTime(0.0001,now); gain.gain.exponentialRampToValueAtTime(0.22,now+0.11/rate);
      gain.gain.setTargetAtTime(0.105,now+0.24/rate,0.20/rate);
      gain.gain.setTargetAtTime(0.0001,now+0.84/rate,0.11/rate);
      osc.connect(gain); partial.connect(partialGain); partialGain.connect(gain);
      const noiseBuffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate);
      const noiseData=noiseBuffer.getChannelData(0);
      for(let i=0;i<noiseData.length;i++) noiseData[i]=(Math.random()*2-1)*0.22;
      const noise=audioContext.createBufferSource(), air=audioContext.createBiquadFilter(), airGain=audioContext.createGain();
      noise.buffer=noiseBuffer; air.type='bandpass'; air.frequency.setValueAtTime(900,now); air.Q.value=0.72;
      airGain.gain.setValueAtTime(0.0001,now); airGain.gain.exponentialRampToValueAtTime(0.055,now+0.12/rate);
      airGain.gain.setTargetAtTime(0.0001,now+0.70/rate,0.14/rate);
      noise.connect(air); air.connect(airGain); airGain.connect(gain);
      if (pan) { pan.pan.value=0; gain.connect(pan); pan.connect(master); } else gain.connect(master);
      const id=++audioSerial; osc.start(now); partial.start(now);
      noise.start(now); osc.stop(now+duration+0.05); partial.stop(now+duration+0.05); noise.stop(now+duration+0.05);
      setTimeout(()=>{ try { osc.disconnect();partial.disconnect();noise.disconnect();air.disconnect();airGain.disconnect();gain.disconnect();partialGain.disconnect();pan?.disconnect(); } catch (_) {} },Math.ceil((duration+0.12)*1000));
      return id;
    } catch(error) { fail(error); }
  }

  async function boot() {
    status.textContent='Initializing WebGPU preview…';
    configureFromQuery();
    if (!navigator.gpu) throw new Error('WebGPU unavailable; no fallback renderer is provided');
    status.textContent='Loading the registered actor image…';
    if (!image.complete) await new Promise((resolve,reject)=>{ image.onload=resolve; image.onerror=()=>reject(new Error('Preview actor image failed to load')); });
    status.textContent='Requesting a WebGPU device…';
    renderer=await window.DvaWebGPURenderer.create({gpu:navigator.gpu,powerPreference:'high-performance',
      onFailure:error=>fail(error)});
    window.__manaRendererState=()=>renderer?.state;
    status.textContent='Preparing the GPU target…';
    const backing={width:Math.round(W*dpr),height:Math.round(H*dpr)};
    target=renderer.registerTarget('mana-preview',canvas,{...backing,logicalWidth:W,logicalHeight:H});
    actorTexture=renderer.device.createTexture({label:'Preview actor image',size:[768,512],format:'rgba8unorm',
      usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
    renderer.device.queue.copyExternalImageToTexture({source:image},{texture:actorTexture},{width:768,height:512});
    renderer.own(actorTexture);
    pass=createPass();
    status.textContent='Compiling the Mana transfer shader…';
    window.__manaShaderWarnings=[];
    window.__manaShaderCompileState='pending';
    void pass.warnings().then(warnings=>{
      window.__manaShaderWarnings=warnings;
      window.__manaShaderCompileState='ready';
    }).catch(error=>{
      window.__manaShaderCompileState='failed';
      fail(error);
    });
    startWall=performance.now(); phaseOrigin=startWall-intro*1000/rate;
    document.getElementById('controls').addEventListener('change',applySettings);
    document.getElementById('restart').addEventListener('click',restart);
    document.getElementById('sound').addEventListener('click',async()=>{audioEnabled=true;restart();await playSfx();document.getElementById('sound').textContent='音を有効にしました';});
    window.addEventListener('pagehide',()=>{destroyed=true;cancelAnimationFrame(raf);try{pass?.destroy();renderer?.destroy();}catch(_){}},{once:true});
    raf=requestAnimationFrame(render);
  }
  void boot().catch(fail);
})();
