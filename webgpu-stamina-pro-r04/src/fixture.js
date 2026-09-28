/** Neutral analytic body, authored for this revision. Not a game character asset. */
export function bodyParts(actor, { showCharacter = true, foregroundArm = true } = {}) {
  if (!showCharacter || !actor.visible || !actor.present) return [];
  const parts = [
    [[0,56,0],[6.5,8,5.8],0,1], [[0,47.5,0],[2.7,3,3],0,1],
    [[0,38.5,0],[10,10.5,5.4],0,0], [[0,25,0],[8,7,4.7],0,0],
    [[-11,38,-2],[3.6,8.8,3.5],-.14,0], [[-13,27.5,0],[3,6.8,3],-.04,0], [[-13,20,1],[3.1,3.3,3],0,1],
    [[11,38.5,0],[3.6,8.5,3.4],.12,0],
    foregroundArm ? [[4,33.5,12],[8.9,3.1,3.1],.1,2] : [[13,27.5,3],[3,7,3],.05,0],
    foregroundArm ? [[-5,32.7,12],[3.3,3.4,3.2],0,2] : [[13,20,3],[3,3.3,3],0,1],
    [[-4.4,15.8,0],[4,9,3.8],-.07,0], [[4.6,15.7,1],[4,9,3.8],.07,0],
    [[-5.1,6.5,0],[3,6.5,3],0,0], [[5.7,6.5,1],[3,6.5,3],0,0],
    [[-5.2,1,2],[4,1,4.4],0,0], [[5.8,1,3],[4,1,4.4],0,0]
  ];
  return parts.map(([center, radii, rotation, kind]) => ({ center: center.map((v,i)=>v+(actor.position?.[i]??0)), radii, rotation, kind,
    color: kind === 1 || (kind === 2 && center[0] < 0) ? [0.47,0.29,0.18] : [0.115,0.145,0.19],
    protected: kind === 2 || center[1] > 49 ? 1 : 0 }));
}
