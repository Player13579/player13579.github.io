import { CONTRACT, smooth, phaseState } from './contract.js';
/** 既存ゲームのライト受け渡し用データ。ゲームのlight systemはこの候補には接続していない。 */
export function sourceBoundLights(world, seconds) {
  const p=seconds/CONTRACT.duration;
  if(p<0 || p>=1 || !Number.isFinite(world?.x) || !Number.isFinite(world?.y))return [];
  const q=phaseState(p), alive=1-smooth(.93,1,p), collapse=1-smooth(.83,1,p);
  return [
    {role:'source',x:world.x,y:world.y-8,radiusX:33,radiusY:18,colorLinear:[1,.43,.08],intensity:(.35+.65*smooth(0,.10,p))*q.source*.36},
    {role:'receipt',x:world.x,y:world.y-65,radiusX:41,radiusY:44,colorLinear:[.055,.72,.65],intensity:q.received*collapse*smooth(.445,.50,p)*alive*.42}
  ].filter(l=>l.intensity>0);
}
