export const DESIGN=Object.freeze({edition:6,duration:1.6,breakAt:.42,guardLag:.06,gripLag:.11,tilt:-.24,gravity:.62,observerRadius:2.2,observerGain:.42});
export const SWORD_BOUNDS=Object.freeze({bottom:-.34,top:.71,height:1.05,guardWidth:.48,bladeWidth:.20});
// Seven broad registered parts describe one abstract sword independent of equipped weapon type.
const rawPieces=[
 {id:'blade-base',p:[[-0.1,-0.035],[0.1,-0.035],[0.1,0.23],[0.07,0.248],[0.018,0.205],[-0.03,0.238],[-0.1,0.218]],velocity:[-.26,.11],omega:-.6,lag:0},
 {id:'blade-middle',p:[[-0.1,0.218],[-0.03,0.238],[0.018,0.205],[0.07,0.248],[0.1,0.23],[0.082,0.465],[0.035,0.488],[-0.025,0.45],[-0.082,0.475]],velocity:[.29,.16],omega:1.0,lag:0},
 {id:'blade-tip',p:[[-0.082,0.475],[-0.025,0.45],[0.035,0.488],[0.082,0.465],[0.066,0.57],[0,0.71],[-0.066,0.57]],velocity:[-.12,.3],omega:-1.05,lag:0},
 {id:'guard-left',p:[[-.24,-.065],[0,-.065],[0,.01],[-.24,.01]],velocity:[-.36,-.01],omega:-1.4,lag:.06},
 {id:'guard-right',p:[[0,-.065],[.24,-.065],[.24,.01],[0,.01]],velocity:[.36,.03],omega:1.35,lag:.06},
 {id:'grip',p:[[-.041,-.26],[.041,-.26],[.041,-.065],[-.041,-.065]],velocity:[.08,-.15],omega:.45,lag:.11},
 {id:'pommel',p:[[0,-.34],[.074,-.29],[0,-.24],[-.074,-.29]],velocity:[-.1,-.2],omega:-.7,lag:.11}
];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,v)=>{const q=clamp((v-a)/(b-a),0,1);return q*q*(3-2*q)};
const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const cross=(a,b)=>a[0]*b[1]-b[0]*a[1];
export function polygonMassProperties(poly){
 let twiceArea=0,cxNumerator=0,cyNumerator=0,inertiaOrigin=0;
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],c=cross(a,b);twiceArea+=c;cxNumerator+=(a[0]+b[0])*c;cyNumerator+=(a[1]+b[1])*c;
  inertiaOrigin+=c*(a[0]*a[0]+a[0]*b[0]+b[0]*b[0]+a[1]*a[1]+a[1]*b[1]+b[1]*b[1])/12;
 }
 const signedArea=twiceArea/2;if(!Number.isFinite(signedArea)||Math.abs(signedArea)<1e-12)throw Error('DEGENERATE_POLYGON');
 const centroid=[cxNumerator/(6*signedArea),cyNumerator/(6*signedArea)],mass=Math.abs(signedArea);
 const inertia=Math.max(0,Math.abs(inertiaOrigin)-mass*(centroid[0]**2+centroid[1]**2));
 if(![mass,...centroid,inertia].every(Number.isFinite)||mass<=0||inertia<=0)throw Error('INVALID_MASS_PROPERTIES');
 return Object.freeze({signedArea,mass,centroid:Object.freeze(centroid),inertia});
}
const prepared=rawPieces.map(piece=>({...piece,...polygonMassProperties(piece.p)}));
const totalMass=prepared.reduce((sum,p)=>sum+p.mass,0);
const meanVx=prepared.reduce((sum,p)=>sum+p.mass*p.velocity[0],0)/totalMass;
const totalInertia=prepared.reduce((sum,p)=>sum+p.inertia,0);
const meanOmega=prepared.reduce((sum,p)=>sum+p.inertia*p.omega,0)/totalInertia;
const minMass=Math.min(...prepared.map(p=>p.mass)),maxMass=Math.max(...prepared.map(p=>p.mass));
const pieces=prepared.map(p=>{const q=(p.mass-minMass)/(maxMass-minMass),displayEnd=1.30+.30*q;return {...p,displayEnd,fadeStart:displayEnd-.25,correctedVelocity:Object.freeze([p.velocity[0]-meanVx,p.velocity[1]]),correctedOmega:p.omega-meanOmega}});
export function fragmentState(piece,age,options={}){
 const c=piece.centroid;
 const tau=Math.max(0,age-DESIGN.breakAt-piece.lag),movement=options.reducedMotion?.32:1;
 const translation=[piece.correctedVelocity[0]*tau*movement,(piece.correctedVelocity[1]*tau-.5*DESIGN.gravity*tau*tau)*movement];
 const angle=piece.correctedOmega*tau*movement;
 return {id:piece.id,centroid:[...c],translation,angle,tau,points:piece.p.map(p=>{const q=rotate([p[0]-c[0],p[1]-c[1]],angle);return rotate([q[0]+c[0]+translation[0],q[1]+c[1]+translation[1]],DESIGN.tilt)})};
}
export function inspectSword(age,options={}){if(!Number.isFinite(age)||age<0)throw Error('AGE_MUST_BE_FINITE_NONNEGATIVE');return pieces.map(p=>fragmentState(p,age,options))}
export function triangulate(poly){
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const area=poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1]},0),sign=Math.sign(area);if(!sign)throw Error('DEGENERATE_POLYGON');
 const inside=(p,a,b,c)=>[turn(a,b,p),turn(b,c,p),turn(c,a,p)].every(v=>sign*v>=-1e-10);
 const ids=poly.map((_,i)=>i),result=[];let cap=poly.length*poly.length;
 while(ids.length>3&&cap-->0){let cut=false;for(let k=0;k<ids.length;k++){const a=ids[(k+ids.length-1)%ids.length],b=ids[k],c=ids[(k+1)%ids.length];if(sign*turn(poly[a],poly[b],poly[c])<=1e-10)continue;if(ids.some(j=>j!==a&&j!==b&&j!==c&&inside(poly[j],poly[a],poly[b],poly[c])))continue;result.push([a,b,c]);ids.splice(k,1);cut=true;break}if(!cut)throw Error('NON_SIMPLE_POLYGON')}
 if(ids.length!==3)throw Error('TRIANGULATION_INCOMPLETE');result.push([...ids]);return result;
}
export function emitCutChain(points,indices,progress){
 const segments=[];const lengths=[];let total=0;
 for(let i=0;i<indices.length-1;i++){const a=points[indices[i]],b=points[indices[i+1]],length=Math.hypot(b[0]-a[0],b[1]-a[1]);lengths.push(length);total+=length;}
 let prior=0;const visibleTotal=clamp(progress,0,1)*total;
 for(let i=0;i<lengths.length;i++){const a=points[indices[i]],b=points[indices[i+1]],length=lengths[i];
  const visibleLength=clamp(visibleTotal-prior,0,length);
  if(visibleLength>1e-12){const t=visibleLength/length;segments.push({a:[...a],b:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],length:visibleLength});}
  prior+=length;
 }
 return segments;
}
// R6: radiant matter belongs to each registered polygon, not to an independent glow sprite.
// The finite representation lifetime controls both coverage and emitted flux; no temperature/melting claim.
export function emissionStrength(age){
 if(!Number.isFinite(age)||age<0)throw Error('AGE_MUST_BE_FINITE_NONNEGATIVE');
 if(age>=DESIGN.duration)return 0;
 return smooth(.055,.30,age)*(9+4*smooth(.30,.405,age))*(1-.30*smooth(.42,.64,age));
}
export function fragmentOpacity(piece,age){return age>=DESIGN.duration?0:smooth(0,.055,age)*(1-smooth(piece.fadeStart,piece.displayEnd,age));}
function visiblePolygon(points,width,height){
 let poly=points.map(p=>[...p]);
 for(const [axis,bound,greater] of [[0,0,true],[0,width,false],[1,0,true],[1,height,false]]){
  const result=[];if(!poly.length)break;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=greater?a[axis]>=bound:a[axis]<=bound,bi=greater?b[axis]>=bound:b[axis]<=bound;
   if(ai)result.push(a);
   if(ai!==bi){const t=(bound-a[axis])/(b[axis]-a[axis]);const c=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];c[axis]=bound;result.push(c);}
  }poly=result;
 }return poly;
}
export function sampleSword(age,options={},viewport={width:320,height:180}){
 if(!Number.isFinite(age)||age<0)throw Error('AGE_MUST_BE_FINITE_NONNEGATIVE');const {width,height}=viewport;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_VIEWPORT');
 const heightPx=options.heightPx??64;if(!Number.isFinite(heightPx)||heightPx<=0)throw Error('INVALID_HEIGHT');
 const centerX=options.centerX??.5,centerY=options.centerY??.52;if(!Number.isFinite(centerX)||!Number.isFinite(centerY))throw Error('INVALID_CENTER');
 const intactY=pieces.flatMap(p=>p.p.map(v=>rotate(v,DESIGN.tilt)[1])),projectedIntactHeight=Math.max(...intactY)-Math.min(...intactY),pxPerUnit=heightPx/projectedIntactHeight,out=[],sourceSites=[],fragmentSources=[];
 const active=age<DESIGN.duration,emission=options.emissionOn===false||options.sourceOn===false?0:1,strength=emission*emissionStrength(age);
 const pixel=p=>[centerX*width+p[0]*pxPerUnit,centerY*height-p[1]*pxPerUnit];
 // Interleaved position + covered WORLD radiance + distinct covered PH emission (10 floats).
 const put=(p,material,light,alpha)=>{const [x,y]=pixel(p);out.push(x/width*2-1,1-y/height*2,(material[0]+light[0])*alpha,(material[1]+light[1])*alpha,(material[2]+light[2])*alpha,alpha,light[0]*alpha,light[1]*alpha,light[2]*alpha,alpha)};
 const tri=(a,b,c,m,e,alpha)=>{put(a,m,e,alpha);put(b,m,e,alpha);put(c,m,e,alpha)};
 const line=(a,b,r,m,e,alpha)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(!length)return;const n=[-dy/length*r,dx/length*r],p=[a[0]+n[0],a[1]+n[1]],q=[a[0]-n[0],a[1]-n[1]],s=[b[0]-n[0],b[1]-n[1]],t=[b[0]+n[0],b[1]+n[1]];tri(p,q,s,m,e,alpha);tri(p,s,t,m,e,alpha)};
 if(active)pieces.forEach((p,i)=>{
  const opacity=fragmentOpacity(p,age);if(opacity<=0)return;
  const state=fragmentState(p,age,options),color=i<3?[.12,.21,.31]:[.10,.16,.22],spectrum=i<3?[1,.98,.91]:i<5?[.75,.91,1]:[.56,.76,1],light=spectrum.map(c=>c*strength);
  for(const [a,b,c] of triangulate(state.points))tri(state.points[a],state.points[b],state.points[c],color,light,opacity*.94);
  // A lower-radiance finite contour bounds the white-hot broad faces; source strength is not clipped.
  for(let j=0;j<state.points.length;j++)line(state.points[j],state.points[(j+1)%state.points.length],.008,[.07,.16,.25],spectrum.map(c=>c*strength*.045),opacity);
  const support=visiblePolygon(state.points.map(pixel),width,height);
  let signedArea=0,cx=0,cy=0;for(let j=0;j<support.length;j++){const a=support[j],b=support[(j+1)%support.length],v=cross(a,b);signedArea+=v;cx+=(a[0]+b[0])*v;cy+=(a[1]+b[1])*v;}signedArea*=.5;
  const visibleArea=Math.abs(signedArea),visible=visibleArea>1e-10,radiance=light.map(c=>c*opacity*.94);
  const sourceState=Object.freeze({fragment:p.id,opacity,displayEnd:p.displayEnd,fadeStart:p.fadeStart,visible,visibleArea,translation:Object.freeze([...state.translation]),angle:state.angle,worldPoints:Object.freeze(state.points.map(p=>Object.freeze([...p]))),intensity:visible?Math.max(...radiance):0,radiance:Object.freeze(visible?radiance:[0,0,0])});fragmentSources.push(sourceState);
  if(strength>0&&visible){sourceSites.push(Object.freeze({fragment:p.id,kind:'luminous-face',x:cx/(6*signedArea)/width,y:cy/(6*signedArea)/height,area:visibleArea,intensity:Math.max(...radiance),opacity,displayEnd:p.displayEnd,radiance:Object.freeze(radiance),support:Object.freeze(support.map(p=>Object.freeze([p[0]/width,p[1]/height])))}));}
  // Preserve the old travelling stress-front cuts; they now sit on the same luminous material.
  if(i<3&&strength>0){const kind=i===2?'upper':'lower',indices=i===0?[6,5,4,3,2]:i===1?[0,1,2,3,4]:[0,1,2,3],progress=kind==='lower'?smooth(.22,.385,age):smooth(.255,.405,age),cutStrength=strength*.055;
   for(const seg of emitCutChain(state.points,indices,progress)){line(seg.a,seg.b,.012,[.10,.18,.25],[cutStrength,cutStrength*.82,cutStrength*.61],opacity);}
  }
 });
 const totalFlux=sourceSites.reduce((sum,s)=>sum+s.area*s.intensity,0),sx=totalFlux?sourceSites.reduce((sum,s)=>sum+s.x*s.area*s.intensity,0)/totalFlux:centerX,sy=totalFlux?sourceSites.reduce((sum,s)=>sum+s.y*s.area*s.intensity,0)/totalFlux:centerY;
 return {vertices:new Float32Array(out),count:out.length/10,active,phase:age>=1.6?'clear':age>=1.15?'luminous-remnant-clear':age>=.53?'luminous-destroyed':age>=.42?'luminous-fracture':age>=.055?'strong-prelight':'intact',source:Object.freeze({x:sx,y:sy,intensity:sourceSites.length?Math.max(...sourceSites.map(s=>s.intensity)):0,uncoveredStrength:strength,sites:Object.freeze(sourceSites),fragments:Object.freeze(fragmentSources)}),geometry:{heightPx,pxPerUnit,projectedIntactHeight,fragmentCount:pieces.length,silhouette:'abstract-sword',equippedWeaponIndependent:true,vertexStrideFloats:10,emissionBoundToFragment:true}};
}
export const registeredFragments=()=>pieces.map(p=>({...p,p:p.p.map(v=>[...v]),centroid:[...p.centroid],correctedVelocity:[...p.correctedVelocity]}));
