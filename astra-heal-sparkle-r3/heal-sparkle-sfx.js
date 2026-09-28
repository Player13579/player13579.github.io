/* A short crystalline catch follows the healing arrival, without retriggering heals. */
(function(root){'use strict';
 function synthesize(sampleRate=48000){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('Invalid sample rate');
  const channels=[new Float32Array(sampleRate*12),new Float32Array(sampleRate*12)];
  const catches=[[.86,1176,.031],[.94,1568,.024],[1.02,1960,.018],[11.62,1176,.017],[11.70,1568,.013]];
  for(const [onset,freq,level] of catches)for(let j=0;j<sampleRate*.5;j++){
   const t=j/sampleRate,index=Math.floor(onset*sampleRate)+j;if(index>=channels[0].length)break;
   const gate=Math.min(1,t/.012)*Math.exp(-t*12)*Math.max(0,Math.min(1,((channels[0].length-1-index)/sampleRate)/.1));
   const tone=(Math.sin(2*Math.PI*freq*t)+.25*Math.sin(2*Math.PI*freq*2.003*t)) * gate*level;
   channels[0][index]+=tone*.94;channels[1][index]+=tone;
  }
  return {channels,sampleRate,duration:12};
 }
 function createPlayer({context,destination=context?.destination,...options}={}){
  const base=root.DvaHealAstraSfx.createPlayer({context,destination,...options});const samples=synthesize(context.sampleRate);
  const buffer=context.createBuffer(2,samples.channels[0].length,context.sampleRate);samples.channels.forEach((v,i)=>buffer.copyToChannel(v,i));
  let active=null,dead=false;
  function stop(fade=.065){base.stop(fade);if(!active)return;const a=active;active=null;const t=context.currentTime;a.gain.gain.cancelScheduledValues(t);a.gain.gain.setValueAtTime(a.gain.gain.value,t);a.gain.gain.linearRampToValueAtTime(0,t+Math.max(0,fade));try{a.source.stop(t+Math.max(0,fade)+.01);}catch{}}
  function start(args={}){if(dead)throw Error('Heal sparkle SFX disposed');if(!base.start(args))return false;if(active){const old=active;active=null;try{old.source.stop();}catch{}}
   const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=Boolean(args.loop);source.loopEnd=12;gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1.5,args.volume??1)),context.currentTime+.025);source.connect(gain);gain.connect(destination);const a={source,gain};active=a;source.onended=()=>{source.disconnect();gain.disconnect();if(active===a)active=null;};source.start(context.currentTime,args.phaseSeconds??0);return true;
  }
  return {start,stop,update:base.update,destroy(){if(dead)return;stop(0);base.destroy();dead=true;}};
 }
 const api={synthesize,createPlayer};root.DvaHealSparkleSfx=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
