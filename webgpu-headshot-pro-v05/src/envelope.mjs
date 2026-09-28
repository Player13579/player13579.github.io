/** v5 新規の単一設計。武器/構え/id/乱数で形態・寿命・SFXを選択しない。 */
export const CONTACT=Object.freeze({name:'接触核と返り襞',durationMs:560,soundMs:210});
export const clamp01=x=>Math.min(1,Math.max(0,x));
export const smooth=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
export function sampleContact(ageMs,reducedMotion=false){
  const raw=ageMs/CONTACT.durationMs,u=Number.isFinite(raw)?clamp01(raw):1;
  if(!Number.isFinite(ageMs)||raw<=0||raw>=1)return Object.freeze({u,body:0,source:0,spread:0,fold:0,pressure:0,phase:'absent'});
  const attack=smooth(0,.032,u);
  const body=attack*(1-smooth(.64,1,u));
  // フル強度の線形放射。露光制御・白飛び回避のsoft knee・上限正規化は行わない。
  const source=32*attack*Math.exp(-5.2*Math.max(0,u-.065))*(1-smooth(.74,.98,u));
  const pressure=reducedMotion?.75:attack*(1-smooth(.05,.25,u));
  const spread=reducedMotion?.82:smooth(.018,.28,u)*(1-.16*smooth(.78,1,u));
  const fold=reducedMotion?.58:smooth(.10,.55,u)*(1-.20*smooth(.82,1,u));
  return Object.freeze({u,body,source,spread,fold,pressure,phase:u<.075?'接触核':u<.30?'圧縮膜の展開':u<.68?'返り襞': '局所消散'});
}
