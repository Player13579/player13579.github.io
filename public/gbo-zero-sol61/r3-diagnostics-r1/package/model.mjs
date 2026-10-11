export const VERSION='gbo-zero-sol61-r3-diagnostics-r1';
export const DURATION_MS=1450;
export const WEAPONS=Object.freeze(['handgun','smg','assault','sniper','taser']);
export const DEFAULTS=Object.freeze({source:true,observer:true,fixture:true,reducedMotion:false,fixtureH:64,background:.014});
export const smooth=(a,b,x)=>{const q=Math.min(1,Math.max(0,(x-a)/(b-a)));return q*q*(3-2*q);};
export function parseVariant(value){
 const m=/^(magazine-commit|destroyed):weapon:(handgun|smg|assault|sniper|taser)$/.exec(value);
 return m?Object.freeze({stage:m[1]==='destroyed'?'weapon-retirement':'magazine-commit',weaponId:m[2]}):null;
}
export function state(ageMs,stage){
 if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=DURATION_MS||!['magazine-commit','weapon-retirement'].includes(stage))return {active:false,flux:0,progress:0};
 const t=ageMs/1000;
 if(stage==='magazine-commit')return {active:true,flux:smooth(0,.06,t)*(1-smooth(1.04,1.38,t)),latch:smooth(0,.18,t),front:smooth(.12,.50,t),progress:ageMs/DURATION_MS};
 return {active:true,flux:smooth(0,.035,t)*(1-smooth(.52,.90,t)),gap:smooth(.09,.28,t),withdraw:smooth(.25,.72,t),progress:ageMs/DURATION_MS};
}
export function validatePose(p){
 for(const key of ['receiver','muzzle','magazine','actor'])if(!p?.[key]||!Number.isFinite(p[key].x)||!Number.isFinite(p[key].y))throw new TypeError(`resolved ${key} screen anchor required`);
 const length=Math.hypot(p.muzzle.x-p.receiver.x,p.muzzle.y-p.receiver.y);
 if(length<8||length>2048)throw new RangeError('weapon projection length 8..2048 backing pixels required');
 if(!Number.isFinite(p.actorH)||p.actorH<=0||p.actorH>2048)throw new RangeError('actorH');
 return Object.freeze(Object.fromEntries([...['receiver','muzzle','magazine','actor'].map(k=>[k,Object.freeze({...p[k]})]),['actorH',p.actorH]]));
}
// Event x/y remain actor world origin. Host resolves all weapon pose anchors.
export class EventGate{
 constructor(){this.seen=new Set();}
 accept(event,pose,now){
  const meta=parseVariant(event?.variant);
  if(event?.type!=='gbo-overdrive'||!meta)return null;
  if(!((typeof event.id==='string'&&event.id.length>0)||(Number.isSafeInteger(event.id)&&event.id>=0)))return null;
  if(!event.playerId||!Number.isFinite(event.startedAt)||!Number.isFinite(event.duration)||event.duration<=0||!Number.isFinite(now))return null;
  const ageMs=now-event.startedAt;if(ageMs<0||ageMs>=Math.min(DURATION_MS,event.duration)||this.seen.has(event.id))return null;
  const anchors=validatePose(pose);this.seen.add(event.id);
  return Object.freeze({cause:event.id,playerId:event.playerId,...meta,ageMs,durationMs:Math.min(DURATION_MS,event.duration),pose:anchors});
 }
 dispose(){this.seen.clear();}
}
export function pack({width,height,ageMs,stage,pose,options=DEFAULTS}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||!Number.isFinite(ageMs)||!['magazine-commit','weapon-retirement'].includes(stage))throw new TypeError('frame geometry/time/stage');
 const p=validatePose(pose);
 for(const key of ['source','observer','fixture','reducedMotion'])if(typeof options[key]!=='boolean')throw new TypeError(key);
 if(!Number.isFinite(options.background)||options.background<0||options.background>1)throw new RangeError('background');
 const data=new Float32Array([width,height,ageMs/1000,stage==='weapon-retirement'?1:0,p.receiver.x,p.receiver.y,p.muzzle.x,p.muzzle.y,p.magazine.x,p.magazine.y,p.actor.x,p.actor.y,Number(options.source),Number(options.observer),Number(options.fixture),Number(options.reducedMotion),p.actorH,options.background,0,0]);
 if(!data.every(Number.isFinite))throw new RangeError('float32 overflow');return data;
}
export function fixturePose({width=980,height=620,H=64,angle=0}={}){
 const receiver={x:width*.5,y:height*.54},L=H*.56,c=Math.cos(angle),s=Math.sin(angle);
 const point=(x,y)=>({x:receiver.x+L*(c*x-s*y),y:receiver.y+L*(s*x+c*y)});
 return validatePose({receiver,muzzle:point(1,0),magazine:point(-.04,.30),actor:point(-.62,.35),actorH:H});
}
