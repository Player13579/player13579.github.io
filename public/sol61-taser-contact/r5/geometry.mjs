
export const CREATIVE_EDITION = 5;
export const DURATION_MS = 480;
export const ACTOR_H64_BOUNDS = Object.freeze({minY:-24,maxY:40,height:64});
export const CONTACTS = Object.freeze([Object.freeze([-9,-5]),Object.freeze([-9,5])]);
export const strikes = Object.freeze([[0,60],[85,140],[175,225],[270,320]].map(Object.freeze));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hash=n=>{n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;};
export function envelope(age,start,end){if(age<start||age>=end)return 0;const u=(age-start)/(end-start);return Math.min(1,u*9)*Math.exp(-u*2.8);}
export function sourceState(ageMs){
 if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=480)return {flux:0,pressure:0,phase:'inactive'};
 let flux=0;
 for(const [a,b] of strikes)flux+=envelope(ageMs,a,b)+(ageMs>=b?Math.exp(-2.8)*Math.exp(-(ageMs-b)/42)*(1-clamp((ageMs-380)/100)):0);
 return {flux,pressure:CREATIVE_EDITION>=5?Math.sin(Math.PI*clamp(ageMs/360))*.72:0,
 phase:ageMs>=320?'recombination':strikes.some(([a,b])=>ageMs>=a&&ageMs<b)?'discharge':'inter-pulse'};
}
// Local contact-frame coordinates. Actual game caller must register anchors on verified material support.
export function contactGeometry({ageMs,seed=1,actorHeight=64,reducedMotion=false,receiverMaterial=0,contacts=CONTACTS}){
 if(!Number.isFinite(ageMs)||!Number.isFinite(actorHeight)||actorHeight<=0||ageMs<0||ageMs>=480)return new Float32Array();
 if(!Array.isArray(contacts)||contacts.length!==2||!contacts.every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)))throw new TypeError('Two finite contact anchors required');
 const rows=[],scale=actorHeight/64;
 const add=(a,b,w,e,kind=0)=>rows.push(a[0]*scale,a[1]*scale,b[0]*scale,b[1]*scale,w*scale,e,kind,0);
 const [c0,c1]=contacts;
 for(let s=0;s<strikes.length;s++){
  const [a,b]=strikes[s],live=envelope(ageMs,a,b),tail=ageMs>=b?Math.exp(-2.8)*Math.exp(-(ageMs-b)/42)*(1-clamp((ageMs-380)/100)):0;
  const energy=live+tail;if(energy<=0)continue;
  const steps=8,key=(seed>>>0)+s*137;let previous=c0;
  const front=ageMs>=320?1-clamp((ageMs-320)/160):clamp((ageMs-a)/9);
  for(let j=1;j<=steps;j++){
   const u=j/steps,bend=(2.5+(hash(key+j)-.5)*1.3)*Math.sin(u*Math.PI)*(reducedMotion?.82:1);
   const q=[c0[0]+(c1[0]-c0[0])*u+bend,c0[1]+(c1[1]-c0[1])*u];
   if(u<=front)add(previous,q,.48*(1-.22*Math.sin(u*Math.PI)),energy*9);
   else if((j-1)/steps<front){const v=(front-(j-1)/steps)*steps;add(previous,[previous[0]+(q[0]-previous[0])*v,previous[1]+(q[1]-previous[1])*v],.42,energy*8);break;}
   previous=q;
  }
  for(let k=0;k<2;k++){const c=contacts[k];if(CREATIVE_EDITION<5||k===0||front>=1)add([c[0]-.65,c[1]],[c[0]+.85,c[1]],.95+sourceState(ageMs).pressure*.18,energy*6,1);}
  if(CREATIVE_EDITION>=4&&front>=1){
   if(receiverMaterial===1){
    for(let k=0;k<2;k++){const c=contacts[k],end=[c[0]+.8,c[1]+(k===0?-3:9)],mid=[c[0]+1.15,(c[1]+end[1])*.5];add(c,[c[0]+.8,c[1]],.42,energy*4.2,1);add(c,mid,.27,energy*2.9,2);add(mid,end,.22,energy*1.55,2);}
   }else{
    const origin=[(c0[0]+c1[0])*.5+(2.5+(hash(key+4)-.5)*1.3)*(reducedMotion?.82:1),(c0[1]+c1[1])*.5];add(origin,[origin[0]+2.5,origin[1]-2.4],.29,energy*2.6);add(origin,[origin[0]+3.4,origin[1]+1.8],.24,energy*1.9);
   }
  }
  if(CREATIVE_EDITION>=5&&ageMs>=320){
   const r=(1-clamp((ageMs-320)/160))*2;for(const c of contacts)add(c,[c[0]+r,c[1]],.37,tail*5.3,1);
  }
 }
 return Float32Array.from(rows);
}
export function admitContact(event,now,viewer,target){return !!event&&event.kind==='action-taser'&&!event.variant&&typeof event.id==='string'&&event.id.length>0&&Number.isFinite(event.startedAt)&&Number.isFinite(now)&&now>=event.startedAt&&now-event.startedAt<DURATION_MS&&Number.isFinite(event.x)&&Number.isFinite(event.y)&&!!target&&target.id===event.targetId&&target.visible===true&&target.hidden!==true&&!target.inVent&&!target.ejected&&(!target.invisible||target.id===viewer);}
