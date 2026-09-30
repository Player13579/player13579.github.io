import {DESIGN} from './design.mjs';
export function supports(H=64,dpr=1){
 if(!Number.isFinite(H)||H<=0||!Number.isFinite(dpr)||dpr<=0)throw Error('finite positive H/DPR');
 const k=H*dpr/64,scale=r=>r.map(v=>v*k),field=scale(DESIGN.geometry.sourceBounds),body=scale([-64*136/225/2,-32,64*136/225/2,32]);
 const points=DESIGN.sources.map(s=>scale([s.position[0]-2.2,s.position[1]-2.2,s.position[0]+2.2,s.position[1]+2.2]));
 const boxes=[field,body,...points],union=[Math.min(...boxes.map(r=>r[0])),Math.min(...boxes.map(r=>r[1])),Math.max(...boxes.map(r=>r[2])),Math.max(...boxes.map(r=>r[3]))];
 const radius=7*Math.round(dpr),blurX=[union[0]-radius,union[1],union[2]+radius,union[3]],blurY=[blurX[0],blurX[1]-radius,blurX[2],blurX[3]+radius];
 const angle=31*Math.PI/180,hx=7*Math.cos(angle)+4*Math.sin(angle),hy=7*Math.sin(angle)+4*Math.cos(angle);
 const crosses=DESIGN.sources.map(s=>scale([s.position[0]-hx,s.position[1]-hy,s.position[0]+hx,s.position[1]+hy]));
 const OBS=[Math.min(blurY[0],...crosses.map(r=>r[0])),Math.min(blurY[1],...crosses.map(r=>r[1])),Math.max(blurY[2],...crosses.map(r=>r[2])),Math.max(blurY[3],...crosses.map(r=>r[3]))];
 return {scale:k,field,body,points,source:union,blurX,blurY,crosses,OBS,mainWidthPixels:48*k,mainHeightPixels:36*k};
}
export function scissor(box,center,width,height){const x0=Math.max(0,Math.floor(center[0]+box[0])-1),y0=Math.max(0,Math.floor(center[1]+box[1])-1),x1=Math.min(width,Math.ceil(center[0]+box[2])+1),y1=Math.min(height,Math.ceil(center[1]+box[3])+1);return [x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0)];}
