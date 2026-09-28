// A固有: 5次の開口、輸送の進行、増分の保持。Bの時間関数は使用しない。
const q=x=>{const u=Math.max(0,Math.min(1,x));return Math.max(0,Math.min(1,u*u*u*(u*(6*u-15)+10)));};
export function reactorState(ageMs,reducedMotion=false){
  const t=ageMs/1000;
  if(!Number.isFinite(t)||t<0||t>=2.2)return {visible:false,aperture:0,head:0,tail:0,received:0,source:0,release:0};
  const aperture=q((t-.03)/.39),head=q((t-.38)/.74),tail=Math.max(0,head-.34);
  const received=q((t-1.01)/.23),release=1-q((t-1.81)/.39);
  const source=(.3+.7*q(t/.18))*(1-q((t-.80)/.39));
  return {visible:true,aperture,head,tail,received,source,release,
    pathLift:reducedMotion?0:.30,lumaSource:source*(1.2+3.6*q((t-.13)/.20)),
    lumaReceiver:received*release*(2.8-.5*q((t-1.42)/.3))};
}
