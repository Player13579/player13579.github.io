/** B専用。機械的な圧縮の短い擦過、押出し、3区画の着座が一つの有限PCM内で起こる。 */
export function synthesizeRecycling(sampleRate){
  if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
  const length=Math.ceil(1.62*sampleRate),samples=new Float32Array(length);
  for(let n=0;n<length;n++){
    const t=n/sampleRate;
    const gate=t<.34?Math.sin(Math.PI*t/.34)**2:0;
    const compression=.18*gate*(Math.sin(2*Math.PI*(91*t+24*t*t))+.34*Math.sin(2*Math.PI*731*t)*Math.sin(2*Math.PI*83*t));
    let extrusion=0,deposit=0;
    for(let i=0;i<3;i++){
      const e=t-(.36+i*.18);
      if(e>=0&&e<.10)extrusion+=.15*Math.sin(Math.PI*e/.10)*Math.exp(-e*18)*Math.sin(2*Math.PI*(760-90*i)*e);
      const d=t-(.92+i*.18);
      if(d>=0&&d<.32){
        const attack=Math.min(1,d/.004),decay=Math.exp(-d*20);
        deposit+=.20*attack*decay*(Math.sin(2*Math.PI*(420+75*i)*d)+.28*Math.sin(2*Math.PI*(1117+93*i)*d));
      }
    }
    samples[n]=(compression+extrusion+deposit)*Math.min(1,Math.max(0,(1.62-t)/.035));
  }
  return {samples,sampleRate,durationMs:1620,cue:'recycling-press-three-seats',causeSynchronized:true};
}
