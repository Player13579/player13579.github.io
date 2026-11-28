export const TYPE = 'hazard-antidote', VERSION='dot-antidote-landing-r5', LIFE=610;
const cap = n=>Math.max(0,Math.min(1,n));
const smooth = (a,b,v)=>{const q=cap((v-a)/(b-a));return q*q*(3-2*q)};
export function admit(event, now) {
 if(!event || event.type!==TYPE || typeof event.variant!=='string' || !/^[01]$/.test(event.variant)) return null;
 if(typeof event.id!=='string'||!/^magic_[A-Za-z0-9_-]{1,174}$/.test(event.id))return null;
 if(typeof event.playerId!=='string'||!event.playerId || (event.targetId != null && event.targetId !== ''))return null;
 const radius=120+Number(event.variant)*30;
 if(event.radius!==radius || ![event.x,event.y,event.at,now].every(Number.isFinite) || event.at<946684800000)return null;
 const ageMs=now-event.at;
 if(ageMs < -125||ageMs >= LIFE)return null;
 return Object.freeze({id:event.id,x:event.x,y:event.y,at:event.at,radius,ageMs});
}
export function stateAt(age,{reduced=false}={}) {
 if(!Number.isFinite(age)||age<0||age>=LIFE)return {stage:'off',outer:0,shown:0,recede:0,opacity:0,light:0};
 const outer=reduced?1:.17+.83*smooth(3,129,age);
 const recede=reduced?0:smooth(150,479,age);
 const shown=reduced?.82:outer*(1-.73*recede);
 return {stage:age<132?'ground-contact':age<162?'read-reach':age<480?'return':'clear',outer,shown,recede,
   opacity:smooth(0,reduced?91:45,age)*(1-smooth(216,LIFE,age)),
   light:smooth(2,84,age)*(1-smooth(187,521,age))};
}
