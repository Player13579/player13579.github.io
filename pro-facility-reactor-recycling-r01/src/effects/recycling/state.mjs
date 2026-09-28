// B固有: 圧縮→3区画を順に押出し→受領で矩形が固定→閉じる。Aの5次関数は使用しない。
const sat=x=>Math.max(0,Math.min(1,x));
const cosine=x=>(1-Math.cos(Math.PI*sat(x)))/2;
export function recyclingState(ageMs,reducedMotion=false){
  const t=ageMs/1000;
  if(!Number.isFinite(t)||t<0||t>=2.2)return {visible:false,compression:0,packets:[],count:0,close:0};
  const compression=cosine(t/.28)*(1-cosine((t-.43)/.29));
  const packets=Array.from({length:3},(_,i)=>{
    const start=.36+i*.18,arrival=.92+i*.18;
    const travel=sat((t-start)/(arrival-start));
    const arrived=t>=arrival;
    return {start,arrival,travel,arrived,active:t>=start,deposit:cosine((t-arrival)/.12)};
  });
  const close=1-cosine((t-1.82)/.38);
  return {visible:true,compression,packets,count:packets.filter(p=>p.arrived).length,close,
    compressionRadiance:1.0+5.4*Math.sin(Math.PI*sat(t/.44))**2,
    transverseMotion:reducedMotion?0:1};
}
