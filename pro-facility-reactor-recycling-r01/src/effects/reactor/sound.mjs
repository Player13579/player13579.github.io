/** A専用の一つの音。流入する低い倍音→開口の上昇→受け手の協和。無作為ノイズ・素材ファイルなし。 */
export function synthesizeReactor(sampleRate){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
  const length=Math.ceil(1.72*sampleRate),samples=new Float32Array(length);let phase=0;
  for(let n=0;n<length;n++){
    const t=n/sampleRate;
    const u=Math.min(1,t/.95);const frequency=138+116*u*u*(3-2*u);
    phase+=2*Math.PI*frequency/sampleRate;
    const attack=1-Math.exp(-t*46),tail=Math.exp(-Math.max(0,t-1.07)*8);
    const opening=(.45+.55*Math.sin(Math.min(1,t/.7)*Math.PI/2));
    const body=(Math.sin(phase)+.22*Math.sin(phase*2+.30*Math.sin(2*Math.PI*3.7*t)))*attack*tail*opening;
    const d=t-1.04;const lock=d>0?Math.sin(2*Math.PI*508*d)*Math.exp(-d*7)*(1-Math.exp(-d*110)):0;
    const edge=t<.085?Math.sin(2*Math.PI*(930*t-1650*t*t))*Math.sin(Math.PI*t/.085)**2:0;
    const ending=Math.min(1,Math.max(0,(1.72-t)/.045));
    samples[n]=(.29*body+.16*lock+.08*edge)*ending;
  }
  return {samples,sampleRate,durationMs:1720,cue:'reactor-aperture-transfer',causeSynchronized:true};
}
