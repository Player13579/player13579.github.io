export const VERSION='dot-water-field-r1';
const id=s=>typeof s==='string'&&s.length>0&&s.length<=160;
const finite=Number.isFinite;
// Water creation events do not serialize field IDs or end times at v920.
// Use the current, visibility-filtered field snapshot rather than joining on proximity.
export function admit(x){
 const f=x?.field;
 if(x?.source!=='visible-hazard-field-replay'||x.phase!=='playing'||x.stale!==false
    ||!id(f?.id)||!f.id.startsWith('hazard_')||f.kind!=='water'
    ||![f.x,f.y,f.radius,f.createdAt,f.endsAt,x.observedAt].every(finite)
    ||f.radius<40||f.createdAt<0||f.endsAt<=f.createdAt
    ||x.observedAt<f.createdAt||x.observedAt>=f.endsAt
    ||x.retired===true)return null;
 return Object.freeze({id:f.id,x:f.x,y:f.y,radius:f.radius,createdAt:f.createdAt,endsAt:f.endsAt});
}
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export function stateAt(f,now,{reduced=false}={}){
 const blank={opacity:0,front:0,caustic:0,settled:0};
 if(!f||!finite(now)||now<=f.createdAt||now>=f.endsAt)return blank;
 const age=now-f.createdAt, remaining=f.endsAt-now;
 const front=smooth(0,reduced?160:660,age);
 return {opacity:smooth(0,110,age)*smooth(0,Math.min(270,(f.endsAt-f.createdAt)*.2),remaining),
   front,caustic:smooth(40,160,age)*(1-smooth(240,reduced?480:730,age)),
   settled:smooth(reduced?120:440,reduced?280:780,age)};
}
