import {ARRIVALS,DURATION,verificationMode} from './contract.mjs';
const tau=2*Math.PI;
function envelope(x,attack,decay){return x<0?0:(1-Math.exp(-x/attack))*Math.exp(-x/decay);}
export function synthesize(rate=48000){
 if(!Number.isInteger(rate)||rate<8000||rate>192000)throw RangeError('sample rate');
 const a=new Float32Array(Math.ceil(DURATION*rate));let rng=0x4d414e41,low=0,high=0;
 const cLow=1-Math.exp(-tau*420/rate),cHigh=1-Math.exp(-tau*1800/rate);
 for(let i=0;i<a.length;i++){
  const t=i/rate;rng=(Math.imul(rng,1664525)+1013904223)>>>0;const noise=rng/2147483648-1;
  low+=cLow*(noise-low);high+=cHigh*(noise-high);
  let v=.085*envelope(t-.03,.042,.2)*(high-low);
  for(let j=0;j<3;j++){
   const x=t-ARRIVALS[j];if(x>=0){
    const base=[498,624,747][j],fall=72*(1-Math.exp(-14*x))/14;
    const mod=2.1*Math.exp(-21*x)*Math.sin(tau*base*1.37*x);
    v+=.14*envelope(x,.007,.118)*Math.sin(tau*(base*x+fall)+mod);
    v+=.021*envelope(x,.012,.05)*(high-low);
   }
   const lead=t-(ARRIVALS[j]-.25);
   if(lead>=0)v+=.026*envelope(lead,.05,.072)*Math.sin(tau*(245*lead+260*lead*lead));
  }
  const end=t-1.11;if(end>=0)v+=.031*envelope(end,.023,.072)*(Math.sin(tau*332*end)+.25*Math.sin(tau*831*end));
  const release=1-Math.min(1,Math.max(0,(t-1.2)/.2));a[i]=v*release*release;
 }
 return a;
}
export function encodeWav(samples,rate=48000){const b=new ArrayBuffer(44+samples.length*2),d=new DataView(b);function text(o,s){[...s].forEach((c,i)=>d.setUint8(o+i,c.charCodeAt(0)));}text(0,'RIFF');d.setUint32(4,b.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');d.setUint32(16,16,true);d.setUint16(20,1,true);d.setUint16(22,1,true);d.setUint32(24,rate,true);d.setUint32(28,rate*2,true);d.setUint16(32,2,true);d.setUint16(34,16,true);text(36,'data');d.setUint32(40,samples.length*2,true);samples.forEach((v,i)=>d.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,v))*32767),true));return new Uint8Array(b);}
export class ManaSound {
 constructor(search,factory=()=>new AudioContext()){this.verify=verificationMode(search);this.factory=factory;this.context=null;this.muted=false;this.seen=new Set();this.sources=new Set();this.sampleCache=null;}
 async enable(){if(this.verify)return false;this.context??=this.factory();await this.context.resume();return true;}
 play(receipt,elapsed=0){if(!receipt||!Number.isFinite(elapsed)||elapsed<0||this.seen.has(receipt.key))return false;this.seen.add(receipt.key);if(this.verify||this.muted||!this.context||this.context.state!=='running'||elapsed>.10)return false;
  if(this.sources.size>=4){const oldest=this.sources.values().next().value;try{oldest.stop();}catch{}this.sources.delete(oldest);}
  if(!this.sampleCache){const samples=synthesize(this.context.sampleRate);this.sampleCache=this.context.createBuffer(1,samples.length,this.context.sampleRate);this.sampleCache.copyToChannel(samples,0);}
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.sampleCache;gain.gain.value=.65;source.connect(gain).connect(this.context.destination);source.onended=()=>{source.disconnect();gain.disconnect();this.sources.delete(source);};this.sources.add(source);source.start(this.context.currentTime,elapsed);return true;
 }
 setMuted(v){this.muted=!!v;if(this.muted)this.stop();}
 stop(){for(const s of this.sources){try{s.stop();}catch{}}this.sources.clear();}
 reset(){this.stop();this.seen.clear();}
 async dispose(){this.reset();if(this.context)await this.context.close();this.context=null;this.sampleCache=null;}
}
