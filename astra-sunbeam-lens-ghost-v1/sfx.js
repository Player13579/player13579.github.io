// 決定論的な集光→射出→有限残響。実際の命中が無いので命中音は作らない。
export const SAMPLE_RATE=48000;
export function createPCM(rate=SAMPLE_RATE){
 const a=new Float32Array(Math.ceil(rate*1.72));let seed=8411,low=0,phase=0;
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
 for(let i=0;i<a.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;low+=.16*(n-low);
  const charge=smooth(0,.11,t)*(1-smooth(.17,.25,t));const fire=smooth(.17,.24,t)*(1-smooth(.92,1.58,t));
  phase+=2*Math.PI*(220+270*smooth(0,.23,t))/rate;
  const tone=Math.sin(phase)*.085+Math.sin(phase*2.006)*.027+Math.sin(phase*3)*.008;
  const burst=Math.exp(-Math.pow((t-.215)/.038,2))*.11*(n-low);
  a[i]=(charge*(Math.sin(phase)*.07+low*.026)+fire*(tone+low*.075)+burst)*(1-smooth(1.58,1.72,t));
 }return a;
}
export function createSound({verify=false}={}){let context=null,active=null;const played=new Set();return {
 async play(id){if(verify||new URLSearchParams(location.search).has('verify')||played.has(id))return false;
  context??=new AudioContext();await context.resume();if(context.state!=='running')return false;played.add(id);
  const samples=createPCM(context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate);buffer.copyToChannel(samples,0);
  const node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);node.start();active=node;return true;
 },stop(){active?.stop();active=null},async dispose(){active?.stop();active=null;await context?.close();context=null}
};}
