/* Luck Astra v4 game SFX adapter. It synthesizes the approved standalone
 * waveform but only plays after the game commits a submitted visible frame. */
(function(root){
  'use strict';
  const DURATION=1.5;
  const clamp=x=>Math.max(0,Math.min(1,x));
  function fade(a,b,x){const q=clamp((x-a)/(b-a));return q*q*(3-2*q);}
  function synth(sampleRate=48000,durationMs=1500){
    if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||
      !Number.isFinite(durationMs)||durationMs<100||durationMs>10000)
      throw RangeError('Invalid sound bounds');
    const pcm=new Float32Array(Math.ceil(sampleRate*durationMs/1000));let rng=173,low=0,phaseA=0,phaseB=0;
    for(let i=0;i<pcm.length;i++){
      const p=i/(pcm.length-1),time=i/sampleRate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;
      low=low*.96+(rng/2147483648-1)*.04;
      const uncertainty=fade(.03,.17,p)*(1-fade(.41,.62,p));
      phaseA+=2*Math.PI*(480+110*Math.cos(p*9))/sampleRate;
      phaseB+=2*Math.PI*(733-91*Math.sin(p*7))/sampleRate;
      const contact=fade(.64,.68,p)*(1-fade(.72,.94,p));
      const tone=(Math.sin(2*Math.PI*523.25*time)+.36*Math.sin(2*Math.PI*1308.125*time)+
        .15*Math.sin(2*Math.PI*1831.375*time))*.048*contact;
      const shimmer=(Math.sin(phaseA)*.014+Math.sin(phaseB)*.009+low*.075)*uncertainty;
      pcm[i]=(tone+shimmer)*fade(0,.015,p)*(1-fade(.96,1,p));
    }
    pcm[0]=0;pcm[pcm.length-1]=0;return pcm;
  }
  function queryVerify(){
    try{return new URLSearchParams(root.location?.search||'').has('verify');}
    catch(_){return false;}
  }
  function createPlayer({context,master,verify=false}={}){
    if(!context?.createBuffer||typeof context.createBufferSource!=='function'||
      typeof context.createGain!=='function'||!master?.gain||!Number.isFinite(master.gain.value)||
      (master.context&&master.context!==context))
      throw new TypeError('Existing AudioContext and master gain are required');
    const silent=Boolean(verify||queryVerify());
    const pcm=synth(context.sampleRate,DURATION*1000);
    const buffer=context.createBuffer(1,pcm.length,context.sampleRate);
    buffer.copyToChannel(pcm,0);
    let roomId='',roomGeneration=-1,active=null,destroyed=false,peak=0;
    for(const value of pcm)peak=Math.max(peak,Math.abs(value));
    const played=new Set(),cancelled=new Set();
    const causeKey=id=>`${roomId}:${roomGeneration}:${String(id)}`;
    function stop(fadeSeconds=.018){
      if(!active)return false;
      const old=active;active=null;const now=context.currentTime;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value,now);
      const release=Math.max(0,fadeSeconds);
      old.gain.gain.linearRampToValueAtTime(0,now+release);
      try{old.source.stop(now+release+.01);}catch(_){}
      return true;
    }
    function enterSession(nextRoomId,nextGeneration){
      if(typeof nextRoomId!=='string'||!nextRoomId||!Number.isSafeInteger(nextGeneration)||nextGeneration<0)
        throw new TypeError('Luck SFX requires a room ID and nonnegative room generation');
      if(roomId!==nextRoomId||roomGeneration!==nextGeneration){
        stop(0);played.clear();cancelled.clear();roomId=nextRoomId;roomGeneration=nextGeneration;
        return true;
      }
      return false;
    }
    function start(receipt={}){
      const causeId=String(receipt.causeId??'');
      if(destroyed||silent||!causeId||!roomId||
        receipt.roomId!==roomId||receipt.roomGeneration!==roomGeneration||
        receipt.frameSubmitted!==true||receipt.frameVisible!==true||
        receipt.cancelled===true||receipt.verify===true||receipt.muted===true||
        context.state!=='running'||!(master.gain?.value>0)||
        !Number.isFinite(receipt.progress)||receipt.progress<0||receipt.progress>=1)
        return false;
      const key=causeKey(causeId);
      if(played.has(key)||cancelled.has(key))return false;
      const offset=Math.min(DURATION-1/context.sampleRate,receipt.progress*DURATION);
      stop(0);
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;source.playbackRate.setValueAtTime(1,context.currentTime);
      const volume=receipt.volume===undefined?0.7:receipt.volume;
      if(!Number.isFinite(volume))return false;
      gain.gain.setValueAtTime(clamp(volume),context.currentTime);
      source.connect(gain);gain.connect(master);
      const entry={causeId,source,gain,key};active=entry;
      source.onended=()=>{source.disconnect();gain.disconnect();if(active===entry)active=null;};
      try{source.start(context.currentTime,offset);played.add(key);}
      catch(error){active=null;try{source.disconnect();gain.disconnect();}catch(_){}throw error;}
      return true;
    }
    function cancel({causeId,roomId:cancelRoom,roomGeneration:cancelGeneration}={}){
      const id=String(causeId??'');
      if(!id||cancelRoom!==roomId||cancelGeneration!==roomGeneration||destroyed)return false;
      const key=causeKey(id);cancelled.add(key);
      if(active?.key===key)stop(0);
      return true;
    }
    return Object.freeze({duration:DURATION,silent,peak,enterSession,start,cancel,stop,
      destroy(){if(destroyed)return;destroyed=true;stop(0);played.clear();cancelled.clear();}});
  }
  const api=Object.freeze({DURATION,synth,createPlayer});
  root.DvaWebGPULuckAstraV4GameSfx=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
