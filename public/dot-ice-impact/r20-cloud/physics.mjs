export const H64_SCALE=64/(1.778*.92),LIFETIME=1.55,CYCLE=2.05,DT=1/240;
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));

const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
const axisQ=(i,t)=>{let q=[0,0,0,Math.cos(t*.5)];q[i]=Math.sin(t*.5);return q;};
const fromAngles=r=>qmul(axisQ(2,r[2]),qmul(axisQ(1,r[1]),axisQ(0,r[0])));

export function rotate(v,r){if(r.length===4){const a=r.slice(0,3),b=mul(cross(a,v),2);return add(v,add(mul(b,r[3]),cross(a,b)));}let [x,y,z]=v;let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);return [x*c-y*s,x*s+y*c,z];}

const cells=[[[0,-1,0,0,0],[0.044,1,0.07,0.61,3],[-0.15,1,-0.205,0.66,3],[0.285,1,0.135,0.71,3],[-0.32,1,0.22,0.776,3],[-0.065,-0.14,1,0.355,0],[0.09,0.29,1,0.494,0],[-0.2,-0.19,-1,0.375,0],[-0.21,0.38,-1,0.547,0],[-1,0.06,0.24,0.738,0],[-0.77,0.29,0.85,0.654,0],[-0.72,-0.24,-0.8,0.646,0],[1,0.04,-0.11,0.829,0],[0.77,0.13,0.81,0.728,0],[0.74,-0.2,-0.84,0.724,0],[0.35,-0.82,0.49,0.36,0],[-0.38,-0.85,0.44,0.355,0],[1,-0.78,0.29,-0.095,1]],[[0,-1,0,0,0],[0.044,1,0.07,0.61,3],[-0.15,1,-0.205,0.66,3],[0.285,1,0.135,0.71,3],[-0.32,1,0.22,0.776,3],[-0.065,-0.14,1,0.355,0],[0.09,0.29,1,0.494,0],[-0.2,-0.19,-1,0.375,0],[-0.21,0.38,-1,0.547,0],[-1,0.06,0.24,0.738,0],[-0.77,0.29,0.85,0.654,0],[-0.72,-0.24,-0.8,0.646,0],[1,0.04,-0.11,0.829,0],[0.77,0.13,0.81,0.728,0],[0.74,-0.2,-0.84,0.724,0],[0.35,-0.82,0.49,0.36,0],[-0.38,-0.85,0.44,0.355,0],[-1,0.78,-0.29,0.095,1]],[[0,-1,0,0,0],[0.044,1,0.07,0.61,3],[-0.15,1,-0.205,0.66,3],[0.285,1,0.135,0.71,3],[-0.32,1,0.22,0.776,3],[-0.065,-0.14,1,0.355,0],[0.09,0.29,1,0.494,0],[-0.2,-0.19,-1,0.375,0],[-0.21,0.38,-1,0.547,0],[-1,0.06,0.24,0.738,0],[-0.77,0.29,0.85,0.654,0],[-0.72,-0.24,-0.8,0.646,0],[1,0.04,-0.11,0.829,0],[0.77,0.13,0.81,0.728,0],[0.74,-0.2,-0.84,0.724,0],[0.35,-0.82,0.49,0.36,0],[-0.38,-0.85,0.44,0.355,0]]];
function intersect(planes){const verts=[];for(let a=0;a<planes.length;a++)for(let b=a+1;b<planes.length;b++)for(let c=b+1;c<planes.length;c++){const [A,ad]=planes[a],[B,bd]=planes[b],[C,cd]=planes[c],det=dot(A,cross(B,C));if(Math.abs(det)<1e-9)continue;const p=mul(add(add(mul(cross(B,C),ad),mul(cross(C,A),bd)),mul(cross(A,B),cd)),1/det);if(planes.every(([n,d])=>dot(n,p)<=d+1e-8)&&!verts.some(v=>Math.hypot(...sub(v,p))<1e-7))verts.push(p);}return verts;}
const shapes=cells.map((raw,id)=>{const planes=raw.map(q=>[q.slice(0,3),q[3]]),v=intersect(planes),center=mul(v.reduce(add),1/v.length),faces=[];let vol=0;planes.forEach(([n,d],pi)=>{const ring=v.filter(p=>Math.abs(dot(n,p)-d)<1e-7);if(ring.length<3)return;const fc=mul(ring.reduce(add),1/ring.length),N=unit(n),U=unit(sub(ring[0],fc)),V=cross(N,U);ring.sort((a,b)=>Math.atan2(dot(sub(a,fc),V),dot(sub(a,fc),U))-Math.atan2(dot(sub(b,fc),V),dot(sub(b,fc),U)));for(let j=1;j<ring.length-1;j++){const tri=[ring[0],ring[j],ring[j+1]];vol+=Math.abs(dot(sub(tri[0],center),cross(sub(tri[1],center),sub(tri[2],center))))/6;faces.push({points:tri.map(p=>sub(p,center)),normal:N,cut:raw[pi][4]});}});return {id,volume:vol,center,faces,points:v.map(p=>sub(p,center))};});

