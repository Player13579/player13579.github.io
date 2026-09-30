import {ROOM,LAMPS,STEAM,PURGE,fitRoom} from './scene.mjs';
export const union=(a,b)=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];
export const grow=(a,n)=>[a[0]-n,a[1]-n,a[2]+n,a[3]+n];
export const rect=(p,h)=>[p[0]-h[0],p[1]-h[1],p[0]+h[0],p[1]+h[1]];
export function supportRects(){
 const a=[];
 for(const l of LAMPS){a.push({id:'lamp',bounds:rect(l.source,l.half)});if(l.floor){const h=l.axis[0]?[76,42]:[42,76];a.push({id:'floor',bounds:rect(l.floor,h)});}}
 for(const s of STEAM.sources)a.push({id:'steam',bounds:[s[0]-26,s[1]-84,s[0]+31,s[1]+16]});
 a.push({id:'purge',bounds:[PURGE.source[0]-17,PURGE.source[1]-9,PURGE.source[0]+17,PURGE.receiver[1]+13]});
 return a;
}
export function projectedSupports(width,height){const f=fitRoom(width,height);return supportRects().map(v=>({...v,bounds:v.bounds.map((x,i)=>x*f.scale+f.offset[i%2])}));}
export function roomSupport(width,height){const f=fitRoom(width,height);return [f.offset[0],f.offset[1],f.offset[0]+ROOM.width*f.scale,f.offset[1]+ROOM.height*f.scale];}
export function postSupports(width,height,dpr=1){const f=fitRoom(width,height);const d=Math.max(dpr,f.scale);return projectedSupports(width,height).filter(v=>v.id==='lamp'||v.id==='purge').map(v=>({...v,bounds:grow(v.bounds,6*d)}));}
