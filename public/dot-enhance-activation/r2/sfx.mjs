export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.82));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
 for(let i=0;i<data.length;i++){
  const t=i/rate,k=Math.max(0,t-.28);
  const travel=smooth((t-.095)/.16)*(1-smooth((t-.35)/.14));
  const latch=smooth(k/.085)*(1-smooth((k-.11)/.32));
  if(!travel&&!latch)continue;
  data[i]=travel*.023*(Math.sin(2*Math.PI*(335*t+182*t*t))+.21*Math.sin(2*Math.PI*705*t))+
   latch*(.039*Math.sin(2*Math.PI*(525*k-36*k*k))+.011*Math.sin(2*Math.PI*791*k));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
