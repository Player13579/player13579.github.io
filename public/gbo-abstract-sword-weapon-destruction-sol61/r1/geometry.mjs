export const DESIGN=Object.freeze({edition:1,duration:1.6,breakAt:.42,guardLag:.06,gripLag:.11,tilt:-.24,gravity:.62,observerRadius:2.2,observerGain:.42});
export const SWORD_BOUNDS=Object.freeze({bottom:-.34,top:.71,height:1.05,guardWidth:.48,bladeWidth:.20});
// 断片は破断前に一つの剣の面を隙間なく構成する。装備の種類は描画入力にしない。
const pieces=[
 {id:'blade-base',p:[[-.1,-.035],[.1,-.035],[.1,.22],[.018,.264],[-.1,.22]],velocity:[-.26,.11],omega:-.6,lag:0},
 {id:'blade-middle',p:[[-.1,.22],[.018,.264],[.1,.22],[.082,.46],[-.026,.498],[-.082,.46]],velocity:[.29,.16],omega:1.0,lag:0},
 {id:'blade-tip',p:[[-.082,.46],[-.026,.498],[.082,.46],[.066,.57],[0,.71],[-.066,.57]],velocity:[-.12,.3],omega:-1.05,lag:0},
 {id:'guard-left',p:[[-.24,-.065],[0,-.065],[0,.01],[-.24,.01]],velocity:[-.36,-.01],omega:-1.4,lag:.06},
 {id:'guard-right',p:[[0,-.065],[.24,-.065],[.24,.01],[0,.01]],velocity:[.36,.03],omega:1.35,lag:.06},
 {id:'grip',p:[[-.041,-.26],[.041,-.26],[.041,-.065],[-.041,-.065]],velocity:[.08,-.15],omega:.45,lag:.11},
 {id:'pommel',p:[[0,-.34],[.074,-.29],[0,-.24],[-.074,-.29]],velocity:[-.1,-.2],omega:-.7,lag:.11}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a),0,1);return q*q*(3-2*q)};
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
export function fragmentState(piece,age,options={}){
 const c=piece.p.reduce((s,p)=>[s[0]+p[0]/piece.p.length,s[1]+p[1]/piece.p.length],[0,0]);
 const tau=Math.max(0,age-DESIGN.breakAt-piece.lag); const movement=options.reducedMotion ? .32 : 1;
 const translation=[piece.velocity[0]*tau*movement,(piece.velocity[1]*tau-.5*DESIGN.gravity*tau*tau)*movement];
 const angle=piece.omega*tau*movement;return {id:piece.id,centroid:c,translation,angle,tau,points:piece.p.map(p=>{const q=rotate([p[0]-c[0],p[1]-c[1]],angle);return rotate([q[0]+c[0]+translation[0],q[1]+c[1]+translation[1]],DESIGN.tilt)})};
}
export function inspectSword(age,options={}) {if(!Number.isFinite(age)||age<0)throw Error('AGE_MUST_BE_FINITE_NONNEGATIVE'); return pieces.map(p=>fragmentState(p,age,options))}
// 凹な破断面を扇形triangulationで塗り潰さない。耳切りで元polygonの支持を保つ。
export function triangulate(poly){
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const area=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1]},0);const sign=Math.sign(area);if(!sign)throw Error('DEGENERATE_POLYGON');
 const inside=(p,a,b,c)=>[cross(a,b,p),cross(b,c,p),cross(c,a,p)].every(v=>sign*v>=-1e-10);
 const ids=poly.map((_,i)=>i),result=[];let cap=poly.length*poly.length;
 while(ids.length>3&&cap-->0){let cut=false;for(let k=0;k<ids.length;k++){const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];if(sign*cross(poly[a],poly[b],poly[c])<=1e-10)continue;if(ids.some(j=>j!==a&&j!==b&&j!==c&&inside(poly[j],poly[a],poly[b],poly[c])))continue;result.push([a,b,c]);ids.splice(k,1);cut=true;break}if(!cut)throw Error('NON_SIMPLE_POLYGON')}
 if(ids.length!==3)throw Error('TRIANGULATION_INCOMPLETE');result.push([...ids]);return result;
}
export function sampleSword(age,options={},viewport={width:320,height:180}){
 if(!Number.isFinite(age)||age<0)throw Error('AGE_MUST_BE_FINITE_NONNEGATIVE');const width=viewport.width,height=viewport.height;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_VIEWPORT');
 const heightPx=options.heightPx??64;if(!Number.isFinite(heightPx)||heightPx<=0)throw Error('INVALID_HEIGHT');
 const centerX=options.centerX??.5,centerY=options.centerY??.52;if(!Number.isFinite(centerX)||!Number.isFinite(centerY))throw Error('INVALID_CENTER');
 const intactY=pieces.flatMap(p=>p.p.map(v=>rotate(v,DESIGN.tilt)[1]));const projectedIntactHeight=Math.max(...intactY)-Math.min(...intactY);const pxPerUnit=heightPx/projectedIntactHeight;const out=[];const sourceSites=[];const opacity=smooth(0,.055,age)*(1-smooth(1.15,1.6,age));
 const active=age<DESIGN.duration;const emission=options.emissionOn===false?0:1;
 const put=(p,color,alpha)=>{const x=centerX*width+p[0]*pxPerUnit,y=centerY*height-p[1]*pxPerUnit;out.push(x/width*2-1,1-y/height*2,color[0]*alpha,color[1]*alpha,color[2]*alpha,alpha)};
 const tri=(a,b,c,color,alpha)=>{put(a,color,alpha);put(b,color,alpha);put(c,color,alpha)};
 const line=(a,b,r,color,alpha)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)return;const n=[-dy/length*r,dx/length*r],p=[a[0]+n[0],a[1]+n[1]],q=[a[0]-n[0],a[1]-n[1]],s=[b[0]-n[0],b[1]-n[1]],t=[b[0]+n[0],b[1]+n[1]];tri(p,q,s,color,alpha);tri(p,s,t,color,alpha)};
 const sourceStrength=emission*(smooth(.22,.38,age)*(1-smooth(.42,.7,age))*7.4);
 if(active&&opacity>0)pieces.forEach((p,i)=>{
   const state=fragmentState(p,age,options);const color=i<3?[.12+.42*emission,.21+.88*emission,.31+1.12*emission]:[.1+.33*emission,.16+.61*emission,.22+.81*emission];
   for(const [a,b,c]of triangulate(state.points))tri(state.points[a],state.points[b],state.points[c],color,opacity*.94);
   // 主面と分離して有限幅の輪郭を残す。剣の輪郭をOBSへ委ねない。
   for(let j=0;j<state.points.length;j++)line(state.points[j],state.points[(j+1)%state.points.length],.008,[.17+.66*emission,.28+1.22*emission,.36+1.6*emission],opacity);
   if(i<3&&sourceStrength>0){const indices=i===0?[2,3,4]:i===1?[0,1,2]:[0,1,2];for(let j=0;j<indices.length-1;j++){const a=state.points[indices[j]],b=state.points[indices[j+1]];line(a,b,.012,[sourceStrength,sourceStrength*.48,sourceStrength*.17],opacity);sourceSites.push(Object.freeze({fragment:p.id,x:centerX+(a[0]+b[0])*.5*pxPerUnit/width,y:centerY-(a[1]+b[1])*.5*pxPerUnit/height,length:Math.hypot(b[0]-a[0],b[1]-a[1]),intensity:sourceStrength*opacity}));}}
 });
 const sourcePoint=rotate([0,.25],DESIGN.tilt);const sourceLength=sourceSites.reduce((sum,s)=>sum+s.length,0);const sx=sourceLength>0?sourceSites.reduce((sum,s)=>sum+s.x*s.length,0)/sourceLength:centerX+sourcePoint[0]*pxPerUnit/width;const sy=sourceLength>0?sourceSites.reduce((sum,s)=>sum+s.y*s.length,0)/sourceLength:centerY-sourcePoint[1]*pxPerUnit/height;
 return {vertices:new Float32Array(out),count:out.length/6,active,phase:age>=1.6?'clear':age>=1.15?'remnant-clear':age>=.53?'destroyed':age>=.42?'fracture':age>=.22?'stress':'intact',source:Object.freeze({x:sx,y:sy,intensity:sourceStrength*opacity,sites:Object.freeze(sourceSites)}),geometry:{heightPx,pxPerUnit,projectedIntactHeight,fragmentCount:pieces.length,silhouette:'abstract-sword',equippedWeaponIndependent:true}};
}
export const registeredFragments=()=>pieces.map(p=>({...p,p:p.p.map(v=>[...v])}));
