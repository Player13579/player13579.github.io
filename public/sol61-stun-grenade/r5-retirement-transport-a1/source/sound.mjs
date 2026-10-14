export const RATE=48000;
export const SOUND_MS=380;
export const SOUND_DESIGN=Object.freeze({edition:5,mechanism:'synthesized pressure impulse, finite vent turbulence and steel casing modes',recorded:false});
export function makePCM(){
 const pcm=new Float32Array(RATE*SOUND_MS/1000);let state=0x6f821b49,low=0,prior=0;
 for(let i=0;i<pcm.length;i++){
  const t=i/RATE;state^=state<<13;state^=state>>>17;state^=state<<5;
  const noise=(state>>>0)/4294967296*2-1;low+=.19*(noise-low);
  const high=noise-low,attack=1-Math.exp(-t/.00065);
  const pressure=(low*.72+Math.sin(2*Math.PI*88*t)*.36)*Math.exp(-t/.035);
  const ventAttack=1-Math.exp(-t/.003),vent=high*ventAttack*(.48*Math.exp(-t/.026)+.20*Math.exp(-t/.078));
  const steel=(.095*Math.sin(2*Math.PI*1740*t)+.045*Math.sin(2*Math.PI*2630*t))*Math.exp(-t/.063);
  const tail=Math.pow(Math.max(0,1-t/.380),2),raw=.86*attack*(pressure+vent+steel)*tail;
  const value=raw-prior+.997*(i?pcm[i-1]:0);prior=raw;pcm[i]=value;
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
