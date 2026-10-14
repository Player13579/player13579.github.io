// Resolve a waveform offset from the same monotonic clock used by the registered source.
// `startedAt` and `now` are performance.now() milliseconds, never wall-clock timestamps.
export function resolveCauseOffset({startedAt,now,sampleRate,sampleCount,verify=false}){
 if(verify)return {ok:false,reason:'verify',clockDomain:'performance.now'};
 if(!Number.isFinite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<16000||sampleRate>192000)return {ok:false,reason:'invalid-sample-rate',clockDomain:'performance.now'};
 if(!Number.isSafeInteger(sampleCount)||sampleCount<1)return {ok:false,reason:'invalid-sample-count',clockDomain:'performance.now'};
 if(!Number.isFinite(startedAt)||!Number.isFinite(now))return {ok:false,reason:'invalid-source-clock',clockDomain:'performance.now'};
 const ageSeconds=(now-startedAt)/1000,durationSeconds=sampleCount/sampleRate;
 if(ageSeconds<0)return {ok:false,reason:'future-source',clockDomain:'performance.now',ageSeconds};
 if(ageSeconds>=durationSeconds)return {ok:false,reason:'expired-buffer',clockDomain:'performance.now',ageSeconds,durationSeconds,expectedRemainingDurationSeconds:0};
 return {ok:true,reason:'offset',clockDomain:'performance.now',ageSeconds,offsetSeconds:ageSeconds,durationSeconds,expectedRemainingDurationSeconds:durationSeconds-ageSeconds};
}

export function startBufferAtCauseOffset(sourceNode,timing){
 if(!timing?.ok||!sourceNode||typeof sourceNode.start!=='function')return {ok:false,reason:timing?.reason||'invalid-playback-start'};
 try{sourceNode.start(0,timing.offsetSeconds);return {ok:true,...timing}}catch{return {ok:false,reason:'start-failed',...timing}}
}
