// CPU scalar reference for geometry support/connectivity only; native rendering remains untested.
import {phaseState} from './contract.mjs';
const box=(p,b)=>{const q=p.map((v,i)=>Math.abs(v)-b[i]);return Math.hypot(...q.map(v=>Math.max(0,v)))+Math.min(Math.max(...q),0);};
export function sourcePoint(j){const a=j*2*Math.PI/3;return [.2+Math.cos(a)*.39+Math.sin(a)*.17,-.5+Math.sin(a)*.39-Math.cos(a)*.17,(j-1)*.08+.055];}
export function distanceField(p,ms){
 const s=phaseState(ms);let best=100;
 if(!s.live)return best;
 for(let j=0;j<3;j++){
  const e=s.assembled[j];if(e<=.00001)continue;
  const a=j*2*Math.PI/3,n=[.2+Math.cos(a)*.27,-.5+Math.sin(a)*.27,(j-1)*.08],d=p.map((v,i)=>v-n[i]),q=[Math.cos(a)*d[0]+Math.sin(a)*d[1],-Math.sin(a)*d[0]+Math.cos(a)*d[1],d[2]];
  const geometry=Math.min(box([q[0]+.19,q[1],q[2]],[.05,.26,.06]),box([q[0]-.025,q[1]+.17,q[2]],[.265,.05,.06]),box([q[0]-.025,q[1]-.17,q[2]],[.265,.05,.06]));
  best=Math.min(best,Math.max(geometry,q[1]-(e*.65-.33)));
 }
 return best;
}
export function connectivity(ms,step=.025){
 const nx=72,ny=60,nz=20,set=new Set();let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const key=(x,y,z)=>(z*ny+y)*nx+x;
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const p=[-.7+x*step,-1.2+y*step,-.25+z*step];if(distanceField(p,ms)<=0){set.add(key(x,y,z));p.forEach((v,i)=>{min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v);});}}
 const remaining=new Set(set);let components=0;
 while(remaining.size){components++;const stack=[remaining.values().next().value];remaining.delete(stack[0]);while(stack.length){const n=stack.pop(),x=n%nx,y=Math.floor(n/nx)%ny,z=Math.floor(n/(nx*ny));for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const X=x+dx,Y=y+dy,Z=z+dz;if(X<0||X>=nx||Y<0||Y>=ny||Z<0||Z>=nz)continue;const k=key(X,Y,Z);if(remaining.delete(k))stack.push(k);}}}
 return {ageEms:ms,stepH:step,occupiedSamples:set.size,components,min,max,scope:'sampled mathematical support only; not native topology/perceptual quality'};
}
