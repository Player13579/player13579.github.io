import {COIN_RELEASE_MS,DURATION_MS,validateReceipt} from './plan.mjs';
// Fresh UI sonification of a settled payment. No old Donation audio input.
// Metallic resonance means digital currency feedback, not invented collisions.
export const SCORE=Object.freeze([
 Object.freeze({offsetMs:0,durationMs:130,kind:'card-commit',gain:.028,frequencies:[540,920]}),
 ...COIN_RELEASE_MS.map((offsetMs,index)=>Object.freeze({offsetMs:offsetMs+45,durationMs:120,kind:'coin-release',gain:.010,frequencies:[1120+index*35,1790+index*46,2460+index*61]})),
 Object.freeze({offsetMs:1700,durationMs:230,kind:'intake-confirmed',gain:.024,frequencies:[880,1327,2130]})
]);
export class DonationSound {
 #verify;
 constructor({verify=false,contextFactory=null}={}){this.#verify=Boolean(verify);this.contextFactory=contextFactory;this.context=null;this.master=null;this.enabled=false;this.disposed=false;this.nodes=new Set();this.receipts=new Set();this.epoch=0;}
 async activateFromGesture(){
  if(this.#verify||this.disposed)return false;
  try{
   if(!this.context){const C=globalThis.AudioContext??globalThis.webkitAudioContext;if(!this.contextFactory&&!C)return false;this.context=this.contextFactory?this.contextFactory():new C();this.master=this.context.createGain();this.master.gain.value=.75;this.master.connect(this.context.destination);}
   const epoch=this.epoch;await this.context.resume();
   if(this.disposed||this.#verify||epoch!==this.epoch||this.context.state!=='running')return false;
   this.enabled=true;return true;
  }catch{return false;}
 }
 start(value,{ageMs=0}={}){
  if(this.disposed||this.#verify||!this.enabled||!this.context||this.context.state!=='running')return false;
  const receipt=validateReceipt(value);if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=DURATION_MS||this.receipts.has(receipt.id)||this.receipts.size>=4096)return false;
  this.receipts.add(receipt.id);const base=this.context.currentTime;
  for(const cue of SCORE){
   // No overdue-cue catch-up burst on resume or a late first draw.
   if(cue.offsetMs<ageMs)continue;
   const start=base+(cue.offsetMs-ageMs)/1000,end=start+cue.durationMs/1000;
   const envelope=this.context.createGain();envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(cue.gain,start+.012);envelope.gain.exponentialRampToValueAtTime(.0001,end-.005);envelope.gain.linearRampToValueAtTime(0,end);envelope.connect(this.master);
   const record={nodes:[envelope],oscillators:[],end};this.nodes.add(record);
   cue.frequencies.forEach((frequency,index)=>{
    const oscillator=this.context.createOscillator(),partial=this.context.createGain();oscillator.type='sine';
    oscillator.frequency.setValueAtTime(frequency,start);if(cue.kind==='card-commit')oscillator.frequency.exponentialRampToValueAtTime(frequency*1.16,end);
    partial.gain.value=1/(index+1)**1.5;oscillator.connect(partial);partial.connect(envelope);
    record.nodes.push(oscillator,partial);record.oscillators.push(oscillator);
    oscillator.onended=()=>{try{oscillator.disconnect();partial.disconnect();}catch{}if(record.oscillators.every(o=>o===oscillator||o._donationEnded)){try{envelope.disconnect();}catch{}this.nodes.delete(record);}oscillator._donationEnded=true;};
    oscillator.start(start);oscillator.stop(end);
   });
  }
  return true;
 }
 cancel(){this.epoch++;for(const record of this.nodes){for(const oscillator of record.oscillators){try{oscillator.stop();}catch{}}for(const node of record.nodes){try{node.disconnect();}catch{}}}this.nodes.clear();}
 async dispose(){if(this.disposed)return;this.disposed=true;this.enabled=false;this.cancel();this.receipts.clear();try{await this.context?.close();}catch{}this.master=null;this.context=null;}
 snapshot(){return {verify:this.#verify,enabled:this.enabled,disposed:this.disposed,activeCues:this.nodes.size,receiptCount:this.receipts.size};}
}
