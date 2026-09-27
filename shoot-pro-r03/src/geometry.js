import {clamp,PROFILES} from './profiles.js';
export function validateCamera(camera,width,height){
  for(const k of ['x','y','pixelsPerUnit','rotation'])if(!Number.isFinite(camera[k]))throw new TypeError(`camera.${k}`);
  if(camera.pixelsPerUnit<=0||width<1||height<1)throw new RangeError('projection');
}
export function project(p,camera,width,height){
  const c=Math.cos(camera.rotation),s=Math.sin(camera.rotation),x=p.x-camera.x,y=p.y-camera.y;
  return {x:width/2+(c*x+s*y)*camera.pixelsPerUnit,y:height/2-(-s*x+c*y)*camera.pixelsPerUnit};
}
export function unproject(p,camera,width,height){
  const c=Math.cos(camera.rotation),s=Math.sin(camera.rotation),x=(p.x-width/2)/camera.pixelsPerUnit,y=-(p.y-height/2)/camera.pixelsPerUnit;
  return {x:camera.x+c*x-s*y,y:camera.y+s*x+c*y};
}
export function projectedShot(shot,camera,width,height,worldScale=1){
  const a=project(shot.start,camera,width,height),b=project(shot.end,camera,width,height);
  const c=Math.cos(camera.rotation),s=Math.sin(camera.rotation);
  const direction={x:c*shot.dir.x+s*shot.dir.y,y:s*shot.dir.x-c*shot.dir.y};
  const length=shot.length*camera.pixelsPerUnit;
  const margin=84*worldScale*camera.pixelsPerUnit;
  const culled=Math.max(a.x,b.x)+margin<0||Math.min(a.x,b.x)-margin>width||Math.max(a.y,b.y)+margin<0||Math.min(a.y,b.y)-margin>height;
  return {a,b,direction,length,culled,width:PROFILES[shot.variant].width*camera.pixelsPerUnit};
}
/** 光の遮蔽専用。命中結果の生成には使わない。 */
export function segmentIntersectsRect(a,b,r){
  let lo=0.0001,hi=0.9999;
  for(const axis of ['x','y']){
    const d=b[axis]-a[axis],mn=r[axis+'0'],mx=r[axis+'1'];
    if(Math.abs(d)<1e-8){if(a[axis]<mn||a[axis]>mx)return false;}
    else{let p=(mn-a[axis])/d,q=(mx-a[axis])/d;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return false;}
  }return true;
}
export function finiteBoundary(shot,t){const f=clamp(t,0,1);return{x:shot.start.x+(shot.end.x-shot.start.x)*f,y:shot.start.y+(shot.end.y-shot.start.y)*f};}
