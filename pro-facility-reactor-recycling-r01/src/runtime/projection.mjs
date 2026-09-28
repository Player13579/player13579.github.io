import {point,finite} from './contracts.mjs';
/** DVAの2D世界(x右,y下)から画面backing pixelへ。mへの変換は表示の計算に紛れ込ませない。 */
export function validateView(view){
  if(!view||!point(view.centerWorld)||!finite(view.pixelsPerWorldUnit)||view.pixelsPerWorldUnit<=0||
    !Number.isSafeInteger(view.width)||!Number.isSafeInteger(view.height)||view.width<1||view.height<1||
    !finite(view.referenceHeightWorld)||view.referenceHeightWorld<=0)throw new TypeError('投影契約が不正');
  return view;
}
export function project(p,v){return [(p.x-v.centerWorld.x)*v.pixelsPerWorldUnit+v.width/2,(p.y-v.centerWorld.y)*v.pixelsPerWorldUnit+v.height/2];}
export function projectEvent(e,v){
  const src=project(e.origin,v);const dst=e.receiver?project(e.receiver,v):src;
  // 受け手不明時も施設側の基準寸法はホストが供給。受け手を施設へ捏造しない(hasReceiver=0)。
  const H=(e.heightWorld??v.referenceHeightWorld)*v.pixelsPerWorldUnit;
  const pad=H*0.90; // Aの曲線制御点/主形/OBS haloを包含する設計上の保守境界。
  const bounds=[Math.min(src[0],dst[0])-pad,Math.min(src[1],dst[1])-pad,Math.max(src[0],dst[0])+pad,Math.max(src[1],dst[1])+pad];
  const visible=bounds[2]>=0&&bounds[0]<=v.width&&bounds[3]>=0&&bounds[1]<=v.height;
  return {src,dst,H,bounds,visible,hasReceiver:e.receiver?1:0,ageSeconds:e.ageMs/1000,targetKey:e.targetKey};
}
