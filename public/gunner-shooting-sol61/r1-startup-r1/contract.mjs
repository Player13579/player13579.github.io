export const AUTHORITY = Object.freeze({versionID:'gunner-shooting-sol61-r1',groupID:'gunner-shooting-sol61',creativeAuthor:'GPT-6.1-Sol',edition:1,seriesProducedCount:1,historicalAllLoopCount:'unknown',remaining:'unknown',maximum:5,userAuthority:'2026-10-11 最新の「射撃e作って」による新Sol候補一版の制作。追加創作版は自動制作しない。'});
export const LIFE = 0.76;
export const LOOP = 1.7;
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)};
export function normalizeDirection(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||Math.hypot(x,y)<1e-8)throw new TypeError('direction must be finite and nonzero');const n=Math.hypot(x,y);return [x/n,y/n]}
export function plan(age,{sourceEnabled=true,observerEnabled=true,seed=1}={}){
 if(!Number.isFinite(age))throw new TypeError('finite age required');
 const active=sourceEnabled&&age>=0&&age<LIFE,t=Math.max(0,age);
 const flash=active?smooth(0,.006,t)*(1-smooth(.028,.085,t))*(.94+.06*Math.sin(seed*2.1+t*71)):0;
 const recoil=active?3.8*(1-Math.exp(-t/ .008))*Math.exp(-t/.09):0;
 const slide=active?5.2*smooth(0,.016,t)*(1-smooth(.028,.095,t)):0;
 return {age,active,flash,recoil,slide,observer:observerEnabled?1:0,seed,sourceEnabled,observerEnabled,ended:age>=LIFE,phase:!active?'idle':t<.085?'discharge':t<.3?'expansion':'dissipation'};
}
export function packUniforms({width,height,age,muzzle=[340,255],direction=[1,0],sourceEnabled=true,observerEnabled=true,seed=1,scale=1,background=0}){
 if(![width,height,...muzzle,scale].every(Number.isFinite)||width<=0||height<=0||scale<=0)throw new TypeError('invalid target geometry');
 const d=normalizeDirection(...direction),p=plan(age,{sourceEnabled,observerEnabled,seed});
 return {plan:p,data:new Float32Array([width,height,age,Number(p.active),...muzzle,...d,p.observer,seed,scale,background,p.flash,p.recoil,p.slide,0])};
}
export function audioEligible({age,sourceEnabled=true,verify=false,muted=false,held=false,completed=false}){return sourceEnabled&&!verify&&!muted&&!held&&completed&&age>=0&&age<=.11}
export function synthShot(sampleRate=48000,seed=1){
 const length=Math.round(sampleRate*.34),pcm=new Float32Array(length);let random=seed>>>0,low=0;
 for(let i=0;i<length;i++){const t=i/sampleRate;random=(1664525*random+1013904223)>>>0;const noise=random/4294967296*2-1;low+=.11*(noise-low);
  const pressure=(noise-low)*Math.exp(-t/.026)*(1-Math.exp(-t/.0003));
  const body=low*2.2*Math.exp(-t/.075)*(1-Math.exp(-t/.001));
  const mechanism=t>.022?(noise-low)*.22*Math.exp(-(t-.022)/.006):0;
  pcm[i]=Math.tanh((pressure+body+mechanism)*1.7)*.62;
 }
 return pcm;
}

export function createShotSource(event,registration){
 if(event?.type!=='action-shoot'||typeof event.id!=='string'||!event.id)throw new TypeError('successful action-shoot identity required');
 if(event.variant!=='handgun')throw new TypeError('R1 creative scope is handgun');
 const muzzle=registration?.muzzleScreen,target=registration?.targetScreen;
 if(!Array.isArray(muzzle)||!Array.isArray(target)||muzzle.length!==2||target.length!==2||![...muzzle,...target,registration.startedAt].every(Number.isFinite))throw new TypeError('registered screen-space barrel and target plus monotonic event time required');
 return Object.freeze({causeID:event.id,variant:event.variant,muzzle:Object.freeze([...muzzle]),direction:Object.freeze(normalizeDirection(target[0]-muzzle[0],target[1]-muzzle[1])),startedAt:registration.startedAt,registrationID:registration.registrationID??null,endpoint:Object.freeze([...target]),duration:LIFE});
}
