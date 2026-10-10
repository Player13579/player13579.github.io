export const RATE=48000;
export const SOUND_MS=380;
export function makePCM(){
 const pcm=new Float32Array(RATE*SOUND_MS/1000);let state=0x6f821b49;
 // Deterministic damped pressure impulse + short vent hiss + steel resonance.
 // This is sonification, not a measured sound-pressure/chemical yield model.
 for(let i=0;i<pcm.length;i++){
  const t=i/RATE;state^=state<<13;state^=state>>>17;state^=state<<5;
  const noise=(state>>>0)/4294967296*2-1,attack=1-Math.exp(-t/.0007);
  const pressure=Math.sin(2*Math.PI*91*t+8*Math.exp(-t/.012))*Math.exp(-t/.032);
  const vent=noise*(.60*Math.exp(-t/.022)+.16*Math.exp(-t/.095));
  const steel=(.10*Math.sin(2*Math.PI*1740*t)+.06*Math.sin(2*Math.PI*2630*t))*Math.exp(-t/.080);
  const tail=Math.max(0,1-t/.380);pcm[i]=.58*attack*(pressure*.52+vent+steel)*tail;
 }return pcm;
}
export class StunSound{
 constructor({verify=false,AudioContextClass=globalThis.AudioContext??globalThis.webkitAudioContext}={}){this.verify=verify;this.Context=AudioContextClass;this.context=null;this.nodes=new Set();this.ids=new Set();this.epoch=1;this.disposed=false;this.played=0;this.last=null;}
 async activate(){if(this.verify||this.disposed||!this.Context)return false;const epoch=this.epoch;this.context??=new this.Context({sampleRate:RATE});await this.context.resume();return !this.disposed&&epoch===this.epoch&&this.context.state==='running';}
 play(cause,ageMs){
  // First completed visible submission owns the sound. Late observers never replay the bang.
  if(cause?.type!=='grenade-stun-impact'||typeof cause.id!=='string'||!cause.id.trim()||this.verify||this.disposed||this.context?.state!=='running'||!Number.isFinite(ageMs)||ageMs<0||ageMs>=85||this.ids.has(cause.id))return false;
  if(this.ids.size>=4096)return false;
  const pcm=makePCM(),buffer=this.context.createBuffer(1,pcm.length,RATE);buffer.copyToChannel(pcm,0);
  const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);
  node.onended=()=>{this.nodes.delete(node);node.disconnect();};
  try{node.start(this.context.currentTime,ageMs/1000);this.nodes.add(node);this.ids.add(cause.id);this.played++;this.last={causeId:cause.id,offsetMs:ageMs};return true;}catch{node.disconnect();return false;}
 }
 cancel(){this.epoch++;for(const node of this.nodes){try{node.stop();node.disconnect();}catch{}}this.nodes.clear();}
 async dispose(){if(this.disposed)return;this.disposed=true;this.cancel();await this.context?.close();this.context=null;this.ids.clear();}
 snapshot(){return {verify:this.verify,contextState:this.context?.state??'not-created',played:this.played,last:this.last,nodes:this.nodes.size,disposed:this.disposed};}
}
