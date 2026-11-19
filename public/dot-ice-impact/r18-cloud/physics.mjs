export const H64_SCALE=64/(1.778*.92),LIFETIME=1.55,CYCLE=2.05,DT=1/240;
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));

const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
const axisQ=(i,t)=>{let q=[0,0,0,Math.cos(t*.5)];q[i]=Math.sin(t*.5);return q;};
const fromAngles=r=>qmul(axisQ(2,r[2]),qmul(axisQ(1,r[1]),axisQ(0,r[0])));

export function rotate(v,r){if(r.length===4){const a=r.slice(0,3),b=mul(cross(a,v),2);return add(v,add(mul(b,r[3]),cross(a,b)));}let [x,y,z]=v;let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);return [x*c-y*s,x*s+y*c,z];}

const def={"hull":[[0.0,-0.16,-1.0,0.348],[0.0,-0.16,1.0,0.348],[0.0,-1.0,0.0,0.239],[0.0,-0.8202438661763951,-0.7071067811865475,0.37157925650732837],[0.0,-0.8202438661763951,0.7071067811865475,0.37157925650732837],[0.0,1.0,0.0,0.239],[0.0,0.5939696961966998,-0.7071067811865475,0.37157925650732837],[0.0,0.5939696961966998,0.7071067811865475,0.37157925650732837],[-1.0,-0.15,0.0,0.485],[-0.7071067811865475,-0.2192031021678297,-0.7071067811865475,0.5455275246792191],[-0.7071067811865475,-0.2192031021678297,0.7071067811865475,0.5455275246792191],[-0.7071067811865475,-0.8131727983645296,0.0,0.4684528855298854],[-0.5773502691896258,-0.7563288526384099,-0.5773502691896258,0.5420541537765468],[-0.5773502691896258,-0.7563288526384099,0.5773502691896258,0.5420541537765468],[-0.7071067811865475,0.6010407640085653,0.0,0.4684528855298854],[-0.5773502691896258,0.3983716857408418,-0.5773502691896258,0.5420541537765468],[-0.5773502691896258,0.3983716857408418,0.5773502691896258,0.5420541537765468],[1.0,-0.15,0.0,0.485],[0.7071067811865475,-0.2192031021678297,-0.7071067811865475,0.5455275246792191],[0.7071067811865475,-0.2192031021678297,0.7071067811865475,0.5455275246792191],[0.7071067811865475,-0.8131727983645296,0.0,0.4684528855298854],[0.5773502691896258,-0.7563288526384099,-0.5773502691896258,0.5420541537765468],[0.5773502691896258,-0.7563288526384099,0.5773502691896258,0.5420541537765468],[0.7071067811865475,0.6010407640085653,0.0,0.4684528855298854],[0.5773502691896258,0.3983716857408418,-0.5773502691896258,0.5420541537765468],[0.5773502691896258,0.3983716857408418,0.5773502691896258,0.5420541537765468]],"cut":[[-0.078,-1,-0.16,0.032],[1,-0.32,0.27,-0.225],[1,0.19,-0.35,0.215],[1,-0.14,0.58,0.082]],"paths":[[1,2],[1,-2,3],[1,-3],[-1,4],[-1,-4]]};const cv=q=>[q.slice(0,3),q[3]],hull=def.hull.map(cv);
const cutsFor=id=>def.paths[id].map(k=>{const [n,d]=cv(def.cut[Math.abs(k)-1]), sign=Math.sign(k);return [mul(n,sign),d*sign]});
function intersect(planes){const verts=[];for(let a=0;a<planes.length;a++)for(let b=a+1;b<planes.length;b++)for(let c=b+1;c<planes.length;c++){const [A,ad]=planes[a],[B,bd]=planes[b],[C,cd]=planes[c],det=dot(A,cross(B,C));if(Math.abs(det)<1e-9)continue;const p=mul(add(add(mul(cross(B,C),ad),mul(cross(C,A),bd)),mul(cross(A,B),cd)),1/det);if(planes.every(([n,d])=>dot(n,p)<=d+1e-8)&&!verts.some(v=>Math.hypot(...sub(v,p))<1e-7))verts.push(p);}return verts;}
const pts=intersect(hull);
export const PIECES=[0,1,2,3,4].map(id=>{const planes=[...hull,...cutsFor(id)],v=intersect(planes),center=mul(v.reduce(add),1/v.length),faces=[];let vol=0;planes.forEach(([n,d],pi)=>{const ring=v.filter(p=>Math.abs(dot(n,p)-d)<1e-7);if(ring.length<3)return;const fc=mul(ring.reduce(add),1/ring.length),N=unit(n),U=unit(sub(ring[0],fc)),V=cross(N,U);ring.sort((a,b)=>Math.atan2(dot(sub(a,fc),V),dot(sub(a,fc),U))-Math.atan2(dot(sub(b,fc),V),dot(sub(b,fc),U)));for(let j=1;j<ring.length-1;j++){const tri=[ring[0],ring[j],ring[j+1]];vol+=Math.abs(dot(sub(tri[0],center),cross(sub(tri[1],center),sub(tri[2],center))))/6;faces.push({points:tri.map(p=>sub(p,center)),normal:N,cut:pi>=hull.length?Math.abs(def.paths[id][pi-hull.length]):0});}});return {id,volume:vol,center,faces,points:v.map(p=>sub(p,center))};});
export const TOTAL_VOLUME=PIECES.reduce((s,p)=>s+p.volume,0);
export function makePlan(receipt={}){
 const position=receipt.position??[0,0,0],yaw=receipt.yawRadians??0;if(position.length!==3||!position.every(Number.isFinite)||!Number.isFinite(yaw))throw Error('invalid fixture receipt');


 const initial=[.065,yaw-.30,-.047],all=pts.map(p=>rotate(p,initial)),root=add(position,[0,-Math.min(...all.map(p=>p[1])),0]);
 // Two bonds crack on the front half; the remote facet opens only after the lid of the rear half has spalled.
 const release=[45,71,58,34,48].map(k=>k*DT),expose=[6,22,16,34,48].map(k=>k*DT);
 const hingeAxes=[[.94,0,-.28],[.94,0,.32],[.78,0,.63]],hingeAngle=[-.70,-.62,-.77];
 const pivotZ=-.23;
 // Wet basal bonds unzip from front to back. The rear ligament persists while the upper shell pries open.
 function hingestate(i,age){
  const u=Math.max(0,Math.min(1,(age-expose[i])/(release[i]-expose[i]))),ease=u*u*(3-2*u);
  const axis=unit(hingeAxes[i]),th=.5*hingeAngle[i]*ease,hinge=[...mul(axis,Math.sin(th)),Math.cos(th)];
  const pivot=[PIECES[i].center[0],-.032-.078*PIECES[i].center[0]-.16*pivotZ,pivotZ];
  const r0=fromAngles(initial);
  return {p:add(root,rotate(add(pivot,rotate(sub(PIECES[i].center,pivot),hinge)),r0)),r:qmul(r0,hinge)};
 }
 // opposite transverse banks separate; unweighted velocities would send the largest toe skating unnaturally.
 const v0=[[-2.20,.63,.91],[-.14,.49,-.89],[1.57,.78,-.58],[-.99,.20,-.17],[2.56,.34,1.33]];
 const w0=[[2.24,1.12,.54],[2.83,-.54,-.87],[2.55,1.50,-1.22],[-.31,-1.98,.40],[-.45,2.30,.32]];
 const state=PIECES.map((piece,i)=>({p:add(root,rotate(piece.center,initial)),r:fromAngles(initial),v:[0,0,0],w:[0,0,0],lastImpact:-100,settled:false,free:false}));
 let mean=v0.reduce((m,v,i)=>add(m,mul(v,PIECES[i].volume/TOTAL_VOLUME)),[0,0,0]);
 const vRelease=v0.map(v=>rotate([v[0]-mean[0],v[1],v[2]-mean[2]],[0,yaw,0]));
 const initialMomentum=[0,0,0],releaseMomentum=vRelease.reduce((m,v,i)=>add(m,mul(v,PIECES[i].volume)),[0,0,0]);
 const frames=[],collisions=[],bites=[];let minimumSupport=Infinity;
 const save=()=>state.map(s=>({p:[...s.p],r:[...s.r],v:[...s.v],settled:s.settled,free:s.free}));frames.push(save());
 const coeff=PIECES.map(pc=>Math.max(.013,pc.points.reduce((sum,p)=>sum+dot(p,p),0)/pc.points.length*.54));
 for(let step=1;step<=Math.ceil(LIFETIME/DT);step++){
  const age=step*DT;
  state.forEach((s,i)=>{
   if(s.settled)return;
   if(i<3&&!s.free&&age+1e-7>=expose[i]){Object.assign(s,hingestate(i,age));const b=Math.min(...PIECES[i].points.map(p=>rotate(p,s.r)[1]+s.p[1]));s.p[1]+=Math.max(0,position[1]-b);}
   if(age+1e-7<release[i])return;
   if(!s.free){s.free=true;s.v=vRelease[i].slice();s.w=rotate(w0[i],[0,yaw,0]);}

   if(s.pin){
    // Rock about the actual caught toe, not the piece centroid. Release upon a second face touching
    // the floor (or after the short crush interval). The subsequent ordinary manifold dissipates the remainder.
    const a=s.pin,foot=rotate(a.local,s.r),torque=cross(foot,[0,9.81,0]),inv=1/(coeff[i]+dot(foot,foot));
    s.w=mul(add(s.w,mul(torque,inv*DT)),Math.exp(-8.8*DT));const k=Math.hypot(...s.w);
    if(k>1e-7){const th=k*DT*.5;s.r=unit(qmul([...mul(s.w,Math.sin(th)/k),Math.cos(th)],s.r));}
    const rr=rotate(a.local,s.r);s.p=sub(a.world,rr);s.v=mul(cross(s.w,rr),-1);
    const bottom=Math.min(...PIECES[i].points.map(p=>s.p[1]+rotate(p,s.r)[1]));
    if(bottom>=position[1]-.001&&age-a.start<a.hold){s.p[1]+=Math.max(0,position[1]-bottom);minimumSupport=Math.min(minimumSupport,Math.max(bottom-position[1],0));return;}
    s.p[1]+=Math.max(0,position[1]-bottom);s.pin=null;
   }
   s.v[1]-=9.81*DT;s.p=add(s.p,mul(s.v,DT));const spin=Math.hypot(...s.w);
   if(spin>1e-8){const a=spin*DT*.5,k=Math.sin(a)/spin;s.r=unit(qmul([...mul(s.w,k),Math.cos(a)],s.r));}
   const radii=PIECES[i].points.map(p=>rotate(p,s.r));const lo=Math.min(...radii.map(p=>p[1]))+s.p[1];
   if(lo<=position[1]+.001){
    s.p[1]+=Math.max(0,position[1]-lo);
    const feet=radii.filter(p=>p[1]+s.p[1]<=position[1]+.0019).sort((a,b)=>a[1]-b[1]);
    let impact=0, footHit=null, before=[0,0,0],jam=false;
    for(let j=0;j<4;j++)for(const foot of feet){let dv=add(s.v,cross(s.w,foot));
     if(dv[1]>=0)continue;const closing=-dv[1];if(closing>impact){impact=closing;footHit=add(s.p,foot);before=[dv[0],0,dv[2]];jam=closing>.50&&Math.hypot(...before)>.28;}
     const inverse=1/coeff[i],jN=closing*(1+(j===0&&closing>.64?.16:0))/(1+(foot[0]*foot[0]+foot[2]*foot[2])*inverse);
     let normalImpulse=[0,jN,0];s.v=add(s.v,normalImpulse);s.w=add(s.w,mul(cross(foot,normalImpulse),inverse));
     dv=add(s.v,cross(s.w,foot));const tang=[dv[0],0,dv[2]],speed=Math.hypot(...tang);
     if(speed>.00001){const dir=mul(tang,-1/speed),axis=cross(foot,dir),jT=Math.min((jam?.91:.58)*jN,speed/(1+dot(axis,axis)*inverse));const jt=mul(dir,jT);s.v=add(s.v,jt);s.w=add(s.w,mul(cross(foot,jt),inverse));}
    }
    if(impact>.52&&age-s.lastImpact>.095){collisions.push({piece:i,age,speed:impact,position:[footHit[0],position[1],footHit[2]]});
     if(impact>.67&&Math.hypot(...before)>.19&&[0,2,3,4].includes(i)&&!bites.some(b=>b.piece===i)){
      const qinv=[-s.r[0],-s.r[1],-s.r[2],s.r[3]],foot=sub(footHit,s.p);
      const world=[footHit[0],position[1],footHit[2]];
      s.pin={world,local:rotate(foot,qinv),start:age,hold:.095+Math.min(.06,impact*.022)};
      const inertia=coeff[i],L=add(mul(s.w,inertia),cross(mul(foot,-1),s.v));s.w=mul(L,1/(inertia+dot(foot,foot)));s.v=mul(cross(s.w,foot),-1);
      bites.push({piece:i,age,position:[footHit[0],position[1],footHit[2]],dir:unit(before),speed:Math.hypot(...before),impact});}s.lastImpact=age;}
    if(feet.length>=2&&impact>.0001){const crush=Math.exp(-Math.min(1,impact)*.39);s.w=mul(s.w,crush);}
    if(feet.length>=3&&Math.hypot(...s.v)<.085&&Math.hypot(...s.w)<.19){s.settled=true;s.v=[0,0,0];s.w=[0,0,0];}
   }
   minimumSupport=Math.min(minimumSupport,Math.min(...radii.map(p=>p[1]+s.p[1]))-position[1]);
  });frames.push(save());
 }
 return {receipt:{...receipt,position,yawRadians:yaw},frames,collisions,bites,release,expose,root,initial,metrics:{volume:TOTAL_VOLUME,pieceVolumes:PIECES.map(p=>p.volume),dominantFraction:Math.max(...PIECES.map(p=>p.volume))/TOTAL_VOLUME,minimumSupport,initialMomentum,releaseMomentum}};
}
export function sample(plan,age,reduced=false){const t=Math.max(0,Math.min(LIFETIME,age)),k=reduced?0:Math.min(plan.frames.length-1,Math.floor(t/DT));return plan.frames[k];}
// Friction shaving is deposited on the world floor along the contact motion; it remains fixed once laid.
function transfer(out,b,age,fade){
 const dt=age-b.age;if(dt<0)return;
 const grow=Math.min(1,dt/.065),d=b.dir,o=b.position,n=[-d[2],0,d[0]],reach=Math.min(.175,.039+b.speed*.062),width=Math.min(.033,.013+b.impact*.009);
 const put=(x,z,a)=>{const p=add(add(o,mul(d,x)),mul(n,z));p[1]+=.0013;out.push(...p,0,1,0,-2,fade,a,1,0,0,0,0,0,0,0,1,0,0);};
 // Two unequal sheared strips, left behind only by actual corners that hit and stick.
 for(let side=0;side<2;side++){const s=side===0?1:-1,offset=width*(side===0?.11:.64),length=reach*(side===0?1:.62);
 const A=[-.008,s*offset,.40],B=[length*grow*.28,s*(offset+width*.9),.57],C=[length*grow,s*(offset+width*.33),.18],D=[length*grow*.31,s*(offset-width*.47),.41];
 for(const tri of (side===0?[[A,B,C],[A,C,D]]:[[A,C,B],[A,D,C]]))for(const pt of tri)put(...pt);}
}
function crushToe(out,b,age,fade){
 const t=age-b.age;if(t<=0||t>.56)return;
 const g=1-Math.exp(-t/.057),survive=Math.min(1,(.56-t)/.15),pow=Math.min(1.32,.4+b.impact*.25),d=b.dir,n=[-d[2],0,d[0]],o=b.position;
 const reach=(.19+.08*Math.min(2,b.speed))*pow,ww=(.049+.021*pow);
 const a=fade*survive;
 // One coherent squeezed-out corn bed per loaded toe. The edge advances then slumps at the same floor location.
 const along=[0,.19,.43,.73,1],span=[.41,.82,.98,.76,.18],speed=[0,.2,.56,.88,1],ridge=[0,.42,.86,1,.18];
 const at=(i,j)=>{
  const side=j===0?-1:j===1?-.20:1,reachJ=reach*along[i]*(j===0?1.0:j===1?1.12:.79);
  const x=g*reachJ,z=ww*(side*span[i]+.19*Math.sin(5*along[i]))*(.32+.68*g);
  const p=add(add(o,mul(d,x)),mul(n,z));p[1]+=.003+(j===1?.037: .006)*pow*ridge[i]*(.50+.50*Math.exp(-t/.14))*(.32+.68*g);
  return {p,i,j,u:along[i],v:(side+1)*.5};
 };
 for(let i=0;i<4;i++)for(let j=0;j<2;j++){
  const A=at(i,j),B=at(i+1,j),C=at(i+1,j+1),D=at(i,j+1);
  for(const face of [[A,C,B],[A,D,C]]){
   const normal=unit(cross(sub(face[1].p,face[0].p),sub(face[2].p,face[0].p)));
   for(const v of face){out.push(...v.p,...normal,-3,a,t,1,v.u,v.v,pow,0,0,0,0,1,0,0);}
  }
 }
}

