'use strict';
// Allocation-light equivalent of the preview's triangle expansion and stable
// far-to-near sort. Triangle order, interpolation, blend inputs, and vertex ABI
// remain unchanged.
function geometry(frame){
 let triangleCount=0;const counts={components:frame.components.length,front:0,diaphragm:0,saddle:0,enclosure:0,outer:0,inner:0,walls:0};
 for(const comp of frame.components){if(counts[comp.role]===undefined)counts[comp.role]=0;counts[comp.role]++;triangleCount+=comp.triangles.length*2+comp.wallEdges.length*2;}
 counts.outer=counts.inner=frame.components.reduce((n,c)=>n+c.triangles.length,0);counts.walls=frame.components.reduce((n,c)=>n+c.wallEdges.length*2,0);
 const source=new Float32Array(triangleCount*30),depths=new Float64Array(triangleCount),order=new Uint32Array(triangleCount);
 let triIndex=0,at=0;
 const write=(p,n,m,core,normalSign=1)=>{
  const rgb=m.rgb,alpha=m.alpha??1,emission=m.emission||0,pe=m.premultipliedEmission||[0,0,0],invAlpha=alpha>1e-6?1/alpha:0;
  const cr=core?core.rgb[0]*core.emission:0,cg=core?core.rgb[1]*core.emission:0,cb=core?core.rgb[2]*core.emission:0;
  source[at++]=p[0];source[at++]=p[1];source[at++]=p[2];source[at++]=n[0]*normalSign;source[at++]=n[1]*normalSign;source[at++]=n[2]*normalSign;
  source[at++]=rgb[0]*(.50+emission)+cr+(invAlpha?pe[0]/alpha:0);source[at++]=rgb[1]*(.50+emission)+cg+(invAlpha?pe[1]/alpha:0);source[at++]=rgb[2]*(.50+emission)+cb+(invAlpha?pe[2]/alpha:0);source[at++]=alpha;
 };
 const emit=(a,na,ma,b,nb,mb,c,nc,mc)=>{
  depths[triIndex]=(a[2]+b[2]+c[2])/3;order[triIndex]=triIndex++;
  write(a,na,ma,null);write(b,nb,mb,null);write(c,nc,mc,null);
 };
 for(const comp of frame.components){const vs=comp.vertices;
  for(const ix of comp.triangles){const A=vs[ix[0]],B=vs[ix[1]],C=vs[ix[2]],ma=A.material.outer,mb=B.material.outer,mc=C.material.outer;
   depths[triIndex]=(A.point[2]+B.point[2]+C.point[2])/3;order[triIndex]=triIndex++;
   write(A.point,A.normal,ma,A.material.core);write(B.point,B.normal,mb,B.material.core);write(C.point,C.normal,mc,C.material.core);
   depths[triIndex]=(C.innerPoint[2]+B.innerPoint[2]+A.innerPoint[2])/3;order[triIndex]=triIndex++;
   write(C.innerPoint,C.normal,C.material.inner,null,-1);write(B.innerPoint,B.normal,B.material.inner,null,-1);write(A.innerPoint,A.normal,A.material.inner,null,-1);
  }
  for(const edge of comp.wallEdges){const A=vs[edge[0]],B=vs[edge[1]],u=[B.point[0]-A.point[0],B.point[1]-A.point[1],B.point[2]-A.point[2]],v=[A.innerPoint[0]-A.point[0],A.innerPoint[1]-A.point[1],A.innerPoint[2]-A.point[2]],n0=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(n0[0],n0[1],n0[2])||1,n=[n0[0]/len,n0[1]/len,n0[2]/len];
   emit(A.point,n,A.material.edge,B.point,n,B.material.edge,A.innerPoint,n,A.material.edge);
   emit(B.innerPoint,n,B.material.edge,A.innerPoint,n,A.material.edge,B.point,n,B.material.edge);
  }
 }
 order.sort((a,b)=>depths[a]-depths[b]);
 const result=new Float32Array(source.length),stride=30;for(let i=0;i<order.length;i++){const from=order[i]*stride,to=i*stride;for(let k=0;k<stride;k++)result[to+k]=source[from+k];}
 return {data:result,counts,triangleCount};
}
const api={geometry};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.BarrierPackCandidate=api;

