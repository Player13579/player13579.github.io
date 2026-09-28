/** H64 dark/light technical replay of the original Pro effect; optional normal-mode SFX requires a gesture. */
export async function mountRationalLoop({ ERenderer, sampleEffect, ActorClock, ActorAudio }) {
  const canvas=document.querySelector('canvas');
  const fail=(error)=>{document.documentElement.dataset.status='error';const node=document.querySelector('[data-error]');node.textContent=error?.stack||String(error);node.hidden=false;};
  const verifyMode=new URLSearchParams(location.search).has('verify');
  let renderer,audio,clock,stopped=false,frameId=0,lastCycle=-1;
  try {
    if(!navigator.gpu)throw new Error('WebGPU unavailable');
    renderer=await ERenderer.create(canvas);
    const resize=()=>{const rect=canvas.getBoundingClientRect();renderer.resize(rect.width,rect.height,Math.min(devicePixelRatio||1,2));};
    resize();new ResizeObserver(resize).observe(canvas);
    if(!verifyMode){
      clock=new ActorClock();audio=new ActorAudio(clock);
      const unlock=async()=>{
        if(!audio||audio.enabled)return;
        try {
          await audio.enable();
          document.documentElement.dataset.audioLevel='0.32';
          document.removeEventListener('pointerdown',unlock);
          document.removeEventListener('keydown',unlock);
        } catch(error) { document.documentElement.dataset.audioUnlockError=error?.message||String(error); }
      };
      // AudioContext creation/resume stays directly inside a user gesture in the embed.
      document.addEventListener('pointerdown',unlock);
      document.addEventListener('keydown',unlock);
    } else {
      // Verification is permanently silent: it has no ActorAudio instance or unlock listener.
      document.documentElement.dataset.audioLevel='0';
      document.documentElement.dataset.audioMode='verify-muted';
    }
    let started;
    if(clock)started=clock.now();else started=performance.now();
    let busy=false;
    const render=async(now)=>{
      if(stopped)return;
      if(!busy){busy=true;try{
        const actorNow=clock?clock.now():now;
        const elapsed=actorNow-started,cycle=Math.floor(elapsed/2800),cycleStart=started+cycle*2800,age=actorNow-cycleStart,background=cycle%2;
        const event={eventId:'action-rational-free',causeId:`rational-gallery-${cycle}`,playerId:'rational-gallery-actor',actorStartMs:cycleStart,x:0,y:0,radius:145,lifetimeActorMs:1200};
        if(cycle!==lastCycle){
          lastCycle=cycle;
          // Events emitted before the user unlocks audio are discarded for audio; no backlog can play later.
          if(audio?.enabled){audio.accept(event);document.documentElement.dataset.audioEvents=String(Number(document.documentElement.dataset.audioEvents||0)+1);}
        }
        audio?.sync();
        const sample=sampleEffect(event,actorNow);
        await renderer.draw({actorNowMs:actorNow,samples:sample.active?[sample]:[],scale:1,background,fixture:true,observation:true,localLight:true,camera:[0,0]});
        if(renderer.errors.length)throw new Error(renderer.errors.join('; '));
        document.documentElement.dataset.status='playing';document.documentElement.dataset.background=background?'light':'dark';
      }catch(error){stopped=true;fail(error);}finally{busy=false;}}
      if(!stopped)frameId=requestAnimationFrame(render);
    };
    window.addEventListener('pagehide',()=>{stopped=true;cancelAnimationFrame(frameId);renderer?.destroy();void audio?.destroy();},{once:true});
    requestAnimationFrame(render);
  } catch(error){renderer?.destroy();fail(error);}
}

