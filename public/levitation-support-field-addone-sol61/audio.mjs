const MAX_CAUSES = 64;
const MAX_VOICES = 3;
const MAX_EVENTS = 128;
const RELEASE_ATTACK_MS = 5;
const smooth = x => { const q=Math.max(0,Math.min(1,x)); return q*q*(3-2*q); };
const finite = (x,n) => { if(!Number.isFinite(x)) throw new TypeError(`${n} must be finite`); return x; };
const causeKey = s => `${s.causeId}\u0000${s.generation}`;
const sameSource = (a,b) => a && b && a.id===b.id && a.causeId===b.causeId && a.generation===b.generation && a.startedAt===b.startedAt;
const defaultContext = () => globalThis.AudioContext || globalThis.webkitAudioContext || null;

// pcm is Sol's synthesize export, plan is Sol's acousticPlan, and validateSource is the
// same model validator the renderer uses. clockNow must expose that model's transition clock.
export function createLevitationAudio({verify=false,pcm,plan,audio,transitionMs,validateSource,clockNow,onNaturalEnd,
  AudioContextClass=defaultContext(),maxCauses=MAX_CAUSES}={}) {
  if(typeof verify!=='boolean') throw new TypeError('verify must be boolean');
  if(!verify && (typeof pcm!=='function'||typeof plan!=='function'||typeof validateSource!=='function'||typeof clockNow!=='function'||!audio))
    throw new TypeError('Sol PCM, acoustic plan, model validator, producer clock and AUDIO contract required');
  if(!verify && (audio.mono!==true || !Number.isFinite(audio.gain) || audio.gain<=0 ||
      !Number.isFinite(audio.onsetMs)||!Number.isFinite(audio.sustainMs)||!Number.isFinite(audio.releaseMs)))
    throw new TypeError('invalid Sol AUDIO contract');
  if(!verify&&(!Number.isFinite(transitionMs)||transitionMs<=0||transitionMs>=audio.onsetMs))
    throw new TypeError('model ONSET_MS transition required');
  const crossfadeMs=verify?0:audio.onsetMs-transitionMs;
  if(!Number.isSafeInteger(maxCauses)||maxCauses<1||maxCauses>MAX_CAUSES) throw new RangeError('maxCauses must be 1..64');

  let context=null, enabled=false, held=false, stopped=false, disposed=false, pending=false;
  let lifecycleRevision=0, updateRevision=0, currentKey=null, currentSource=null;
  const causes=new Map(), voices=new Map(), buffers=new Map(), events=[], errors=[];
  function record(list,item,limit=MAX_EVENTS){ list.push(item); if(list.length>limit)list.shift(); }
  function snapshot(){
    return Object.freeze({verify,muted:verify||!enabled||context?.state!=='running',enabled:enabled&&!verify&&context?.state==='running',held,stopped,disposed,pending,
      contextState:context?.state??'not-created',voiceCount:voices.size,maxVoices:MAX_VOICES,causeCount:causes.size,
      currentCause:currentSource?{id:currentSource.id,causeId:currentSource.causeId,generation:currentSource.generation}:null,
      voices:[...voices.values()].map(v=>({causeId:v.causeId,generation:v.generation,phase:v.phase,loop:v.loop})),
      events:events.map(e=>({...e})),errors:[...errors]});
  }
  function noteError(kind,error){record(errors,{kind,message:String(error?.message??error)});}
  function stopVoice(v,reason,{fadeMs=0}={}){
    if(!v||voices.get(v.id)!==v)return false;
    v.cancelled=true;
    try {
      if(fadeMs>0 && v.gain?.gain && context?.state==='running'){
        const t=context.currentTime, p=v.gain.gain;
        p.cancelScheduledValues?.(t); p.setValueAtTime?.(p.value,t); p.linearRampToValueAtTime?.(0,t+fadeMs/1000);
        v.stopping=true;
        v.node.onended=()=>{
          if(voices.get(v.id)!==v)return;
          voices.delete(v.id); try{v.node.disconnect();}catch{} try{v.gain.disconnect();}catch{}
          record(events,{kind:'voice-stop',causeId:v.causeId,generation:v.generation,phase:v.phase,reason});
        };
        v.node.stop(t+fadeMs/1000+0.002);
        return true;
      }
      voices.delete(v.id); v.node.onended=null; v.node.stop();
    } catch {}
    if(voices.get(v.id)===v)voices.delete(v.id);
    v.node.onended=null;
    try{v.node.disconnect();}catch{} try{v.gain?.disconnect();}catch{}
    record(events,{kind:'voice-stop',causeId:v.causeId,generation:v.generation,phase:v.phase,reason}); return true;
  }
  function stopCauseVoices(key,reason,options){let n=0;for(const v of [...voices.values()])if(v.key===key&&stopVoice(v,reason,options))n++;return n;}
  function stopAllVoices(reason){let n=0;for(const v of [...voices.values()])if(stopVoice(v,reason))n++;return n;}
  function retireCurrent(reason){
    if(currentKey){const c=causes.get(currentKey);if(c)c.retired=true;stopCauseVoices(currentKey,reason);}
    currentKey=null; currentSource=null;
  }
  async function cleanContext(){
    stopAllVoices('dispose');
    if(context){try{await context.close?.();}catch{}}
    enabled=false;pending=false;
  }
  async function enable(){
    if(verify)return {ok:false,reason:'verify-hard-mute',snapshot:snapshot()};
    if(disposed)return {ok:false,reason:'disposed',snapshot:snapshot()};
    if(held)return {ok:false,reason:'held',snapshot:snapshot()};
    if(!AudioContextClass)return {ok:false,reason:'unsupported',snapshot:snapshot()};
    const revision=lifecycleRevision;
    try { context??=new AudioContextClass(); }
    catch(e){noteError('context-create',e);return {ok:false,reason:'context-create-failed',snapshot:snapshot()};}
    pending=true;
    try { await context.resume(); }
    catch(e){if(revision===lifecycleRevision)pending=false;noteError('resume',e);return {ok:false,reason:'resume-rejected',snapshot:snapshot()};}
    if(revision!==lifecycleRevision||disposed||held||stopped){pending=false;return {ok:false,reason:'lifecycle-changed',snapshot:snapshot()};}
    pending=false;
    if(context.state!=='running'){enabled=false;record(events,{kind:'enable-pending',state:context.state});return {ok:false,reason:'context-not-running',snapshot:snapshot()};}
    enabled=true;stopped=false;
    record(events,{kind:'enabled',state:context.state});
    return {ok:true,reason:'running',snapshot:snapshot()};
  }
  function getBuffer(phase){
    const key=`${phase}:${context.sampleRate}`; if(buffers.has(key))return buffers.get(key);
    const pcmResult=pcm({phase,sampleRate:context.sampleRate,seed:1});
    if(!pcmResult||pcmResult.phase!==phase||pcmResult.sampleRate!==context.sampleRate||pcmResult.channels!==1||
      !(pcmResult.samples instanceof Float32Array)||pcmResult.samples.length<1||typeof pcmResult.version!=='string')
      throw new TypeError(`invalid Sol PCM result for ${phase}`);
    if(!Number.isFinite(pcmResult.durationMs)||Math.abs(pcmResult.durationMs-pcmResult.samples.length/context.sampleRate*1000)>0.02)
      throw new RangeError(`PCM duration mismatch for ${phase}`);
    if(Boolean(pcmResult.loop)!==(phase==='sustain'))throw new RangeError(`PCM loop flag mismatch for ${phase}`);
    for(let i=0;i<pcmResult.samples.length;i++)if(!Number.isFinite(pcmResult.samples[i]))throw new RangeError(`nonfinite PCM ${phase}:${i}`);
    const b=context.createBuffer(1,pcmResult.samples.length,context.sampleRate); b.getChannelData(0).set(pcmResult.samples);
    const item=Object.freeze({buffer:b,durationMs:pcmResult.durationMs,loop:pcmResult.loop,version:pcmResult.version});
    buffers.set(key,item);return item;
  }
  function validPlan(p,phase){
    return p&&p.phase===phase&&Number.isFinite(p.offsetSeconds)&&p.offsetSeconds>=0&&Number.isFinite(p.gain)&&p.gain>=0&&
      (phase==='sustain'?(p.remainingMs===null||Number.isFinite(p.remainingMs)&&p.remainingMs>=0):Number.isFinite(p.remainingMs)&&p.remainingMs>=0)&&
      (phase!=='sustain'||Number.isFinite(p.sustainGain??p.gain)&&(p.sustainGain??p.gain)>=0&&(p.sustainGain??p.gain)<=1)&&Boolean(p.loop)===(phase==='sustain');
  }
  function startVoice(state,phase,source,baseNow,ticket,revision){
    if(verify||disposed||held||stopped||!enabled||!context||context.state!=='running'||currentKey!==state.key||ticket!==updateRevision||revision!==lifecycleRevision)return false;
    const voiceId=`${state.key}\u0000${phase}`;
    if(voices.has(voiceId))return false;
    if(voices.size>=MAX_VOICES)return false;
    let pcmBuffer;
    try{pcmBuffer=getBuffer(phase);}catch(e){noteError(`pcm-${phase}`,e);return false;}
    if(ticket!==updateRevision||revision!==lifecycleRevision||currentKey!==state.key||held||stopped||disposed||context.state!=='running')return false;
    // The PCM/buffer allocation may cross a source transition. Re-read the same producer clock
    // and ask Sol's plan again immediately before scheduling; never restart at sample zero.
    let freshNow;
    try{freshNow=clockNow();}catch(e){noteError('clock-read',e);return false;}
    if(freshNow==null)freshNow=baseNow;
    if(!Number.isFinite(freshNow)||freshNow<baseNow){noteError('clock-regressed','producer clock moved backwards during audio preparation');return false;}
    const freshSource=currentSource;
    if(!sameSource(freshSource,source)||ticket!==updateRevision||revision!==lifecycleRevision)return false;
    let freshPlan; try{freshPlan=plan(freshSource,freshNow);}catch(e){noteError('plan-recheck',e);return false;}
    // Onset tail may overlap the sustain for 120ms. It is still the exact Sol onset PCM,
    // sought by age; all other phases must still be current per acousticPlan.
    let offsetSeconds,phaseGain,loop;
    if(phase==='onset'){
      const age=freshNow-source.startedAt;
      if(!source.active||age<0||age>=pcmBuffer.durationMs)return false;
      offsetSeconds=age/1000;phaseGain=audio.gain;loop=false;
    } else {
      if(!validPlan(freshPlan,phase))return false;
      offsetSeconds=freshPlan.offsetSeconds;phaseGain=audio.gain*freshPlan.gain;loop=freshPlan.loop;
      if(phase==='sustain'){
        const age=freshNow-source.startedAt;
        // Crossfade the steady recirculation over the Sol transition at 360ms while the
        // authored onset tail plays through its exact zero at 480ms.
        const progress=freshPlan.sustainGain??freshPlan.gain,remaining=Math.max(0,crossfadeMs-(age-transitionMs));
        phaseGain=audio.gain*progress;
        if(remaining>0&&progress<1) state.sustainRampRemainingMs=remaining;
      }
    }
    if(offsetSeconds>=pcmBuffer.durationMs/1000||context.state!=='running'||!enabled||held||stopped||disposed)return false;
    const latest=currentSource;
    if(!sameSource(latest,source)||latest.active!==source.active||latest.endedAt!==source.endedAt)return false;
    let node,gain;
    try{
      node=context.createBufferSource(); node.__levitationPhase=phase; node.buffer=pcmBuffer.buffer; node.loop=loop;
      if(loop){node.loopStart=0;node.loopEnd=pcmBuffer.durationMs/1000;}
      gain=context.createGain();gain.gain.value=phaseGain;
      if(phase==='sustain'&&state.sustainRampRemainingMs>0){
        const at=context.currentTime;gain.gain.setValueAtTime?.(phaseGain,at);
        gain.gain.linearRampToValueAtTime?.(audio.gain,at+state.sustainRampRemainingMs/1000);
      }
      node.connect(gain);gain.connect(context.destination);
    }catch(e){try{node?.disconnect();}catch{}try{gain?.disconnect();}catch{}noteError(`node-prepare-${phase}`,e);return false;}
    if(context.state!=='running'||!enabled||held||stopped||disposed||currentKey!==state.key||ticket!==updateRevision||revision!==lifecycleRevision){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}return false;}
    const finalNow=(()=>{try{return clockNow()??freshNow;}catch{return NaN;}})();
    if(!Number.isFinite(finalNow)||finalNow<freshNow||!sameSource(currentSource,source)||currentSource.active!==source.active||currentSource.endedAt!==source.endedAt){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}noteError('clock-final','producer clock/source changed before start');return false;}
    let finalOffset=offsetSeconds;
    if(phase==='onset'){
      const age=finalNow-source.startedAt;if(!source.active||age>=pcmBuffer.durationMs){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}return false;}finalOffset=age/1000;
    }else{
      let p;try{p=plan(currentSource,finalNow);}catch(e){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}noteError('plan-final',e);return false;}
      if(!validPlan(p,phase)||p.offsetSeconds>=pcmBuffer.durationMs/1000){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}return false;}finalOffset=p.offsetSeconds;
      if(phase==='sustain'){
        const progress=p.sustainGain??p.gain,age=finalNow-source.startedAt;
        phaseGain=audio.gain*progress;
        state.sustainRampRemainingMs=Math.max(0,crossfadeMs-(age-transitionMs));
      }else if(phase==='release')phaseGain=audio.gain*p.gain;
    }
    if(context.state!=='running'||!enabled||held||stopped||disposed||finalOffset>=pcmBuffer.durationMs/1000){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}return false;}
    const gainAt=context.currentTime;
    try{gain.gain.cancelScheduledValues?.(gainAt);gain.gain.setValueAtTime?.(phaseGain,gainAt);
      if(phase==='sustain'&&state.sustainRampRemainingMs>0&&phaseGain<audio.gain)
        gain.gain.linearRampToValueAtTime?.(audio.gain,gainAt+state.sustainRampRemainingMs/1000);
    }catch(e){try{node.disconnect();}catch{}try{gain.disconnect();}catch{}noteError('gain-schedule',e);return false;}
    const voice={id:voiceId,key:state.key,causeId:state.causeId,generation:state.generation,phase,loop,node,gain,cancelled:false};
    node.onended=()=>{
      if(voices.get(voiceId)!==voice)return;
      voices.delete(voiceId);try{node.disconnect();}catch{}try{gain.disconnect();}catch{};
      record(events,{kind:'voice-ended',causeId:state.causeId,generation:state.generation,phase});
      if(phase==='release'&&!voice.cancelled&&currentKey===state.key&&!state.retired){
        state.naturalEnded=true;
        try{onNaturalEnd?.({id:state.id,causeId:state.causeId,generation:state.generation,endedAt:source.endedAt});}catch(e){noteError('natural-end-callback',e);}
      }
    };
    voices.set(voiceId,voice);
    try{node.start(0,finalOffset);}catch(e){voices.delete(voiceId);node.onended=null;try{node.disconnect();}catch{}try{gain.disconnect();}catch{}noteError(`start-${phase}`,e);return false;}
    state.phaseStarted.add(phase);state.heard=true;
    record(events,{kind:'voice-start',causeId:state.causeId,generation:state.generation,phase,offsetSeconds:finalOffset,
      gain:phaseGain,loop,atAudioTime:context.currentTime,sourceAgeMs:finalNow-source.startedAt});
    if(phase==='onset'&&source.active&&finalNow-source.startedAt>=transitionMs&&finalNow-source.startedAt<audio.onsetMs&&!state.phaseStarted.has('sustain'))
      startVoice(state,'sustain',source,finalNow,ticket,revision);
    return true;
  }
  function update(source,nowMs){
    if(verify||disposed||stopped)return false;
    const ticket=++updateRevision,revision=lifecycleRevision;
    let normalized;
    try{normalized=validateSource(source);}catch(e){noteError('source-invalid',e);retireCurrent('source-invalid');return false;}
    try{finite(nowMs,'nowMs');}catch(e){noteError('clock-invalid',e);retireCurrent('clock-invalid');return false;}
    const key=causeKey(normalized);
    if(currentKey&&key!==currentKey)retireCurrent('source-replaced');
    let state=causes.get(key);
    if(!state){
      if(causes.size>=maxCauses){record(errors,{kind:'cause-capacity',message:'bounded cause ledger full; refusing an untracked cause'});return false;}
      state={key,id:normalized.id,causeId:normalized.causeId,generation:normalized.generation,startedAt:normalized.startedAt,
        lastNow:-Infinity,activeSeen:false,endedAt:null,retired:false,heard:false,phaseStarted:new Set(),naturalEnded:false,sustainRampRemainingMs:0};
      causes.set(key,state);
    }
    if(state.retired)return false;
    if(state.id!==normalized.id||state.startedAt!==normalized.startedAt){state.retired=true;stopCauseVoices(key,'identity-changed');return false;}
    if(nowMs<state.lastNow){state.retired=true;stopCauseVoices(key,'clock-regressed');noteError('clock-regressed','source producer clock regressed');return false;}
    if(state.endedAt!==null&&(normalized.active||normalized.endedAt!==state.endedAt)){state.retired=true;stopCauseVoices(key,'source-replayed');return false;}
    if(!normalized.active){
      if(normalized.endedAt>nowMs){noteError('end-in-future','inactive source endedAt is after producer clock');return false;}
      if(state.activeSeen&&state.endedAt===null)state.endedAt=normalized.endedAt;
    } else state.activeSeen=true;
    state.lastNow=nowMs;currentKey=key;currentSource=normalized;
    if(held||pending||!enabled||!context||context.state!=='running'){
      if(context&&context.state!=='running'){
        state.resumeSustain=[...state.phaseStarted].includes('sustain');
        enabled=false;
        stopCauseVoices(key,'context-suspended');
      }
      return false;
    }
    let acoustic;try{acoustic=plan(normalized,nowMs);}catch(e){noteError('acoustic-plan',e);retireCurrent('plan-invalid');return false;}
    if(!acoustic){
      stopCauseVoices(key,'phase-expired');
      if(!normalized.active)state.naturalEnded=true;
      return false;
    }
    if(normalized.active){
      const age=nowMs-normalized.startedAt;
      if(age<audio.onsetMs&&!state.phaseStarted.has('onset'))startVoice(state,'onset',normalized,nowMs,ticket,revision);
      else if(age>=audio.onsetMs&&!state.phaseStarted.has('onset'))state.onsetMissed=true;
      if(acoustic.phase==='sustain'){
        const sustainVoice=voices.get(`${key}\u0000sustain`);
        if(!sustainVoice&&(!state.phaseStarted.has('sustain')||state.resumeSustain)){
          state.resumeSustain=false; state.sustainRampRemainingMs=0;
          startVoice(state,'sustain',normalized,nowMs,ticket,revision);
        }
      }
      // If the cause changed while PCM preparation was underway, stale startVoice fails closed.
      return voices.has(`${key}\u0000onset`)||voices.has(`${key}\u0000sustain`);
    }
    // End is audible only when this exact cause/generation was previously heard. This avoids
    // phantom releases after a late unlock, source replay, replacement, stop, or invalid input.
    // A repeated inactive-source frame must not cancel an already-running release voice.
    for(const v of [...voices.values()])if(v.key===key&&v.phase!=='release')stopVoice(v,'natural-source-end',{fadeMs:RELEASE_ATTACK_MS});
    if(!state.heard||state.naturalEnded||state.phaseStarted.has('release')){state.naturalEnded=true;return false;}
    return startVoice(state,'release',normalized,nowMs,ticket,revision);
  }
  function hold(){if(verify||disposed)return false;held=true;lifecycleRevision++;updateRevision++;
    const state=currentKey?causes.get(currentKey):null;
    if(state){const onset=voices.has(`${state.key}\u0000onset`);if(onset)state.onsetSuppressed=true;
      if(voices.has(`${state.key}\u0000sustain`))state.resumeSustain=true;}
    stopAllVoices('held');record(events,{kind:'hold'});return true;}
  function resume(){if(verify||disposed||stopped)return false;held=false;lifecycleRevision++;record(events,{kind:'resume-no-unlock',contextState:context?.state??'not-created'});return true;}
  function stop(){if(verify||disposed)return false;lifecycleRevision++;updateRevision++;stopped=true;enabled=false;pending=false;retireCurrent('stop');stopAllVoices('stop');record(events,{kind:'stop'});return true;}
  async function dispose(){if(disposed)return;disposed=true;lifecycleRevision++;updateRevision++;retireCurrent('dispose');await cleanContext();buffers.clear();record(events,{kind:'dispose'});}
  return Object.freeze({enable,update,hold,resume,stop,dispose,snapshot});
}
