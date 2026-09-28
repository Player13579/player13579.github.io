import {sampleGainVoice,voiceFrequency} from './synthesis.mjs';
export function audioDecision({verify,unlocked,muted,running,visible,live,delayed,realAgeMs,documentVisible=true}) {
  if(verify)return 'verify'; if(!unlocked)return 'gesture-required'; if(muted)return 'muted';
  if(!running)return 'not-running'; if(!documentVisible)return 'hidden';if(!visible)return 'not-visible';
  if(!live||delayed||!Number.isFinite(realAgeMs)||realAgeMs<0||realAgeMs>80)return 'late-or-replay';
  return 'play';
}
export const WORKLET_SOURCE = `
const sampleGainVoice=${sampleGainVoice.toString()};
const voiceFrequency=${voiceFrequency.toString()};
class GainStaminaProcessor extends AudioWorkletProcessor {
 constructor(){super();this.voices=new Map();this.port.onmessage=({data:d})=>{
  if(d.type==='start'){if(!this.voices.has(d.id))this.voices.set(d.id,{ph:d.phase,rate:1,duration:d.durationMs/1000,angle:0,last:currentTime});}
  if(d.type==='sync'){const v=this.voices.get(d.id);if(v){v.ph=Math.max(v.ph,d.phase);v.rate=Math.max(0,d.rate);v.duration=d.durationMs/1000;v.last=currentTime;}}
  if(d.type==='stop'){this.voices.delete(d.id);}
  if(d.type==='clear'){this.voices.clear();}
 };}
 process(inputs,outputs){const out=outputs[0];if(!out)return true;
  for(let i=0;i<out[0].length;i++){let sum=0;
   for(const [id,v] of this.voices){if(v.ph>=1||currentTime-v.last>.20){this.voices.delete(id);this.port.postMessage({type:'ended',id});continue;}
    v.angle+=2*Math.PI*voiceFrequency(v.ph)/sampleRate;
    if(v.rate>0)sum+=sampleGainVoice(v.ph,v.angle);
    v.ph+=v.rate/(sampleRate*v.duration);
   }
   const value=.48*Math.tanh(sum/.48);for(let c=0;c<out.length;c++)out[c][i]=value;
  }return true;
 }
}
registerProcessor('dva-gain-stamina',GainStaminaProcessor);`;

export class StaminaAudio {
  constructor({verify=false,documentRef=globalThis.document}={}) {
    this.verify=verify;this.doc=documentRef;this.context=null;this.node=null;this.unlocked=false;this.muted=true;
    this.voices=new Set();this.attempted=new Set();this.disposed=false;this.unlocking=null;
    this.stats={offered:0,started:0,stopped:0,suppressed:0,contextsCreated:0};
    this.onVisibility=()=>{if(this.doc?.hidden)this.clear();};
    this.doc?.addEventListener('visibilitychange',this.onVisibility);
  }
  async unlockFromGesture(event) {
    if(this.verify||this.disposed||event?.isTrusted!==true||globalThis.navigator?.userActivation?.isActive!==true)return false;
    if(this.unlocking)return this.unlocking;
    this.unlocking=this.doUnlock();try{return await this.unlocking;}finally{this.unlocking=null;}
  }
  async doUnlock(){
    try{
      if(!this.context){
        const C=globalThis.AudioContext;if(!C)throw new Error('AudioContext unsupported');
        const context=new C({latencyHint:'interactive'});this.context=context;this.stats.contextsCreated++;
        this.onState=()=>{if(context.state!=='running')this.clear();};context.addEventListener('statechange',this.onState);
        if(!context.audioWorklet)throw new Error('secure-context AudioWorklet required');
        const url=URL.createObjectURL(new Blob([WORKLET_SOURCE],{type:'text/javascript'}));
        try{await context.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
        if(this.disposed){if(context.state!=='closed')await context.close();return false;}
        this.node=new AudioWorkletNode(context,'dva-gain-stamina',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});
        this.node.port.onmessage=({data})=>{if(data.type==='ended')this.voices.delete(data.id);};
        this.node.connect(context.destination);
      }
      await this.context.resume();
      if(this.disposed)return false;
      this.unlocked=this.context.state==='running';this.muted=!this.unlocked;return this.unlocked;
    }catch(e){this.lastError=String(e);this.unlocked=false;this.muted=true;await this.closeContext();return false;}
  }
  offer(e){
    if(this.disposed||this.attempted.has(e.causeId))return false;
    this.attempted.add(e.causeId);this.stats.offered++;
    const decision=audioDecision({...e,verify:this.verify,unlocked:this.unlocked,muted:this.muted,
      running:this.context?.state==='running',documentVisible:!this.doc?.hidden});
    if(decision!=='play'||!this.node){this.stats.suppressed++;return false;}
    this.voices.add(e.causeId);this.stats.started++;
    this.node.port.postMessage({type:'start',id:e.causeId,phase:e.phase,durationMs:e.durationMs});return true;
  }
  sync(id,phase,rate,durationMs){if(this.voices.has(id)&&this.node)this.node.port.postMessage({type:'sync',id,phase,rate,durationMs});}
  stop(id){if(this.voices.delete(id)){this.stats.stopped++;this.node?.port.postMessage({type:'stop',id});}}
  clear(){for(const id of this.voices)this.stop(id);this.node?.port.postMessage({type:'clear'});}
  setMuted(muted){this.muted=Boolean(muted);if(this.muted)this.clear();}
  async closeContext(){
    this.clear();if(this.node){this.node.port.onmessage=null;this.node.port.close();this.node.disconnect();this.node=null;}
    const c=this.context;this.context=null;if(c){c.removeEventListener('statechange',this.onState);if(c.state!=='closed')await c.close();}
  }
  async dispose(){if(this.disposed)return;this.disposed=true;this.doc?.removeEventListener('visibilitychange',this.onVisibility);this.unlocked=false;this.muted=true;await this.closeContext();this.attempted.clear();}
}
