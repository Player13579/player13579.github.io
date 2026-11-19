export const H64_SCALE=64/(1.778*.92),LIFETIME=1.55,CYCLE=2.05,DT=1/240;
export const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));

const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-dot(a.slice(0,3),b.slice(0,3))];
const axisQ=(i,t)=>{let q=[0,0,0,Math.cos(t*.5)];q[i]=Math.sin(t*.5);return q;};
const fromAngles=r=>qmul(axisQ(2,r[2]),qmul(axisQ(1,r[1]),axisQ(0,r[0])));

export function rotate(v,r){if(r.length===4){const a=r.slice(0,3),b=mul(cross(a,v),2);return add(v,add(mul(b,r[3]),cross(a,b)));}let [x,y,z]=v;let c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];c=Math.cos(r[1]);s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];c=Math.cos(r[2]);s=Math.sin(r[2]);return [x*c-y*s,x*s+y*c,z];}

// Ruled, weather-notched freezing fronts. The three unequal projecting shelves below are actual
// silhouettes and occlude their wet undersides; the middle of the cap is not rotationally symmetric.
const xs=[-1.04,-.96,-.80,-.60,-.44,-.30,-.06,.25,.57,.86,1.04];
const tops=[.25,.34,.48,.54,.53,.43,.46,.40,.30,.22,.09], fore=[.14,.30,.46,.54,.45,.36,.46,.41,.29,.17,.035],back=[.12,.32,.41,.42,.33,.33,.34,.30,.25,.17,.08];
const rings=xs.map((x,i)=>{const t=tops[i],F=fore[i],B=back[i],a=Math.sin(1.9*i),b=Math.cos(1.46*i),c=Math.sin(2.38*i);const r=(h,z)=>[x+(i===5?h*(.06+0.2*Math.sin(7.3*z+4.8*h)-0.105*Math.cos(10.*z-8.8*h)):0),h,z];return [
 r(0,-B*.71),r(.028,-B*.97),r(t*.56,-B*(1.02+.07*b)),r(t*(.87+.07*c),-B*.90),r(t*(1.03+.045*a),-B*.51),r(t*(1.06+.07*b),F*(.02+.08*a)),r(t*(.93+.075*c),F*.66),
 r(t*(.87+.065*a),F*(.99+.07*b)),r(t*(.73+.065*c),F*(1.11+.09*a)),r(t*(.61+.055*c),F*(.76+.06*b)),r(t*(.51+.05*b),F*(1.11+.10*c)),r(t*(.35+.038*a),F*(1.12+.07*a)),r(t*(.28+.04*a),F*(.94+.07*c)),r(t*(.14+.027*c),F*(1.02+.07*b)),r(0,F*.76)];});
function makePiece(id,first,last){const faces=[],points=rings.slice(first,last+1).flat(),inside=mul(points.reduce(add),1/points.length);let volume=0,firstMoment=[0,0,0];
 function tri(p,q,r,cut,interior){let N=cross(sub(q,p),sub(r,p));if(dot(N,sub(p,interior))<0){[r,q]=[q,r];N=mul(N,-1)}if(Math.hypot(...N)<1e-10)return;
 const vol=dot(sub(p,inside),cross(sub(q,inside),sub(r,inside)))/6;volume+=vol;firstMoment=add(firstMoment,mul(add(add(p,q),add(r,inside)),vol/4));faces.push({points:[p,q,r],normal:unit(N),cut});}
 const nr=rings[0].length;
 for(let j=first;j<last;j++){const L=rings[j],R=rings[j+1];for(let k=0;k<nr;k++){const next=(k+1)%nr;const flag=k>=3&&k<=6?3:(k===8||k===11?4:k===7||k===10?5:0);
 // y,z outline is clockwise when seen from +x. Winding follows ring topology even in the concave lip.
 const ax=mul(add(L[k],R[k]),.5),t=mul(add(sub(L[next],L[k]),sub(R[next],R[k])),.5);let normal=unit([0,t[2],-t[1]]);const interior=sub(ax,mul(normal,3));
 if((j+k)%2){tri(L[k],R[k],L[next],flag,interior);tri(L[next],R[k],R[next],flag,interior)}else{tri(L[k],R[k],R[next],flag,interior);tri(L[k],R[next],L[next],flag,interior)} }}
 for(const j of [first,last]){const ring=rings[j],mid=[xs[j],tops[j]*.48,0];for(let k=0;k<nr;k++)tri(mid,ring[k],ring[(k+1)%nr],j===5?1:6,inside);}
 const center=mul(firstMoment,1/volume);return {id,center,volume,points:points.map(p=>sub(p,center)),faces:faces.map(f=>({...f,points:f.points.map(p=>sub(p,center))}))};}
