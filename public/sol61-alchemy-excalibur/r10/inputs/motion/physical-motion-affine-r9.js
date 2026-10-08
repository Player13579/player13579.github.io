function physicalMotionAffineForExcalibur(progress, facing, motionScale, motionId = 'alchemy-excalibur') {
  if (![progress, facing, motionScale].every(Number.isFinite) ||
      progress < 0 || progress >= 1 || ![-1, 1].includes(facing) ||
      motionScale < .1 || motionScale > 1) return null;
  const ease = value => objectEffectEase(clamp(value, 0, 1));
  const windup = ease(progress / .34);
  const cut = ease((progress - .3) / .27);
  const settle = ease((progress - .62) / .38);
  const signature = physicalMotionSignature(motionId, 'slash');
  const impulse = Math.sin(progress * Math.PI);
  const uniqueWave = Math.sin(progress * Math.PI * signature.frequency) * impulse;
  const multiply = (a, b) => [a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]];
  const translate = (x, y) => [1, 0, 0, 1, x, y];
  const rotate = angle => [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
  const scale = (x, y) => [x, 0, 0, y, 0, 0];
  const parts = [
    translate(facing * (-7 * windup + 24 * cut - 10 * settle) * motionScale,
      (3 * windup - 8 * cut + 5 * settle) * motionScale),
    rotate(facing * (-.13 * windup + .28 * cut - .11 * settle) * motionScale),
    scale(1 - cut * .06 * motionScale, 1 + cut * .09 * motionScale),
    translate(facing * uniqueWave * signature.sway * 2.4 * motionScale,
      uniqueWave * signature.lift * 1.65 * motionScale),
    rotate(facing * uniqueWave * signature.twist * .012 * motionScale)
  ];
  return Object.freeze(parts.reduce(multiply, [1, 0, 0, 1, 0, 0]));
}
