export const H64_SCALE=64/(1.778*.92),LIFETIME=1.55,CYCLE=2.05,DT=1/240;
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));

const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
const axisQ=(i,t)=>{let q=[0,0,0,Math.cos(t*.5)];q[i]=Math.sin(t*.5);return q;};
const fromAngles=r=>qmul(axisQ(2,r[2]),qmul(axisQ(1,r[1]),axisQ(0,r[0])));

export function rotate(v,r){if(r.length===4){const a=r.slice(0,3),b=mul(cross(a,v),2);return add(v,add(mul(b,r[3]),cross(a,b)));}let [x,y,z]=v;let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);return [x*c-y*s,x*s+y*c,z];}

const def={"hull":[[1,0.08,0.16,0.45],[-1,0.17,-0.08,0.48],[0.04,1,-0.08,0.19],[-0.035,-1,0.04,0.16],[0.08,0.05,1,0.31],[-0.09,-0.01,-1,0.32],[0.65,0.18,0.85,0.43],[-0.68,0.1,0.74,0.42],[-0.82,0.12,-0.61,0.46],[0.78,0.15,-0.65,0.42],[0.18,1,0.67,0.305],[-0.26,1,-0.64,0.32],[0.18,-1,0.54,0.252],[-0.2,-1,-0.6,0.265]],"split":[0.17,1,-0.15,0.035],"cap":[1,-0.12,0.36,0.18],"basecut":[0.87,0.1,-0.62,-0.065]};const cv=q=>[q.slice(0,3),q[3]];const hull=def.hull.map(cv);
const cutsFor=id=>[cv(def.split),cv(id<2?def.basecut:def.cap)].map(([n,d],j)=>{const s=(j===0?id<2:id%2===0)?1:-1;return [mul(n,s),d*s];});
function intersect(planes){const verts=[];for(let a=0;a<planes.length;a++)for(let b=a+1;b<planes.length;b++)for(let c=b+1;c<planes.length;c++){const [A,ad]=planes[a],[B,bd]=planes[b],[C,cd]=planes[c],det=dot(A,cross(B,C));if(Math.abs(det)<1e-9)continue;const p=mul(add(add(mul(cross(B,C),ad),mul(cross(C,A),bd)),mul(cross(A,B),cd)),1/det);if(planes.every(([n,d])=>dot(n,p)<=d+1e-8)&&!verts.some(v=>Math.hypot(...sub(v,p))<1e-7))verts.push(p);}return verts;}
const pts=intersect(hull);
export const PIECES=[0,1,2,3].map(id=>{const planes=[...hull,...cutsFor(id)],v=intersect(planes),center=mul(v.reduce(add),1/v.length),faces=[];let vol=0;planes.forEach(([n,d],pi)=>{const ring=v.filter(p=>Math.abs(dot(n,p)-d)<1e-7);if(ring.length<3)return;const fc=mul(ring.reduce(add),1/ring.length),N=unit(n),U=unit(sub(ring[0],fc)),V=cross(N,U);ring.sort((a,b)=>Math.atan2(dot(sub(a,fc),V),dot(sub(a,fc),U))-Math.atan2(dot(sub(b,fc),V),dot(sub(b,fc),U)));for(let j=1;j<ring.length-1;j++){const tri=[ring[0],ring[j],ring[j+1]];vol+=Math.abs(dot(sub(tri[0],center),cross(sub(tri[1],center),sub(tri[2],center))))/6;faces.push({points:tri.map(p=>sub(p,center)),normal:N,cut:pi>=hull.length});}});return {id,volume:vol,center,faces,points:v.map(p=>sub(p,center))};});
export const TOTAL_VOLUME=PIECES.reduce((s,p)=>s+p.volume,0);
export function makePlan(receipt={}){
 const position=receipt.position??[0,0,0],yaw=receipt.yawRadians??0;if(position.length!==3||!position.every(Number.isFinite)||!Number.isFinite(yaw))throw Error('invalid fixture receipt');

 const initial=[-.28,yaw,.14],all=pts.map(p=>rotate(p,initial)),root=add(position,[0,-Math.min(...all.map(p=>p[1])),0]);
 // lower heel, lower toe, broad top leaf, upper chip; initial impulse at contact, no pre-hit projectile.
 const v0=[[-.66,.48,.11],[1.32,.78,.34],[-1.48,1.75,-.48],[2.40,1.43,.33]];
 const w0=[[.70,-.21,1.50],[-2.1,.58,-1.65],[-3.4,.48,3.9],[-4.7,2.0,-6.2]];
 const state=PIECES.map((piece,i)=>({p:add(root,rotate(piece.center,initial)),r:fromAngles(initial),v:rotate(v0[i],[0,yaw,0]),w:rotate(w0[i],[0,yaw,0]),lastImpact:-100,settled:false}));
 let mean=[0,0,0];state.forEach((s,i)=>mean=add(mean,mul(s.v,PIECES[i].volume/TOTAL_VOLUME)));state.forEach(s=>{s.v[0]-=mean[0];s.v[2]-=mean[2];});
 const initialMomentum=state.reduce((a,s,i)=>add(a,mul(s.v,PIECES[i].volume)),[0,0,0]);const frames=[],collisions=[];let minimumSupport=Infinity;
 const save=()=>state.map(s=>({p:[...s.p],r:[...s.r],v:[...s.v],settled:s.settled}));frames.push(save());

 const coeff=PIECES.map(pc=>Math.max(.013,pc.points.reduce((sum,p)=>sum+dot(p,p),0)/pc.points.length*.54));
 for(let step=1;step<=Math.ceil(LIFETIME/DT);step++){
  const age=step*DT;
  state.forEach((s,i)=>{
   if(s.settled)return;
   s.v[1]-=9.81*DT;s.p=add(s.p,mul(s.v,DT));const spin=Math.hypot(...s.w);
   if(spin>1e-8){const a=spin*DT*.5,k=Math.sin(a)/spin;s.r=unit(qmul([...mul(s.w,k),Math.cos(a)],s.r));}
   const radii=PIECES[i].points.map(p=>rotate(p,s.r));const lo=Math.min(...radii.map(p=>p[1]))+s.p[1];
   if(lo<=position[1]+.001){
    s.p[1]+=Math.max(0,position[1]-lo);
    const feet=radii.filter(p=>p[1]+s.p[1]<=position[1]+.0019).sort((a,b)=>a[1]-b[1]);
    let impact=0;
    for(let j=0;j<4;j++)for(const foot of feet){let dv=add(s.v,cross(s.w,foot));
     if(dv[1]>=0)continue;const closing=-dv[1];impact=Math.max(impact,closing);
     const inverse=1/coeff[i],jN=closing*(1+(j===0&&closing>.64?.16:0))/(1+(foot[0]*foot[0]+foot[2]*foot[2])*inverse);
     let normalImpulse=[0,jN,0];s.v=add(s.v,normalImpulse);s.w=add(s.w,mul(cross(foot,normalImpulse),inverse));
     dv=add(s.v,cross(s.w,foot));const tang=[dv[0],0,dv[2]],speed=Math.hypot(...tang);
     if(speed>.00001){const dir=mul(tang,-1/speed),axis=cross(foot,dir),jT=Math.min(.35*jN,speed/(1+dot(axis,axis)*inverse));const jt=mul(dir,jT);s.v=add(s.v,jt);s.w=add(s.w,mul(cross(foot,jt),inverse));}
    }
    if(impact>.52&&age-s.lastImpact>.095){collisions.push({piece:i,age,speed:impact,position:[...s.p]});s.lastImpact=age;}
    if(feet.length>=3&&Math.hypot(...s.v)<.040&&Math.hypot(...s.w)<.095){s.settled=true;s.v=[0,0,0];s.w=[0,0,0];}
   }
   minimumSupport=Math.min(minimumSupport,Math.min(...radii.map(p=>p[1]+s.p[1]))-position[1]);
  });frames.push(save());
 }
 return {receipt:{...receipt,position,yawRadians:yaw},frames,collisions,root,initial,metrics:{volume:TOTAL_VOLUME,pieceVolumes:PIECES.map(p=>p.volume),dominantFraction:PIECES[0].volume/TOTAL_VOLUME,minimumSupport,initialMomentum}};
}
export function sample(plan,age,reduced=false){const t=Math.max(0,Math.min(LIFETIME,age)),k=reduced?0:Math.min(plan.frames.length-1,Math.floor(t/DT));return plan.frames[k];}
export function geometry(plan,age,{reduced=false,source=true}={}){const out=[],lights=[];if(!source||age<0||age>=LIFETIME)return {vertices:new Float32Array(),lights,states:[]};const states=sample(plan,age,reduced),fade=1-Math.max(0,Math.min(1,(age-1.0)/.55)),opening=reduced?0:Math.min(1,age/.045),pulse=(reduced?.35:Math.exp(-age/0.13))*opening;
 states.forEach((s,i)=>{const piece=PIECES[i],eyeLocal=[[1,0,0],[0,1,0],[0,0,1]].map(axis=>dot(rotate(axis,s.r),[0,.39191836,.92]));for(const f of piece.faces){if(f.cut&&(age<=0||reduced))continue;const world=f.points.map(p=>add(rotate(p,s.r),s.p));const normal=unit(cross(sub(world[1],world[0]),sub(world[2],world[0])));for(let j=0;j<world.length;j++)out.push(...world[j],...normal,f.cut?1:0,fade,pulse,s.r[3],...add(f.points[j],piece.center),...s.r.slice(0,3),...f.normal,i+(reduced?4:0));}lights.push([...s.p,pulse*(piece.volume/TOTAL_VOLUME)*5]);});return {vertices:new Float32Array(out),lights,states};}