export const PIECES=[makePiece(0,0,5),makePiece(1,5,10)], TOTAL_VOLUME=PIECES.reduce((a,b)=>a+b.volume,0);
const at=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a))),smooth=t=>t*t*(3-2*t);
export function makePlan(receipt={}){
 const position=receipt.position??[0,0,0],yaw=receipt.yawRadians??0;if(position.length!==3||!position.every(Number.isFinite)||!Number.isFinite(yaw))throw Error('invalid fixture receipt');
 const initial=[0,yaw-.12,0],Q=fromAngles(initial),root=position.slice(),ends=[-1.04,1.04],crease=-.30,span=[.74,1.34],split=9*DT,peak=53*DT,breakaway=91*DT;
 const maxLift=.672,frames=[],collisions=[],bites=[],hits=[null,null];
 const angles=[0,0],rates=[0,0],soles=ends.slice(),drift=[0,0],released=[false,false],settled=[false,false];
 const world=v=>add(root,rotate(v,initial));const pose=(i,angular,sole,vx,vy)=>{const pivot=[ends[i],0,0],offs=rotate(sub(PIECES[i].center,pivot),[0,0,angular]);
 return {p:world(add([sole,0,0],offs)),r:qmul(Q,axisQ(2,angular)),v:rotate([vx,vy,0],initial),angle:angular,sole,free:released[i],settled:settled[i]};};
 for(let k=0;k<=Math.ceil(LIFETIME/DT);k++){const age=k*DT;const load=smooth(at(age,split,peak));
 for(let i=0;i<2;i++){const sign=i?-1:1,trigger=i?breakaway:breakaway+.125;
 if(age+1e-8<trigger){const h=maxLift*load;angles[i]=sign*Math.asin(h/span[i]);soles[i]=crease+(i?1:-1)*Math.sqrt(span[i]*span[i]-h*h);continue;}
 if(!released[i]){released[i]=true;rates[i]=i?.64:-2.28;drift[i]=i?2.93:-1.86;}
 if(settled[i])continue;
 soles[i]+=drift[i]*DT;
 if(hits[i]===null){const pc=PIECES[i],foot=[ends[i],0,0],R=rotate(sub(pc.center,foot),[0,0,angles[i]]);
 const I=pc.points.reduce((sum,v)=>{const q=sub(add(v,pc.center),foot);return sum+q[0]*q[0]+q[1]*q[1];},0)/pc.points.length;
 // Gravity on the unsupported mass gives a true angular acceleration about the translating outer toe.
 rates[i]+=(-9.81*R[0]/I-1.65*rates[i])*DT;angles[i]+=rates[i]*DT;
 if(sign*angles[i]<=0){const speed=span[i]*Math.abs(rates[i]),tip=world([soles[i]+(i?-span[i]:span[i]),0,fore[5]*.76]);const worldDir=rotate([Math.sign(drift[i]),0,0],initial);angles[i]=0;rates[i]=0;hits[i]=age;
 collisions.push({piece:i,age,speed,position:tip});bites.push({piece:i,age,position:tip,dir:worldDir,impact:speed,speed:Math.abs(drift[i])});drift[i]*=.36;}}
 drift[i]=Math.sign(drift[i])*Math.max(0,Math.abs(drift[i])-(hits[i]===null?3.6:7.0)*DT);if(hits[i]!==null&&Math.abs(drift[i])<1e-5)settled[i]=true;
 }
 const pair=PIECES.map((p,i)=>pose(i,angles[i],soles[i],drift[i],0));if(k>0)pair.forEach((s,i)=>s.v=mul(sub(s.p,frames[k-1][i].p),1/DT));frames.push(pair);
 }
 return{receipt:{...receipt,position,yawRadians:yaw},split,peak,breakaway,release:[breakaway+.125,breakaway],root,initial,frames,collisions,bites,metrics:{volume:TOTAL_VOLUME,pieceVolumes:PIECES.map(p=>p.volume)}};
}
export function sample(plan,age,reduced=false){return plan.frames[reduced?0:Math.min(plan.frames.length-1,Math.max(0,Math.floor(age/DT)))];}
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
 for(const [i,piece] of PIECES.entries()){const s=states[i];for(const f of piece.faces){if(f.cut===1&&(reduced||age<=plan.split))continue;const normal=rotate(f.normal,s.r);
 for(const p of f.points)out.push(...add(rotate(p,s.r),s.p),...normal,f.cut,fade,clock,s.r[3],...add(p,piece.center),...s.r.slice(0,3),...f.normal,(reduced||age<=plan.split)?2:i);}
 lights.push([...s.p,-(.26+.54*Math.cbrt(piece.volume))*fade]);}
 if(!reduced){if(age>plan.split&&age<.198){const s=states[1],u=at(age,plan.split,.198),p=[.60-.63*u,.18+.15*u,.31];const wp=add(s.p,rotate(sub(p,PIECES[1].center),s.r));lights.push([...wp,2.75*Math.sin(Math.PI*u)]);}
 for(const b of plan.bites){transfer(out,b,age,fade);crushToe(out,b,age,fade);}}
 return {vertices:new Float32Array(out),lights,states};}
