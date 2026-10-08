import {HANDOFF_TIMING as T} from './handoff-state.mjs';
// R6 adds five small, material-bound subsites around each original registered fixation.
// Every selected pixel is inside the original sprite's >0.85 alpha support.
export const GLINT_SITES=Object.freeze([
  Object.freeze({x:110,y:225,role:'foot-fixation-1',anchorRole:'foot-fixation',subsite:0,staggerMs:0}),
  Object.freeze({x:111,y:233,role:'foot-fixation-2',anchorRole:'foot-fixation',subsite:1,staggerMs:11}),
  Object.freeze({x:116,y:229,role:'foot-fixation-3',anchorRole:'foot-fixation',subsite:2,staggerMs:22}),
  Object.freeze({x:121,y:237,role:'foot-fixation-4',anchorRole:'foot-fixation',subsite:3,staggerMs:33}),
  Object.freeze({x:123,y:227,role:'foot-fixation-5',anchorRole:'foot-fixation',subsite:4,staggerMs:44}),
  Object.freeze({x:85,y:178,role:'dress-fixation-1',anchorRole:'dress-fixation',subsite:0,staggerMs:0}),
  Object.freeze({x:90,y:187,role:'dress-fixation-2',anchorRole:'dress-fixation',subsite:1,staggerMs:11}),
  Object.freeze({x:95,y:183,role:'dress-fixation-3',anchorRole:'dress-fixation',subsite:2,staggerMs:22}),
  Object.freeze({x:100,y:191,role:'dress-fixation-4',anchorRole:'dress-fixation',subsite:3,staggerMs:33}),
  Object.freeze({x:105,y:181,role:'dress-fixation-5',anchorRole:'dress-fixation',subsite:4,staggerMs:44}),
  Object.freeze({x:154,y:142,role:'sleeve-fixation-1',anchorRole:'sleeve-fixation',subsite:0,staggerMs:0}),
  Object.freeze({x:159,y:151,role:'sleeve-fixation-2',anchorRole:'sleeve-fixation',subsite:1,staggerMs:11}),
  Object.freeze({x:164,y:147,role:'sleeve-fixation-3',anchorRole:'sleeve-fixation',subsite:2,staggerMs:22}),
  Object.freeze({x:169,y:155,role:'sleeve-fixation-4',anchorRole:'sleeve-fixation',subsite:3,staggerMs:33}),
  Object.freeze({x:170,y:145,role:'sleeve-fixation-5',anchorRole:'sleeve-fixation',subsite:4,staggerMs:44}),
  Object.freeze({x:102,y:104,role:'torso-fixation-1',anchorRole:'torso-fixation',subsite:0,staggerMs:0}),
  Object.freeze({x:107,y:113,role:'torso-fixation-2',anchorRole:'torso-fixation',subsite:1,staggerMs:11}),
  Object.freeze({x:112,y:109,role:'torso-fixation-3',anchorRole:'torso-fixation',subsite:2,staggerMs:22}),
  Object.freeze({x:117,y:117,role:'torso-fixation-4',anchorRole:'torso-fixation',subsite:3,staggerMs:33}),
  Object.freeze({x:122,y:107,role:'torso-fixation-5',anchorRole:'torso-fixation',subsite:4,staggerMs:44}),
  Object.freeze({x:130,y:48,role:'crown-fixation-1',anchorRole:'crown-fixation',subsite:0,staggerMs:0}),
  Object.freeze({x:135,y:57,role:'crown-fixation-2',anchorRole:'crown-fixation',subsite:1,staggerMs:11}),
  Object.freeze({x:140,y:53,role:'crown-fixation-3',anchorRole:'crown-fixation',subsite:2,staggerMs:22}),
  Object.freeze({x:145,y:61,role:'crown-fixation-4',anchorRole:'crown-fixation',subsite:3,staggerMs:33}),
  Object.freeze({x:150,y:51,role:'crown-fixation-5',anchorRole:'crown-fixation',subsite:4,staggerMs:44}),
 ]);
export const GLINT_OPTICS=Object.freeze({angleRadians:17*Math.PI/180,sourceRadiusH64:.45,rayLengthH64:2.2,secondaryRayLengthH64:1.65,rayWidthH64:.22,sourceRadiance:7.5,rayGain:1.9,beginAfterArrivalMs:24,riseMs:35,endAfterArrivalMs:174,fallMs:70});
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function glintAt({index,phaseMs,sourceEnabled=true,glintsEnabled=true,targetVisible=true,sourceActive=true,sourceAlpha=1}={}){
  if(!Number.isInteger(index)||!GLINT_SITES[index]||!Number.isFinite(phaseMs)||!Number.isFinite(sourceAlpha))throw new TypeError('Exact glint site, phase and alpha required');
  const site=GLINT_SITES[index],y=(site.y-16)/225,arrival=T.footArrivalMs+(1-y)*T.bodySweepMs;
  const o=GLINT_OPTICS,age=phaseMs-arrival,burstAge=age-site.staggerMs;
  const pulse=smooth(o.beginAfterArrivalMs,o.beginAfterArrivalMs+o.riseMs,burstAge)*(1-smooth(o.endAfterArrivalMs-o.fallMs,o.endAfterArrivalMs,burstAge));
  const gate=sourceEnabled&&glintsEnabled&&targetVisible&&sourceActive&&phaseMs>=0&&phaseMs<1200;
  return {site,arrivalMs:arrival,phaseMs,ageMs:age,burstAgeMs:burstAge,flux:gate?Math.max(0,Math.min(1,sourceAlpha))*pulse*o.sourceRadiance:0,angleRadians:o.angleRadians};
}
// Continuous finite-width PSF approximation of fixed observer aperture diffraction.
// No polygon silhouette: intensity varies smoothly on, between and around both axes.
export function rayPSF({dx,dy,height=64}={}){
  if(![dx,dy,height].every(Number.isFinite)||height<=0)throw new TypeError('Finite ray position and height required');
  const o=GLINT_OPTICS,c=Math.cos(o.angleRadians),s=Math.sin(o.angleRadians),scale=height/64;
  const u=(dx*c+dy*s)/scale,v=(-dx*s+dy*c)/scale,w=o.rayWidthH64;
  return Math.exp(-Math.pow(v/w,2)-Math.abs(u)/o.rayLengthH64)+.72*Math.exp(-Math.pow(u/w,2)-Math.abs(v)/o.secondaryRayLengthH64);
}
