import {HANDOFF_TIMING as T} from './handoff-state.mjs';
// Registered original crop coordinates; every center has opaque alpha in the source.
export const GLINT_SITES=Object.freeze([
  Object.freeze({x:116,y:230,role:'foot-fixation'}),
  Object.freeze({x:95,y:184,role:'dress-fixation'}),
  Object.freeze({x:164,y:148,role:'sleeve-fixation'}),
  Object.freeze({x:112,y:110,role:'torso-fixation'}),
  Object.freeze({x:140,y:54,role:'crown-fixation'}),
]);
export const GLINT_OPTICS=Object.freeze({angleRadians:17*Math.PI/180,sourceRadiusH64:.72,rayLengthH64:5.6,secondaryRayLengthH64:4.2,rayWidthH64:.38,sourceRadiance:7.5,rayGain:1.9,beginAfterArrivalMs:24,riseMs:35,endAfterArrivalMs:174,fallMs:70});
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function glintAt({index,phaseMs,sourceEnabled=true,glintsEnabled=true,targetVisible=true,sourceActive=true,sourceAlpha=1}={}){
  if(!Number.isInteger(index)||!GLINT_SITES[index]||!Number.isFinite(phaseMs)||!Number.isFinite(sourceAlpha))throw new TypeError('Exact glint site, phase and alpha required');
  const site=GLINT_SITES[index],y=(site.y-16)/225,arrival=T.footArrivalMs+(1-y)*T.bodySweepMs;
  const o=GLINT_OPTICS,age=phaseMs-arrival;
  const pulse=smooth(o.beginAfterArrivalMs,o.beginAfterArrivalMs+o.riseMs,age)*(1-smooth(o.endAfterArrivalMs-o.fallMs,o.endAfterArrivalMs,age));
  const gate=sourceEnabled&&glintsEnabled&&targetVisible&&sourceActive&&phaseMs>=0&&phaseMs<1200;
  return {site,arrivalMs:arrival,phaseMs,ageMs:age,flux:gate?Math.max(0,Math.min(1,sourceAlpha))*pulse*o.sourceRadiance:0,angleRadians:o.angleRadians};
}
// Continuous finite-width PSF approximation of fixed observer aperture diffraction.
// No polygon silhouette: intensity varies smoothly on, between and around both axes.
export function rayPSF({dx,dy,height=64}={}){
  if(![dx,dy,height].every(Number.isFinite)||height<=0)throw new TypeError('Finite ray position and height required');
  const o=GLINT_OPTICS,c=Math.cos(o.angleRadians),s=Math.sin(o.angleRadians),scale=height/64;
  const u=(dx*c+dy*s)/scale,v=(-dx*s+dy*c)/scale,w=o.rayWidthH64;
  return Math.exp(-Math.pow(v/w,2)-Math.abs(u)/o.rayLengthH64)+.72*Math.exp(-Math.pow(u/w,2)-Math.abs(v)/o.secondaryRayLengthH64);
}
