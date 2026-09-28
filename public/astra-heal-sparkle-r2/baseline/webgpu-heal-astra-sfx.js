/* Independent Heal Astra stereo synthesis. No existing sound/model asset used.
 * Time is the same 12-second wall cycle as the procedural VFX. */
(function(root){
  'use strict';
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  function synthesize(sampleRate=48000, splitCast=false) {
    if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('Invalid sample rate');
    const frames=sampleRate*12,L=new Float32Array(frames),R=new Float32Array(frames);
    const sustain=splitCast?[new Float32Array(frames),new Float32Array(frames)]:null;
    const castStem=splitCast?[new Float32Array(frames),new Float32Array(frames)]:null;
    const TAU=2*Math.PI;let seed=0xA57A2026,fast=0,slow=0,peak=0;
    const fastMix=1-Math.exp(-TAU*2350/sampleRate),slowMix=1-Math.exp(-TAU*420/sampleRate);
    for(let i=0;i<frames;i++) {
      const t=i/sampleRate,actor=t*1.8;
      const source=smooth(0,.22,t)*(1-smooth(11.72,12,t));
      const withdraw=smooth(10.4,11.65,t);
      const cast=Math.exp(-Math.pow((actor-1.62)/.72,2));
      const reception=smooth(.13,.43,t)*(1-smooth(11.72,12,t));
      const bed=source*(.45+.55*smooth(.2,1.2,t))*(1-.55*withdraw);
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const noise=(seed/4294967296)*2-1;
      fast+=fastMix*(noise-fast);slow+=slowMix*(noise-slow);
      const breath=.62+.38*Math.sin(t*Math.PI*.88-.4);
      const air=(fast-slow)*(.022*bed*breath+.06*cast*source);
      // Inharmonicity is tiny and deliberate: warm partial body, not a beep.
      const swirl=.016*Math.sin(TAU*t*.37);
      const body=(Math.sin(TAU*196*t+swirl)*.028+
        Math.sin(TAU*294.12*t+.035*Math.sin(TAU*.51*t))*.023+
        Math.sin(TAU*392.18*t+.4)*.013+
        Math.sin(TAU*589.01*t+.018*Math.sin(TAU*.67*t))*.007)*bed;
      const arrivalCarrier=(Math.sin(TAU*392*t+.35*Math.exp(-t*4)*Math.sin(TAU*196*t))*.075+
        Math.sin(TAU*784.5*t+.25)*.024+
        Math.sin(TAU*1177.2*t+.7)*.009)*source*reception;
      const arrival=arrivalCarrier*cast;
      const closing=Math.sin(TAU*196*t)*.024*reception*withdraw*(1-smooth(11.72,12,t));
      const pan=.26*Math.sin(actor*1.53938-.7);
      const gate=smooth(0,.022,t)*(1-smooth(11.90,12,t));
      L[i]=(body+arrival+closing+air*(1-pan))*gate;
      R[i]=(body+arrival+closing+air*(1+pan)+Math.sin(TAU*294.12*t+.11)*.004*bed)*gate;
      if(splitCast) {
        const castAir=(fast-slow)*.06*source;
        castStem[0][i]=(arrivalCarrier+castAir*(1-pan))*gate;
        castStem[1][i]=(arrivalCarrier+castAir*(1+pan))*gate;
        sustain[0][i]=L[i]-castStem[0][i]*cast;
        sustain[1][i]=R[i]-castStem[1][i]*cast;
      }
      peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
    }
    const gain=peak>.68?.68/peak:1;
    if(gain!==1)for(let i=0;i<frames;i++){
      L[i]*=gain;R[i]*=gain;
      if(splitCast)for(let c=0;c<2;c++){sustain[c][i]*=gain;castStem[c][i]*=gain;}
    }
    return {channels:[L,R],sampleRate,duration:12,peak:peak*gain,
      ...(splitCast?{sustain,castStem}:{})};
  }
  function createPlayer({context,destination=context?.destination,syncActorClock=false}={}) {
    if(!context?.createBuffer||!destination)throw new TypeError('An authorized AudioContext is required');
    const samples=synthesize(context.sampleRate,syncActorClock);
    const makeBuffer=channels=>{const b=context.createBuffer(2,channels[0].length,context.sampleRate);
      channels.forEach((channel,i)=>b.copyToChannel(channel,i));return b;};
    const buffer=makeBuffer(syncActorClock?samples.sustain:samples.channels);
    const castBuffer=syncActorClock?makeBuffer(samples.castStem):null;
    let current=null,disposed=false;const seen=new Set();
    function stop(fade=.065) {
      if(!current)return;const old=current;current=null;
      const t=context.currentTime;
      old.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueAtTime(old.gain.gain.value,t);
      old.gain.gain.linearRampToValueAtTime(0,t+Math.max(0,fade));
      for(const source of old.sources)try{source.stop(t+Math.max(0,fade)+.01);}catch(_){}
    }
    function update({actorElapsedSeconds,actorRate}={}) {
      if(!current?.castGain || !Number.isFinite(actorElapsedSeconds)||actorElapsedSeconds<0)return false;
      if(Number.isFinite(actorRate) && actorRate>=0 && actorRate<=12)
        current.sources[1].playbackRate.setValueAtTime(actorRate,context.currentTime);
      const param=current.castGain.gain,t=context.currentTime;
      const level=Math.exp(-Math.pow((actorElapsedSeconds-1.62)/.72,2));
      param.cancelScheduledValues(t);param.setValueAtTime(param.value,t);
      param.linearRampToValueAtTime(level,t+.015);
      return true;
    }
    function start({eventId,phaseSeconds=0,actorElapsedSeconds=phaseSeconds*1.8,actorRate=1,loop=false,volume=1}={}) {
      if(disposed)throw new Error('Heal Astra sound disposed');
      if(!eventId||!Number.isFinite(phaseSeconds)||phaseSeconds<0||phaseSeconds>=12||
        !Number.isFinite(actorElapsedSeconds)||actorElapsedSeconds<0||
        !Number.isFinite(actorRate)||actorRate<0||actorRate>12)return false;
      if(seen.has(eventId))return false;
      seen.add(eventId);if(seen.size>256)seen.delete(seen.values().next().value);
      stop();const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;source.loop=Boolean(loop);source.loopStart=0;source.loopEnd=12;
      gain.gain.setValueAtTime(0,context.currentTime);
      gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1.5,volume)),context.currentTime+.025);
      source.connect(gain);gain.connect(destination);
      const sources=[source];let castGain=null;
      if(castBuffer) {
        const castSource=context.createBufferSource();castGain=context.createGain();
        castSource.buffer=castBuffer;castSource.loop=Boolean(loop);castSource.loopStart=0;castSource.loopEnd=12;
        castSource.playbackRate.setValueAtTime(actorRate,context.currentTime);
        castGain.gain.setValueAtTime(Math.exp(-Math.pow((actorElapsedSeconds-1.62)/.72,2)),context.currentTime);
        castSource.connect(castGain);castGain.connect(gain);sources.push(castSource);
        castSource.onended=()=>{castSource.disconnect();castGain.disconnect();};
      }
      const entry={id:eventId,source,sources,gain,castGain};current=entry;
      source.onended=()=>{source.disconnect();gain.disconnect();if(current===entry)current=null;};
      source.start(context.currentTime,phaseSeconds);
      if(sources[1])sources[1].start(context.currentTime,Math.min(actorElapsedSeconds,11.999));
      return true;
    }
    return {start,update,stop,peak:samples.peak,destroy(){if(disposed)return;stop(0);disposed=true;}};
  }
  const api=Object.freeze({synthesize,createPlayer});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.DvaHealAstraSfx=api;
})(typeof globalThis==='undefined'?this:globalThis);
