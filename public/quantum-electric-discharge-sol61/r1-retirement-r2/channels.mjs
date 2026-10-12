// Initial creative design: GPT-6.1-Sol. Screen-space single-target discharge.
export const DURATION_MS = 1050;
export const INSTANCE_CAPACITY = 128;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
const hash = n => {
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

export function dischargeChannels({ ageMs, source, target, seed = 1, actorHeight = 64,
  reducedMotion = false, sourceVisible = false, targetVisible = false } = {}) {
  if (!Number.isFinite(ageMs) || ageMs <= 0 || ageMs >= DURATION_MS ||
      !Number.isFinite(actorHeight) || actorHeight <= 0 || sourceVisible !== true || targetVisible !== true ||
      !Array.isArray(source) || !Array.isArray(target) || source.length !== 2 || target.length !== 2 ||
      !source.every(Number.isFinite) || !target.every(Number.isFinite)) return new Float32Array();
  const dx = target[0]-source[0], dy = target[1]-source[1], distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.01) return new Float32Array();
  const tangent = [dx/distance, dy/distance], normal = [-tangent[1], tangent[0]];
  const scale = actorHeight/64, rows = [], causeSeed = seed >>> 0;
  const endFade = 1-smooth((ageMs-780)/270);
  const charge = smooth(ageMs/24) * Math.exp(-Math.max(0,ageMs-42)/55) * endFade;
  const leader = smooth((ageMs-42)/118);
  const returnFront = smooth((ageMs-160)/60);
  const returnOnset = smooth((ageMs-160)/8);
  const stroke = returnOnset * Math.exp(-Math.max(0,ageMs-160)/145) * endFade;
  const add = (a,b,width,power) => {
    if (power <= 0) return;
    // Validate the coordinates actually uploaded to the GPU, after Float32 narrowing.
    const ax=Math.fround(a[0]), ay=Math.fround(a[1]);
    const bx=Math.fround(b[0]), by=Math.fround(b[1]);
    const segmentLength = Math.hypot(bx-ax,by-ay);
    if (segmentLength <= 1e-7) return;
    const formation = Math.min(1, segmentLength/(width*scale*2));
    rows.push(ax,ay,bx,by,width*scale,power*formation,0,0);
  };
  const point = (u, lateral = 0) => [source[0]+dx*u+normal[0]*lateral,
    source[1]+dy*u+normal[1]*lateral];

  // One seeded conductor: it neither retargets nor becomes a chain/AoE attack.
  const count = 28, wander = Math.min(distance*.026, 7*scale) * (reducedMotion ? .65 : 1);
  const knot = i => {
    const u = i/count;
    const lateral = i===0 || i===count ? 0 :
      (hash(causeSeed+i*199)-.5)*2*wander*Math.sin(Math.PI*u);
    return point(u,lateral);
  };
  for (let i=0;i<count;i++) {
    const u0=i/count, u1=(i+1)/count;
    if (leader<=u0) break;
    const a=knot(i), fullB=knot(i+1), fraction=clamp((leader-u0)/(u1-u0));
    const b=[a[0]+(fullB[0]-a[0])*fraction,a[1]+(fullB[1]-a[1])*fraction];
    const middle=(u0+Math.min(u1,leader))*.5;
    const leadingTip = Math.exp(-Math.pow((leader-middle)/.065,2));
    const returnBand = Math.exp(-Math.pow((1-returnFront-middle)/.10,2));
    const leadPower = (.16+.90*leadingTip) * (1-returnOnset);
    const power=(leadPower + stroke*(.75+1.25*returnBand))*endFade;
    add(a,b,.48+.38*stroke,power*7);
    // Sparse field-aligned offshoots remain attached to this conductor.
    if (i%5===2 && fraction===1) {
      const sign=hash(causeSeed+i*89)>.5?1:-1;
      const forkGrowth=smooth((leader-u1)*count*2+Math.max(0,ageMs-160)/8);
      const length=(3+hash(causeSeed+i*17)*6)*scale*forkGrowth;
      const fork=[b[0]+tangent[0]*length*.4+normal[0]*length*sign,
        b[1]+tangent[1]*length*.4+normal[1]*length*sign];
      add(b,fork,.30,power*.75*forkGrowth);
    }
  }

  // Caster field formation precedes leader growth; no decorative permanent ring.
  for(let i=0;i<6;i++) {
    const angle=i*Math.PI/3+.18;
    const a=[source[0]+Math.cos(angle)*2*scale,source[1]+Math.sin(angle)*2*scale];
    const b=[source[0]+Math.cos(angle)*(5+hash(causeSeed+i*31)*3)*scale,
      source[1]+Math.sin(angle)*(5+hash(causeSeed+i*31)*3)*scale];
    add(a,b,.42,charge*3.2);
  }
  // Local terminal corona exists only after the leader reaches the one endpoint.
  if(ageMs>=160) for(let i=0;i<8;i++) {
    const angle=i*Math.PI/4+(hash(causeSeed+i*53)-.5)*.35;
    const radius=(4+hash(causeSeed+i*97)*5)*scale;
    const bend=[target[0]+Math.cos(angle+.3)*radius*.55,target[1]+Math.sin(angle+.3)*radius*.55];
    const tip=[target[0]+Math.cos(angle)*radius,target[1]+Math.sin(angle)*radius];
    add(target,bend,.55,stroke*4.0);
    add(bend,tip,.32,stroke*2.2);
  }
  if(rows.length/8>INSTANCE_CAPACITY) throw new RangeError('Discharge channel capacity exceeded');
  return Float32Array.from(rows);
}
