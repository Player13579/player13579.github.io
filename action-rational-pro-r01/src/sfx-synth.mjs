/** 原音素材を使わない新規SFX。純粋JS -> 同一PCMをWebAudio/WAVで使用。 */
const TAU=2*Math.PI;
const clamp=x=>Math.max(0,Math.min(1,x));
const ramp=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const hash=(i,seed)=>{let x=(i+seed)|0;x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);x=x^(x>>>16);return (x>>>0)/2147483648-1;};
export function synthesizeSFX(eventId,sampleRate=48000) {
  if(!['action-rational-free','action-ninjutsu-focus'].includes(eventId))throw new TypeError('未知SFX');
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
  const count=Math.round(1.2*sampleRate),left=new Float32Array(count),right=new Float32Array(count);
  let lo=0,mid=0,peak=0;
  const kind=eventId==='action-rational-free'?0:1;
  for(let i=0;i<count;i++){
    const t=i/sampleRate,noise=hash(i,kind?73291:19051);
    lo+=.035*(noise-lo);mid+=.26*(noise-mid);
    let body,side;
    if(kind===0){
      const q=Math.max(0,t-.032);
      const click=t>=.032?Math.exp(-q*83)*(.50*Math.sin(TAU*2870*q)+.31*(noise-mid)):0;
      const release=ramp(.075,.155,t)*Math.exp(-Math.max(0,t-.155)*9.8);
      const stable=.37*Math.sin(TAU*1187*t)+.24*Math.sin(TAU*1781*t+.3)+.11*Math.sin(TAU*2381*t);
      body=click+release*(stable+.15*(mid-lo));
      side=release*.052*Math.sin(TAU*1601*t+.7);
    }else{
      const tension=ramp(0,.10,t)*ramp(.05,.55,t)*(1-ramp(.64,1.095,t));
      const friction=(mid-lo)*(.25+.23*ramp(.12,.64,t));
      const string=.16*Math.sin(TAU*(186*t+14*t*t))+.09*Math.sin(TAU*(373*t+22*t*t)+.4);
      const air=(noise-mid)*.042;
      body=tension*(friction+string+air)+lo*.14*ramp(.0,.08,t)*(1-ramp(.4,.8,t));
      side=tension*.043*Math.sin(TAU*263*t+.9);
    }
    const endpoint=ramp(0,.006,t)*(1-ramp(1.12,1.19,t));
    left[i]=(body+side)*endpoint;right[i]=(body-side)*endpoint;
    peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  }
  // 設計上のheadroom。知覚音量・聴感の検証済みという意味ではない。
  const gain=.68/Math.max(peak,1e-9);
  for(let i=0;i<count;i++){left[i]*=gain;right[i]*=gain;}
  return {eventId,sampleRate,durationActorMs:1200,left,right,normalizationPeak:.68};
}
export function encodeWAV(pcm){
  const n=pcm.left.length,buf=new ArrayBuffer(44+n*4),v=new DataView(buf);
  const text=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');v.setUint32(4,36+n*4,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,pcm.sampleRate,true);v.setUint32(28,pcm.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,n*4,true);
  for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,pcm.left[i]))*32767),true);v.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,pcm.right[i]))*32767),true);}
  return new Uint8Array(buf);
}
