// R10 creative motion: a continuous rigid body drive over the registered
// three authored poses. It never edits server intent, hit geometry or time.
export const VERSION = 'excalibur-actual-blade-gold-sol61-r10';
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t*t*t*(t*(t*6-15)+10); };
export function physicalMotionAffineForExcaliburR10(progress, facing, motionScale) {
  if (![progress, facing, motionScale].every(Number.isFinite) || progress < 0 || progress >= 1 ||
      ![-1,1].includes(facing) || motionScale < .1 || motionScale > 1) return null;
  const load = smooth(progress/.30);
  const cut = smooth((progress-.30)/.22);
  const follow = smooth((progress-.52)/.20);
  const recover = smooth((progress-.72)/.28);
  // A compact backward load, quick committed cut, then decelerating follow.
  // Rigid rotation retains blade/body proportions, unlike the old squash.
  const x = facing*(-8*load + 31*cut - 6*follow - 17*recover)*motionScale;
  const y = (3*load - 8*cut + 2*follow + 3*recover)*motionScale;
  const angle = facing*(-.15*load + .40*cut - .09*follow - .16*recover)*motionScale;
  const c = Math.cos(angle), s = Math.sin(angle);
  return Object.freeze([c,s,-s,c,x,y]);
}
export function excaliburR10MotionStage(progress) {
  if (!Number.isFinite(progress) || progress<0 || progress>=1) return null;
  return progress<.30?'load':progress<.52?'cut':progress<.72?'follow':'recover';
}
// Visual release stays within the original 620ms action lifetime.
export const RELEASE_PROGRESS = .52;
export function excaliburR10PoseIndex(progress) {
  if (!Number.isFinite(progress) || progress < 0 || progress >= 1) return null;
  return progress < .30 ? 0 : progress < RELEASE_PROGRESS ? 1 : 2;
}
