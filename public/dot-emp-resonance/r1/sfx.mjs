export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.97));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
 for(let i=0;i<data.length;i++){
   const t=i/rate,k=Math.max(0,t-.30);
   const pair=smooth((t-.07)/.14)*(1-smooth((t-.28)/.10));
   const band=smooth(k/.09)*(1-smooth((k-.20)/.38));
   if(!pair && !band)continue;
   data[i]=pair*.019*(Math.sin(2*Math.PI*(198*t+110*t*t))+Math.sin(2*Math.PI*(214*t+80*t*t)))+
       band*(.041*Math.sin(2*Math.PI*(280*k+41*k*k))+.023*Math.sin(2*Math.PI*(420*k+50*k*k)));
   peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
