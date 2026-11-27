export const VERSION="dot-emp-cancellation-r1", LIFE=1000;
const id=(s,n=180)=>typeof s==="string"&&s.length>0&&s.length<=n;
const TAU=Math.PI*2;
export function admit(input){
 const e=input?.event, ids=e?.resolvedEmpPulseIds;
 if(input?.source!=="visible-magic-event-replay"||input?.phase!=="playing"||input?.stale!==false||
    e?.type!=="emp-cancel"||e.variant!=="opposite"||e.radius!==520||e.durationMs!==0||
    !id(e.id)||!e.id.startsWith("magic_")||!Array.isArray(ids)||ids.length!==2||
    !id(ids[0])||!id(ids[1])||ids[0]===ids[1]||
    ![input.observedAt,e.at,e.x,e.y,e.empSourceAxis].every(Number.isFinite)||
    e.at<0||input.observedAt<e.at||input.observedAt-e.at>=LIFE||
    Math.abs(e.empSourceAxis)>TAU)return null;
 const angle=Math.round((((e.empSourceAxis%Math.PI)+Math.PI)%Math.PI)*1e10)/1e10;
 return Object.freeze({id:e.id,at:e.at,x:e.x,y:e.y,axis:angle>=Math.PI-1e-10?0:angle});
}
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export function stateAt(t,{reduced=false}={}){
 const off={alpha:0,reach:0,contact:0,vanish:1};
 if(!Number.isFinite(t)||t<=0||t>=LIFE)return off;
 const meet=330;
 return {alpha:ease(0,105,t)*(1-ease(570,LIFE,t)),
  reach:ease(reduced?170:80,meet,t),
  contact:ease(meet-60,meet,t)*(1-ease(meet+40,560,t)),
  vanish:ease(meet+40,reduced?590:665,t)};
}
