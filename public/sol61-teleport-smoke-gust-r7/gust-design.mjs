// GPT-6.1-Sol: R6 one connected swept smoke spine, not seven independent clouds.
export const WIND=Object.freeze({baseSpeedHPerSecond:5.6,decayPerSecond:4.5,
  supportPaddingH:.025,gradientSupportXH:.075,gradientSupportHeightH:.065,
  maxTransportH:2.2,ellipsoidTiltAmplitude:0});
export const SEEDS=Object.freeze([
  [-.17,-.025,.10,.15,.17,.13],[-.12,-.020,.30,.21,.19,.19],
  [-.04,-.010,.52,.25,.21,.22],[.10,.005,.74,.27,.21,.23],
  [.23,.015,.95,.25,.20,.22],[.20,.020,1.15,.20,.17,.19],
  [.015,.015,1.24,.11,.12,.12]
].map(Object.freeze));
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function valid(t,p,h){if(![t,p,h].every(Number.isFinite)||t<0)throw TypeError('Finite gust inputs required');}
export function windVelocityHPerSecond(t,phase=0,heightH=0){valid(t,phase,heightH);return WIND.baseSpeedHPerSecond*Math.exp(-WIND.decayPerSecond*t);}
export function windDisplacementH(t,phase=0,heightH=0){valid(t,phase,heightH);return WIND.baseSpeedHPerSecond*(1-Math.exp(-WIND.decayPerSecond*t))/WIND.decayPerSecond;}
export function rollingFold(seedHeightH,t){valid(t,0,seedHeightH);const f=smooth(t/.14);return Object.freeze({xH:.48*f*Math.sin(1.9*seedHeightH),heightH:.08*f,depthH:0,tiltXZ:0,envelope:f,phase:1.9*seedHeightH});}
export function buildSmokeLobes(ageEms,role,phaseAt){
  if(typeof phaseAt!=='function')throw TypeError('Pinned parent phase function required');
  const p=phaseAt(ageEms,role);if(!p.active)return Object.freeze([]);
  const t=Math.max(0,(ageEms-(role==='arrival'?180:0))/1000);
  const f=smooth(t/.14),release=smooth((t-.14)/.35),stretch=1+.42*f;
  // Common transport and coherent height shear: every cross-section belongs to one flow.
  const drift=windDisplacementH(t),rise=.12*t;
  return Object.freeze(SEEDS.map((s,i)=>{
    const q=i/6,hook=smooth((q-.62)/.38);
    const x=drift+s[0]*stretch+.66*f*q-.37*f*hook;
    const z=s[2]+rise+.10*f*Math.sin(Math.PI*q)-.06*f*hook;
    const rx=s[3]*(1+.28*f+.22*release),ry=s[4]*(1+.10*f+.16*release),rz=s[5]*(1+.05*f+.12*release);
    // Cross-section expansion dilutes smoke; no independent pulsation or white emissive blobs.
    const density=p.smokeEnvelope*(1-.35*q)*s[3]*s[4]*s[5]/(rx*ry*rz);
    return Object.freeze({center:Object.freeze([x,s[1],z]),radius:Object.freeze([rx,ry,rz]),tiltXZ:0,density});
  }));
}
// Exact CPU counterpart of WGSL connected segment metric, for source checks.
export function smokeDensityAt(q,rows){let rho=0;for(let i=0;i<rows.length-1;i++){
  const a=rows[i],b=rows[i+1],metric=a.radius.map((v,j)=>(v+b.radius[j])*.5);
  const d=b.center.map((v,j)=>(v-a.center[j])/metric[j]);
  const v=q.map((x,j)=>(x-a.center[j])/metric[j]);
  const h=Math.max(0,Math.min(1,v.reduce((s,x,j)=>s+x*d[j],0)/Math.max(1e-6,d.reduce((s,x)=>s+x*x,0))));
  const center=a.center.map((v,j)=>v+(b.center[j]-v)*h),r=a.radius.map((v,j)=>v+(b.radius[j]-v)*h);
  const r2=q.reduce((s,v,j)=>s+((v-center[j])/r[j])**2,0);
  const taper=1-smooth((r2-.32)/.68);
  rho=Math.max(rho,(a.density+(b.density-a.density)*h)*taper);
}return q[2]<0?0:rho;}
