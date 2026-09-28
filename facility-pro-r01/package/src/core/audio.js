import {LIFETIME_MS} from './contracts.js';
/** 各receiptにつき1本のAudioBufferSource。未解錠音声を後から蓄積再生しない。 */
export class SoundOwner {
 constructor({context=null,synths={},maxVoices=3,enabled=false}={}) {
  this.context=context;this.synths=synths;this.maxVoices=Math.min(3,Math.max(1,Math.floor(maxVoices)));this.enabled=enabled;this.seen=new Set();this.voices=new Map();this.records=[];this.sourceCount=0;this.cache=new Map();
 }
 async unlock() {
  if(!this.context) this.context=new (globalThis.AudioContext||globalThis.webkitAudioContext)();
  await this.context.resume(); this.enabled=true;return this.context.state;
 }
 play(effect,ageMs=0) {
  const cause=effect.receipt.objectCausalId;
  if(this.seen.has(cause)) return 'duplicate';
  this.seen.add(cause);
  const log=status=>{this.records.push({cause,owner:effect.soundOwner,status});return status;};
  if(ageMs<0||ageMs>=LIFETIME_MS)return log('expired');
  if(!this.enabled||!this.context||this.context.state!=='running')return log('not_played_no_user_audio_unlock');
  if(this.voices.size>=this.maxVoices)return log('not_played_voice_limit_no_fallback_overlap');
  const fn=this.synths[effect.key]; if(!fn)return log('not_played_missing_synth');
  let buffer=this.cache.get(effect.key);
  if(!buffer){const wave=fn(this.context.sampleRate);buffer=this.context.createBuffer(2,wave.left.length,wave.sampleRate);buffer.copyToChannel(wave.left,0);buffer.copyToChannel(wave.right,1);this.cache.set(effect.key,buffer);}
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;
  // 遅延到着も先頭からやり直さない。位相途中のstartに5msフェードを付ける。
  const start=this.context.currentTime,remaining=(LIFETIME_MS-ageMs)/1000;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(0.8,start+Math.min(.005,remaining/3));
  gain.gain.setValueAtTime(0.8,start+Math.max(Math.min(.005,remaining/3),remaining-.014));gain.gain.linearRampToValueAtTime(0,start+remaining);
  source.connect(gain);gain.connect(this.context.destination);source.start(start,ageMs/1000,remaining);source.stop(start+remaining+.001);
  this.sourceCount++;this.voices.set(cause,{source,gain});source.onended=()=>{this.voices.delete(cause);source.disconnect();gain.disconnect();};
  return log('scheduled_one_buffer');
 }
 stopAll(){for(const {source} of this.voices.values()){try{source.stop();}catch{}}this.voices.clear();}
 setEnabled(value){this.enabled=Boolean(value);if(!this.enabled)this.stopAll();}
}
