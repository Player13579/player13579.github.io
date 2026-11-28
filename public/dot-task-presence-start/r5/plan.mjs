export const VERSION='dot-task-presence-start-r5', LIFE=1200;
const valid=s=>typeof s==='string'&&s.length>0&&s.length<=180;
export function admit(i){
 const d=i?.snapshot,p=d?.self;
 if(i?.source!=='self-task-presence-replay'||i.stale!==false||d?.phase!=='playing'||
   !valid(d.roomId)||!valid(i.viewerId)||i.viewerId!==d.selfId||p?.id!==i.viewerId||
   p.role!=='defender'||p.alive!==true||p.ejected!==false||p.inVent!==false||
   !valid(p.special)||p.special==='alchemist'||p.special==='hacker'||
   !valid(p.taskPresenceTaskId)||!Number.isFinite(p.taskPresenceSince)||p.taskPresenceSince<=0||
   !Number.isFinite(i.observedAt)||i.observedAt<p.taskPresenceSince||i.observedAt-p.taskPresenceSince>=LIFE||
   !Array.isArray(p.tasks)||p.tasks.filter(x=>x?.id===p.taskPresenceTaskId&&x.done===false).length!==1)return null;
 return Object.freeze({id:JSON.stringify([d.roomId,p.id,p.taskPresenceTaskId,p.taskPresenceSince]),at:p.taskPresenceSince});
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
export function stateAt(t,{reduced=false}={}){
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return {alpha:0,reach:0,contact:0};
 return {alpha:smooth(0,90,t)*(1-smooth(603,LIFE,t)),reach:reduced?1:smooth(34,370,t),
  contact:smooth(28,190,t)*(1-smooth(431,680,t))};
}
