(function(root){
  'use strict';
  const VERSION_ID='preparation-summon-gallery-fit-r2';
  function create({params, startup, windowRef=globalThis.window, documentRef=globalThis.document,
    canvas, verify=false, unlockAudio=async()=>false, getAudioSnapshot=()=>({})}={}){
    const query=params||new URLSearchParams(windowRef?.location?.search||'');
    const token=String(query.get('galleryStartupToken')||'');
    const versionId=String(query.get('galleryVersionId')||'');
    const attemptEpoch=Number(query.get('galleryAttemptEpoch'));
    const enabled=Boolean(/^[0-9a-f]{32}$/i.test(token)&&versionId===VERSION_ID&&
      Number.isSafeInteger(attemptEpoch)&&attemptEpoch>0&&windowRef&&windowRef.parent!==windowRef&&
      windowRef.location?.origin&&windowRef.location.origin!=='null'&&
      typeof startup?.advance==='function'&&typeof startup?.isActive==='function');
    let pending=null,completed=false;
    function current(){
      if(!enabled||!startup.isActive())return false;
      const latest=new URLSearchParams(windowRef.location.search);
      if(latest.get('galleryStartupToken')!==token||latest.get('galleryVersionId')!==VERSION_ID||
        Number(latest.get('galleryAttemptEpoch'))!==attemptEpoch)return false;
      const s=startup.snapshot?.();
      return !s||(s.token===token&&s.versionId===VERSION_ID&&Number(s.attemptEpoch)===attemptEpoch);
    }
    function report(stage,status,detail={}){if(!current())return false;startup.advance(stage,status,detail);return true;}
    function viewport(){
      const r=canvas?.getBoundingClientRect?.();
      const width=Number(r?.width),height=Number(r?.height),backingWidth=Number(canvas?.width),backingHeight=Number(canvas?.height);
      return {canvasConnected:canvas?.isConnected===true,visible:documentRef?.visibilityState!=='hidden',
        viewportWidth:width,viewportHeight:height,backingWidth,backingHeight,
        valid:canvas?.isConnected===true&&documentRef?.visibilityState!=='hidden'&&width>0&&height>0&&backingWidth>0&&backingHeight>0};
    }
    function visibleHumanRecord(evidence){
      if(evidence?.sourceOn!==true||evidence?.reducedMotion!==false||evidence?.transparentEOnly!==false||evidence?.held===true)return null;
      const records=Array.isArray(evidence.commands)?evidence.commands:[];
      const effects=Array.isArray(evidence.effects)?evidence.effects:[];
      for(const row of records){
        const player=row?.player,entry=row?.entry,command=row?.command,arrival=row?.arrival;
        if(!player||player.isBot===true||!player.id||!command||command.playerId!==player.id||
          !command.assetPath||!(command.sprite?.w>0)||!(command.sprite?.h>0)||
          !Array.isArray(command.sprite?.transform)||!command.sprite.transform.every(Number.isFinite)||
          !entry?.fixtureEventId||!Number.isFinite(entry.summonStartedAt)||arrival?.active!==true)continue;
        const effect=effects.find(x=>x?.id===player.id&&x.ringReady===true&&x.ringAlpha>0&&x.arrival?.active===true&&
          Number.isFinite(x.x)&&Number.isFinite(x.footY)&&x.x>=0&&x.x<=384&&x.footY>=0&&x.footY<=320);
        if(effect)return {playerId:String(player.id),eventId:String(entry.fixtureEventId),effectAgeMs:Number(evidence.nowMs)-entry.summonStartedAt};
      }
      return null;
    }
    function markFirstFrameSubmitted(evidence){
      if(completed)return false;
      if(!current()||!Number.isSafeInteger(evidence?.frameId)||evidence.frameId<1||
        !Number.isSafeInteger(evidence?.submitCommands)||evidence.submitCommands<1)return false;
      const actor=visibleHumanRecord(evidence),view=viewport();
      if(!actor||!view.valid)return false;
      pending={frameId:evidence.frameId,submitCommands:evidence.submitCommands,actor,view};
      report('pipelines','ready');report('first-frame','pending');
      return true;
    }
    function completeFirstFrame(evidence){
      if(!pending||!current()||evidence?.queueCompleted!==true||evidence.frameId!==pending.frameId||
        evidence.submitCommands!==pending.submitCommands)return false;
      const actor=visibleHumanRecord(evidence),view=viewport();
      if(!actor||actor.playerId!==pending.actor.playerId||actor.eventId!==pending.actor.eventId||!view.valid)return false;
      const proof=Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,
        passes:1,viewportWidth:view.viewportWidth,viewportHeight:view.viewportHeight,
        backingWidth:view.backingWidth,backingHeight:view.backingHeight,frameId:pending.frameId,
        submittedCommands:pending.submitCommands,effectPlayerId:actor.playerId,eventId:actor.eventId,
        effectAgeMs:actor.effectAgeMs});
      pending=null;
      completed=true;
      if(!report('first-frame','ready',{firstFrame:proof}))return false;
      return report('playing','ready',{firstFrame:proof});
    }
    function fail(error,code,status='error'){if(!current())return false;startup.fail(error,code,status);return true;}
    async function activateFromGesture(item){
      if(verify)return {state:'silent',reason:'verification mode hard-mutes all audio'};
      if(item?.id!==VERSION_ID)return {state:'unsupported',reason:'version identity did not match this preview'};
      try{await unlockAudio();}catch(error){return {state:'unavailable',reason:String(error?.message||error)};}
      const audio=getAudioSnapshot()||{};
      if(audio.verify===true)return {state:'silent',reason:'verification mode hard-mutes all audio'};
      if(audio.supported===false)return {state:'unsupported',reason:'Web Audio is unsupported'};
      if(audio.contextState!=='running')return {state:'unavailable',reason:`AudioContext is ${audio.contextState||'not running'}`};
      return {state:'active',reason:'existing preparation SFX unlocked from user gesture'};
    }
    const sfx=Object.freeze({activateFromGesture,getSnapshot:()=>Object.freeze({...getAudioSnapshot(),verify:Boolean(verify)})});
    return Object.freeze({enabled,report,fail,markFirstFrameSubmitted,completeFirstFrame,getSnapshot:()=>startup?.snapshot?.()||null,
      isCurrent:current,sfx});
  }
  const api=Object.freeze({VERSION_ID,create});
  root.DvaPreparationGalleryHostBridge=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