export const [A,B,MONOLITH]=shapes, PIECES=[A,B], TOTAL_VOLUME=MONOLITH.volume;
export function makePlan(receipt={}){
 const position=receipt.position??[0,0,0],yaw=receipt.yawRadians??0;if(position.length!==3||!position.every(Number.isFinite)||!Number.isFinite(yaw))throw Error('invalid fixture receipt');



 const initial=[0,yaw+.06,0],root=position.slice(),split=14*DT,breakaway=56*DT;
 const release=[breakaway,breakaway],expose=[split,split];
 const tangent=[.78*.30-.29*(-.045),.30,-.045], slide=[-.09,0,.075];
 // Smooth driven translation, always tangent to the common inclined plane; both faces stay in contact.
 const ramp=age=>{const t=Math.max(0,Math.min(1,(age-split)/(breakaway-split)));return t*t*(3-2*t);};
 const shift=(i,age)=>mul(i?add(tangent,slide):slide,ramp(age));
 const v0=[[-.71,0,.75],[1.75,.16,-.04]],w0=[[0,.34,0],[.64,-.41,-1.14]];
 const state=PIECES.map((piece,i)=>({p:add(root,rotate(piece.center,initial)),r:fromAngles(initial),v:[0,0,0],w:[0,0,0],lastImpact:-100,settled:false,free:false}));
 const vRelease=v0.map(v=>rotate(v,initial));
 const initialMomentum=[0,0,0],releaseMomentum=vRelease.reduce((m,v,i)=>add(m,mul(v,PIECES[i].volume)),[0,0,0]);
 const frames=[],collisions=[],bites=[];let minimumSupport=Infinity;
 const save=()=>state.map(s=>({p:[...s.p],r:[...s.r],v:[...s.v],settled:s.settled,free:s.free}));frames.push(save());
 const coeff=PIECES.map(pc=>Math.max(.013,pc.points.reduce((sum,p)=>sum+dot(p,p),0)/pc.points.length*.54));
 for(let step=1;step<=Math.ceil(LIFETIME/DT);step++){
  const age=step*DT;
  state.forEach((s,i)=>{
   if(s.settled)return;
   if(!s.free&&age>=expose[i])s.p=add(root,rotate(add(PIECES[i].center,shift(i,age)),initial));
   if(age+1e-7<release[i])return;
   if(!s.free){s.free=true;s.v=vRelease[i].slice();s.w=rotate(w0[i],initial);}

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
     if(impact>.75&&Math.hypot(...before)>.19&&[0,1,2,3,4].includes(i)&&!bites.some(b=>b.piece===i)){
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
 return {receipt:{...receipt,position,yawRadians:yaw},frames,collisions,bites,release,expose,split,breakaway,shift,root,initial,metrics:{volume:TOTAL_VOLUME,pieceVolumes:PIECES.map(p=>p.volume),dominantFraction:Math.max(...PIECES.map(p=>p.volume))/TOTAL_VOLUME,minimumSupport,initialMomentum,releaseMomentum}};
}
export function sample(plan,age,reduced=false){const t=Math.max(0,Math.min(LIFETIME,age)),k=reduced?0:Math.min(plan.frames.length-1,Math.floor(t/DT));return plan.frames[k];}
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

// Contact lip: intersect the two translated real front faces with the shared shear plane and both envelopes.
// No detached snow cloud. Powder forms on that shared, loaded line only; once the faces leave, the lip vanishes.
function rim(out,plan,age,fade){
 if(age<=plan.split||age>=plan.breakaway)return;
 const t=(age-plan.split)/(plan.breakaway-plan.split),u=t*t*(3-2*t),s=plan.shift(0,age),delta=sub(plan.shift(1,age),s);
 // The moving half's front edge is behind the stationary front. Use ALL parent halfspaces of both instances
 // to clip a horizontal scan across their finite overlapping fault face, selecting its foremost z.
 const Y=.055+delta[1]+(.49-delta[1])*.52;
 function edgeAt(y){let l=-10,h=10;for(const ds of [[0,0,0],delta])for(const [a,b,c,bound] of cells[2]){
  const de=c-.29*a,val=bound+a*.095-(a*.78+b)*y+dot([a,b,c],ds);
  if(de>1e-7)h=Math.min(h,val/de);else if(de< -1e-7)l=Math.max(l,val/de);else if(val<0)return null;
 }return l<h?[.78*y-.29*h-.095,y,h]:null;}
 const strength=Math.pow(Math.sin(Math.PI*t),.69);const vtx=(p,width,bright)=>{const wp=add(plan.root,rotate(add(p,s),plan.initial));out.push(...wp,0,0,1,-4,fade,age,1,width,bright,0,0,0,0,0,0,1,0);};
 for(let j=0;j<2;j++){
 const base=Y+(j?.025:-.065),len=(j?.10:.21)*strength,w=(j?.023:.045)*strength;
 const points=[];for(let k=0;k<6;k++){const f=k/5, y=base+f*len;const o=edgeAt(y);if(!o)break;
 const tongue=(.021+.105*Math.sin(Math.PI*f))*strength*(j?.7:1);
 const tip=add(o,[tongue*.21,-tongue*.21,tongue]);
 const wj=w*Math.pow(Math.sin(Math.PI*f),.6)+.0015;
 points.push([add(tip,[-wj,.004,.003]),add(tip,[wj,-.004,.012*strength])]);}
 for(let k=0;k+1<points.length;k++){const [a,b]=points[k],[c,d]=points[k+1];for(const tri of [[a,b,c],[c,b,d],[c,b,a],[d,b,c]])for(const p of tri)vtx(p,(.40+.5*strength),.32+.61*(k%2));}
 }
}
export function geometry(plan,age,{reduced=false,source=true}={}){
 const out=[],lights=[];if(!source||age<0||age>=LIFETIME)return {vertices:new Float32Array(),lights,states:[]};
 const states=sample(plan,age,reduced),fade=1-Math.max(0,Math.min(1,(age-1)/.55)),clock=reduced?-1:age;
 const whole=reduced||age<=plan.split, bodies=whole?[[MONOLITH,{r:fromAngles(plan.initial),p:add(plan.root,rotate(MONOLITH.center,plan.initial))}]]:states.map((s,i)=>[PIECES[i],s]);
 for(const [piece,s] of bodies){for(const f of piece.faces){const normal=rotate(f.normal,s.r);
 for(const p of f.points)out.push(...add(rotate(p,s.r),s.p),...normal,f.cut,fade,clock,s.r[3],...add(p,piece.center),...s.r.slice(0,3),...f.normal,piece.id);}
 lights.push([...s.p,-(.26+.54*Math.cbrt(piece.volume))*fade]);}
 if(!reduced){rim(out,plan,age,fade);const u=Math.min(1,Math.max(0,age/plan.split));const sp=add(plan.root,rotate([.78*(.07+.45*u)-.29*.34-.095,.07+.45*u,.34],plan.initial));
 if(age<plan.split&&age>0)lights.push([...sp,2*Math.sin(Math.PI*u)]);
 for(const b of plan.bites){transfer(out,b,age,fade);crushToe(out,b,age,fade);}}
 return {vertices:new Float32Array(out),lights,states};
}
