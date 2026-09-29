export const DURATIONS={create:.65,hit:.52,break:.48};
export function synthesize(kind,rate=48000){
 const duration=DURATIONS[kind];if(!duration)throw Error('unknown SFX');const data=new Float32Array(Math.ceil(duration*rate));const phases=[0,0,0,0];let noiseState=0;let seed=911;
 for(let i=0;i<data.length;i++){
  const t=i/rate;const u=t/duration;const onset=Math.min(1,t/.012);const final=Math.min(1,(duration-t)/.022);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;noiseState+=.14*(noise-noiseState);const band=noise-noiseState;
  let sample=0;
  if(kind==='create'){
   const settle=Math.min(1,t/.32);const freqs=[126+24*settle,296-38*settle,622-108*settle,1050-250*settle];for(let j=0;j<4;j++)phases[j]+=2*Math.PI*freqs[j]/rate;
   const wall=Math.pow(1-u,2.2);const junction=Math.exp(-Math.pow((t-.245)/.075,2));sample=(.19*Math.sin(phases[0])+.065*Math.sin(phases[1])+.03*Math.sin(phases[2]+.32*Math.sin(phases[0])))*wall+junction*(.04*Math.sin(phases[3])+.018*band);
  }else if(kind==='hit'){
   const base=204+126*Math.exp(-t*32);const ratios=[1,1.51,2.27,3.38];for(let j=0;j<4;j++)phases[j]+=2*Math.PI*base*ratios[j]/rate;
   const modes=[.23,.095,.048,.025];for(let j=0;j<4;j++)sample+=modes[j]*Math.sin(phases[j])*Math.exp(-t*(12+j*5));sample+=.06*band*Math.exp(-t*52);
  }else{
   const freqs=[218-142*u,410-230*u,720-450*u,1210-680*u];for(let j=0;j<4;j++)phases[j]+=2*Math.PI*freqs[j]/rate;const fade=Math.pow(1-u,2.1);sample=(.14*Math.sin(phases[0])+.062*Math.sin(phases[1])+.026*Math.sin(phases[2])+.035*band*Math.exp(-t*11))*fade;
  }
  data[i]=sample*onset*final;
 }
 return data;
}
export function wavBytes(kind){const pcm=synthesize(kind);const buffer=new ArrayBuffer(44+pcm.length*2),v=new DataView(buffer);const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+pcm.length*2,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length*2,true);pcm.forEach((n,i)=>v.setInt16(44+i*2,Math.round(n*32767),true));return new Uint8Array(buffer);}
export class BarrierSfx{
 constructor(verify){this.verify=verify;this.enabled=false;this.seen=new Set();this.voices=new Set();}
 async setEnabled(enabled){this.enabled=!!enabled&&!this.verify;if(!this.enabled){for(const voice of this.voices)voice.stop();this.voices.clear();return false;}this.ctx??=new AudioContext();await this.ctx.resume();return true;}
 play(kind,causeId){if(!this.enabled||this.verify||this.seen.has(causeId))return false;this.seen.add(causeId);const pcm=synthesize(kind,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,pcm.length,this.ctx.sampleRate);buffer.copyToChannel(pcm,0);const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=.65;source.connect(gain).connect(this.ctx.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);gain.disconnect();source.disconnect();};source.start();return true;}
 dispose(){this.setEnabled(false);this.ctx?.close();}
}
