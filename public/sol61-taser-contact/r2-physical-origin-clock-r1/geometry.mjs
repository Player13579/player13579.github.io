export const DURATION_MS = 480;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hash = (x) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
export const strikes = Object.freeze([[0,60],[85,140],[175,225],[270,320]]);
export function envelope(age, start, end) {
  if (age < start || age >= end) return 0;
  const q = (age-start)/(end-start);
  return Math.min(1, q*9) * Math.exp(-q*2.8);
}
export function contactGeometry({ageMs, seed=1, actorHeight=64, reducedMotion=false}) {
  if (!Number.isFinite(ageMs) || !Number.isFinite(actorHeight) || actorHeight <= 0 || ageMs < 0 || ageMs >= DURATION_MS) return new Float32Array();
  const rows=[]; const scale=actorHeight/64;
  const add=(a,b,width,power)=>rows.push(a[0]*scale,a[1]*scale,b[0]*scale,b[1]*scale,width*scale,power,0,0);
  for(let s=0;s<strikes.length;s++) {
    const [begin,end]=strikes[s];
    // Finite channel recombination, not a free-floating particle tail.
    const active=envelope(ageMs,begin,end);
    const residual=ageMs>=end ? Math.exp(-2.8)*Math.exp(-(ageMs-end)/42)*(1-clamp((ageMs-380)/100,0,1)) : 0;
    const energy=active+residual;
    // Preserve the continuous recombination tail until its authored boundary.
    // A geometry threshold would cut the last channels off before 480 ms.
    if(energy<=0) continue;
    for(let branch=0;branch<4;branch++) {
      const key=(seed>>>0)+s*391+branch*71;
      const angle=branch*Math.PI/2+0.30+(hash(key)-.5)*.55;
      const length=(10+hash(key+1)*9)*(reducedMotion?.82:1);
      let previous=[0,0];
      for(let j=1;j<=6;j++) {
        const u=j/6;
        const lateral=(hash(key+j*19)-.5)*5.2*Math.sin(u*Math.PI);
        const p=[Math.cos(angle)*length*u-Math.sin(angle)*lateral, Math.sin(angle)*length*u+Math.cos(angle)*lateral];
        add(previous,p, .65*(1-u*.48), energy*(1-u*.62)*7.5);
        if(j===3 && branch%2===0) {
          const fork=[p[0]+Math.cos(angle+.8)*length*.28,p[1]+Math.sin(angle+.8)*length*.28];
          add(p,fork,.36,energy*1.8);
        }
        previous=p;
      }
    }
  }
  return Float32Array.from(rows);
}
export function admitContact(event, now, viewer, target) {
  return !!event && event.kind==='action-taser' && !event.variant &&
    typeof event.id==='string' && event.id.length>0 &&
    Number.isFinite(event.startedAt) && Number.isFinite(now) &&
    now>=event.startedAt && now-event.startedAt<DURATION_MS &&
    Number.isFinite(event.x) && Number.isFinite(event.y) &&
    !!target && target.id===event.targetId && target.visible===true && target.hidden!==true &&
    !target.inVent && !target.ejected && (!target.invisible || target.id===viewer);
}
