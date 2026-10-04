export const AUDIO_MS=280;
export function synthesizeRailgun(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new Error('railgun-sample-rate');
 const data=new Float32Array(Math.ceil(sampleRate*AUDIO_MS/1000));let random=0x35bd7a91,previous=0,phase=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;random^=random<<13;random^=random>>>17;random^=random<<5;const noise=(random>>>0)/2147483648-1;
  const high=noise-previous*.72;previous=noise;const attack=Math.min(1,t/.0015);const end=Math.max(0,1-t/.28);
  phase+=2*Math.PI*(1600*Math.exp(-t*15)+155)/sampleRate;
  const crack=high*Math.exp(-t*90)*.32;
  const tone=(Math.sin(phase)+.24*Math.sin(phase*2.73))*Math.exp(-t*17)*.22;
  const tail=high*Math.exp(-t*19)*.065;
  data[i]=(crack+tone+tail)*attack*end*end;
 }return data;
}
export function createRailgunAudio({verify=false,muted=false}={}){
 let context=null,buffer=null,disposed=false;const seen=new Set(),live=new Map();
 return {
  async unlock(){if(verify||muted||disposed)return false;context??=new AudioContext();await context.resume();if(!buffer){const data=synthesizeRailgun(context.sampleRate);buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.copyToChannel(data,0);}return context.state==='running';},
  play(causeId,ageMs=0){if(disposed||verify||muted||seen.has(causeId))return false;if(typeof causeId!=='string'||!Number.isFinite(ageMs)||ageMs<0||ageMs>=AUDIO_MS)return false;if(!context||context.state!=='running')return false;seen.add(causeId);if(seen.size>4096)seen.delete(seen.values().next().value);const voice=context.createBufferSource();voice.buffer=buffer;const gain=context.createGain();gain.gain.value=.5;voice.connect(gain).connect(context.destination);live.set(causeId,{voice,gain});voice.onended=()=>{voice.disconnect();gain.disconnect();live.delete(causeId)};voice.start(0,ageMs/1000);return true;},
  cancel(causeId){const v=live.get(causeId);if(v){try{v.voice.stop()}catch{}v.voice.disconnect();v.gain.disconnect();live.delete(causeId)}},
  stop(){for(const id of [...live.keys()])this.cancel(id)},
  setMuted(value){muted=!!value;if(muted)this.stop()},
  snapshot(){return {verify,muted,unlocked:context?.state==='running',voices:live.size,seen:seen.size}},
  async dispose(){this.stop();disposed=true;await context?.close();buffer=null;context=null;}
 };
}
