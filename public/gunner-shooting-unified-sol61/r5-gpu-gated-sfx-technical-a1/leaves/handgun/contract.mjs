export const AUTHORITY = Object.freeze({versionID:'gunner-shooting-sol61-r5',groupID:'gunner-shooting-sol61',creativeAuthor:'GPT-6.1-Sol',edition:5,seriesProducedCount:5,historicalAllLoopCount:'unknown',remaining:0,maximum:5,userAuthority:'2026-10-13 latest human R5 grant: R4 then R5; maximum 5; old unknown total history preserved; no automatic adoption'});
export const LIFE = 0.76;
export const LOOP = 1.7;
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
export function normalizeDirection(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x,y)<1e-8)throw new TypeError('direction must be finite and nonzero');const n=Math.hypot(x,y);return [x/n,y/n]}
export function plan(age,{sourceEnabled=true,observerEnabled=true,seed=1}={}){
 if(!Number.isFinite(age))throw new TypeError('finite age required');
 const active=sourceEnabled&&age>=0&&age<LIFE,t=Math.max(0,age);
 const flash=active?smooth(0,.003,t)*Math.exp(-t/.029)*(1-smooth(.060,.085,t))*1.8:0;
 const recoil=active?3.8*(1-Math.exp(-t/ .008))*Math.exp(-t/.09):0;
 const slide=active?5.2*(t<=.016?smooth(0,.016,t):1-smooth(.016,.095,t)):0;
 return {age,active,flash,recoil,slide,observer:observerEnabled?1:0,seed,sourceEnabled,observerEnabled,ended:age>=LIFE,phase:!active?'idle':t<.085?'discharge':t<.3?'expansion':'dissipation'};
}
export function packUniforms({width,height,age,muzzle=[340,255],direction=[1,0],sourceEnabled=true,observerEnabled=true,seed=1,scale=1,background=0}){
 if(![width,height,...muzzle,scale].every(Number.isFinite)||width<=0||height<=0||scale<=0)throw new TypeError('invalid target geometry');
 const d=normalizeDirection(...direction),p=plan(age,{sourceEnabled,observerEnabled,seed});
 return {plan:p,data:new Float32Array([width,height,age,Number(p.active),...muzzle,...d,p.observer,seed,scale,background,p.flash,p.recoil,p.slide,0])};
}
export function audioEligible({age,sourceEnabled=true,verify=false,muted=false,held=false,completed=false}){return sourceEnabled&&!verify&&!muted&&!held&&completed&&age>=0&&age<=.11}
export {synthShot} from './sfx.mjs';

export function createShotSource(event,registration){
 if(event?.type!=='action-shoot'||typeof event.id!=='string'||!event.id)throw new TypeError('successful action-shoot identity required');
 if(event.variant!=='handgun')throw new TypeError('R1 creative scope is handgun');
 const muzzle=registration?.muzzleScreen,target=registration?.targetScreen;
 if(!Array.isArray(muzzle)||!Array.isArray(target)||muzzle.length!==2||target.length!==2||![...muzzle,...target,registration.startedAt].every(Number.isFinite))throw new TypeError('registered screen-space barrel and target plus monotonic event time required');
 return Object.freeze({causeID:event.id,variant:event.variant,muzzle:Object.freeze([...muzzle]),direction:Object.freeze(normalizeDirection(target[0]-muzzle[0],target[1]-muzzle[1])),startedAt:registration.startedAt,registrationID:registration.registrationID??null,endpoint:Object.freeze([...target]),duration:LIFE});
}
