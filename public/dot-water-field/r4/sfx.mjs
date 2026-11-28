// One finite broadening slosh, no sound from visual loops or areas after onset.
export function fillSfx(rate){
 if(!Number.isFinite(rate)||rate<8000||rate>192000)throw RangeError('audio rate');
 const data=new Float32Array(Math.round(rate*.61)),tau=2*Math.PI;
 const a=1-Math.exp(-tau*310/rate),b=1-Math.exp(-tau*1220/rate),c=1-Math.exp(-tau*3230/rate);
 const dc=Math.exp(-tau*55/rate);
 let seed=0x4bc883ef,low=0,mid=0,hi=0,prev=0,carry=0,peak=0;
 for(let i=0;i<data.length;i++){
   const t=i/rate;
   seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
   const rand=(seed>>>0)/2147483648-1;low+=(rand-low)*a;mid+=(rand-mid)*b;hi+=(rand-hi)*c;
   const gush=(mid-low)*1.9,skim=(hi-mid)*1.43;
   const u=t-.035;
   let air=0;
   if(u>=0){
    const onset=1-Math.exp(-u*118);
    const body=onset*Math.exp(-u*8.7),rim=onset*Math.exp(-u*26);
    const roll=Math.sin(tau*(191*u-108*u*u))*.68+Math.sin(tau*(335*u-129*u*u))*.32;
    air+=rim*(.083*skim+.090*gush)+body*(.070*gush+.051*roll);
   }
   const q=dc*(carry+air-prev);carry=q;prev=air;
   const tail=Math.max(0,Math.min(1,(data.length-1-i)/(rate*.078)));
   data[i]=q*tail*tail*(3-2*tail);peak=Math.max(peak,Math.abs(data[i]));
 }
 return {data,peak};
}
