export const DURATIONS={create:.65,hit:.52,break:.48};
export function synthesize(kind,rate=48000){
 const duration=DURATIONS[kind];if(!duration)throw Error('unknown SFX');
 const result=new Float32Array(Math.ceil(duration*rate));let p=0,q=0,seed=713;
 for(let i=0;i<result.length;i++){
  const t=i/rate,u=t/duration;
  const attack=Math.min(1,t/.008);const tail=Math.pow(Math.max(0,1-u),2.3);
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296*2-1;
  let v=0;
  if(kind==='create'){
   const f=170+90*Math.min(1,t/.28);p+=2*Math.PI*f/rate;q+=2*Math.PI*(740-420*Math.min(1,t/.34))/rate;
   const join=Math.exp(-Math.pow((t-.18)/.055,2));
   v=(Math.sin(p)+.32*Math.sin(p*2.002)+.16*Math.sin(q+.55*Math.sin(p)))*.2*tail+join*(.045*noise+.055*Math.sin(q*1.71));
  }else if(kind==='hit'){
   p+=2*Math.PI*(220+410*Math.exp(-t*35))/rate;
   v=.3*Math.sin(p)*Math.exp(-t*14)+.12*Math.sin(p*2.43)*Math.exp(-t*10)+.04*noise*Math.exp(-t*45);
  }else{
   p+=2*Math.PI*(380-290*u)/rate;q+=2*Math.PI*(880-570*u)/rate;
   v=.16*Math.sin(p)*tail+.07*Math.sin(q+.6*Math.sin(p))*tail+.065*noise*Math.exp(-t*14)*tail;
  }
  result[i]=v*attack*Math.min(1,(duration-t)/.015);
 }
 return result;
}
export function wavBytes(kind){const data=synthesize(kind);const buffer=new ArrayBuffer(44+data.length*2),v=new DataView(buffer);const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};str(0,'RIFF');v.setUint32(4,36+data.length*2,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.length*2,true);data.forEach((n,i)=>v.setInt16(44+i*2,Math.round(n*32767),true));return new Uint8Array(buffer);}
export class BarrierSfx{
 constructor(verify){this.verify=verify;this.enabled=false;this.seen=new Set();this.voices=new Set();}
 async setEnabled(enabled){this.enabled=!!enabled&&!this.verify;if(!this.enabled){for(const voice of this.voices)voice.stop();this.voices.clear();return false;}this.ctx??=new AudioContext();await this.ctx.resume();return true;}
 play(kind,causeId){if(!this.enabled||this.verify||this.seen.has(causeId))return false;this.seen.add(causeId);const data=synthesize(kind,this.ctx.sampleRate),buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);buffer.copyToChannel(data,0);const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=.65;source.connect(gain).connect(this.ctx.destination);this.voices.add(source);source.onended=()=>{this.voices.delete(source);gain.disconnect();source.disconnect();};source.start();return true;}
 dispose(){this.setEnabled(false);this.ctx?.close();}
}
