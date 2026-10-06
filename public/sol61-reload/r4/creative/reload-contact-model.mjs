export const CONTACT_VERSION='reload-physical-contact-sol61-r4';
export const GEOMETRY=Object.freeze({startEndMs:480,seatEndMs:240,latchStartMs:260,latchEndMs:380,completeEndMs:620,startY:-.78,reducedStartY:-.40,stagedY:-.25,seatedY:.025,halfHeight:.30,mouthY:0});
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const derivative=x=>x>0&&x<1?6*x*(1-x):0;
export function contactAt({phase,ageMs,reducedMotion=false}){
 if(!['start','complete'].includes(phase)||!Number.isFinite(ageMs))throw new TypeError('phase and finite age required');
 const g=GEOMETRY,start=reducedMotion?g.reducedStartY:g.startY,complete=phase==='complete',end=complete?g.completeEndMs:g.startEndMs;
 const u=ageMs/(complete?g.seatEndMs:g.startEndMs),center=complete?g.stagedY+(g.seatedY-g.stagedY)*smooth(u):start+(g.stagedY-start)*smooth(u);
 const velocity=(complete?g.seatedY-g.stagedY:g.stagedY-start)*derivative(u)/(complete?g.seatEndMs:g.startEndMs);
 const active=ageMs>=0&&ageMs<end,inside=active&&center+g.halfHeight>=g.mouthY;
 const latch=complete?smooth((ageMs-g.latchStartMs)/(g.latchEndMs-g.latchStartMs)):0;
 return Object.freeze({active,centerYH:center,velocityHPerMs:active?velocity:0,contact:inside,seatFraction:complete?smooth(u):0,latchFraction:latch,latchVelocityPerMs:complete?derivative((ageMs-g.latchStartMs)/120)/120:0});
}
export function startContactMs(reducedMotion=false){let lo=0,hi=480;for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(contactAt({phase:'start',ageMs:mid,reducedMotion}).contact)hi=mid;else lo=mid;}return hi;}
export function contactEvents({phase,reducedMotion=false}={}){
 if(phase==='start')return Object.freeze([{id:'mouth-guide-touch',atMs:startContactMs(reducedMotion),durationMs:1.8,strength:.14,material:'polymer-guide'}]);
 if(phase!=='complete')throw new TypeError('phase required');
 return Object.freeze([{id:'seat-stop',atMs:240,durationMs:3.2,strength:.58,material:'hybrid-stop'},{id:'latch-actuation',atMs:260,durationMs:1.5,strength:.12,material:'spring-contact'},{id:'latch-lock',atMs:380,durationMs:1.2,strength:.46,material:'steel-latch'}]);
}
// Authored reduced modal approximation, not measured eigenmodes or calibrated material constants.
export const MODES=Object.freeze([{hz:270,tauMs:12,gain:.32},{hz:610,tauMs:16,gain:.21},{hz:1190,tauMs:19,gain:.14},{hz:1770,tauMs:25,gain:.14},{hz:2860,tauMs:19,gain:.10},{hz:4270,tauMs:13,gain:.07},{hz:6130,tauMs:9,gain:.035}].map(Object.freeze));
