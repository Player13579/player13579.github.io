export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.71));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u);};
 for(let i=0;i<data.length;i++){
  const t=i/rate, k=t-.33;
  const converge=smooth((t-.06)/.157)*(1-smooth((t-.32)/.048));
  const edge=smooth(k/.025)*(1-smooth((k-.043)/.19));
  if(converge||edge){
   const a=Math.sin(2*Math.PI*(242*t+299*t*t));
   const b=Math.sin(2*Math.PI*(468*t-182*t*t));
   const c=Math.sin(2*Math.PI*(551*k-230*k*k));
   data[i]=converge*(.027*a+.023*b)+edge*.032*c;
   peak=Math.max(peak,Math.abs(data[i]));
  }
 }
 return {data,peak};
}
