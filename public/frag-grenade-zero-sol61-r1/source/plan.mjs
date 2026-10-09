export const VERSION='frag-grenade-zero-sol61-r1';
export const GROUP='gunner-frag-grenade-sol61';
export const DURATION_MS=900, GAME_RADIUS=132, UNIFORM_BYTES=128;
export const FRAGMENT_COUNT=7, GRAVITY_HALF=260;
export function fragmentContactTimes(){return Array.from({length:FRAGMENT_COUNT},(_,i)=>{const angle=i*2.399963+1.1,vy=Math.sin(angle)*43-73-i*5,height=12+i*1.3;return (-vy+Math.sqrt(vy*vy+4*GRAVITY_HALF*height))/(2*GRAVITY_HALF);}).sort((a,b)=>a-b);}
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function sample(ageMs,{sourceOn=true,reducedMotion=false}={}){
 if(!finite(ageMs))throw new TypeError('finite age required');
 const alive=ageMs>=0&&ageMs<DURATION_MS, t=clamp(ageMs/1000,0,.9);
 const ignition=smooth(t/.009), rupture=Math.exp(-t/0.067)*ignition;
 const flame=Math.exp(-t/.155)*ignition*(1-smooth((t-.32)/.14));
 const cooling=1-smooth((t-.64)/.26);
 return Object.freeze({alive,t,rupture,flame,sourceRadiance:alive&&sourceOn?9*rupture+2.6*flame:0,
  expansion:1-Math.exp(-t/0.16),dust:alive?smooth(t/.07)*cooling:0,
  debris:alive?smooth(t/.015)*cooling:0,pressure:alive&&sourceOn?Math.exp(-t/.19)*ignition:0,
  motion:reducedMotion?.35:1,tail:alive?cooling:0});
}
export function fixture(ageMs=55,{id='synthetic-frag-1',height=64}={}){
 if(!finite(height)||height<=0)throw new RangeError('positive receiver height');
 return {ageMs,cause:{id,type:'grenade-frag-impact',x:0,y:0,startedAt:0,duration:900,radius:132,roomId:'diagnostic',generation:1},receiver:{height,x:-165,y:0},observer:{exposure:1,pupil:1},occluder:false};
}
export function packUniforms(input,view,controls={}){
 if(!input||!input.cause||input.cause.type!=='grenade-frag-impact'||!input.cause.id)throw new TypeError('identified Frag cause');
 for(const n of [input.cause.x,input.cause.y,input.ageMs,input.receiver.height,view.width,view.height,view.scale,view.origin.x,view.origin.y,input.receiver.x,input.receiver.y])if(!finite(n))throw new TypeError('finite geometry');
 if((input.cause.radius!==undefined&&input.cause.radius!==GAME_RADIUS)||(input.cause.duration!==undefined&&input.cause.duration!==DURATION_MS))throw new RangeError('canonical Frag radius132/duration900');
 const camera=view.camera??{x:0,y:0};if(![camera.x,camera.y].every(finite))throw new TypeError('finite camera');
 if(input.receiver.height<=0||view.scale<=0||view.width<=0||view.height<=0)throw new RangeError('positive projection');
 for(const n of [input.observer?.exposure??1,input.observer?.pupil??1])if(!finite(n))throw new TypeError('finite observer');
 const s=sample(input.ageMs,controls),u=new Float32Array(32);
 // Eight vec4f, ABI128: viewport, origin/lifetime, energies, phase, receiver,
 // controls, observer/budget, exact cause geometry.
 u.set([view.width,view.height,view.scale,input.receiver.height],0);
 u.set([view.origin.x+(input.cause.x-camera.x)*view.scale,view.origin.y+(input.cause.y-camera.y)*view.scale,s.t,s.alive?1:0],4);
 u.set([s.sourceRadiance,s.flame,s.dust,s.pressure],8);
 u.set([s.expansion,s.debris,s.motion,s.tail],12);
 u.set([input.receiver.x,input.receiver.y,controls.contextOn===false?0:1,input.occluder?1:0],16);
 u.set([controls.sourceOn===false?0:1,controls.observerOn===false?0:1,controls.reducedMotion?1:0,0],20);
 u.set([clamp(input.observer?.exposure??1,.1,4),clamp(input.observer?.pupil??1,.3,2),.16,.84],24);
 u.set([input.cause.radius??132,input.cause.duration??900,input.cause.x,input.cause.y],28);
 return u;
}
export class CauseGate{
 constructor(){this.room=null;this.generation=null;this.seen=new Set();this.closed=false;}
 receive(event,session){
  if(this.closed||!event||event.type!=='grenade-frag-impact'||typeof event.id!=='string'||!event.id||!session||event.roomId!==session.roomId||event.generation!==session.generation)return false;
  if(!Number.isSafeInteger(session.generation)||session.generation<0||![event.x,event.y,event.startedAt].every(finite)||(event.duration!==undefined&&event.duration!==900)||(event.radius!==undefined&&event.radius!==132))return false;
  if(this.room===session.roomId&&this.generation!==null&&session.generation<this.generation)return false;
  if(this.room!==session.roomId||this.generation!==session.generation){this.room=session.roomId;this.generation=session.generation;this.seen.clear();}
  if(this.seen.has(event.id))return false;this.seen.add(event.id);return true;
 }
 dispose(){this.closed=true;this.seen.clear();}
}