export function geometry(plan,age,{reduced=false,source=true}={}){
 const out=[],lights=[];if(!source||age<0||age>=LIFETIME)return {vertices:new Float32Array(),lights,states:[]};
 const states=sample(plan,age,reduced),fade=1-Math.max(0,Math.min(1,(age-1)/.55)),clock=reduced?-1:age;
 states.forEach((s,i)=>{const piece=PIECES[i];for(const f of piece.faces){
 if(f.cut&&(age<plan.expose[0]||reduced))continue;const normal=rotate(f.normal,s.r);for(const p of f.points){out.push(...add(rotate(p,s.r),s.p),...normal,f.cut,fade,clock,s.r[3],...add(p,piece.center),...s.r.slice(0,3),...f.normal,i+(reduced||age<plan.expose[0]?5:age<plan.expose[i]?10:0));}}
 // Encoded signed quantity: positive = physical light, (-2,0) = a support occluder. Geometry survives light/observer ablation.
 lights.push([s.p[0],s.p[1],s.p[2],-(.26+.54*Math.cbrt(piece.volume))*fade]);
 });
 if(!reduced){
 const t=Math.max(0,Math.min(1,(age-.008)/.158)),x=-.5+t*.99,z=.265-.045*Math.sin(t*Math.PI);
 const stress=age<.166?Math.sin(Math.PI*t):0;
 if(stress>0){const p=add(plan.root,rotate([x,-.032-.078*x-.16*z,z],plan.initial));lights.push([...p,stress*1.8]);}
 for(const b of plan.bites){transfer(out,b,age,fade);crushToe(out,b,age,fade);}
 }return {vertices:new Float32Array(out),lights,states};
}
