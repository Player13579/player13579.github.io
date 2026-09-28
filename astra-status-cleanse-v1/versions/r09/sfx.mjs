// Original Astra rising breath / released glass tone. Deterministic, no assets.
export function synthesize(sampleRate=48000,durationMs=1740){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isFinite(durationMs)||durationMs<900||durationMs>6000)throw Error('Invalid SFX dimensions');
 const length=Math.ceil(sampleRate*durationMs/1000);const out=[new Float32Array(length),new Float32Array(length)];let seed=91731;let noise=0;let phase=0;let peak=0;
 for(let i=0;i<length;i++){
  const p=i/(length-1),t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const raw=(seed/4294967296)*2-1;noise=noise*.84+raw*.16;
  const breath=Math.sin(Math.PI*Math.min(1,p/.68))**2*(p<.68?1:0);const air=.13*(raw-noise)*breath;
  const release=Math.max(0,p-.43),bell=release>0?(1-Math.exp(-release*70))*Math.exp(-release*7):0;
  phase+=2*Math.PI*(360+620*Math.min(1,p/.67))/sampleRate;
  const hum=Math.sin(phase)*.036*breath;
  const edge=(1-Math.exp(-p*120))*Math.min(1,(1-p)*60);
  for(let ch=0;ch<2;ch++){
   const tone=(Math.sin(2*Math.PI*(ch?1176:1174.66)*t)+.34*Math.sin(2*Math.PI*1760*t))*bell*.095;
   const s=(air*(ch?.84:1)+hum+tone)*edge;out[ch][i]=s;peak=Math.max(peak,Math.abs(s));
  }
 }
 return {channels:out,sampleRate,length,peak};
}
export class CleanseSound {
 constructor({context,sessionId,verify=false,destination=context.destination}){this.context=context;this.sessionId=sessionId;this.verify=verify;this.destination=destination;this.seen=new Set();this.active=new Map();this.starts=0;}
 start(receipt){if(this.verify||(this.context.state!=='running'&&typeof this.context.startRendering!=='function')||!receipt?.submitted||receipt.visible!==true||receipt.effectKind!=='statusRecovery'||receipt.sessionId!==this.sessionId||!receipt.causeId||!receipt.ownerId||!Number.isInteger(receipt.frameToken)||!Number.isFinite(receipt.durationMs)||receipt.durationMs<900||receipt.durationMs>6000||!Number.isFinite(receipt.elapsedMs)||receipt.elapsedMs<0||receipt.elapsedMs>=receipt.durationMs)return false;
  const key=receipt.ownerId+':'+receipt.causeId;if(this.seen.has(key))return false;this.seen.add(key);
  const wave=synthesize(this.context.sampleRate,receipt.durationMs);const b=this.context.createBuffer(2,wave.length,wave.sampleRate);wave.channels.forEach((c,i)=>b.copyToChannel(c,i));const source=this.context.createBufferSource();source.buffer=b;source.connect(this.destination);source.onended=()=>{source.disconnect();this.active.delete(key);};source.start(this.context.currentTime,receipt.elapsedMs/1000);this.active.set(key,source);this.starts++;return true;
 }
 enterSession(id){this.stop();this.sessionId=id;this.seen.clear();}
 stop(){for(const s of this.active.values()){s.stop();s.disconnect();}this.active.clear();}
}

