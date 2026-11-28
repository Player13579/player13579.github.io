export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.82));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
 for(let i=0;i<data.length;i++){
  const t=i/rate,k=Math.max(0,t-.31);
  const travel=smooth((t-.07)/.20)*(1-smooth((t-.35)/.14));
  const latch=smooth(k/.085)*(1-smooth((k-.11)/.32));
  if(!travel&&!latch)continue;
  data[i]=travel*.023*(Math.sin(2*Math.PI*(214*t+96*t*t))+.21*Math.sin(2*Math.PI*705*t))+
   latch*(.032*Math.sin(2*Math.PI*(370*k-60*k*k))+.011*Math.sin(2*Math.PI*904*k));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
