export const VERSION='acceleration-zero-arrow-sol61-r3';
export const DURATION_MS=1800;
export const DEFAULTS=Object.freeze({source:true,observer:true,sparkles:true,fixtureH:64,zoom:1,anchorX:490,anchorY:390,reducedMotion:false});
export function arrowState(ageMs,index=0,reducedMotion=false){
  const t=ageMs/1000-index*.18;
  if(t<0||t>=1.62)return {active:false,x:0,y:0,velocity:0,flux:0};
  const u=t/1.62;
  const rise=.12+.2*u+1.12*u*u;
  const envelope=smooth(0,.1,t)*(1-smooth(1.38,1.62,t));
  return {active:true,x:index===0?-.28:.28,y:reducedMotion?.64:rise,velocity:reducedMotion?0:(.2+2.24*u)/1.62,flux:envelope*6};
}
export const SPARKLE_COUNT=32;
export const BIRTH_SITES=Object.freeze([[-.08648,.12],[-.062,-.12],[0,.23],[.12564168,.07],[.062,-.20],[-.17417,.008],[0,-.25],[.17417,.008]].map(Object.freeze));
const smooth=(a,b,x)=>{const u=Math.min(1,Math.max(0,(x-a)/(b-a)));return u*u*(3-2*u);};
export function sparkleState(ageMs,index,reducedMotion=false){
  if(!Number.isInteger(index)||index<0||index>=SPARKLE_COUNT)throw new RangeError('sparkle index');
  const birth=.19+index*.045+(index%3)*.004,life=Math.min(.25+(index%4)*.035,1.8-birth),dt=ageMs/1000-birth;
  const carrier=index%2,source=arrowState(birth*1000,carrier);
  if(dt<0||dt>=life||!source.active)return {active:false,flux:0};
  const [localX,localY]=BIRTH_SITES[Math.floor(index/2)%8],side=localX<0?-1:1,drift=reducedMotion?.12:1,phase=dt/life;
  return {active:true,x:source.x+localX+drift*side*dt*(.11+(index%3)*.035),y:(reducedMotion?.64:source.y)+localY+drift*(dt*(.26+source.velocity*.7)-.12*dt*dt),flux:(4.8+(index%3)*.6)*smooth(0,.16,phase)*(1-smooth(.24,1,phase)),radius:.010+(index%3)*.0015,life,birth,localX,localY,carrier};
}
// Mirrors the declared observer kernel for focused CPU reconstruction checks.
export function scatterKernel(zoom=1){
  const samples=[];let sum=0;const pitch=Math.max(.65,.8*zoom);
  for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){const weight=Math.exp(-(x*x+y*y)/4.5);sum+=weight;samples.push({x:x*pitch,y:y*pitch,weight});}
  return samples.map(s=>({...s,weight:s.weight/sum}));
}
export function validateOptions(patch,current=DEFAULTS){
  const next={...current,...patch};
  for(const key of ['fixtureH','zoom','anchorX','anchorY'])if(!Number.isFinite(next[key]))throw new RangeError(key);
  if(next.fixtureH<=0||next.fixtureH>512||next.zoom<.25||next.zoom>6)throw new RangeError('scale');
  for(const key of ['source','observer','sparkles','reducedMotion'])if(typeof next[key]!=='boolean')throw new TypeError(key);
  return next;
}
export class Playback{
  constructor(now=()=>performance.now()){this.now=now;this.generation=0;this.cause=0;this.mode='stopped';this.heldAge=0;this.origin=0;}
  replay(){this.generation++;this.cause++;this.origin=this.now();this.mode='playing';this.heldAge=0;return this.cause;}
  age(){return this.mode==='playing'?this.now()-this.origin:this.heldAge;}
  hold(age){if(!Number.isFinite(age)||age<0)throw new RangeError('age');this.generation++;this.mode='held';this.heldAge=age;}
  resume(){if(this.mode!=='held')return false;this.generation++;this.origin=this.now()-this.heldAge;this.mode='playing';return true;}
  stop(){this.generation++;this.mode='stopped';this.heldAge=DURATION_MS;}
}
