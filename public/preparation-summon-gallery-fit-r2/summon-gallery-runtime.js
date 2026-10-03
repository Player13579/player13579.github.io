(function(root){
  'use strict';
  const finite=Number.isFinite;
  const DEFAULT_BACKGROUND=[0.014,0.021,0.034,1];
  function create(options={}) {
    const {renderer,targetId,pass,spriteApi,textureCache,fixtures,audio,startupBridge=null,canvas=null,now=()=>performance.now(),
      roomId='preparation-summon-gallery-r1',onStatus=()=>{},raf=requestAnimationFrame,caf=cancelAnimationFrame,
      documentRef=globalThis.document,initialSkin='white-hood',verify=false,getBackingSize=()=>({width:384,height:320})}=options;
    if(!renderer?.device||!targetId||!pass?.record||!spriteApi?.createCommand||!textureCache?.record||
      !fixtures||!fixtures[initialSkin]||!audio?.ledger?.admit||!audio?.player?.play)
      throw new TypeError('Summon gallery needs the shared renderer, production passes, fixtures and frozen SFX APIs');
    const entries=new Map(), participants=new Map([['human-self',{id:'human-self',label:'You',x:192,y:184,skin:initialSkin}]]);
    let skin=initialSkin, roomGeneration=0, joinSerial=0, sessionActive=true, sourceOn=true, reducedMotion=false;
    let transparentEOnly=false, visible=documentRef?.visibilityState!=='hidden', disposed=false, lastNow=-1, zoom=1,camera={x:0,y:0};
    let frameId=0, lastSubmitted=null, lastError='', loopCycle=-1, skipNextSound=false, animation=0, modeEpoch=0;
    let heldMode=false,lastHeldAge=null,heldEpisode=0;
    let currentSnapshot=Object.freeze({stage:'prepared',frameId:0});
    let priorMode={sourceOn,transparentEOnly,reducedMotion};
    audio.ledger.enterRoom(roomId,roomGeneration); audio.player.enterRoom(roomId,roomGeneration);
    const stopAudio=()=>{try{audio.player.stopAll();}catch(error){lastError=String(error?.message||error);}};
    function actors(){
      const out=[];
      for(const p of participants.values()) out.push({...p,isBot:false,ejected:false,spriteReady:true,renderedX:p.x,renderedY:p.y});
      out.push({id:'fixture-bot',label:'Bot fixture',x:318,y:184,renderedX:318,renderedY:184,isBot:true,ejected:false,spriteReady:true,skin:'male-bot'});
      return out;
    }
    function currentSessionKey(){return `${roomId}:${roomGeneration}`;}
    function emit(stage,extra={}){currentSnapshot=Object.freeze({stage,frameId,...extra});try{onStatus(currentSnapshot);}catch{}}
    function setSkin(value){if(!fixtures[value])throw new RangeError(`Unknown fixture skin ${value}`);skin=value;for(const p of participants.values())p.skin=value;}
    function setView(next){if(!finite(next?.zoom)||next.zoom<=0||!finite(next?.camera?.x)||!finite(next?.camera?.y))throw new TypeError('Fixed material view needs finite zoom and camera');zoom=next.zoom;camera={x:next.camera.x,y:next.camera.y};modeEpoch++;stopAudio();return Object.freeze({zoom,camera:Object.freeze({...camera})});}
    function addHuman({id=`human-other-${++joinSerial}`,label='Other human',x=105,y=184}={}){
      if(participants.has(id))throw new Error(`Participant already present: ${id}`);
      participants.set(id,{id,label,x,y,skin});entries.delete(id);return id;
    }
    function removeHuman(id){if(!participants.delete(id))return false;entries.delete(id);modeEpoch++;stopAudio();return true;}
    function startSession(){if(disposed)throw new Error('Gallery runtime disposed');if(sessionActive)return false;roomGeneration++;modeEpoch++;sessionActive=true;entries.clear();loopCycle=-1;audio.ledger.enterRoom(roomId,roomGeneration);audio.player.enterRoom(roomId,roomGeneration);skipNextSound=true;return true;}
    function endSession(){if(!sessionActive)return false;sessionActive=false;modeEpoch++;entries.clear();stopAudio();return true;}
    function setSourceOn(value){const next=Boolean(value);if(sourceOn===next)return;sourceOn=next;modeEpoch++;if(!next)stopAudio();priorMode={sourceOn,transparentEOnly,reducedMotion};}
    function setReducedMotion(value){const next=Boolean(value);if(reducedMotion===next)return;reducedMotion=next;modeEpoch++;if(next)stopAudio();priorMode={sourceOn,transparentEOnly,reducedMotion};}
    function setTransparentEOnly(value){const next=Boolean(value);if(transparentEOnly===next)return;transparentEOnly=next;modeEpoch++;if(transparentEOnly)stopAudio();priorMode={sourceOn,transparentEOnly,reducedMotion};}
    function audioPolicyChanged(){modeEpoch++;stopAudio();}
    function setVisible(value){const next=Boolean(value);if(visible===next)return;visible=next;modeEpoch++;if(!next)stopAudio();else skipNextSound=true;}
    function resized(){modeEpoch++;stopAudio();skipNextSound=true;}
    function resetPlayback(){entries.clear();lastNow=-1;stopAudio();skipNextSound=false;}
    function clearRoom(){sessionActive=false;entries.clear();stopAudio();}
    function buildPlayerCommand(player,arrival){
      const fixture=fixtures[player.skin||skin];if(!fixture)throw new Error(`Missing loaded fixture material for ${player.skin||skin}`);
      const manifest=fixture.entry;
      const entry={...manifest,layout:{...manifest.layout,scale:manifest.layout.scale*fixture.productionScaleMultiplier}};
      const command=spriteApi.createCommand({player:{id:player.id,x:player.x,y:player.y},identity:player.isBot?'fixture-bot':'fixture-human',direction:'front',mode:'walk',entry,image:fixture.image,frame:manifest.idle,body:{lean:0,sway:0,lift:0},camera,zoom,arrival,arrivalAnchor:player,order:player.isBot?20:10});
      if(!command)throw new Error(`Production player sprite rejected fixture ${player.id}`);
      return command;
    }
    async function drawAt(nowMs,{heldAge=null}={}){
      if(disposed)throw new Error('Gallery runtime disposed');
      if(!finite(nowMs)||nowMs<0)throw new TypeError('Preparation time must be finite and nonnegative');
      if(!visible)return Object.freeze({stage:'hidden',frameId});
      if(heldAge!==null){
        if(!finite(heldAge)||heldAge<0)throw new TypeError('Held age must be finite and nonnegative');
        const rewound=heldMode&&lastHeldAge!==null&&heldAge<lastHeldAge;
        if(!heldMode||rewound){entries.clear();heldEpisode++;for(const p of participants.values())entries.set(p.id,{sessionKey:currentSessionKey(),appearedAt:0,...(reducedMotion?{summonExpired:true}:{summonStartedAt:0}),fixtureEventId:`summon:${roomId}:${roomGeneration}:${p.id}:held-${heldEpisode}-${++joinSerial}`});}
        heldMode=true;lastHeldAge=heldAge;nowMs=heldAge;
      }else if(heldMode){heldMode=false;lastHeldAge=null;}
      if(heldAge===null&&nowMs<lastNow)throw new RangeError('Preparation monotonic clock moved backwards');
      if(heldAge===null)lastNow=nowMs;
      const roster=sessionActive?actors():[{id:'fixture-bot',label:'Bot fixture',x:318,y:184,renderedX:318,renderedY:184,isBot:true,ejected:false,spriteReady:true,skin:'male-bot'}];
      if(heldAge===null&&sessionActive){
        for(const player of roster){if(player.isBot)continue;const old=entries.get(player.id);if(old&&finite(old.summonStartedAt)&&nowMs-old.summonStartedAt>=1480){entries.delete(player.id);stopAudio();}}
      }
      if(heldAge===null){for(const entry of entries.values()){if(finite(entry.summonStartedAt)&&nowMs>=entry.summonStartedAt+980&&!entry.galleryRetired){entry.galleryRetired=true;stopAudio();}}}
      const scene={active:sessionActive,nowMs,roomId,roomSessionGeneration:roomGeneration,players:roster,entries,reducedMotion};
      const backing=getBackingSize(),viewport={width:384,height:320,pixelWidth:backing.width,pixelHeight:backing.height};
      const submittedModeEpoch=modeEpoch;
      const sourceOnAtSubmit=sourceOn;
      const soundFrameEligible=heldAge===null&&sessionActive&&sourceOn&&!transparentEOnly&&!reducedMotion&&visible&&!skipNextSound;
      const audioStateAtSubmit=audio.getState();
      const frame=renderer.beginFrame('faithful preparation arrival r1');
      let effects=[]; const cmds=[]; let submitCommands=0,firstFrameEvidence=null;
      try{
        frame.clear(targetId,transparentEOnly?[0,0,0,0]:DEFAULT_BACKGROUND);
        if(sourceOn){const result=pass.record({frame,target:targetId,viewport,scene,camera,zoom});effects=result.effects||[];}
        else {effects=root.DvaWebGPUPreparationSummons.plan({scene,camera,zoom,viewport});}
        for(const player of roster){if(player.isBot)continue;const e=entries.get(player.id);if(e&&!e.fixtureEventId)e.fixtureEventId=`summon:${roomId}:${roomGeneration}:${player.id}:join-${++joinSerial}`;}
        if(!transparentEOnly){frame.stage('world:players');for(const player of roster){const entry=entries.get(player.id);const arrival=sourceOn&&!reducedMotion&&!player.isBot?entry?.arrival:null;const command=buildPlayerCommand(player,arrival);textureCache.record(frame,targetId,command);cmds.push({player,command,entry,arrival});}}
        submitCommands=frame.submit(); frameId++; lastSubmitted={frameId,commands:submitCommands,effectCount:effects.length,actorCount:cmds.length,requestedAge:nowMs,held:heldAge!==null,queue:'submitted'};
        firstFrameEvidence={frameId,submitCommands,effects,commands:cmds,nowMs,sourceOn:sourceOnAtSubmit,
          reducedMotion,transparentEOnly,visible,held:heldAge!==null,canvas};
        startupBridge?.markFirstFrameSubmitted?.(firstFrameEvidence);
      }catch(error){try{frame.discard();}catch{}lastError=String(error?.message||error);startupBridge?.fail?.(error,'WEBGPU_FRAME_RECORD_FAILED');emit('frame-failed',{error:lastError,requestedAge:nowMs});return Object.freeze({stage:'frame-failed',frameId,error:lastError});}
      try{await renderer.device.queue.onSubmittedWorkDone();}
      catch(error){lastError=String(error?.message||error);lastSubmitted={...lastSubmitted,queue:'failed',error:lastError};startupBridge?.fail?.(error,'WEBGPU_QUEUE_FAILED');emit('queue-failed',{error:lastError,requestedAge:nowMs});return Object.freeze({stage:'queue-failed',frameId,error:lastError});}
      const completedAt=heldAge===null?now():nowMs;
      const observation=Object.freeze({frameId,requestedAge:nowMs,submittedAge:nowMs,completedAt:Number.isFinite(completedAt)?completedAt:null,queue:'fulfilled',commands:submitCommands,effectCount:effects.length,actorCount:cmds.length,transparentEOnly,sourceOn,reducedMotion,held:heldAge!==null});
      lastSubmitted=observation;
      const completedEvidence={...firstFrameEvidence,queueCompleted:true};
      startupBridge?.completeFirstFrame?.(completedEvidence);
if(heldAge===null&&sessionActive){
        for(const effect of effects){
          const player=roster.find(p=>p.id===effect.id&&!p.isBot),entry=entries.get(effect.id);
          if(!player||!entry||!entry.arrival?.active||entry.sfxConsumed)continue;
          entry.sfxConsumed=true;
          if(!sourceOnAtSubmit)continue;
          const event={kind:'summon',roomId,roomGeneration,playerId:player.id,isBot:false,eventId:entry.fixtureEventId,eventAtMs:entry.summonStartedAt,nowMs,sourceId:'preparation-arrival-r1'};
          const currentAudio=audio.getState();
          const unchanged=modeEpoch===submittedModeEpoch;
          const wasAudible=!verify&&audioStateAtSubmit?.contextState==='running'&&audioStateAtSubmit?.masterGain>0&&!audioStateAtSubmit?.muted&&!audioStateAtSubmit?.hidden;
          const audible=soundFrameEligible&&unchanged&&wasAudible&&currentAudio?.contextState==='running'&&currentAudio?.masterGain>0&&!currentAudio?.muted&&!currentAudio?.hidden;
          const cue=audio.ledger.admit(event,{audible});let soundReceipt=null;
          if(cue)soundReceipt=audio.player.play(cue,{nowMs,muted:!audible,verify,volume:1,actorRate:null});
          entry.sfxReceipt=soundReceipt;
          entry.sfxCue=cue?{eventId:cue.eventId,startsAtMs:cue.startsAtMs,endsAtMs:cue.endsAtMs,layers:cue.layers.length}:null;
        }
      }      if(skipNextSound)skipNextSound=false;
      emit('queue-complete',observation);return observation;
    }
    function snapshot(){return Object.freeze({roomId,roomGeneration,sessionActive,sourceOn,reducedMotion,transparentEOnly,visible,zoom,camera:Object.freeze({...camera}),frameId,lastSubmitted,lastError,participants:[...participants.values()].map(p=>({id:p.id,label:p.label,skin:p.skin})),entries:[...entries.entries()].map(([id,e])=>({id,appearedAt:e.appearedAt,summonStartedAt:e.summonStartedAt,expired:e.summonExpired,arrival:e.arrival,eventId:e.fixtureEventId,sfxConsumed:Boolean(e.sfxConsumed),sfxReceipt:e.sfxReceipt||null})),verify});}
    function dispose(){if(disposed)return;disposed=true;modeEpoch++;cancelAnimationFrameSafe();stopAudio();try{textureCache.destroy();}catch{}try{pass.destroy?.();}catch{}try{renderer.destroy();}catch{}emit('disposed');}
    function cancelAnimationFrameSafe(){if(animation)try{caf(animation);}catch{}animation=0;}
    function start(loop){if(typeof loop!=='function')throw new TypeError('A frame callback is required');cancelAnimationFrameSafe();let busy=false;const tick=async stamp=>{if(disposed)return;if(!visible){animation=raf(tick);return;}if(!busy){busy=true;try{await loop(stamp);}catch(error){lastError=String(error?.message||error);emit('loop-failed',{error:lastError});}finally{busy=false;}}if(!disposed)animation=raf(tick);};animation=raf(tick);return animation;}
    return Object.freeze({drawAt,setSkin,setView,addHuman,removeHuman,startSession,endSession,setSourceOn,setReducedMotion,setTransparentEOnly,setVisible,resized,audioPolicyChanged,resetPlayback,clearRoom,start,dispose,snapshot,get targetId(){return targetId;},get renderer(){return renderer;}});
  }
  root.DvaPreparationSummonGalleryRuntime=Object.freeze({create});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.DvaPreparationSummonGalleryRuntime;
})(typeof globalThis!=='undefined'?globalThis:window);









