export const VERSION='acceleration-zero-arrow-sol61-r1';
export const DURATION_MS=1800;
export const DEFAULTS=Object.freeze({source:true,observer:true,sparkles:true,fixtureH:64,zoom:1,anchorX:490,anchorY:390,reducedMotion:false});
export function arrowState(ageMs,index=0,reducedMotion=false){
  const t=ageMs/1000-index*.18;
  if(t<0||t>=1.62)return {active:false,x:0,y:0,velocity:0,flux:0};
  const u=t/1.62;
  const rise=.12+.2*u+1.12*u*u;
  const envelope=Math.min(1,t/.1)*Math.min(1,(1.62-t)/.24);
  return {active:true,x:index===0?-.28:.28,y:reducedMotion?.64:rise,velocity:reducedMotion?0:(.2+2.24*u)/1.62,flux:envelope*(2.4+1.6*u)};
}
export function sparkleState(ageMs,index){
  if(!Number.isInteger(index)||index<0||index>=14)throw new RangeError('sparkle index');
  const birth=.12+index*.09, life=.2+(index%3)*.045, dt=ageMs/1000-birth;
  const carrier=index%2, source=arrowState(birth*1000,carrier);
  if(dt<0||dt>=life||!source.active)return {active:false,flux:0};
  const side=index%4<2?-1:1;
  return {active:true,x:source.x+side*(.07+dt*.38),y:source.y+.25+dt*(.48+source.velocity*.35)-.18*dt*dt,flux:3.2*Math.sin(Math.PI*dt/life),life,birth};
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
