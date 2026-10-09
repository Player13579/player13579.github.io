export const VERSION='stun-grenade-zero-sol61-r1';
export const DURATION_MS=720;
export const GAME_STUN_MS=2500; // Gameplay fact; never the optical lifetime.
export const DEFAULT_RADIUS=145;
export const UNIFORM_BYTES=128;
const finite=(value,name)=>{if(!Number.isFinite(value))throw new TypeError(name+' must be finite');return value;};
const nonempty=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new TypeError(n+' required');return v;};
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
export function normalizeEvent(event,{roomId,generation}={}){
 if(event?.type!=='grenade-stun-impact')throw new TypeError('detonated stun grenade event required');
 nonempty(roomId,'room');if(!Number.isSafeInteger(generation)||generation<1)throw new TypeError('positive generation');
 const startedAt=event.startedAt==null?event.at:event.startedAt;
 const radius=finite(event.radius,'radius');if(radius<=0)throw new RangeError('positive radius');
 const duration=event.durationMs==null?DURATION_MS:finite(event.durationMs,'visual duration');
 if(duration!==DURATION_MS)throw new RangeError('source visual boundary must be 720ms');
 return Object.freeze({id:nonempty(event.id,'cause ID'),type:event.type,x:finite(event.x,'x'),y:finite(event.y,'y'),radius,startedAt:finite(startedAt,'start'),durationMs:duration,roomId,generation,synthetic:event.synthetic===true});
}
export class CauseGate{
 constructor(){this.roomId=null;this.generation=0;this.ids=new Set();this.disposed=false;}
 receive(event,scope){if(this.disposed)return null;const cause=normalizeEvent(event,scope);if(this.roomId!==cause.roomId||this.generation!==cause.generation){if(cause.generation<=this.generation&&this.roomId!==null)throw new Error('stale cause scope');this.roomId=cause.roomId;this.generation=cause.generation;this.ids.clear();}if(this.ids.has(cause.id))return null;if(this.ids.size>=4096)throw new Error('cause capacity');this.ids.add(cause.id);return cause;}
 dispose(){this.disposed=true;this.ids.clear();}
}
export function sample(cause,ageMs,{sourceOn=true,reducedMotion=false}={}){
 finite(ageMs,'age');const active=ageMs>=0&&ageMs<cause.durationMs;
 // Relative optical/model units, not calibrated explosive yield or pressure.
 const t=Math.max(0,ageMs),flash=active?(1-Math.exp(-t/2.5))*Math.exp(-t/27)*(1-smooth(110,155,t)):0;
 const heat=active?smooth(0,8,t)*(1-smooth(85,175,t)):0;
 const shockRadius=cause.radius*(1-Math.exp(-t/62));
 const shockGain=active?smooth(0,7,t)*(1-smooth(95,230,t)):0;
 const gasGain=active?smooth(14,70,t)*(1-smooth(270,720,t)):0;
 const gasSize=6+20*smooth(20,650,t),rise=reducedMotion?0:13*smooth(20,680,t);
 return Object.freeze({active,ageMs,flash:sourceOn?flash:0,heat:sourceOn?heat:0,shockRadius,shockGain,gasGain,gasSize,rise,sourceOn,stage:!active?'off':t<85?'flash-discharge':t<230?'pressure-and-hot-gas':'diluting-gas'});
}
export function fixture(ageMs=35,{id='synthetic-stun-grenade-1',height=64}={}){
 return {cause:normalizeEvent({id,type:'grenade-stun-impact',x:0,y:0,radius:DEFAULT_RADIUS,at:10000,durationMs:DURATION_MS,synthetic:true},{roomId:'diagnostic-room',generation:1}),ageMs,receiver:{x:84,y:16,height}};
}
export function packUniforms(input,view,{sourceOn=true,observerOn=true,contextOn=true,reducedMotion=false}={}){
 const {cause,ageMs}=input,s=sample(cause,ageMs,{sourceOn,reducedMotion});
 const width=finite(view.width,'width'),height=finite(view.height,'height'),scale=finite(view.scale,'scale');if(Math.min(width,height,scale)<=0)throw new RangeError('positive viewport');
 const camera=view.camera??{x:0,y:0},origin=view.origin??{x:width/2,y:height*.6};
 const project=(x,y)=>[finite(origin.x,'origin x')+(x-finite(camera.x,'camera x'))*scale,finite(origin.y,'origin y')+(y-finite(camera.y,'camera y'))*scale];
 const center=project(cause.x,cause.y),r=input.receiver??{x:cause.x+84,y:cause.y+16,height:64},receiver=project(finite(r.x,'receiver x'),finite(r.y,'receiver y'));
 const actorHeight=finite(r.height,'receiver height');if(actorHeight<=0)throw new RangeError('positive receiver height');
 const u=new Float32Array(32);u.set([width,height,scale,ageMs,...center,cause.radius,s.active?1:0,s.flash,s.heat,s.shockRadius,s.shockGain,s.gasGain,s.gasSize,s.rise,sourceOn?1:0,observerOn?1:0,contextOn?1:0,reducedMotion?1:0,0,...receiver,actorHeight*scale,0,.12,.08,19,4.5,.58,.58,.60,.32]);
 if(!u.every(Number.isFinite))throw new RangeError('f32 overflow');return u;
}
