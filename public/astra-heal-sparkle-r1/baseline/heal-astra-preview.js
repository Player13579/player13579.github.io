(async function(){
  'use strict';
  const qs=new URLSearchParams(location.search),verify=qs.has('verify');
  const fixed=verify&&qs.has('phase')?Math.max(0,Math.min(12,Number(qs.get('phase')))):null;
  const zoom=verify&&qs.has('zoom')?Number(qs.get('zoom')):1.65;
  const reduced=qs.get('reduced')==='1';
  const canvas=document.getElementById('stage');
  const contextLoss=[];
  const actor={id:'astra-sophia',x:0,y:0,alive:true,visible:true};
  const event={id:'astra-heal-demo',ownerId:actor.id,startedAt:0,expiresAt:12000};
  let renderer,pass,target,texture,raf=0,disposed=false,origin=performance.now();
  let audioContext,audio,audioUnlocked=false,audioPlaying=false,audioSequence=0;
  let logical={width:Math.max(1,innerWidth),height:Math.max(1,innerHeight)},frameNumber=0;
  let snapshot={ready:false};
  window.__healAstraSnapshot=()=>snapshot;
  function elapsed(){return fixed===null?((performance.now()-origin)/1000)%12:fixed;}
  function resize(){
    logical={width:Math.max(1,innerWidth),height:Math.max(1,innerHeight)};
    const dpr=Math.max(1,Math.min(3,devicePixelRatio||1));
    if(target){target.unregister();target=null;}
    target=renderer.registerTarget('astra-preview',canvas,{width:Math.round(logical.width*dpr),height:Math.round(logical.height*dpr),
      logicalWidth:logical.width,logicalHeight:logical.height});
  }
  function draw(){
    if(disposed)return;
    const t=elapsed();
    const camera={x:-logical.width/(2*zoom),y:-logical.height/(2*zoom)-4};
    const planned=DvaHealAstraE.plan({effect:event,owner:actor,nowMs:t*1000,actorElapsedSeconds:t*1.8,camera,zoom,viewport:logical,reducedMotion:reduced});
    const f=renderer.beginFrame(`Heal Astra ${++frameNumber}`);
    try {
      f.clear('astra-preview',[.014,.025,.035,1]);
      const back=pass.record({frame:f,target:'astra-preview',planned,side:'back'});
      const scale=.4375*.72;
      const rect={x:(-camera.x-128*scale)*zoom,y:(-camera.y+31-240*scale)*zoom,w:256*scale*zoom,h:256*scale*zoom};
      f.sprite('astra-preview',{...rect,texture,crop:[0,0,256,256],sourceSize:[768,512],color:[1,1,1,1],mode:'source-over'});
      const front=pass.record({frame:f,target:'astra-preview',planned,side:'front'});
      f.submit();
      snapshot={ready:true,frame:frameNumber,phaseSeconds:t,actorSeconds:t*1.8,zoom,logical,dpr:devicePixelRatio||1,
        sourceHash:DvaHealAstraE.SOURCE_SHA,compilation:pass.readiness,back,front,avatar:rect,errors:[...contextLoss],
        audio:verify?'verification-muted':audioUnlocked?'gesture-unlocked':'awaiting-browser-gesture',prototype:true};
    }catch(error){try{f.discard();}catch(_){}throw error;}
  }
  function tick(){raf=0;if(disposed||document.hidden)return;try{draw();raf=requestAnimationFrame(tick);}catch(e){fail(e);}}
  function fail(error){snapshot={...snapshot,ready:false,error:String(error?.stack||error)};document.getElementById('error').textContent=`WebGPU: ${error.message||error}`;}
  async function enableAudio(){
    if(verify)return;
    if(audioPlaying)return;
    const Ctor=window.AudioContext||window.webkitAudioContext;
    if(!Ctor)return;
    if(!audioContext)audioContext=new Ctor();
    await audioContext.resume();
    if(!audio)audio=DvaHealAstraSfx.createPlayer({context:audioContext});
    audioUnlocked=true;
    // Read time AFTER synthesis/resume. A late gesture joins the actual phase.
    audioPlaying=audio.start({eventId:`astra-preview:${++audioSequence}`,phaseSeconds:elapsed(),loop:fixed===null,volume:.9});
  }
  function destroy(){
    if(disposed)return;disposed=true;if(raf)cancelAnimationFrame(raf);
    audio?.destroy();if(audioContext&&audioContext.state!=='closed')void audioContext.close();
    pass?.destroy();target?.unregister();renderer?.destroy();
  }
  try{
    if(!Number.isFinite(zoom)||zoom<.2||zoom>4)throw new Error('Invalid preview zoom');
    if(fixed!==null&&!Number.isFinite(fixed))throw new Error('Invalid preview phase');
    renderer=await DvaWebGPURenderer.create({gpu:navigator.gpu});
    renderer.device.addEventListener('uncapturederror',e=>contextLoss.push(String(e.error?.message||e.error)));
    resize();
    const img=new Image();img.src='assets/generated/sophia-front-five-v753.png';await img.decode();
    if(img.naturalWidth!==768||img.naturalHeight!==512)throw new Error('Sophia original sheet registration changed');
    texture=renderer.own(renderer.device.createTexture({label:'Heal Astra actual Sophia',size:[768,512],format:'rgba8unorm',
      usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT}));
    renderer.device.queue.copyExternalImageToTexture({source:img},{texture,premultipliedAlpha:true},[768,512]);
    pass=DvaHealAstraE.create({renderer});await pass.ready;
    origin=performance.now();draw();
    if(fixed===null)raf=requestAnimationFrame(tick);
    window.addEventListener('resize',()=>{if(!disposed){resize();draw();}});
    canvas.addEventListener('pointerdown',()=>void enableAudio().catch(e=>{snapshot={...snapshot,audioError:String(e)};}));
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;audio?.stop();audioPlaying=false;}
      else{if(fixed===null&&!raf)raf=requestAnimationFrame(tick);if(audioUnlocked)void enableAudio().catch(()=>{});}
    });
    window.addEventListener('pagehide',destroy,{once:true});
    window.addEventListener('beforeunload',destroy,{once:true});
  }catch(e){fail(e);destroy();}
})();
