(function(){
  'use strict';
  const qs=new URLSearchParams(location.search), verify=qs.has('verify'), embed=qs.get('embed')==='1';
  const canvas=document.querySelector('#barrier'),status=document.querySelector('#status');
  const ui={event:document.querySelector('#event'),height:document.querySelector('#height'),dpr:document.querySelector('#dpr'),
    reduced:document.querySelector('#reduced'),rate:document.querySelector('#rate'),q:document.querySelector('#q'),sound:document.querySelector('#sound')};
  const W=980,H=620, actorX=490, actorFoot=389;
  const eventIds={grant:0,hit:1,break:2,bust:3}, eventLabels=['grant','hit','durability-broken','timed-bust-break'];
  const actorImage=new Image(); actorImage.src='assets/generated/sophia-front-five-v753.png';
  let renderer,display,scene,glow,sceneTexture,glowTexture,actorTexture,pass,raf=0,frameNo=0,start=0,phase=0;
  let height=64,dpr=1,rate=1,reduced=false,q=.78,eventKind='grant',freeze=qs.get('freeze')==='1';
  let audioContext=null,audioMaster=null,audioEnabled=false,audioCount=0,destroyed=false,lastEventSerial=0;
  const sampleMarks=[0,.078,.195,.325,.4875,.6175,.65,.72];
  const samples=[];
  const embedSequence=[{branch:'grant',event:'grant',duration:.65},{branch:'persist',event:'grant',duration:1.10},
    {branch:'hit',event:'hit',duration:.65},{branch:'durability-break',event:'break',duration:.48},
    {branch:'bust-break',event:'bust',duration:.48}];
  const embedCycle=embedSequence.reduce((sum,step)=>sum+step.duration,0);
  let lastEmbedToken='',embedCycleIndex=0,embedBranch='';

  const shader=`
struct P { view:vec4f, state:vec4f, actor:vec4f, misc:vec4f };
@group(0) @binding(0) var<uniform> u:P;
struct V { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) n:u32)->V {
 let a=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 let t=a[n];let px=t*u.view.xy;var o:V;o.pos=vec4f(px.x/u.view.x*2.0-1.0,1.0-px.y/u.view.y*2.0,0,1);o.uv=t;return o;
}
fn ss(a:f32,b:f32,x:f32)->f32{let t=clamp((x-a)/max(.0001,b-a),0.0,1.0);return t*t*(3.0-2.0*t);}
fn ell(p:vec2f,c:vec2f,r:vec2f)->f32{return length((p-c)/r);}
fn segDist(p:vec2f,a:vec2f,b:vec2f)->f32{let ab=b-a;let h=clamp(dot(p-a,ab)/dot(ab,ab),0.0,1.0);return length(p-(a+h*ab));}
fn colorSurface(rgb:vec3f,cov:f32,emit:f32)->vec4f{let a=clamp(cov,0.0,.84);return vec4f(rgb*a+rgb*max(emit,0.0),a);}
@fragment fn fs(i:V)->@location(0) vec4f {
 let px=i.uv*u.view.xy;let H=max(1.0,u.actor.z);let t=u.view.z;let layer=u.view.w;
 let kind=u.state.x;let q=clamp(u.state.y,0.0,1.0);let rm=u.state.z>.5;let initial=u.state.w;
 let cx=u.actor.x;let foot=u.actor.y;let tau=clamp(t,0.0,1.30);
 let grant=kind<.5;let hit=kind>.5&&kind<1.5;let broken=kind>1.5&&kind<2.5;let bust=kind>2.5;
 let D=select(.65,.48,broken||bust);let p0=vec2f((px.x-cx)/H,(foot-px.y)/H);
 let pulse=select(0.0, (1.0-ss(.12,.30,tau))*(1.0-ss(.39,.50,tau)),hit||broken);
 let createBack=ss(0.0,.16*D,tau);let createSides=ss(.10*D,.46*D,tau);let createJoint=ss(.36*D,.70*D,tau);
 let dissolveStart=select(.50,.0,bust);let dissolve=ss(dissolveStart*D,.84*D,tau);
 let remnant=1.0-ss(.84*D,D,tau);
 var life=1.0;
 if(grant){life=1.0;}else if(hit){life=1.0;}else{life=1.0-dissolve+remnant*.22;}
 var x=p0.x;var y=p0.y;
 // One shallow, broad compression deforms the same three surfaces together.
 x=x*(1.0+pulse*select(.055,.025,rm));
 y=y-pulse*max(0.0,1.0-abs(p0.x)/.48)*select(.040,.012,rm);
 // q changes the front overlap's depth and bow; it does not cut holes or shrink coverage.
 let depth=mix(.035,.120,q);let bow=mix(.018,.075,q);
 let dome=ell(vec2f(x,y),vec2f(0.0,.615),vec2f(.445,.655));
 let topBottom=ss(-.055,.025,y)*(1.0-ss(1.245,1.285,y));
 let backMask=(1.0-ss(.955,1.015,dome))*topBottom*createBack*life;
 let curveL=x-(-.285-.065*(y-.60)+bow*.28);let curveR=x-(.285+.050*(y-.60)-bow*.18);
 let leftD=ell(vec2f(curveL,y),vec2f(0.0,.615),vec2f(.225,.625));
 let rightD=ell(vec2f(curveR,y),vec2f(0.0,.615),vec2f(.215,.625));
 let sideRange=ss(-.035,.025,y)*(1.0-ss(1.245,1.285,y));
 let flankL=(1.0-ss(.92,1.03,leftD))*sideRange*createSides*life;
 let flankR=(1.0-ss(.92,1.03,rightD))*sideRange*createSides*life;
 let sideCoverage=max(flankL,flankR);
 // Wide folded joint from shoulder toward the opposite abdomen; its width reads as a face.
 let a=vec2f(-.205,.965-depth*.20);let b=vec2f(.235,.285-depth);
 let along=clamp(dot(vec2f(x,y)-a,b-a)/dot(b-a,b-a),0.0,1.0);
 let jointDist=segDist(vec2f(x,y),a,b);
 let jointWidth=mix(.155,.178,q)*mix(1.0,.84,along);
 let joint= (1.0-ss(jointWidth-.014,jointWidth+.012,jointDist))*createJoint*life;
 let compressionGlow=pulse*exp(-pow(jointDist/max(jointWidth,.001),2.0))*select(.42,.14,rm);
 let layerBack=layer<.5;let layerFront=layer>=.5&&layer<1.5;let layerEmission=layer>=1.5;
 if(layerBack){
   let rear=colorSurface(vec3f(.31,.34,.66),backMask*.115,backMask*.018);
   let bevel=max(0.0,backMask*(1.0-ss(.82,.97,dome)))*.18;
   let edge=colorSurface(vec3f(.46,.46,.76),bevel,.0);
   return rear+edge;
 }
 if(layerFront){
   let flank=colorSurface(vec3f(.40,.43,.77),sideCoverage*.255,sideCoverage*.035);
   let jointBase=colorSurface(vec3f(.61,.56,.86),joint*.56,joint*.105);
   let whiteCore=colorSurface(vec3f(.91,.92,1.0),compressionGlow*.48,compressionGlow*.30);
   return flank+jointBase+whiteCore;
 }
 if(layerEmission){
   // OBS is a separate GPU target, fed only by PH1's authored radiance cues.
   let rearGlow=backMask*.025*exp(-pow(max(0.0,dome-.72)*2.0,2.0));
   let sideGlow=sideCoverage*.052;
   let jointGlow=joint*.12+compressionGlow*.30;
   let wideJoint=exp(-pow(jointDist/(jointWidth+.075),2.0))*createJoint*life*.040;
   let e=rearGlow+sideGlow+jointGlow+wideJoint;
   return vec4f(vec3f(.36,.39,.82)*e,e);
 }
 return vec4f(0.0);
}`;

  function err(e){status.dataset.error='1';status.textContent=`WebGPU開始失敗: ${e?.message||e}`;console.error('[barrier-preview]',e);}
  function makeTargetTextures(){
    const w=W*dpr,h=H*dpr,usage=GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING;
    sceneTexture=renderer.device.createTexture({label:'Barrier PH1 scene',size:[w,h],format:renderer.format,usage});
    glowTexture=renderer.device.createTexture({label:'Barrier OBS1 radiance',size:[w,h],format:renderer.format,usage});
    scene=renderer.registerTextureTarget('barrier-scene',sceneTexture,{width:w,height:h,logicalWidth:W,logicalHeight:H});
    glow=renderer.registerTextureTarget('barrier-glow',glowTexture,{width:w,height:h,logicalWidth:W,logicalHeight:H});
  }
  function destroyTargetTextures(){
    scene?.unregister();glow?.unregister();sceneTexture?.destroy();glowTexture?.destroy();scene=glow=sceneTexture=glowTexture=null;
  }
  function makePass(){
    const device=renderer.device,module=device.createShaderModule({label:'Barrier layered surface and radiance',code:shader});
    const layout=device.createBindGroupLayout({entries:[{binding:0,visibility:3,buffer:{type:'uniform'}}]});
    const pipeline=device.createRenderPipeline({label:'Barrier PH1 surfaces / OBS1 radiance',layout:device.createPipelineLayout({bindGroupLayouts:[layout]}),
      vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:renderer.format,
        blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
    const compile=module.getCompilationInfo().then(info=>{const errors=info.messages.filter(x=>x.type==='error');if(errors.length)throw Error(errors.map(x=>x.message).join('\n'));return info.messages.filter(x=>x.type==='warning').map(x=>x.message);});
    const slots=new Map();
    return {compile,draw({frame,targetId,layer,time}){
      const key=`${targetId}:${layer}`;let slot=slots.get(key);
      if(!slot){const buffer=renderer.own(device.createBuffer({label:`Barrier params ${key}`,size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));
        slot={buffer,bind:device.createBindGroup({layout,entries:[{binding:0,resource:{buffer}}]})};slots.set(key,slot);}
      const vals=new Float32Array(16);vals.set([W*dpr,H*dpr,time,layer],0);
      vals.set([eventIds[eventKind],q,reduced?1:0,0],4);vals.set([actorX*dpr,actorFoot*dpr,height*dpr,0],8);vals.set([0,0,0,0],12);device.queue.writeBuffer(slot.buffer,0,vals);
      frame.add({target:targetId,label:`Barrier ${eventLabels[eventIds[eventKind]]} layer ${layer}`,
        encode(pass,info){if(info.device!==device||info.format!==renderer.format)throw Error('Barrier GPU target mismatch');
          pass.setScissorRect(0,0,W*dpr,H*dpr);pass.setPipeline(pipeline);pass.setBindGroup(0,slot.bind);pass.draw(6);}});
    },destroy(){for(const s of slots.values()){renderer.release(s.buffer);s.buffer.destroy();}slots.clear();}};
  }
  function createActor(frame){
    frame.sprite('barrier-scene',{x:actorX-height/2,y:actorFoot-height,w:height,h:height,texture:actorTexture,
      crop:[0,0,256,256],sourceSize:[768,512],color:[1,1,1,1],mode:'source-over'});
  }
  function stateTime(now){return freeze?Math.max(0,Number(qs.get('phase'))||0):Math.max(0,(now-start)*rate/1000);}
  function applyEmbedSequence(now){
    if(!embed)return {time:stateTime(now),cycle:-1,branch:''};
    const elapsed=Math.max(0,(now-start)/1000),cycle=Math.floor(elapsed/embedCycle),within=elapsed-cycle*embedCycle;
    let offset=0,step=embedSequence.at(-1),local=0;
    for(const candidate of embedSequence){if(within<offset+candidate.duration){step=candidate;local=within-offset;break;}offset+=candidate.duration;}
    eventKind=step.event;embedCycleIndex=cycle;embedBranch=step.branch;
    const phase=step.branch==='persist'?.65:local;
    const token=`${cycle}:${step.branch}`;
    if(token!==lastEmbedToken){lastEmbedToken=token;window.__barrierEmbedTrace||=[];
      window.__barrierEmbedTrace.push({cycle,branch:step.branch,event:step.event,enteredAtWallSeconds:Number(elapsed.toFixed(3)),frame:frameNo+1});}
    return {time:phase,cycle,branch:step.branch};
  }
  function render(now){
    if(destroyed||renderer?.state!=='ready')return;
    const embedState=applyEmbedSequence(now);const t=embedState.time;phase=t;const pw=W*dpr,ph=H*dpr;
    display.resize(pw,ph,{width:W,height:H});
    const frame=renderer.beginFrame(`Barrier Astra zero ${++frameNo}`);
    try{
      frame.clear('barrier-scene',[.027,.039,.073,1]);
      pass.draw({frame,targetId:'barrier-scene',layer:0,time:t});
      createActor(frame);
      pass.draw({frame,targetId:'barrier-scene',layer:1,time:t});
      frame.clear('barrier-glow',[0,0,0,0]);pass.draw({frame,targetId:'barrier-glow',layer:2,time:t});
      frame.clear('barrier',[0,0,0,1]);frame.composite({backdrop:'barrier-scene',target:'barrier',operations:[{mode:'screen',texture:glowTexture}]});
      frame.submit();
      const end=eventKind==='grant'? .65 : eventKind==='hit'? .65 : .48;
      for(const mark of sampleMarks){if(!samples.some(s=>s.event===eventKind&&s.phase===mark)&&t>=mark&&t-mark<.04)
        samples.push({event:eventKind,phase:mark,observed:t,frame:frameNo,submitted:true});}
      window.__barrierAstraZero=Object.freeze({ready:true,renderer:'webgpu',context:'webgpu',frame:frameNo,event:eventKind,
        embed,sequenceCycle:embedState.cycle,sequenceBranch:embedState.branch,
        actorHeight:height,dpr,reduced,rate,phase:t,eventDuration:end,q,active:eventKind==='grant'||eventKind==='hit'||t<end,
        layerOrder:['PH1-back','actor-alpha','PH1-front-joint','OBS1-emission-only-screen'],sampled:samples.slice(),audioEnabled:audioEnabled&&!verify,
        audioCount,shaderCompileState:window.__barrierShaderCompileState||'pending',shaderWarnings:window.__barrierShaderWarnings||[]});
      status.dataset.error='0';status.textContent=`WebGPU · H${height} · τ ${t.toFixed(3)}s · ${eventKind} · q ${q.toFixed(2)}`;
    }catch(e){try{frame.discard();}catch(_){}err(e);}
    raf=requestAnimationFrame(render);
  }
  function configure(){
    const allow=(sel,values,def)=>{if(!values.includes(sel.value))sel.value=def;};
    if(qs.has('event'))ui.event.value=qs.get('event');if(qs.has('height'))ui.height.value=qs.get('height');
    if(qs.has('dpr'))ui.dpr.value=qs.get('dpr');if(qs.has('reduced'))ui.reduced.value=qs.get('reduced');if(qs.has('rate'))ui.rate.value=qs.get('rate');
    allow(ui.event,['grant','hit','break','bust'],'grant');allow(ui.height,['64','100'],'64');allow(ui.dpr,['1','2'],'1');allow(ui.reduced,['0','1'],'0');allow(ui.rate,['1','2'],'1');allow(ui.q,['1','0.5','0.05'],'1');
    eventKind=ui.event.value;height=Number(ui.height.value);dpr=Number(ui.dpr.value);reduced=ui.reduced.value==='1';rate=Number(ui.rate.value);
    q=Number(ui.q.value);
    if(embed){ui.height.value='64';ui.dpr.value='1';ui.reduced.value='0';ui.rate.value='1';ui.q.value='1';
      height=64;dpr=1;reduced=false;rate=1;q=1;document.querySelector('#controls').hidden=true;}
    if(verify)ui.sound.hidden=true;
  }
  async function refreshSettings(){
    const oldDpr=dpr;eventKind=ui.event.value;height=Number(ui.height.value);dpr=Number(ui.dpr.value);reduced=ui.reduced.value==='1';rate=Number(ui.rate.value);q=Number(ui.q.value);
    start=performance.now();samples.length=0;
    if(renderer&&display){display.resize(W*dpr,H*dpr,{width:W,height:H});if(oldDpr!==dpr){destroyTargetTextures();makeTargetTextures();}}
  }
  function playSfx(kind){
    if(verify||!audioEnabled)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      audioContext??=new Audio();if(!audioMaster){audioMaster=audioContext.createGain();audioMaster.gain.value=.20;audioMaster.connect(audioContext.destination);}
      if(audioContext.state==='suspended')void audioContext.resume();
      const now=audioContext.currentTime,broken=kind==='break'||kind==='bust',hit=kind==='hit';
      const duration=(broken?.34:hit?.23:.29)/rate, tones=broken?[172,263,431]:hit?[172,263]:[172,263,431];
      const out=audioContext.createGain();out.gain.setValueAtTime(.0001,now);out.gain.linearRampToValueAtTime(broken?.11:.14,now+.012/rate);
      out.gain.exponentialRampToValueAtTime(.0001,now+duration);out.connect(audioMaster);
      for(let i=0;i<tones.length;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=tones[i];gain.gain.value=i===0?.55:i===1?.30:.15;osc.connect(gain);gain.connect(out);osc.start(now+(hit&&i===1?.07/rate:0));osc.stop(now+duration+.02);}
      const noise=audioContext.createBufferSource(),buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.18;noise.buffer=buffer;
      const filter=audioContext.createBiquadFilter(),ng=audioContext.createGain();filter.type='bandpass';filter.frequency.value=kind==='grant'?1100:760;filter.Q.value=.8;
      ng.gain.setValueAtTime(.0001,now);ng.gain.linearRampToValueAtTime(.10,now+(kind==='grant'?.03:.01)/rate);ng.gain.exponentialRampToValueAtTime(.0001,now+Math.min(duration,.15/rate));
      noise.connect(filter);filter.connect(ng);ng.connect(out);noise.start(now);noise.stop(now+duration+.02);audioCount++;
    }catch(e){err(e);}
  }
  async function boot(){
    configure();if(!navigator.gpu)throw Error('WebGPU unavailable; fallback is intentionally absent');
    if(!actorImage.complete)await new Promise((ok,no)=>{actorImage.onload=ok;actorImage.onerror=()=>no(Error('actor image failed to load'));});
    renderer=await DvaWebGPURenderer.create({gpu:navigator.gpu,powerPreference:'high-performance',onFailure:err});
    const w=W*dpr,h=H*dpr;display=renderer.registerTarget('barrier',canvas,{width:w,height:h,logicalWidth:W,logicalHeight:H});
    makeTargetTextures();actorTexture=renderer.device.createTexture({label:'Barrier preview actor reference',size:[768,512],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
    renderer.device.queue.copyExternalImageToTexture({source:actorImage},{texture:actorTexture},{width:768,height:512});renderer.own(actorTexture);
    pass=makePass();window.__barrierShaderCompileState='pending';window.__barrierShaderWarnings=[];
    void pass.compile.then(w=>{window.__barrierShaderWarnings=w;window.__barrierShaderCompileState='ready';}).catch(e=>{window.__barrierShaderCompileState='failed';err(e);});
    window.__barrierRendererState=()=>renderer?.state;start=performance.now()-(Number(qs.get('phase'))||0)*1000/rate;
    ui.event.addEventListener('change',()=>{const prev=eventKind;void refreshSettings().then(()=>{if(prev!==eventKind){lastEventSerial++;playSfx(eventKind);}});});
    for(const k of ['height','dpr','reduced','rate','q'])document.querySelector(`#${k}`).addEventListener('change',()=>void refreshSettings());
    document.querySelector('#restart').addEventListener('click',()=>{start=performance.now();samples.length=0;lastEventSerial++;playSfx(eventKind);});
    ui.sound.addEventListener('click',async()=>{audioEnabled=true;if(audioContext?.state==='suspended')await audioContext.resume();ui.sound.textContent='音を有効にしました';playSfx(eventKind);});
    addEventListener('pagehide',()=>{destroyed=true;cancelAnimationFrame(raf);try{pass?.destroy();renderer?.destroy();}catch(_){}},{once:true});
    raf=requestAnimationFrame(render);
  }
  void boot().catch(err);
})();
