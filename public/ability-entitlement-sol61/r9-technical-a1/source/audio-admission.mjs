// Runtime admission for a single interface-sonification voice per authoritative cause.
export function audioStartDecision({ageMs,durationSeconds,completedCause,activeCause,visible,targetGeneration,currentTargetGeneration,running,muted,verify,retired,held}={}){
 if(!Number.isFinite(ageMs)||ageMs<0||!Number.isFinite(durationSeconds)||durationSeconds<=0)return null;
 if(ageMs>650||ageMs/1000>=durationSeconds||completedCause!==activeCause||!activeCause||visible!==true||targetGeneration!==currentTargetGeneration||running!==true||muted===true||verify===true||retired===true||held===true)return null;
 const offsetSeconds=ageMs/1000,remainingSeconds=durationSeconds-offsetSeconds;
 return Object.freeze({offsetSeconds,remainingSeconds});
}
export async function admitAndStartAudio({context,causeKey,startedAt,now,durationSeconds,completedCause,visible,targetGeneration,currentTargetGeneration,muted,verify,retired,held,createBuffer,synthesize,registerVoice,getState}={}){
 if(!context||typeof context.resume!=='function')return null;
 try{if(context.state!=='running')await context.resume()}catch{return null}
 const live=getState?.()??{};const ageMs=now()-startedAt;
 const plan=audioStartDecision({ageMs,durationSeconds,completedCause,activeCause:causeKey,visible:live.visible??visible,targetGeneration:live.targetGeneration??targetGeneration,currentTargetGeneration:live.currentTargetGeneration??currentTargetGeneration,running:context.state==='running',muted:live.muted??muted,verify:live.verify??verify,retired:live.retired??retired,held:live.held??held});
 if(!plan)return null;
 const buffer=createBuffer(context);buffer.copyToChannel(synthesize(context.sampleRate),0);
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=.4;source.connect(gain).connect(context.destination);
 source.start(0,plan.offsetSeconds,plan.remainingSeconds);registerVoice(source,gain);
 return Object.freeze({...plan,source,gain});
}
