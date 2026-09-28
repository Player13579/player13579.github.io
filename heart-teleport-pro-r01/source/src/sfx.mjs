import {LIFETIME_MS,MAX_ACTIVE} from './contract.mjs';
const ease=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** 外部音・noise素材なし。局所膜の共鳴を一つの1.8秒mono信号に構成する。 */
export function synthesizeHeartPCM(sampleRate=48000){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
  const data=new Float32Array(Math.round(sampleRate*1.8));
  let phase=0;
  for(let n=0;n<data.length;n++){
    const t=n/sampleRate;
    const pre=ease(0,0.09,t)*(1-ease(0.44,0.71,t));
    const act=ease(0.45,0.50,t)*(1-ease(0.64,0.93,t));
    const tail=ease(0.58,0.66,t)*Math.exp(-Math.max(0,t-0.64)*4.9)*(1-ease(1.45,1.76,t));
    const frequency=188+91*ease(0,0.53,t);
    phase+=2*Math.PI*frequency/sampleRate;
    const prepare=(Math.sin(phase)+0.19*Math.sin(phase*2.03))*pre*0.28;
    // 締まりは単一作用、心拍・kill/death合図ではない。方向移動・pitch panを使わない。
    const closing=(Math.sin(2*Math.PI*512*t)+0.39*Math.sin(2*Math.PI*823*t))*act*0.35;
    const release=(Math.sin(2*Math.PI*1031*t)+0.28*Math.sin(2*Math.PI*1477*t))*tail*0.13;
    data[n]=Math.tanh(prepare+closing+release)*ease(0,0.008,t)*(1-ease(1.76,1.8,t));
  }
  // DCを除去し、端点の不連続を避ける。実聴の代わりにはならない。
  const mean=data.reduce((a,b)=>a+b,0)/data.length;
  for(let n=0;n<data.length;n++)data[n]-=mean*ease(0,0.01,n/sampleRate)*(1-ease(1.76,1.8,n/sampleRate));
  data[0]=0;data[data.length-1]=0;return data;
}
export class HeartSFX {
  #verify;#ctx=null;#buffer=null;#voices=new Map();#used=new Set();#dead=false;#unlocking=null;#contextFactory;#activation;
  #stats={contextsCreated:0,sourcesStarted:0,sourcesStopped:0,suppressed:0};
  constructor({verify=false,contextFactory=()=>new AudioContext(),isUserActive=()=>globalThis.navigator?.userActivation?.isActive===true}={}){this.#verify=verify;this.#contextFactory=contextFactory;this.#activation=isUserActive;}
  async unlockFromGesture(event){
    if(this.#dead||this.#verify)return false;
    if(!event?.isTrusted||!['click','pointerup','keydown'].includes(event.type)||!this.#activation())return false;
    if(this.#unlocking)return this.#unlocking;
    this.#unlocking=(async()=>{
      if(!this.#ctx){this.#ctx=this.#contextFactory();this.#stats.contextsCreated++;const pcm=synthesizeHeartPCM(this.#ctx.sampleRate);this.#buffer=this.#ctx.createBuffer(1,pcm.length,this.#ctx.sampleRate);this.#buffer.copyToChannel(pcm,0);}
      await this.#ctx.resume();
      if(this.#dead){await this.#ctx.close();return false;}
      return this.#ctx.state==='running';
    })();
    try{return await this.#unlocking;}finally{this.#unlocking=null;}
  }
  playOnce({id,ageMs=0}){
    if(this.#used.has(id))return false;this.#used.add(id);
    if(this.#dead||this.#verify||!this.#ctx||this.#ctx.state!=='running'||ageMs<0||ageMs>=LIFETIME_MS||this.#voices.size>=MAX_ACTIVE){this.#stats.suppressed++;return false;}
    const source=this.#ctx.createBufferSource(),gain=this.#ctx.createGain();source.buffer=this.#buffer;
    // 中央monoでownerにだけ接続する。Panner・StereoPanner・距離減衰は存在しない。
    gain.gain.setValueAtTime(0,this.#ctx.currentTime);source.connect(gain);gain.connect(this.#ctx.destination);
    this.#voices.set(id,{source,gain});this.#mix();
    source.onended=()=>{source.disconnect();gain.disconnect();this.#voices.delete(id);this.#mix();};
    source.start(0,ageMs/1000);this.#stats.sourcesStarted++;return true;
  }
  #mix(){if(!this.#ctx)return;const level=0.40/Math.max(1,this.#voices.size);for(const {gain} of this.#voices.values()){gain.gain.cancelAndHoldAtTime(this.#ctx.currentTime);gain.gain.setTargetAtTime(level,this.#ctx.currentTime,0.005);}}
  stop(id){const voice=this.#voices.get(id);if(!voice)return;this.#voices.delete(id);try{voice.source.stop();this.#stats.sourcesStopped++;}catch{}voice.source.disconnect();voice.gain.disconnect();this.#mix();}
  stopAll(){for(const id of [...this.#voices.keys()])this.stop(id);}
  async dispose(){if(this.#dead)return;this.#dead=true;this.stopAll();this.#buffer=null;if(this.#ctx&&this.#ctx.state!=='closed')await this.#ctx.close();}
  stats(){return {...this.#stats,voices:this.#voices.size,verify:this.#verify,disposed:this.#dead,state:this.#ctx?.state||'not_created'};}
}
