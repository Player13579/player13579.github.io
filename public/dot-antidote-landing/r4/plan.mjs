export const TYPE = 'hazard-antidote', VERSION='dot-antidote-landing-r4', LIFE=610;
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
 if(!Number.isFinite(age)||age<0||age>=LIFE)return {stage:'off',outer:0,inner:0,opacity:0,light:0};
 const outer=reduced?1:.19+.81*smooth(0,186,age);
 return {stage:age<186?'spread':age<274?'reach':'clear',outer,
   inner:outer*(.025+.91*smooth(135,LIFE,age)),opacity:smooth(0,reduced?110:55,age)*(1-smooth(275,LIFE,age)),
   light:smooth(14,89,age)*(1-smooth(182,479,age))};
}
