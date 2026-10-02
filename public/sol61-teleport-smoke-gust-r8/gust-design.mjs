// GPT-6.1-Sol R8. Finite transported folded smoke, two entrained air mouths.
export const WIND=Object.freeze({baseSpeedHPerSecond:6.8,decayPerSecond:5.8,supportPaddingH:.025,gradientSupportXH:.075,gradientSupportHeightH:.065,maxTransportH:2.2,ellipsoidTiltAmplitude:0});
export const SEEDS=Object.freeze([
 [-.28,-.025,.08,.18,.13,.13],[-.06,-.020,.27,.29,.18,.17],
 [.34,-.010,.46,.34,.19,.18],[.18,.005,.68,.29,.20,.18],
 [-.24,.015,.90,.32,.19,.19],[-.02,.020,1.10,.25,.15,.16],
 [.38,.015,1.23,.13,.10,.11]
].map(Object.freeze));
const sat=x=>Math.max(0,Math.min(1,x)),S=(a,b,x)=>{const t=sat((x-a)/(b-a));return t*t*(3-2*t);};
function valid(t,p=0,h=0){if(![t,p,h].every(Number.isFinite)||t<0)throw TypeError('Finite gust inputs required');}
export function windVelocityHPerSecond(t,phase=0,heightH=0){valid(t,phase,heightH);return 6.8*Math.exp(-5.8*t);}
export function windDisplacementH(t,phase=0,heightH=0){valid(t,phase,heightH);return 6.8*(1-Math.exp(-5.8*t))/5.8;}
export function rollingFold(seedHeightH,t){valid(t,0,seedHeightH);const envelope=S(0,.12,t),phase=8.5*t+4.1*seedHeightH;return Object.freeze({xH:.16*envelope*Math.sin(phase),heightH:.045*envelope*Math.cos(phase),depthH:0,tiltXZ:0,envelope,phase});}
export function buildSmokeLobes(ageEms,role,phaseAt){
 if(typeof phaseAt!=='function')throw TypeError('Pinned parent phase required');const p=phaseAt(ageEms,role);if(!p.active)return Object.freeze([]);
 const t=Math.max(0,(ageEms-(role==='arrival'?180:0))/1000),form=S(0,.12,t),release=S(.14,.55,t),drift=windDisplacementH(t);
 return Object.freeze(SEEDS.map((s,i)=>{const q=i/6,phase=-1.2+.7*i+8.5*t,fold=rollingFold(s[2],t);
 const center=[drift+s[0]*(1+.18*form)+fold.xH,.025*Math.sin(phase)*form+s[1],s[2]+.35*t+fold.heightH];
 const radius=[s[3]*(1+.16*release),s[4]*(1+.12*release),s[5]*(1+.10*release)];
 const density=1.35*p.smokeEnvelope*(1-.22*q)*s[3]*s[4]*s[5]/radius.reduce((a,b)=>a*b,1);
 return Object.freeze({center:Object.freeze(center),radius:Object.freeze(radius),tiltXZ:0,curlPhase:phase,density});}));
}
export function smokeDensityAt(q,rows){
 if(q.length!==3||q.some(v=>!Number.isFinite(v)))throw TypeError('Finite local smoke point required');if(q[2]<0||rows.length!==7)return 0;
 let rho=0;for(let i=0;i<6;i++){const a=rows[i],b=rows[i+1],metric=a.radius.map((v,j)=>(v+b.radius[j])*.5),d=b.center.map((v,j)=>(v-a.center[j])/metric[j]),v=q.map((x,j)=>(x-a.center[j])/metric[j]),h=sat(v.reduce((s,x,j)=>s+x*d[j],0)/Math.max(1e-6,d.reduce((s,x)=>s+x*x,0)));
 const center=a.center.map((v,j)=>v+(b.center[j]-v)*h),r=a.radius.map((v,j)=>v+(b.radius[j]-v)*h),n=q.map((v,j)=>(v-center[j])/r[j]),r2=n.reduce((s,v)=>s+v*v,0),phase=a.curlPhase+(b.curlPhase-a.curlPhase)*h;
 const wave=.5+.5*Math.cos(3.2*n[2]-2.4*n[0]+1.1*n[1]+phase),fold=.32+.68*wave*wave;
 rho=Math.max(rho,(a.density+(b.density-a.density)*h)*(1-S(.18,1,r2))*fold);
 }
 let air=0;for(const k of [2,4]){const row=rows[k],phase=row.curlPhase,axis=[Math.cos(phase),0,Math.sin(phase)],c=row.center.map((v,j)=>v+axis[j]*.10),delta=q.map((v,j)=>v-c[j]),u=delta[0]*axis[0]+delta[2]*axis[2],v=-delta[0]*axis[2]+delta[2]*axis[0];
 const pocket=Math.exp(-2.8*((delta[0]/.15)**2+(delta[1]/.24)**2+(delta[2]/.14)**2));
 const mouth=Math.exp(-3.2*((v/.085)**2+(delta[1]/.24)**2))*(1-S(.12,.31,u))*S(-.045,.025,u);
 air=Math.max(air,.94*Math.max(pocket,mouth));}
 return rho*(1-air);
}
export const COST_BOUNDS=Object.freeze({carrierSegments:6,entrainedAirCells:2,macroFoldCyclesPerCrossSectionMax:2.3,rayStepsPerDepthHalf:16,fieldCallsPerSmokeRayStep:4,fieldCallsPerEmissionRayStep:2,fluxVoxels:512,rows:7,rowBytes:32,noiseTextures:0,particles:0});
