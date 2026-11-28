// One brief surface compression with a weak elastic return, no looping bed.
export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.61)),tau=2*Math.PI;
 const a=1-Math.exp(-tau*408/rate),b=1-Math.exp(-tau*1930/rate),dc=Math.exp(-tau*54/rate);
 let seed=0x6d031ca7,low=0,high=0,p=0,last=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate-.024;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const x=(seed>>>0)/2147483648-1;low+=(x-low)*a;high+=(x-high)*b;
  let signal=0;
  if(t>=0){
   const push=(1.-Math.exp(-t*174))*Math.exp(-t*16.5);
   const u=Math.max(0,t-.087);
   const returnMotion=(1.-Math.exp(-u*101))*Math.exp(-u*11.);
   const film=.128*(high-low)*push;
   const base=.076*Math.sin(tau*(258*t-199*t*t))*push;
   const tail=.043*Math.sin(tau*(147*u+22*u*u))*returnMotion;
   signal=film+base+tail;
  }
  const filtered=dc*(last+signal-p);last=filtered;p=signal;
  const f=Math.max(0,Math.min(1,(data.length-1-i)/(rate*.078)));
  data[i]=filtered*f*f*(3.-2.*f);peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
