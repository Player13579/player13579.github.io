export const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix = (a,b,t)=>a+(b-a)*t;
export function smooth(a,b,x) { const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); }
export function envelope(t,attack,hold,release) { return smooth(0,attack,t)*(1-smooth(hold,release,t)); }
export function windowEnvelope(t,on,attack,hold,end) { return envelope(t-on,attack-on,hold-on,end-on); }
export function hsvless(a,b,t) { return a.map((v,i)=>mix(v,b[i],t)); }
export function project(m,p) {
  const [x,y,z=0]=p;
  const X=m[0]*x+m[4]*y+m[8]*z+m[12], Y=m[1]*x+m[5]*y+m[9]*z+m[13];
  const Z=m[2]*x+m[6]*y+m[10]*z+m[14], W=m[3]*x+m[7]*y+m[11]*z+m[15];
  return {x:X,y:Y,z:Z,w:W};
}
export function projectNdc(m,p) { const c=project(m,p); return c.w>1e-7 ? {x:c.x/c.w,y:c.y/c.w,z:c.z/c.w,w:c.w} : null; }
/** 8隅に共通するclip半空間のみで除外。遠方の1件が他の可視件の処理を止めない。 */
export function aabbVisible(m,origin,bounds) {
  const pts=[];
  for(const x of [bounds[0],bounds[3]]) for(const y of [bounds[1],bounds[4]]) for(const z of [bounds[2],bounds[5]]) pts.push(project(m,[origin.x+x,origin.y+y,z]));
  const planes=[p=>p.x+p.w,p=>p.w-p.x,p=>p.y+p.w,p=>p.w-p.y,p=>p.z,p=>p.w-p.z,p=>p.w-1e-7];
  return !planes.some(fn=>pts.every(p=>fn(p)<0));
}
export function assertFrame(frame) {
  if (!frame || !frame.worldToClip || frame.worldToClip.length!==16 || !Array.from(frame.worldToClip).every(Number.isFinite)) throw new TypeError('worldToClip mat4が必要です');
  const v=frame.viewport;
  if(!v || ![v.x,v.y,v.width,v.height].every(Number.isFinite) || v.width<=0 || v.height<=0 || v.x<0 || v.y<0) throw new TypeError('viewportはdevice pixel単位です');
  if (typeof frame.sourceVisibility!=='function') throw new TypeError('sourceVisibilityを既存シーンの遮蔽情報へ接続してください');
  const rects=frame.protectedRects ?? [];
  if (!Array.isArray(rects) || rects.length>16 || rects.some(r=>!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[2]<r[0]||r[3]<r[1])) throw new TypeError('protectedRectsは最大16個のframebuffer [left,top,right,bottom]です');
}
