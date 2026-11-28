export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.65));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
 for(let i=0;i<data.length;i++){
  const t=i/rate;
  const env=smooth(t/.055)*(1-smooth((t-.075)/.49));
  if(!env)continue;
  data[i]=env*(.036*Math.sin(2*Math.PI*(432*t-127*t*t))+.010*Math.sin(2*Math.PI*(672*t-175*t*t)));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
