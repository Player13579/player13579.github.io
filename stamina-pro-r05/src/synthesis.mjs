/** source-boundな単一voice。phは原因の時計から来る0..1。乱数/音声assetなし。 */
export function sampleGainVoice(ph, carrierPhase) {
  if(ph<=0||ph>=1)return 0;
  const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
  const attack=smooth(0,.035,ph), end=1-smooth(.72,1,ph);
  const gather=smooth(.05,.40,ph), store=1-smooth(.42,.70,ph);
  // ばらけた倍音が一つの芯へ収束。旋律/発音列/周期的ビープではない。
  const fundamental=Math.sin(carrierPhase);
  const body=Math.sin(carrierPhase*2+.12*(1-gather));
  const entry=Math.sin(carrierPhase*3.03)*(1-gather);
  return .14*attack*end*(.65*fundamental+.21*body+ .14*entry*store);
}
export function voiceFrequency(ph) {
  const u=Math.max(0,Math.min(1,ph/.43));
  return 132+88*(u*u*(3-2*u));
}
export function renderPCM({sampleRate=48000,seconds=1.5,rate=1}={}) {
  if(!Number.isFinite(sampleRate)||sampleRate<=0||!Number.isFinite(seconds)||seconds<=0||!Number.isFinite(rate)||rate<=0)throw new RangeError('PCM settings');
  const a=new Float32Array(Math.ceil(sampleRate*seconds/rate)); let angle=0;
  for(let i=0;i<a.length;i++){const ph=i/sampleRate*rate/seconds;angle+=2*Math.PI*voiceFrequency(ph)/sampleRate;a[i]=sampleGainVoice(ph,angle);}
  return a;
}
