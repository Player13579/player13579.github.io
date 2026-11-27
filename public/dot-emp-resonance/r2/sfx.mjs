export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.925));let peak=0;
 const smooth=x=>{const u=Math.max(0,Math.min(1,x));return u*u*(3-2*u)};
 for(let i=0;i<data.length;i++){
  const t=i/rate,k=Math.max(0,t-.27);
  const fold=smooth((t-.067)/.137)*(1-smooth((t-.28)/.14));
  const joined=smooth(k/.111)*(1-smooth((k-.19)/.37));
  if(!fold&&!joined)continue;
  data[i]=fold*.018*(Math.sin(2*Math.PI*(230*t+22*t*t))+.65*Math.sin(2*Math.PI*(238*t-15*t*t)))+
          joined*(.035*Math.sin(2*Math.PI*(252*k-13*k*k))+.018*Math.sin(2*Math.PI*(498*k-9*k*k)));
  peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
